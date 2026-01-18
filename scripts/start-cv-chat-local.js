const { spawn } = require('node:child_process');
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(process.cwd(), '.env') });

const siteEnv = {
  ...process.env,
  CV_CHAT_ENDPOINT: process.env.CV_CHAT_ENDPOINT || 'http://localhost:8787/api/chat'
};

const workerEnv = {
  ...process.env,
  CORS_ORIGINS: process.env.CORS_ORIGINS || 'http://localhost:8888',
  STREAM_DELAY_MS: process.env.STREAM_DELAY_MS || '12',
  DAILY_LIMIT: process.env.DAILY_LIMIT || '60',
  CHAT_MODEL: process.env.CHAT_MODEL || 'gpt-4o-mini',
  CHAT_BASE_URL: process.env.CHAT_BASE_URL || 'https://openrouter.ai/api/v1',
  CHAT_APP_NAME: process.env.CHAT_APP_NAME || 'aging-coder-cv-chat',
  CHAT_APP_URL: process.env.CHAT_APP_URL || 'http://localhost:8888'
};

const run = (command, args, options) =>
  spawn(command, args, { stdio: 'inherit', shell: true, ...options });

const worker = run('npm', ['run', 'dev'], {
  cwd: path.join(process.cwd(), 'api-worker'),
  env: workerEnv
});

const site = run('npm', ['run', 'serve'], {
  cwd: process.cwd(),
  env: siteEnv
});

const shutdown = () => {
  worker.kill('SIGINT');
  site.kill('SIGINT');
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
