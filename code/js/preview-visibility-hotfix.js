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

  function injectNative3DOrientationFix(){
    if(document.getElementById('sscNative3DOrientationFix'))return;
    const style=document.createElement('style');
    style.id='sscNative3DOrientationFix';
    style.textContent=`
      /* puzzle-3d.js starts the native camera at rotateX(-28deg). Rotate the
         stage by the opposite offset so the visual default is the standard
         cubing view: U on top, F front/left and R on the right. Keeping the
         correction on the parent stage preserves smooth drag/reset behavior. */
      .ssc-native-cube3d-stage{
        transform:rotateX(56deg)!important;
        transform-style:preserve-3d!important;
      }
    `;
    document.head.appendChild(style);
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

    // The modal integration keeps a global lastRender snapshot. Refresh it from
    // the exact card that was clicked so the large 3D view cannot open with a
    // stale scramble/event while the thumbnail shows the current cube state.
    if(snapshot){
      window.SSCPreviewSettings?.syncLastRender?.(card,snapshot.scramble,snapshot.eventId);
    }

    const openResult=window.SSCPreviewSettings?.open?.(card);
    if(openResult&&typeof openResult.catch==='function'){
      openResult.catch(error=>console.error('[SSC preview] Could not open interactive 3D modal.',error));
    }
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
        if(container instanceof Element)verificationTokens.set(container,token);
        forceVisible(container);

        const player=await guardedRender(container,scramble,eventId);
        if(!isCurrentVerification(container,token))return player;

        if(container instanceof Element)cardSnapshots.set(container,{scramble,eventId});
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

  injectNative3DOrientationFix();
  migrateToProfessionalTwistyPreview();
  installRenderGuard();
  watchCard();

  window.addEventListener('ssc-event-change',()=>queueMicrotask(refreshMainPreviewVisibility));

  document.addEventListener('DOMContentLoaded',()=>{
    injectNative3DOrientationFix();
    migrateToProfessionalTwistyPreview();
    installRenderGuard();
    watchCard();
    window.SSCPreviewSizing?.applyPreviewSize?.();
    refreshMainPreviewVisibility();
  },{once:true});
})();
