// Script: generate-descriptions.js
// Purpose: Scan src/posts/**/*.md for posts missing a frontmatter `description` and (optionally)
// call the OpenAI API (gpt5-mini) to generate a short two-sentence summary, then write it into the
// post's YAML frontmatter.
//
// Usage:
//   node scripts/generate-descriptions.js [--dry-run] [--write] [--api] [--concurrency N]
//
// Options:
//   --dry-run   : Don't modify files, only show which files would be updated and the suggested descriptions.
//   --write     : Write descriptions back into files (overrides dry-run).
//   --api       : Actually call the OpenAI API (requires OPENAI_API_KEY in env). Without this flag, the script
//                 will generate a local excerpt fallback instead of calling OpenAI.
//   --concurrency N : Number of parallel API calls (default 1).
//
// Environment:
//   Set OPENAI_API_KEY when using --api. The script will not run network calls unless --api is passed.
//
// Notes:
//  - The script preserves existing frontmatter order as best-effort.
//  - For safety, always run with --dry-run first, then with --write --api when ready.

const fs = require('node:fs');
const path = require('node:path');
const glob = require('glob');
const matter = require('gray-matter');

// Load .env from the current working directory (where node is invoked)
function loadDotEnvFromCwd() {
    try {
        const dotenvPath = path.join(process.cwd(), '.env');
        if (!fs.existsSync(dotenvPath)) {
            return false;
        }
        const raw = fs.readFileSync(dotenvPath, 'utf8');
        const lines = raw.split(/\r?\n/);
        let loadedAny = false;
        for (let line of lines) {
            line = line.trim();
            if (!line) {
                continue;
            }
            // ignore comment lines starting with # or //
            if (line.startsWith('#') || line.startsWith('//')) {
                continue;
            }
            const idx = line.indexOf('=');
            if (idx === -1) {
                continue;
            }
            const key = line.slice(0, idx).trim();
            let val = line.slice(idx + 1).trim();
            // remove surrounding quotes if present
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                val = val.slice(1, -1);
            }
            if (key && typeof process.env[key] === 'undefined') {
                process.env[key] = val;
                loadedAny = true;
            }
        }
        return loadedAny;
    } catch (e) {
        // non-fatal: don't throw, but return false
        return false;
    }
}

// Attempt to load .env early so OPENAI_API_KEY can be available without additional setup
const hadKey = typeof process.env.OPENAI_API_KEY !== 'undefined';
const loaded = loadDotEnvFromCwd();
if (!hadKey && loaded && typeof process.env.OPENAI_API_KEY !== 'undefined') {
    console.log('Loaded OPENAI_API_KEY from .env in current working directory');
}

// System message for the model: strict, concise instructions for generating frontmatter descriptions
const system_msg = `You are a concise technical blog summarizer. Given the full article content from a technical blog post, produce a short, human-readable description suitable for the post's frontmatter (a meta description). Requirements:
- Output exactly two plain-text sentences, unless the content is too short (then output one clear sentence).
- Each sentence must be no more than 25 words.
- Tone: neutral, factual, non-promotional. Do NOT use marketing language, calls-to-action, or subjective praise.
- Do not include titles, URLs, author names, dates, or editing instructions.
- Return only the summary text with normal punctuation, no surrounding quotes, no markdown, no lists, and no extra commentary.
- Keep the final summary under 240 characters if possible.
If you cannot produce a two-sentence summary from the provided content, produce the best single-sentence factual summary instead.`;

// Use the global fetch provided by Node 18+; avoid node-fetch per request
let fetchFn = null;
if (typeof fetch !== 'undefined') {
    fetchFn = fetch;
} else if (typeof globalThis !== 'undefined' && typeof globalThis.fetch !== 'undefined') {
    fetchFn = globalThis.fetch;
} else {
    // If fetch isn't available, we'll error later when trying to call the API.
    fetchFn = null;
}

// Build a cross-platform glob pattern and normalize backslashes to forward slashes
const POSTS_GLOB = path.join(process.cwd(), 'src', 'posts', '**', '*.md').replace(/\\/g, '/');
// Also ensure any remaining backslashes are normalized (Windows path separators)
// so glob receives a posix-style pattern.
// Example: C:/Projects/.../src/posts/**/*.md
// Log for debugging when running on different platforms
console.log(`Using POSTS_GLOB pattern: ${POSTS_GLOB}`);

function argvFlag(name) {
    return process.argv.includes(name);
}

function argvValue(name, defaultValue) {
    const idx = process.argv.indexOf(name);
    if (idx >= 0 && process.argv.length > idx + 1) {
        return process.argv[idx + 1];
    }
    return defaultValue;
}

const DRY_RUN = argvFlag('--dry-run') && !argvFlag('--write');
const WRITE = argvFlag('--write');
const USE_API = argvFlag('--api');
const CONCURRENCY = parseInt(argvValue('--concurrency', '1'), 10) || 1;
// Optional limit: process at most N posts (0 or omitted = no limit)
const LIMIT = parseInt(argvValue('--limit', '0'), 10) || 0;

if (USE_API && !process.env.OPENAI_API_KEY) {
    console.error('ERROR: --api requested but OPENAI_API_KEY not set in environment. Exiting.');
    process.exit(1);
}

console.log('\nScanning posts for missing/empty descriptions...');

