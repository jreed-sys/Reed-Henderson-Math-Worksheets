/* INDEX-GATE v1: sign in on the index page (roster name + 2-digit code), then show only that student's classes.
   Convenience filter, not security: lesson pages still do their own roster login. Fails open (shows everything)
   if the class lists cannot be loaded. Session lives in sessionStorage (cleared when the tab is closed). */
(function(){
  var SHEETS=[
    {key:'Algebra2',label:'Algebra II',url:'https://script.google.com/macros/s/AKfycbywXRwMOliX7qFl6dV_GPmglmzcc83yCvKoaHu1q12mZTAAiBsjksq3MErDr2Ims9Zl/exec'},
    {key:'Geometry',label:'Geometry',url:'https://script.google.com/macros/s/AKfycbxWfFXI8hcHiKWwXEUpurwGgfoddlsyPlWU0fWMe7hMLrK7veufBP-z6wIDfHv6atIAvQ/exec'}
  ];
  var SKEY='rhmw-session', MAXAGE=10*3600*1000;
  var wrap=document.querySelector('.classes');
  if(!wrap||window.__indexGate) return; window.__indexGate=true;
  var cards=[].slice.call(wrap.querySelectorAll('a.class-card'));
  function subjOf(a){ var h=a.getAttribute('href')||''; if(/^Algebra2/i.test(h)) return 'Algebra2'; if(/^Geometry/i.test(h)) return 'Geometry'; return 'Other'; }
  function showCards(subjects){            // subjects === null -> everything
    cards.forEach(function(a){ var s=subjOf(a); a.style.display=(subjects===null||s==='Other'||subjects.indexOf(s)>=0)?'':'none'; });
    wrap.style.display='';
  }
  function failOpen(){ try{ showCards(null); }catch(e){ wrap.style.display=''; } }
  wrap.style.display='none';                // hidden until we know who this is
  try{
  var mem=null;
  function readSession(){
    var s=null; try{ s=JSON.parse(sessionStorage.getItem(SKEY)||'null'); }catch(e){ s=mem; }
    if(!s&&mem) s=mem;
    if(s&&s.t&&Date.now()-s.t>MAXAGE) s=null;
    return s;
  }
  function writeSession(s){ s.t=Date.now(); mem=s; try{ sessionStorage.setItem(SKEY,JSON.stringify(s)); }catch(e){} }
  function clearSession(){ mem=null; try{ sessionStorage.removeItem(SKEY); }catch(e){} }

  var st=document.createElement('style');
  st.textContent='#ixGate .row{margin:0 0 12px}#ixGate label{display:block;font-size:13px;font-weight:600;color:var(--teal-900);margin-bottom:6px}'+
   '#ixGate input,#ixGate select{width:100%;padding:11px 14px;border:1.5px solid var(--line);border-radius:10px;font-size:15px;font-family:inherit;background:#fff;box-sizing:border-box}'+
   '#ixGate input.code{width:110px;letter-spacing:.3em;text-align:center;-webkit-text-security:disc}'+
   '#ixGate button{font-weight:600;font-size:15px;font-family:inherit;border:0;background:var(--teal-700);color:#fff;border-radius:10px;padding:12px 22px;cursor:pointer}'+
   '#ixGate button:disabled{opacity:.6;cursor:default}#ixGate button.link{background:none;color:var(--teal-700);padding:0;font-size:13.5px;text-decoration:underline}'+
   '#ixGate .msg{font-size:13.5px;min-height:20px;color:var(--ink-soft);margin:6px 0 0}#ixGate .msg.bad{color:#c0392b}'+
   '#ixGate .note{font-size:13px;color:#7a4b00;background:#fff4d6;border-radius:8px;padding:8px 10px;margin:0 0 12px}'+
   '#ixGate .who{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;justify-content:space-between;font-size:14.5px}';
  document.head.appendChild(st);
  var gate=document.createElement('div'); gate.id='ixGate'; gate.className='subject'; gate.style.margin='26px 0 0';
  wrap.parentNode.insertBefore(gate,wrap);

  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;'); }
  function label(keys){ return keys.map(function(k){ return SHEETS.filter(function(s){return s.key===k;})[0].label; }).join(' + '); }
  function signedIn(s,note){
    if(s.practice){ showCards(null); gate.innerHTML='<div class="who"><span><b>Practice mode</b>: showing every class. Nothing is saved or sent.</span><button type="button" class="link" id="ixOut">Sign in as a student</button></div>'; }
    else { showCards(s.subjects); gate.innerHTML=(note?'<div class="note">'+note+'</div>':'')+'<div class="who"><span>Signed in as <b>'+esc(s.name)+'</b> · '+esc(label(s.subjects))+'</span><button type="button" class="link" id="ixOut">Not you? Switch student</button></div>'; }
    gate.querySelector('#ixOut').addEventListener('click',function(){ clearSession(); wrap.style.display='none'; loginUI(); });
  }
  function lastKey(n){
    var t=n.toLowerCase().replace(/[\u2019']/g,'').split(/\s+/), i=-1, k;
    for(k=1;k<t.length;k++){ if(t[k].replace('.','').length===1){ i=k; break; } }
    var last=(i>0?t.slice(i+1):t.slice(1)).filter(function(x){ return x!=='jr'; });
    return last.join(' ')+' '+t[0];
  }
  var cache=null;
  function loadRosters(){
    if(cache) return cache;
    function get(sh){
      var c=('AbortController' in window)?new AbortController():null; if(c) setTimeout(function(){ c.abort(); },9000);
      return fetch(sh.url+'?action=roster',{signal:c?c.signal:undefined}).then(function(r){ return r.json(); })
        .then(function(d){ return {key:sh.key,names:(d&&d.names)||[],ok:!!(d&&d.names&&d.names.length)}; })
        .catch(function(){ return {key:sh.key,names:[],ok:false}; });
    }
    cache=Promise.all(SHEETS.map(get)); return cache;
  }
  function verifyOne(sh,name,code){
    var c=('AbortController' in window)?new AbortController():null; if(c) setTimeout(function(){ c.abort(); },9000);
    return fetch(sh.url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'verify',name:name,code:code}),signal:c?c.signal:undefined})
      .then(function(r){ return r.json(); }).then(function(d){ return (d&&d.status==='success'&&d.result)||'error'; }).catch(function(){ return 'error'; });
  }
  function loginUI(){
    gate.innerHTML='<h2 style="margin:0 0 4px;font-size:20px;color:var(--teal-900)">Who are you?</h2><p class="sub">Sign in to see your classes.</p><div class="msg" id="ixMsg">Loading the class list…</div>';
    loadRosters().then(function(rs){
      var by={}, any=false, failed=false;
      rs.forEach(function(r){ if(!r.ok){ failed=true; return; } any=true; r.names.forEach(function(n){ (by[n]=by[n]||[]).push(r.key); }); });
      if(!any){ gate.innerHTML='<div class="note" style="margin:0">The class list could not load on this network, so all classes are shown.</div>'; showCards(null); return; }
      var names=Object.keys(by).sort(function(a,b){ var x=lastKey(a),y=lastKey(b); return x<y?-1:x>y?1:0; });
      gate.innerHTML=(failed?'<div class="note">Part of the class list could not load. If your class is missing, choose Practice to see everything.</div>':'')+
        '<h2 style="margin:0 0 4px;font-size:20px;color:var(--teal-900)">Who are you?</h2><p class="sub">Sign in to see your classes.</p>'+
        '<div class="row"><label for="ixFind">Find your name</label><input id="ixFind" type="text" autocomplete="off" placeholder="Type part of your name…"></div>'+
        '<div class="row"><select id="ixName" aria-label="Your name"></select></div>'+
        '<div class="row" id="ixCodeRow" style="display:none"><label for="ixCode">Your 2-digit code</label><input id="ixCode" class="code" type="text" inputmode="numeric" maxlength="2" autocomplete="off" placeholder="00"></div>'+
        '<button type="button" id="ixGo">Continue</button><div class="msg" id="ixMsg" aria-live="polite"></div>';
      var find=gate.querySelector('#ixFind'), sel=gate.querySelector('#ixName'), code=gate.querySelector('#ixCode'), codeRow=gate.querySelector('#ixCodeRow'), go=gate.querySelector('#ixGo'), msg=gate.querySelector('#ixMsg'), busy=false;
      function say(t,bad){ msg.textContent=t||''; msg.className='msg'+(bad?' bad':''); }
      function fill(q){
        q=(q||'').toLowerCase().replace(/[^a-z0-9 ]/g,'').trim(); var keep=sel.value;
        var m=names.filter(function(n){ return !q||n.toLowerCase().replace(/[^a-z0-9 ]/g,'').indexOf(q)>=0; });
        var h='<option value="">'+(m.length?'— choose your name —':'No match: check the spelling')+'</option>';
        m.forEach(function(n){ h+='<option value="'+esc(n)+'">'+esc(n)+'</option>'; });
        h+='<option value="__practice__">Practice (just looking around)</option>'; sel.innerHTML=h;
        if(m.length===1&&q) sel.value=m[0]; else if(keep&&m.indexOf(keep)>=0) sel.value=keep;
        upd();
      }
      function upd(){ var real=sel.value&&sel.value!=='__practice__'; codeRow.style.display=real?'':'none'; say(''); }
      find.addEventListener('input',function(){ fill(find.value); });
      sel.addEventListener('change',function(){ upd(); if(sel.value&&sel.value!=='__practice__') code.focus(); });
      code.addEventListener('input',function(){ code.value=code.value.replace(/\D/g,'').slice(0,2); say(''); });
      [find,code].forEach(function(el){ el.addEventListener('keydown',function(e){ if(e.key==='Enter') go.click(); }); });
      go.addEventListener('click',function(){
        if(busy) return;
        if(sel.value==='__practice__'){ var p={practice:true,subjects:[]}; writeSession(p); signedIn(p); return; }
        if(!sel.value){ say('Choose your name from the list.',true); return; }
        var c=code.value.replace(/\D/g,''); if(c.length!==2){ say('Type your 2-digit code.',true); return; }
        busy=true; go.disabled=true; say('Checking your code…');
        var keys=by[sel.value], shs=keys.map(function(k){ return SHEETS.filter(function(s){return s.key===k;})[0]; });
        Promise.all(shs.map(function(sh){ return verifyOne(sh,sel.value,c); })).then(function(res){
          busy=false; go.disabled=false;
          var ok=keys.filter(function(k,i){ return res[i]==='ok'; });
          if(ok.length){ var s={name:sel.value,code:c,subjects:ok}; writeSession(s); signedIn(s); return; }
          if(res.indexOf('locked')>=0){ say('Too many wrong tries. Wait ten minutes or ask your teacher.',true); return; }
          if(res.indexOf('bad')>=0){ say('That code does not match that name. Check the code and try again.',true); code.select(); return; }
          var s2={name:sel.value,code:c,subjects:keys,unverified:true}; writeSession(s2);
          signedIn(s2,'Your code could not be checked right now, so it will be checked when you open a lesson.');
        });
      });
      fill(''); find.focus();
    });
  }

  var s0=readSession();
  if(s0&&(s0.practice||(s0.subjects&&s0.subjects.length&&s0.name))) signedIn(s0); else loginUI();
  }catch(err){ failOpen(); }
})();
