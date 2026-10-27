/* ROSTER-LOGIN v1: name pulldown + 2-digit code + practice mode. Inserted just before </body>. */
(function(){
  if(window.__rosterLogin) return; window.__rosterLogin=true;
  var nameIn=document.getElementById('nameInput')||document.getElementById('studentName'), startBtn=document.getElementById('startBtn');
  if(!nameIn||!startBtn||typeof SHEET_WEBAPP_URL==='undefined') return;
  var origFetch=window.fetch.bind(window);
  var practice=false, verifiedOK=false, typedMode=false, busy=false, codeVal='', sel=null, code=null, codeRow=null, msgEl=null;
  var FS='width:100%;padding:11px 14px;border:1.5px solid #d8d2c2;border-radius:10px;font-size:15px;font-family:inherit;background:#fff;margin-bottom:12px;box-sizing:border-box;';

  var box=document.createElement('div'); box.id='rlBox'; box.style.cssText='text-align:left;margin:0 0 16px';
  box.innerHTML='<select id="rlName" aria-label="Your name" style="'+FS+'"><option value="">Loading the class list…</option></select>'+
    '<div id="rlCodeRow"><label for="rlCode" style="display:block;font-size:13px;font-weight:600;color:#0f4c4c;margin-bottom:6px">Your 2-digit code</label>'+
    '<input id="rlCode" type="text" inputmode="numeric" maxlength="2" autocomplete="off" placeholder="00" aria-label="Your 2-digit code" style="'+FS+'width:110px;letter-spacing:.3em;text-align:center;-webkit-text-security:disc"></div>'+
    '<div id="rlMsg" style="font-size:13px;min-height:18px;color:#4a5a5a" aria-live="polite"></div>';
  nameIn.parentNode.insertBefore(box,nameIn.nextSibling);
  sel=box.querySelector('#rlName'); code=box.querySelector('#rlCode'); codeRow=box.querySelector('#rlCodeRow'); msgEl=box.querySelector('#rlMsg');
  nameIn.style.display='none'; sel.disabled=true; codeRow.style.display='none';

  var pill=document.createElement('div'); pill.id='rlPractice'; pill.textContent='PRACTICE MODE: nothing you do here is saved or sent to your teacher.';
  pill.style.cssText='display:none;position:fixed;left:50%;bottom:10px;transform:translateX(-50%);z-index:99999;background:#fff4d6;border:2px solid #e0a800;color:#5c3d00;font:600 13px Inter,sans-serif;padding:6px 14px;border-radius:999px;box-shadow:0 2px 10px rgba(0,0,0,.15);max-width:92vw;text-align:center';
  document.body.appendChild(pill);

  function say(t,bad){ msgEl.textContent=t||''; msgEl.style.color=bad?'#c0392b':'#4a5a5a'; }
  function setName(v){ nameIn.value=v; ['input','keyup','change'].forEach(function(ev){ nameIn.dispatchEvent(new Event(ev,{bubbles:true})); }); }
  function sync(){
    var v=sel.value; verifiedOK=false; say('');
    if(v==='__practice__'){ practice=true; codeRow.style.display='none'; pill.style.display='block'; codeVal=''; setName('Practice'); return; }
    practice=false; pill.style.display='none'; codeRow.style.display=v?'':'none';
    codeVal=code.value.replace(/\D/g,'').slice(0,2);
    setName(v&&codeVal.length===2?v:'');
  }
  function withTimeout(ms){ var c=('AbortController' in window)?new AbortController():null; if(c) setTimeout(function(){ c.abort(); },ms); return c?c.signal:undefined; }
  function showTyped(note){
    typedMode=true; box.innerHTML='<div style="font-size:13px;color:#7a4b00;background:#fff4d6;border-radius:8px;padding:8px 10px;margin-bottom:8px">'+note+'</div>'+
      '<button type="button" id="rlPracBtn" style="font:600 13px Inter,sans-serif;border:1.5px solid #1f8a8a;background:#fff;color:#0f4c4c;border-radius:9px;padding:6px 12px;cursor:pointer">Or try practice mode (nothing is saved)</button>';
    nameIn.style.display='';
    box.querySelector('#rlPracBtn').addEventListener('click',function(){ practice=true; pill.style.display='block'; nameIn.value='Practice'; nameIn.style.display='none'; box.innerHTML='<div style="font-size:13px;color:#4a5a5a">Practice mode is on.</div>'; setName('Practice'); });
  }
  // load the roster (names only)
  origFetch(SHEET_WEBAPP_URL+'?action=roster',{signal:withTimeout(9000)}).then(function(r){ return r.json(); }).then(function(d){
    if(!d||!d.names||!d.names.length){ showTyped('The class list is not available right now, so type your name. Your work will be marked <b>unverified</b>.'); return; }
    var h='<option value="">— choose your name —</option>'; d.names.forEach(function(n){ h+='<option>'+n.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</option>'; });
    h+='<option value="__practice__">Practice (nothing is saved)</option>'; sel.innerHTML=h; sel.disabled=false;
  }).catch(function(){ showTyped('The class list could not load on this network, so type your name. Your work will be marked <b>unverified</b>.'); });
  sel.addEventListener('change',function(){ sync(); if(sel.value&&sel.value!=='__practice__') code.focus(); });
  code.addEventListener('input',function(){ code.value=code.value.replace(/\D/g,'').slice(0,2); sync(); });
  code.addEventListener('keydown',function(e){ if(e.key==='Enter'&&!startBtn.disabled) startBtn.click(); });

  function verify(name,c){
    return origFetch(SHEET_WEBAPP_URL,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'verify',name:name,code:c}),signal:withTimeout(9000)})
      .then(function(r){ return r.json(); }).then(function(d){ return (d&&d.status==='success'&&d.result)||'error'; }).catch(function(){ return 'error'; });
  }
  // Start button: check the code first (capture phase, so it runs before the page's own handler)
  document.addEventListener('click',function(e){
    var b=e.target&&e.target.closest&&e.target.closest('#startBtn'); if(!b) return;
    if(typedMode||practice||verifiedOK) return;
    e.stopImmediatePropagation(); e.preventDefault(); if(busy) return;
    if(!sel.value||codeVal.length!==2){ say(sel.value?'Type your 2-digit code.':'Choose your name from the list, then type your 2-digit code.',true); return; }
    busy=true; say('Checking your code…');
    verify(sel.value,codeVal).then(function(res){
      busy=false;
      if(res==='bad'){ say('That code does not match that name. Check the code and try again.',true); code.select(); return; }
      if(res==='locked'){ say('Too many wrong tries. Wait ten minutes or ask your teacher.',true); return; }
      say(res==='ok'?'':'The code could not be checked right now. It will be checked when you submit.');
      verifiedOK=true; startBtn.click();
    });
  },true);

  // Posts: add the code; in practice mode nothing is sent at all
  window.fetch=function(u,o){
    try{
      if(String(u).indexOf(SHEET_WEBAPP_URL)===0&&o&&/post/i.test(o.method||'')){
        if(practice) return Promise.resolve(new Response('{"status":"success"}',{status:200,headers:{'Content-Type':'application/json'}}));
        var body=JSON.parse(o.body); if(body&&!body.action){ body.code=codeVal; o=Object.assign({},o,{body:JSON.stringify(body)}); }
      }
    }catch(err){}
    return origFetch(u,o);
  };
  // In practice mode, make sure no message claims the results were sent
  new MutationObserver(function(){
    if(!practice) return;
    var w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,null,false), n;
    while((n=w.nextNode())){ var t=n.nodeValue; if(t&&/sent/i.test(t)&&/teacher|sheet/i.test(t)&&t.indexOf('Practice mode')<0) n.nodeValue='Practice mode: nothing was saved or sent.'; }
  }).observe(document.body,{childList:true,subtree:true,characterData:true});
})();
