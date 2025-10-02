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

// Function to find all draft posts (recursive, robust)
function findDraftPosts() {
  const results = [];

  function walk(dir, relPath = '') {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch (e) {
      return; // can't read this directory
    }

    for (const entry of entries) {
      const entryName = entry.name;
      const fullPath = path.join(dir, entryName);
      const relative = relPath ? path.join(relPath, entryName) : entryName;

      if (entry.isDirectory()) {
        walk(fullPath, relative);
        continue;
      }

      if (!entry.isFile()) {
        continue;
      }

      // Only consider Markdown files
      if (!/\.mdx?$|\.markdown$/i.test(entryName)) {
        continue;
      }

      let content;
      try {
        content = fs.readFileSync(fullPath, 'utf-8');
      } catch (e) {
        // skip unreadable files
        continue;
      }

      if (/(^|\r?\n)\s*draft\s*:\s*true\s*($|\r?\n)/i.test(content)) {
        // push the path relative to postsDir so publishDraft can join it
        results.push(relative);
      }
    }
  }

  walk(postsDir, '');
  return results;
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

// Ensure a unique filename by appending incremental suffix before extension if needed
function getUniqueFileName(dir, desiredName) {
  const ext = path.extname(desiredName);
  const base = desiredName.slice(0, -ext.length);
  let candidate = desiredName;
  let i = 2;
  while (fs.existsSync(path.join(dir, candidate))) {
    candidate = `${base}-${i}${ext}`;
    i += 1;
  }
  return candidate;
}

// Support dry-run via environment variable or --dry-run flag
const DRY_RUN = process.env.DRY_RUN === '1' || process.argv.includes('--dry-run');
// Support non-interactive flags
const PUBLISH_ALL = process.argv.includes('--all');
let PUBLISH_FILE = null;
for (const arg of process.argv) {
  if (arg.startsWith('--file=')) {
    PUBLISH_FILE = arg.split('=')[1];
  }
  if (arg.startsWith('--name=')) {
    PUBLISH_FILE = arg.split('=')[1];
  }
}
// Accept a positional filename as well (e.g., node js/publish-draft.js my-file.md)
if (!PUBLISH_FILE) {
  const pos = process.argv.find((a, i) => i >= 2 && !a.startsWith('--'));
  if (pos) PUBLISH_FILE = pos;
}

// Maybe rename file to use today's date in the filename (YYYY-MM-DD-...)
function maybeRenameWithDatePrefix(fileName, today) {
  // fileName may be nested like 'older/2024-01-01-post.md'
  const dir = path.dirname(fileName);
  const base = path.basename(fileName);
  const datePrefixRe = /^(\d{4}-\d{2}-\d{2})-(.+)$/;
  const m = base.match(datePrefixRe);
  if (!m) return fileName; // no date prefix on basename
  const [, oldDate, rest] = m;
  if (oldDate === today) return fileName; // already correct

  // keep extension and rest intact
  const desiredName = `${today}-${rest}`;
  // target directory where the file lives (could be postsDir or a subfolder)
  const targetDir = dir && dir !== '.' ? path.join(postsDir, dir) : postsDir;
  const finalName = getUniqueFileName(targetDir, desiredName);

  const oldPath = path.join(postsDir, fileName);
  const newPath = path.join(targetDir, finalName);

  if (DRY_RUN) {
    const relNew = dir && dir !== '.' ? path.join(dir, finalName) : finalName;
    console.log(`[dry-run] Would rename: ${fileName} -> ${relNew}`);
    return relNew;
  }

  fs.renameSync(oldPath, newPath);
  const relNew = dir && dir !== '.' ? path.join(dir, finalName) : finalName;
  console.log(`Renamed file: ${fileName} -> ${relNew}`);
  return relNew;
}

// Function to publish a draft: remove 'draft: true' and set today's date, and rename file if needed
function publishDraft(fileName) {
  const filePath = path.join(postsDir, fileName);
  const orig = fs.readFileSync(filePath, 'utf-8');
  const today = getToday();

  const updated = updateFrontMatter(orig, today);
  if (DRY_RUN) {
    console.log(`[dry-run] Would update front-matter for: ${fileName} (set date=${today} and remove draft=true)`);
  } else {
    fs.writeFileSync(filePath, updated, 'utf-8');
  }

  // After writing, ensure filename date matches front-matter date
  const finalName = maybeRenameWithDatePrefix(fileName, today);
  console.log(`Published: ${finalName} (date set to ${today})`);
}

// Main function to run the script
async function run() {
  const drafts = findDraftPosts();

  if (drafts.length === 0) {
    console.log('No drafts found.');
    return;
  }

  // If user passed a specific file to publish, try to find it
  if (PUBLISH_FILE) {
    // Normalize paths: allow passing 'subdir/file.md' or just 'file.md'
    let candidate = PUBLISH_FILE;
    // If candidate is a full path under postsDir, make it relative
    if (candidate.startsWith(postsDir)) {
      candidate = path.relative(postsDir, candidate);
    }
    // If the candidate exists in drafts (relative match), use it; otherwise check exact file existence under postsDir
    let toPublish = null;
    if (drafts.includes(candidate)) {
      toPublish = candidate;
    } else if (fs.existsSync(path.join(postsDir, candidate))) {
      toPublish = candidate;
    } else {
      // try matching by basename (filename only)
      const byBase = drafts.find(d => path.basename(d) === path.basename(candidate));
      if (byBase) toPublish = byBase;
    }

    if (!toPublish) {
      console.error(`No draft found matching '${PUBLISH_FILE}'. Found drafts:\n  ${drafts.join('\n  ')}`);
      return;
    }

    publishDraft(toPublish);
    return;
  }

  // If --all was provided, publish all drafts non-interactively
  if (PUBLISH_ALL) {
    for (const d of drafts) {
      publishDraft(d);
    }
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
