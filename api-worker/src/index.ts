import { type Context, Hono } from 'hono';
import { cors } from 'hono/cors';
import { fetchUrlContent } from './fetch-url-content';
import {
  buildConversationMessages,
  buildFitAssessmentSystemPrompt,
  buildFitAssessmentUserPrompt,
  buildSystemPrompt,
  buildUserPrompt,
} from './prompt';
import {
  type ExactMatch,
  type ExpansionMetadata,
  findExactQuestionMatch,
  formatAllContext,
  formatRagContext,
  getQuestionEmbeddingStatus,
  prepareQuestionEmbeddings,
  type RagResultWithMetadata,
  searchRag,
} from './rag';

interface Env {
  CHAT_API_KEY?: string;
  CHAT_MODEL?: string;
  CHAT_BASE_URL?: string;
  CHAT_APP_NAME?: string;
  CHAT_APP_URL?: string;
  DAILY_LIMIT?: string;
  STREAM_DELAY_MS?: string;
  CORS_ORIGINS?: string;
  LOG_ANALYTICS?: string;
  RATE_LIMIT?: KVNamespace;
  RAG_EMBEDDINGS?: KVNamespace;
  AI?: AI;
}

interface AI {
  run(model: string, input: { text: string | string[] }): Promise<unknown>;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequestBody {
  message?: string;
  messages?: Message[];
}

interface FitAssessmentRequestBody {
  type: 'paste' | 'url';
  content?: string;
  url?: string;
}

interface OpenRouterConfig {
  apiKey?: string;
  model: string;
  baseUrl: string;
  appName: string;
  appUrl: string;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string;
    } | null;
  } | null> | null;
}

interface FitAssessment {
  verdict: 'strong' | 'moderate' | 'weak';
  jobTitle: string;
  company?: string | null;
  summary: string;
  matches: Array<{ title: string; description: string }>;
  gaps: Array<{ title: string; description: string }>;
  recommendation: string;
  jobPostingJudgment?: {
    isJobPosting: boolean;
    confidence: string;
    reason: string;
  };
}

interface AnalyticsData {
  type: string;
  question?: string;
  response?: string;
  ragNames?: string[];
  exactMatch?: boolean;
  expansionTriggered?: boolean;
  expansionReason?: string;
  expansionUsedPass2?: boolean;
  llmResponseTimeMs?: number | null;
  jobTitle?: string;
  company?: string | null;
  url?: string | null;
  verdict?: string;
  gaps?: unknown[];
  matches?: unknown[];
  recommendation?: string;
  summary?: string;
  jobPostingJudgment?: unknown;
}

const app = new Hono<{ Bindings: Env }>();

const defaultCorsOrigins = ['http://localhost:8888'];

const resolveCorsOrigins = (env: Env): string[] => {
  if (!env?.CORS_ORIGINS) {
    return defaultCorsOrigins;
  }

  return env.CORS_ORIGINS.split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
};

app.use('/*', (c, next) => {
  const originList = resolveCorsOrigins(c.env);
  return cors({
    origin: originList,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })(c, next);
});

