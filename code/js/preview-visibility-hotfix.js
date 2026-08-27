(() => {
  'use strict';

  const PREVIEW_ID='cubePreview2D';
  const VERIFY_FRAMES=90;
  const PROFESSIONAL_PREVIEW_MIGRATION_KEY='sscTwistyProfessionalPreviewV1';
  const watchedCards=new WeakSet();
  const verificationTokens=new WeakMap();
  let verificationSequence=0;
  let viewportListenersBound=false;

  function nextFrame(){return new Promise(resolve=>requestAnimationFrame(resolve));}

  function migrateToProfessionalTwistyPreview(){
    if(localStorage.getItem(PROFESSIONAL_PREVIEW_MIGRATION_KEY)==='1')return;
    localStorage.setItem(PROFESSIONAL_PREVIEW_MIGRATION_KEY,'1');

    const settings=window.SSCPreviewSettings;
    if(!settings)return;

    try{
      const modeResult=settings.setMode?.('3d',{rerender:false});
      if(modeResult&&typeof modeResult.catch==='function')modeResult.catch(error=>console.warn('[SSC preview] Could not switch default preview to 3D.',error));
      settings.setInteractive?.(true);
    }catch(error){
      console.warn('[SSC preview] Professional TwistyPlayer migration failed.',error);
    }
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
    }
  }

  async function hasRenderedCanvas(player){
    if(!player)return false;
    if(typeof player.experimentalCurrentCanvases==='function'){
      try{
        const canvases=await player.experimentalCurrentCanvases();
        if(canvases?.some(canvas=>canvas instanceof HTMLCanvasElement&&canvas.width>0&&canvas.height>0))return true;
      }catch{}
    }
    return false;
  }

  function isCurrentVerification(container,token){
    return verificationTokens.get(container)===token;
  }

  async function verify3D(container,player,scramble,eventId,token){
    if(!(container instanceof HTMLElement)||!isCurrentVerification(container,token))return;
    forceVisible(container);
    if(container.dataset.previewMode!=='3d')return;

    for(let frame=0;frame<VERIFY_FRAMES;frame++){
      if(!isCurrentVerification(container,token)||container.dataset.previewMode!=='3d')return;
      if(await hasRenderedCanvas(player)){
        if(!isCurrentVerification(container,token))return;
        container.classList.remove('ssc-preview-render-failed');
        forceVisible(container);
        window.SSCPreviewSizing?.scheduleFit?.(container);
        return;
      }
      await nextFrame();
    }

    if(!isCurrentVerification(container,token)||container.dataset.previewMode!=='3d')return;
    console.warn('[SSC preview] 3D thumbnail did not produce a visible canvas; using safe 2D fallback for this thumbnail.');
    container.classList.add('ssc-preview-render-failed');
    try{
      await window.SSCPreviewManager?.render?.({
        container,
        eventId,
        scramble,
        mode:'2d',
        fallbackTo2D:true
      });
    }catch(error){
      if(isCurrentVerification(container,token))console.error('[SSC preview] Fallback render failed',error);
      return;
    }
    if(!isCurrentVerification(container,token))return;
    forceVisible(container);
    window.SSCPreviewSizing?.scheduleFit?.(container);
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
        if(container?.dataset?.previewMode==='3d')void verify3D(container,player,scramble,eventId,token);
        return player;
      }
    };
  }

  function bindViewportListeners(){
    if(viewportListenersBound)return;
    viewportListenersBound=true;
    const refresh=()=>forceVisible(document.getElementById(PREVIEW_ID));
    window.addEventListener('resize',refresh,{passive:true});
    window.visualViewport?.addEventListener('resize',refresh,{passive:true});
  }

  function watchCard(){
    const card=document.getElementById(PREVIEW_ID);
    if(!(card instanceof HTMLElement))return;
    forceVisible(card);
    if(watchedCards.has(card))return;
    watchedCards.add(card);
    const observer=new MutationObserver(()=>forceVisible(card));
    observer.observe(card,{attributes:true,childList:true,subtree:false});
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