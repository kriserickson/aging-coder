#!/usr/bin/env node
/**
 * Screenshot themed palettes for Aging Coder site using Puppeteer.
 * - You must run the site separately (npm run serve) before running this.
 * - This script visits pages with ?theme=light|dark to force modes,
 *   injects brand or code CSS variables via a <style> tag, and captures screenshots.
 * - It also writes a .txt file next to each screenshot listing variables used.
 *
 * Usage (Windows cmd.exe):
 *   node scripts/screenshot-themes.js --baseUrl=http://localhost:8080 --set=brand --mode=both --mobile=false
 *
 * Options:
 *   --baseUrl   Base URL of the running site (default: http://localhost:8080)
 *   --set       Which variable set to apply: brand | code (default: brand)
 *   --mode      light | dark | both (default: both)
 *   --mobile    true|false (default: false)  // when true uses a mobile viewport; otherwise 1440x1244
 *   --palettes  Comma-separated list of palette IDs to include (optional)
 *   --gallery   all | first (default: all)   // in the HTML gallery, show all pages or just the first/featured
 */

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');

// Small helper to replace removed page.waitForTimeout in Puppeteer v22+
function sleep(ms) { return new Promise(res => setTimeout(res, ms)); }

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const baseUrl = args.baseUrl || 'http://localhost:8080';
  const pages = ['/', '/posts/2025-08-30-serving-the-cookbook-creating-an-endpoint-for-recipe-recommendations/'];
  const outRoot = path.resolve('reports', 'theme-previews');
  await fsp.mkdir(outRoot, { recursive: true });

  const allPalettes = await loadPalettes(args.set || 'brand');
  const selected = filterPalettes(allPalettes, args.palettes);
  const modes = normalizeModes(args.mode);
  const device = normalizeDevice(args.mobile);
  const isCodeSet = String(args.set || 'brand').toLowerCase() === 'code';
  // Max screenshot height in pixels; pages taller than this will be clipped to this height
  const MAX_SCREENSHOT_HEIGHT = 8000;
  const galleryMode = (args.gallery || 'all').toLowerCase(); // 'first' | 'all'
  const showPageOnly = galleryMode !== 'all';

  const puppeteer = require('puppeteer');
  const browser = await puppeteer.launch({
    headless: 'new',
    defaultViewport: {
      width: device.width,
      height: device.height,
      deviceScaleFactor: 1,
      isMobile: device.isMobile,
      hasTouch: device.isMobile,
    },
  });

  try {
    for (const p of selected) {
      const palOutDir = path.join(outRoot, p.id);
      await fsp.mkdir(palOutDir, { recursive: true });

      for (const mode of modes) {
        for (const rel of pages) {
          const page = await browser.newPage();
          try {
            // Build URL, handling file:// base specially so "/foo" resolves under _site rather than C:\
            const baseWithSlash = ensureTrailingSlash(baseUrl);
            const relForFile = baseWithSlash.startsWith('file:') ? rel.replace(/^\//, '') : rel;
            const urlStr = new URL(relForFile, baseWithSlash).toString();
            const themedUrl = appendQuery(urlStr, { theme: mode });

            await page.goto(themedUrl, { waitUntil: 'networkidle2' });

            // Inject the CSS variables for selected set
            const css = cssForPalette(p);
            await page.addStyleTag({ content: css });

            // Allow style to flush
            await sleep(250);

            // Determine content height and clip to MAX_SCREENSHOT_HEIGHT
            const contentHeight = await page.evaluate(() => {
              const b = document.body;
              const d = document.documentElement;
              return Math.max(
                b ? b.scrollHeight : 0,
                d ? d.scrollHeight : 0,
                b ? b.offsetHeight : 0,
                d ? d.offsetHeight : 0
              );
            });
            const targetHeight = Math.min(contentHeight || device.height, MAX_SCREENSHOT_HEIGHT);

            // Resize viewport to capture up to targetHeight; this avoids fullPage and enables a hard cap
            await page.setViewport({
              width: device.width,
              height: targetHeight,
              deviceScaleFactor: 1,
              isMobile: device.isMobile,
              hasTouch: device.isMobile,
            });

            // Give layout a moment after resizing
            await sleep(150);

            const safeRel = rel.replace(/^\//, '').replace(/\//g, '_') || 'index';
            const fileBase = `${safeRel}_${mode}`;
            const pngPath = path.join(palOutDir, `${fileBase}.png`);
            const txtPath = path.join(palOutDir, `${fileBase}.txt`);

            await page.screenshot({ path: pngPath });
            const varsTxt = textForVariables(p);
            await fsp.writeFile(txtPath, varsTxt, 'utf8');

            console.log(`[screenshot-themes] Saved: ${path.relative(process.cwd(), pngPath)} (height=${targetHeight}, contentHeight=${contentHeight})`);
          } catch (e) {
            console.error(`[screenshot-themes] Error for palette=${p.id} mode=${mode} page=${rel}:`, e.message);
          } finally {
            await page.close().catch(() => {});
          }
        }
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  // Generate the gallery index from a file template ({{rows}} placeholder)
  const outputIndexName = isCodeSet ? 'code-index.html' : 'index.html';
  await writeIndexHtml(outRoot, selected, pages, modes, showPageOnly, outputIndexName);
  console.log(`[screenshot-themes] Done. Gallery: ${path.join('reports', 'theme-previews', outputIndexName)}`);
}

function parseArgs(argv) {
  const out = {};
  for (const part of argv) {
    const m = part.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
    else if (part.startsWith('--')) out[part.slice(2)] = 'true';
  }
  return out;
}

function normalizeModes(mode) {
  const m = (mode || 'both').toLowerCase();
  if (m === 'light') return ['light'];
  if (m === 'dark') return ['dark'];
  return ['light', 'dark'];
}

function normalizeDevice(mobile) {
  const isMobile = String(mobile || 'false').toLowerCase() === 'true';
  if (isMobile) return { isMobile: true, width: 390, height: 844 };
  return { isMobile: false, width: 1440, height: 1244 };
}

function ensureTrailingSlash(u) {
  return u.endsWith('/') ? u : u + '/';
}

function appendQuery(url, params) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    u.searchParams.set(k, v);
  }
  return u.toString();
}

async function loadPalettes(setName) {
  const file = String(setName || 'brand').toLowerCase() === 'code' ? 'code-palettes.json' : 'palettes.json';
  const jsonPath = path.resolve(__dirname, file);
  const buf = await fsp.readFile(jsonPath, 'utf8');
  const parsed = JSON.parse(buf);
  if (!Array.isArray(parsed)) throw new Error(`${file} must export an array`);
  return parsed;
}

function filterPalettes(allPalettes, list) {
  if (!list) return allPalettes;
  const wanted = new Set(String(list).split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  return allPalettes.filter(p => wanted.has(p.id.toLowerCase()));
}

function textForVariables(p) {
  const lines = [];
  lines.push(`# palette: ${p.id}`);
  lines.push(`# light variables:`);
  for (const [k, v] of Object.entries(p.light)) lines.push(`${k}: ${v}`);
  lines.push(`# dark variables:`);
  for (const [k, v] of Object.entries(p.dark)) lines.push(`${k}: ${v}`);
  return lines.join('\n') + '\n';
}

function cssForPalette(p) {
  const light = Object.entries(p.light).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  const dark = Object.entries(p.dark).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  return `:root {\n${light}\n}\n[data-theme=\"dark\"] {\n${dark}\n}`;
}

async function writeIndexHtml(outRoot, palettes, pages, modes, showPageOnly, fileName) {
  const rel = (p) => path.relative(outRoot, p).replace(/\\/g, '/');
  const rows = [];
  const pagesForGallery = showPageOnly ? [pages[1]] : pages;
  for (const p of palettes) {
    rows.push(`<h2 id=\"${p.id}\">${p.id}</h2>`);
    rows.push('<div class=\"grid\">');
    for (const mode of modes) {
      for (const page of pagesForGallery) {
        const safeRel = (page.replace(/^\//, '').replace(/\//g, '_') || 'index') + '_' + mode;
        const png = rel(path.join(outRoot, p.id, `${safeRel}.png`));
        const txt = rel(path.join(outRoot, p.id, `${safeRel}.txt`));
        const varsText = textForVariables(p);
        const varsB64 = Buffer.from(varsText, 'utf8').toString('base64');
        rows.push(`
          <figure class=\"card\">
            <div class=\"card-head\">${p.id} — ${safeRel} <a href=\"${txt}\" data-vars data-vars-b64=\"${varsB64}\" style=\"margin-left:auto;font-weight:600;\">vars</a></div>
            <img src=\"${png}\" alt=\"${p.id} ${safeRel}\" data-view>
          </figure>`);
      }
    }
    rows.push('</div>');
  }

  // Load template HTML and replace {{rows}}
  const templatePath = path.resolve(__dirname, 'templates', 'theme-previews.html');
  const template = await fsp.readFile(templatePath, 'utf8');
  const html = template.replace('{{rows}}', rows.join('\n'));
  await fsp.writeFile(path.join(outRoot, fileName), html, 'utf8');
}

main().catch(err => { console.error(err); process.exit(1); });