const streamText = (content: string, { delayMs = 16 } = {}): ReadableStream => {
  const encoder = new TextEncoder();
  const chunks = content.split(' ');

  return new ReadableStream({
    async start(controller) {
      for (let index = 0; index < chunks.length; index += 1) {
        const chunk = index === 0 ? chunks[index] : ` ${chunks[index]}`;
        controller.enqueue(encoder.encode(chunk));
        if (delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
      controller.close();
    },
  });
};

const getOpenRouterConfig = (env: Env): OpenRouterConfig => ({
  apiKey: env?.CHAT_API_KEY,
  model: env?.CHAT_MODEL || 'gpt-4o-mini',
  baseUrl: env?.CHAT_BASE_URL || 'https://openrouter.ai/api/v1',
  appName: env?.CHAT_APP_NAME || 'aging-coder-cv-chat',
  appUrl: env?.CHAT_APP_URL || 'https://agingcoder.com',
});

const fetchChatCompletion = async (
  env: Env,
  messagesOrMessage: Message[] | string,
  cvContext: string,
  ragContext: string,
): Promise<Response> => {
  const { apiKey, model, baseUrl, appName, appUrl } = getOpenRouterConfig(env);
  if (!apiKey) {
    throw new Error('CHAT_API_KEY is not configured.');
  }

  let messages: Message[];
  if (Array.isArray(messagesOrMessage)) {
    // New format: array of conversation messages
    messages = buildConversationMessages(
      buildSystemPrompt(),
      messagesOrMessage,
      cvContext,
      ragContext,
    );
  } else {
    // Legacy format: single message string
    messages = [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(messagesOrMessage, cvContext, ragContext) },
    ];
  }

  const payload = {
    model,
    stream: true,
    messages,
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': appUrl,
      'X-Title': appName,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Chat completion failed: ${response.status} ${errorText}`);
  }

  return response;
};

const streamCompletionResponse = (response: Response, { delayMs = 0 } = {}): ReadableStream => {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  return new ReadableStream({
    async start(controller) {
      const reader = response.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }
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
                  await new Promise(resolve => setTimeout(resolve, delayMs));
                }
              }
            } catch (error) {
              console.warn('[STREAM] Failed to parse chunk:', error);
            }
          }
        }
      }

      controller.close();
    },
  });
};

const normalizeQuestion = (message: string | undefined): string => message?.trim() || '';

const validateMessage = (message: string): string | null => {
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

const getClientId = (c: Context<{ Bindings: Env }>): string =>
  c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';

async function checkRateLimit(c: Context<{ Bindings: Env }>, clientId: string): Promise<boolean> {
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

async function trackAnalytics(
  c: Context<{ Bindings: Env }>,
  clientId: string,
  data: AnalyticsData,
): Promise<void> {
  const analytics = {
    timestamp: new Date().toISOString(),
    clientId,
    userAgent: c.req.header('User-Agent'),
    ...data,
  };

  if (c.env.LOG_ANALYTICS === 'true') {
    console.log('Analytics:', JSON.stringify(analytics));
  }
}

const createCapturingStream = (
  sourceStream: ReadableStream,
  onComplete?: (captured: string) => void,
): ReadableStream => {
  let captured = '';
  const transform = new TransformStream({
    transform(chunk, controller) {
      const text = typeof chunk === 'string' ? chunk : new TextDecoder().decode(chunk);
      captured += text;
      controller.enqueue(chunk);
    },
    flush() {
      if (onComplete) {
        onComplete(captured);
      }
    },
  });

  return sourceStream.pipeThrough(transform);
};

const fetchFitAssessmentCompletion = async (
  env: Env,
  jobDescription: string,
  cvContext: string,
): Promise<FitAssessment> => {
  const { apiKey, model, baseUrl, appName, appUrl } = getOpenRouterConfig(env);
  if (!apiKey) {
    throw new Error('CHAT_API_KEY is not configured.');
  }

  const userPrompt = buildFitAssessmentUserPrompt(jobDescription, cvContext);

  const payload = {
    model,
    messages: [
      { role: 'system', content: buildFitAssessmentSystemPrompt() },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
  };

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': appUrl,
      'X-Title': appName,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Fit assessment failed: ${response.status} ${errorText}`);
  }

  const data: unknown = await response.json();
  const parsed = data as ChatCompletionResponse;
  const content = parsed?.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response content from AI');
  }

  return JSON.parse(content);
};

// Helper to create a short summary of assistant message for RAG expansion
const summarizeAssistantMessage = (content: string): string => {
  if (!content) {
    return '';
  }

  // Take first paragraph or first 300 chars, whichever is shorter
  const firstParagraph = content.split('\n\n')[0];
  const truncated =
    firstParagraph.length > 300 ? `${firstParagraph.slice(0, 297)}...` : firstParagraph;

  return truncated.trim();
};

