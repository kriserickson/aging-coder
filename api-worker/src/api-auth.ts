import type { Context } from 'hono';

const AUTH_WINDOW_MS = 5 * 60 * 1000;

interface AuthFields {
  salt?: string;
  date?: string;
  encodedSaltDate?: string;
}

interface ValidationResult {
  valid: boolean;
  status?: number;
  message?: string;
}

interface ParsedAuthRequest {
  requestBody: any;
  requestUrl: URL;
  authResult: ValidationResult;
}

interface Env {
  API_PASSWORD?: string;
}

const normalizeAuthValue = (value: any): string | undefined => {
  if (value == null) {
    return undefined;
  }
  const stringValue = value.toString().trim();
  return stringValue.length ? stringValue : undefined;
};

const bufferToHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');

const buildResetSignature = async (
  salt: string,
  date: string,
  password: string,
): Promise<string> => {
  const encoder = new TextEncoder();
  const payload = `${salt}|${date}|${password}`;
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  return bufferToHex(digest);
};

const getResetAuthFields = (c: Context, body: any, url: URL): AuthFields => {
  const headerValue = (name: string) => normalizeAuthValue(c.req.header(name));
  const queryValue = (name: string) => normalizeAuthValue(url.searchParams.get(name));
  const requestBody = body ?? {};

  const saltFromBody = normalizeAuthValue(requestBody.salt);
  const dateFromBody = normalizeAuthValue(requestBody.date);
  const encodedFromBody =
    normalizeAuthValue(requestBody.encodedSaltDate) ||
    normalizeAuthValue(requestBody.encoded) ||
    normalizeAuthValue(requestBody.token);

  return {
    salt:
      saltFromBody ??
      headerValue('X-Reset-Salt') ??
      headerValue('X-Rag-Salt') ??
      queryValue('salt'),
    date:
      dateFromBody ??
      headerValue('X-Reset-Date') ??
      headerValue('X-Rag-Date') ??
      queryValue('date'),
    encodedSaltDate:
      encodedFromBody ??
      headerValue('X-Encoded-Salt-Date') ??
      headerValue('X-Reset-Signature') ??
      queryValue('encodedSaltDate') ??
      queryValue('encoded'),
  };
};

const validateResetSignature = async ({
  salt,
  date,
  encodedSaltDate,
  password,
}: AuthFields & { password?: string }): Promise<ValidationResult> => {
  if (!password) {
    return {
      valid: false,
      status: 500,
      message: 'API_PASSWORD is not configured for resetting embeddings.',
    };
  }

  if (!salt || !date || !encodedSaltDate) {
    return {
      valid: false,
      status: 401,
      message: 'Missing reset authentication payload.',
    };
  }

  const timestamp = Date.parse(date);
  if (Number.isNaN(timestamp)) {
    return {
      valid: false,
      status: 401,
      message: 'Invalid reset timestamp.',
    };
  }

  if (Math.abs(Date.now() - timestamp) > AUTH_WINDOW_MS) {
    return {
      valid: false,
      status: 401,
      message: 'Reset timestamp is outside the allowed window.',
    };
  }

  const expectedSignature = await buildResetSignature(salt, date, password);
  if (expectedSignature !== encodedSaltDate.toLowerCase()) {
    return {
      valid: false,
      status: 401,
      message: 'Invalid reset authentication token.',
    };
  }

  return { valid: true };
};

const parseResetAuthRequest = async (c: Context<{ Bindings: Env }>): Promise<ParsedAuthRequest> => {
  let requestBody: any = null;
  try {
    requestBody = await c.req.json();
  } catch (_err) {
    // ignore malformed or empty bodies
  }

  const requestUrl = new URL(c.req.url);
  const { salt, date, encodedSaltDate } = getResetAuthFields(c, requestBody, requestUrl);
  const authResult = await validateResetSignature({
    salt,
    date,
    encodedSaltDate,
    password: c.env.API_PASSWORD,
  });

  return { requestBody, requestUrl, authResult };
};

export { parseResetAuthRequest };
