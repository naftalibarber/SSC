(() => {
  'use strict';

  const PREVIEW_ID='cubePreview2D';
  const MBLD_EVENT='333mbf';
  const NATIVE_3D_THUMBNAIL_MIGRATION_KEY='sscNative3DThumbnailV2';
  const THUMBNAIL_DIMENSIONS=['display','width','min-width','height','min-height'];
  const watchedCards=new WeakSet();
  const verificationTokens=new WeakMap();
  const cardSnapshots=new WeakMap();
  let verificationSequence=0;
  let viewportListenersBound=false;

  function currentEvent(){
    return window.SSCTimerEvents?.getCurrent?.()
      || document.getElementById('eventSelect')?.value
      || '';
  }

  function isMbldPreviewCard(container){
    return container instanceof Element&&(
      container.classList.contains('ssc-mbld-view-preview')||
      Boolean(container.closest('#sscMbldViewList'))
    );
  }

  function shouldSuppressMainPreview(container){
    return container?.id===PREVIEW_ID && currentEvent()===MBLD_EVENT;
  }

  function forceSuppressed(container){
    if(!(container instanceof HTMLElement))return;
    container.style.setProperty('display','none','important');
    container.style.setProperty('visibility','hidden','important');
    container.style.setProperty('opacity','0','important');
    container.style.setProperty('pointer-events','none','important');
    container.style.setProperty('z-index','-1','important');
    container.setAttribute('aria-hidden','true');
  }

  function migrateToProfessionalTwistyPreview(){
    if(localStorage.getItem(NATIVE_3D_THUMBNAIL_MIGRATION_KEY)==='1')return;

    const settings=window.SSCPreviewSettings;
    if(!settings)return;

    try{
      const modeResult=settings.setMode?.('3d',{rerender:false});
      if(modeResult&&typeof modeResult.catch==='function')modeResult.catch(error=>console.warn('[SSC preview] Could not switch default preview to 3D.',error));
      settings.setInteractive?.(true);
      localStorage.setItem(NATIVE_3D_THUMBNAIL_MIGRATION_KEY,'1');
    }catch(error){
      console.warn('[SSC preview] Professional 3D migration failed.',error);
    }
  }

  function lockSmall3D(card){
    if(!(card instanceof HTMLElement)||shouldSuppressMainPreview(card)||!card.classList.contains('ssc-preview-mode-3d'))return;
    if(!card.classList.contains('ssc-preview-thumbnail-3d'))card.classList.add('ssc-preview-thumbnail-3d');
    const root=card.querySelector('.ssc-native-cube3d-root,.ssc-puzzle-3d-player');
    if(!(root instanceof HTMLElement))return;
    root.style.setProperty('pointer-events','none','important');
    root.style.setProperty('touch-action','auto','important');
    root.tabIndex=-1;
    if(!root.classList.contains('ssc-native-cube3d-static'))root.classList.add('ssc-native-cube3d-static');
    root.setAttribute('aria-hidden','true');
  }

  function forceVisible(container){
    if(!(container instanceof HTMLElement))return;
    if(shouldSuppressMainPreview(container)){
      forceSuppressed(container);
      return;
    }

    container.removeAttribute('aria-hidden');
    container.style.setProperty('visibility','visible','important');
    container.style.setProperty('opacity','1','important');
    container.style.setProperty('z-index','120','important');
    container.style.setProperty('pointer-events','auto','important');

    if(isMbldPreviewCard(container)){
      container.style.setProperty('position','relative','important');
      container.style.setProperty('display','flex','important');
      container.style.removeProperty('z-index');
      queueMicrotask(()=>lockSmall3D(container));
      return;
    }

    if(container.classList.contains('ssc-preview-mode-3d')){
      container.style.setProperty('display','block','important');
      const side=Math.max(120,Math.min(
        parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--ssc-preview-card-width'))||174,
        window.innerWidth-24,
        window.innerHeight-24
      ));
      container.style.setProperty('width',`${side}px`,'important');
      container.style.setProperty('min-width',`${side}px`,'important');
      container.style.setProperty('height',`${side}px`,'important');
      container.style.setProperty('min-height',`${side}px`,'important');
      queueMicrotask(()=>lockSmall3D(container));
    }else{
      THUMBNAIL_DIMENSIONS.forEach(property=>container.style.removeProperty(property));
    }
  }

  function openFromCard(event){
    const card=event.currentTarget;
    if(!(card instanceof HTMLElement)||shouldSuppressMainPreview(card))return;
    const snapshot=cardSnapshots.get(card)||null;
    const eventId=snapshot?.eventId||card.dataset.wcaEvent||'333';
    if(!card.classList.contains('ssc-preview-mode-3d')&&!window.SSCPuzzle3D?.supportsEvent?.(eventId))return;
    if(event.type==='keydown'&&event.key!=='Enter'&&event.key!==' ')return;
    if(event.type==='keydown')event.preventDefault();
    event.stopImmediatePropagation();
    lockSmall3D(card);

    if(snapshot){
      window.SSCPreviewSettings?.syncLastRender?.(card,snapshot.scramble,snapshot.eventId);
    }

    const openResult=window.SSCPreviewSettings?.open?.(card);
    if(openResult&&typeof openResult.catch==='function'){
      openResult.catch(error=>console.error('[SSC preview] Could not open interactive 3D modal.',error));
    }
  }

  function bindSnapshotCard(card){
    if(!(card instanceof HTMLElement)||watchedCards.has(card))return;
    watchedCards.add(card);
    card.addEventListener('click',openFromCard,true);
    card.addEventListener('keydown',openFromCard,true);
  }

  function isCurrentVerification(container,token){
    return verificationTokens.get(container)===token;
  }

  function installRenderGuard(){
    const api=window.SSCCubePreview;
    if(!api?.render||api.__sscVisibilityGuard)return;
    const guardedRender=api.render.bind(api);
    window.SSCCubePreview={
      ...api,
      __sscVisibilityGuard:true,
      async render(container,scramble,eventId){
        const token=++verificationSequence;
        // MBLD cubes intentionally reuse the exact regular 3x3 renderer/event.
        // This keeps the same camera, colors, reset angle and future 3x3 changes.
        const resolvedEventId=isMbldPreviewCard(container)?'333':eventId;
        if(container instanceof Element)verificationTokens.set(container,token);
        forceVisible(container);

        const player=await guardedRender(container,scramble,resolvedEventId);
        if(!isCurrentVerification(container,token))return player;

        if(container instanceof Element){
          cardSnapshots.set(container,{scramble,eventId:resolvedEventId});
          if(isMbldPreviewCard(container))bindSnapshotCard(container);
        }
        forceVisible(container);
        lockSmall3D(container);
        window.SSCPreviewSizing?.scheduleFit?.(container);
        return player;
      }
    };
  }

  function refreshMainPreviewVisibility(){
    const card=document.getElementById(PREVIEW_ID);
    if(!(card instanceof HTMLElement))return;
    forceVisible(card);
    lockSmall3D(card);
  }

  function bindViewportListeners(){
    if(viewportListenersBound)return;
    viewportListenersBound=true;
    window.addEventListener('resize',refreshMainPreviewVisibility,{passive:true});
    window.visualViewport?.addEventListener('resize',refreshMainPreviewVisibility,{passive:true});
  }

  function watchCard(){
    const card=document.getElementById(PREVIEW_ID);
    if(!(card instanceof HTMLElement))return;
    forceVisible(card);
    lockSmall3D(card);
    if(watchedCards.has(card))return;
    watchedCards.add(card);
    card.addEventListener('click',openFromCard,true);
    card.addEventListener('keydown',openFromCard,true);

    const refreshStatic3D=()=>{
      forceVisible(card);
      lockSmall3D(card);
    };

    const contentObserver=new MutationObserver(refreshStatic3D);
    contentObserver.observe(card,{childList:true,subtree:true});

    const classObserver=new MutationObserver(refreshStatic3D);
    classObserver.observe(card,{attributes:true,attributeFilter:['class']});

    bindViewportListeners();
  }

  migrateToProfessionalTwistyPreview();
  installRenderGuard();
  watchCard();

  window.addEventListener('ssc-event-change',()=>queueMicrotask(refreshMainPreviewVisibility));

  document.addEventListener('DOMContentLoaded',()=>{
    migrateToProfessionalTwistyPreview();
    installRenderGuard();
    watchCard();
    window.SSCPreviewSizing?.applyPreviewSize?.();
    refreshMainPreviewVisibility();
  },{once:true});
})();

