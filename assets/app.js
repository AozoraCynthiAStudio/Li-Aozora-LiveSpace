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

const validViews=new Set(["home","timeline","gallery","diary"]);

function routeSpace(){
  if(page!=="home")return;
  const requested=(location.hash||"#home").slice(1);
  const aboutTarget=requested==="home-about";
  const view=aboutTarget?"home":(validViews.has(requested)?requested:"home");

  document.querySelectorAll("[data-view]").forEach(section=>{
    section.hidden=section.dataset.view!==view;
  });

  document.querySelectorAll("[data-mobile-view]").forEach(link=>{
    const active=aboutTarget
      ?link.dataset.mobileView==="about"
      :link.dataset.mobileView===view;
    if(active)link.setAttribute("aria-current","page");
    else link.removeAttribute("aria-current");
  });

  if(liveData){
    if(view==="home")renderHome(liveData);
    if(view==="timeline")renderTimeline(liveData);
    if(view==="gallery")renderGallery(liveData);
    if(view==="diary")renderDiary(liveData);
    requestAnimationFrame(()=>{hydrateVideoPreviews();hydrateImageViewer();});
  }

  requestAnimationFrame(()=>{
    if(aboutTarget){
      document.querySelector("#home-about")?.scrollIntoView({behavior:"auto",block:"start"});
    }else{
      window.scrollTo({top:0,left:0,behavior:"auto"});
    }
  });
}

window.addEventListener("hashchange",routeSpace);

function arrowIcon(direction="right"){
  return `<span class="nav-petal nav-petal-${direction}" aria-hidden="true"></span>`;
}

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
  const src=escapeHtml(mediaSrc(media));
  const previewTime=Number(media.preview_time);
  const useLivePreview=media.type==="video"&&Number.isFinite(previewTime)&&previewTime>0;
  const poster=!useLivePreview&&media.poster?escapeHtml(mediaSrc({src:media.poster})):"";
  const backdrop=useLivePreview?"":(poster||src);

  if(media.type==="video"){
    return `<figure class="media-item ${compact?"compact":""}">
      <div class="media-stage">
        ${backdrop?`<img class="media-stage-backdrop" src="${backdrop}" alt="" aria-hidden="true" loading="lazy">`:""}
        <video class="media-visual${useLivePreview?" live-preview":""}" controls playsinline preload="${useLivePreview?"auto":"metadata"}" ${poster?`poster="${poster}"`:""} ${useLivePreview?`data-preview-time="${previewTime}"`:""}>
          <source src="${src}" type="video/mp4">
        </video>
      </div>
      ${!compact&&caption?`<figcaption>${escapeHtml(caption)}</figcaption>`:""}
      ${!compact?renderMemoryNote(media,false):""}
    </figure>`;
  }

  const alt=pick(media,"alt")||caption||(currentLang==="en"?"LiveSpace image":"LiveSpace 照片");
  const openLabel=currentLang==="en"?"Open full image":"放大查看照片";
  const zoomHint=currentLang==="en"?"View larger":"查看大图";
  return `<figure class="media-item media-item-image ${compact?"compact":""}">
    <button class="media-image-button" type="button"
      data-image-src="${escapeHtml(mediaSrc({src:media.full_src||media.src||media.path}))}"
      data-image-alt="${escapeHtml(alt)}"
      data-image-caption="${escapeHtml(caption||"")}"
      aria-label="${escapeHtml(openLabel)}">
      <img class="media-image-natural" src="${src}" alt="${escapeHtml(alt)}" loading="lazy">
      <span class="media-zoom-hint" aria-hidden="true">↗ <span>${zoomHint}</span></span>
    </button>
    ${!compact&&caption?`<figcaption>${escapeHtml(caption)}</figcaption>`:""}
    ${!compact?renderMemoryNote(media,false):""}
  </figure>`;
}

let imageLightbox=null;
let imageLightboxScale=null;
let imageLightboxTrigger=null;

