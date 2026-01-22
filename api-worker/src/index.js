import { Hono } from 'hono';
import { cors } from 'hono/cors';
import {
  searchRag,
  formatRagContext,
  formatAllContext,
  findExactQuestionMatch,
  prepareQuestionEmbeddings,
  getQuestionEmbeddingStatus,
  clearQuestionEmbeddings
} from './rag';
import { buildFitAssessmentUserPrompt, buildFitAssessmentSystemPrompt, buildSystemPrompt, buildUserPrompt, buildConversationMessages } from './prompt';
import { fetchUrlContent } from './fetch-url-content';
import {  parseResetAuthRequest } from './api-auth';

const app = new Hono();

const defaultCorsOrigins = ['http://localhost:8888', 'https://your-domain.com'];

const resolveCorsOrigins = (env) => {
  if (!env?.CORS_ORIGINS) {
    return defaultCorsOrigins;
  }

  return env.CORS_ORIGINS
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
};

app.use('/*', (c, next) => {
  const originList = resolveCorsOrigins(c.env);
  return cors({
    origin: originList,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization']
  })(c, next);
});

const streamText = (content, { delayMs = 16 } = {}) => {
  const encoder = new TextEncoder();
  const chunks = content.split(' ');

  return new ReadableStream({
    async start(controller) {
      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = index === 0 ? chunks[index] : ` ${chunks[index]}`;
        controller.enqueue(encoder.encode(chunk));
        if (delayMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
      controller.close();
    }
  });
};

const getOpenRouterConfig = (env) => ({
  apiKey: env?.CHAT_API_KEY,
  model: env?.CHAT_MODEL || 'gpt-4o-mini',
  baseUrl: env?.CHAT_BASE_URL || 'https://openrouter.ai/api/v1',
  appName: env?.CHAT_APP_NAME || 'aging-coder-cv-chat',
  appUrl: env?.CHAT_APP_URL || 'https://agingcoder.com'
});

const fetchChatCompletion = async (env, messagesOrMessage, cvContext, ragContext) => {
  const { apiKey, model, baseUrl, appName, appUrl } = getOpenRouterConfig(env);
  if (!apiKey) {
    throw new Error('CHAT_API_KEY is not configured.');
  }

  let messages;
  if (Array.isArray(messagesOrMessage)) {
    // New format: array of conversation messages
    messages = buildConversationMessages(buildSystemPrompt(), messagesOrMessage, cvContext, ragContext);
  } else {
    // Legacy format: single message string
    messages = [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(messagesOrMessage, cvContext, ragContext) }
    ];
  }

  const payload = {
    model,
    stream: true,
    messages
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': appUrl,
      'X-Title': appName
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat completion failed: ${response.status} ${errorText}`);
  }

  return response;
};

const streamCompletionResponse = (response, { delayMs = 0 } = {}) => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = response.body.getReader();
      let buffer = '';

      try {
        while (true) {
          let result;
          try {
            result = await reader.read();
          } catch (readErr) {
            // Reader may have been released/cancelled by the consumer — stop reading.
            console.warn('ReadableStream reader.read() failed:', readErr && readErr.message ? readErr.message : readErr);
            break;
          }

          if (result.done) {
            break;
          }

          if (result.value) {
            buffer += decoder.decode(result.value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed || !trimmed.startsWith('data:')) {
                continue;
              }
              const data = trimmed.replace('data:', '').trim();
              if (data === '[DONE]') {
                // end of stream marker from upstream
                try {
                  controller.close();
                } catch (e) {
                  /* ignore if already closed */
                }
                return;
              }

              try {
                const parsed = JSON.parse(data);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (delta) {
                  controller.enqueue(encoder.encode(delta));
                  if (delayMs > 0) {
                    await new Promise((resolve) => setTimeout(resolve, delayMs));
                  }
                }
              } catch (error) {
                console.warn('Failed to parse stream chunk', error);
              }
            }
          }
        }
      } finally {
        try {
          reader.releaseLock();
        } catch (e) {
          // ignore
        }

        try {
          controller.close();
        } catch (e) {
          // ignore
        }
      }
    }
  });
};

const normalizeQuestion = (message) => message?.trim();

const validateMessage = (message) => {
  if (!message) {
    return 'Message is required.';
  }
  if (message.length < 3) {
    return 'Message is too short.';
  }
  if (message.length > 1200) {
    return 'Message is too long.';
  }
  return null;
};

const getClientId = (c) =>
  c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

async function checkRateLimit(c, clientId) {
  const kv = c.env.RATE_LIMIT;
  if (!kv) {
    return true;
  }

  const today = new Date().toISOString().split('T')[0];
  const key = `rate_limit:${clientId}:${today}`;

  const current = await kv.get(key);
  const count = current ? parseInt(current, 10) : 0;
  const limit = parseInt(c.env.DAILY_LIMIT || '30', 10);

  if (count >= limit) {
    return false;
  }

  // Cloudflare KV uses 'put' to write values (not 'set')
  await kv.put(key, (count + 1).toString(), { expirationTtl: 86400 });
  return true;
}

async function trackAnalytics(c, clientId, message, response) {
  const analytics = {
    timestamp: new Date().toISOString(),
    clientId,
    message,
    responseLength: response.length,
    userAgent: c.req.header('User-Agent')
  };

  if (c.env.LOG_ANALYTICS === 'true') {
    console.log('Analytics:', JSON.stringify(analytics));
  }
}

// Reset auth helpers moved to './api-auth.js'

const fetchFitAssessmentCompletion = async (env, jobDescription, cvContext) => {
  const { apiKey, model, baseUrl, appName, appUrl } = getOpenRouterConfig(env);
  if (!apiKey) {
    throw new Error('CHAT_API_KEY is not configured.');
  }

  const userPrompt = buildFitAssessmentUserPrompt(jobDescription, cvContext);

  const payload = {
    model,
    messages: [
      { role: 'system', content: buildFitAssessmentSystemPrompt() },
      { role: 'user', content: userPrompt }
    ],
    response_format: { type: 'json_object' }
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': appUrl,
      'X-Title': appName
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fit assessment failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response content from AI');
  }

  return JSON.parse(content);
};

app.post('/api/chat', async (c) => {
  try {
    const body = await c.req.json();

    // Support both single message (legacy) and messages array (new)
    let messages = [];
    let lastUserMessage = '';

    if (Array.isArray(body?.messages)) {
      // New format: messages array
      messages = body.messages.filter(
        (m) => m && (m.role === 'user' || m.role === 'assistant') && m.content
      );
      const lastUser = [...messages].reverse().find((m) => m.role === 'user');
      lastUserMessage = normalizeQuestion(lastUser?.content);
    } else if (body?.message) {
      // Legacy format: single message string
      lastUserMessage = normalizeQuestion(body.message);
      messages = [{ role: 'user', content: lastUserMessage }];
    }

    const validationError = validateMessage(lastUserMessage);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    const clientId = getClientId(c);
    const canProceed = await checkRateLimit(c, clientId);

    if (!canProceed) {
      return c.json({ error: 'Daily question limit reached. Please try again tomorrow.' }, 429);
    }

    let ragResults = [];
    // Always include CV data as the base context
    const cvContext = formatAllContext();
    let ragContext = '';

    // Check for exact question match first (skip RAG if we have a match)
    let exactMatch = null;
    try {
      exactMatch = await findExactQuestionMatch(lastUserMessage);
    } catch (err) {
      console.warn('Exact question match check failed:', err);
    }

    if (exactMatch) {
      // If verbatim flag is true, return the stored context directly to the user
      // (do NOT send it to the LLM). This ensures exact-match answers are delivered
      // verbatim and avoid leaking them in fallback text.
      if (exactMatch.verbatim) {
        // Track analytics and return the exact context text immediately
        await trackAnalytics(c, clientId, lastUserMessage, exactMatch.context);
        return new Response(exactMatch.context, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-RAG-Results': '0',
            'X-Exact-Match': 'true'
          }
        });
      }

      // Non-verbatim: safe to include directly in ragContext
      ragContext = exactMatch.context;
    } else if (c.env.AI) {
      // No exact match - do RAG search if AI binding is available
      try {
        const results = await searchRag(c.env.AI, lastUserMessage, c.env.RAG_EMBEDDINGS);
        if (results && results.length) {
          ragResults = results;
          ragContext = formatRagContext(results);
        }
      } catch (err) {
        console.warn('RAG search failed, continuing with CV-only context:', err);
      }
    }

    let responseText = '';

    try {
      const chatResponse = await fetchChatCompletion(
        c.env,
        exactMatch ? messages.slice(-1) : messages,
        cvContext,
        ragContext
      );
      const stream = streamCompletionResponse(chatResponse, {
        delayMs: c.env.STREAM_DELAY_MS ? Number(c.env.STREAM_DELAY_MS) : 0
      });

      trackAnalytics(c, clientId, lastUserMessage, '[streamed response]').catch((error) => {
        console.warn('Analytics failed:', error);
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-RAG-Results': String(ragResults.length),
          'X-Exact-Match': exactMatch ? 'true' : 'false'
        }
      });
    } catch (error) {
      console.error('Chat completion error:', error);
      responseText = `I'm having trouble reaching the chat service right now. ${ragContext}`;
    }

    await trackAnalytics(c, clientId, lastUserMessage, responseText);

    const fallbackStream = streamText(responseText, {
      delayMs: c.env.STREAM_DELAY_MS ? Number(c.env.STREAM_DELAY_MS) : 16
    });

    return new Response(fallbackStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-RAG-Results': String(ragResults.length),
        'X-Exact-Match': exactMatch ? 'true' : 'false'
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/fit-assessment', async (c) => {
  try {
    const body = await c.req.json();
    const { type, content } = body;
    let { url } = body;

    if (!type || (type !== 'paste' && type !== 'url')) {
      return c.json({ error: 'Invalid type. Must be "paste" or "url".' }, 400);
    }

    let jobDescription = '';

    if (type === 'paste') {
      if (!content || content.trim().length < 50) {
        return c.json({ error: 'Job description is too short. Please provide more details.' }, 400);
      }
      if (content.length > 20000) {
        return c.json({ error: 'Job description is too long. Please shorten it.' }, 400);
      }
      jobDescription = content.trim();
    } else if (type === 'url') {
      url = url?.trim();
      if (!url) {
        return c.json({ error: 'No URL provided.' }, 400);
      }
      if (!/^https?:\/\//i.test(url)) {
        url = 'https://' + url;
      }
      try {
        jobDescription = await fetchUrlContent(url);
        if (jobDescription.length < 50) {
          return c.json({ error: 'Could not extract enough content from the URL.  Currently I cannot execute JavaScript to fully render dynamic pages.  Can you paste the text instead?' }, 400);
        }
      } catch (error) {
        let msg = error?.message || String(error);
        // If the failure indicates the page is not publicly accessible, return the friendly message directly
        if (msg.includes('not publicly accessible')) {
          return c.json({ error: msg }, 400);
        }
        if (msg.includes('internal error')) { 
          msg = 'Web page is not currently accessible, did you get the URL correct?';
        }
        return c.json({ error: `Failed to fetch job posting: ${msg}` }, 400);
      }
    }

    const clientId = getClientId(c);
    const canProceed = await checkRateLimit(c, clientId);

    if (!canProceed) {
      return c.json({ error: 'Daily request limit reached. Please try again tomorrow.' }, 429);
    }

    const cvContext = formatAllContext();

    try {
      const assessment = await fetchFitAssessmentCompletion(c.env, jobDescription, cvContext);
      const jobPostingJudgment = assessment?.jobPostingJudgment;

      if (jobPostingJudgment && jobPostingJudgment.isJobPosting === false) {
        const message = 'This content does not appear to be a job posting. Please provide a job description or a link to one.';
        return c.json({
          jobPostingJudgment,
          jobPostingMessage: jobPostingJudgment.reason || message
        });
      }

      if (c.env.LOG_ANALYTICS === 'true') {
        console.log('Fit Assessment:', JSON.stringify({
          timestamp: new Date().toISOString(),
          clientId,
          type,
          verdict: assessment.verdict,
          jobTitle: assessment.jobTitle
        }));
      }

      return c.json(assessment);
    } catch (error) {
      console.error('Fit assessment error:', error);
      return c.json({ error: 'Failed to analyze job fit. Please try again.' }, 500);
    }
  } catch (error) {
    console.error('Fit assessment request error:', error);
    // Provide a friendly user-facing error message instead of an opaque internal error reference
    const userMessage = 'Web page is not currently accessible. Please verify the URL or paste the job description into the input and try again.';
    return c.json({ error: userMessage }, 500);
  }
});

