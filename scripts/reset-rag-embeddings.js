const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const dotenv = require('dotenv');

dotenv.config();

// Load .env from repository root directly (don't rely on process.env being populated)
const ROOT_ENV_PATH = path.join(__dirname, '../.env');

const DEV_VARS_PATH = path.join(__dirname, '../api-worker/.dev.vars');

const parseDevVars = async () => {
  try {
    const contents = await fs.readFile(DEV_VARS_PATH, 'utf8');
    const parsed = dotenv.parse(contents);
    const password = parsed.API_PASSWORD;
    return password ? password.trim() : undefined;
  } catch (error) {
    // Ignore if the file does not exist or cannot be read.
    return undefined;
  }
};

const parseArgs = () => {
  const options = { force: true };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--force') {
      options.force = true;
    } else if (arg === '--no-force') {
      options.force = false;
    } else if (arg.startsWith('--endpoint=')) {
      options.endpoint = arg.split('=')[1]?.trim();
    } else if (arg.startsWith('--password=')) {
      options.password = arg.split('=')[1]?.trim();
    }
  }
  return options;
};

const computeSignature = (salt, date, password) => {
  const payload = `${salt}|${date}|${password}`;
  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
};

const main = async () => {
  const options = parseArgs();

  // Prefer CV_CHAT_API from the root .env file; fall back to RAG_RESET_ENDPOINT or localhost
  let rootEnv = {};
  try {
    const rootEnvContents = await fs.readFile(ROOT_ENV_PATH, 'utf8');
    rootEnv = dotenv.parse(rootEnvContents);
  } catch (e) {
    // no root .env found
  }

  const defaultEndpoint = (rootEnv.CV_CHAT_API && rootEnv.CV_CHAT_API.trim().length)
    ? `${rootEnv.CV_CHAT_API.replace(/\/$/, '')}/api/rag/embeddings`
    : 'http://127.0.0.1:8787/api/rag/embeddings';

  const endpoint = options.endpoint || process.env.RAG_RESET_ENDPOINT || defaultEndpoint;

  const password =
    options.password || process.env.API_PASSWORD || (await parseDevVars());

  if (!password) {
    throw new Error(
      'API_PASSWORD is not configured. Set API_PASSWORD in the environment or in api-worker/.dev.vars.'
    );
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const date = new Date().toISOString();
  const encodedSaltDate = computeSignature(salt, date, password);
  const url = new URL(endpoint);
  if (options.force) {
    url.searchParams.set('force', 'true');
  } else {
    url.searchParams.delete('force');
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      force: options.force,
      salt,
      date,
      encodedSaltDate
    })
  });

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`Failed to reset RAG embeddings: ${response.status} ${responseBody}`);
  }

  const data = await response
    .json()
    .catch(() => ({ message: 'Reset completed but response was not valid JSON.' }));

  console.log('RAG embeddings reset successful', data);
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
