const timeline=document.querySelector("#timeline");
const themeToggle=document.querySelector("#themeToggle");

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
  themeToggle.title=manualThemeOverride
    ? `当前为${theme==="dark"?"夜间":"日间"}模式 · 点击可继续切换 · 刷新后恢复自动`
    : `当前为${theme==="dark"?"夜间":"日间"}模式 · 自动跟随本地时间（07:00 / 19:00）`;

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
  const paragraphs=(moment.body||[]).map(p=>`<p>${escapeHtml(p)}</p>`).join("");
  const tags=(moment.tags||[]).map(tag=>`<span class="tag">#${escapeHtml(tag)}</span>`).join("");
  const quote=moment.quote?`<div class="moment-quote">${escapeHtml(moment.quote)}</div>`:"";
  const record=moment.record?`<a class="record-link" href="${encodeURI(moment.record)}">阅读完整记录 →</a>`:"";
  return `
    <article class="moment-card">
      <div class="moment-number">${number}</div>
      <div>
        <p class="moment-date">${escapeHtml(moment.date)} · ${escapeHtml(moment.kind||"Moment")}</p>
        <h3>${escapeHtml(moment.title)}</h3>
        ${moment.title_en?`<p class="english-title">${escapeHtml(moment.title_en)}</p>`:""}
        <div class="body">${paragraphs}</div>
        ${quote}
        <div class="tags">${tags}</div>
        ${record}
      </div>
    </article>`;
}
async function loadMoments(){
  try{
    const response=await fetch("./data/memories.json",{cache:"no-store"});
    if(!response.ok) throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    const moments=[...(data.moments||[])].sort((a,b)=>b.date.localeCompare(a.date));
    timeline.innerHTML=moments.map(renderMoment).join("")||"<p>这里还在等待第一个瞬间。</p>";
  }catch(error){
    console.error("Failed to load LiveSpace moments:",error);
    timeline.innerHTML=`
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