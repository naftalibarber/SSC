(() => {
  'use strict';

  const PREVIEW_ID='cubePreview2D';
  const VERIFY_FRAMES=90;
  const EMPTY_RETRY_FRAMES=4;
  const MAX_EMPTY_RECOVERIES=3;
  const watchedCards=new WeakSet();
  const verificationTokens=new WeakMap();
  const renderSnapshots=new WeakMap();
  const recoveryCounts=new WeakMap();
  const recoveryScheduled=new WeakSet();
  let verificationSequence=0;
  let viewportListenersBound=false;

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

  function has2DContent(container){
    if(!(container instanceof Element))return false;
    const svg=container.querySelector('svg.ssc-cube-preview-svg, svg');
    if(svg){
      const box=svg.getBoundingClientRect();
      if(box.width>0&&box.height>0)return true;
    }
    const net=container.querySelector('.cube-preview-net, .wca-puzzle-preview, [data-preview-renderer]');
    if(net){
      const box=net.getBoundingClientRect();
      if(box.width>0&&box.height>0)return true;
    }
    return false;
  }

  async function hasRenderedCanvas(player,container){
    if(player&&typeof player.experimentalCurrentCanvases==='function'){
      try{
        const canvases=await player.experimentalCurrentCanvases();
        if(canvases?.some(canvas=>canvas instanceof HTMLCanvasElement&&canvas.width>0&&canvas.height>0))return true;
      }catch{}
    }
    if(container instanceof Element){
      const canvases=container.querySelectorAll('canvas');
      for(const canvas of canvases){
        if(canvas.width>0&&canvas.height>0){
          const box=canvas.getBoundingClientRect();
          if(box.width>0&&box.height>0)return true;
        }
      }
      if(container.querySelector('twisty-player, .ssc-puzzle-3d-player'))return true;
    }
    return false;
  }

  function isCurrentVerification(container,token){
    return verificationTokens.get(container)===token;
  }

  async function waitForVisibleContent(container,mode,player,frames=EMPTY_RETRY_FRAMES){
    for(let frame=0;frame<=frames;frame++){
      if(mode==='3d'){
        if(await hasRenderedCanvas(player,container))return true;
      }else if(has2DContent(container)){
        return true;
      }
      if(frame<frames)await nextFrame();
    }
    return false;
  }

  async function verify3D(container,player,scramble,eventId,token){
    if(!(container instanceof HTMLElement)||!isCurrentVerification(container,token))return;
    forceVisible(container);
    if(container.dataset.previewMode!=='3d')return;

    for(let frame=0;frame<VERIFY_FRAMES;frame++){
      if(!isCurrentVerification(container,token)||container.dataset.previewMode!=='3d')return;
      if(await hasRenderedCanvas(player,container)){
        if(!isCurrentVerification(container,token))return;
        container.classList.remove('ssc-preview-render-failed');
        recoveryCounts.set(container,0);
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
    if(has2DContent(container))recoveryCounts.set(container,0);
    window.SSCPreviewSizing?.scheduleFit?.(container);
  }

  async function recoverEmptyPreview(container){
    if(!(container instanceof HTMLElement)||recoveryScheduled.has(container))return;
    const snapshot=renderSnapshots.get(container);
    if(!snapshot||!container.isConnected)return;

    recoveryScheduled.add(container);
    try{
      for(let i=0;i<EMPTY_RETRY_FRAMES;i++)await nextFrame();
      if(!container.isConnected)return;

      const mode=container.dataset.previewMode||snapshot.mode||'2d';
      if(await waitForVisibleContent(container,mode,null,0)){
        recoveryCounts.set(container,0);
        return;
      }

      const attempts=(recoveryCounts.get(container)||0)+1;
      recoveryCounts.set(container,attempts);
      if(attempts>MAX_EMPTY_RECOVERIES){
        console.error('[SSC preview] Preview remained empty after automatic recovery attempts.',snapshot);
        return;
      }

      console.warn(`[SSC preview] Empty preview detected; automatic recovery ${attempts}/${MAX_EMPTY_RECOVERIES}.`);
      forceVisible(container);
      await window.SSCCubePreview?.render?.(container,snapshot.scramble,snapshot.eventId);
      forceVisible(container);
      window.SSCPreviewSizing?.scheduleFit?.(container);
    }catch(error){
      console.error('[SSC preview] Automatic empty-preview recovery failed',error);
    }finally{
      recoveryScheduled.delete(container);
    }
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
        if(container instanceof Element){
          verificationTokens.set(container,token);
          renderSnapshots.set(container,{scramble,eventId,mode:container.dataset.previewModePreference||container.dataset.previewMode||'2d'});
        }
        forceVisible(container);

        let player;
        try{
          player=await guardedRender(container,scramble,eventId);
        }catch(error){
          if(container instanceof Element&&isCurrentVerification(container,token))void recoverEmptyPreview(container);
          throw error;
        }

        if(!isCurrentVerification(container,token))return player;
        forceVisible(container);

        const mode=container?.dataset?.previewMode||container?.dataset?.previewModePreference||'2d';
        const visible=await waitForVisibleContent(container,mode,player);
        if(!isCurrentVerification(container,token))return player;

        if(visible){
          recoveryCounts.set(container,0);
          container.classList.remove('ssc-preview-render-empty');
        }else{
          container.classList.add('ssc-preview-render-empty');
          void recoverEmptyPreview(container);
        }

        if(container?.dataset?.previewMode==='3d')void verify3D(container,player,scramble,eventId,token);
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
      if(card instanceof HTMLElement&&!card.children.length)void recoverEmptyPreview(card);
    };
    window.addEventListener('resize',refresh,{passive:true});
    window.visualViewport?.addEventListener('resize',refresh,{passive:true});
  }

  function watchCard(){
    const card=document.getElementById(PREVIEW_ID);
    if(!(card instanceof HTMLElement))return;
    forceVisible(card);
    if(watchedCards.has(card))return;
    watchedCards.add(card);

    const observer=new MutationObserver(()=>{
      forceVisible(card);
      if(!card.isConnected)return;
      if(card.children.length===0)void recoverEmptyPreview(card);
      else{
        card.classList.remove('ssc-preview-render-empty');
        window.SSCPreviewSizing?.scheduleFit?.(card);
      }
    });
    observer.observe(card,{attributes:true,childList:true,subtree:false});
    bindViewportListeners();
  }

  installRenderGuard();
  watchCard();
  document.addEventListener('DOMContentLoaded',()=>{
    installRenderGuard();
    watchCard();
    window.SSCPreviewSizing?.applyPreviewSize?.();
    const card=document.getElementById(PREVIEW_ID);
    if(card instanceof HTMLElement&&!card.children.length)void recoverEmptyPreview(card);
  },{once:true});
})();