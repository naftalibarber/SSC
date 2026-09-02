(() => {
  'use strict';

  const scrambleEl=document.getElementById('scramble');
  const prevButton=document.getElementById('prevScramble');
  if(!scrambleEl||!prevButton)return;

  const backStacks=new Map();
  const currentByEvent=new Map();
  let suppressObserver=false;

  function normalizeEventId(value){return window.SSCScrambles?.normalizeEventId?.(value)||String(value||'333');}
  function currentEvent(){return normalizeEventId(scrambleEl.dataset.eventId||window.SSCTimerEvents?.getCurrent?.()||'333');}
  function stackFor(eventId){if(!backStacks.has(eventId))backStacks.set(eventId,[]);return backStacks.get(eventId);}
  function updateButton(eventId=currentEvent()){prevButton.disabled=stackFor(eventId).length===0;}
  function isTransientText(value){return value.startsWith('Unable to generate scramble')||value.startsWith('לא ניתן ליצור ערבוב')||value==='Generating scramble…'||value==='יוצר ערבוב…';}

  function setScrambleText(value){
    suppressObserver=true;
    scrambleEl.textContent=value;
    queueMicrotask(()=>{suppressObserver=false;});
  }

  const observer=new MutationObserver(()=>{
    const eventId=currentEvent();
    if(suppressObserver||scrambleEl.dataset.scrambleTransient==='true'){updateButton(eventId);return;}
    const next=scrambleEl.textContent.trim();
    if(!next||isTransientText(next)){updateButton(eventId);return;}
    const current=currentByEvent.get(eventId)||'';
    if(next===current){updateButton(eventId);return;}
    if(current)stackFor(eventId).push(current);
    currentByEvent.set(eventId,next);
    updateButton(eventId);
  });
  observer.observe(scrambleEl,{childList:true,characterData:true,subtree:true});

  const initial=scrambleEl.textContent.trim();
  if(scrambleEl.dataset.scrambleTransient!=='true'&&initial&&!isTransientText(initial))currentByEvent.set(currentEvent(),initial);

  prevButton.addEventListener('click',event=>{
    const eventId=currentEvent();
    const stack=stackFor(eventId);
    if(!stack.length)return;
    event.preventDefault();event.stopPropagation();
    const previous=stack.pop();
    currentByEvent.set(eventId,previous);
    scrambleEl.dataset.eventId=eventId;
    scrambleEl.dataset.scrambleTransient='false';
    setScrambleText(previous);
    updateButton(eventId);
    window.dispatchEvent(new CustomEvent('ssc-scramble-history-select',{detail:{scramble:previous,eventId}}));
  },true);

  window.addEventListener('ssc-event-change',event=>{
    const eventId=normalizeEventId(event.detail?.eventId||currentEvent());
    scrambleEl.dataset.eventId=eventId;
    updateButton(eventId);
  });

  updateButton();
})();

(() => {
  'use strict';
  const historyList=document.getElementById('historyList');
  const historySettingsButton=document.getElementById('historySettingsButton');
  const historySettings=document.getElementById('historySettings');
  function isMbld(){return window.SSCTimerEvents?.getCurrent?.()==='333mbf';}
  function syncMbldHistoryGuards(){
    const active=isMbld();
    if(historySettingsButton)historySettingsButton.hidden=active;
    if(historySettings&&active)historySettings.hidden=true;
    if(active)historyList?.querySelectorAll('[data-mbld-delete]').forEach(button=>button.remove());
  }
  const observer=historyList?new MutationObserver(syncMbldHistoryGuards):null;
  observer?.observe(historyList,{childList:true,subtree:true});
  window.addEventListener('ssc-event-change',syncMbldHistoryGuards);
  window.addEventListener('ssc-mbld-result-saved',syncMbldHistoryGuards);
  syncMbldHistoryGuards();
})();

