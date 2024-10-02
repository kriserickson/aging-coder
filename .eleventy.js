const syntaxHighlight = require('@11ty/eleventy-plugin-syntaxhighlight');
const rssPlugin = require('@11ty/eleventy-plugin-rss');
const dateFilter = require('nunjucks-date');

module.exports = function(eleventyConfig) {

    eleventyConfig.addFilter('safeDump', function(obj) {
        return JSON.stringify(Object.keys(obj));
    });

    eleventyConfig.addPlugin(syntaxHighlight);
    eleventyConfig.addPlugin(rssPlugin);
    eleventyConfig.addFilter('date', dateFilter);
    eleventyConfig.setTemplateFormats(['njk', 'md', 'liquid']);

    // Passthrough copy for assets directory
    eleventyConfig.addPassthroughCopy('assets');

    // Passthrough copy for img directory
    eleventyConfig.addPassthroughCopy('img');

    // Add eleventyComputed for dynamic permalink logic
    eleventyConfig.addGlobalData('eleventyComputed', {
        permalink: (data) => {
            console.log('path: ' + data.page.inputPath + ' has pagination: ' + (data.pagination ? 'yes' : 'no'));
            if (data.page.inputPath === './src/index.njk') {
                // Check if pagination object exists and has a pageNumber
                if (data.pagination && data.pagination.pageNumber === 0) {
                    return '/';  // Return root for the first page
                } else if (data.pagination) {
                    return `/page/${data.pagination.pageNumber}/`;  // Return for paginated pages
                }
            }
            // Return undefined if no pagination (use default Eleventy behavior)
            return data.permalink;
        }
    });

    eleventyConfig.addCollection('posts', function(collectionApi) {
        const posts = collectionApi.getFilteredByGlob('src/posts/*.md');
        return posts.reverse();
    });

    eleventyConfig.addCollection('categories', function(collectionApi) {
        const posts = collectionApi.getFilteredByGlob('src/posts/*.md');
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
        const posts = collectionApi.getFilteredByGlob('src/posts/*.md');
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
