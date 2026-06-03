/* docs page: scrollspy nav, image lightbox, mobile sidebar */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---- scrollspy: highlight active section/subsection in sidebar ---- */
  const links = $$('.docs-nav a');
  const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  // every scroll target, in document order: sections AND their h3 subsections
  const targets = $$('.doc-section, .doc-section h3[id]').filter(el => el.id && map.has(el.id));
  const side = $('#docsSide'), toggle = $('#sideToggle');

  const keepInView = (a) => {
    const cont = a.closest('.docs-side'); if (!cont) return;
    const ar = a.getBoundingClientRect(), cr = cont.getBoundingClientRect();
    if (ar.top < cr.top) cont.scrollTop -= (cr.top - ar.top) + 10;
    else if (ar.bottom > cr.bottom) cont.scrollTop += (ar.bottom - cr.bottom) + 10;
  };

  let activeId = null;
  const setActive = (id) => {
    if (!id || id === activeId || !map.has(id)) return;
    activeId = id;
    links.forEach(a => a.classList.remove('active'));
    $$('.nav-cat').forEach(li => li.classList.remove('open'));
    const a = map.get(id);
    a.classList.add('active');
    // open the parent category so its subsections show
    const cat = a.closest('.nav-cat');
    if (cat) cat.classList.add('open');
    keepInView(a);
  };

  const computeActive = () => {
    // a target becomes current once its top rises above ~1/3 of the viewport
    const line = innerHeight * 0.3;
    let id = targets[0] && targets[0].id;
    for (const t of targets) {
      if (t.getBoundingClientRect().top - line <= 0) id = t.id; else break;
    }
    // snap to the final target when scrolled to the very bottom
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) id = targets[targets.length - 1].id;
    setActive(id);
  };

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { computeActive(); ticking = false; });
  }, { passive: true });
  addEventListener('resize', computeActive, { passive: true });
  computeActive();

  /* instant feedback on click; close mobile sidebar */
  links.forEach(a => a.addEventListener('click', () => {
    setActive(a.getAttribute('href').slice(1));
    if (innerWidth <= 900) { side.classList.remove('open'); toggle?.classList.remove('open'); }
  }));
  toggle?.addEventListener('click', () => {
    side.classList.toggle('open'); toggle.classList.toggle('open');
  });

  /* ---- lightbox ---- */
  const lb = $('#lightbox'), lbImg = $('#lightboxImg');
  const open = (src, alt) => { lbImg.src = src; lbImg.alt = alt || ''; lb.classList.add('open'); document.body.style.overflow = 'hidden'; };
  const close = () => { lb.classList.remove('open'); document.body.style.overflow = ''; setTimeout(() => { lbImg.src = ''; }, 300); };
  document.addEventListener('click', e => {
    const img = e.target.closest('.doc-img');
    if (img) { open(img.dataset.full || img.src, img.alt); return; }
    if (e.target === lb || e.target.closest('.lightbox-close')) close();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && lb.classList.contains('open')) close(); });
})();
