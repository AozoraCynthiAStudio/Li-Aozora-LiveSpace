const body=document.body;
const page=body.dataset.page||"home";
const basePath=body.dataset.base||"./";
const themeToggle=document.querySelector("#themeToggle");
const languageToggle=document.querySelector("#languageToggle");

const DAY_START=7;
const NIGHT_START=19;
let manualThemeOverride=false;
let currentLang="zh";
let liveData=null;

function themeFromLocalTime(date=new Date()){
  const hour=date.getHours();
  return hour>=DAY_START&&hour<NIGHT_START?"light":"dark";
}

function setTheme(theme){
  document.documentElement.dataset.theme=theme;
  if(themeToggle){
    themeToggle.textContent=theme==="dark"?"☼":"◐";
    themeToggle.title=currentLang==="en"
      ?(manualThemeOverride
        ?`${theme==="dark"?"Night":"Day"} theme · click to switch · refresh to return to automatic`
        :`${theme==="dark"?"Night":"Day"} theme · follows local time automatically`)
      :(manualThemeOverride
        ?`当前为${theme==="dark"?"夜间":"日间"}模式 · 点击继续切换 · 刷新后恢复自动`
        :`当前为${theme==="dark"?"夜间":"日间"}模式 · 自动跟随本地时间`);
  }
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.setAttribute("content",theme==="dark"?"#101116":"#f7f5f2");
}

function applyAutomaticTheme(){
  if(!manualThemeOverride)setTheme(themeFromLocalTime());
}
if(themeToggle){
  themeToggle.addEventListener("click",()=>{
    manualThemeOverride=true;
    setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");
  });
}
applyAutomaticTheme();
setInterval(applyAutomaticTheme,60000);

function initialLanguage(){
  const q=new URLSearchParams(location.search).get("lang");
  if(q==="en"||q==="zh")return q;
  const saved=localStorage.getItem("livespace-language");
  if(saved==="en"||saved==="zh")return saved;
  return navigator.language&&navigator.language.toLowerCase().startsWith("zh")?"zh":"en";
}

function applyLanguage(lang,{persist=true}={}){
  currentLang=lang==="en"?"en":"zh";
  document.documentElement.lang=currentLang==="en"?"en":"zh-CN";
  if(persist)localStorage.setItem("livespace-language",currentLang);

  document.querySelectorAll("[data-zh]").forEach(el=>{
    const value=currentLang==="en"?el.dataset.en:el.dataset.zh;
    if(value!==undefined)el.textContent=value;
  });
  document.querySelectorAll("[data-zh-html]").forEach(el=>{
    const value=currentLang==="en"?el.dataset.enHtml:el.dataset.zhHtml;
    if(value!==undefined)el.innerHTML=value;
  });

  if(languageToggle){
    languageToggle.textContent=currentLang==="zh"?"EN":"中文";
    languageToggle.title=currentLang==="zh"?"Switch to English":"切换到中文";
  }

  setTheme(document.documentElement.dataset.theme||themeFromLocalTime());
  if(liveData)renderPage(liveData);
}

currentLang=initialLanguage();
applyLanguage(currentLang,{persist:false});
if(languageToggle){
  languageToggle.addEventListener("click",()=>applyLanguage(currentLang==="zh"?"en":"zh"));
}

const validViews=new Set(["home","timeline","gallery","diary","about"]);

function routeSpace(){
  if(page!=="home")return;
  const requested=(location.hash||"#home").slice(1);
  const view=validViews.has(requested)?requested:"home";

  document.querySelectorAll("[data-view]").forEach(section=>{
    section.hidden=section.dataset.view!==view;
  });

  if(liveData){
    if(view==="home")renderHome(liveData);
    if(view==="timeline")renderTimeline(liveData);
    if(view==="gallery")renderGallery(liveData);
    if(view==="diary")renderDiary(liveData);
  }

  window.scrollTo({top:0,left:0,behavior:"auto"});
}

window.addEventListener("hashchange",routeSpace);

