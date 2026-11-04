/* RHMW storage cleanup v1: keeps the autosave space in this browser from filling up.
   1) removes autosaves older than MAX_DAYS (and Practice-mode saves older than 1 day);
   2) if saves still use more than BUDGET characters, removes the oldest saves until they fit.
   Only touches keys that start with "rhmw-autosave:". Never throws. Safe to load on any page. */
(function(){
  var PREFIX='rhmw-autosave:', MAX_DAYS=30, BUDGET=3000000, DAY=864e5;
  function run(keepPrefix){
    var ls; try{ ls=window.localStorage; if(!ls) return 0; }catch(e){ return 0; }
    var now=Date.now(), items=[], removed=0, i, k, raw, t, d;
    try{
      for(i=0;i<ls.length;i++){
        k=ls.key(i); if(!k||k.indexOf(PREFIX)!==0) continue;
        raw=ls.getItem(k)||''; t=0;
        try{ d=JSON.parse(raw); t=Date.parse(d&&(d.savedAt||d.firstStartedAt))||0; }catch(e){ t=0; }
        items.push({k:k,size:k.length+raw.length,t:t,practice:/::practice$/.test(k)});
      }
      var keep=[];
      items.forEach(function(it){
        if(keepPrefix&&it.k.indexOf(keepPrefix)===0){ keep.push(it); return; }
        var age=it.t?now-it.t:0;
        if((it.practice&&(!it.t||age>DAY))||(it.t&&age>MAX_DAYS*DAY)){ try{ ls.removeItem(it.k); removed++; }catch(e){} }
        else keep.push(it);
      });
      var total=keep.reduce(function(s,it){ return s+it.size; },0);
      keep.sort(function(a,b){ return a.t-b.t; });   /* oldest (or undated) first */
      for(i=0;i<keep.length&&total>BUDGET;i++){
        if(keepPrefix&&keep[i].k.indexOf(keepPrefix)===0) continue;
        try{ ls.removeItem(keep[i].k); removed++; total-=keep[i].size; }catch(e){}
      }
    }catch(e){}
    return removed;
  }
  window.rhmwStorageCleanup=run;
  try{ run(typeof TOPIC_NAME==='string'?PREFIX+TOPIC_NAME+'::':null); }catch(e){}
})();
