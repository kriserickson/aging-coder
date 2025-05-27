const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const rssPlugin = require('@11ty/eleventy-plugin-rss');
const dateFilter = require('nunjucks-date');

const isBuild = process.env.ELEVENTY_RUN_MODE === 'build';

function getPosts(collectionApi) {
    return collectionApi.getFilteredByGlob('src/posts/*.md').filter(function(post) {
        // Skip drafts if we are in production mode
        return post.data.draft !== true || !isBuild;
    });
}

module.exports = function(eleventyConfig) {

    eleventyConfig.addFilter('cgi_encode', function(str) {
        return encodeURIComponent(str);
    });

    eleventyConfig.addTransform("wrapImages", function(content, outputPath) {
        // Only apply this transformation to HTML files
        if (outputPath && outputPath.endsWith(".html")) {
            // Use a regex to wrap all <img> tags in <p class="with-image">
            return content.replace(/<img(.*?)>/g, '<p class="with-image"><img$1></p>');
        }
        return content; // If not HTML, return content unmodified
    });

    eleventyConfig.addPlugin(syntaxHighlight);
    eleventyConfig.addPlugin(rssPlugin);
    // eleventyConfig.addFilter('date', (date, format = 'MMMM yyyy', timezone = 'America/Vancouver') => {
    //     return dateFilter(date, format, timezone);
    // });
    eleventyConfig.addFilter('date', dateFilter);

    eleventyConfig.setTemplateFormats(['njk', 'md', 'liquid']);

    // Passthrough copy for assets directory
    eleventyConfig.addPassthroughCopy('assets');

    // Passthrough copy for img directory
    eleventyConfig.addPassthroughCopy('img');
    eleventyConfig.addPassthroughCopy('audio');
    eleventyConfig.addPassthroughCopy('favicon.*');

    // Add eleventyComputed for dynamic permalink logic
    eleventyConfig.addGlobalData('eleventyComputed', {
        permalink: (data) => {
            // Check if pagination object exists and has a pageNumber
            if (data.pagination && data.pagination.pageNumber === 0) {
                return '/';  // Return root for the first page
            } else if (data.pagination) {
                return `/page/${data.pagination.pageNumber}/`;  // Return for paginated pages
            }

            // Return undefined if no pagination (use default Eleventy behavior)
            return data.permalink;
        }
    });

    eleventyConfig.addCollection('posts', function(collectionApi) {
        const posts = getPosts(collectionApi);
        return posts.reverse();
    });

    eleventyConfig.addCollection('categories', function(collectionApi) {
        const posts = getPosts(collectionApi);
        const categories = {};
        posts.forEach((post) => {
            if (!post.data.category) return;
            if (!categories[post.data.category]) {
                categories[post.data.category] = {
                    name: post.data.category,
                    size: 1,
                    posts: [post]
                };
            } else {
                categories[post.data.category].size++;
                categories[post.data.category].posts.push(post);
            }
        });
        return Object.values(categories);
    });

    eleventyConfig.addCollection('tags', function(collectionApi) {
        const posts = getPosts(collectionApi);
        const tags = {};
        posts.forEach((post) => {
            if (!post.data.tags || post.data.tags.length === 0) return;
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

    eleventyConfig.addCollection("static-snippets", function(collectionApi) {
        // Return all snippets with a 'snippet' property in frontmatter
        return collectionApi.getFilteredByGlob("src/static-snippets/*.md").filter(item => !!item.data.snippet);
    });

    // Add a filter to get a snippet by its 'snippet' frontmatter property
    eleventyConfig.addLiquidFilter("findSnippetByName", function(snippets, name) {
        return snippets.find(snippet => snippet.data.snippet === name);
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
