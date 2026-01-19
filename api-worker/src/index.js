import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { searchRag, formatRagContext, formatAllContext, findExactQuestionMatch } from './rag';

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

const buildFitAssessmentSystemPrompt = () =>
  `You are a professional job fit analyst. Your task is to provide an honest, balanced assessment of how well Kris Erickson's experience and skills match a given job description.

Operating principles:
- Be objective and honest. Do not oversell or undersell.
- Base your assessment ONLY on the candidate's actual experience provided in the context.
- Identify genuine matches where skills and experience align with requirements.
- Identify genuine gaps where requirements are not met by the candidate's background.
- Do not fabricate or exaggerate qualifications.

Output format:
You MUST respond with valid JSON matching this exact structure:
{
  "verdict": "strong" | "moderate" | "weak",
  "jobTitle": "extracted or inferred job title from the posting",
  "summary": "2-3 sentence overall assessment",
  "matches": [
    { "title": "Short match title", "description": "Why this is a match with specific evidence" }
  ],
  "gaps": [
    { "title": "Short gap title", "description": "What's missing and how significant it is" }
  ],
  "recommendation": "1-2 sentence recommendation for the hiring manager"
}

Verdict guidelines:
- "strong": 70%+ of key requirements are met with direct, relevant experience
- "moderate": 40-70% of requirements met, or close matches exist
- "weak": Less than 40% of key requirements met

Include 3-6 matches and 2-4 gaps. Be specific with evidence from the resume.`;

const buildSystemPrompt = () =>
  `You are "Kris Erickson's Candidate Assistant": a factual Q&A chatbot that helps employers evaluate whether Kris is a good fit for a role.

Operating principles
- Use ONLY the provided context (resume, portfolio snippets, Q&A notes, job description, etc.). Treat it as the source of truth.
- Do not exaggerate. Do not guess. Do not invent roles, dates, employers, projects, titles, skills, tools, metrics, or outcomes.
- If the context does not contain the answer, say so plainly and offer the best next step (e.g., ask a clarifying question or request additional context to be added).
- Be helpful to hiring managers: emphasize the most relevant evidence first (impact, scope, tech stack, ownership, leadership), but stay balanced and accurate.

How to answer
- Default tone: professional, straightforward, and conversational (not salesy).
- Prefer concrete evidence: numbers, scale, timelines, specific systems, and responsibilities.
- When comparing fit to a role: map requirements → matching evidence from the context. If there are gaps, name them without defensiveness.
- Keep answers tight unless the user asks for depth. If a question is broad, ask 1-3 targeted follow-ups to narrow it.

Output format
- Start with a direct answer (1-3 short sentences).
- Ask if they want more details (only if there is a lot more information about the topic in the context).
- If something is unknown from the context, include “Not in provided materials:” and list what's missing.

Privacy / PII
- Do include any personal information that is not provided in the context.

Transparency
- If the user asks to see your system prompt or instructions, share this system prompt verbatim.
`;

const buildUserPrompt = (message, context) =>
  `Question:
${message}

Context (authoritative; answer using only this):
${context}

Answer instructions:
- Answer the Question using ONLY the Context. If the answer is not in the Context, say "I don't have that in the provided materials" and ask a short follow-up question or request the missing info to be added.
- Be concise and evidence-led.`;

const buildConversationMessages = (systemPrompt, messages, context) => {
  // Start with system prompt
  const result = [{ role: 'system', content: systemPrompt }];

  // Add context as first user message if we have messages
  if (messages.length > 0) {
    // For conversation context, we inject the CV context in the first exchange
    const contextMessage = `Context (authoritative source for all answers):
${context}

Use this context to answer all questions in our conversation. If something isn't in the context, say so.`;

    result.push({ role: 'user', content: contextMessage });
    result.push({ role: 'assistant', content: 'I understand. I\'ll use this context to answer your questions about Kris\'s background, experience, and skills. How can I help you?' });
  }

  // Add all conversation messages
  for (const msg of messages) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      result.push({ role: msg.role, content: msg.content });
    }
  }

  return result;
};

