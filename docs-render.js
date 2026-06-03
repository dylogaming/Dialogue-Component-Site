/* Render the docs page from window.DOCS_CONTENT, then init the UI behaviours.
   Kept as a global object (not fetched) so it works over file:// as well as http. */
(function () {
  const data = window.DOCS_CONTENT;
  if (!data) { console.error('docs-content.js not loaded'); return; }

  const navEl = document.querySelector('.docs-nav');
  const secEl = document.getElementById('docsSections');
  const tmp = document.createElement('div');

  let navHtml = '', secHtml = '';
  data.sections.forEach((s, i) => {
    tmp.innerHTML = s.html;
    const subs = [...tmp.querySelectorAll('h3[id]')].map(h => ({ id: h.id, title: h.textContent.trim() }));
    navHtml += `<li class="nav-cat"><a href="#${s.id}"><span class="ix">${s.icon || ''}</span>${s.title}</a>`;
    if (subs.length >= 2 && subs.length <= 14) navHtml += '<ul class="docs-subnav">' + subs.map(x => `<li><a href="#${x.id}">${x.title}</a></li>`).join('') + '</ul>';
    navHtml += '</li>';

    const prev = data.sections[i - 1];
    const pager = prev ? `<div class="doc-pager"><a class="prev" href="#${prev.id}"><span>Previous</span><b>${prev.title}</b></a></div>` : '';
    secHtml += `<section class="doc-section" id="${s.id}" data-sec="${i}">`
      + `<h2><span class="num">${s.num || ''}</span>${s.title}</h2>`
      + `<p class="lede">${s.lede || ''}</p>`
      + `<div class="doc-body">${s.html}</div>`
      + pager + '</section>';
  });

  navEl.innerHTML = navHtml;
  secEl.innerHTML = secHtml;

  // set hero text from the content model
  const ht = document.querySelector('.docs-hero h1');
  const hp = document.querySelector('.docs-hero p');
  if (ht) ht.textContent = data.title;
  if (hp) hp.textContent = data.intro;

  if (window.initDocsUI) window.initDocsUI();
  if (window.initDocsEditor) window.initDocsEditor(data);
})();