app.post('/api/chat', async c => {
  const timings: Record<string, number> = {};
  const mark = (label: string) => { timings[label] = Date.now(); };
  mark('request_start');

  try {
    const body: ChatRequestBody = await c.req.json();
    mark('body_parsed');

    // Support both single message (legacy) and messages array (new)
    let messages: Message[] = [];
    let lastUserMessage = '';
    let previousUserMessage = '';
    let previousAssistantSummary = '';

    if (Array.isArray(body?.messages)) {
      // New format: messages array
      messages = body.messages.filter(
        m => m && (m.role === 'user' || m.role === 'assistant') && m.content,
      );
      const lastUser = [...messages].reverse().find(m => m.role === 'user');
      lastUserMessage = normalizeQuestion(lastUser?.content);

      // Extract previous turn context for query expansion
      if (messages.length >= 3) {
        // Find the second-to-last user message
        const userMessages = messages.filter(m => m.role === 'user');
        if (userMessages.length >= 2) {
          previousUserMessage = userMessages[userMessages.length - 2].content || '';
        }

        // Find the last assistant message and summarize it
        const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
        if (lastAssistant) {
          previousAssistantSummary = summarizeAssistantMessage(lastAssistant.content);
        }
      }
    } else if (body?.message) {
      // Legacy format: single message string
      lastUserMessage = normalizeQuestion(body.message);
      messages = [{ role: 'user', content: lastUserMessage }];
    }

    const validationError = validateMessage(lastUserMessage);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    mark('message_validated');
    const clientId = getClientId(c);
    const canProceed = await checkRateLimit(c, clientId);
    mark('rate_limit_checked');

    if (!canProceed) {
      return c.json({ error: 'Daily question limit reached. Please try again tomorrow.' }, 429);
    }

    let ragResults: RagResultWithMetadata = [] as RagResultWithMetadata;
    // Always include CV data as the base context
    const cvContext = formatAllContext();
    let ragContext = '';

    // Check for exact question match first (skip RAG if we have a match)
    mark('exact_match_start');
    let exactMatch: ExactMatch | null = null;
    try {
      exactMatch = await findExactQuestionMatch(lastUserMessage);
    } catch (err) {
      console.warn('Exact question match check failed:', err);
    }
    mark('exact_match_done');

    if (exactMatch) {
      // If verbatim flag is true, return the stored context directly to the user
      // (do NOT send it to the LLM). This ensures exact-match answers are delivered
      // verbatim and avoid leaking them in fallback text.
      if (exactMatch.verbatim) {
        // Track analytics and return the exact context text immediately
        await trackAnalytics(c, clientId, {
          type: 'chat',
          question: lastUserMessage,
          response: exactMatch.context,
          ragNames: [],
          exactMatch: true,
          expansionTriggered: false,
          llmResponseTimeMs: 0, // No LLM call for exact verbatim match
        });
        return new Response(exactMatch.context, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
            'X-RAG-Results': '0',
            'X-Exact-Match': 'true',
          },
        });
      }

      // Non-verbatim: safe to include directly in ragContext
      ragContext = exactMatch.context;
      ragResults = [{questionId: '', questionName: exactMatch.question, context: exactMatch.context, score: 1, matchedOn: 'exactMatch'}];
    } else if (c.env.AI) {
      // No exact match - do RAG search if AI binding is available
      mark('rag_search_start');
      try {
        const results = await searchRag(c.env.AI, lastUserMessage, c.env.RAG_EMBEDDINGS, {
          previousUserMessage,
          previousAssistantSummary,
        });
        if (results?.length) {
          ragResults = results;
          ragContext = formatRagContext(results);
        }
      } catch (err) {
        console.warn('RAG search failed, continuing with CV-only context:', err);
      }
      mark('rag_search_done');
    }

    const ragNames = ragResults.map(r => r.questionName);
    const expansionMetadata: ExpansionMetadata | null = ragResults._expansionMetadata || null;
    let responseText = '';

    // Build response headers with expansion metrics
    const buildHeaders = () => {
      const headers: Record<string, string> = {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-RAG-Results': String(ragResults.length),
        'X-Exact-Match': exactMatch ? 'true' : 'false',
      };

      if (expansionMetadata) {
        headers['X-RAG-Expansion-Triggered'] = 'true';
        headers['X-RAG-Expansion-Reason'] = expansionMetadata.reason;
        headers['X-RAG-Pass-Used'] = expansionMetadata.usedPass2 ? 'pass2' : 'pass1';
      } else {
        headers['X-RAG-Expansion-Triggered'] = 'false';
      }

      return headers;
    };

    try {
      mark('llm_call_start');
      const llmStartTime = Date.now();
      const chatResponse = await fetchChatCompletion(
        c.env,
        exactMatch ? messages.slice(-1) : messages,
        cvContext,
        ragContext,
      );
      const stream = streamCompletionResponse(chatResponse, {
        delayMs: c.env.STREAM_DELAY_MS ? Number(c.env.STREAM_DELAY_MS) : 0,
      });

      mark('llm_response_received');
      // Log timing breakdown
      const start = timings.request_start;
      const breakdown = Object.entries(timings)
        .map(([label, time]) => `${label}: +${time - start}ms`)
        .join(', ');
      console.log(`[TIMING] Chat request breakdown: ${breakdown}`);

      const capturingStream = createCapturingStream(stream, fullResponse => {
        const llmDuration = Date.now() - llmStartTime;
        trackAnalytics(c, clientId, {
          type: 'chat',
          question: lastUserMessage,
          response: fullResponse,
          ragNames,
          exactMatch: !!exactMatch,
          expansionTriggered: !!expansionMetadata,
          expansionReason: expansionMetadata?.reason,
          expansionUsedPass2: expansionMetadata?.usedPass2,
          llmResponseTimeMs: llmDuration,
        }).catch(error => {
          console.warn('Analytics failed:', error);
        });
      });

      return new Response(capturingStream, {
        headers: buildHeaders(),
      });
    } catch (error) {
      console.error('Chat completion error:', error);
      responseText = `I'm having trouble reaching the chat service right now.`;
    }

    await trackAnalytics(c, clientId, {
      type: 'chat',
      question: lastUserMessage,
      response: responseText,
      ragNames,
      exactMatch: !!exactMatch,
      expansionTriggered: !!expansionMetadata,
      expansionReason: expansionMetadata?.reason,
      expansionUsedPass2: expansionMetadata?.usedPass2,
      llmResponseTimeMs: null, // Error case, no LLM response
    }).catch(error => {
      console.warn('Analytics failed:', error);
    });

    const fallbackStream = streamText(responseText, {
      delayMs: c.env.STREAM_DELAY_MS ? Number(c.env.STREAM_DELAY_MS) : 16,
    });

    return new Response(fallbackStream, {
      headers: buildHeaders(),
    });
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.post('/api/fit-assessment', async c => {
  try {
    const body: FitAssessmentRequestBody = await c.req.json();
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
        url = `https://${url}`;
      }
      try {
        jobDescription = await fetchUrlContent(url);
        if (jobDescription.length < 50) {
          return c.json({ error: 'Could not extract enough content from the URL.' }, 400);
        }
      } catch (error) {
        let msg = error instanceof Error ? error.message : String(error);
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
        const message =
          'This content does not appear to be a job posting. Please provide a job description or a link to one.';
        await trackAnalytics(c, clientId, {
          type: 'fit-assessment',
          jobTitle: assessment.jobTitle,
          company: assessment.company || null,
          url: type === 'url' ? url : null,
          jobPostingJudgment: jobPostingJudgment || '',
        });
        return c.json({
          jobPostingJudgment,
          jobPostingMessage: jobPostingJudgment.reason || message,
        });
      }

      await trackAnalytics(c, clientId, {
        type: 'fit-assessment',
        jobTitle: assessment.jobTitle,
        company: assessment.company || null,
        url: type === 'url' ? url : null,
        verdict: assessment.verdict,
        gaps: assessment.gaps || [],
        matches: assessment.matches || [],
        recommendation: assessment.recommendation || '',
        summary: assessment.summary || '',
        jobPostingJudgment: jobPostingJudgment || '',
      });

      return c.json(assessment);
    } catch (error) {
      console.error('Fit assessment error:', error);
      return c.json({ error: 'Failed to analyze job fit. Please try again.' }, 500);
    }
  } catch (error) {
    console.error('Fit assessment request error:', error);
    // Provide a friendly user-facing error message instead of an opaque internal error reference
    const userMessage =
      'Web page is not currently accessible. Please verify the URL or paste the job description into the input and try again.';
    return c.json({ error: userMessage }, 500);
  }
});

