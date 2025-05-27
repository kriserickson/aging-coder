const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

// Define the directory where posts are stored
const postsDir = path.join('src', 'posts');

// Function to find all draft posts
function findDraftPosts() {
    const files = fs.readdirSync(postsDir);
    return files.filter(file => {
        const filePath = path.join(postsDir, file);
        const content = fs.readFileSync(filePath, 'utf-8');
        return content.includes('draft: true');
    });
}

// Function to remove 'draft: true' from the front matter
function publishDraft(fileName) {
    const filePath = path.join(postsDir, fileName);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Replace 'draft: true' with an empty string or remove the whole line
    content = content.replace(/^draft: true\n?/m, '');

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`Published: ${fileName}`);
}

// Main function to run the script
async function run() {
    const drafts = findDraftPosts();

    if (drafts.length === 0) {
        console.log('No drafts found.');
        return;
    }

    if (drafts.length === 1) {
        // If there's only one draft, publish it directly
        console.log(`One draft found: ${drafts[0]}`);
        publishDraft(drafts[0]);
    } else {
        // If multiple drafts, prompt the user to select one
        const prompt = inquirer.createPromptModule();
        try {
            const answers = await prompt([
                {
                    type: 'list',
                    name: 'selectedDraft',
                    message: 'Select a draft to publish:',
                    choices: drafts
                }
            ]);
            publishDraft(answers.selectedDraft);
        } catch (error) {
            console.error('Error:', error);
        }
    }
}

run();
