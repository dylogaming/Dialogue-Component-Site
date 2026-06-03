/* ============================================================
   Dialogue Component — showcase interactions
   All animation runs on transform/opacity for high FPS.
   ============================================================ */
(() => {
  'use strict';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- cursor glow (rAF-smoothed) ---------- */
  const glow = $('#cursorGlow');
  if (glow && !reduce && !matchMedia('(pointer:coarse)').matches) {
    // track the pointer 1:1 with no smoothing so there is zero lag/drag
    addEventListener('pointermove', e => {
      glow.style.transform = `translate(${e.clientX}px,${e.clientY}px) translate(-50%,-50%)`;
    }, { passive: true });
    const hot = 'a,button,.card,[data-tilt],.dia-choice,.ps-choice';
    addEventListener('pointerover', e => glow.classList.toggle('big', !!e.target.closest(hot)), { passive: true });
  }

  /* ---------- scroll progress + nav ---------- */
  const bar = $('#scrollProgress'), nav = $('#nav');
  const onScroll = () => {
    const h = document.documentElement;
    const p = h.scrollTop / (h.scrollHeight - h.clientHeight || 1);
    if (bar) bar.style.width = (p * 100) + '%';
    if (nav) nav.classList.toggle('scrolled', h.scrollTop > 30);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- reveal on view ---------- */
  const io = new IntersectionObserver((ents) => {
    ents.forEach(en => { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
  }, { threshold: 0.14, rootMargin: '0px 0px -8% 0px' });
  $$('[data-reveal]').forEach(el => io.observe(el));

  /* ---------- count-up stats ---------- */
  const counters = $$('[data-count]');
  const cio = new IntersectionObserver((ents) => {
    ents.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, end = +el.dataset.count; cio.unobserve(el);
      if (reduce) { el.textContent = end; return; }
      const dur = 1200, t0 = performance.now();
      const step = (t) => {
        const k = Math.min((t - t0) / dur, 1);
        el.textContent = Math.round((1 - Math.pow(1 - k, 3)) * end);
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  counters.forEach(c => cio.observe(c));

  /* ---------- magnetic buttons ---------- */
  if (!reduce) $$('.magnetic').forEach(b => {
    b.addEventListener('pointermove', e => {
      const r = b.getBoundingClientRect();
      b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * 0.25}px,${(e.clientY - r.top - r.height / 2) * 0.35}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  /* ---------- 3D tilt on cards ---------- */
  if (!reduce) $$('[data-tilt]').forEach(c => {
    c.addEventListener('pointermove', e => {
      const r = c.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      c.style.transform = `perspective(800px) rotateY(${px * 7}deg) rotateX(${-py * 7}deg) translateY(-4px)`;
    });
    c.addEventListener('pointerleave', () => { c.style.transform = ''; });
  });

  /* ---------- duplicate marquee for seamless loop ---------- */
  const mq = $('#marquee');
  if (mq) mq.innerHTML += mq.innerHTML;

  /* ---------- node-graph edges ---------- */
  const graph = $('#nodeGraph'), edges = $('#edges');
  if (graph && edges) {
    const drawEdges = () => {
      const gb = graph.getBoundingClientRect();
      const c = n => {
        const r = $(`[data-node="${n}"]`, graph).getBoundingClientRect();
        return { x: r.left - gb.left + r.width / 2, y: r.top - gb.top + r.height / 2 };
      };
      const pairs = [['start', 'npc'], ['npc', 'a'], ['npc', 'b'], ['a', 'end'], ['b', 'end']];
      const curve = (p, q) => {
        const my = (p.y + q.y) / 2;
        return `M${p.x},${p.y} C${p.x},${my} ${q.x},${my} ${q.x},${q.y}`;
      };
      edges.innerHTML =
        `<defs><linearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0" stop-color="#7c5cff"/><stop offset="1" stop-color="#22d3ee"/>
         </linearGradient></defs>` +
        pairs.map(([a, b]) => `<path d="${curve(c(a), c(b))}"/>`).join('');
    };
    drawEdges();
    addEventListener('resize', drawEdges, { passive: true });
    setTimeout(drawEdges, 400); // after fonts/layout settle
  }

  /* ================= hero typing dialogue ================= */
  const diaText = $('#diaText'), diaChoices = $('#diaChoices'), diaName = $('.dia-name');
  if (diaText) {
    const script = [
      { who: 'Wraith',   text: "You found me at last, traveler. Few make it this deep.",
        choices: [{ label: "Who are you?", next: 1 }, { label: "I want answers.", next: 2 }] },
      { who: 'Wraith',   text: "A keeper of the old paths. I remember every choice ever made here.",
        choices: [{ label: "Then guide me.", next: 2 }] },
      { who: 'Wraith',   text: "Answers have a price. Bring me proof, and the road opens.",
        choices: [{ label: "(Restart the scene)", next: 0 }] },
    ];
    let i = 0, raf = 0;
    const type = (str, done) => {
      cancelAnimationFrame(raf);
      diaText.innerHTML = '';
      if (reduce) { diaText.textContent = str; done(); return; }
      let n = 0, last = 0;
      const caret = document.createElement('span'); caret.className = 'caret'; caret.innerHTML = '&nbsp;';
      const run = (t) => {
        if (t - last > 26) { last = t; n++; diaText.textContent = str.slice(0, n); diaText.appendChild(caret); }
        if (n < str.length) raf = requestAnimationFrame(run); else { caret.remove(); done(); }
      };
      raf = requestAnimationFrame(run);
    };
    const render = () => {
      const node = script[i];
      diaName.textContent = node.who;
      diaChoices.innerHTML = '';
      type(node.text, () => {
        node.choices.forEach((ch, k) => {
          const b = document.createElement('button');
          b.className = 'dia-choice'; b.innerHTML = `<b>›</b> ${ch.label}`;
          b.addEventListener('click', () => { i = ch.next; render(); });
          diaChoices.appendChild(b);
          setTimeout(() => b.classList.add('show'), 80 + k * 90);
        });
      });
    };
    render();
  }

  /* ================= interactive branching player ================= */
  const psText = $('#psText'), psChoices = $('#psChoices'), psName = $('#psName');
  if (psText) {
    const goldEl = $('#statGold'), evEl = $('#statEvidence');
    const state = { gold: 5, evidence: 0 };
    const flash = (el) => { el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 500); };
    const sync = () => {
      if (+goldEl.textContent !== state.gold) flash(goldEl);
      if (+evEl.textContent !== state.evidence) flash(evEl);
      goldEl.textContent = state.gold; evEl.textContent = state.evidence;
    };

    const nodes = {
      start: { who: 'Merchant', text: "Welcome, friend. Looking to trade, or just passing through?",
        choices: [
          { label: "Show me your wares.", next: 'shop' },
          { label: "I'm investigating a theft.", next: 'quest' },
        ] },
      shop: { who: 'Merchant', text: "A fine charm, yours for 3 gold. Conditions decide if you can afford it.",
        choices: [
          { label: "Buy the charm.", tag: "needs Gold ≥ 3", cond: s => s.gold >= 3,
            effect: s => s.gold -= 3, next: 'bought' },
          { label: "Never mind.", next: 'start' },
        ] },
      bought: { who: 'Merchant', text: "Pleasure doing business. The charm hums faintly in your palm.",
        choices: [{ label: "Back.", next: 'start' }] },
      quest: { who: 'Merchant', text: "A theft? Bring me a piece of evidence and I'll talk. No proof, no words.",
        choices: [
          { label: "Search the crates. (+1 Evidence)", effect: s => s.evidence += 1, next: 'quest' },
          { label: "Present the evidence.", tag: "needs Evidence ≥ 1", cond: s => s.evidence >= 1, next: 'solved' },
          { label: "Back off.", next: 'start' },
        ] },
      solved: { who: 'Merchant', text: "So it was the dockmaster all along. You've earned my trust, detective.",
        choices: [{ label: "Start over.", next: 'start', reset: true }] },
    };

    let key = 'start', raf2 = 0;
    const type2 = (str, done) => {
      cancelAnimationFrame(raf2);
      psText.innerHTML = '';
      if (reduce) { psText.textContent = str; done(); return; }
      let n = 0, last = 0;
      const caret = document.createElement('span'); caret.className = 'caret'; caret.innerHTML = '&nbsp;';
      const run = (t) => {
        if (t - last > 22) { last = t; n++; psText.textContent = str.slice(0, n); psText.appendChild(caret); }
        if (n < str.length) raf2 = requestAnimationFrame(run); else { caret.remove(); done(); }
      };
      raf2 = requestAnimationFrame(run);
    };
    const render = () => {
      const node = nodes[key];
      psName.textContent = node.who;
      psChoices.innerHTML = '';
      type2(node.text, () => {
        node.choices.forEach(ch => {
          const ok = !ch.cond || ch.cond(state);
          const b = document.createElement('button');
          b.className = 'ps-choice' + (ok ? '' : ' locked');
          b.innerHTML = `${ch.label}${ch.tag ? `<span class="tag">${ch.tag}</span>` : ''}`;
          if (ok) b.addEventListener('click', () => {
            if (ch.reset) { state.gold = 5; state.evidence = 0; }
            if (ch.effect) ch.effect(state);
            sync(); key = ch.next; render();
          });
          psChoices.appendChild(b);
        });
      });
    };
    $('#resetFlow')?.addEventListener('click', () => {
      state.gold = 5; state.evidence = 0; sync(); key = 'start'; render();
    });
    sync(); render();
  }

  console.log('%cDialogue Component', 'color:#7c5cff;font-weight:700;font-size:14px', 'by DYLO Gaming');
})();
