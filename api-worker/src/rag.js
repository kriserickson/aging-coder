import ragConfig from './rag-data/rag-config.json';
import cvData from './rag-data/cv.json';
import questionsData from './rag-data/questions.json';

const CV_SOURCE_ID = 'cv';

const sourceData = {
  './cv.json': cvData
};

const allSources = ragConfig.sources
  .map((source) => ({
    ...source,
    data: sourceData[source.path]
  }))
  .filter((source) => source.data);

// CV source is always included as base context (no embedding needed)
const cvSource = allSources.find((source) => source.id === CV_SOURCE_ID);

// Only non-CV sources need RAG embedding search
const ragSources = allSources.filter((source) => source.id !== CV_SOURCE_ID);

const EMBEDDING_MODEL = '@cf/baai/bge-small-en-v1.5';
const EMBEDDING_BATCH_SIZE = 20;
const EMBEDDING_FALLBACK_DIM = 128;
const EMBEDDING_CACHE_PREFIX = 'rag-embedding:';

const textEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null;
const textDecoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8') : null;

const encodeUtf8 = (value) => {
  const normalized = value ?? '';
  if (textEncoder) {
    return textEncoder.encode(normalized);
  }
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(normalized, 'utf-8'));
  }
  throw new Error('Text encoding is not supported in this environment.');
};

const decodeUtf8 = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value === 'string') {
    return value;
  }
  if (textDecoder) {
    return textDecoder.decode(value);
  }
  if (typeof Buffer !== 'undefined') {
    if (value instanceof ArrayBuffer) {
      return Buffer.from(value).toString('utf-8');
    }
    if (ArrayBuffer.isView(value)) {
      return Buffer.from(value.buffer, value.byteOffset, value.byteLength).toString('utf-8');
    }
  }
  return String(value);
};

const toHexString = (buffer) =>
  Array.from(new Uint8Array(buffer))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');

const hashString = async (value) => {
  const normalized = value ?? '';
  const bytes = encodeUtf8(normalized);
  if (globalThis.crypto?.subtle?.digest) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
    return toHexString(digest);
  }

  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) | 0;
  }
  return `fallback-${(hash >>> 0).toString(16).padStart(8, '0')}`;
};

// Exact question matching - build hash lookup at startup
let questionHashMap = null;
let questionHashMapPromise = null;

const normalizeQuestionText = (text) => {
  if (!text) return '';
  return text.trim().toLowerCase();
};

const buildQuestionHashMap = async () => {
  if (questionHashMap) return questionHashMap;
  if (questionHashMapPromise) return questionHashMapPromise;

  questionHashMapPromise = (async () => {
    const map = new Map();
    const questions = questionsData?.questions || [];

    for (const q of questions) {
      if (!q.name) continue;
      const normalized = normalizeQuestionText(q.name);
      const hash = await hashString(normalized);
      map.set(hash, {
        name: q.name,
        context: q.context
      });
    }

    questionHashMap = map;
    return map;
  })();

  return questionHashMapPromise;
};

export const findExactQuestionMatch = async (question) => {
  if (!question) return null;

  const map = await buildQuestionHashMap();
  const normalized = normalizeQuestionText(question);
  const hash = await hashString(normalized);

  const match = map.get(hash);
  if (match) {
    return {
      question: match.name,
      context: match.context
    };
  }

  return null;
};

const buildCacheKey = (docId) => `${EMBEDDING_CACHE_PREFIX}${docId}`;

const ensureDocumentHash = async (doc) => {
  if (doc._textHash) {
    return doc._textHash;
  }
  doc._textHash = await hashString(doc.text);
  return doc._textHash;
};

const hydrateDocumentFromCache = async (cache, doc) => {
  if (!cache) return;

  try {
    const raw = await cache.get(buildCacheKey(doc.id));
    if (!raw) return;
    const cached = decodeUtf8(raw);
    if (!cached) return;

    const parsed = JSON.parse(cached);
    if (!parsed?.hash || !Array.isArray(parsed.embedding)) return;

    const hash = await ensureDocumentHash(doc);
    if (hash !== parsed.hash) return;

    doc.embedding = parsed.embedding;
  } catch (err) {
    console.warn('Failed to hydrate embedding cache for', doc.id, err);
  }
};

const cacheDocumentEmbedding = async (cache, doc) => {
  if (!cache || !doc.embedding) return;

  try {
    const payload = JSON.stringify({
      hash: await ensureDocumentHash(doc),
      embedding: doc.embedding
    });
    await cache.put(buildCacheKey(doc.id), payload);
  } catch (err) {
    console.warn('Failed to persist embedding cache for', doc.id, err);
  }
};

const cosineSimilarity = (vecA, vecB) => {
  if (!vecA?.length || !vecB?.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i += 1) {
    const a = vecA[i];
    const b = vecB[i];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (!normA || !normB) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const extractEmbeddings = (result, expectedLength) => {
  const embeddings = result?.data?.map((item) => item?.embedding).filter(Boolean);
  if (embeddings?.length === expectedLength) {
    return embeddings;
  }
  const fallback = Array.isArray(result?.embedding) ? [result.embedding] : [];
  return fallback.length ? fallback : [];
};

const ensureAiBinding = (ai) => {
  if (!ai) {
    throw new Error('Cloudflare AI binding is not configured.');
  }
};

const fallbackEmbedding = (text) => {
  // Deterministic lightweight fallback embedding from text
  const dims = EMBEDDING_FALLBACK_DIM;
  const vec = new Array(dims).fill(0);
  if (!text) return vec;
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    const idx = i % dims;
    vec[idx] += (code % 97) / 97; // small value
  }
  // Normalize vector
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0)) || 1;
  return vec.map((v) => v / norm);
};