function firstNPlainText(markdown, n = 1200) {
    // crude strip of markdown/codeblocks/frontmatter already removed by gray-matter
    // remove code fences and inline code, links, images, and markdown formatting
    return markdown
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/`[^`]*`/g, ' ')
        .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/\[[^\]]*\]\([^)]*\)/g, ' ')
        .replace(/[*_>#\-\+\=\[\]\(\)]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, n);
}

async function callOpenAI(prompt) {
    if (!fetchFn) {
        throw new Error('fetch is not available in this Node runtime. Run on Node 18+ or enable global fetch.');
    }
    // Uses OpenAI Responses API endpoint
    const key = process.env.OPENAI_API_KEY;
    const url = 'https://api.openai.com/v1/chat/completions';
    // Use max_output_tokens per Responses API; include a conservative temperature
    const body = {
        model: 'gpt-5-nano',
        messages: [
            {
                role: 'system',
                content: system_msg
            },
            {
                role: 'user',
                content: prompt
            }
        ],
        reasoning_effort: 'minimal'
    };

    const res = await fetchFn(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
        },
        body: JSON.stringify(body)
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenAI API error: ${res.status} ${res.statusText} - ${text}`);
    }

    const data = await res.json();

    // Robust parsing for various response shapes from the Responses API
    // Try multiple patterns in order of likelihood
    let out = null;

    if (!out && data.choices && Array.isArray(data.choices) && data.choices.length) {
        const c = data.choices[0];
        if (c.message && c.message.content) {
            out = String(c.message.content).trim();
        } else if (c.text) {
            out = String(c.text).trim();
        }
    }

    if (!out) {
        throw new Error('OpenAI response did not contain text output');
    }
    return out;
}

async function processFile(file) {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = matter(raw);
    const desc = (parsed.data && typeof parsed.data.description !== 'undefined')
        ? (parsed.data.description || '').toString().trim() : null;
    if (desc && desc.length > 0) {
        return null;
    } // nothing to do

    const content = parsed.content || '';
    const excerpt = firstNPlainText(content, 1600);

    let suggested = '';
    if (USE_API) {
        const prompt = `You are a concise technical blog summarizer. Produce a short, human-readable two-sentence summary (no more than 25 words per sentence) suitable as an article description for a blog post. Keep it neutral, factual, and avoid marketing language. Here is the post content:\n\n${excerpt}\n\nReturn only the summary text.`;
        try {
            suggested = await callOpenAI(prompt);
        } catch (e) {
            console.error(`OpenAI call failed for ${file}: ${e.message}`);
            suggested = '';
        }
    }

    if (!suggested) {
        // Fallback: create a short summary from the first paragraph(s)
        const fallback = excerpt.split('\n\n')[0] || excerpt;
        // shorten to ~200 chars and end at sentence boundary if possible
        let s = fallback.slice(0, 220).trim();
        const lastPeriod = s.lastIndexOf('.');
        if (lastPeriod > 60) s = s.slice(0, lastPeriod + 1);
        suggested = s.replace(/\s+/g, ' ').trim();
    }

    // Ensure suggested is at most ~220 chars and two sentences
    // If the returned text is longer, try to trim to two sentences
    const sentences = suggested.split(/(?<=[.!?])\s+/).filter(Boolean);
    let final = '';
    if (sentences.length >= 2) {
        final = sentences.slice(0, 2).join(' ').trim();
    } else {
        final = sentences.join(' ').trim();
    }
    if (final.length > 240) final = final.slice(0, 237).trim() + '…';

    return {file, suggested: final};
}

async function run() {
    const files = glob.sync(POSTS_GLOB, {nodir: true});
    console.log(`Found ${files.length} post files in ${POSTS_GLOB}`);

    const toProcess = [];
    for (const f of files) {
        try {
            const raw = fs.readFileSync(f, 'utf8');
            const parsed = matter(raw);
            const desc = (parsed.data && typeof parsed.data.description !== 'undefined') ? (parsed.data.description || '').toString().trim() : null;
            if (!desc) {
                toProcess.push(f);
            }
        } catch (e) {
            console.error(`Failed to parse ${f}: ${e.message}`);
        }
    }

    // Apply limit if provided
    if (LIMIT > 0) {
        console.log(`Limiting processing to first ${LIMIT} files`);
        toProcess.splice(LIMIT);
    }

    console.log(`Files missing description: ${toProcess.length}`);
    if (toProcess.length === 0) {
        return;
    }

    const results = [];
    // simple sequential or limited concurrency
    for (let i = 0; i < toProcess.length; i += CONCURRENCY) {
        const batch = toProcess.slice(i, i + CONCURRENCY);
        const promises = batch.map(f => processFile(f));
        const outs = await Promise.all(promises);
        for (const o of outs) {
            if (!o) {
                continue;
            }
            // push to results list for reporting
            results.push(o);

            // If write is requested, write this description immediately
            if (WRITE) {
                try {
                    const raw = fs.readFileSync(o.file, 'utf8');
                    const parsed = matter(raw);
                    parsed.data.description = o.suggested;
                    const newRaw = matter.stringify(parsed.content, parsed.data, {lineWidth: 10000});
                    fs.writeFileSync(o.file, newRaw, 'utf8');
                    console.log(`Wrote description to ${o.file}`);
                } catch (e) {
                    console.error(`Failed to write description to ${o.file}: ${e.message}`);
                }
            }
        }
        if (USE_API) {
            // small delay to be polite and reduce burst rate
            await new Promise(r => setTimeout(r, 500));
        }
    }

    if (results.length === 0) {
        console.log('No suggestions generated.');
        return;
    }

    console.log('\nSuggestions:');
    for (const r of results) {
        console.log(`- ${r.file}: ${r.suggested}`);
    }

    if (DRY_RUN) {
        console.log('\nDry run; no files were modified.');
        return;
    }

    if (!WRITE) {
        console.log('\nNo --write flag given. Use --write to apply suggested descriptions to files.');
        return;
    }

    // If we already wrote each file as results arrived, just finish.
    console.log('\nAll done. If --write was provided, files were written as each suggestion was generated.');
}

run().catch(err => {
    console.error(err);
    process.exit(1);
});
