(() => {
  'use strict';

  const V1_EVENTS=new Set(['222','333','444','555','666','777']);
  const legacyPreview=window.SSCCubePreview||null;
  const legacyRender=legacyPreview?.render?.bind(legacyPreview)||null;
  const managerRender=window.SSCPreviewManager?.render?.bind(window.SSCPreviewManager)||null;

  function normalizeEventId(eventId){
    return window.SSCPreviewV1?.normalizeEventId?.(eventId)||String(eventId??'333').trim().toLowerCase();
  }

  function featureEnabled(){return window.SSC_FEATURES?.previewV1===true;}

  function shouldUseV1(eventId){
    return featureEnabled()&&V1_EVENTS.has(normalizeEventId(eventId));
  }

  function preferredPreviewMode(){
    const mode=window.SSCPreviewSettings?.getMode?.();
    return mode==='2d'||mode==='3d'?mode:null;
  }

  function primeConnectedPreview(container,scramble,eventId){
    // preview-integration.js owns modal/open state and lastRender. When V1 renders 2D
    // directly, prime that existing integration path first so the card remains clickable
    // and settings can rerender the exact same scramble. The connected 2D renderer runs
    // synchronously before its Promise settles; V1 immediately replaces its legacy 2D
    // output, so no second scramble generation or stale state is introduced.
    if(!legacyRender||!window.SSCPreviewSettings)return;
    try{
      const pending=legacyRender(container,scramble,eventId);
      if(pending&&typeof pending.catch==='function')pending.catch(error=>console.warn('[SSC Preview V1] connected preview priming failed.',error));
    }catch(error){
      console.warn('[SSC Preview V1] connected preview priming failed.',error);
    }
  }

  async function legacyFallback(container,scramble,eventId,originalError){
    console.error('[SSC Preview V1] render failed; falling back to legacy preview.',{
      eventId:normalizeEventId(eventId),
      scramble:String(scramble??''),
      error:originalError
    });

    if(legacyRender){
      try{
        const result=await legacyRender(container,scramble,eventId);
        if(result||container?.childElementCount)return result;
      }catch(error){
        console.error('[SSC Preview V1] legacy connected renderer failed; trying legacy 2D manager.',error);
      }
    }

    if(managerRender){
      try{
        return await managerRender({container,eventId,scramble,mode:'2d',fallbackTo2D:true});
      }catch(error){
        console.error('[SSC Preview V1] legacy 2D fallback failed.',error);
      }
    }

    return null;
  }

  async function render(container,scramble,eventId='333'){
    if(!shouldUseV1(eventId)){
      return legacyRender?.(container,scramble,eventId)??null;
    }

    const preferredMode=preferredPreviewMode();
    if(preferredMode==='3d'){
      return legacyRender?.(container,scramble,eventId)??null;
    }
    if(preferredMode==='2d')primeConnectedPreview(container,scramble,eventId);

    try{
      if(!window.SSCPreviewV1?.render)throw new Error('SSCPreviewV1 is unavailable.');
      const result=window.SSCPreviewV1.render(container,scramble,eventId,{strict:true});
      container.dataset.previewMode='2d';
      container.dataset.previewModePreference='2d';
      window.SSCPreviewSizing?.scheduleFit?.(container);
      return result.svg;
    }catch(error){
      return legacyFallback(container,scramble,eventId,error);
    }
  }

  function getColors(){
    if(window.SSCPreviewV1?.getColors)return window.SSCPreviewV1.getColors();
    return legacyPreview?.getColors?.()||null;
  }

  function setColors(next){
    let colors=null;
    if(window.SSCPreviewV1?.setColors)colors=window.SSCPreviewV1.setColors(next);
    try{legacyPreview?.setColors?.(next);}catch(error){console.warn('[SSC Preview V1] legacy color update failed.',error);}
    return colors??legacyPreview?.getColors?.()??null;
  }

  function resetColors(){
    let colors=null;
    if(window.SSCPreviewV1?.resetColors)colors=window.SSCPreviewV1.resetColors();
    try{legacyPreview?.resetColors?.();}catch(error){console.warn('[SSC Preview V1] legacy color reset failed.',error);}
    return colors??legacyPreview?.getColors?.()??null;
  }

  if(!legacyPreview||!legacyRender){
    console.error('[SSC Preview V1] legacy preview is unavailable; integration was not installed.');
    return;
  }

  window.SSCCubePreview={
    ...legacyPreview,
    render,
    getColors,
    setColors,
    resetColors
  };

  window.SSCPreviewV1Integration=Object.freeze({
    featureEnabled,
    shouldUseV1,
    render,
    legacyFallback
  });
})();