/* Keep the main MBLD scramble strip as a full, readable numbered list.
   The MBLD flow still owns click/keyboard behavior; this only changes the
   compact summary rendering so no scramble is truncated with an ellipsis. */
(() => {
  'use strict';

  const STYLE_ID='sscMbldFullInlineLineStyles';
  const ITEM_CLASS='ssc-mbld-full-line-item';
  let fitFrame=0;

  function ensureStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #scramble.ssc-mbld-summary{
        display:flex!important;
        flex-direction:column!important;
        align-items:stretch!important;
        justify-content:center!important;
        gap:0!important;
        width:100%!important;
        min-height:38px!important;
        direction:ltr!important;
        text-align:center!important;
        font-family:'Share Tech Mono',ui-monospace,monospace!important;
        line-height:1.22!important;
        word-spacing:2px!important;
        white-space:normal!important;
        overflow:visible!important;
      }
      #scramble.ssc-mbld-summary .${ITEM_CLASS}{
        display:block!important;
        width:100%!important;
        min-width:0!important;
        margin:0!important;
        padding:0 2px!important;
        color:var(--text)!important;
        white-space:nowrap!important;
        overflow:visible!important;
        text-overflow:clip!important;
        text-align:center!important;
      }
      #scramble.ssc-mbld-summary .${ITEM_CLASS} strong{
        display:inline!important;
        color:var(--text)!important;
        font-weight:900!important;
      }
      #scramble.ssc-mbld-summary .${ITEM_CLASS} span{
        display:inline!important;
        overflow:visible!important;
        text-overflow:clip!important;
      }
      #scramble.ssc-mbld-summary .ssc-mbld-summary-more{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function fitLines(scramble){
    if(!(scramble instanceof HTMLElement))return;
    cancelAnimationFrame(fitFrame);
    fitFrame=requestAnimationFrame(()=>{
      const items=[...scramble.querySelectorAll(`:scope > .${ITEM_CLASS}`)];
      if(!items.length)return;
      const available=Math.max(1,scramble.clientWidth-4);
      let size=14;
      scramble.style.setProperty('font-size',`${size}px`,'important');
      let widest=0;
      items.forEach(item=>{widest=Math.max(widest,item.scrollWidth);});
      if(widest>available){
        size=Math.max(8,Math.floor((size*available/widest)*100)/100);
        scramble.style.setProperty('font-size',`${size}px`,'important');
      }
    });
  }

  function renderFullLines(){
    const scramble=document.getElementById('scramble');
    if(!(scramble instanceof HTMLElement)||!scramble.classList.contains('ssc-mbld-summary'))return;
    const scrambles=window.SSCMBLD?.getScrambles?.();
    if(!Array.isArray(scrambles)||!scrambles.length)return;

    const current=[...scramble.children];
    if(current.length===scrambles.length&&current.every(child=>child.classList.contains(ITEM_CLASS))){
      fitLines(scramble);
      return;
    }

    ensureStyles();
    const fragment=document.createDocumentFragment();
    scrambles.forEach((value,index)=>{
      const row=document.createElement('span');
      row.className=`ssc-mbld-summary-item ${ITEM_CLASS}`;
      const number=document.createElement('strong');
      number.textContent=`${index+1})`;
      const text=document.createElement('span');
      text.textContent=` ${value}`;
      row.append(number,text);
      fragment.appendChild(row);
    });
    scramble.replaceChildren(fragment);
    scramble.title=document.documentElement.lang==='en'?'Click to open all MBLD scrambles':'לחץ לפתיחת כל ערבובי MBLD';
    fitLines(scramble);
  }

  const scramble=document.getElementById('scramble');
  if(scramble instanceof HTMLElement){
    const observer=new MutationObserver(()=>queueMicrotask(renderFullLines));
    observer.observe(scramble,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
  }

  window.addEventListener('ssc-mbld-scramble',()=>queueMicrotask(renderFullLines));
  window.addEventListener('resize',()=>renderFullLines(),{passive:true});
  window.visualViewport?.addEventListener('resize',()=>renderFullLines(),{passive:true});
  queueMicrotask(renderFullLines);
})();
