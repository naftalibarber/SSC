(() => {
  'use strict';

  const PREVIEW_ID='cubePreview2D';
  const PROFESSIONAL_PREVIEW_MIGRATION_KEY='sscTwistyProfessionalPreviewV1';
  const THUMBNAIL_DIMENSIONS=['display','width','min-width','height','min-height'];
  const watchedCards=new WeakSet();
  const verificationTokens=new WeakMap();
  let verificationSequence=0;
  let viewportListenersBound=false;

  function migrateToProfessionalTwistyPreview(){
    if(localStorage.getItem(PROFESSIONAL_PREVIEW_MIGRATION_KEY)==='1')return;

    const settings=window.SSCPreviewSettings;
    if(!settings)return;

    try{
      const modeResult=settings.setMode?.('3d',{rerender:false});
      if(modeResult&&typeof modeResult.catch==='function')modeResult.catch(error=>console.warn('[SSC preview] Could not switch default preview to 3D.',error));
      settings.setInteractive?.(true);
      localStorage.setItem(PROFESSIONAL_PREVIEW_MIGRATION_KEY,'1');
    }catch(error){
      console.warn('[SSC preview] Professional 3D migration failed.',error);
    }
  }

  function lockSmall3D(card){
    if(!(card instanceof HTMLElement)||!card.classList.contains('ssc-preview-mode-3d'))return;
    card.classList.add('ssc-preview-thumbnail-3d');
    const root=card.querySelector('.ssc-native-cube3d-root,.ssc-puzzle-3d-player');
    if(!(root instanceof HTMLElement))return;
    root.style.setProperty('pointer-events','none','important');
    root.style.setProperty('touch-action','auto','important');
    root.tabIndex=-1;
    root.classList.add('ssc-native-cube3d-static');
    root.setAttribute('aria-hidden','true');
  }

  function forceVisible(container){
    if(!(container instanceof HTMLElement))return;
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
    if(!(card instanceof HTMLElement)||!card.classList.contains('ssc-preview-mode-3d'))return;
    if(event.type==='keydown'&&event.key!=='Enter'&&event.key!==' ')return;
    if(event.type==='keydown')event.preventDefault();
    event.stopImmediatePropagation();
    lockSmall3D(card);
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

        forceVisible(container);
        lockSmall3D(container);
        window.SSCPreviewSizing?.scheduleFit?.(container);
        return player;
      }
    };
  }

  function bindViewportListeners(){
    if(viewportListenersBound)return;
    viewportListenersBound=true;
    const refresh=()=>{
      const card=document.getElementById(PREVIEW_ID);
      forceVisible(card);
      lockSmall3D(card);
    };
    window.addEventListener('resize',refresh,{passive:true});
    window.visualViewport?.addEventListener('resize',refresh,{passive:true});
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
    const observer=new MutationObserver(()=>{
      forceVisible(card);
      lockSmall3D(card);
    });
    observer.observe(card,{attributes:true,attributeFilter:['class'],childList:true,subtree:true});
    bindViewportListeners();
  }

  migrateToProfessionalTwistyPreview();
  installRenderGuard();
  watchCard();
  document.addEventListener('DOMContentLoaded',()=>{
    migrateToProfessionalTwistyPreview();
    installRenderGuard();
    watchCard();
    window.SSCPreviewSizing?.applyPreviewSize?.();
  },{once:true});
})();
