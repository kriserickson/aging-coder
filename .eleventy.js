const fs = require('node:fs');
const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const rssPlugin = require('@11ty/eleventy-plugin-rss');
const dateFilter = require('nunjucks-date');
const markdownIt = require("markdown-it");
const markdownItKatex = require("markdown-it-katex");
const markdownItAnchor = require("markdown-it-anchor");
const isBuild = process.env.ELEVENTY_RUN_MODE === 'build';

const Image = require('@11ty/eleventy-img');
const path = require('node:path');

function getPosts(collectionApi) {
    return collectionApi.getFilteredByGlob('src/posts/**/*.md').filter(function (post) {
        // Skip drafts if we are in production mode
        return post.data.draft !== true || !isBuild;
    });
}

module.exports = function (eleventyConfig) {

    eleventyConfig.addFilter('cgi_encode', function (str) {
        return encodeURIComponent(str);
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
                const raw = fs.readFileSync(item.inputPath, 'utf8');
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
                if (!tags[tag]) {
                    tags[tag] = {
                        name: tag,
                        size: 1,
                        posts: [post]
                    };
                } else {
                    tags[tag].size++;
                    tags[tag].posts.push(post);
                }
            });
        });
        return Object.values(tags);
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
                    return `<figure${attrs.replace(/class=(['"])((?:[^'\"]*?))\1/i, function (_, q, v) {
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

    eleventyConfig.setLibrary("md", mdLib);

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