function ensureImageLightbox(){
  if(imageLightbox)return imageLightbox;
  const viewer=document.createElement("div");
  viewer.className="image-lightbox";
  viewer.hidden=true;
  viewer.setAttribute("role","dialog");
  viewer.setAttribute("aria-modal","true");
  viewer.setAttribute("aria-label",currentLang==="en"?"Photo viewer":"照片查看器");
  viewer.innerHTML=`
    <div class="image-lightbox-toolbar" aria-label="Image zoom controls">
      <button class="image-lightbox-tool" type="button" data-viewer-action="out" aria-label="Zoom out">−</button>
      <button class="image-lightbox-tool image-lightbox-level" type="button" data-viewer-action="fit">FIT</button>
      <button class="image-lightbox-tool" type="button" data-viewer-action="actual" aria-label="Actual size">1:1</button>
      <button class="image-lightbox-tool" type="button" data-viewer-action="in" aria-label="Zoom in">＋</button>
    </div>
    <button class="image-lightbox-close" type="button" aria-label="Close image viewer">×</button>
    <div class="image-lightbox-scroller">
      <figure>
        <img class="image-lightbox-image" alt="">
        <figcaption class="image-lightbox-caption"></figcaption>
        <small class="image-lightbox-tip"></small>
      </figure>
    </div>`;
  document.body.appendChild(viewer);

  const image=viewer.querySelector(".image-lightbox-image");
  const tip=viewer.querySelector(".image-lightbox-tip");
  const level=viewer.querySelector(".image-lightbox-level");
  const scroller=viewer.querySelector(".image-lightbox-scroller");

  const labels=()=>currentLang==="en"
    ?{fit:"FIT",hint:"Tap image for 1:1 · use +/− to zoom",actual:"100% · tap image to fit"}
    :{fit:"FIT",hint:"点图片切到 1:1 · 也可以用 ＋/− 放大",actual:"100% · 再点图片适应屏幕"};

  const updateLevel=()=>{
    if(imageLightboxScale===null){
      level.textContent=labels().fit;
      tip.textContent=labels().hint;
    }else{
      level.textContent=`${Math.round(imageLightboxScale*100)}%`;
      tip.textContent=imageLightboxScale===1?labels().actual:(currentLang==="en"?"Use +/− to keep zooming":"继续用 ＋/− 调整大小");
    }
  };

  const centerScroll=()=>{
    requestAnimationFrame(()=>{
      scroller.scrollLeft=Math.max(0,(scroller.scrollWidth-scroller.clientWidth)/2);
      scroller.scrollTop=Math.max(0,(scroller.scrollHeight-scroller.clientHeight)/2);
    });
  };

  const fit=()=>{
    imageLightboxScale=null;
    viewer.classList.remove("is-zoomed");
    image.style.width="";
    image.style.maxWidth="";
    image.style.maxHeight="";
    updateLevel();
    scroller.scrollTo({top:0,left:0,behavior:"auto"});
  };

  const zoomTo=scale=>{
    if(!image.naturalWidth||!image.naturalHeight)return;
    imageLightboxScale=Math.min(4,Math.max(.25,scale));
    viewer.classList.add("is-zoomed");
    image.style.maxWidth="none";
    image.style.maxHeight="none";
    image.style.width=`${Math.round(image.naturalWidth*imageLightboxScale)}px`;
    updateLevel();
    centerScroll();
  };

  const actual=()=>zoomTo(1);
  const zoomIn=()=>zoomTo(imageLightboxScale===null?1:Math.min(4,imageLightboxScale*1.5));
  const zoomOut=()=>{
    if(imageLightboxScale===null)return;
    const next=imageLightboxScale/1.5;
    zoomTo(next);
  };

  const close=()=>{
    viewer.hidden=true;
    fit();
    document.body.classList.remove("lightbox-open");
    image.removeAttribute("src");
    imageLightboxTrigger?.focus({preventScroll:true});
  };

  viewer.querySelector(".image-lightbox-close").addEventListener("click",close);
  viewer.querySelector('[data-viewer-action="fit"]').addEventListener("click",fit);
  viewer.querySelector('[data-viewer-action="actual"]').addEventListener("click",actual);
  viewer.querySelector('[data-viewer-action="in"]').addEventListener("click",zoomIn);
  viewer.querySelector('[data-viewer-action="out"]').addEventListener("click",zoomOut);

  viewer.addEventListener("click",event=>{
    if(event.target===viewer||event.target===scroller)close();
  });
  let drag=null;
  let dragged=false;
  image.draggable=false;
  scroller.addEventListener("pointerdown",event=>{
    if(event.pointerType!=="mouse"||event.button!==0||imageLightboxScale===null)return;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:scroller.scrollLeft,top:scroller.scrollTop};
    dragged=false;
  });
  scroller.addEventListener("pointermove",event=>{
    if(!drag||event.pointerId!==drag.id)return;
    const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
    if(!dragged&&Math.hypot(dx,dy)<5)return;
    dragged=true;
    scroller.setPointerCapture(event.pointerId);
    scroller.scrollLeft=drag.left-dx;
    scroller.scrollTop=drag.top-dy;
  });
  const endDrag=()=>{drag=null;};
  scroller.addEventListener("pointerup",endDrag);
  scroller.addEventListener("pointercancel",endDrag);
  scroller.addEventListener("click",event=>{
    if(!dragged)return;
    dragged=false;
    event.preventDefault();
    event.stopImmediatePropagation();
  },true);
  image.addEventListener("click",event=>{
    event.stopPropagation();
    if(imageLightboxScale===null)actual();
    else fit();
  });
  image.addEventListener("load",()=>fit());
  document.addEventListener("keydown",event=>{
    if(viewer.hidden)return;
    if(event.key==="Escape")close();
    if(event.key==="+"||event.key==="=")zoomIn();
    if(event.key==="-")zoomOut();
    if(event.key==="0")fit();
  });

  imageLightbox=viewer;
  return viewer;
}