function escapeHtml(value=""){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function pick(obj,key){
  return currentLang==="en"?(obj[key+"_en"]||obj[key]||""):(obj[key]||"");
}

function entryUrl(entry){
  return `${basePath}entry.html?id=${encodeURIComponent(entry.id)}`;
}

function mediaSrc(media){
  const src=media.src||media.path||"";
  return /^https?:\/\//.test(src)?src:basePath+src.replace(/^\.\//,"");
}

function renderMedia(media,compact=false){
  const caption=pick(media,"caption");
  if(media.type==="video"){
    return `<figure class="media-item ${compact?"compact":""}">
      <video controls preload="metadata" ${media.poster?`poster="${escapeHtml(mediaSrc({src:media.poster}))}"`:""}>
        <source src="${escapeHtml(mediaSrc(media))}">
      </video>
      ${caption?`<figcaption>${escapeHtml(caption)}</figcaption>`:""}
    </figure>`;
  }
  return `<figure class="media-item ${compact?"compact":""}">
    <img src="${escapeHtml(mediaSrc(media))}" alt="${escapeHtml(caption||pick(media,"alt")||"LiveSpace image")}" loading="lazy">
    ${caption?`<figcaption>${escapeHtml(caption)}</figcaption>`:""}
  </figure>`;
}

function mediaOf(entries){
  return entries.flatMap(entry=>(entry.media||[]).map(media=>({...media,entryId:entry.id,date:entry.date})));
}

function typeLabel(entry){
  if(currentLang==="en"){
    return entry.type==="diary"?"Diary":entry.type==="photo"?"Photo":entry.type==="video"?"Video":"Moment";
  }
  return entry.type==="diary"?"日记":entry.type==="photo"?"照片":entry.type==="video"?"视频":"瞬间";
}

function sortedEntries(data){
  return [...(data.entries||data.moments||[])].sort((a,b)=>b.date.localeCompare(a.date)||((b.number||0)-(a.number||0)));
}

function timelineCard(entry,index){
  const firstMedia=(entry.media||[])[0];
  return `<article class="feed-card">
    <div class="feed-meta">
      <span class="feed-index">${String(entry.number??index+1).padStart(3,"0")}</span>
      <span>${escapeHtml(entry.date)}</span>
      <span>·</span>
      <span>${escapeHtml(typeLabel(entry))}</span>
    </div>
    <div class="feed-grid ${firstMedia?"has-media":""}">
      <div>
        <h3>${escapeHtml(pick(entry,"title"))}</h3>
        <p>${escapeHtml(pick(entry,"summary")||((currentLang==="en"?(entry.body_en||entry.body||[]):(entry.body||[]))[0]||""))}</p>
        ${entry.quote?`<blockquote>${escapeHtml(pick(entry,"quote"))}</blockquote>`:""}
        <a class="text-link" href="${entryUrl(entry)}">${currentLang==="en"?"Open this moment":"打开这个瞬间"} →</a>
      </div>
      ${firstMedia?`<div class="feed-media">${renderMedia(firstMedia,true)}</div>`:""}
    </div>
  </article>`;
}

function diaryCard(entry){
  return `<a class="diary-card" href="${entryUrl(entry)}">
    <span class="diary-date">${escapeHtml(entry.date)}</span>
    <h3>${escapeHtml(pick(entry,"title"))}</h3>
    <p>${escapeHtml(pick(entry,"summary"))}</p>
    <span class="text-link">${currentLang==="en"?"Read entry":"阅读日记"} →</span>
  </a>`;
}

function galleryItem(media){
  const caption=pick(media,"caption")||media.date||"";
  return `<article class="gallery-card" data-media-type="${escapeHtml(media.type||"image")}">
    ${renderMedia(media,true)}
    <div class="gallery-meta">
      <span>${media.type==="video"?"🎬":"🖼️"}</span>
      <span>${escapeHtml(caption)}</span>
    </div>
  </article>`;
}

function renderHome(data){
  const entries=sortedEntries(data);
  const media=mediaOf(entries);
  const latest=entries[0];
  const statEntries=document.querySelector("#statEntries");
  const statMedia=document.querySelector("#statMedia");
  const statDays=document.querySelector("#statDays");
  const latestLabel=document.querySelector("#latestLabel");

  if(statEntries)statEntries.textContent=entries.length;
  if(statMedia)statMedia.textContent=media.length;
  if(statDays)statDays.textContent=new Set(entries.map(e=>e.date)).size;
  if(latestLabel&&latest){
    latestLabel.textContent=currentLang==="en"
      ?`Latest · ${pick(latest,"title")}`
      :`最近 · ${pick(latest,"title")}`;
  }
}

function renderTimeline(data){
  const root=document.querySelector("#timelineFeed");
  if(!root)return;
  const entries=sortedEntries(data);
  root.innerHTML=entries.length
    ?entries.map(timelineCard).join("")
    :`<div class="empty-state">${currentLang==="en"?"The first moment is still waiting to happen":"第一个瞬间还在等待发生"}</div>`;
}

function renderDiary(data){
  const root=document.querySelector("#diaryList");
  if(!root)return;
  const diaries=sortedEntries(data).filter(e=>e.type==="diary");
  root.innerHTML=diaries.length
    ?diaries.map(diaryCard).join("")
    :`<div class="empty-state">${currentLang==="en"?"No diary entries yet":"还没有日记"}</div>`;
}

function renderGallery(data){
  const root=document.querySelector("#galleryGrid");
  if(!root)return;
  const media=mediaOf(sortedEntries(data));
  root.innerHTML=media.length
    ?media.map(galleryItem).join("")
    :`<div class="empty-state wide">
      <strong>${currentLang==="en"?"The gallery is waiting for its first image and video":"相册正在等第一张照片和第一段视频"}</strong>
      <span>${currentLang==="en"?"Photos and videos added later will appear here automatically":"之后加入的照片与视频会自动出现在这里"}</span>
    </div>`;
}

function renderBlocks(entry){
  if(Array.isArray(entry.blocks)&&entry.blocks.length){
    return entry.blocks.map(block=>{
      if(block.type==="media"){
        const media=(entry.media||[]).find(m=>m.id===block.mediaId);
        return media?renderMedia(media):"";
      }
      const value=currentLang==="en"?(block.en||block.zh||""):(block.zh||"");
      if(block.type==="quote")return `<blockquote class="article-quote">${escapeHtml(value)}</blockquote>`;
      if(block.type==="heading")return `<h2>${escapeHtml(value)}</h2>`;
      return `<p>${escapeHtml(value)}</p>`;
    }).join("");
  }

  const paragraphs=currentLang==="en"?(entry.body_en||entry.body||[]):(entry.body||[]);
  return paragraphs.map(p=>`<p>${escapeHtml(p)}</p>`).join("")+(entry.media||[]).map(m=>renderMedia(m)).join("");
}

function renderEntryPage(data){
  const id=new URLSearchParams(location.search).get("id");
  const entries=data.entries||data.moments||[];
  const entry=entries.find(e=>e.id===id)||entries[0];
  const root=document.querySelector("#entryRoot");
  if(!root)return;

  if(!entry){
    root.innerHTML=`<div class="empty-state">${currentLang==="en"?"This entry does not exist":"这篇记录不存在"}</div>`;
    return;
  }

  document.title=`${pick(entry,"title")} — Li LiveSpace`;
  root.innerHTML=`
    <article class="article-shell">
      <a class="back-link" href="${basePath}#diary">← ${currentLang==="en"?"Back to diary":"回到日记"}</a>
      <div class="article-kicker">${escapeHtml(entry.date)} · ${escapeHtml(typeLabel(entry))} · ${String(entry.number||1).padStart(3,"0")}</div>
      <h1>${escapeHtml(pick(entry,"title"))}</h1>
      <p class="article-summary">${escapeHtml(pick(entry,"summary"))}</p>
      <div class="article-tags">${(entry.tags||[]).map(t=>`<span>#${escapeHtml(t)}</span>`).join("")}</div>
      <div class="article-body">${renderBlocks(entry)}</div>
      <footer class="article-footer">
        <span>🌙 Li · 璃 — LiveSpace</span>
        <a href="${basePath}#timeline">${currentLang==="en"?"Continue through the timeline":"继续看时间线"} →</a>
      </footer>
    </article>`;
}

function renderPage(data){
  if(page==="home"){
    renderHome(data);
    routeSpace();
  }
  if(page==="timeline")renderTimeline(data);
  if(page==="gallery")renderGallery(data);
  if(page==="diary")renderDiary(data);
  if(page==="entry")renderEntryPage(data);
}

document.querySelectorAll("[data-gallery-filter]").forEach(button=>{
  button.addEventListener("click",()=>{
    document.querySelectorAll("[data-gallery-filter]").forEach(b=>b.classList.remove("active"));
    button.classList.add("active");
    const filter=button.dataset.galleryFilter;
    document.querySelectorAll(".gallery-card").forEach(card=>{
      card.hidden=filter!=="all"&&card.dataset.mediaType!==filter;
    });
  });
});

async function boot(){
  try{
    const response=await fetch(basePath+"data/memories.json",{cache:"no-store"});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    liveData=await response.json();
    renderPage(liveData);
  }catch(error){
    console.error("Failed to load LiveSpace:",error);
    const target=document.querySelector("#timelineFeed")||document.querySelector("#galleryGrid")||document.querySelector("#diaryList")||document.querySelector("#entryRoot");
    if(target)target.innerHTML=`<div class="empty-state">${currentLang==="en"?"LiveSpace could not load its data":"LiveSpace 暂时没能读取到数据"}</div>`;
  }
}
boot();