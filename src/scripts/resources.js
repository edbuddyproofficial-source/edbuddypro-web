/* edBuddy Pro — resources.js
   1. Copy buttons: <button data-copy> copies the <pre> in the same block.
   2. Prompt library: role filter chips + search (only on /resources/prompt-library). */
(function () {
  'use strict';

  /* ── 1. copy ── */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
    return Promise.resolve();
  }
  document.addEventListener('click', function (e) {
    var btn = e.target.closest('[data-copy]');
    if (!btn) return;
    var box = btn.closest('.rs-prompt, .pl-item');
    var pre = box && box.querySelector('pre');
    if (!pre) return;
    copyText(pre.textContent.trim()).then(function () {
      var label = btn.textContent;
      btn.classList.add('done'); btn.textContent = 'Copied';
      if (window.EBP && EBP.toast) EBP.toast('Prompt copied. Replace the [brackets] with your details.');
      setTimeout(function () { btn.classList.remove('done'); btn.textContent = label; }, 1800);
    });
  });

  /* ── 2. prompt library ── */
  var list = document.querySelector('.pl-list');
  if (!list) return;
  var items = [].slice.call(list.querySelectorAll('.pl-item'));
  var chips = [].slice.call(document.querySelectorAll('.pl-chip'));
  var search = document.querySelector('.pl-search');
  var count = document.querySelector('.pl-count');
  var empty = document.querySelector('.pl-empty');
  var role = 'all';

  function apply() {
    var q = (search.value || '').trim().toLowerCase();
    var shown = 0;
    items.forEach(function (it) {
      var okRole = role === 'all' || it.dataset.role === role;
      var okText = !q || it.textContent.toLowerCase().indexOf(q) !== -1;
      it.hidden = !(okRole && okText);
      if (!it.hidden) shown++;
    });
    count.textContent = shown + (shown === 1 ? ' prompt' : ' prompts');
    empty.hidden = shown !== 0;
  }
  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      role = c.dataset.role;
      chips.forEach(function (x) { x.setAttribute('aria-pressed', String(x === c)); });
      apply();
    });
  });
  search.addEventListener('input', apply);
  apply();
})();