(() => {
  'use strict';

  const EVENT_ID='333mbf';
  const scrambleEl=document.getElementById('scramble');
  const mainPreview=document.getElementById('cubePreview2D');
  const scrambleBar=scrambleEl?.closest('.scramble-bar');
  const scrambleCenter=scrambleEl?.closest('.scramble-center')||scrambleEl?.parentElement;
  if(!scrambleEl||!scrambleCenter)return;

  let previewObserver=null;
  let renderSequence=0;

  function currentEvent(){return window.SSCTimerEvents?.getCurrent?.()||scrambleEl.dataset.eventId||'';}
  function isMbld(eventId=currentEvent()){return String(eventId||'').toLowerCase()===EVENT_ID;}

  function injectStyles(){
    if(document.getElementById('sscMbldScrambleListStyles'))return;
    const style=document.createElement('style');
    style.id='sscMbldScrambleListStyles';
    style.textContent=`
      .scramble-bar.ssc-mbld-list-active{
        height:auto!important;
        min-height:118px!important;
        max-height:none!important;
        align-items:start!important;
        grid-template-columns:42px minmax(0,1fr) 46px!important;
        padding-top:10px!important;
        padding-bottom:10px!important;
      }
      .scramble-bar.ssc-mbld-list-active .scramble-center{
        width:100%!important;
        min-width:0!important;
        align-self:stretch!important;
        padding:0!important;
      }
      .scramble-bar.ssc-mbld-list-active .scramble-title{
        margin:0 0 8px!important;
      }
      .scramble-bar.ssc-mbld-list-active #prevScramble{
        visibility:hidden!important;
      }
      .scramble-bar.ssc-mbld-list-active .scramble-side{
        width:46px!important;
        min-width:46px!important;
        align-self:start!important;
      }
      .ssc-mbld-source-hidden{display:none!important}
      .ssc-mbld-scramble-list{
        direction:ltr!important;
        width:100%!important;
        max-height:min(58vh,620px)!important;
        overflow:auto!important;
        box-sizing:border-box!important;
        display:grid!important;
        gap:8px!important;
        padding:2px 5px 3px 2px!important;
        scrollbar-gutter:stable;
      }
      .ssc-mbld-scramble-list[hidden]{display:none!important}
      .ssc-mbld-scramble-item{
        direction:ltr!important;
        display:grid!important;
        grid-template-columns:auto minmax(0,1fr) 144px!important;
        align-items:center!important;
        gap:10px!important;
        min-width:0!important;
        box-sizing:border-box!important;
        padding:7px 8px!important;
        border:1px solid var(--border)!important;
        border-radius:10px!important;
        background:var(--card-solid,var(--card,#fff))!important;
      }
      .ssc-mbld-scramble-index{
        align-self:start!important;
        padding-top:3px!important;
        font-family:'Share Tech Mono',ui-monospace,SFMono-Regular,Consolas,monospace!important;
        font-size:clamp(15px,1.15vw,18px)!important;
        font-weight:900!important;
        color:var(--text)!important;
        white-space:nowrap!important;
      }
      .ssc-mbld-scramble-text{
        direction:ltr!important;
        unicode-bidi:plaintext!important;
        text-align:left!important;
        min-width:0!important;
        font-family:'Share Tech Mono',ui-monospace,SFMono-Regular,Consolas,monospace!important;
        font-size:clamp(14px,1.08vw,17px)!important;
        font-weight:700!important;
        line-height:1.42!important;
        word-spacing:3px!important;
        overflow-wrap:anywhere!important;
        color:var(--text)!important;
      }
      .ssc-mbld-item-preview.cube-preview-card{
        direction:ltr!important;
        width:144px!important;
        min-width:144px!important;
        max-width:144px!important;
        height:96px!important;
        min-height:96px!important;
        max-height:96px!important;
        padding:4px!important;
        margin:0!important;
        cursor:default!important;
        box-sizing:border-box!important;
      }
      .ssc-mbld-item-preview[data-preview-pending="true"]::before{
        content:'3×3';
        color:var(--muted);
        font-size:12px;
        font-weight:800;
      }
      .ssc-mbld-item-preview[data-preview-error="true"]::before{
        content:'Preview unavailable';
        color:var(--muted);
        font-size:10px;
        text-align:center;
      }
      @media(max-width:760px){
        .scramble-bar.ssc-mbld-list-active{grid-template-columns:34px minmax(0,1fr) 38px!important;padding-inline:8px!important;gap:6px!important}
        .scramble-bar.ssc-mbld-list-active .scramble-side{width:38px!important;min-width:38px!important}
        .ssc-mbld-scramble-item{grid-template-columns:auto minmax(0,1fr) 112px!important;gap:7px!important;padding:6px!important}
        .ssc-mbld-item-preview.cube-preview-card{width:112px!important;min-width:112px!important;max-width:112px!important;height:76px!important;min-height:76px!important;max-height:76px!important}
      }
      @media(max-width:520px){
        .ssc-mbld-scramble-item{grid-template-columns:auto minmax(0,1fr)!important}
        .ssc-mbld-item-preview.cube-preview-card{grid-column:2;width:112px!important;justify-self:start!important}
        .ssc-mbld-scramble-list{max-height:min(61vh,590px)!important}
      }
    `;
    document.head.appendChild(style);
  }

  function ensureList(){
    let list=document.getElementById('sscMbldScrambleList');
    if(list)return list;
    list=document.createElement('div');
    list.id='sscMbldScrambleList';
    list.className='ssc-mbld-scramble-list';
    list.hidden=true;
    list.setAttribute('role','list');
    list.setAttribute('aria-label','MBLD scrambles');
    scrambleEl.insertAdjacentElement('afterend',list);
    return list;
  }

  function disconnectPreviewObserver(){
    previewObserver?.disconnect?.();
    previewObserver=null;
  }

  function setActive(active){
    injectStyles();
    const list=ensureList();
    scrambleBar?.classList.toggle('ssc-mbld-list-active',Boolean(active));
    scrambleEl.classList.toggle('ssc-mbld-source-hidden',Boolean(active));
    if(mainPreview)mainPreview.hidden=Boolean(active);
    if(!active){
      disconnectPreviewObserver();
      list.hidden=true;
      list.replaceChildren();
    }
  }

  function renderPreview(container,scramble,index){
    if(!(container instanceof Element)||container.dataset.previewRendered==='true')return;
    container.dataset.previewRendered='true';
    container.dataset.previewPending='false';
    const idPrefix=`ssc-mbld-${++renderSequence}-${index+1}`;
    try{
      if(window.SSCPreviewV1?.render){
        window.SSCPreviewV1.render(container,scramble,'333',{strict:true,idPrefix});
      }else if(window.SSCCubePreview?.render){
        Promise.resolve(window.SSCCubePreview.render(container,scramble,'333')).catch(error=>{
          console.error('[SSC MBLD] Per-scramble preview failed.',error);
          container.dataset.previewError='true';
        });
      }else{
        container.dataset.previewError='true';
      }
      window.SSCPreviewSizing?.scheduleFit?.(container);
    }catch(error){
      console.error('[SSC MBLD] Per-scramble preview failed.',error);
      container.replaceChildren();
      container.dataset.previewError='true';
    }
  }

  function schedulePreviews(list,cards){
    disconnectPreviewObserver();
    cards.forEach((card,index)=>{
      if(index<4)renderPreview(card,card.dataset.scramble||'',index);
    });
    const remaining=cards.slice(4);
    if(!remaining.length)return;
    if(!('IntersectionObserver' in window)){
      remaining.forEach((card,index)=>renderPreview(card,card.dataset.scramble||'',index+4));
      return;
    }
    previewObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(!entry.isIntersecting)return;
        const card=entry.target;
        const index=Number(card.dataset.scrambleIndex)||0;
        renderPreview(card,card.dataset.scramble||'',index);
        previewObserver?.unobserve?.(card);
      });
    },{root:list,rootMargin:'220px 0px'});
    remaining.forEach(card=>previewObserver.observe(card));
  }

  function renderScrambleList(scrambles){
    if(!Array.isArray(scrambles)||!scrambles.length)return;
    setActive(true);
    const list=ensureList();
    list.replaceChildren();
    list.hidden=false;
    const cards=[];
    const fragment=document.createDocumentFragment();

    scrambles.forEach((raw,index)=>{
      const scramble=String(raw||'').trim();
      const item=document.createElement('div');
      item.className='ssc-mbld-scramble-item';
      item.setAttribute('role','listitem');
      item.dataset.scrambleIndex=String(index+1);

      const number=document.createElement('div');
      number.className='ssc-mbld-scramble-index';
      number.textContent=`${index+1})`;

      const textEl=document.createElement('div');
      textEl.className='ssc-mbld-scramble-text';
      textEl.textContent=scramble;

      const preview=document.createElement('div');
      preview.className='cube-preview-card ssc-mbld-item-preview';
      preview.dataset.scramble=scramble;
      preview.dataset.scrambleIndex=String(index);
      preview.dataset.previewPending='true';
      preview.setAttribute('aria-label',`3x3 preview for MBLD scramble ${index+1}`);

      item.append(number,textEl,preview);
      fragment.appendChild(item);
      cards.push(preview);
    });

    list.appendChild(fragment);
    list.scrollTop=0;
    schedulePreviews(list,cards);
  }

  window.addEventListener('ssc-mbld-scramble',event=>{
    const scrambles=event.detail?.scrambles;
    if(Array.isArray(scrambles)&&scrambles.length)renderScrambleList(scrambles);
  });

  window.addEventListener('ssc-event-change',event=>{
    const eventId=event.detail?.eventId||currentEvent();
    setActive(isMbld(eventId));
  });

  if(isMbld())setActive(true);
})();