app.get('/api/rag/embeddings', async (c) => {
  try {
    const cache = c.env.RAG_EMBEDDINGS;
    if (!cache) {
      return c.json({ error: 'RAG_EMBEDDINGS KV is not configured.' }, 400);
    }

    const status = await getQuestionEmbeddingStatus(cache);
    return c.json(status);
  } catch (error) {
    console.error('Failed to retrieve RAG embedding status:', error);
    return c.json({ error: 'Failed to retrieve RAG embedding status.' }, 500);
  }
});

app.post('/api/rag/embeddings', async (c) => {
  try {
    if (!c.env.AI) {
      return c.json({ error: 'AI binding is not configured.' }, 400);
    }

    const cache = c.env.RAG_EMBEDDINGS;
    if (!cache) {
      return c.json({ error: 'RAG_EMBEDDINGS KV is not configured.' }, 400);
    }

    const { requestBody, requestUrl, authResult } = await parseResetAuthRequest(c);

    if (!authResult.valid) {
      console.warn('Unauthorized RAG embeddings reset attempt:', authResult.message);
      return c.json({ error: authResult.message }, authResult.status || 401);
    }

    // Determine whether to force regeneration (ignore cache). Accepts JSON body { force: true } or ?force=true
    let force = false;
    if (requestBody?.force === true || requestBody?.force === 'true') {
      force = true;
    }

    if (requestUrl.searchParams.get('force') === 'true') {
      force = true;
    }

    if (force) {
      console.log('Preparing RAG embeddings with force=true; clearing cache and re-embedding all documents.');
    }

    const status = await prepareQuestionEmbeddings(c.env.AI, cache, { force });
    // Include forced flag in response for clarity
    return c.json({ ...status, forced: force });
  } catch (error) {
    console.error('Failed to prepare RAG embeddings:', error);
    return c.json({ error: 'Failed to prepare RAG embeddings.' }, 500);
  }
});

app.delete('/api/rag/embeddings', async (c) => {
  try {
    const cache = c.env.RAG_EMBEDDINGS;
    if (!cache) {
      return c.json({ error: 'RAG_EMBEDDINGS KV is not configured.' }, 400);
    }

    const { authResult } = await parseResetAuthRequest(c);
    if (!authResult.valid) {
      console.warn('Unauthorized RAG embeddings clear attempt:', authResult.message);
      return c.json({ error: authResult.message }, authResult.status || 401);
    }

    await clearQuestionEmbeddings(cache);
    console.log('Cleared RAG embeddings cache via admin request.');
    return c.json({ status: 'cleared' });
  } catch (error) {
    console.error('Failed to clear RAG embeddings:', error);
    return c.json({ error: 'Failed to clear RAG embeddings.' }, 500);
  }
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default {
  fetch: app.fetch
};
