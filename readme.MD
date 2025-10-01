Aging Coder — Modernized Eleventy Site

This repository is the Aging Coder blog (Eleventy). The site has been modernized to use Pico CSS and a small set of lightweight custom styles. This README explains how to build, preview, and customize the site, and documents helpful developer utilities added during modernization.

Quick commands

- Install dependencies (if you haven't already):

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

What changed (high level)

- Replaced the legacy Foundation-based styles with Pico CSS (CDN) and small CSS overrides in `assets/css/overrides.css`.
- Implemented a site-wide dark/light toggle that respects user system preference and persists the user's choice in `localStorage`.
- Removed Disqus and legacy comment embed code and disabled comments in site data.
- Neutralized legacy Notepad/Foundation CSS via `assets/css/overrides.css` and reduced `assets/css/style.css` to a minimal variables file to avoid regressions.
- Replaced large external icon sets with a small set of inline SVG assets in `assets/img/icons/` (and retained Font Awesome 7 for additional icons).
- Added a simple thumbnail shortcode and an HTML transform to improve image handling across content and templates.

Developer utilities added

- Thumbnail shortcode: `{% thumbnail src, alt %}`
  - Usage: in any Nunjucks template you can write `{% thumbnail post.data.imagefeature, post.data.title %}`
  - Behavior: emits `<figure class="cover-thumb"><img src="/img/..." alt="..." class="img-thumb" loading="lazy" decoding="async"></figure>`
  - Note: This is a lightweight helper for consistent markup and lazy-loading. It does not resize images. For resized/optimized images you can replace the shortcode with Eleventy Image plugin usage.

- Image transform: A transform in `.eleventy.js` rewrites plain `<img ...>` in generated HTML to ensure images receive `loading="lazy"`, `decoding="async"` and a class `img-inline`, and wraps them in a `<p class="with-image">` container. This improves perceived performance and helps CSS target images uniformly.

- CSS helpers in `assets/css/overrides.css`:
  - `.cover-thumb` and `.img-thumb` for consistent aspect-ratio thumbnails and object-fit cover behavior.
  - `.avatar` for author avatar images.
  - Focus outlines and small accessibility helpers.

Notes about legacy CSS

- `assets/css/style.css` was intentionally trimmed to a minimal variables set and small defaults to prevent regressions; heavy Notepad/Foundation rules were neutralized in `overrides.css`. The site works with Pico CSS and `overrides.css` providing site-specific fixes. We left `style.css` minimal to make future pruning and consolidation safe.

Accessibility and performance

- Basic accessibility improvements were applied: ARIA labels for nav, focus outlines for interactive controls, `alt` attributes on images, and better keyboard focus visibility.
- For a full audit run Lighthouse or axe against a running local server. This requires `npm run serve` (the site is assumed to be available at `http://localhost:8080` in your environment). If you'd like, I can run automated audits from this environment, but that requires installing additional tools.

Changelog (recent)

- 2025-09-29: Integrated Pico CSS, dark-mode toggle, removed Disqus/comment code, neutralized legacy Notepad/Foundation rules, added CV placeholder, implemented thumbnail shortcode and image transform, replaced icons with SVGs and updated templates and CSS overrides.

If you'd like me to: run automated Lighthouse/a11y audits, wire the Eleventy Image plugin for on-demand image resizing, or continue pruning `assets/css/style.css` into `overrides.css`, tell me which and I'll proceed.
