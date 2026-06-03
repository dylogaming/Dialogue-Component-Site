/* ============================================================
   In-page docs editor (GitBook-style). Only enabled when the page
   is served from the local editor server (localhost). On file:// or
   GitHub Pages it stays read-only.
   Features: inline text editing, paste images/gifs, drop media,
   insert video, pick existing images, snipping-tool annotation.
   ============================================================ */
window.initDocsEditor = function initDocsEditor(data) {
  'use strict';
  const isLocal = ['localhost', '127.0.0.1'].includes(location.hostname);
  if (!isLocal) return; // public/file:// view is read-only

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const api = async (path, body) => {
    const r = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || r.status);
    return r.json();
  };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id' + Date.now() + Math.round(Math.random() * 1e6));

  /* ---------- toast ---------- */
  const toast = document.createElement('div'); toast.className = 'ed-toast'; document.body.appendChild(toast);
  let toastT;
  const say = (msg, kind = '') => {
    toast.textContent = msg; toast.className = 'ed-toast show ' + kind;
    clearTimeout(toastT); toastT = setTimeout(() => toast.classList.remove('show'), 2600);
  };

  /* ---------- toggle + toolbar ---------- */
  const fab = document.createElement('div'); fab.className = 'ed-fab';
  fab.innerHTML = `<button class="ed-btn primary" id="edToggle">✎ Edit</button>`;
  document.body.appendChild(fab);

  const bar = document.createElement('div'); bar.className = 'ed-bar';
  bar.innerHTML = `
    <button data-cmd="bold" title="Bold"><b>B</b></button>
    <button data-cmd="italic" title="Italic"><i>I</i></button>
    <button data-cmd="h3" title="Heading">H</button>
    <span class="sep"></span>
    <button data-act="image">🖼 Image</button>
    <button data-act="library">📁 Existing</button>
    <button data-act="video">🎞 Video</button>
    <span class="sep"></span>
    <button data-act="discard">Discard</button>
    <button class="save" data-act="save">💾 Save</button>`;
  document.body.appendChild(bar);

  /* hidden file inputs */
  const fileImg = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', style: 'display:none' });
  const fileVid = Object.assign(document.createElement('input'), { type: 'file', accept: 'video/*', style: 'display:none' });
  document.body.append(fileImg, fileVid);

  const bodies = () => $$('.doc-body');
  let editing = false;
  let lastRange = null;

  const saveRange = () => { const s = getSelection(); if (s.rangeCount) lastRange = s.getRangeAt(0); };
  document.addEventListener('selectionchange', () => { if (editing) saveRange(); });

  const setEditing = (on) => {
    editing = on;
    document.body.classList.toggle('edit-on', on);
    bodies().forEach(b => b.setAttribute('contenteditable', on ? 'true' : 'false'));
    const t = $('#edToggle');
    t.textContent = on ? '✓ Editing' : '✎ Edit';
    t.classList.toggle('on', on);
    if (!on) hidePopover();
  };
  $('#edToggle').addEventListener('click', () => setEditing(!editing));

  /* ---------- helpers: insert nodes at caret ---------- */
  const focusedBody = () => {
    let n = lastRange && lastRange.commonAncestorContainer;
    while (n && n.nodeType === 1 ? !n.classList?.contains('doc-body') : true) {
      if (!n) break; n = n.parentElement;
    }
    return (n && n.classList && n.classList.contains('doc-body')) ? n : bodies()[0];
  };
  const insertNode = (node) => {
    const body = focusedBody();
    if (lastRange && body.contains(lastRange.commonAncestorContainer)) {
      lastRange.collapse(false);
      lastRange.insertNode(node);
    } else {
      body.appendChild(node);
    }
  };
  const figureFor = (el) => { const f = document.createElement('div'); f.className = 'doc-figure'; f.appendChild(el); return f; };
  const makeImg = (src, alt = '') => {
    const i = document.createElement('img'); i.className = 'doc-img'; i.loading = 'lazy';
    i.src = src; i.dataset.full = src; i.alt = alt; return i;
  };

  /* ---------- media upload ---------- */
  const blobToDataURL = (blob) => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
  const extFor = (type) => ({ 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm' }[type] || 'png');
  async function uploadBlob(blob, kind) {
    const dataUrl = await blobToDataURL(blob);
    const name = (kind || 'paste') + '-' + uid() + '.' + extFor(blob.type);
    const { path } = await api('/api/media', { name, dataUrl });
    return path;
  }
  async function insertMediaFile(file) {
    try {
      const path = await uploadBlob(file, file.type.startsWith('video') ? 'video' : 'img');
      if (file.type.startsWith('video')) {
        const v = document.createElement('video'); v.className = 'doc-video'; v.src = path; v.controls = true;
        insertNode(figureFor(v));
      } else {
        insertNode(figureFor(makeImg(path, file.name.replace(/\.[^.]+$/, ''))));
      }
      say('Media added');
    } catch (e) { say('Upload failed: ' + e.message, 'err'); }
  }

  /* ---------- paste & drop ---------- */
  document.addEventListener('paste', (e) => {
    if (!editing) return;
    const items = [...(e.clipboardData?.items || [])];
    const media = items.find(it => it.type.startsWith('image/') || it.type.startsWith('video/'));
    if (media) {
      e.preventDefault();
      const blob = media.getAsFile(); if (blob) insertMediaFile(blob);
      return;
    }
    // plain-text paste (strip rich formatting)
    const text = e.clipboardData?.getData('text/plain');
    if (text != null) { e.preventDefault(); document.execCommand('insertText', false, text); }
  });
  document.addEventListener('dragover', e => { if (editing && e.dataTransfer?.types.includes('Files')) e.preventDefault(); });
  document.addEventListener('drop', e => {
    if (!editing) return;
    const files = [...(e.dataTransfer?.files || [])].filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
    if (files.length) { e.preventDefault(); saveRange(); files.forEach(insertMediaFile); }
  });

  /* ---------- toolbar actions ---------- */
  bar.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); }); // keep selection
  bar.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    const cmd = b.dataset.cmd, act = b.dataset.act;
    if (cmd === 'bold') document.execCommand('bold');
    else if (cmd === 'italic') document.execCommand('italic');
    else if (cmd === 'h3') document.execCommand('formatBlock', false, 'h3');
    else if (act === 'image') fileImg.click();
    else if (act === 'video') fileVid.click();
    else if (act === 'library') openLibrary();
    else if (act === 'save') doSave();
    else if (act === 'discard') { if (confirm('Discard unsaved changes and reload?')) location.reload(); }
  });
  let replaceTarget = null;
  fileImg.addEventListener('change', async () => {
    const files = [...fileImg.files]; fileImg.value = '';
    if (replaceTarget) {
      const f = files[0], img = replaceTarget; replaceTarget = null;
      if (!f) return;
      try { const path = await uploadBlob(f, 'img'); img.src = path; img.dataset.full = path; say('Image replaced'); }
      catch (e) { say('Replace failed', 'err'); }
      return;
    }
    files.forEach(insertMediaFile);
  });
  fileVid.addEventListener('change', () => { [...fileVid.files].forEach(insertMediaFile); fileVid.value = ''; });

  /* ---------- image popover (annotate / replace / delete / width) ---------- */
  let pop = null, popImg = null;
  const hidePopover = () => { pop?.remove(); pop = null; $$('.doc-img.ed-sel').forEach(i => i.classList.remove('ed-sel')); popImg = null; };
  document.addEventListener('click', e => {
    if (!editing) return;
    const img = e.target.closest('.doc-img');
    if (!img) { if (!e.target.closest('.ed-pop')) hidePopover(); return; }
    e.preventDefault(); e.stopPropagation();
    hidePopover();
    popImg = img; img.classList.add('ed-sel');
    pop = document.createElement('div'); pop.className = 'ed-pop';
    pop.innerHTML = `<button data-p="annotate">✏ Annotate</button><button data-p="replace">↻ Replace</button><button data-p="wider">⤢ Width</button><button class="danger" data-p="del">🗑 Delete</button>`;
    document.body.appendChild(pop);
    const r = img.getBoundingClientRect();
    pop.style.left = Math.max(10, Math.min(r.left + scrollX, innerWidth - pop.offsetWidth - 10)) + 'px';
    pop.style.top = (r.top + scrollY - pop.offsetHeight - 8) + 'px';
  }, true);
  document.addEventListener('click', e => {
    const b = e.target.closest('.ed-pop button'); if (!b || !popImg) return;
    const p = b.dataset.p, img = popImg;
    if (p === 'del') { (img.closest('.doc-figure') || img).remove(); hidePopover(); }
    else if (p === 'wider') { img.style.maxWidth = img.style.maxWidth ? '' : '760px'; }
    else if (p === 'replace') { replaceTarget = img; fileImg.click(); hidePopover(); }
    else if (p === 'annotate') { openAnnotate(img); hidePopover(); }
  });

  /* ---------- existing-media library ---------- */
  const modal = document.createElement('div'); modal.className = 'ed-modal'; document.body.appendChild(modal);
  const openModal = (html) => { modal.innerHTML = html; modal.classList.add('open'); };
  const closeModal = () => { modal.classList.remove('open'); modal.innerHTML = ''; };
  async function openLibrary() {
    saveRange();
    let files = [];
    try { files = (await (await fetch('/api/list-media')).json()).files || []; } catch { say('Could not list media', 'err'); return; }
    openModal(`<div class="ed-modal-card"><div class="ed-modal-head"><span class="title">Insert existing media</span><button class="ed-tool" data-x="close">Close</button></div>
      <div class="ed-grid">${files.map(f => {
        const v = /\.(mp4|webm)$/i.test(f);
        return `<div class="cell" data-f="${f}">${v ? `<video src="${f}" muted></video>` : `<img src="${f}" loading="lazy">`}<span>${f.split('/').pop()}</span></div>`;
      }).join('')}</div></div>`);
    modal.querySelector('.ed-grid').addEventListener('click', e => {
      const cell = e.target.closest('.cell'); if (!cell) return;
      const f = cell.dataset.f;
      if (/\.(mp4|webm)$/i.test(f)) { const v = document.createElement('video'); v.className = 'doc-video'; v.src = f; v.controls = true; insertNode(figureFor(v)); }
      else insertNode(figureFor(makeImg(f)));
      closeModal(); say('Inserted');
    });
    modal.querySelector('[data-x=close]').addEventListener('click', closeModal);
  }

  /* ---------- annotation (snipping-tool style) ---------- */
  function openAnnotate(img) {
    const tools = ['arrow', 'box', 'pen', 'text'];
    const colors = ['#ff3b3b', '#ffd23b', '#36d98a', '#22d3ee', '#7c5cff', '#ffffff'];
    openModal(`<div class="ed-modal-card">
      <div class="ed-modal-head">
        <span class="title">Annotate</span>
        ${tools.map((t, i) => `<button class="ed-tool${i === 0 ? ' active' : ''}" data-tool="${t}">${({ arrow: '➔ Arrow', box: '▭ Box', pen: '✎ Pen', text: 'T Text' })[t]}</button>`).join('')}
        ${colors.map((c, i) => `<button class="ed-swatch${i === 0 ? ' active' : ''}" data-color="${c}" style="background:${c}"></button>`).join('')}
        <button class="ed-tool" data-undo>↶ Undo</button>
        <button class="ed-tool" data-clear>Clear</button>
      </div>
      <div class="ed-canvas-wrap"><canvas id="edCanvas"></canvas></div>
      <div class="ed-modal-foot"><button class="ed-tool" data-cancel>Cancel</button><button class="ed-btn primary" data-apply>Apply annotation</button></div>
    </div>`);

    const canvas = $('#edCanvas'), ctx = canvas.getContext('2d');
    const base = new Image(); base.crossOrigin = 'anonymous';
    let tool = 'arrow', color = colors[0], shapes = [], drawing = null;

    base.onload = () => {
      canvas.width = base.naturalWidth; canvas.height = base.naturalHeight;
      redraw();
    };
    base.onerror = () => say('Could not load image for annotation', 'err');
    base.src = img.src;

    const lw = () => Math.max(3, Math.round(canvas.width / 350));
    function drawShape(s) {
      ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = lw(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      if (s.t === 'box') { ctx.strokeRect(s.x, s.y, s.w, s.h); }
      else if (s.t === 'pen') { ctx.beginPath(); s.pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.stroke(); }
      else if (s.t === 'arrow') {
        const { x1, y1, x2, y2 } = s; const a = Math.atan2(y2 - y1, x2 - x1); const h = Math.max(14, lw() * 4);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - h * Math.cos(a - 0.4), y2 - h * Math.sin(a - 0.4));
        ctx.lineTo(x2 - h * Math.cos(a + 0.4), y2 - h * Math.sin(a + 0.4));
        ctx.closePath(); ctx.fill();
      } else if (s.t === 'text') {
        ctx.font = `bold ${Math.max(18, lw() * 7)}px Inter, sans-serif`;
        ctx.textBaseline = 'top'; ctx.fillText(s.text, s.x, s.y);
      }
    }
    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(base, 0, 0);
      shapes.forEach(drawShape);
      if (drawing) drawShape(drawing);
    }
    const pt = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) * canvas.width / r.width, y: (e.clientY - r.top) * canvas.height / r.height };
    };
    canvas.addEventListener('pointerdown', e => {
      canvas.setPointerCapture(e.pointerId);
      const p = pt(e);
      if (tool === 'text') {
        const txt = prompt('Label text:'); if (txt) { shapes.push({ t: 'text', x: p.x, y: p.y, text: txt, color }); redraw(); }
        return;
      }
      if (tool === 'pen') drawing = { t: 'pen', pts: [p], color };
      else if (tool === 'box') drawing = { t: 'box', x: p.x, y: p.y, w: 0, h: 0, color };
      else drawing = { t: 'arrow', x1: p.x, y1: p.y, x2: p.x, y2: p.y, color };
    });
    canvas.addEventListener('pointermove', e => {
      if (!drawing) return; const p = pt(e);
      if (drawing.t === 'pen') drawing.pts.push(p);
      else if (drawing.t === 'box') { drawing.w = p.x - drawing.x; drawing.h = p.y - drawing.y; }
      else { drawing.x2 = p.x; drawing.y2 = p.y; }
      redraw();
    });
    const endDraw = () => { if (drawing) { shapes.push(drawing); drawing = null; redraw(); } };
    canvas.addEventListener('pointerup', endDraw);
    canvas.addEventListener('pointercancel', endDraw);

    modal.querySelector('.ed-modal-head').addEventListener('click', e => {
      const tb = e.target.closest('[data-tool]'); const sw = e.target.closest('[data-color]');
      if (tb) { tool = tb.dataset.tool; $$('.ed-tool[data-tool]', modal).forEach(x => x.classList.toggle('active', x === tb)); }
      if (sw) { color = sw.dataset.color; $$('.ed-swatch', modal).forEach(x => x.classList.toggle('active', x === sw)); }
      if (e.target.closest('[data-undo]')) { shapes.pop(); redraw(); }
      if (e.target.closest('[data-clear]')) { shapes = []; redraw(); }
    });
    modal.querySelector('[data-cancel]').addEventListener('click', closeModal);
    modal.querySelector('[data-apply]').addEventListener('click', async () => {
      try {
        const blob = await new Promise(res => canvas.toBlob(res, 'image/png'));
        const path = await uploadBlob(blob, 'annotated');
        img.src = path; img.dataset.full = path;
        closeModal(); say('Annotation saved');
      } catch (e) { say('Could not save annotation', 'err'); }
    });
  }

  /* ---------- save: serialize bodies back to content + persist ---------- */
  async function doSave() {
    hidePopover();
    bodies().forEach(b => {
      const sec = b.closest('.doc-section'); const i = +sec.dataset.sec;
      const clone = b.cloneNode(true);
      clone.querySelectorAll('.ed-sel').forEach(x => x.classList.remove('ed-sel'));
      clone.querySelectorAll('[contenteditable]').forEach(x => x.removeAttribute('contenteditable'));
      if (data.sections[i]) data.sections[i].html = clone.innerHTML.trim();
    });
    try {
      await api('/api/save', { content: data });
      window.DOCS_CONTENT = data;
      say('Saved to docs-content.js', 'ok');
    } catch (e) { say('Save failed: ' + e.message, 'err'); }
  }

  /* keyboard: Ctrl/Cmd+S saves while editing */
  addEventListener('keydown', e => {
    if (editing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(); }
  });

  say('Editor ready — click Edit to start', 'ok');
};
