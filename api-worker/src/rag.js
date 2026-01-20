import cvData from './rag-data/cv.json';
import questionsData from './rag-data/questions.json';

const questionEntries = questionsData?.questions || [];

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
  if (!text) {
    return '';
  }
  return text.trim().toLowerCase();
};

const slugifyQuestionText = (text) => {
  const normalized = normalizeQuestionText(text);
  const slug = normalized.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return slug || 'question';
};

const buildQuestionId = (question, index) => {
  const base = slugifyQuestionText(question?.name) || `question-${index}`;
  return `question:${base}`;
};

const buildQuestionHashMap = async () => {
  if (questionHashMap) {
    return questionHashMap;
  }
  if (questionHashMapPromise) {
    return questionHashMapPromise;
  }

  questionHashMapPromise = (async () => {
    const map = new Map();
    const questions = questionsData?.questions || [];

    for (const q of questions) {
      if (!q.name) {
        continue;
      }
      const normalized = normalizeQuestionText(q.name);
      const hash = await hashString(normalized);
      map.set(hash, {
        name: q.name,
        context: q.context,
        verbatim: !!q.verbatim
      });
    }

    questionHashMap = map;
    return map;
  })();

  return questionHashMapPromise;
};

export const findExactQuestionMatch = async (question) => {
  if (!question) {
    return null;
  }

  const map = await buildQuestionHashMap();
  const normalized = normalizeQuestionText(question);
  const hash = await hashString(normalized);

  const match = map.get(hash);
  if (match) {
    return {
      question: match.name,
      context: match.context,
      verbatim: !!match.verbatim
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
  if (!cache) {
    return;
  }

  try {
    const raw = await cache.get(buildCacheKey(doc.id));
    if (!raw) {
      return;
    }
    const cached = decodeUtf8(raw);
    if (!cached) {
      return;
    }

    const parsed = JSON.parse(cached);
    if (!parsed?.hash || !Array.isArray(parsed.embedding)) {
      return;
    }

    const hash = await ensureDocumentHash(doc);
    if (hash !== parsed.hash) {
      return;
    }

    doc.embedding = parsed.embedding;
  } catch (err) {
    console.warn('Failed to hydrate embedding cache for', doc.id, err);
  }
};

const cacheDocumentEmbedding = async (cache, doc) => {
  if (!cache || !doc.embedding) {
    return;
  }

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
  if (!vecA?.length || !vecB?.length) {
    return 0;
  }
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

  if (!normA || !normB) {
    return 0;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const extractEmbeddings = (result, expectedLength) => {
  const isEmbeddingArray = (arr) => Array.isArray(arr) && arr.length > 0 && typeof arr[0] === 'number';

  // Case A: result is an array of embedding arrays directly (e.g., [[..],[..],...])
  if (Array.isArray(result) && result.length === expectedLength && result.every(isEmbeddingArray)) {
    return result;
  }

  // Case A2: result is a single embedding vector (e.g., [0.1, 0.2, ...])
  if (Array.isArray(result) && isEmbeddingArray(result)) {
    // Single embedding returned directly; wrap for consistency
    return [result];
  }

  // Case B: result.data is an array; items may be embedding arrays or objects with .embedding
  const data = result?.data;
  if (Array.isArray(data)) {
    const embeddings = data
      .map((item) => {
        if (isEmbeddingArray(item)) return item;
        if (item && isEmbeddingArray(item.embedding)) return item.embedding;
        return null;
      })
      .filter(Boolean);

    if (embeddings.length === expectedLength) {
      return embeddings;
    }
  }

  // Case C: single-call response: result.embedding may be an embedding array
  if (isEmbeddingArray(result?.embedding)) {
    return expectedLength === 1 ? [result.embedding] : [result.embedding].slice(0, expectedLength);
  }

  // Nothing matched
  return [];
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
  if (!text) {
    return vec;
  }
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
  if (value === null || value === undefined) {
    return [];
  }

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

const buildQuestionDocuments = () => {
  const documents = [];

  questionEntries.forEach((question, index) => {
    const questionId = buildQuestionId(question, index);
    const nameText = question?.name ?? '';
    const contextText = question?.context ?? '';
    if (!nameText && !contextText) {
      return;
    }

    const displayContext = contextText || nameText;
    const questionName = question?.name || 'Question';

    if (nameText) {
      documents.push({
        id: `${questionId}:name`,
        questionId,
        type: 'name',
        text: nameText,
        context: displayContext,
        questionName,
        embedding: null
      });
    }

    if (contextText) {
      documents.push({
        id: `${questionId}:context`,
        questionId,
        type: 'context',
        text: contextText,
        context: contextText,
        questionName,
        embedding: null
      });
    }
  });

  return documents;
};


const questionDocuments = buildQuestionDocuments();

const embedDocuments = async (ai, cache, { force = false } = {}) => {
  ensureAiBinding(ai);

  if (force) {
    // When forcing, clear any in-memory and cached embeddings so we re-create them.
    if (cache) {
      for (const questionDocument of questionDocuments) {
        try {
          await cache.delete(buildCacheKey(questionDocument.id));
        } catch (err) {
          console.warn('Failed to delete cache for', questionDocument.id, err);
        }
        questionDocument.embedding = null;
      }
    } else {
      for (const questionDocument of questionDocuments) {
        questionDocument.embedding = null;
      }
    }
  } else if (cache) {
    for (const questionDocument of questionDocuments) {
      if (questionDocument.embedding) {
        continue;
      }
      await hydrateDocumentFromCache(cache, questionDocument);
    }
  }

  const pending = questionDocuments.filter((doc) => !doc.embedding);
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


const buildRagContextString = (results) =>
  results
    .map((result) => `- ${result.questionName}\n${result.context}`)
    .join('\n\n');

export const searchRag = async (ai, query, { maxResults = 5, minScore = 0.6, cache } = {}) => {
  if (!query) {
    return [];
  }

  if (!questionDocuments.length) {
    return [];
  }

  await embedDocuments(ai, cache);

  const [queryEmbedding] = await embedTexts(ai, [query]);
  if (!queryEmbedding?.length) {
    return [];
  }

  const scored = questionDocuments
    .map((doc) => ({
      ...doc,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    }))
    .filter((doc) => doc.score >= minScore)
    .sort((a, b) => b.score - a.score);

  const bestByQuestion = new Map();
  for (const doc of scored) {
    const existing = bestByQuestion.get(doc.questionId);
    if (!existing || doc.score > existing.score) {
      bestByQuestion.set(doc.questionId, {
        questionId: doc.questionId,
        questionName: doc.questionName,
        context: doc.context || '',
        score: doc.score,
        matchedOn: doc.type
      });
    }
  }

  return Array.from(bestByQuestion.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults);
};

export const formatRagContext = (results) => {
  if (!results.length) {
    return 'No relevant context found.';
  }

  return buildRagContextString(results);
};

export const formatAllContext = () => {
  return JSON.stringify(cvData, null, 2);
};

const describeDocumentStatus = (doc) => ({
  id: doc.id,
  questionId: doc.questionId,
  type: doc.type,
  hasEmbedding: Array.isArray(doc.embedding) && doc.embedding.length > 0,
  embdeddingLength: Array.isArray(doc.embedding) ? doc.embedding.length : 0
});

const buildEmbeddingStatus = async (cache) => {
  const statuses = [];
  for (const doc of questionDocuments) {
    if (cache && !doc.embedding) {
      await hydrateDocumentFromCache(cache, doc);
    }
    statuses.push(describeDocumentStatus(doc));
  }
  const cachedCount = statuses.filter((status) => status.hasEmbedding).length;
  return {
    total: statuses.length,
    cached: cachedCount,
    missing: statuses.length - cachedCount,
    documents: statuses
  };
};

export const getQuestionEmbeddingStatus = async (cache) => buildEmbeddingStatus(cache);

export const prepareQuestionEmbeddings = async (ai, cache, options = {}) => {
  await embedDocuments(ai, cache, options);
  return buildEmbeddingStatus(cache);
};
