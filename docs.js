/* docs page: scrollspy nav, image lightbox, mobile sidebar */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---- scrollspy: highlight active section in sidebar ---- */
  const links = $$('.docs-nav a');
  const map = new Map(links.map(a => [a.getAttribute('href').slice(1), a]));
  const sections = $$('.doc-section');
  let current = null;
  const spy = new IntersectionObserver((ents) => {
    ents.forEach(en => { if (en.isIntersecting) current = en.target.id; });
    // pick the topmost intersecting section
    const visible = sections.filter(s => {
      const r = s.getBoundingClientRect();
      return r.top < window.innerHeight * 0.5 && r.bottom > 0;
    });
    const id = (visible[0] || {}).id || current;
    if (id && map.has(id)) {
      links.forEach(a => a.classList.remove('active'));
      map.get(id).classList.add('active');
    }
  }, { rootMargin: '-10% 0px -60% 0px', threshold: [0, 0.2, 1] });
  sections.forEach(s => spy.observe(s));

  /* close mobile sidebar after clicking a link */
  const side = $('#docsSide'), toggle = $('#sideToggle');
  links.forEach(a => a.addEventListener('click', () => {
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
