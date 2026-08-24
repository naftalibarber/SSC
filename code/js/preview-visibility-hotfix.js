(() => {
  'use strict';

  const PREVIEW_ID='cubePreview2D';
  const VERIFY_FRAMES=90;

  function nextFrame(){return new Promise(resolve=>requestAnimationFrame(resolve));}

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

  async function verify3D(container,player,scramble,eventId){
    if(!(container instanceof HTMLElement))return;
    forceVisible(container);
    if(container.dataset.previewMode!=='3d')return;

    for(let frame=0;frame<VERIFY_FRAMES;frame++){
      if(container.dataset.previewMode!=='3d')return;
      if(await hasRenderedCanvas(player)){
        container.classList.remove('ssc-preview-render-failed');
        forceVisible(container);
        window.SSCPreviewSizing?.scheduleFit?.(container);
        return;
      }
      await nextFrame();
    }

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
      console.error('[SSC preview] Fallback render failed',error);
    }
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
        forceVisible(container);
        const player=await guardedRender(container,scramble,eventId);
        forceVisible(container);
        if(container?.dataset?.previewMode==='3d')void verify3D(container,player,scramble,eventId);
        return player;
      }
    };
  }

  function watchCard(){
    const card=document.getElementById(PREVIEW_ID);
    if(!(card instanceof HTMLElement))return;
    forceVisible(card);
    const observer=new MutationObserver(()=>forceVisible(card));
    observer.observe(card,{attributes:true,childList:true,subtree:false});
    window.addEventListener('resize',()=>forceVisible(card),{passive:true});
    window.visualViewport?.addEventListener('resize',()=>forceVisible(card),{passive:true});
  }

  installRenderGuard();
  watchCard();
  document.addEventListener('DOMContentLoaded',()=>{
    installRenderGuard();
    watchCard();
    window.SSCPreviewSizing?.applyPreviewSize?.();
  },{once:true});
})();