app.get('/api/rag/embeddings', async c => {
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

app.post('/api/rag/embeddings', async c => {
  try {
    if (!c.env.AI) {
      return c.json({ error: 'AI binding is not configured.' }, 400);
    }

    const cache = c.env.RAG_EMBEDDINGS;
    if (!cache) {
      return c.json({ error: 'RAG_EMBEDDINGS KV is not configured.' }, 400);
    }

    // Determine whether to force regeneration (ignore cache). Accepts JSON body { force: true } or ?force=true
    let force = false;
    try {
      const body: unknown = await c.req.json();
      const bodyObj = (body as Record<string, unknown>) ?? {};
      if (bodyObj?.force === true || bodyObj?.force === 'true') {
        force = true;
      }
    } catch (_err) {
      // ignore JSON parse errors or empty bodies
    }

    const url = new URL(c.req.url);
    if (url.searchParams.get('force') === 'true') {
      force = true;
    }

    if (force) {
      console.log(
        'Preparing RAG embeddings with force=true; clearing cache and re-embedding all documents.',
      );
    }

    const status = await prepareQuestionEmbeddings(c.env.AI, cache, { force });
    // Include forced flag in response for clarity
    return c.json({ ...status, forced: force });
  } catch (error) {
    console.error('Failed to prepare RAG embeddings:', error);
    return c.json({ error: 'Failed to prepare RAG embeddings.' }, 500);
  }
});

app.get('/api/health', c => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default {
  fetch: app.fetch,
};
