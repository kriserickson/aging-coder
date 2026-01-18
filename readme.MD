Aging Coder — Modernized Eleventy Site

This repository is the Aging Coder blog (Eleventy). The site has been modernized to use Pico CSS, lightweight custom styles, improved image handling, and a few developer utilities to make authoring and maintenance easier.

Quick commands

- Install dependencies:

```bash
npm install
```

- Build the static site (writes to `_site/`):

```bash
npm run build
```

- Serve locally with Eleventy (live-reload):

```bash
npm run serve
```

High-level architecture

- Eleventy (`.eleventy.js`) is the static site generator and central place for collection, shortcode, filter, and transform configuration.
- Markdown is processed with `markdown-it` plus plugins for KaTeX and anchors. Mermaid fenced blocks are rendered into `<pre class="mermaid">...</pre>` so client-side Mermaid can initialize them.
- Collections provided: `posts`, `categories`, `tags`, `featured`, `feedPosts`, and `static-snippets`.
- A transform rewrites plain `<img>` markup in generated HTML to add `loading="lazy"`, `decoding="async"`, a class `img-inline`, and wraps the image in `<p class="with-image">` so CSS can style inline images consistently.
- Shortcodes:
  - `thumbnail` — responsive thumbnail generator (uses `@11ty/eleventy-img` for local images, falls back to plain `<img>` for remote images).
  - `mermaid` paired shortcode for embedding Mermaid blocks in templates.
  - `snippetRawLink` — link to raw markdown for a snippet.

Where to put content

- Posts
  - Put posts under `src/posts/`. Nested folders are supported — the site canonicalizes post permalinks so files moved into nested folders (for example `src/posts/older/`) continue to publish at `/posts/<slug>/`.
  - Example frontmatter:

```yaml
---
title: "My Post"
date: 2025-10-01
tags: [eleventy, notes]
category: Blog
draft: true    # remove or set to false to publish
featured: false
description: "A short two-sentence summary shown in listings"
---
```

- Static snippets
  - Add Markdown files to `src/static-snippets/` and include a `snippet: name` value in frontmatter. These are loaded into the `static-snippets` collection and get `data.rawMarkdown` and `data.raw_permalink` attached for easy embedding.
  - Use the `findSnippetByName` filter/shortcode from templates to pull a snippet by name.

- Mermaid diagrams
  - Use fenced code blocks in Markdown:

```markdown
```mermaid
graph TD; A-->B;
`` `
```

  - Or use the paired Nunjucks shortcode in templates:

```njk
{% mermaid %}
graph TD; A-->B;
{% endmermaid %}
```

  - The code block is rendered to `<pre class="mermaid">…</pre>` so client-side Mermaid (if included) converts it to a diagram.

Thumbnail and image handling

- Use the `thumbnail` Nunjucks shortcode where you want a feature image: `{% thumbnail post.data.imagefeature, post.data.title %}`.
  - For local images this generates WebP + JPEG variants and `srcset` using `@11ty/eleventy-img` and writes files into `_site/img/`.
  - For remote images it emits a lazy `<img>` fallback.
- The `wrapImages` transform ensures inline images get consistent attributes and a wrapper so CSS can style them.

Drafts and publishing workflow

- There are two common ways this project handles drafts: frontmatter flags (manual) and the convenience npm scripts in `package.json` (`npm run draft` and `npm run publish`). Below is the precise behavior of those helper scripts so you know what they do and how to call them.

- Frontmatter method (manual): Mark a post as a draft by adding `draft: true` to its frontmatter.  To publish a draft using this method: remove `draft: true` (or set it to `false`) and run the production build.

- Npm scripts method (convenient): Use the `npm run draft` script to create a new draft post:

```cmd
npm run publish
```

- Notes & recommendations:
  - Because `js/publish-draft.js` only scans the immediate files in `src/posts/`, drafts located in nested directories (for example `src/posts/older/my-draft.md`) will not be found by the `publish` script. If you rely on nested draft locations you can either move drafts to the top-level `src/posts/` before running `npm run publish` or I can update the script to search recursively.
  - The `create-post.js` script enforces a title argument and marks the new post as a draft. If you want a different frontmatter template (for example to pre-fill `category` or `tags`) we can adjust the template in that script.
  - The publish script is conservative: it only removes a line that exactly matches `draft: true` (case-insensitive) and otherwise preserves existing frontmatter formatting and fields.

