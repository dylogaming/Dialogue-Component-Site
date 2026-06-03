/* Build docs.html from the cloned wiki markdown.
   Run: node build-docs.js  (expects WIKI dir + assets/docs already populated) */
const fs = require('fs');
const path = require('path');

const WIKI = process.argv[2] || path.join(process.env.TEMP || '/tmp', 'dc_wiki');
const ASSETS = path.join(__dirname, 'assets', 'docs');

/* uuid -> local filename (with real extension) */
const manifest = {};
for (const f of fs.readdirSync(ASSETS)) manifest[f.replace(/\.[^.]+$/, '')] = 'assets/docs/' + f;

const localize = (s) => s.replace(
  /https:\/\/github\.com\/(?:dylogaming\/Dialogue-Component|user-attachments)\/assets\/[0-9]*\/?([0-9a-f-]{36})/g,
  (m, uuid) => manifest[uuid] || m
);

const esc = (s) => s.replace(/&(?!#?\w+;)/g, '&amp;');

/* inline markdown -> html (leaves existing html tags intact) */
function inline(t) {
  t = t.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (m, txt, url) => `<a href="${url}" target="_blank" rel="noopener">${txt}</a>`);
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>');
  t = t.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
  return t;
}

/* pull <img> / ![]() out of a chunk. returns {text, media[]} */
function extractImages(chunk) {
  const media = [];
  // markdown images
  chunk = chunk.replace(/!\[([^\]]*)\]\(([^)\s]+)[^)]*\)/g, (m, alt, url) => {
    media.push({ src: url, alt, w: 0 }); return '';
  });
  // html images
  chunk = chunk.replace(/<img\b[^>]*>/gi, (tag) => {
    const src = (tag.match(/src="([^"]+)"/i) || [])[1] || '';
    const alt = (tag.match(/alt="([^"]*)"/i) || [])[1] || '';
    const w = parseInt((tag.match(/width="?(\d+)/i) || [])[1] || '0', 10);
    if (w && w <= 40) return `<img class="inline-icon" src="${src}" data-full="${src}" alt="${alt}">`; // keep inline
    media.push({ src, alt, w }); return '';
  });
  return { text: chunk, media };
}

function imgTag(m) {
  const style = (m.w && m.w > 40 && m.w <= 760) ? ` style="max-width:${m.w}px"` : '';
  return `<img class="doc-img" loading="lazy" src="${m.src}" data-full="${m.src}" alt="${esc(m.alt)}"${style}>`;
}

/* clean a table cell's raw html into body text (images removed) */
function cellText(raw) {
  let t = raw
    .replace(/<\/?p[^>]*>/gi, '')
    .replace(/<\/?div[^>]*>/gi, '')
    .replace(/<\/?h3[^>]*>/gi, '');
  const { text, media } = extractImages(t);
  // split on <br> runs into paragraphs
  const parts = text.split(/(?:<br\s*\/?>\s*){1,}/i).map(s => s.trim()).filter(Boolean);
  const html = parts.map(p => `<p>${inline(p)}</p>`).join('');
  return { html, media };
}

function mediaBlock(media) {
  return media.map(imgTag).join('\n');
}

/* render a markdown table block (array of raw row-strings) */
function renderTable(rows) {
  const grid = rows.map(r => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim()));
  // drop separator rows
  const data = grid.filter(cells => !cells.every(c => /^:?-{2,}:?$/.test(c) || c === ''));
  if (!data.length) return '';
  const ncols = Math.max(...data.map(r => r.length));
  let out = '';

  if (ncols === 1) {
    // styled box: first row may be an <h3> header
    let start = 0;
    const h = data[0][0];
    if (/<h3/i.test(h)) { out += `<h3>${inline(h.replace(/<\/?h3[^>]*>/gi, '').trim())}</h3>`; start = 1; }
    for (let i = start; i < data.length; i++) {
      const { html, media } = cellText(data[i][0]);
      if (html && media.length) out += `<div class="doc-step"><div class="doc-step-text">${html}</div><div class="doc-step-media">${mediaBlock(media)}</div></div>`;
      else if (media.length) out += `<div class="doc-figure">${mediaBlock(media)}</div>`;
      else if (html) out += html;
    }
    return out;
  }

  // 2+ columns: header row is generic labels (Step/Image/Description/Preview) -> skip if so
  let start = 0;
  const hdr = data[0].map(c => c.replace(/[*_]/g, '').toLowerCase());
  if (hdr.every(c => /^(step|steps|image|images|description|preview|)$/.test(c))) start = 1;
  for (let i = start; i < data.length; i++) {
    const left = cellText(data[i][0] || '');
    const rightRaw = (data[i].slice(1).join(' ')) || '';
    const right = cellText(rightRaw);
    const media = [...left.media, ...right.media];
    const text = left.html || right.html;
    if (text && media.length) out += `<div class="doc-step"><div class="doc-step-text">${text}</div><div class="doc-step-media">${mediaBlock(media)}</div></div>`;
    else if (media.length) out += `<div class="doc-figure">${mediaBlock(media)}</div>`;
    else if (text) out += text;
  }
  return out;
}

/* render loose (non-table) lines */
function renderLoose(lines) {
  let out = '', ul = [], para = [];
  const flushP = () => { if (para.length) { const j = para.join(' '); const { text, media } = extractImages(j); if (text.trim()) out += `<p>${inline(text.trim())}</p>`; if (media.length) out += `<div class="doc-figure">${mediaBlock(media)}</div>`; para = []; } };
  const flushUl = () => { if (ul.length) { out += '<ul>' + ul.map(li => `<li>${inline(li)}</li>`).join('') + '</ul>'; ul = []; } };
  for (let raw of lines) {
    const line = raw.replace(/\s+$/, '');
    if (/^\s*$/.test(line)) { flushP(); flushUl(); continue; }
    let m;
    if ((m = line.match(/^(#{1,4})\s+(.*)/))) { flushP(); flushUl(); const lvl = m[1].length >= 4 ? 'h4' : 'h3'; out += `<${lvl}>${inline(m[2].trim())}</${lvl}>`; continue; }
    if (/^\s*(\*\*\*|---)\s*$/.test(line)) { flushP(); flushUl(); out += '<hr>'; continue; }
    if ((m = line.match(/^\s*[-*]\s+(.*)/))) { flushP(); ul.push(m[1]); continue; }
    flushUl();
    // standalone image line or <p><img></p>
    if (/^\s*(<p[^>]*>)?\s*(<img|!\[)/i.test(line) && !/[A-Za-z]{3,}.*[A-Za-z]{3,}/.test(line.replace(/<[^>]+>/g, '').replace(/https?:\S+/g, ''))) {
      const { text, media } = extractImages(line.replace(/<\/?p[^>]*>/gi, ''));
      if (media.length) { flushP(); out += `<div class="doc-figure">${mediaBlock(media)}</div>`; if (text.trim()) para.push(text); continue; }
    }
    para.push(line);
  }
  flushP(); flushUl();
  return out;
}

/* split a page into table-blocks and loose-blocks, render in order */
function renderPage(md) {
  const lines = md.split(/\r?\n/);
  let out = '', i = 0;
  while (i < lines.length) {
    if (/^\s*\|/.test(lines[i])) {
      const block = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) block.push(lines[i++]);
      out += renderTable(block);
    } else {
      const block = [];
      while (i < lines.length && !/^\s*\|/.test(lines[i])) block.push(lines[i++]);
      out += renderLoose(block);
    }
  }
  return out;
}

/* ---- page order + metadata ---- */
const PAGES = [
  { file: '03.-Getting-Started.md', id: 'getting-started', num: '03', icon: '🚀', title: 'Getting Started', lede: 'Add the component, paste a few nodes, and start authoring branching conversations.' },
  { file: '04.-Editor-Utility-Widget.md', id: 'editor', num: '04', icon: '🖥️', title: 'Editor Utility Widget', lede: 'Keep every variable visible and preview camera angles while you build.' },
  { file: '05.-Global-Variables.md', id: 'global', num: '05', icon: '🛠️', title: 'Global Variables', lede: 'Apply one set of settings across every branch for simple NPCs.' },
  { file: '06.-Additional-Settings.md', id: 'settings', num: '06', icon: '⚙️', title: 'Additional Settings', lede: 'Auto-complete, activators, logs, locations, alt buttons, nameplates, visibility, and more.' },
  { file: '07.-Conditions.md', id: 'conditions', num: '07', icon: '⚖️', title: 'Conditions', lede: 'Gate responses on player stats with pass / fail states.' },
  { file: '08.-Rich-Text---Icons-&-Fonts.md', id: 'rich-text', num: '08', icon: '🎨', title: 'Rich Text, Icons & Fonts', lede: 'Style text inline with color tags, icons, and custom fonts.' },
  { file: '09.-UI-Customization.md', id: 'ui', num: '09', icon: '🎛️', title: 'UI Customization', lede: 'Two ways to restyle the dialogue UI, with live preview.' },
  { file: '10.-Save-System.md', id: 'save', num: '10', icon: '💾', title: 'Save System', lede: 'Persist actor transforms, branches, and conditions, then restore them on load.' },
  { file: '11.-Moving-Actor-&-Camera-Tracker.md', id: 'moving-actor', num: '11', icon: '🎬', title: 'Moving Actor & Camera Tracker', lede: 'Spline-driven cinematic rails and consistent camera framing.' },
  { file: '12.-Data-Tables.md', id: 'data-tables', num: '12', icon: '📊', title: 'Data Tables', lede: 'Author whole conversations in a spreadsheet and import them by name.' },
  { file: '02.-FAQ.md', id: 'faq', num: '02', icon: '❓', title: 'FAQ & Troubleshooting', lede: 'Fixes for movement, interaction visuals, and hair groom issues.' },
  { file: '01.-Change-Log.md', id: 'changelog', num: '01', icon: '🗒️', title: 'Change Log', lede: 'Every update, newest first.' },
];

let nav = '', sections = '';
PAGES.forEach((p, idx) => {
  const md = localize(fs.readFileSync(path.join(WIKI, p.file), 'utf8'));
  const body = renderPage(md);
  nav += `<li><a href="#${p.id}"><span class="ix">${p.icon}</span>${p.title}</a></li>\n`;
  const prev = PAGES[idx - 1], next = PAGES[idx + 1];
  let pager = '<div class="doc-pager">';
  pager += prev ? `<a class="prev" href="#${prev.id}"><span>Previous</span><b>${prev.title}</b></a>` : '<span></span>';
  pager += next ? `<a class="next" href="#${next.id}"><span>Next</span><b>${next.title}</b></a>` : '<span></span>';
  pager += '</div>';
  sections += `\n<section class="doc-section" id="${p.id}">\n<h2><span class="num">${p.num}</span>${p.title}</h2>\n<p class="lede">${p.lede}</p>\n${body}\n${pager}\n</section>\n`;
});

const html = fs.readFileSync(path.join(__dirname, 'docs.template.html'), 'utf8')
  .replace('<!--NAV-->', nav)
  .replace('<!--SECTIONS-->', sections);
fs.writeFileSync(path.join(__dirname, 'docs.html'), html);
console.log('Built docs.html:', html.length, 'bytes,', PAGES.length, 'pages,', Object.keys(manifest).length, 'images');
