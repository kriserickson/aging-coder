const fs = require('fs');
const path = require('path');
const slugify = require('slugify');

// Get the title from the command line arguments
const title = process.argv[2];

if (!title) {
    console.error('Please provide a title for the post.');
    process.exit(1);
}

// Get the current date
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, '0');
const day = String(today.getDate()).padStart(2, '0');

// Format the date
const datePrefix = `${year}-${month}-${day}`;

// Slugify the title for the filename
const slug = slugify(title.toLowerCase().replace(/:/g, ''));

// Define the post file path
const postFileName = `${datePrefix}-${slug}.md`;
const postFilePath = path.join('src', 'posts', postFileName);

// Define the front matter template
const frontMatter = `---
layout: post
category: 
title: "${title}"
imagefeature:
description: 
draft: true
tags: []
---
`;

// Write the post file
fs.writeFile(postFilePath, frontMatter, (err) => {
    if (err) {
        console.error('Error writing the post file:', err);
        process.exit(1);
    }

    console.log(`New post created: ${postFilePath}`);
});