Permalinks and moving files

- Posts under `src/posts/**` are canonicalized so the output permalink ignores intermediate folders and only uses the file slug, e.g. `src/posts/older/my-post.md` -> `/posts/my-post/`. This makes reorganizing old posts safe without changing the public URL.
- Be cautious of duplicate slugs (two files named `my-post.md` in different folders will conflict); `.eleventy.js` emits a console warning for duplicate slugs at build time.

Categories, tags, and featured

- `categories` and `tags` collections gather posts across `src/posts/**` (including nested folders). Categories are returned sorted alphabetically; each category entry contains `name`, `size` (post count), and `posts` (sorted by date newest-first).
- `featured` collects posts with a truthy `featured` frontmatter value and respects the same draft filtering.

Developer utilities and scripts

- `scripts/` contains utility scripts used for maintenance or one-off tasks (image processing helpers, content generation, small data transforms). Each script is intended to be run from the project root with Node:

```bash
node scripts/<script-name>.js
```

- Brief ideas of what scripts do (check each file for options):
  - generate-descriptions.js — can be used to auto-provision `description` frontmatter for posts (if integrated with an LLM).
  - apply-palette.js / screenshot-themes.js — helpers for theme previews and CSS palette automation.

Filters and shortcodes summary

- Filters: `excerpt` (prefers `description`, falls back to stripped content), `sortByName`, `findSnippetByName`, date filter via `nunjucks-date`.
- Shortcodes: `thumbnail` (Nunjucks async), `mermaid` (paired), `snippetRawLink`.

Adding a new post (quick)

1. Create `src/posts/YYYY-MM-DD-slug.md` (or `slug.md` where you prefer).
2. Add frontmatter as shown above (include `description` for better search/listing results).
3. Preview locally with `npm run serve` (drafts are included by default when not running the production build env).
4. When ready, remove `draft: true` and run the production build with `ELEVENTY_RUN_MODE=build`.

Tips and next steps

- Mermaid: include the Mermaid client script on pages where diagrams should render (the project may already include this in a template).
- Static snippets: use them to centralize frequently-used content snippets or reusable examples.
- Thumbnail usage: prefer local images for best performance (the shortcode will generate optimized variants).
- If you're adding many descriptions programmatically, consider rate limiting and batching requests when calling external APIs.

CV chat (local + Cloudflare)

- Copy `.env.example` to `.env` and set `CV_CHAT_ENDPOINT`.
- Run `npm install` and then `npm run dev:cv-chat` to start the worker and site together.
- Visit `http://localhost:8888/cv/` for the chat UI.

Cloudflare deploy

- From `api-worker/`, run `npm install`.
- Configure secrets/vars:
  - `npx wrangler secret put CHAT_API_KEY`
  - `npx wrangler secret put CHAT_MODEL`
  - `npx wrangler secret put CHAT_BASE_URL`
  - `npx wrangler secret put CHAT_APP_NAME`
  - `npx wrangler secret put CHAT_APP_URL`
  - `npx wrangler secret put DAILY_LIMIT`
  - `npx wrangler secret put CORS_ORIGINS`
  - `npx wrangler secret put STREAM_DELAY_MS`
  - `npx wrangler secret put LOG_ANALYTICS`
- Ensure the Worker has the AI binding enabled (see `api-worker/wrangler.toml`). Without it, the service will skip RAG search and send all data as context.
- Deploy with `npx wrangler deploy`.
- Update `.env` `CV_CHAT_ENDPOINT` with the deployed worker URL.

RAG data

- Add new JSON files under `api-worker/src/rag-data/`.
- Register them in `api-worker/src/rag-config.json`.
- Import the JSON files in `api-worker/src/rag.js` and map them in `sourceData`.

Changelog (recent)

- 2025-09-29: Modernized Eleventy setup, added image shortcodes and transforms, enabled Mermaid/KaTeX support, added static-snippets collection and developer scripts.

License and contributing

- See the repository root for LICENSE and contribution guidelines.
