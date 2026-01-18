import ragConfig from './rag-config.json';
import cvData from './rag-data/cv.json';

const sourceData = {
  './rag-data/cv.json': cvData
};

const ragSources = ragConfig.sources
  .map((source) => ({
    ...source,
    data: sourceData[source.path]
  }))
  .filter((source) => source.data);

if (!ragSources.length) {
  throw new Error('No RAG sources configured.');
}

const EMBEDDING_MODEL = '@cf/baai/bge-small-en-v1.5';
const EMBEDDING_BATCH_SIZE = 20;

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

const embedTexts = async (ai, texts) => {
  ensureAiBinding(ai);
  const result = await ai.run(EMBEDDING_MODEL, { text: texts });
  const embeddings = extractEmbeddings(result, texts.length);
  if (embeddings.length !== texts.length) {
    throw new Error('Unexpected embedding response length.');
  }
  return embeddings;
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

const documents = buildDocuments();

const embedDocuments = async (ai) => {
  ensureAiBinding(ai);
  const pending = documents.filter((doc) => !doc.embedding);
  for (let i = 0; i < pending.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = pending.slice(i, i + EMBEDDING_BATCH_SIZE);
    const texts = batch.map((doc) => doc.text);
    const embeddings = await embedTexts(ai, texts);
    embeddings.forEach((embedding, index) => {
      batch[index].embedding = embedding;
    });
  }
};

const summarizeContext = (docs) => {
  if (!docs.length) return '';

  return docs
    .map((doc) => `- (${doc.title}/${doc.section || 'general'}) ${doc.text}`)
    .join('\n');
};

export const searchRag = async (ai, query, { maxResults = 8, minScore = 0.18 } = {}) => {
  if (!query) return [];

  await embedDocuments(ai);

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

export const formatAllContext = () => summarizeContext(documents);
