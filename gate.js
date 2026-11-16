/* INDEX-GATE v3 (remembers the last student's NAME on this computer; more patient: retries, saved copy of the class lists): sign in on the index page (roster name + 2-digit code), then show only that student's classes.
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
    gate.querySelector('#ixOut').addEventListener('click',function(){ try{ localStorage.removeItem('rhmw-lastname'); }catch(e){} clearSession(); wrap.style.display='none'; loginUI(); });
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
    var RC='rhmw-roster:', FRESH=20*60*1000, STALE=14*24*3600*1000;
    function saved(k){ try{ var o=JSON.parse(localStorage.getItem(RC+k)||'null'); if(o&&o.names&&o.names.length) return o; }catch(e){} return null; }
    function remember(k,names){ try{ localStorage.setItem(RC+k,JSON.stringify({t:Date.now(),names:names})); }catch(e){} }
    function pause(ms){ return new Promise(function(r){ setTimeout(r,ms); }); }
    function attempt(sh,ms){
      var c=('AbortController' in window)?new AbortController():null; if(c) setTimeout(function(){ c.abort(); },ms);
      return fetch(sh.url+'?action=roster',{signal:c?c.signal:undefined}).then(function(r){ return r.json(); })
        .then(function(d){ if(d&&d.names&&d.names.length) return d.names; throw new Error('empty'); });
    }
    // fresh saved copy -> no network at all; otherwise up to three tries with growing patience; last resort: an older saved copy
    function get(sh){
      var sv=saved(sh.key);
      if(sv&&Date.now()-sv.t<FRESH) return Promise.resolve({key:sh.key,names:sv.names,ok:true,from:'fresh'});
      return attempt(sh,12000)
        .catch(function(){ return pause(800).then(function(){ return attempt(sh,18000); }); })
        .catch(function(){ return pause(1500).then(function(){ return attempt(sh,25000); }); })
        .then(function(names){ remember(sh.key,names); return {key:sh.key,names:names,ok:true}; })
        .catch(function(){ if(sv&&Date.now()-sv.t<STALE) return {key:sh.key,names:sv.names,ok:true,from:'saved'}; return {key:sh.key,names:[],ok:false}; });
    }
    cache=Promise.all(SHEETS.map(get)); return cache;
  }
  function verifyOne(sh,name,code){
    function once(ms){
      var c=('AbortController' in window)?new AbortController():null; if(c) setTimeout(function(){ c.abort(); },ms);
      return fetch(sh.url,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'verify',name:name,code:code}),signal:c?c.signal:undefined})
        .then(function(r){ return r.json(); }).then(function(d){ return (d&&d.status==='success'&&d.result)||'error'; }).catch(function(){ return 'error'; });
    }
    return once(15000).then(function(r){ return r==='error'?new Promise(function(res){ setTimeout(res,1000); }).then(function(){ return once(20000); }):r; });
  }
  function loginUI(){
    gate.innerHTML='<h2 style="margin:0 0 4px;font-size:20px;color:var(--teal-900)">Who are you?</h2><p class="sub">Sign in to see your classes.</p><div class="msg" id="ixMsg">Loading the class list…</div>';
    var slow=setTimeout(function(){ var m=gate.querySelector('#ixMsg'); if(m&&/Loading/.test(m.textContent)) m.textContent='Still loading the class list. The school network or Google can be slow; this page keeps trying…'; },6000);
    loadRosters().then(function(rs){
      clearTimeout(slow);
      var by={}, any=false, failed=false;
      rs.forEach(function(r){ if(!r.ok){ failed=true; return; } any=true; r.names.forEach(function(n){ (by[n]=by[n]||[]).push(r.key); }); });
      if(!any){ gate.innerHTML='<div class="note" style="margin:0">The class lists could not load right now, so all classes are shown. <button type="button" class="link" id="ixRetry">Try again</button></div>'; showCards(null); var rt0=gate.querySelector('#ixRetry'); if(rt0) rt0.addEventListener('click',function(){ cache=null; wrap.style.display='none'; loginUI(); }); return; }
      var names=Object.keys(by).sort(function(a,b){ var x=lastKey(a),y=lastKey(b); return x<y?-1:x>y?1:0; });
      var failedL=rs.filter(function(r){ return !r.ok; }).map(function(r){ return label([r.key]); }), savedL=rs.filter(function(r){ return r.from==='saved'; }).map(function(r){ return label([r.key]); });
      gate.innerHTML=(failed?'<div class="note">The '+failedL.join(' and ')+' class list could not load. <button type="button" class="link" id="ixRetry">Try again</button> Choose Practice only to look around: nothing is saved in Practice.</div>':'')+
        (savedL.length?'<div class="note" style="background:#eef3f2;color:#0f4c4c">Showing a saved copy of the '+savedL.join(' and ')+' class list (it could not be reached just now).</div>':'')+
        '<h2 style="margin:0 0 4px;font-size:20px;color:var(--teal-900)">Who are you?</h2><p class="sub">Sign in to see your classes.</p>'+
        '<div id="ixLast" class="note" style="display:none;background:#eef3f2;color:#0f4c4c"></div>'+
        '<div class="row"><label for="ixFind">Find your name</label><input id="ixFind" type="text" autocomplete="off" placeholder="Type part of your name…"></div>'+
        '<div class="row"><select id="ixName" aria-label="Your name"></select></div>'+
        '<div class="row" id="ixCodeRow" style="display:none"><label for="ixCode">Your 2-digit code</label><input id="ixCode" class="code" type="text" inputmode="numeric" maxlength="2" autocomplete="off" placeholder="00"></div>'+
        '<button type="button" id="ixGo">Continue</button><div class="msg" id="ixMsg" aria-live="polite"></div>'+
        '<div style="margin-top:6px"><button type="button" class="link" id="ixRefresh">Don\'t see your name? Refresh the list</button></div>';
      var rf=gate.querySelector('#ixRefresh'); if(rf) rf.addEventListener('click',function(){ SHEETS.forEach(function(x){ try{ localStorage.removeItem('rhmw-roster:'+x.key); }catch(e){} }); cache=null; wrap.style.display='none'; loginUI(); });
      var rt=gate.querySelector('#ixRetry'); if(rt) rt.addEventListener('click',function(){ cache=null; wrap.style.display='none'; loginUI(); });
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
          if(ok.length){ var s={name:sel.value,code:c,subjects:ok}; writeSession(s); try{ localStorage.setItem('rhmw-lastname',sel.value); }catch(e){} signedIn(s); return; }
          if(res.indexOf('locked')>=0){ say('Too many wrong tries. Wait ten minutes or ask your teacher.',true); return; }
          if(res.indexOf('bad')>=0){ say('That code does not match that name. Check the code and try again.',true); code.select(); return; }
          var s2={name:sel.value,code:c,subjects:keys,unverified:true}; writeSession(s2); try{ localStorage.setItem('rhmw-lastname',sel.value); }catch(e){}
          signedIn(s2,'Your code could not be checked right now, so it will be checked when you open a lesson.');
        });
      });
      fill('');
      var last=''; try{ last=localStorage.getItem('rhmw-lastname')||''; }catch(e){}
      if(last&&names.indexOf(last)>=0){
        sel.value=last; upd();
        var lm=gate.querySelector('#ixLast'); lm.innerHTML='Signing in as <b>'+esc(last)+'</b> (remembered on this computer). <button type="button" class="link" id="ixNotMe">Not you?</button>'; lm.style.display='block';
        gate.querySelector('#ixNotMe').addEventListener('click',function(){ try{ localStorage.removeItem('rhmw-lastname'); }catch(e){} sel.value=''; upd(); lm.style.display='none'; find.focus(); });
        code.focus();
      } else find.focus();
    });
  }

  var s0=readSession();
  if(s0&&(s0.practice||(s0.subjects&&s0.subjects.length&&s0.name))) signedIn(s0); else loginUI();
  }catch(err){ failOpen(); }
})();
