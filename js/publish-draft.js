const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer');
const readline = require('readline');

// Define the directory where posts are stored (resolve relative to this script)
const postsDir = path.join(__dirname, '..', 'src', 'posts');
if (!fs.existsSync(postsDir)) {
  console.error(`Posts directory not found: ${path.resolve(postsDir)}`);
  process.exitCode = 1;
}

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

      // Some Dirent types (symlinks etc) might not report isFile() reliably.
      // Use fs.statSync to verify this is a regular file; skip otherwise.
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }
      if (!stat.isFile()) {
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

      if (/(^|\r?\n)\s*draft\s*:\s*(?:true|yes)\s*($|\r?\n)/i.test(content)) {
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

// Simple interactive selector using arrow keys (TTY) with [*]/[ ] markers and a numbered fallback
function interactiveSelect(choices, message = 'Select an option:') {
  return new Promise((resolve, reject) => {
    // Non-TTY fallback: print numbered list and ask for a number
    if (!process.stdin.isTTY) {
      const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
      console.log(message);
      choices.forEach((c, i) => console.log(` ${i + 1}) ${c.name}`));
      rl.question('Enter number of selection: ', (ans) => {
        rl.close();
        const n = parseInt(ans, 10);
        if (!Number.isFinite(n) || n < 1 || n > choices.length) {
          reject(new Error('invalid_selection'));
          return;
        }
        resolve(choices[n - 1].value);
      });
      return;
    }

    const rlInterface = readline.createInterface({ input: process.stdin, output: process.stdout });
    readline.emitKeypressEvents(process.stdin, rlInterface);
    if (process.stdin.setRawMode) process.stdin.setRawMode(true);

    let selected = 0;
    let first = true;

    function render() {
      if (first) {
        process.stdout.write(message + '\n');
        for (let i = 0; i < choices.length; i++) {
          process.stdout.write(`${i === selected ? '[*]' : '[ ]'} ${choices[i].name}\n`);
        }
        first = false;
      } else {
        // Move cursor up by the number of choice lines so we can redraw them in place
        process.stdout.write(`\x1b[${choices.length}A`);
        for (let i = 0; i < choices.length; i++) {
          // Clear the current line and write the updated entry
          process.stdout.write('\x1b[2K\r' + `${i === selected ? '[*]' : '[ ]'} ${choices[i].name}\n`);
        }
      }
    }

    function cleanup() {
      process.stdin.removeListener('keypress', onKey);
      if (process.stdin.setRawMode) process.stdin.setRawMode(false);
      rlInterface.close();
      process.stdout.write('\n');
    }

    function onKey(str, key) {
      if (key && key.name === 'up') {
        selected = (selected - 1 + choices.length) % choices.length;
        render();
      } else if (key && key.name === 'down') {
        selected = (selected + 1) % choices.length;
        render();
      } else if (key && (key.name === 'return' || key.name === 'enter')) {
        cleanup();
        resolve(choices[selected].value);
      } else if (key && key.ctrl && key.name === 'c') {
        cleanup();
        reject(new Error('cancelled'));
      }
    }

    render();
    process.stdin.on('keypress', onKey);
  });
}

// Function to publish a draft: remove 'draft: true' and set today's date, and rename file if needed
function publishDraft(fileName) {
  const filePath = path.join(postsDir, fileName);

  // Read the file; if it fails, report an error and return
  let orig;
  try {
    orig = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.error(`Cannot read selected draft (expected a file): ${filePath}`, e);
    return;
  }
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

  // Debug output: show whether each draft path points to a file or directory
  console.log('Found drafts:');
  for (const d of drafts) {
    const full = path.join(postsDir, d);
    let type = 'missing';
    try {
      const s = fs.statSync(full);
      type = s.isFile() ? 'file' : s.isDirectory() ? 'dir' : 'other';
    } catch (e) {}
    console.log(`  ${d} -> ${type}`);
  }

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
    // If multiple drafts, prompt the user to select one with a cursor (up/down + enter).
    // Build choices as objects so the displayed label can be friendly but the returned value
    // is the actual relative filename we need to publish.
    const choices = drafts
      .map(d => {
        const base = path.basename(d);
        const m = base.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
        const name = m ? `${m[1]} \u2014 ${m[2]}` : base; // 'YYYY-MM-DD — rest'
        return { name, value: d, short: base };
      })
      .filter(c => {
        // Double-check each choice points to a real file; filter out any unexpected dirs
        try {
          const s = fs.statSync(path.join(postsDir, c.value));
          return s.isFile();
        } catch (e) {
          return false;
        }
      });

    if (choices.length === 0) {
      console.log('No valid files available to publish.');
      return;
    }

    try {
      const selectedValue = await interactiveSelect(choices, 'Select a draft to publish (use ↑/↓ and Enter):');
      console.log(`Selected raw value: ${JSON.stringify(selectedValue)}`);

      // Validate and resolve selection to a real file inside postsDir
      let resolved = null;
      if (typeof selectedValue === 'string' && selectedValue.length > 0) {
        const full = path.join(postsDir, selectedValue);
        try {
          const s = fs.statSync(full);
          if (s.isFile()) resolved = selectedValue;
        } catch (e) {
          // ignore and try basename matching below
        }

        if (!resolved) {
          const byBase = drafts.find(d => {
            const b = path.basename(d);
            return b === selectedValue || b.includes(String(selectedValue)) || selectedValue.includes(b);
          });
          if (byBase) resolved = byBase;
        }
      }

      if (!resolved) {
        console.error('Cannot resolve selection to a valid draft file. Selection:', selectedValue);
        console.error('Available drafts:\n  ' + drafts.join('\n  '));
        return;
      }

      publishDraft(resolved);
    } catch (error) {
      if (error && error.message === 'cancelled') return;
      console.error('Error during interactive selection:', error);
    }
  }
}

run();
