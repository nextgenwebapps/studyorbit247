/* StudyOrbit247 homepage loader and original homepage interactions. */
(async function(){
 const load=async url=>{const r=await fetch(url);if(!r.ok)throw new Error("Could not load "+url+" ("+r.status+")");return r.text();};
 const [header,footer,...sections]=await Promise.all([load("components/header/header.html"),load("components/footer/footer.html"),...["sections/hero/hero.html","sections/stats/stats.html","sections/recent-activity/recent-activity.html","sections/subjects/subjects.html","sections/exams/exams.html","sections/features/features.html","sections/practice/practice.html"].map(path=>load("home/"+path))]);
 document.getElementById("site-header").innerHTML=header;
 document.getElementById("home-page").innerHTML='<main class="home-content">'+sections.join("\n")+'</main>';
 document.getElementById("site-footer").innerHTML=footer;
 
(function(){
  const activityKey='studyorbit_recent_activity';
  const list=document.getElementById('recent-activity-list');
  const readStored=(key)=>{
    try{
      const raw=localStorage.getItem(key);
      if(raw){const parsed=JSON.parse(raw);if(Array.isArray(parsed))return parsed;if(parsed&&Array.isArray(parsed.items))return parsed.items;if(parsed&&Array.isArray(parsed.activities))return parsed.activities;}
    }catch(e){}
    try{
      const cookie=document.cookie.split('; ').find(row=>row.startsWith(key+'='));
      if(cookie){const parsed=JSON.parse(decodeURIComponent(cookie.substring(key.length+1)));if(Array.isArray(parsed))return parsed;if(parsed&&Array.isArray(parsed.items))return parsed.items;if(parsed&&Array.isArray(parsed.activities))return parsed.activities;}
    }catch(e){}
    return [];
  };
  const isLoggedIn=()=>{
    const keys=['studyorbit_user','currentUser','authUser','user','userData','studyorbit_session'];
    return keys.some(key=>{try{const v=localStorage.getItem(key);return !!v&&v!=='null'&&v!=='false';}catch(e){return false;}})||
      document.cookie.split('; ').some(c=>/^(studyorbit_user|studyorbit_session|authToken|token)=/.test(c));
  };
  const esc=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stored=readStored(activityKey);
  const recent=stored.concat(readStored('recentActivities'),readStored('recent_activity'),readStored('recentLearning')).filter(x=>x&&typeof x==='object');
  const unique=[];
  recent.forEach(item=>{
    const title=item.title||item.name||item.label||item.activity||item.type;
    const url=item.url||item.href||item.link||'#';
    if(title&&!unique.some(x=>(x.title||x.name||x.label||x.activity)===title&&((x.url||x.href||x.link||'#')===url)))unique.push(item);
  });
  const renderRecent=()=>{
    if(!list)return;
    if(!unique.length){list.innerHTML='<div class="recent-empty">'+(isLoggedIn()?'You are signed in. Open a test, subject or lecture and it will appear here.':'Sign in or start exploring. Your recent tests, subjects and lectures will be saved on this device.')+'</div>';return;}
    list.innerHTML=unique.slice(0,8).map(item=>{
      const title=item.title||item.name||item.label||item.activity||'Recent activity';
      const url=item.url||item.href||item.link||'#';
      const type=item.type||item.category||'Recently opened';
      const icon=/test|quiz|mock/i.test(type+' '+title)?'📝':/lecture|video/i.test(type+' '+title)?'🎥':/chapter|subject/i.test(type+' '+title)?'📚':'↗';
      return '<a class="recent-activity-item" href="'+esc(url)+'"><span class="recent-activity-icon">'+icon+'</span><span><strong>'+esc(title)+'</strong><small>'+esc(type)+'</small></span></a>';
    }).join('');
  };
  renderRecent();
  document.addEventListener('click',event=>{
    /* Do not record clicks made inside the Recent Activity section itself,
       or navigation clicks whose destination is the Recent Activity section. */
    if(event.target.closest('#recent-activity'))return;
    const clickedLink=event.target.closest('main a[href]');
    if(clickedLink && (clickedLink.getAttribute('href')||'').split(/[?#]/)[0]==='' && (clickedLink.getAttribute('href')||'').includes('#recent-activity'))return;
    const examCard=event.target.closest('main .exam');
    const a=event.target.closest('main a[href]');
    let title='',href='',type='Learning';
    if(examCard){
      title=(examCard.querySelector('h3')?.textContent||'').trim();
      href=a&&a.closest('.exam')===examCard?a.getAttribute('href'):'#exams';
      type='Exam';
    }else{
      if(!a||!a.href||a.href==='#'||a.target==='_blank')return;
      title=(a.innerText||a.textContent||'').trim().replace(/\s+/g,' ').slice(0,90);
      href=a.getAttribute('href');
      type=a.closest('.subject')?'Subject':/mock|test|quiz/i.test(title)?'Test':'Learning';
    }
    if(!title)return;
    const item={title,url:href,type,time:Date.now()};
    const next=[item,...unique.filter(x=>(x.title||x.name||x.label||x.activity)!==title)].slice(0,8);
    try{localStorage.setItem(activityKey,JSON.stringify(next));}catch(e){}
    unique.splice(0,unique.length,...next);
    renderRecent();
  });
  const search=document.getElementById('site-content-search');
  const results=document.getElementById('site-search-results');
  if(!search||!results)return;
  const candidates=Array.from(document.querySelectorAll('main h1,main h2,main h3,main .subject,main .exam,main .feature,main p,main a'))
    .filter(el=>!el.closest('#recent-activity')&&!el.closest('#site-search-results'));
  search.addEventListener('input',()=>{
    const q=search.value.trim().toLowerCase();
    if(!q){results.innerHTML='';return;}
    const seen=new Set(),matches=[];
    candidates.forEach(el=>{
      const text=(el.innerText||el.textContent||'').trim().replace(/\s+/g,' ');
      if(!text||!text.toLowerCase().includes(q))return;
      const card=el.closest('.subject,.exam,.feature')||el;
      const title=(card.querySelector('h3,h2,h1')?.textContent||text).trim().replace(/\s+/g,' ').slice(0,100);
      if(seen.has(title))return;
      seen.add(title);
      const anchor=card.matches('a')?card:card.querySelector('a[href]');
      let href=anchor?.getAttribute('href')||'#';
      if(href==='#'&&card.id)href='#'+card.id;
      matches.push({title,description:text.slice(0,160),href});
    });
    results.innerHTML=matches.length?matches.slice(0,10).map(m=>'<a class="site-search-result" href="'+esc(m.href)+'"><strong>'+esc(m.title)+'</strong><small>'+esc(m.description)+'</small></a>').join(''):'<div class="site-search-empty">No matching content found. Try another keyword.</div>';
  });
})();



(function(){
 const grid=document.querySelector('#exams .exam-grid');
 const button=document.getElementById('show-more-exams');
 if(!grid||!button)return;

 const batchSize=4;
 let extras=Array.from(grid.querySelectorAll('.exam-extra'));
 let shown=extras.reduce((count,card)=>count+(!card.hidden?1:0),0);

 function refresh(){
   extras=Array.from(grid.querySelectorAll('.exam-extra'));
   const hasMore=shown<extras.length;
   const hasShown=shown>0;
   button.hidden=!(hasMore||hasShown);
   button.classList.toggle('is-expanded',hasShown);
   button.classList.toggle('is-at-end',!hasMore&&hasShown);
   button.setAttribute('aria-label',hasMore&&hasShown?'Show more or show less exams':hasMore?'Show more exams':'Show less exams');
 }
 button.addEventListener('click',function(event){
   const less=event.target.closest('.exam-action-less');
   if(less){
     const nextShown=Math.max(0,shown-batchSize);
     extras.slice(nextShown,shown).forEach(card=>{card.hidden=true;});
     shown=nextShown;
     refresh();
     return;
   }
   if(shown>=extras.length)return;
   const next=extras.slice(shown,shown+batchSize);
   next.forEach(card=>{card.hidden=false;});
   shown+=next.length;
   refresh();
   if(next.length)next[0].scrollIntoView({behavior:'smooth',block:'nearest'});
 });
 refresh();

 /* Keep demo cards available long enough to test; remove them after 30 minutes. */
 window.setTimeout(function(){
   grid.querySelectorAll('.exam-template').forEach(card=>card.remove());
   extras=Array.from(grid.querySelectorAll('.exam-extra'));
   shown=extras.reduce((count,card)=>count+(!card.hidden?1:0),0);
   refresh();
 },30*60*1000);
})();



(function(){
 const grid=document.querySelector('#subjects .subject-grid');
 const button=document.getElementById('show-more-subjects');
 if(!grid||!button)return;

 const batchSize=4;
 let extras=Array.from(grid.querySelectorAll('.subject-extra'));

 const updateButton=()=>{
   extras=Array.from(grid.querySelectorAll('.subject-extra'));
   const visible=extras.filter(card=>!card.hidden).length;
   const hasMore=visible<extras.length;
   const hasShown=visible>0;

   button.hidden=!hasMore&&!hasShown;
   button.classList.toggle('is-expanded',hasShown);
   button.classList.toggle('is-at-end',!hasMore&&hasShown);
   button.setAttribute(
     'aria-label',
     hasMore&&hasShown
       ? 'Show more or show less subjects'
       : hasMore
         ? 'Show more subjects'
         : 'Show less subjects'
   );
 };

 button.addEventListener('click',event=>{
   extras=Array.from(grid.querySelectorAll('.subject-extra'));
   const visible=extras.filter(card=>!card.hidden);
   const clickedLess=event.target.closest('.subject-action-less');

   if(clickedLess){
     visible.slice(-batchSize).forEach(card=>{card.hidden=true;});
     updateButton();
     return;
   }

   const hidden=extras.filter(card=>card.hidden);
   const next=hidden.slice(0,batchSize);
   next.forEach(card=>{card.hidden=false;});
   updateButton();

   if(next.length){
     next[0].scrollIntoView({behavior:'smooth',block:'nearest'});
   }
 });

 updateButton();
})();

})().catch(error=>console.error("StudyOrbit247 homepage failed to load:",error));