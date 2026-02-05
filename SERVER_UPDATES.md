# Server Updates Required

Changes identified by a Lighthouse audit (Feb 2026) that must be applied at the
nginx / Cloudflare level. Code-level fixes (canonical URL, viewport meta, font
loading, colour contrast) have already been committed separately.

---

## 1. Redirect HTTP → HTTPS at Origin

The port-80 server block currently serves content. It should redirect to HTTPS
instead (Cloudflare handles the edge redirect, but the origin should too).

Replace the existing `listen 80` server block with:

```nginx
server {
    listen 80;
    server_name agingcoder.com www.agingcoder.com;
    return 301 https://$host$request_uri;
}
```

---

## 2. Security Headers

Add the following inside the **443 server block**, above any `location` blocks:

```nginx
# --- Security Headers ---------------------------------------------------

# HSTS – always use HTTPS (2 years, with preload eligibility)
add_header Strict-Transport-Security
    "max-age=63072000; includeSubDomains; preload" always;

# Prevent MIME-type sniffing
add_header X-Content-Type-Options "nosniff" always;

# Clickjacking protection
add_header X-Frame-Options "SAMEORIGIN" always;

# Cross-Origin Opener Policy
add_header Cross-Origin-Opener-Policy "same-origin" always;

# Referrer Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Permissions Policy – disable unused browser features
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
```

### Alternative: HSTS via Cloudflare

Instead of the nginx header, you can enable HSTS in the Cloudflare dashboard:
**SSL/TLS → Edge Certificates → HTTP Strict Transport Security (HSTS)**.
Set max-age to at least 1 year and enable "Include subdomains".

---

## 3. Content Security Policy (CSP)

The site loads resources from several external origins. The policy below permits
them all while blocking everything else.

Add to the **443 server block** (one long line, or use `\` continuations):

```nginx
add_header Content-Security-Policy
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.jsdelivr.net https://*.cloudflare.com; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com; "
    "img-src 'self' data: https:; "
    "font-src 'self' https://fonts.gstatic.com; "
    "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com https://*.cloudflare.com https://aging-coder-chat.kristian-erickson.workers.dev; "
    "frame-ancestors 'self'; "
    "base-uri 'self'; "
    "form-action 'self'"
    always;
```

### What each directive allows

| Directive        | Allowed origins                                         | Why                                            |
| ---------------- | ------------------------------------------------------- | ---------------------------------------------- |
| `script-src`     | `'self' 'unsafe-inline'` + GTM, jsdelivr, cloudflare    | Inline scripts (theme toggle, cookie banner, analytics), Mermaid CDN, Cloudflare challenge JS |
| `style-src`      | `'self' 'unsafe-inline'` + Google Fonts, unpkg          | Inline cookie-banner styles, Pico CSS CDN, Google Fonts CSS |
| `img-src`        | `'self' data: https:`                                   | Local images, data-URIs, any HTTPS image       |
| `font-src`       | `'self'` + fonts.gstatic.com                            | Google Fonts WOFF2 files                       |
| `connect-src`    | `'self'` + Google Analytics, Cloudflare, Workers chat API | Analytics beacons, CV chat / fit-assessment API |
| `frame-ancestors`| `'self'`                                                | Prevents embedding in third-party iframes      |
| `base-uri`       | `'self'`                                                | Prevents `<base>` tag injection                |
| `form-action`    | `'self'`                                                | Restricts form submissions to same origin      |

### Notes

- **`'unsafe-inline'` for scripts** is required because the site uses multiple
  inline `<script>` blocks (theme toggle, cookie consent, Google Analytics
  config). The alternative is nonce-based CSP, which requires either a
  server-side middleware or a Cloudflare Worker to inject nonces — not practical
  for a static site without additional tooling.
- **`'unsafe-inline'` for styles** is required for the inline `<style>` in the
  cookie consent banner and any inline styles injected by Pico CSS / Eleventy.
- **Trusted Types** (`require-trusted-types-for 'script'`) is intentionally
  omitted. Google Tag Manager and Cloudflare's challenge scripts do not support
  Trusted Types and would break.

---

## 4. Image Cache Headers

Lighthouse flagged short cache lifetimes on image assets (~390 KiB of avoidable
re-downloads). Add a location block for static assets:

```nginx
location ~* \.(jpg|jpeg|png|webp|gif|svg|ico|woff2|woff|ttf|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

> **Note:** If you add `add_header` inside a `location` block, nginx stops
> inheriting `add_header` directives from the parent `server` block. You would
> need to repeat the security headers inside this location, or use the
> `ngx_headers_more` module (`more_set_headers`), or move the cache directives
> to a Cloudflare Cache Rule instead.
>
> **Recommended approach:** Set cache lifetimes through a **Cloudflare Cache
> Rule** (Caching → Cache Rules → "Cache eligible assets for 1 year") to avoid
> the header-inheritance issue entirely. Cloudflare will then serve long-lived
> cached responses while the security headers remain set cleanly in the server
> block.

---

## 5. robots.txt — Cloudflare `Content-Signal` Directive

Lighthouse flags the line `Content-Signal: search=yes,ai-train=no` as an
unknown directive. This is injected by Cloudflare, not by the site's source
`robots.txt`.

To suppress it, check the Cloudflare dashboard:
**Settings → Content Credentials** (or **AI → Bots**) and disable the
Content-Signal robots.txt injection. This is cosmetic — crawlers ignore unknown
directives — so it can safely be left as-is if you prefer keeping the AI
training opt-out signal.

---

## 6. Cloudflare Challenge Script Performance

The largest contributor to Total Blocking Time (1.9 s) and JS execution time
(7.3 s) is Cloudflare's challenge-platform script
(`/cdn-cgi/challenge-platform/scripts/jsd/main.js`). This script also triggers
three "deprecated API" warnings.

This is outside nginx control, but you can reduce its impact:

- **Security → Bots → Bot Fight Mode**: If enabled, consider disabling it or
  switching to Super Bot Fight Mode with a less aggressive challenge frequency.
- **Security → Settings → Challenge Passage**: Increase the duration so
  returning visitors are challenged less often.
- **Security Level**: Lower from "High" to "Medium" if the blog doesn't need
  aggressive bot protection.

---

## Summary Checklist

- [ ] Replace port-80 block with HTTPS redirect
- [ ] Add security headers (HSTS, X-Content-Type-Options, X-Frame-Options, COOP, Referrer-Policy, Permissions-Policy)
- [ ] Add Content-Security-Policy header
- [ ] Configure image/asset cache lifetimes (nginx or Cloudflare Cache Rule)
- [ ] (Optional) Suppress Cloudflare Content-Signal robots.txt injection
- [ ] (Optional) Review Cloudflare Bot Fight Mode / challenge aggressiveness
- [ ] Reload nginx: `sudo nginx -t && sudo systemctl reload nginx`
