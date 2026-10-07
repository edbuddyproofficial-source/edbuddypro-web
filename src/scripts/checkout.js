(function(){
  var ms=[].slice.call(document.querySelectorAll('.m')),ps=[].slice.call(document.querySelectorAll('.mp'));
  function pick(k){ms.forEach(function(m){var o=m.dataset.k===k;m.classList.toggle('on',o);
    m.setAttribute('aria-checked',o?'true':'false');});
    ps.forEach(function(p){p.hidden=p.dataset.p!==k;});}
  ms.forEach(function(m,i){m.addEventListener('click',function(){pick(m.dataset.k);});
    m.addEventListener('keydown',function(e){
      if(e.key===' '||e.key==='Enter'){e.preventDefault();pick(m.dataset.k);return;}
      var n=e.key==='ArrowDown'?i+1:e.key==='ArrowUp'?i-1:null; if(n===null)return;
      e.preventDefault(); n=(n+ms.length)%ms.length; ms[n].focus(); pick(ms[n].dataset.k);});});
})();
