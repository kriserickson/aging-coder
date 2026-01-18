import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { searchRag, formatRagContext, formatAllContext } from './rag';

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

const buildSystemPrompt = () =>
  'You are a helpful assistant that answers questions about Kris Erickson\'s CV. ' +
  'Be concise, factual, and only use the provided context.';

const buildUserPrompt = (message, context) =>
  `Question: ${message}\n\nContext:\n${context}\n\nAnswer the question using the context above.`;

const getOpenRouterConfig = (env) => ({
  apiKey: env?.CHAT_API_KEY,
  model: env?.CHAT_MODEL || 'gpt-4o-mini',
  baseUrl: env?.CHAT_BASE_URL || 'https://openrouter.ai/api/v1',
  appName: env?.CHAT_APP_NAME || 'aging-coder-cv-chat',
  appUrl: env?.CHAT_APP_URL || 'https://agingcoder.com'
});

const fetchChatCompletion = async (env, message, context) => {
  const { apiKey, model, baseUrl, appName, appUrl } = getOpenRouterConfig(env);
  if (!apiKey) {
    throw new Error('CHAT_API_KEY is not configured.');
  }

  const payload = {
    model,
    stream: true,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(message, context) }
    ]
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

  await kv.set(key, (count + 1).toString(), { expirationTtl: 86400 });
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
    const message = normalizeQuestion(body?.message);

    const validationError = validateMessage(message);
    if (validationError) {
      return c.json({ error: validationError }, 400);
    }

    const clientId = getClientId(c);
    const canProceed = await checkRateLimit(c, clientId);

    if (!canProceed) {
      return c.json({ error: 'Daily question limit reached. Please try again tomorrow.' }, 429);
    }

    let ragResults = [];
    let ragContext = '';

    if (c.env.AI) {
      ragResults = await searchRag(c.env.AI, message);
      ragContext = formatRagContext(ragResults);
    } else {
      ragContext = formatAllContext();
    }

    let responseText = '';

    try {
      const chatResponse = await fetchChatCompletion(c.env, message, ragContext);
      const stream = streamCompletionResponse(chatResponse, {
        delayMs: c.env.STREAM_DELAY_MS ? Number(c.env.STREAM_DELAY_MS) : 0
      });

      trackAnalytics(c, clientId, message, '[streamed response]').catch((error) => {
        console.warn('Analytics failed:', error);
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-RAG-Results': String(ragResults.length)
        }
      });
    } catch (error) {
      console.error('Chat completion error:', error);
      responseText = `I'm having trouble reaching the chat service right now. ${ragContext}`;
    }

    await trackAnalytics(c, clientId, message, responseText);

    const fallbackStream = streamText(responseText, {
      delayMs: c.env.STREAM_DELAY_MS ? Number(c.env.STREAM_DELAY_MS) : 16
    });

    return new Response(fallbackStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-RAG-Results': String(ragResults.length)
      }
    });
  } catch (error) {
    console.error('Chat error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default {
  fetch: app.fetch
};
