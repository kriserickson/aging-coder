const fs = require('node:fs');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const rssPlugin = require('@11ty/eleventy-plugin-rss');
const dateFilter = require('nunjucks-date');
const markdownIt = require("markdown-it");
const markdownItKatex = require("markdown-it-katex");
const markdownItAnchor = require("markdown-it-anchor");
const dotenv = require('dotenv');
const isBuild = process.env.ELEVENTY_RUN_MODE === 'build';

dotenv.config();

const Image = require('@11ty/eleventy-img');
const path = require('node:path');

function getPosts(collectionApi) {
    return collectionApi.getFilteredByGlob('src/posts/**/*.md').filter(function (post) {
        // Skip drafts if we are in production mode
        return post.data.draft !== true || !isBuild;
    });
}

module.exports = function (eleventyConfig) {
    // Simple HTML escaper used for Mermaid content
    function escapeHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    eleventyConfig.addFilter('cgi_encode', function (str) {
        return encodeURIComponent(str.toLowerCase());
    });

    // Helper: produce a cache-busted URL for a local path based on file mtime
    function getCacheBusted(inputPath, fallback) {
        try {
            if (!inputPath) {
                return typeof fallback !== 'undefined' ? fallback : inputPath;
            }
            // Preserve remote URLs
            if (/^https?:\/\//i.test(inputPath) || /^\/\//.test(inputPath)) {
                return inputPath;
            }
            const relPath = inputPath.startsWith('/') ? inputPath : `/${inputPath}`;
            const fullPath = path.join(process.cwd(), relPath);
            const stat = fs.statSync(fullPath);
            const mtime = new Date(stat.mtime);
            const ver = mtime.getUTCFullYear().toString().padStart(4, '0') +
                String(mtime.getUTCMonth() + 1).padStart(2, '0') +
                String(mtime.getUTCDate()).padStart(2, '0') +
                String(mtime.getUTCHours()).padStart(2, '0') +
                String(mtime.getUTCMinutes()).padStart(2, '0');
            return `${relPath}?v=${ver}`;
        } catch (e) {
            // If stat fails, return the provided fallback (original ref) to preserve previous behavior
            return typeof fallback !== 'undefined' ? fallback : inputPath;
        }
    }

    // Asset URL cache-busting filter: append ?v=YYYYMMDDHHMM based on file mtime
    eleventyConfig.addFilter('assetUrl', function (assetPath) {
        return getCacheBusted(assetPath, assetPath);
    });

    // Resolve a CSS reference from frontmatter or template and return a cache-busted href
    eleventyConfig.addFilter('resolveCss', function (cssRef) {
        if (!cssRef) {
          return '';
        }
        // If this looks like an absolute/remote URL, return as-is
        if (/^https?:\/\//i.test(cssRef) || /^\/\//.test(cssRef)) {
            return cssRef;
        }
        // If it's not a leading slash path, treat it as a filename under /assets/css/
        if (!cssRef.startsWith('/')) {
            const candidate = `/assets/css/${cssRef}`;
            return getCacheBusted(candidate, cssRef);
        }
        // Leading slash path: use cache-busted version but fall back to original cssRef on error
        return getCacheBusted(cssRef, cssRef);
    });

  // Resolve a Js reference from frontmatter or template and return a cache-busted href
  eleventyConfig.addFilter('resolveJs', function (jsRef) {
    if (!jsRef) {
      return '';
    }
    // If this looks like an absolute/remote URL, return as-is
    if (/^https?:\/\//i.test(jsRef) || /^\/\//.test(jsRef)) {
      return jsRef;
    }
    // If it's not a leading slash path, treat it as a filename under /assets/css/
    if (!jsRef.startsWith('/')) {
      const candidate = `/assets/js/${jsRef}`;
      return getCacheBusted(candidate, jsRef);
    }
    // Leading slash path: use cache-busted version but fall back to original jsRef on error
    return getCacheBusted(jsRef, jsRef);
  });

    // Transform images: wrap <img> tags and add lazy/loading attributes and a lightweight class
    // Also ensure an alt attribute exists (empty if necessary) to improve accessibility
    eleventyConfig.addTransform('wrapImages', function (content, outputPath) {
        if (outputPath && outputPath.endsWith('.html')) {
            return content.replace(/<img\b([^>]*)>/gi, function (match, attrs) {
                // Normalize existing attributes string
                let attrStr = attrs || '';

                // Helper to test if an attribute exists
                const hasAttr = (name) => new RegExp('\\b' + name + '\\s*=', 'i').test(attrStr);

                // Add alt attribute if missing
                if (!hasAttr('alt')) {
                    attrStr += ' alt=""';
                }

                // Add loading attribute if missing
                if (!hasAttr('loading')) {
                    attrStr += ' loading="lazy"';
                }
                // Add decoding attribute if missing
                if (!hasAttr('decoding')) {
                    attrStr += ' decoding="async"';
                }
                // Ensure there is a class attribute and include 'img-inline'
                if (hasAttr('class')) {
                    // Append img-inline to existing class attr
                    attrStr = attrStr.replace(/class=(['"])([^'"]*)(\1)/i, function (_, q, v) {
                        // avoid duplicate
                        if (v.split(/\s+/).includes('img-inline')) {
                            return `class=${q}${v}${q}`;
                        }
                        return `class=${q}${v} img-inline${q}`;
                    });
                } else {
                    attrStr += ' class="img-inline"';
                }

                // Return wrapped image
                return `<p class="with-image"><img${attrStr}></p>`;
            });
        }
        return content;
    });

    eleventyConfig.addPlugin(syntaxHighlight);
    eleventyConfig.addPlugin(rssPlugin);
    // eleventyConfig.addFilter('date', (date, format = 'MMMM yyyy', timezone = 'America/Vancouver') => {
    //     return dateFilter(date, format, timezone);
    // });
    eleventyConfig.addFilter('date', dateFilter);
    eleventyConfig.addFilter('escapeDataAttribute', value => {
      if (typeof value !== 'string') {
        return value;
      }
      return value.replace(/[&<>"']/g, function(char) {
        switch (char) {
          case '&': return '&amp;';
          case '<': return '&lt;';
          case '>': return '&gt;';
          case '"': return '&quot;';
          case "'": return '&#x27;'; // or &#039;
          default: return char;
        }
      });
    });

    // Excerpt filter: prefer frontmatter.description; otherwise extract from templateContent
    eleventyConfig.addFilter('excerpt', function (post, length = 200) {
        if (!post) {
            return '';
        }
        try {
            const desc = (post.data && post.data.description) ? String(post.data.description).trim() : '';
            if (desc) {
                return desc;
            }

            // Fall back to post.templateContent (raw rendered markdown) or page.content
            const raw = post.templateContent || (post.data && post.data.page && post.data.page.templateContent) || '';
            if (!raw) {
                return '';
            }

            // Strip HTML tags
            const stripped = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
            if (!stripped) {
                return '';
            }
            if (stripped.length <= length) {
                return stripped;
            }
            return stripped.slice(0, length).trim() + '…';
        } catch (e) {
            return '';
        }
    });

    // Add filter to sort collections by their 'name' property (case-insensitive)
    eleventyConfig.addFilter('sortByName', function (arr) {
        if (!Array.isArray(arr)) {
            return arr;
        }
        return arr.slice().sort((a, b) => {
            const na = String((a && a.name) ? a.name : a).trim().toLowerCase();
            const nb = String((b && b.name) ? b.name : b).trim().toLowerCase();
            return na.localeCompare(nb, undefined, {sensitivity: 'base'});
        });
    });

    eleventyConfig.setTemplateFormats(['njk', 'md', 'liquid']);

    // Passthrough copy for assets directory
    eleventyConfig.addPassthroughCopy('assets');

    // Passthrough copy for img directory
    eleventyConfig.addPassthroughCopy('img');
    eleventyConfig.addPassthroughCopy('audio');
    eleventyConfig.addPassthroughCopy('video');
    eleventyConfig.addPassthroughCopy('favicon.*');

    // Expose cv.json in the built site at /cv/cv.json so client-side JS can fetch it
    eleventyConfig.addPassthroughCopy({ 'src/_data/cv.json': 'cv/cv.json' });

    // Add eleventyComputed for dynamic permalink logic
    eleventyConfig.addGlobalData('eleventyComputed', {
        permalink: (data) => {
            // Keep original pagination behavior
            if (data.pagination && data.pagination.pageNumber === 0) {
                return '/';  // Return root for the first page
            } else if (data.pagination) {
                return `/page/${data.pagination.pageNumber}/`;  // Return for paginated pages
            }

            // If this is a post under src/posts (including nested folders), produce
            // a canonical permalink that ignores intermediate folders. That way
            // files moved into e.g. src/posts/older/ will still be available at
            // /posts/<slug>/ like before.
            try {
                if (data.page && data.page.filePathStem && data.page.filePathStem.startsWith('/posts')) {
                    // data.page.fileSlug should be the filename without extension
                    const slug = data.page.fileSlug || path.basename(data.page.filePathStem);
                    if (!slug) {
                        return data.permalink;
                    } // fallback
                    // If the file is an index under /posts (e.g. /posts/index), return the folder root
                    if (slug === 'index') {
                        return '/posts/';
                    }
                    return `/posts/${slug}/`;
                }
            } catch (e) {
                // If anything goes wrong, fall back to any explicit permalink the template provided
            }

            // Return undefined if no special handling (use default Eleventy behavior)
            return data.permalink;
        },

    });

    // Expose build-mode flag to templates so they can conditionally include analytics, etc.
    eleventyConfig.addGlobalData('isBuild', isBuild);
    eleventyConfig.addGlobalData('env', process.env);

    eleventyConfig.addCollection('posts', function (collectionApi) {
        const posts = getPosts(collectionApi);

        // Warn if multiple posts would canonicalize to the same slug (and thus the same /posts/<slug>/ URL)
        const slugMap = {};
        posts.forEach((post) => {
            try {
                const stem = post.filePathStem || (post.data && post.data.page && post.data.page.filePathStem) || '';
                const slug = post.fileSlug || (stem ? path.basename(stem) : path.basename(post.inputPath || ''));
                if (!slug) {
                    return;
                }
                if (slugMap[slug]) {
                    console.warn(`Eleventy warning: duplicate post slug detected for '/posts/${slug}/'\n  - ${slugMap[slug]}\n  - ${post.inputPath || stem}`);
                } else {
                    slugMap[slug] = post.inputPath || stem;
                }
            } catch (e) {
                // ignore errors in warning code
            }
        });

        return posts.reverse();
    });

    // New: pre-rendered content for feed entries (avoids templateContent cycles)
    eleventyConfig.addCollection('feedPosts', function (collectionApi) {
        const md = markdownIt({html: true}).use(markdownItKatex).use(markdownItAnchor);
        return getPosts(collectionApi)
            .map((item) => {
                // Some files may have been renamed or removed by other scripts (e.g., publish-draft).
                // If the source file is missing, log a warning and skip this entry instead of failing the build.
                let raw;
                try {
                    raw = fs.readFileSync(item.inputPath, 'utf8');
                } catch (e) {
                    console.warn(`feedPosts: skipping missing file ${item.inputPath}: ${e && e.message}`);
                    return null;
                }

                // Strip top YAML front matter
                const fm = /^---\r?\n[\s\S]*?\r?\n---\r?\n?/;
                const markdown = fm.test(raw) ? raw.replace(fm, '') : raw;
                const html = md.render(markdown);
                return {
                    url: item.url,
                    date: item.date,
                    data: item.data,
                    content: html
                };
            })
            .filter(Boolean)
            .reverse();
    });

    eleventyConfig.addCollection('categories', function (collectionApi) {
        // Use getPosts helper so we consistently include drafts handling and globbing
        const posts = getPosts(collectionApi);

        const categories = {};
        posts.forEach((post) => {
            const cat = post.data && (post.data.category || (post.data.categories && post.data.categories[0]));
            if (!cat) {
                return;
            }
            const key = String(cat);
            if (!categories[key]) {
                categories[key] = {
                    name: cat,
                    size: 1,
                    posts: [post]
                };
            } else {
                categories[key].size++;
                categories[key].posts.push(post);
            }
        });

        // Sort posts in each category by date (newest first)
        Object.keys(categories).forEach(k => {
            categories[k].posts.sort((a, b) => {
                const ta = a.date ? new Date(a.date).getTime() : 0;
                const tb = b.date ? new Date(b.date).getTime() : 0;
                return tb - ta;
            });
        });

        // Return categories sorted alphabetically by name (case-insensitive)
        const sortedKeys = Object.keys(categories).sort((a, b) => {
            const na = String((categories[a] && categories[a].name) ? categories[a].name : a).trim().toLowerCase();
            const nb = String((categories[b] && categories[b].name) ? categories[b].name : b).trim().toLowerCase();
            return na.localeCompare(nb, undefined, {sensitivity: 'base'});
        });
        return sortedKeys.map(k => categories[k]);
    });

    // Add a featured collection so templates can reliably iterate featured posts
    eleventyConfig.addCollection('featured', function (collectionApi) {
        // Use getPosts to include files under src/posts/** (including nested folders) and respect drafts
        return getPosts(collectionApi).filter(item => {
            try {
                // Accept boolean true or truthy values in frontmatter
                return !!(item.data && item.data.featured);
            } catch (e) {
                return false;
            }
        }).reverse();
    });

    eleventyConfig.addCollection('tags', function (collectionApi) {
        const posts = getPosts(collectionApi);
        const tags = {};
        posts.forEach((post) => {
            if (!post.data.tags || post.data.tags.length === 0) {
                return;
            }
            post.data.tags.forEach((tag) => {
                const tagLower = tag.toLowerCase();
                const tagProperCase = tag.split(' ').map(word => {
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
                }).join(' ');


                if (!tags[tagLower]) {
                    tags[tagLower] = {
                        name: tagProperCase,
                        link: tag.toLowerCase(),
                        size: 1,
                        posts: [post]
                    };
                } else {
                    tags[tagLower].size++;
                    tags[tagLower].posts.push(post);
                }
            });
        });

        const tags_sorted = Object.values(tags);
        tags_sorted.sort((a,b) => {
            return a.name.localeCompare(b.name);
        });
        return tags_sorted;
    });

    eleventyConfig.addCollection('static-snippets', function (collectionApi) {
        // Return all snippets with a 'snippet' property in frontmatter
        return collectionApi.getFilteredByGlob('src/static-snippets/*.md').filter(item => !!item.data.snippet)
            .map(item => {
                // Attach raw markdown content for use in templates
                item.data.rawMarkdown = require('fs').readFileSync(item.inputPath, 'utf8');
                // Attach a raw permalink property for convenience
                item.data.raw_permalink = (item.url.endsWith('/') ? item.url : item.url + '/') + 'raw/';
                return item;
            });
    });

    // Add a filter to get a snippet by its 'snippet' frontmatter property (for both Liquid and Nunjucks)
    function findSnippetByName(snippets, name) {
        return snippets.find(snippet => snippet.data.snippet === name);
    }

    eleventyConfig.addFilter('findSnippetByName', findSnippetByName);
    eleventyConfig.addLiquidFilter('findSnippetByName', findSnippetByName);

    // Add a shortcode to generate a "view raw" link for a snippet
    eleventyConfig.addShortcode('snippetRawLink', function (snippet) {
        if (!snippet || !snippet.data.raw_permalink) {
            return '';
        }
        return `<a class="external-link" href="${snippet.data.raw_permalink}">View raw markdown</a>`;
    });

    // Responsive thumbnail shortcode using @11ty/eleventy-img
    // Generates WebP + JPEG resized images and proper srcset HTML. Falls back to simple markup for remote images or failures.
    eleventyConfig.addNunjucksAsyncShortcode('thumbnail', async function (src, alt = '') {
        if (!src) {
            return '';
        }
        // If remote URL, return a simple lazy img
        if (/^https?:\/\//i.test(src)) {
            return `<figure class="cover-thumb"><img src="${src}" alt="${(alt || '').replace(/"/g, '&quot;')}" class="img-thumb" loading="lazy" decoding="async"></figure>`;
        }

        // Resolve local source path. Accept '/img/...' or 'blog/...' style paths
        let inputPath;
        if (src.startsWith('/')) {
            // leading slash, treat as project-rooted path
            inputPath = path.join(process.cwd(), src);
        } else if (src.startsWith('img' + path.sep) || src.startsWith('img/')) {
            inputPath = path.join(process.cwd(), src);
        } else {
            inputPath = path.join(process.cwd(), 'img', src);
        }

        try {
            const metadata = await Image(inputPath, {
                widths: [160, 320, 480, 640, 1024],
                formats: ['webp', 'jpeg'],
                outputDir: './_site/img/',
                urlPath: '/img/',
            });

            const imageAttributes = {
                alt: alt || '',
                sizes: '(min-width: 700px) 120px, (min-width: 480px) 320px, 100vw',
                class: 'img-thumb',
                loading: 'lazy',
                decoding: 'async'
            };

            // Image.generateHTML returns a string with figure/img markup — wrap in cover-thumb container
            return Image.generateHTML(metadata, imageAttributes).replace(/<figure(.*?)>/i, function (m, attrs) {
                if (/class=/.test(attrs)) {
                    return `<figure${attrs.replace(/class=(['"])([^'"]*?)\1/i, function (_, q, v) {
                        return `class=${q}${v} cover-thumb${q}`;
                    })}>`;
                }
                return `<figure class="cover-thumb"${attrs}>`;
            });
        } catch (err) {
            // Fallback: return simple markup referencing the static img path
            const normalized = src.startsWith('/') ? src : `/img/${src}`;
            return `<figure class="cover-thumb"><img src="${normalized}" alt="${(alt || '').replace(/"/g, '&quot;')}" class="img-thumb" loading="lazy" decoding="async"></figure>`;
        }
    });

    // Add Katex support for math rendering in markdown
    const mdLib = markdownIt({
        html: true
    })
        .use(markdownItKatex)
        .use(markdownItAnchor);

    // Support for Mermaid diagrams in Markdown using fenced blocks
    // Usage in Markdown:
    // ```mermaid
    // graph TD; A-->B;
    // ```
    const defaultFence = mdLib.renderer.rules.fence || function (tokens, idx, options, env, self) {
        return self.renderToken(tokens, idx, options, env, self);
    };
    mdLib.renderer.rules.fence = function (tokens, idx, options, env, self) {
        const token = tokens[idx];
        const info = (token.info || '').trim().toLowerCase();
        if (info === 'mermaid') {
            const code = token.content || '';
            // Mermaid expects the raw text content inside an element with class "mermaid"
            return `<pre class="mermaid">${escapeHtml(code)}</pre>`;
        }
        return defaultFence(tokens, idx, options, env, self);
    };

    eleventyConfig.setLibrary("md", mdLib);

    // Nunjucks paired shortcode for Mermaid
    // Usage in Nunjucks or Markdown with njk engine:
    // {% mermaid %}graph TD; A-->B;{% endmermaid %}
    eleventyConfig.addPairedShortcode('mermaid', function (content = '') {
        return `<pre class="mermaid">${escapeHtml(content)}</pre>`;
    });

    // Use chokidar's awaitWriteFinish so the watcher waits until files are stable
    // (no further writes) for 60s before acting. Good for editors and tools that write in multiple chunks.
    eleventyConfig.setChokidarConfig({
        awaitWriteFinish: {
            stabilityThreshold: 5 * 1000,
            pollInterval: 100
        }
    });

    // Configure the dev server to watch built asset files (CSS/JS) so those changes can reload
    // the browser without forcing a full Eleventy build. Adjust globs as needed for your workflow.
    eleventyConfig.setServerOptions({
        watch: ["_site/assets/**/*.css", "_site/assets/**/*.js"]
    });

    // After build: copy the generated CV data into the API worker so it stays in sync
    eleventyConfig.on('afterBuild', () => {
        try {
            const srcFile = path.join(process.cwd(), 'src', '_data', 'cv.json');
            const destDir = path.join(process.cwd(), 'api-worker', 'src', 'rag-data');
            fs.mkdirSync(destDir, { recursive: true });
            fs.copyFileSync(srcFile, path.join(destDir, 'cv.json'));
            console.log('✅ Copied cv.json to api-worker/src/rag-data');
        } catch (e) {
            console.warn('⚠️ Failed to copy cv.json to api-worker/src/rag-data: ' + (e && e.message));
        }
    });

    return {
        dir: {
            input: 'src',
            output: '_site',
            includes: '_includes',
            data: '_data'
        },
        markdownTemplateEngine: 'liquid',
        htmlTemplateEngine: 'njk',
    };
};
