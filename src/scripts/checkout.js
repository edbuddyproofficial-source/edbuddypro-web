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

/* Pay. Until the payment gateway is connected (README → "Connecting
   payments"), a pay click sends the enrolment request through
   EBP.submitLead so the seat can be confirmed by email. */
(function () {
  'use strict';
  var v = function (id) { var n = document.getElementById(id); return n ? n.value.trim() : ''; };
  document.querySelectorAll('[data-pay]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var email = document.getElementById('sem'), name = document.getElementById('sfn');
      if (email && !email.checkValidity()) { email.reportValidity(); email.focus(); return; }
      if (name && !name.checkValidity()) { name.reportValidity(); name.focus(); return; }
      var method = document.querySelector('.m.on .m-t');
      EBP.submitLead('enrol', {
        course: 'AI for HR Professionals', amount: '\u20b94,999 (GST included)',
        name: v('sfn'), email: v('sem'), mobile: v('sph'),
        'payment method': method ? method.firstChild.textContent.trim() : ''
      });
    });
  });
})();
