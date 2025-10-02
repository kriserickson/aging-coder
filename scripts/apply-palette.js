#!/usr/bin/env node
/**
 * Apply a palette (brand or code) to a target CSS file by replacing CSS custom property values.
 * - Light values go into :root
 * - Dark values go into [data-theme="dark"]
 *
 * Usage (Windows cmd.exe):
 *   node scripts/apply-palette.js --palette=teal --set=brand --file=assets/css/style.css
 *   node scripts/apply-palette.js --palette=code-dracula --set=code
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

function parseArgs(argv){
  const out = {};
  for (const part of argv) {
    const m = part.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
    else if (part.startsWith('--')) out[part.slice(2)] = 'true';
  }
  return out;
}

async function loadPalette(setName, id){
  const file = String(setName || 'brand').toLowerCase() === 'code' ? 'code-palettes.json' : 'palettes.json';
  const jsonPath = path.resolve(__dirname, file);
  const raw = await fsp.readFile(jsonPath, 'utf8');
  const all = JSON.parse(raw);
  if (!Array.isArray(all)) throw new Error(`${file} must be an array`);
  const p = all.find(x => String(x.id).toLowerCase() === String(id).toLowerCase());
  if (!p) throw new Error(`Palette '${id}' not found in ${file}`);
  return p;
}

function updateCssBlock(css, selector, vars, predicate){
  // Find the block for selector and replace var values inside
  const selIndex = css.indexOf(selector);
  if (selIndex === -1) return css; // nothing to do
  const openIndex = css.indexOf('{', selIndex);
  if (openIndex === -1) return css;
  let depth = 0;
  let i = openIndex;
  for (; i < css.length; i++) {
    const ch = css[i];
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) { i++; break; } }
  }
  const blockStart = openIndex + 1;
  const blockEnd = i - 1; // char before closing '}'
  const before = css.slice(0, blockStart);
  const block = css.slice(blockStart, blockEnd);
  const after = css.slice(blockEnd);

  let updated = block;
  const insertions = [];
  for (const [k, v] of Object.entries(vars)){
    if (predicate && !predicate(k)) continue;
    const re = new RegExp(`(^|[\\/*;\\n\\r\\t\\s])(${escapeRegExp(k)})\\s*:\\s*[^;]*;`, 'g');
    if (re.test(updated)){
      updated = updated.replace(re, (m, prefix, name) => `${prefix}${name}: ${v};`);
    } else {
      insertions.push(`  ${k}: ${v};`);
    }
  }
  if (insertions.length){
    // Place insertions just before end of block, keep a newline if present
    const trimmed = updated.trimEnd();
    const pad = updated.endsWith('\n') ? '' : '\n';
    updated = `${trimmed}${pad}${insertions.join('\n')}\n`;
  }

  return before + updated + after;
}

function escapeRegExp(str){
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function main(){
  const args = parseArgs(process.argv.slice(2));
  const setName = String(args.set || 'brand').toLowerCase();
  const paletteId = args.palette || args.id;
  if (!paletteId) {
    console.error('Missing --palette=<id>');
    process.exit(2);
  }
  const targetFile = args.file || path.join('assets','css','style.css');
  const targetPath = path.resolve(targetFile);

  const palette = await loadPalette(setName, paletteId);
  const originalCss = await fsp.readFile(targetPath, 'utf8');
  let css = originalCss;

  const isCode = setName === 'code';
  const predLight = (k) => isCode ? k.startsWith('--code-') : !k.startsWith('--code-');
  const predDark = predLight;

  css = updateCssBlock(css, ':root', palette.light, predLight);
  css = updateCssBlock(css, '[data-theme="dark"]', palette.dark, predDark);

  // Write a backup of the original then save updated
  const backupPath = targetPath + '.bak';
  await fsp.writeFile(backupPath, originalCss, 'utf8');
  await fsp.writeFile(targetPath, css, 'utf8');

  console.log(`[apply-palette] Applied '${palette.id}' (${setName}) to ${path.relative(process.cwd(), targetPath)}`);
}

main().catch(err => { console.error(err); process.exit(1); });
