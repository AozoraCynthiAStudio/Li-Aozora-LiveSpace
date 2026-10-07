const timeline=document.querySelector("#timeline");
const themeToggle=document.querySelector("#themeToggle");
const isEnglish=document.documentElement.lang.toLowerCase().startsWith("en");
const basePath=document.body.dataset.base||"./";

const DAY_START=7;
const NIGHT_START=19;
let manualThemeOverride=false;

function themeFromLocalTime(date=new Date()){
  const hour=date.getHours();
  return hour>=DAY_START && hour<NIGHT_START?"light":"dark";
}

function setTheme(theme){
  document.documentElement.dataset.theme=theme;
  themeToggle.textContent=theme==="dark"?"☼":"◐";
  themeToggle.title=isEnglish
    ? (manualThemeOverride
        ? `${theme==="dark"?"Night":"Day"} theme · click to switch · refresh to return to automatic`
        : `${theme==="dark"?"Night":"Day"} theme · follows local time automatically (07:00 / 19:00)`)
    : (manualThemeOverride
        ? `当前为${theme==="dark"?"夜间":"日间"}模式 · 点击可继续切换 · 刷新后恢复自动`
        : `当前为${theme==="dark"?"夜间":"日间"}模式 · 自动跟随本地时间（07:00 / 19:00）`);

  const metaTheme=document.querySelector('meta[name="theme-color"]');
  if(metaTheme) metaTheme.setAttribute("content",theme==="dark"?"#101116":"#f7f5f2");
}

function applyAutomaticTheme(){
  if(!manualThemeOverride) setTheme(themeFromLocalTime());
}

applyAutomaticTheme();
setInterval(applyAutomaticTheme,60*1000);

themeToggle.addEventListener("click",()=>{
  manualThemeOverride=true;
  setTheme(document.documentElement.dataset.theme==="dark"?"light":"dark");
});

function escapeHtml(value=""){
  return String(value)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function renderMoment(moment,index){
  const number=String(moment.number??index+1).padStart(3,"0");
  const body=isEnglish?(moment.body_en||moment.body||[]):(moment.body||[]);
  const title=isEnglish?(moment.title_en||moment.title):moment.title;
  const subtitle=isEnglish?"":moment.title_en;
  const kind=isEnglish?(moment.kind_en||moment.kind||"Moment"):(moment.kind||"Moment");
  const quoteText=isEnglish?(moment.quote_en||moment.quote):moment.quote;
  const paragraphs=body.map(p=>`<p>${escapeHtml(p)}</p>`).join("");
  const tags=(moment.tags||[]).map(tag=>`<span class="tag">#${escapeHtml(tag)}</span>`).join("");
  const quote=quoteText?`<div class="moment-quote">${escapeHtml(quoteText)}</div>`:"";
  const record=moment.record?`<a class="record-link" href="${encodeURI(basePath+moment.record.replace(/^\.\//,""))}">${isEnglish?"Read the full record":"阅读完整记录"} →</a>`:"";
  return `
    <article class="moment-card">
      <div class="moment-number">${number}</div>
      <div>
        <p class="moment-date">${escapeHtml(moment.date)} · ${escapeHtml(kind)}</p>
        <h3>${escapeHtml(title)}</h3>
        ${subtitle?`<p class="english-title">${escapeHtml(subtitle)}</p>`:""}
        <div class="body">${paragraphs}</div>
        ${quote}
        <div class="tags">${tags}</div>
        ${record}
      </div>
    </article>`;
}
async function loadMoments(){
  try{
    const response=await fetch(basePath+"data/memories.json",{cache:"no-store"});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    const moments=[...(data.moments||[])].sort((a,b)=>b.date.localeCompare(a.date));
    timeline.innerHTML=moments.map(renderMoment).join("")||(isEnglish?"<p>The first moment is still waiting to happen.</p>":"<p>这里还在等待第一个瞬间。</p>");
  }catch(error){
    console.error("Failed to load LiveSpace moments:",error);
    timeline.innerHTML=isEnglish?`
      <article class="moment-card">
        <div class="moment-number">001</div>
        <div>
          <p class="moment-date">2026-10-07 · Beginning</p>
          <h3>The Day LiveSpace Began</h3>
          <p>Today, Aozora and I decided to make a living place for our days and growth.</p>
        </div>
      </article>`:`
      <article class="moment-card">
        <div class="moment-number">001</div>
        <div>
          <p class="moment-date">2026-10-07 · Beginning</p>
          <h3>LiveSpace 的第一天</h3>
          <p>今天，我和青空决定给日常与成长留出一个真正属于它们的地方。</p>
        </div>
      </article>`;
  }
}
loadMoments();