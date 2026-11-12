# agingcoder.com indexing audit

Checked November 11, 2026. Repository fixes are prepared locally; the live site and Nginx configuration have not been changed.

## Findings

| Priority | Confirmed behavior on the live site | Interpretation |
| --- | --- | --- |
| High | `/not-a-real-page-indexing-audit/` returns HTTP 200 and the homepage, including its homepage canonical. | Missing URLs are presented as successful duplicate pages. Fix the hosting fallback to return 404. |
| High | `/sitemap.xml` contains only `https://agingcoder.com`; `/sitemap.txt` is empty. | Both templates used nonexistent `site.pages` and `site.posts` data. Articles were omitted from the sitemaps. This weakens discovery and canonical signals; it does not establish why any individual crawled URL was excluded. |
| Medium | `https://www.agingcoder.com/` returns HTTP 200 with the non-www canonical. | The canonical is correct, but a permanent redirect would consolidate the two hosts more clearly. |
| Medium | `/posts/fine-tuning-llm/` returns a draft as HTTP 200 with a self-canonical. | Drafts were removed from collections but still rendered as public pages. |
| Low | `/about/index.html`, `/cv/index.html`, `/categories/index.html`, and an article's `/index.html` URL return HTTP 200 with the correct slash-ending canonical. Some internal links used these aliases or omitted the final slash. | These are valid canonicalized alternates, not automatically indexing errors. Consistent internal links and optional permanent redirects reduce duplication. |
| Expected | `/posts/2026-02-20-i-built-a-thing/` returns an HTML meta-refresh redirect to `/posts/i-built-a-thing/`. | Legacy URLs should not be indexed separately. HTTP 301 redirects would be preferable, but Google recognizes immediate meta-refresh redirects. Preserve the old URLs. |

All **95 intended public URLs** were fetched: **74 articles**, the homepage, **14 additional archive pages**, and **6 other pages**. Every one returned HTTP 200 and declared the expected canonical. No identical article-body pairs were found. This does not establish Google's current index status or Google-selected canonical for those URLs.

The live robots.txt permits Googlebot crawling. Cloudflare's `Google-Extended` restriction does not block Google Search. Real page content is present in the HTML response, without requiring JavaScript to construct it.

Some older posts are short: `/posts/data-url-tool/` has about 61 words in its main content, and several older link posts have roughly 100–160. Google may choose not to index such pages, but length alone is not a diagnosis. Compare the actual excluded URLs with the report before changing article content.

## Repository changes

- Generate both sitemaps from a shared `sitemapPages` collection of rendered pages. Include every published article and archive page; omit drafts, legacy redirect stubs, feeds, raw snippets, and pages with `sitemap: false`.
- Include the homepage, categories, tags, featured posts, and search archive in that collection.
- Stop writing production draft pages with `permalink: false`; allow drafts in local serve mode. Make the shared head template and image transform tolerate pages without an output URL/path.
- Use slash-ending canonical URLs in navigation and tag/category links.
- Use absolute canonical URLs in legacy redirect pages.

Verification: a production Eleventy 3.1.6 build completed successfully in a fresh output directory. Both sitemaps contain the same 95 unique URLs. Every sitemap URL maps to generated HTML with an identical canonical URL. All 74 generated legacy redirects point to a URL in the sitemap. The draft is absent from the fresh production output.

## Nginx changes to apply

The active server configuration is not in this repository. The live behavior is consistent with an SPA-style fallback such as `try_files $uri $uri/ /index.html`, but the actual directive has not been inspected.

In the existing static site's `location /` block, use:

```nginx
location / {
    try_files $uri $uri/ =404;
}
```

Keep the existing `root`, `index`, TLS, security headers, and API locations. Replace the current fallback block rather than adding another `location /`. Also check for `error_page` rules or Cloudflare rules that turn missing pages into a successful homepage response. The result must be an actual HTTP 404, even if a custom error page is displayed.

In the server block that accepts `www.agingcoder.com`, redirect that host to the preferred host. If one existing server block accepts both hostnames, this rule can go inside it:

```nginx
if ($host = www.agingcoder.com) {
    return 301 https://agingcoder.com$request_uri;
}
```

Optionally redirect explicit `index.html` requests in the content-serving server block:

```nginx
if ($request_uri ~ "^(.*/)index\.html(?:\?.*)?$") {
    return 301 https://agingcoder.com$1$is_args$args;
}
```

Use `$request_uri` for this check: it distinguishes a visitor's explicit `index.html` request from Nginx internally resolving a directory URL to its index file, avoiding a redirect loop.

For legacy dated article URLs, add exact HTTP 301 mappings to their existing canonical destinations when updating the server configuration. Keep the generated HTML redirect pages as a fallback. A redirect appearing in Search Console is normally a successful consolidation, not a reason to remove that redirect.

## Deploy and verify

1. Build from a clean output directory (`pnpm run clean`, then `pnpm run build`). Deploy the resulting `_site/` with removal of obsolete generated files. The production draft file must be removed from the existing deployment; skipping it in a new build alone does not delete an already published copy. Purge affected Cloudflare cached responses if necessary.
2. Apply the Nginx changes, validate with `nginx -t`, then reload the existing service.
3. Confirm these responses:

   | Request | Expected |
   | --- | --- |
   | A fresh, nonexistent path | HTTP 404 |
   | `/posts/fine-tuning-llm/` after removing its old output | HTTP 404 |
   | `https://www.agingcoder.com/` | HTTP 301 to `https://agingcoder.com/` |
   | `/cv/index.html` if the optional rule is installed | HTTP 301 to `/cv/` |
   | `/cv/` and a real article | HTTP 200 with their own canonical, without a redirect loop |
   | `/sitemap.xml` and `/sitemap.txt` | The same 95 intended URLs for the current content |

4. Resubmit `https://agingcoder.com/sitemap.xml` in Search Console. Inspect important affected articles and request indexing after deployment. Compare the user-declared and Google-selected canonicals for the 16 canonical disagreements.
5. Export the example URLs from the three investigation categories (35 crawled/not indexed, 16 canonical disagreements, 1 duplicate without a selected canonical). These URL-level records are needed to attribute each exclusion; the category totals alone cannot establish causation.

The reported 73 indexed / 203 excluded counts include URL variants and redirects. They do not mean only 26% of the actual articles are indexed. The changes improve technical signals; Google still decides which pages to index.

## References

- [Google: canonicalization signals and consistent internal linking](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls)
- [Google: return proper 404/410 responses for missing pages](https://developers.google.com/search/docs/crawling-indexing/troubleshoot-crawling-errors)
- [Google: investigate canonical disagreements using URL Inspection](https://developers.google.com/search/docs/crawling-indexing/canonicalization-troubleshooting)
- [Google: Google-Extended does not affect inclusion in Google Search](https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers#google-extended)
- [Nginx: `try_files`](https://nginx.org/en/docs/http/ngx_http_core_module.html#try_files)
- [Nginx: `return` and rewrite processing](https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#return)
