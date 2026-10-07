(function () {
  var links = [].slice.call(document.querySelectorAll('.lg-toc a')),
      secs  = links.map(function (a) { return document.querySelector(a.getAttribute('href')); });
  if (!links.length || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var i = secs.indexOf(e.target);
      links.forEach(function (a, n) { a.classList.toggle('on', n === i); });
    });
  }, { rootMargin: '-88px 0px -68% 0px' });
  secs.forEach(function (s) { if (s) io.observe(s); });
})();
