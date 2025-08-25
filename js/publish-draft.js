const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');

// Define the directory where posts are stored
const postsDir = path.join('src', 'posts');

// Get local date as YYYY-MM-DD
function getToday() {
  const now = new Date();
  const tzOffsetMs = now.getTimezoneOffset() * 60000;
  const local = new Date(now.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 10);
}

// Function to find all draft posts (simple check)
function findDraftPosts() {
  const files = fs.readdirSync(postsDir);
  return files.filter(file => {
    const filePath = path.join(postsDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    return /(^|\r?\n)\s*draft\s*:\s*true\s*($|\r?\n)/i.test(content);
  });
}

// Update front matter: remove draft and set date
function updateFrontMatter(content, today) {
  const fmRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;
  const match = content.match(fmRegex);

  const stripDraft = (text) => {
    const lines = text.split(/\r?\n/).filter(l => !/^\s*draft\s*:\s*true\s*$/i.test(l));
    return lines.join('\n').trimEnd();
  };

  const setDate = (text) => {
    if (/^\s*date\s*:/m.test(text)) {
      return text.replace(/^\s*date\s*:\s*.*$/m, `date: ${today}`);
    }
    // Append date if it didn’t exist
    return (text.endsWith('\n') ? text : text + '\n') + `date: ${today}`;
  };

  if (match) {
    let fm = match[1];
    fm = stripDraft(fm);
    fm = setDate(fm);
    const body = content.slice(match[0].length);
    // Normalize to \n inside front matter block
    return `---\n${fm}\n---\n${body}`;
  } else {
    // No front matter found: create one, remove any loose draft line
    const body = content.replace(/(^|\r?\n)\s*draft\s*:\s*true\s*($|\r?\n)/i, '\n');
    return `---\ndate: ${today}\n---\n${body.replace(/^\r?\n/, '')}`;
  }
}

// Function to publish a draft: remove 'draft: true' and set today's date
function publishDraft(fileName) {
  const filePath = path.join(postsDir, fileName);
  const orig = fs.readFileSync(filePath, 'utf-8');
  const today = getToday();

  const updated = updateFrontMatter(orig, today);
  fs.writeFileSync(filePath, updated, 'utf-8');
  console.log(`Published: ${fileName} (date set to ${today})`);
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
