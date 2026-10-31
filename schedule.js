/* SCHEDULE v1: due dates + the signed-in student's best scores on the level pages.
   Needs: lessons.json (repo root), a Schedule tab in the class sheet, Code.gs v2 deployed.
   Fails quiet: if anything cannot load, the page looks exactly as it did before. */
(function(){
  var URLS={
    Algebra2:'https://script.google.com/macros/s/AKfycbywXRwMOliX7qFl6dV_GPmglmzcc83yCvKoaHu1q12mZTAAiBsjksq3MErDr2Ims9Zl/exec',
    Geometry:'https://script.google.com/macros/s/AKfycbxWfFXI8hcHiKWwXEUpurwGgfoddlsyPlWU0fWMe7hMLrK7veufBP-z6wIDfHv6atIAvQ/exec'};
  if(window.__schedule) return; window.__schedule=true;
  var file=(location.pathname.split('/').pop()||'');
  var subj=/^Algebra2/i.test(file)?'Algebra2':(/^Geometry/i.test(file)?'Geometry':'');
  if(!subj) return;
  var links=[].slice.call(document.querySelectorAll('a.lesson')).filter(function(a){ return /\.html$/i.test(a.getAttribute('href')||''); });
  if(!links.length) return;
  var URL_=URLS[subj];

  function idOfFile(fn){
    var m=/_(M\d+T\d+L\d+)/i.exec(fn); if(m) return m[1].toUpperCase();
    return fn.replace(/^(Algebra2|Geometry)_/i,'').replace(/(_OnLevel|_Honors)?\.html$/i,'');
  }
  function timed(ms){ var c=('AbortController' in window)?new AbortController():null; if(c) setTimeout(function(){ c.abort(); },ms); return c?c.signal:undefined; }
  function getJSON(u){ return fetch(u,{signal:timed(9000)}).then(function(r){ return r.json(); }); }
  function session(){
    try{ var o=JSON.parse(sessionStorage.getItem('rhmw-session')||'null');
      if(!o||o.practice||!o.name||!/^\d{2}$/.test(o.code||'')) return null;
      if(o.t&&Date.now()-o.t>36e6) return null;
      if(o.subjects&&o.subjects.indexOf(subj)<0) return null;
      return o; }catch(e){ return null; }
  }
  var sess=session();

  var pManifest=getJSON('lessons.json').catch(function(){ return {pages:{}}; });
  var pSched=getJSON(URL_+'?action=schedule').catch(function(){ return null; });
  var pScores=sess?fetch(URL_,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify({action:'scores',name:sess.name,code:sess.code}),signal:timed(12000)})
        .then(function(r){ return r.json(); }).catch(function(){ return null; }):Promise.resolve(null);

  Promise.all([pManifest,pSched,pScores]).then(function(r){
    try{ render(r[0]||{pages:{}},r[1],r[2]); }catch(e){}
  });

  function render(man,sched,sc){
    var topicId={}; Object.keys(man.pages||{}).forEach(function(f){ topicId[man.pages[f].topic]=man.pages[f].id; });
    function idOfTopic(t){ if(topicId[t]) return topicId[t]; var m=/M(\d+)\s*T(\d+)\s*L(\d+)/i.exec(t); return m?('M'+m[1]+'T'+m[2]+'L'+m[3]):null; }
    var due={}, note={}; ((sched&&sched.schedule)||[]).forEach(function(s){ due[s.id]=s.due; note[s.id]=s.note; });
    var today=(sched&&sched.today)||(function(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); })();
    var signedIn=!!(sc&&sc.result==='ok'), best={};
    if(signedIn){ Object.keys(sc.scores||{}).forEach(function(t){ var id=idOfTopic(t); if(!id) return; var v=sc.scores[t]; if(!(id in best)||v>best[id]) best[id]=v; }); }
    var hasDates=Object.keys(due).length>0;
    if(!hasDates&&!signedIn) return;

    function fmt(d){ var p=d.split('-'); return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }
    function plus(d,n){ var p=d.split('-'), x=new Date(+p[0],+p[1]-1,+p[2]+n); return x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2); }
    var st=document.createElement('style');
    st.textContent='.rh-b{margin-left:auto;display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}'+
     '.rh-due,.rh-sc{font:600 12px/1 Inter,system-ui,sans-serif;border-radius:999px;padding:5px 9px;white-space:nowrap}'+
     '.rh-due{background:#eef3f2;color:#0f4c4c}.rh-due.late{background:#fdeceb;color:#a12a20}.rh-due.soon{background:#fff4d6;color:#7a4b00}'+
     '.rh-sc.g{background:#e3f5e9;color:#176b3a}.rh-sc.y{background:#fff4d6;color:#7a4b00}.rh-sc.r{background:#fdeceb;color:#a12a20}'+
     '#rhBox{background:#fff;border:1px solid #d8d2c2;border-radius:14px;padding:16px 20px;margin:22px 0;box-shadow:0 2px 10px rgba(15,76,76,.05);font-family:inherit}'+
     '#rhBox h3{margin:0 0 6px;font-size:15px;color:#0f4c4c}#rhBox ul{margin:0 0 10px;padding-left:20px;font-size:14px}#rhBox li{margin:3px 0}'+
     '#rhBox .miss h3{color:#a12a20}#rhBox .hint{font-size:13px;color:#4a5a5a}#rhBox label{font-size:13px;color:#4a5a5a;cursor:pointer}';
    document.head.appendChild(st);

    var items=[];
    links.forEach(function(a){
      var f=(a.getAttribute('href')||'').split('/').pop(), id=idOfFile(f), d=due[id], b=best[id];
      var title=a.textContent.replace('→','').replace(/\s+/g,' ').trim();
      var late=d&&today>d, soon=d&&!late&&d<=plus(today,2);
      var box=document.createElement('span'); box.className='rh-b';
      if(d){ var s=document.createElement('span'); s.className='rh-due'+(late&&b===undefined&&signedIn?' late':(soon&&b===undefined?' soon':'')); s.textContent=(late?'Was due ':'Due ')+fmt(d); if(note[id]) s.title=note[id]; box.appendChild(s); }
      var shown=false;
      if(b!==undefined){ var c=document.createElement('span'); c.className='rh-sc '+(b>=80?'g':(b>=60?'y':'r')); c.textContent=Math.round(b)+'%'; c.title='Your best score'; box.appendChild(c); shown=true; }
      else if(signedIn&&late){ var z=document.createElement('span'); z.className='rh-sc r'; z.textContent='0%'; z.title='Nothing submitted yet'; box.appendChild(z); shown=true; }
      if(d||shown){ var arrow=a.querySelector('.arrow'); a.insertBefore(box,arrow||null); if(!arrow) box.style.marginLeft='auto'; }
      items.push({a:a,id:id,title:title,due:d,best:b,late:late,has:!!(d||shown)});
    });

    var missing=signedIn?items.filter(function(x){ return x.due&&x.late&&x.best===undefined; }):[];
    var soonList=items.filter(function(x){ return x.due&&!x.late&&x.due<=plus(today,7)&&(x.best===undefined); }).sort(function(p,q){ return p.due<q.due?-1:1; });
    var box=document.createElement('div'); box.id='rhBox'; var html='';
    function li(x){ return '<li><a href="'+x.a.getAttribute('href')+'">'+x.title.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</a> <span class="hint">('+fmt(x.due)+')</span></li>'; }
    if(missing.length) html+='<div class="miss"><h3>Missing: due already, nothing submitted</h3><ul>'+missing.map(li).join('')+'</ul></div>';
    if(soonList.length) html+='<div><h3>Due in the next 7 days</h3><ul>'+soonList.map(li).join('')+'</ul></div>';
    if(!signedIn&&hasDates) html+='<p class="hint">To see your scores here, <a href="index.html">sign in on the home page</a> first.</p>';
    var anyDated=items.some(function(x){ return x.due; });
    if(anyDated) html+='<label><input type="checkbox" id="rhOnly"> Only show lessons that have a due date</label>';
    if(!html) return;
    box.innerHTML=html;
    var firstSec=document.querySelector('section.subject, .subject');
    if(firstSec&&firstSec.parentNode) firstSec.parentNode.insertBefore(box,firstSec);
    var only=box.querySelector('#rhOnly');
    if(only) only.addEventListener('change',function(){
      items.forEach(function(x){ x.a.style.display=(only.checked&&!x.due)?'none':''; });
      [].slice.call(document.querySelectorAll('section.subject')).forEach(function(sec){
        var ls=[].slice.call(sec.querySelectorAll('a.lesson')); sec.style.display=(only.checked&&ls.length&&ls.every(function(a){ return a.style.display==='none'; }))?'none':'';
      });
    });
  }
})();