const embedTexts = async (ai, texts) => {
  ensureAiBinding(ai);

  // First, try batching the texts in a single call
  try {
    const result = await ai.run(EMBEDDING_MODEL, { text: texts });
    const embeddings = extractEmbeddings(result, texts.length);
    if (embeddings.length === texts.length) {
      return embeddings;
    }

    console.warn('embedTexts: batch embedding returned unexpected length:', embeddings.length, 'expected:', texts.length);
  } catch (err) {
    console.warn('embedTexts: batch embedding failed:', err);
  }

  // Fallback: embed each text individually
  const singleEmbeds = [];
  for (const t of texts) {
    try {
      const r = await ai.run(EMBEDDING_MODEL, { text: t });
      const extracted = extractEmbeddings(r, 1);
      if (extracted.length === 1) {
        singleEmbeds.push(extracted[0]);
        continue;
      }
      console.warn('embedTexts: single embedding returned empty for text:', t.slice(0, 120));
      singleEmbeds.push(null);
    } catch (err) {
      console.warn('embedTexts: single embedding failed for text:', t.slice(0, 120), err);
      singleEmbeds.push(null);
    }
  }

  // If some embeddings failed, replace with deterministic fallback vectors so RAG can still run
  const finalEmbeds = singleEmbeds.map((e, idx) => (e ? e : fallbackEmbedding(texts[idx])));

  const succeeded = finalEmbeds.filter(Boolean).length;
  if (succeeded !== texts.length) {
    // This should not happen because fallbackEmbedding always returns an array
    console.warn('embedTexts: unexpected missing embeddings after fallback. succeeded:', succeeded, 'expected:', texts.length);
  }

  return finalEmbeds;
};

const flattenData = (value, path = []) => {
  if (value === null || value === undefined) return [];

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [{
      path,
      text: String(value)
    }];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenData(item, [...path, String(index)]));
  }

  if (typeof value === 'object') {
    return Object.entries(value).flatMap(([key, item]) => flattenData(item, [...path, key]));
  }

  return [];
};

const buildDocuments = () => {
  const documents = [];

  // Only build documents from non-CV sources (for RAG embedding search)
  for (const source of ragSources) {
    const flattened = flattenData(source.data);
    for (const entry of flattened) {
      const section = entry.path.slice(0, 2).join('.');
      documents.push({
        id: `${source.id}:${entry.path.join('.')}`,
        source: source.id,
        title: source.title,
        section,
        text: entry.text,
        embedding: null
      });
    }
  }

  return documents;
};

// Build CV documents separately (for context formatting, no embeddings)
const buildCvDocuments = () => {
  if (!cvSource) return [];

  const documents = [];
  const flattened = flattenData(cvSource.data);
  for (const entry of flattened) {
    const section = entry.path.slice(0, 2).join('.');
    documents.push({
      id: `${cvSource.id}:${entry.path.join('.')}`,
      source: cvSource.id,
      title: cvSource.title,
      section,
      text: entry.text
    });
  }
  return documents;
};

const documents = buildDocuments();
const cvDocuments = buildCvDocuments();

const embedDocuments = async (ai, cache) => {
  ensureAiBinding(ai);
  if (cache) {
    for (const doc of documents) {
      if (doc.embedding) continue;
      await hydrateDocumentFromCache(cache, doc);
    }
  }

  const pending = documents.filter((doc) => !doc.embedding);
  for (let i = 0; i < pending.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = pending.slice(i, i + EMBEDDING_BATCH_SIZE);
    const texts = batch.map((doc) => doc.text);
    const embeddings = await embedTexts(ai, texts);
    embeddings.forEach((embedding, index) => {
      batch[index].embedding = embedding;
    });
    await Promise.all(batch.map((doc) => cacheDocumentEmbedding(cache, doc)));
  }
};

const summarizeContext = (docs) => {
  if (!docs.length) return '';

  return docs
    .map((doc) => `- (${doc.title}/${doc.section || 'general'}) ${doc.text}`)
    .join('\n');
};

export const searchRag = async (ai, query, { maxResults = 8, minScore = 0.18, cache } = {}) => {
  if (!query) return [];

  // If there are no non-CV documents to search, skip embedding entirely
  if (!documents.length) {
    return [];
  }

  await embedDocuments(ai, cache);

  const [queryEmbedding] = await embedTexts(ai, [query]);

  const scored = documents
    .map((doc) => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }))
    .filter((doc) => doc.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);

  return scored;
};

export const formatRagContext = (results) => {
  if (!results.length) {
    return 'No relevant context found.';
  }

  return summarizeContext(results);
};

export const formatAllContext = () => summarizeContext(cvDocuments);
