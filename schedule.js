/* SCHEDULE v3: start + due dates, teacher notes, filters and the signed-in student's best scores on the level pages.
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

  function esc(t){ return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function render(man,sched,sc){
    var topicId={}; Object.keys(man.pages||{}).forEach(function(f){ topicId[man.pages[f].topic]=man.pages[f].id; });
    function idOfTopic(t){ if(topicId[t]) return topicId[t]; var m=/M(\d+)\s*T(\d+)\s*L(\d+)/i.exec(t); return m?('M'+m[1]+'T'+m[2]+'L'+m[3]):null; }
    var start={}, due={}, note={}, entries=((sched&&sched.schedule)||[]);
    entries.forEach(function(s){ if(s.start) start[s.id]=s.start; if(s.due) due[s.id]=s.due; if(s.note) note[s.id]=s.note; });
    var today=(sched&&sched.today)||(function(){ var d=new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); })();
    var signedIn=!!(sc&&sc.result==='ok'), best={};
    if(signedIn){ Object.keys(sc.scores||{}).forEach(function(t){ var id=idOfTopic(t); if(!id) return; var v=sc.scores[t]; if(!(id in best)||v>best[id]) best[id]=v; }); }
    var hasDates=Object.keys(due).length>0||Object.keys(start).length>0;
    if(!entries.length&&!signedIn) return;

    function fmt(d){ var p=d.split('-'); return new Date(+p[0],+p[1]-1,+p[2]).toLocaleDateString('en-US',{weekday:'short',month:'short',day:'numeric'}); }
    function plus(d,n){ var p=d.split('-'), x=new Date(+p[0],+p[1]-1,+p[2]+n); return x.getFullYear()+'-'+('0'+(x.getMonth()+1)).slice(-2)+'-'+('0'+x.getDate()).slice(-2); }
    var st=document.createElement('style');
    st.textContent='a.lesson{flex-wrap:wrap}'+
     '.rh-b{margin-left:auto;display:inline-flex;gap:6px;align-items:center;flex-wrap:wrap;justify-content:flex-end}'+
     '.rh-due,.rh-sc{font:600 12px/1 Inter,system-ui,sans-serif;border-radius:999px;padding:5px 9px;white-space:nowrap}'+
     '.rh-due{background:#eef3f2;color:#0f4c4c}.rh-due.late{background:#fdeceb;color:#a12a20}.rh-due.soon{background:#fff4d6;color:#7a4b00}'+
     '.rh-sc.g{background:#e3f5e9;color:#176b3a}.rh-sc.y{background:#fff4d6;color:#7a4b00}.rh-sc.r{background:#fdeceb;color:#a12a20}'+
     'a.lesson.rh-later{opacity:.78}'+
     '.rh-note{flex-basis:100%;font:500 13px/1.4 Inter,system-ui,sans-serif;color:#4a5a5a;background:#fffbea;border-left:3px solid #e0b400;border-radius:4px;padding:5px 9px;margin-top:2px}'+
     '.rh-note:before{content:"Note from your teacher: ";font-weight:700;color:#7a4b00}'+
     '#rhBox{background:#fff;border:1px solid #d8d2c2;border-radius:14px;padding:16px 20px;margin:22px 0;box-shadow:0 2px 10px rgba(15,76,76,.05);font-family:inherit}'+
     '#rhBox h3{margin:0 0 6px;font-size:15px;color:#0f4c4c}#rhBox ul{margin:0 0 10px;padding-left:20px;font-size:14px}#rhBox li{margin:3px 0}'+
     '#rhBox .miss h3{color:#a12a20}#rhBox .hint{font-size:13px;color:#4a5a5a}#rhBox .li-note{display:block;font-size:12.5px;color:#7a4b00}'+
     '.rh-filters{border-top:1px dashed #d8d2c2;margin-top:12px;padding-top:12px}'+
     '.rh-fg{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 8px}.rh-fl{font-size:12px;font-weight:700;color:#4a5a5a;text-transform:uppercase;letter-spacing:.04em;min-width:52px}'+
     '.rh-chip{font:600 13px/1 inherit;font-family:inherit;border:1.5px solid #d8d2c2;background:#fbfaf6;color:#1c2b2b;border-radius:999px;padding:7px 12px;cursor:pointer}'+
     '.rh-chip:hover{border-color:#1f8a8a}.rh-chip[aria-pressed="true"]{background:#146b6b;border-color:#146b6b;color:#fff}'+
     '#rhCount{font-size:13px;color:#4a5a5a;margin-top:2px}#rhCount button{border:0;background:none;color:#146b6b;text-decoration:underline;cursor:pointer;font:inherit;padding:0 0 0 6px}'+
     '.rh-empty{font-size:14px;color:#4a5a5a;padding:14px 4px;text-align:center}';
    document.head.appendChild(st);

    var items=[];
    links.forEach(function(a){
      var f=(a.getAttribute('href')||'').split('/').pop(), id=idOfFile(f), sd=start[id], dd=due[id], S=sd||dd, E=dd, b=best[id], nt=note[id];   // E is the real due date only: a lesson with just a Start date is never due or late
      var title=a.textContent.replace('\u2192','').replace(/\s+/g,' ').trim();
      var late=!!(E&&today>E), soon=!!(E&&!late&&E<=plus(today,2)), later=!!(S&&today<S);
      var box=document.createElement('span'); box.className='rh-b';
      function chip(txt,cls){ var s=document.createElement('span'); s.className='rh-due'+(cls?' '+cls:''); s.textContent=txt; box.appendChild(s); }
      var dueCls=(late&&b===undefined&&signedIn)?'late':((soon&&b===undefined)?'soon':'');
      if(sd&&dd&&sd!==dd){ chip('Starts '+fmt(sd),''); chip((late?'Was due ':'Due ')+fmt(dd),dueCls); }
      else if(dd){ chip((late?'Was due ':'Due ')+fmt(dd),dueCls); }
      else if(sd){ chip((later?'Starts ':'Started ')+fmt(sd),''); }
      if(later) a.classList.add('rh-later');
      var dtext=(sd&&dd&&sd!==dd)?('Starts '+fmt(sd)+', due '+fmt(dd)):(dd?('Due '+fmt(dd)):(sd?('Starts '+fmt(sd)):''));
      var shown=false;
      if(b!==undefined){ var c=document.createElement('span'); c.className='rh-sc '+(b>=80?'g':(b>=60?'y':'r')); c.textContent=Math.round(b)+'%'; c.title='Your best score'; box.appendChild(c); shown=true; }
      else if(signedIn&&late){ var z=document.createElement('span'); z.className='rh-sc r'; z.textContent='0%'; z.title='Nothing submitted yet'; box.appendChild(z); shown=true; }
      var arrow=a.querySelector('.arrow');
      if(S||shown){ a.insertBefore(box,arrow||null); if(!arrow) box.style.marginLeft='auto'; }
      if(nt){ var n=document.createElement('span'); n.className='rh-note'; n.textContent=nt; a.appendChild(n); }
      items.push({a:a,id:id,title:title,start:S,due:E,dtext:dtext,note:nt,best:b,late:late});
    });

    var missing=signedIn?items.filter(function(x){ return x.due&&x.late&&x.best===undefined; }):[];
    var soonList=items.filter(function(x){ return x.due&&!x.late&&x.due<=plus(today,7)&&(x.best===undefined); }).sort(function(p,q){ return p.due<q.due?-1:1; });
    function li(x){ return '<li><a href="'+esc(x.a.getAttribute('href'))+'">'+esc(x.title)+'</a> <span class="hint">('+x.dtext+')</span>'+(x.note?'<span class="li-note">'+esc(x.note)+'</span>':'')+'</li>'; }
    var html='';
    if(missing.length) html+='<div class="miss"><h3>Missing: due already, nothing submitted</h3><ul>'+missing.map(li).join('')+'</ul></div>';
    if(soonList.length) html+='<div><h3>Due in the next 7 days</h3><ul>'+soonList.map(li).join('')+'</ul></div>';
    if(!signedIn&&hasDates) html+='<p class="hint">To see your scores here, <a href="index.html">sign in on the home page</a> first.</p>';

    // ---- filters: two independent groups (When + Status); a lesson must match both
    var key='rh-filter:'+file, f={when:'all',status:'all'};
    try{ var sv=JSON.parse(sessionStorage.getItem(key)||'null'); if(sv){ if(/^(all|current|week|upcoming|past|nodate)$/.test(sv.when)) f.when=sv.when; if(/^(all|scored|notscored)$/.test(sv.status)) f.status=sv.status; } }catch(e){}
    if(!hasDates&&f.when!=='all'&&f.when!=='nodate') f.when='all';
    if(!signedIn) f.status='all';
    function chipHtml(g,v,label){ return '<button type="button" class="rh-chip" data-g="'+g+'" data-v="'+v+'" aria-pressed="'+(f[g]===v)+'">'+label+'</button>'; }
    var fh='<div class="rh-filters" role="group" aria-label="Filter lessons">';
    if(hasDates) fh+='<div class="rh-fg"><span class="rh-fl">When</span>'+chipHtml('when','all','All')+chipHtml('when','current','In progress')+chipHtml('when','week','Due this week')+chipHtml('when','upcoming','Upcoming')+chipHtml('when','past','Past due')+chipHtml('when','nodate','No date')+'</div>';
    if(signedIn) fh+='<div class="rh-fg"><span class="rh-fl">Status</span>'+chipHtml('status','all','All')+chipHtml('status','scored','Scored')+chipHtml('status','notscored','Not scored yet')+'</div>';
    fh+='<div id="rhCount" aria-live="polite"></div></div>';
    if(hasDates||signedIn) html+=fh;
    if(!html) return;
    var box=document.createElement('div'); box.id='rhBox'; box.innerHTML=html;
    var firstSec=document.querySelector('section.subject, .subject');
    if(firstSec&&firstSec.parentNode) firstSec.parentNode.insertBefore(box,firstSec);

    var empty=document.createElement('div'); empty.className='rh-empty'; empty.style.display='none'; empty.textContent='No lessons match these filters.';
    if(firstSec&&firstSec.parentNode) firstSec.parentNode.insertBefore(empty,firstSec);
    function apply(){
      var n=0;
      items.forEach(function(x){
        var ok=true;
        if(f.when==='current') ok=!!x.start&&x.start<=today&&(!x.due||today<=x.due);
        else if(f.when==='week') ok=!!x.due&&!x.late&&x.due<=plus(today,7);
        else if(f.when==='upcoming') ok=!!x.start&&x.start>today;
        else if(f.when==='past') ok=!!x.late;
        else if(f.when==='nodate') ok=!x.start;
        if(ok&&f.status==='scored') ok=x.best!==undefined;
        if(ok&&f.status==='notscored') ok=x.best===undefined;
        x.a.style.display=ok?'':'none'; if(ok) n++;
      });
      var active0=(f.when!=='all'||f.status!=='all');
      function anyShown(root){ var ls=root.querySelectorAll('a.lesson'); for(var i=0;i<ls.length;i++){ if(ls[i].style.display!=='none') return true; } return false; }
      [].slice.call(document.querySelectorAll('.exit-row')).forEach(function(row){ row.style.display=anyShown(row)?'':'none'; });
      [].slice.call(document.querySelectorAll('details.topic')).forEach(function(d){ var has=anyShown(d); d.style.display=(!has&&d.querySelector('a.lesson'))?'none':''; if(active0&&has) d.open=true; else d.open=!!d.__rhOpen; });
      [].slice.call(document.querySelectorAll('details.mod')).forEach(function(d){ var has=anyShown(d); if(active0&&has) d.open=true; else d.open=!!d.__rhOpen; });
      [].slice.call(document.querySelectorAll('section.subject')).forEach(function(sec){
        var ls=sec.querySelectorAll('a.lesson'); sec.style.display=(ls.length&&!anyShown(sec))?'none':'';
      });
      var active=(f.when!=='all'||f.status!=='all'), cnt=document.getElementById('rhCount');
      if(cnt){ cnt.innerHTML=active?('Showing '+n+' of '+items.length+' lessons <button type="button" id="rhClear">Clear filters</button>'):''; var cl=document.getElementById('rhClear'); if(cl) cl.addEventListener('click',function(){ f.when='all'; f.status='all'; sync(); }); }
      empty.style.display=(active&&n===0)?'':'none';
    }
    function sync(){
      [].slice.call(box.querySelectorAll('.rh-chip')).forEach(function(b){ b.setAttribute('aria-pressed',String(f[b.getAttribute('data-g')]===b.getAttribute('data-v'))); });
      try{ sessionStorage.setItem(key,JSON.stringify(f)); }catch(e){}
      apply();
    }
    [].slice.call(document.querySelectorAll('details.mod, details.topic')).forEach(function(d){ d.__rhOpen=d.open; });
    box.addEventListener('click',function(e){ var b=e.target.closest?e.target.closest('.rh-chip'):null; if(!b) return; f[b.getAttribute('data-g')]=b.getAttribute('data-v'); sync(); });
    sync();
  }
})();
