// Mobile buy bar — reveal once the enrol card has scrolled away,
  // hide again over the final CTA so it never covers the same button.

(function(){
  var t=document.querySelector('.nav-toggle'), p=document.getElementById('navPanel');
  if(!t||!p) return;
  t.addEventListener('click',function(){
    var open=p.classList.toggle('open');
    t.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
  });
  p.querySelectorAll('a').forEach(function(a){ a.onclick=function(){
    p.classList.remove('open'); t.setAttribute('aria-expanded','false'); document.body.style.overflow=''; }; });
})();

(function(){
  var root=document.querySelector('[data-sl]'); if(!root) return;
  root.querySelectorAll('.sl-tab').forEach(function(t){
    t.addEventListener('click',function(){
      var i=t.dataset.i;
      root.querySelectorAll('.sl-tab').forEach(function(x){ x.classList.toggle('on', x===t); });
      root.querySelectorAll('.sl-pane').forEach(function(p){ p.classList.toggle('on', p.dataset.i===i); });
    });
  });
})();

/* Projects coverflow. One integer of state, no scroll container. */
(function () {
  var deck = document.querySelector('[data-pj]');
  if (!deck) return;
  var slots = [].slice.call(deck.querySelectorAll('.pj-slot'));
  var n = slots.length;
  if (n < 2) return;

  var cur = 0;

  /* shortest signed distance from i to cur, wrapped — this is what makes
     the deck endless without cloning anything */
  function delta(i) {
    var d = i - cur;
    if (d >  n / 2) d -= n;
    if (d < -n / 2) d += n;
    return d;
  }

  function render() {
    var narrow = window.innerWidth < 700,
        step    = narrow ? 150 : 250;

    for (var i = 0; i < n; i++) {
      var s = slots[i], d = delta(i), a = Math.abs(d);

      if (a > 2) {                       /* out of sight: park it */
        s.style.opacity = '0';
        s.style.transform = 'translateX(0) translateZ(-900px)';
        s.style.pointerEvents = 'none';
        s.style.zIndex = '0';
        continue;
      }
      s.style.transform =
        'translateX(' + (d * step).toFixed(1) + 'px)' +
        ' translateZ(' + (-a * 190).toFixed(1) + 'px)' +
        ' rotateY(' + (-d * (narrow ? 16 : 26)).toFixed(1) + 'deg)' +
        ' scale(' + (1 - a * 0.05).toFixed(3) + ')';
      s.style.opacity = a === 0 ? '1' : (a === 1 ? '0.55' : '0.22');
      s.style.pointerEvents = a === 0 ? 'auto' : 'none';
      s.style.zIndex = String(50 - a);
      s.setAttribute('aria-hidden', a === 0 ? 'false' : 'true');
    }
  }

  function go(dir) {
    cur = (cur + dir + n) % n;         /* wraps both ways, by construction */
    render();
  }

  /* touch */
  var tX = 0, tY = 0, tT = 0, live = false;
  deck.addEventListener('touchstart', function (e) {
    tX = e.touches[0].clientX; tY = e.touches[0].clientY;
    tT = Date.now(); live = true;
  }, { passive: true });
  deck.addEventListener('touchend', function (e) {
    if (!live) return;
    live = false;
    var dx = e.changedTouches[0].clientX - tX,
        dy = e.changedTouches[0].clientY - tY;
    if (Date.now() - tT > 800) return;
    if (Math.abs(dx) < 30 || Math.abs(dx) < Math.abs(dy)) return;  /* a scroll */
    go(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* arrows */
  var prev = deck.querySelector('.pj-prev'),
      next = deck.querySelector('.pj-next');
  if (prev) prev.addEventListener('click', function () { go(-1); });
  if (next) next.addEventListener('click', function () { go(1); });

  /* Two-finger trackpad swipe. A trackpad sends a burst of small wheel
     events, so they are accumulated and one card is moved per threshold;
     the burst is then ignored until it dies down, or a single gesture
     would fly through several cards. */
  var acc = 0, settle = null, locked = false;
  deck.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;   /* vertical: let the page scroll */
    e.preventDefault();

    /* While locked, keep pushing the unlock out for as long as the burst
       keeps arriving. Trackpad momentum can run well past a fixed timeout,
       and releasing mid-burst is what lets one flick travel several cards. */
    if (locked) {
      clearTimeout(settle);
      settle = setTimeout(function () { locked = false; acc = 0; }, 320);
      return;
    }

    acc += e.deltaX;
    if (Math.abs(acc) >= 40) {
      go(acc > 0 ? 1 : -1);
      acc = 0;
      locked = true;                                         /* one card per gesture */
      clearTimeout(settle);
      settle = setTimeout(function () { locked = false; }, 320);
    } else {
      clearTimeout(settle);
      settle = setTimeout(function () { acc = 0; }, 200);
    }
  }, { passive: false });

  /* keyboard */
  deck.setAttribute('tabindex', '0');
  deck.setAttribute('role', 'region');
  deck.setAttribute('aria-label', 'Projects');
  deck.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
  });

  window.addEventListener('resize', render, { passive: true });
  render();
})();

/* Curriculum dialog. The pile lives in here, so the page itself stays short. */
(function () {
  var trig = document.getElementById('cmTrig'),
      ov   = document.getElementById('cmOv'),
      bd   = document.getElementById('cmBody'),
      prog = document.getElementById('cmProg'),
      last = null;
  if (!trig || !ov) return;

  function progress() {
    var m = bd.scrollHeight - bd.clientHeight;
    prog.style.width = (m > 0 ? (bd.scrollTop / m * 100) : 0) + '%';
  }
  var slots = [].slice.call(bd.querySelectorAll('.cm-w'));

  /* idx is optional: the index rows pass the module they belong to, so the
     dialog opens already scrolled to that card. The pile is sticky, so each
     slot's offsetTop is the scroll position that brings it to the front. */
  function open(idx) {
    last = document.activeElement;
    ov.classList.add('is-open');
    document.body.classList.add('cm-locked');
    /* reset first: these slots are sticky, and a sticky element's offsetTop
       reads from wherever the pile currently sits, so measuring it while
       scrolled returns the previous position instead of the module's own */
    bd.scrollTop = 0;
    if (typeof idx === 'number' && idx > 0 && slots[idx]) bd.scrollTop = slots[idx].offsetTop;
    progress();
    setTimeout(function () { ov.querySelector('.cm-x').focus(); }, 60);
  }
  function close() {
    ov.classList.remove('is-open');
    document.body.classList.remove('cm-locked');
    if (last) last.focus();
  }
  /* the container is not clickable any more — its rows are */
  trig.querySelectorAll('.cm-ix-r').forEach(function (r) {
    r.addEventListener('click', function () { open(+r.dataset.m); });
  });
  document.querySelectorAll('[data-cm-open]').forEach(function (b) {
    b.addEventListener('click', function () { open(0); });
  });
  ov.querySelector('.cm-x').addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && ov.classList.contains('is-open')) close();
  });
  bd.addEventListener('scroll', progress, { passive: true });
})();