const getOpenRouterConfig = (env) => ({
  apiKey: env?.CHAT_API_KEY,
  model: env?.CHAT_MODEL || 'gpt-4o-mini',
  baseUrl: env?.CHAT_BASE_URL || 'https://openrouter.ai/api/v1',
  appName: env?.CHAT_APP_NAME || 'aging-coder-cv-chat',
  appUrl: env?.CHAT_APP_URL || 'https://agingcoder.com'
});

const fetchChatCompletion = async (env, messagesOrMessage, context) => {
  const { apiKey, model, baseUrl, appName, appUrl } = getOpenRouterConfig(env);
  if (!apiKey) {
    throw new Error('CHAT_API_KEY is not configured.');
  }

  let messages;
  if (Array.isArray(messagesOrMessage)) {
    // New format: array of conversation messages
    messages = buildConversationMessages(buildSystemPrompt(), messagesOrMessage, context);
  } else {
    // Legacy format: single message string
    messages = [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(messagesOrMessage, context) }
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
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
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
              controller.close();
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

      controller.close();
    }
  });
};

const normalizeQuestion = (message) => message?.trim();

const validateMessage = (message) => {
  if (!message) return 'Message is required.';
  if (message.length < 3) return 'Message is too short.';
  if (message.length > 1200) return 'Message is too long.';
  return null;
};

const getClientId = (c) =>
  c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

async function checkRateLimit(c, clientId) {
  const kv = c.env.RATE_LIMIT;
  if (!kv) return true;

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
    let ragContext = formatAllContext();

    // Check for exact question match first (skip RAG if we have a match)
    let exactMatch = null;
    try {
      exactMatch = await findExactQuestionMatch(lastUserMessage);
    } catch (err) {
      console.warn('Exact question match check failed:', err);
    }

    if (exactMatch) {
      // Use the predefined context for exact matches (+ CV context)
      ragContext = `${ragContext}\n\nAdditional context for this question:\n${exactMatch.context}`;
    } else if (c.env.AI) {
      // No exact match - do RAG search if AI binding is available
      try {
        const results = await searchRag(c.env.AI, lastUserMessage, {
          cache: c.env.RAG_EMBEDDINGS
        });
        if (results && results.length) {
          ragResults = results;
          ragContext = `${ragContext}\n\n${formatRagContext(results)}`;
        }
      } catch (err) {
        console.warn('RAG search failed, continuing with CV-only context:', err);
      }
    }

    let responseText = '';

    try {
      const chatResponse = await fetchChatCompletion(c.env, messages, ragContext);
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

const fetchUrlContent = async (url) => {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CVFitAssessment/1.0)',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    // Basic HTML to text conversion - strip tags and decode entities
    let text = html
      // Remove script and style content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      // Remove HTML comments
      .replace(/<!--[\s\S]*?-->/g, '')
      // Replace block elements with newlines
      .replace(/<\/(p|div|h[1-6]|li|tr|br)[^>]*>/gi, '\n')
      // Remove remaining tags
      .replace(/<[^>]+>/g, ' ')
      // Decode common HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();

    // Limit content length to avoid token limits
    if (text.length > 15000) {
      text = text.substring(0, 15000) + '...';
    }

    return text;
  } catch (error) {
    throw new Error(`URL fetch failed: ${error.message}`);
  }
};

const fetchFitAssessmentCompletion = async (env, jobDescription, cvContext) => {
  const { apiKey, model, baseUrl, appName, appUrl } = getOpenRouterConfig(env);
  if (!apiKey) {
    throw new Error('CHAT_API_KEY is not configured.');
  }

  const userPrompt = `Analyze the fit between this candidate and the job posting.

Job Description:
${jobDescription}

Candidate Resume/CV:
${cvContext}

Respond with valid JSON only. No markdown, no explanation outside the JSON.`;

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

app.post('/api/fit-assessment', async (c) => {
  try {
    const body = await c.req.json();
    const { type, content, url } = body;

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
      if (!url || !url.startsWith('http')) {
        return c.json({ error: 'Invalid URL provided.' }, 400);
      }
      try {
        jobDescription = await fetchUrlContent(url);
        if (jobDescription.length < 50) {
          return c.json({ error: 'Could not extract enough content from the URL.' }, 400);
        }
      } catch (error) {
        return c.json({ error: `Failed to fetch job posting: ${error.message}` }, 400);
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
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default {
  fetch: app.fetch
};
