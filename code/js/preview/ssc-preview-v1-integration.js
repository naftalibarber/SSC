(() => {
  'use strict';

  const V1_EVENTS=new Set([
    '222','333','444','555','666','777',
    '333bf','333fm','333oh'
  ]);
  const LEGACY_3D_DIMENSIONS=[
    'display','width','min-width','height','min-height','--ssc-3d-width','--ssc-3d-height'
  ];
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

  function preferredMode(container){
    const settingsMode=window.SSCPreviewSettings?.getMode?.();
    if(settingsMode==='2d'||settingsMode==='3d')return settingsMode;
    const containerMode=container?.dataset?.previewModePreference;
    if(containerMode==='2d'||containerMode==='3d')return containerMode;
    return'2d';
  }

  function shouldUseConnected3D(container,eventId){
    if(preferredMode(container)!=='3d')return false;
    return Boolean(window.SSCPuzzle3D?.supportsEvent?.(normalizeEventId(eventId)));
  }

  function prepare2DContainer(container){
    if(!(container instanceof Element))return;

    try{window.SSCPuzzle3D?.dispose?.(container);}catch(error){
      console.warn('[SSC Preview V1] Could not dispose the previous 3D preview.',error);
    }

    [...container.classList].forEach(className=>{
      if(className==='wca-preview-ready'||className.startsWith('wca-family-')||className.startsWith('wca-event-')){
        container.classList.remove(className);
      }
    });
    container.classList.remove(
      'ssc-preview-mode-3d',
      'ssc-preview-mode-single-face',
      'ssc-preview-thumbnail-3d',
      'ssc-preview-3d-ready',
      'ssc-preview-3d-static',
      'ssc-preview-3d-unavailable'
    );
    container.classList.add('ssc-preview-mode-2d');
    LEGACY_3D_DIMENSIONS.forEach(property=>container.style.removeProperty(property));
    container.dataset.previewMode='2d';
    container.dataset.previewModePreference='2d';
    delete container.dataset.wcaPuzzle;
    delete container.dataset.previewReady;
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

    window.SSCPreviewSettings?.syncLastRender?.(container,scramble,eventId);

    // Preview V1 is the authoritative 2D renderer, but it must not steal events
    // from the connected 3D pipeline. This is especially important for 3BLD,
    // FMC and OH, which are all native 3x3 events in SSCPuzzle3D.
    if(shouldUseConnected3D(container,eventId)){
      return legacyRender?.(container,scramble,eventId)??null;
    }

    try{
      if(!window.SSCPreviewV1?.render)throw new Error('SSCPreviewV1 is unavailable.');
      prepare2DContainer(container);
      const result=window.SSCPreviewV1.render(container,scramble,eventId,{strict:true});
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
    preferredMode,
    shouldUseConnected3D,
    prepare2DContainer,
    render,
    legacyFallback
  });
})();
