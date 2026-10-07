/* Outcomes tablist. Plain roving-selection tabs — no state beyond which
   index is showing, and the panels are in the DOM so they are indexable. */
(function () {
  var tabs = [].slice.call(document.querySelectorAll('.oc-t'));
  var panels = [].slice.call(document.querySelectorAll('.oc-p'));
  if (!tabs.length) return;
  function show(i) {
    tabs.forEach(function (t, n) { t.setAttribute('aria-selected', n === i ? 'true' : 'false'); });
    panels.forEach(function (p, n) { p.hidden = n !== i; });
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { show(i); });
    t.addEventListener('keydown', function (e) {
      var n = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? i + 1
            : e.key === 'ArrowUp'   || e.key === 'ArrowLeft'  ? i - 1 : null;
      if (n === null) return;
      e.preventDefault();
      n = (n + tabs.length) % tabs.length;
      tabs[n].focus(); show(n);
    });
  });
})();
