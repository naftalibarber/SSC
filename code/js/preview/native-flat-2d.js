(() => {
  'use strict';

  const FACE_ORDER=Object.freeze(['U','L','F','R','B','D']);
  const NET_POSITION=Object.freeze({
    U:Object.freeze([2,1]),
    L:Object.freeze([1,2]),
    F:Object.freeze([2,2]),
    R:Object.freeze([3,2]),
    B:Object.freeze([4,2]),
    D:Object.freeze([2,3])
  });
  const STALE_DIMENSIONS=Object.freeze([
    'display','width','min-width','height','min-height','max-width','max-height',
    '--ssc-3d-width','--ssc-3d-height'
  ]);

  const basePreview=window.SSCCubePreview||null;
  const baseRender=basePreview?.render?.bind(basePreview)||null;
  let lastRender=null;
  let renderToken=0;

  function injectStyles(){
    if(document.getElementById('sscNativeFlat2DStyles'))return;
    const style=document.createElement('style');
    style.id='sscNativeFlat2DStyles';
    style.textContent=`
      .cube-preview-card.ssc-native-flat-net-host{
        overflow:hidden!important;
        padding:4px!important;
      }
      .ssc-native-flat-net{
        direction:ltr!important;
        width:min(92%,360px);
        aspect-ratio:4/3;
        min-width:0;
        min-height:0;
        box-sizing:border-box;
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr));
        grid-template-rows:repeat(3,minmax(0,1fr));
        gap:2px;
        align-self:center;
        justify-self:center;
        pointer-events:none!important;
        user-select:none;
      }
      .ssc-native-flat-net>.ssc-native-cube3d-face.ssc-native-flat-net-face{
        position:relative!important;
        inset:auto!important;
        transform:none!important;
        width:100%!important;
        height:100%!important;
        min-width:0!important;
        min-height:0!important;
        max-width:none!important;
        max-height:none!important;
        aspect-ratio:1/1!important;
        box-sizing:border-box!important;
        direction:ltr!important;
        pointer-events:none!important;
      }
      .ssc-native-flat-net>.ssc-native-flat-net-face[data-side="U"]{grid-column:2;grid-row:1}
      .ssc-native-flat-net>.ssc-native-flat-net-face[data-side="L"]{grid-column:1;grid-row:2}
      .ssc-native-flat-net>.ssc-native-flat-net-face[data-side="F"]{grid-column:2;grid-row:2}
      .ssc-native-flat-net>.ssc-native-flat-net-face[data-side="R"]{grid-column:3;grid-row:2}
      .ssc-native-flat-net>.ssc-native-flat-net-face[data-side="B"]{grid-column:4;grid-row:2}
      .ssc-native-flat-net>.ssc-native-flat-net-face[data-side="D"]{grid-column:2;grid-row:3}
      @media(max-width:560px){
        .ssc-native-flat-net{gap:1.5px}
      }
    `;
    document.head.appendChild(style);
  }

  function selectedFacesModeEnabled(){
    return Boolean(window.SSCSelectedFacesPreview?.isEnabled?.());
  }

  function preferredMode(container){
    const settingsMode=window.SSCPreviewSettings?.getMode?.();
    if(settingsMode==='2d'||settingsMode==='3d')return settingsMode;
    const containerMode=container?.dataset?.previewModePreference;
    if(containerMode==='2d'||containerMode==='3d')return containerMode;
    return'2d';
  }

  function supportsNativeFlat(eventId){
    return Boolean(window.SSCPuzzle3D?.isNative3D?.(eventId));
  }

  function shouldUseNativeFlat(container,eventId){
    if(selectedFacesModeEnabled())return false;
    return preferredMode(container)==='2d'&&supportsNativeFlat(eventId);
  }

  function prepareContainer(container,event,order){
    try{window.SSCPuzzle3D?.dispose?.(container);}catch{}
    container.classList.remove(
      'ssc-preview-mode-3d','ssc-preview-mode-single-face','ssc-preview-thumbnail-3d',
      'ssc-preview-3d-ready','ssc-preview-3d-static','ssc-preview-3d-unavailable',
      'ssc-native-cube3d-host','ssc-native-selected-faces-host','ssc-preview-mode-faces'
    );
    container.classList.add('ssc-preview-mode-2d','ssc-native-flat-net-host');
    STALE_DIMENSIONS.forEach(property=>container.style.removeProperty(property));
    container.style.setProperty('visibility','visible','important');
    container.style.setProperty('opacity','1','important');
    container.style.setProperty('pointer-events','auto','important');
    container.dataset.previewMode='2d';
    container.dataset.previewModePreference='2d';
    container.dataset.previewEngine='ssc-native-3d-flat-net';
    container.dataset.previewReady='true';
    container.dataset.wcaEvent=event?.id||'';
    container.dataset.wcaPuzzle=event?.puzzle||`${order}x${order}x${order}`;
    container.dataset.puzzle=event?.label||`${order}×${order}`;
    delete container.dataset.selectedFaces;
  }

  async function buildNativeNet(scramble,eventId){
    if(!supportsNativeFlat(eventId)||!window.SSCPuzzle3D?.render)return null;
    const source=document.createElement('div');
    source.className='ssc-native-flat-net-source';
    try{
      const player=await window.SSCPuzzle3D.render(source,scramble,eventId);
      if(!(player instanceof Element))return null;
      const event=window.SSCPuzzle3D.getEvent?.(eventId)||null;
      const order=Number(player.dataset.cubeOrder)||Number(event?.order)||0;
      if(!order)return null;

      const root=document.createElement('div');
      root.className='ssc-native-flat-net';
      root.dataset.source='native-3d';
      root.dataset.cubeOrder=String(order);
      root.style.setProperty('--ssc-native-order',String(order));

      for(const side of FACE_ORDER){
        const face=source.querySelector(`.ssc-native-cube3d-face[data-side="${side}"]`);
        if(!(face instanceof HTMLElement))return null;
        const position=NET_POSITION[side];
        face.classList.add('ssc-native-flat-net-face');
        face.style.gridColumn=String(position[0]);
        face.style.gridRow=String(position[1]);
        face.setAttribute('aria-label',side);
        root.appendChild(face);
      }
      return{root,event,order};
    }finally{
      window.SSCPuzzle3D?.dispose?.(source);
    }
  }

  async function renderNativeFlat(container,scramble,eventId='333'){
    if(!(container instanceof Element))return null;
    const token=++renderToken;
    const built=await buildNativeNet(scramble,eventId);
    if(token!==renderToken||!built)return null;

    prepareContainer(container,built.event,built.order);
    container.replaceChildren(built.root);
    lastRender={container,scramble,eventId};
    window.SSCPreviewSettings?.syncLastRender?.(container,scramble,eventId);
    window.SSCPreviewSizing?.scheduleFit?.(container);
    return Object.freeze({
      root:built.root,
      eventId:built.event?.id||eventId,
      order:built.order,
      faces:[...FACE_ORDER],
      source:'native-3d'
    });
  }

  async function connectedRender(container,scramble,eventId='333'){
    lastRender={container,scramble,eventId};
    if(!shouldUseNativeFlat(container,eventId))return baseRender?.(container,scramble,eventId)??null;
    try{
      const result=await renderNativeFlat(container,scramble,eventId);
      if(result)return result;
    }catch(error){
      console.warn('[SSC native flat 2D] Native 3D face extraction failed; falling back to existing 2D renderer.',error);
    }
    return baseRender?.(container,scramble,eventId)??null;
  }

  function rerenderIfActive(){
    if(!lastRender?.container?.isConnected)return;
    if(!shouldUseNativeFlat(lastRender.container,lastRender.eventId))return;
    queueMicrotask(()=>renderNativeFlat(lastRender.container,lastRender.scramble,lastRender.eventId));
  }

  function install(){
    if(!basePreview||!baseRender||window.SSCCubePreview?.__sscNativeFlat2DLayer)return;
    const setColors=basePreview.setColors?.bind(basePreview);
    const resetColors=basePreview.resetColors?.bind(basePreview);
    window.SSCCubePreview={
      ...basePreview,
      __sscNativeFlat2DLayer:true,
      render:connectedRender,
      setColors(next){
        const result=setColors?.(next);
        if(!selectedFacesModeEnabled())rerenderIfActive();
        return result;
      },
      resetColors(){
        const result=resetColors?.();
        if(!selectedFacesModeEnabled())rerenderIfActive();
        return result;
      }
    };
  }

  injectStyles();
  install();

  window.SSCNativeFlat2D=Object.freeze({
    FACE_ORDER,
    NET_POSITION,
    supportsEvent:supportsNativeFlat,
    shouldUseNativeFlat,
    render:renderNativeFlat,
    source:'native-3d'
  });
})();
