/* edBuddy Pro — search.js  (/search only)
   Searches /search-index.json, written by the build from every page:
   title, description, headings and body text. Ranked so a match in the
   title beats one in a heading, which beats one in the body. */
(function () {
  'use strict';
  var input = document.getElementById('sr-q');
  var list = document.getElementById('sr-results');
  var status = document.getElementById('sr-status');
  var index = [];

  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function words(q) { return q.toLowerCase().split(/\s+/).filter(function (w) { return w.length > 1; }); }

  function score(item, ws) {
    var t = item.t.toLowerCase(), d = item.d.toLowerCase(), h = item.h.toLowerCase(), x = item.x.toLowerCase();
    var total = 0;
    for (var i = 0; i < ws.length; i++) {
      var w = ws[i], s = 0;
      if (t.indexOf(w) !== -1) s += 10;
      if (h.indexOf(w) !== -1) s += 5;
      if (d.indexOf(w) !== -1) s += 4;
      if (x.indexOf(w) !== -1) s += 1;
      if (!s) return 0;               // every word must appear somewhere
      total += s;
    }
    return total;
  }

  function snippet(item, ws) {
    var x = item.x, lx = x.toLowerCase(), at = -1;
    for (var i = 0; i < ws.length && at < 0; i++) at = lx.indexOf(ws[i]);
    if (at < 0) return esc(item.d);
    var start = Math.max(0, at - 70), out = (start ? '…' : '') + x.slice(start, start + 200) + '…';
    out = esc(out);
    ws.forEach(function (w) {
      out = out.replace(new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig'), '<mark>$1</mark>');
    });
    return out;
  }

  function render() {
    var q = input.value.trim();
    var ws = words(q);
    if (history.replaceState) history.replaceState(null, '', q ? '/search?q=' + encodeURIComponent(q) : '/search');
    if (!ws.length) {
      list.innerHTML = '';
      status.textContent = 'Type to search courses, guides, prompts and articles.';
      return;
    }
    var hits = index.map(function (it) { return { it: it, s: score(it, ws) }; })
      .filter(function (r) { return r.s > 0; })
      .sort(function (a, b) { return b.s - a.s; }).slice(0, 20);
    status.textContent = hits.length ? hits.length + (hits.length === 1 ? ' result' : ' results') + ' for "' + q + '"'
      : 'No results for "' + q + '". Try a shorter word, or browse the resources below.';
    list.innerHTML = hits.map(function (r) {
      return '<li><a class="sr-hit" href="' + r.it.u + '"><span class="sr-sec">' + esc(r.it.s) + '</span>' +
        '<span class="sr-t">' + esc(r.it.t) + '</span><span class="sr-x">' + snippet(r.it, ws) + '</span></a></li>';
    }).join('');
  }

  var params = new URLSearchParams(location.search);
  input.value = params.get('q') || '';
  status.textContent = 'Loading…';
  fetch('/search-index.json').then(function (r) { return r.json(); }).then(function (data) {
    index = data; render();
  }).catch(function () { status.textContent = 'Search is unavailable right now. Browse the resources below.'; });

  var t;
  input.addEventListener('input', function () { clearTimeout(t); t = setTimeout(render, 120); });
  document.getElementById('sr-form').addEventListener('submit', function (e) { e.preventDefault(); render(); });
})();