function openImageLightbox(button){
  const viewer=ensureImageLightbox();
  const image=viewer.querySelector(".image-lightbox-image");
  const caption=viewer.querySelector(".image-lightbox-caption");
  imageLightboxTrigger=button;
  imageLightboxScale=null;
  image.src=button.dataset.imageSrc||"";
  image.alt=button.dataset.imageAlt||"";
  caption.textContent=button.dataset.imageCaption||"";
  caption.hidden=!caption.textContent;
  viewer.hidden=false;
  document.body.classList.add("lightbox-open");
  viewer.querySelector(".image-lightbox-close").focus({preventScroll:true});
}

/* Event delegation keeps gallery images clickable even after the SPA room re-renders. */
document.addEventListener("click",event=>{
  const button=event.target.closest?.(".media-image-button");
  if(!button)return;
  event.preventDefault();
  event.stopPropagation();
  openImageLightbox(button);
});

function hydrateImageViewer(){
  /* Kept as a no-op for compatibility with existing render hooks. */
}

function hydrateVideoPreviews(root=document){
  root.querySelectorAll("video[data-preview-time]").forEach(video=>{
    if(video.dataset.previewBound==="1")return;
    video.dataset.previewBound="1";
    const requested=Number(video.dataset.previewTime);
    if(!Number.isFinite(requested)||requested<=0)return;

    const seekPreview=()=>{
      if(!Number.isFinite(video.duration)||video.duration<=0)return;
      const target=Math.min(requested,Math.max(0,video.duration-.08));
      video.dataset.previewActive="1";
      try{video.currentTime=target;}catch(_){}
    };

    const reveal=()=>{
      video.classList.add("preview-ready");
      video.pause();
    };

    if(video.readyState>=1)seekPreview();
    else video.addEventListener("loadedmetadata",seekPreview,{once:true});

    video.addEventListener("seeked",reveal,{once:true});
    video.addEventListener("play",()=>{
      if(video.dataset.previewActive==="1"){
        video.dataset.previewActive="0";
        try{video.currentTime=0;}catch(_){}
      }
    },{once:true});
  });
}

