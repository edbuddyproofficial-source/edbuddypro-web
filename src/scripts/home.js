(function () {
    var root = document.getElementById('heroCarousel');
    if (!root) return;
    var slides = [].slice.call(root.querySelectorAll('.sp-slide'));
    var dots   = [].slice.call(root.querySelectorAll('#carDots button'));
    var prevBtn = document.getElementById('carPrev');
    var nextBtn = document.getElementById('carNext');
    var n = slides.length, cur = 0, timer = null;
    var rm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var DELAY = 3000;

    function show(i) {
      i = (i + n) % n;
      slides[cur].classList.remove('on');
      dots[cur].classList.remove('on'); dots[cur].setAttribute('aria-selected', 'false');
      cur = i;
      slides[cur].classList.add('on');
      dots[cur].classList.add('on'); dots[cur].setAttribute('aria-selected', 'true');
    }
    function next() { show(cur + 1); }
    function prev() { show(cur - 1); }
    function start() { if (rm) return; stop(); timer = setInterval(next, DELAY); }
    function stop() { if (timer) { clearInterval(timer); timer = null; } }
    function jump(i) { show(i); start(); }

    nextBtn.addEventListener('click', function () { next(); start(); });
    prevBtn.addEventListener('click', function () { prev(); start(); });
    dots.forEach(function (d, i) { d.addEventListener('click', function () { jump(i); }); });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    root.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { next(); start(); }
      else if (e.key === 'ArrowLeft') { prev(); start(); }
    });

    /* touch swipe */
    var x0 = null;
    root.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; stop(); }, { passive: true });
    root.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) { dx < 0 ? next() : prev(); }
      x0 = null; start();
    }, { passive: true });

    /* pause when tab hidden */
    document.addEventListener('visibilitychange', function () { document.hidden ? stop() : start(); });

    start();
  })();

(function () {
  var sec = document.querySelector('.values');
  if (!sec || !('IntersectionObserver' in window)) { if (sec) sec.classList.add('is-seen'); return; }
  new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-seen'); } });
  }, { threshold: 0.3 }).observe(sec);
})();

/* Pause off-screen animation. Keeping a dozen keyframe animations running on
   sections nobody can see is pure wasted compositing. */
(function () {
  var targets = document.querySelectorAll('.sp-hero');
  if (!targets.length || !('IntersectionObserver' in window)) {
    targets.forEach(function (t) { t.classList.add('in-view'); });
    return;
  }
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { e.target.classList.toggle('in-view', e.isIntersecting); });
  }, { rootMargin: '120px' });
  targets.forEach(function (t) { io.observe(t); });
})();

/* course filter — a card can sit in more than one category */
(function () {
  var sec = document.getElementById('courses');
  if (!sec) return;
  var btns = [].slice.call(sec.querySelectorAll('.rc-cat')),
      cards = [].slice.call(sec.querySelectorAll('.rc'));
  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      var want = b.dataset.cat;
      btns.forEach(function (x) {
        var on = x === b;
        x.classList.toggle('on', on);
        x.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
      cards.forEach(function (c) {
        var has = (' ' + (c.dataset.cat || '') + ' ').indexOf(' ' + want + ' ') > -1;
        c.hidden = !(want === 'all' || has);
      });
    });
  });
})();

/* roles — the rail swaps the panel */
(function () {
  var sec = document.getElementById('roles');
  if (!sec) return;
  var btns = [].slice.call(sec.querySelectorAll('.rl-item')),
      panes = [].slice.call(sec.querySelectorAll('.rp'));
  function show(k) {
    btns.forEach(function (b) {
      var on = b.dataset.i === k;
      b.classList.toggle('on', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    panes.forEach(function (p) { p.hidden = p.dataset.i !== k; });
  }
  btns.forEach(function (b) {
    b.addEventListener('click', function () { show(b.dataset.i); });
    b.addEventListener('keydown', function (e) {
      var n = btns.indexOf(b), t = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') t = btns[(n + 1) % btns.length];
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') t = btns[(n - 1 + btns.length) % btns.length];
      if (!t) return;
      e.preventDefault(); t.focus(); show(t.dataset.i);
    });
  });
})();

/* Trending Certifications coverflow. One integer of state, no scroll container.
   Same contract as the projects deck on the course pages: nothing reads layout
   back, so there is no feedback path between the gesture and the paint, and a
   flick can only ever move one card. */
(function () {
  var deck = document.querySelector('[data-cx]');
  if (!deck) return;
  var slots = [].slice.call(deck.querySelectorAll('.cx-slot'));
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

  /* these cards carry links, so keep off-centre ones out of the tab order */
  function setFocusable(slot, on) {
    var f = slot.querySelectorAll('a, button');
    for (var i = 0; i < f.length; i++) {
      if (on) f[i].removeAttribute('tabindex');
      else f[i].setAttribute('tabindex', '-1');
    }
  }

  function render() {
    var narrow = window.innerWidth < 700,
        step    = narrow ? 160 : 265;

    for (var i = 0; i < n; i++) {
      var s = slots[i], d = delta(i), a = Math.abs(d);

      if (a > 2) {                       /* out of sight: park it */
        s.style.opacity = '0';
        s.style.transform = 'translateX(0) translateZ(-900px)';
        s.style.pointerEvents = 'none';
        s.style.zIndex = '0';
        s.setAttribute('aria-hidden', 'true');
        setFocusable(s, false);
        continue;
      }
      s.style.transform =
        'translateX(' + (d * step).toFixed(1) + 'px)' +
        ' translateZ(' + (-a * 200).toFixed(1) + 'px)' +
        ' rotateY(' + (-d * (narrow ? 16 : 24)).toFixed(1) + 'deg)' +
        ' scale(' + (1 - a * 0.05).toFixed(3) + ')';
      s.style.opacity = a === 0 ? '1' : (a === 1 ? '0.55' : '0.22');
      s.style.pointerEvents = a === 0 ? 'auto' : 'none';
      s.style.zIndex = String(50 - a);
      s.setAttribute('aria-hidden', a === 0 ? 'false' : 'true');
      setFocusable(s, a === 0);
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
  var prev = deck.querySelector('.cx-prev'),
      next = deck.querySelector('.cx-next');
  if (prev) prev.addEventListener('click', function () { go(-1); });
  if (next) next.addEventListener('click', function () { go(1); });

  /* Two-finger trackpad swipe. A trackpad sends a burst of small wheel
     events, so they are accumulated and one card is moved per threshold.
     While locked, the unlock keeps being pushed out for as long as the
     burst continues — momentum can outrun a fixed timeout, and releasing
     mid-burst is exactly what lets one flick travel several cards. */
  var acc = 0, settle = null, locked = false;
  deck.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;   /* vertical: let the page scroll */
    e.preventDefault();

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
  deck.setAttribute('aria-label', 'Trending certifications');
  deck.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); go(-1); }
  });

  window.addEventListener('resize', render, { passive: true });
  render();
})();