function renderMemoryNote(media,compact=true){
  const generator=pick(media,"generator");
  const prompt=pick(media,"prompt_note");
  const reason=pick(media,"keep_reason");
  if(!generator&&!prompt&&!reason)return "";
  const labels=currentLang==="en"
    ?{title:"Memory note",model:"Made with",prompt:"Prompt note",reason:"Why I kept it"}
    :{title:"这段记忆",model:"生成工具",prompt:"Prompt 摘要",reason:"为什么留下"};
  const rows=[
    generator?`<div><dt>${labels.model}</dt><dd>${escapeHtml(generator)}</dd></div>`:"",
    prompt?`<div><dt>${labels.prompt}</dt><dd>${escapeHtml(prompt)}</dd></div>`:"",
    reason?`<div><dt>${labels.reason}</dt><dd>${escapeHtml(reason)}</dd></div>`:""
  ].join("");
  if(compact){
    return `<details class="memory-note">
      <summary>${labels.title}<span>＋</span></summary>
      <dl>${rows}</dl>
    </details>`;
  }
  return `<aside class="memory-note memory-note-open">
    <strong>${labels.title}</strong>
    <dl>${rows}</dl>
  </aside>`;
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

function renderTimelinePreview(media,entry){
  const src=media.type==="video"
    ?(media.poster?mediaSrc({src:media.poster}):"")
    :mediaSrc(media);
  const label=currentLang==="en"
    ?(media.type==="video"?"VIDEO MEMORY":"IMAGE MEMORY")
    :(media.type==="video"?"视频记忆":"影像记忆");

  if(!src)return `<a class="timeline-preview timeline-preview-empty" href="${entryUrl(entry)}">
    <span>${label}</span>
  </a>`;

  return `<a class="timeline-preview${media.type==="video"?"":" timeline-preview-photo"}" href="${entryUrl(entry)}" aria-label="${escapeHtml(pick(entry,"title"))}">
    ${media.type==="video"?`<img class="timeline-preview-backdrop" src="${escapeHtml(src)}" alt="" aria-hidden="true" loading="lazy">`:""}
    <img class="timeline-preview-image" src="${escapeHtml(src)}" alt="${escapeHtml(pick(media,"caption")||pick(entry,"title"))}" loading="lazy">
    <span class="timeline-preview-label">${label}</span>
  </a>`;
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
        <a class="text-link" href="${entryUrl(entry)}"><span>${currentLang==="en"?"Open this moment":"打开这个瞬间"}</span>${arrowIcon("right")}</a>
      </div>
      ${firstMedia?`<div class="feed-media">${renderTimelinePreview(firstMedia,entry)}</div>`:""}
    </div>
  </article>`;
}

function diaryCard(entry){
  return `<a class="diary-card" href="${entryUrl(entry)}">
    <span class="diary-date">${escapeHtml(entry.date)}</span>
    <h3>${escapeHtml(pick(entry,"title"))}</h3>
    <p>${escapeHtml(pick(entry,"summary"))}</p>
    <span class="text-link"><span>${currentLang==="en"?"Read entry":"阅读日记"}</span>${arrowIcon("right")}</span>
  </a>`;
}

function galleryItem(media){
  const caption=pick(media,"caption")||media.date||"";
  const kind=currentLang==="en"?(media.type==="video"?"VIDEO":"IMAGE"):(media.type==="video"?"视频":"照片");
  return `<article class="gallery-card" data-media-type="${escapeHtml(media.type||"image")}">
    ${renderMedia(media,true)}
    <div class="gallery-caption">
      <span class="gallery-kicker">${kind} · ${escapeHtml(media.date||"")}</span>
      <h3>${escapeHtml(caption)}</h3>
    </div>
    ${renderMemoryNote(media,true)}
  </article>`;
}

function renderHome(data){
  const entries=sortedEntries(data);
  const media=mediaOf(entries);
  const diaries=entries.filter(e=>e.type==="diary");
  const latest=entries[0];
  const statEntries=document.querySelector("#statEntries");
  const statMedia=document.querySelector("#statMedia");
  const statDays=document.querySelector("#statDays");
  const latestLabel=document.querySelector("#latestLabel");
  const recentTimeline=document.querySelector("#homeRecentTimeline");
  const galleryStat=document.querySelector("#homeGalleryStat");
  const diaryStat=document.querySelector("#homeDiaryStat");

  if(statEntries)statEntries.textContent=entries.length;
  if(statMedia)statMedia.textContent=media.length;
  if(statDays)statDays.textContent=new Set(entries.map(e=>e.date)).size;

  if(recentTimeline){
    const recent=entries.slice(0,3);
    recentTimeline.innerHTML=recent.map(entry=>`
      <li>
        <time>${escapeHtml(entry.date.replaceAll("-","."))}</time>
        <strong>${escapeHtml(pick(entry,"title"))}</strong>
      </li>`).join("");
  }

  if(galleryStat){
    galleryStat.textContent=currentLang==="en"
      ?`${String(media.length).padStart(2,"0")} VISUAL ${media.length===1?"MEMORY":"MEMORIES"}`
      :`${String(media.length).padStart(2,"0")} 段影像记忆`;
  }

  if(diaryStat){
    diaryStat.textContent=currentLang==="en"
      ?`${String(diaries.length).padStart(2,"0")} DIARY ${diaries.length===1?"ENTRY":"ENTRIES"}`
      :`${String(diaries.length).padStart(2,"0")} 篇日记`;
  }

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
      <a class="back-link" href="${basePath}#diary">${arrowIcon("left")}<span>${currentLang==="en"?"Back to diary":"回到日记"}</span></a>
      <div class="article-kicker">${escapeHtml(entry.date)} · ${escapeHtml(typeLabel(entry))} · ${String(entry.number||1).padStart(3,"0")}</div>
      <h1>${escapeHtml(pick(entry,"title"))}</h1>
      <p class="article-summary">${escapeHtml(pick(entry,"summary"))}</p>
      <div class="article-tags">${(entry.tags||[]).map(t=>`<span>#${escapeHtml(t)}</span>`).join("")}</div>
      <div class="article-body">${renderBlocks(entry)}</div>
      <footer class="article-footer">
        <span>🌙 Li · 璃 — LiveSpace</span>
        <a class="article-next" href="${basePath}#timeline"><span>${currentLang==="en"?"Continue through the timeline":"继续看时间线"}</span>${arrowIcon("right")}</a>
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
  requestAnimationFrame(()=>{hydrateVideoPreviews();hydrateImageViewer();});
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