(() => {
  'use strict';

  const STORAGE_KEY='sscCubePreviewSizeV1';
  const MIN_SIZE=150;
  const MAX_SIZE=500;
  const STEP=5;
  const DEFAULT_SIZE=150;
  const BASE_CARD_WIDTH=116;
  const BASE_CARD_HEIGHT=88;
  const BASE_NET_GAP=6;
  const DEBUG_GEOMETRY=false;
  const FIT_PROFILES=Object.freeze({
    cube:{desktop:6,mobile:4},
    clock:{desktop:8,mobile:6},
    minx:{desktop:4,mobile:4},
    pyram:{desktop:5,mobile:4},
    skewb:{desktop:6,mobile:4},
    sq1:{desktop:5,mobile:4},
    fto:{desktop:4,mobile:4}
  });

  const observed=new WeakSet();
  const resizeObserver='ResizeObserver' in window?new ResizeObserver(entries=>{
    entries.forEach(entry=>scheduleFit(entry.target));
  }):null;
  let resizeRaf=0;

  function clampSize(value){
    const n=Number(value);
    if(!Number.isFinite(n))return DEFAULT_SIZE;
    return Math.min(MAX_SIZE,Math.max(MIN_SIZE,n));
  }

  function getPreviewSize(){
    const raw=localStorage.getItem(STORAGE_KEY);
    const clamped=clampSize(raw===null?DEFAULT_SIZE:raw);
    if(raw===null||Number(raw)!==clamped)localStorage.setItem(STORAGE_KEY,String(clamped));
    return clamped;
  }

  function viewportMetrics(){
    const viewport=window.visualViewport;
    const viewportWidth=Math.max(1,Math.floor(viewport?.width||window.innerWidth||document.documentElement.clientWidth||BASE_CARD_WIDTH));
    const viewportHeight=Math.max(1,Math.floor(viewport?.height||window.innerHeight||document.documentElement.clientHeight||BASE_CARD_HEIGHT));
    const mobile=viewportWidth<=560;
    return{viewportWidth,viewportHeight,mobile,safeMargin:mobile?16:18};
  }

  function getFamily(container){
    if(container?.classList?.contains('wca-family-clock'))return'clock';
    if(container?.classList?.contains('wca-family-minx'))return'minx';
    if(container?.classList?.contains('wca-family-pyram'))return'pyram';
    if(container?.classList?.contains('wca-family-skewb'))return'skewb';
    if(container?.classList?.contains('wca-family-sq1'))return'sq1';
    if(container?.classList?.contains('wca-family-fto'))return'fto';
    return'cube';
  }

  function applyFitProfile(container){
    if(!(container instanceof Element))return;
    const metrics=viewportMetrics();
    const profile=FIT_PROFILES[getFamily(container)]||FIT_PROFILES.cube;
    const padding=metrics.mobile?profile.mobile:profile.desktop;
    container.style.setProperty('--ssc-preview-padding',`${padding}px`);
  }

  function computeLayout(size=getPreviewSize()){
    const metrics=viewportMetrics();
    const requestedScale=clampSize(size)/100;
    const requestedWidth=BASE_CARD_WIDTH*requestedScale;
    const requestedHeight=BASE_CARD_HEIGHT*requestedScale;
    const maxWidth=Math.max(44,metrics.viewportWidth-metrics.safeMargin*2);
    const maxHeight=Math.max(44,metrics.viewportHeight-metrics.safeMargin*2);
    const viewportScale=Math.min(maxWidth/BASE_CARD_WIDTH,maxHeight/BASE_CARD_HEIGHT);
    const actualScale=Math.max(.2,Math.min(requestedScale,viewportScale));
    return{
      ...metrics,
      requestedScale,
      actualScale,
      requestedWidth,
      requestedHeight,
      width:BASE_CARD_WIDTH*actualScale,
      height:BASE_CARD_HEIGHT*actualScale
    };
  }

  function applyRootVariables(size=getPreviewSize()){
    const layout=computeLayout(size);
    const root=document.documentElement;
    root.style.setProperty('--ssc-preview-requested-scale',String(layout.requestedScale));
    root.style.setProperty('--ssc-preview-actual-scale',String(layout.actualScale));
    root.style.setProperty('--ssc-preview-card-width',`${layout.width.toFixed(2)}px`);
    root.style.setProperty('--ssc-preview-card-height',`${layout.height.toFixed(2)}px`);
    root.style.setProperty('--ssc-preview-safe-margin',`${layout.safeMargin}px`);
    return layout;
  }

  function readCardContentBox(container){
    const style=getComputedStyle(container);
    const left=parseFloat(style.paddingLeft)||0;
    const right=parseFloat(style.paddingRight)||0;
    const top=parseFloat(style.paddingTop)||0;
    const bottom=parseFloat(style.paddingBottom)||0;
    return{
      width:Math.max(1,container.clientWidth-left-right),
      height:Math.max(1,container.clientHeight-top-bottom)
    };
  }

  function debugThreeByThreeGeometry(net,dpr){
    if(!DEBUG_GEOMETRY)return;
    requestAnimationFrame(()=>{
      const faces=[...net.querySelectorAll(':scope > .ssc-preview-333-face')];
      const rows=[];
      faces.forEach(face=>{
        const stickers=[...face.querySelectorAll(':scope > .ssc-preview-333-sticker')];
        const rects=stickers.map(sticker=>sticker.getBoundingClientRect());
        const widths=rects.map(rect=>Math.round(rect.width*dpr));
        const heights=rects.map(rect=>Math.round(rect.height*dpr));
        const horizontalGaps=[0,1,3,4].map(index=>Math.round((rects[index+1].left-rects[index].right)*dpr));
        const verticalGaps=[0,1,2,3,4,5].map(index=>Math.round((rects[index+3].top-rects[index].bottom)*dpr));
        const faceRect=face.getBoundingClientRect();
        const valid=widths.every(value=>value===widths[0])&&heights.every(value=>value===heights[0])&&widths[0]===heights[0]&&horizontalGaps.every(value=>value===horizontalGaps[0])&&verticalGaps.every(value=>value===verticalGaps[0])&&horizontalGaps[0]===verticalGaps[0]&&Math.round(faceRect.width*dpr)===Math.round(faceRect.height*dpr);
        rows.push({face:face.dataset.face,facePx:`${Math.round(faceRect.width*dpr)}×${Math.round(faceRect.height*dpr)}`,stickerPx:`${widths[0]}×${heights[0]}`,gapPx:horizontalGaps[0],valid});
        console.assert(valid,'[SSC 3x3 geometry] Uneven geometry detected',{face:face.dataset.face,widths,heights,horizontalGaps,verticalGaps,faceRect});
      });
      console.table(rows);
    });
  }

  function fitThreeByThreeDom(net,box,actualScale){
    const dpr=Math.max(1,Number(window.devicePixelRatio)||1);
    const requestedNetGap=Math.max(.5,BASE_NET_GAP*actualScale);
    const netGapDevice=Math.max(1,Math.round(requestedNetGap*dpr));
    const netGap=netGapDevice/dpr;
    const maxFace=Math.max(1,Math.min((box.width-netGap*3)/4,(box.height-netGap*2)/3));

    const separatorDevice=Math.max(1,Math.round(dpr));
    const paddingDevice=separatorDevice;
    const fixedDevice=(paddingDevice*2)+(separatorDevice*2);
    const maxFaceDevice=Math.max(fixedDevice+3,Math.floor(maxFace*dpr));
    const stickerDevice=Math.max(1,Math.floor((maxFaceDevice-fixedDevice)/3));
    const faceDevice=(stickerDevice*3)+fixedDevice;

    const sticker=stickerDevice/dpr;
    const separator=separatorDevice/dpr;
    const padding=paddingDevice/dpr;
    const face=faceDevice/dpr;

    net.style.setProperty('--ssc-preview-face',`${face}px`);
    net.style.setProperty('--ssc-preview-net-gap',`${netGap}px`);
    net.style.setProperty('--ssc-preview-detail-scale',String(actualScale));

    net.querySelectorAll(':scope > .ssc-preview-333-face').forEach(faceEl=>{
      faceEl.style.setProperty('width',`${face}px`,'important');
      faceEl.style.setProperty('height',`${face}px`,'important');
      faceEl.style.setProperty('padding',`${padding}px`,'important');
      faceEl.style.setProperty('gap',`${separator}px`,'important');
      faceEl.style.setProperty('grid-template-columns',`repeat(3,${sticker}px)`,'important');
      faceEl.style.setProperty('grid-template-rows',`repeat(3,${sticker}px)`,'important');
      faceEl.style.setProperty('box-sizing','border-box','important');

      faceEl.querySelectorAll(':scope > .ssc-preview-333-sticker').forEach(stickerEl=>{
        stickerEl.style.setProperty('width',`${sticker}px`,'important');
        stickerEl.style.setProperty('height',`${sticker}px`,'important');
        stickerEl.style.setProperty('min-width','0','important');
        stickerEl.style.setProperty('min-height','0','important');
        stickerEl.style.setProperty('margin','0','important');
        stickerEl.style.setProperty('padding','0','important');
        stickerEl.style.setProperty('border','0','important');
        stickerEl.style.setProperty('outline','0','important');
        stickerEl.style.setProperty('box-sizing','border-box','important');
      });
    });

    debugThreeByThreeGeometry(net,dpr);
    return true;
  }

  function fitNativeCube(container){
    const net=container.querySelector(':scope > .cube-preview-net, :scope > .ssc-preview-content > .cube-preview-net');
    if(!net)return false;
    const box=readCardContentBox(container);
    const actualScale=computeLayout().actualScale;

    if(net.classList.contains('ssc-preview-333-net'))return fitThreeByThreeDom(net,box,actualScale);

    const gap=Math.max(.5,BASE_NET_GAP*actualScale);
    const face=Math.max(1,Math.min((box.width-gap*3)/4,(box.height-gap*2)/3));
    net.style.setProperty('--ssc-preview-face',`${face.toFixed(3)}px`);
    net.style.setProperty('--ssc-preview-net-gap',`${gap.toFixed(3)}px`);
    net.style.setProperty('--ssc-preview-detail-scale',String(actualScale));
    return true;
  }

  function tuneSvg(svg){
    if(!(svg instanceof SVGElement))return;
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.style.width='100%';
    svg.style.height='100%';
    svg.style.maxWidth='100%';
    svg.style.maxHeight='100%';
    svg.style.display='block';
    svg.style.overflow='hidden';
  }

  function prepareOwnedCanvas(canvas){
    if(!(canvas instanceof HTMLCanvasElement)||canvas.closest('scramble-display'))return;
    if(!canvas.matches('[data-ssc-hi-dpi-canvas]'))return;
    const rect=canvas.getBoundingClientRect();
    const cssWidth=Math.max(1,Math.round(rect.width));
    const cssHeight=Math.max(1,Math.round(rect.height));
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const targetWidth=Math.round(cssWidth*dpr);
    const targetHeight=Math.round(cssHeight*dpr);
    if(canvas.width===targetWidth&&canvas.height===targetHeight)return;
    canvas.width=targetWidth;
    canvas.height=targetHeight;
    const ctx=canvas.getContext('2d');
    if(ctx){
      ctx.setTransform(dpr,0,0,dpr,0,0);
      canvas.dispatchEvent(new CustomEvent('ssc-canvas-resized',{detail:{cssWidth,cssHeight,dpr}}));
    }
  }

  function tuneScrambleDisplay(display){
    if(!(display instanceof Element))return;
    display.style.width='100%';
    display.style.height='100%';
    display.style.maxWidth='100%';
    display.style.maxHeight='100%';
    display.style.margin='0';
    const inspect=()=>{
      const root=display.shadowRoot||display;
      root.querySelectorAll?.('svg').forEach(tuneSvg);
    };
    inspect();
    requestAnimationFrame(()=>{inspect();requestAnimationFrame(inspect)});
  }

  function fitWcaPreview(container){
    const display=container.querySelector(':scope > scramble-display.ssc-wca-scramble-display, :scope > .ssc-preview-content > scramble-display.ssc-wca-scramble-display');
    if(!display)return false;
    const content=display.parentElement?.classList.contains('ssc-preview-content')?display.parentElement:null;
    if(content){
      content.style.width='100%';
      content.style.height='100%';
      content.style.maxWidth='100%';
      content.style.maxHeight='100%';
    }
    tuneScrambleDisplay(display);
    window.customElements?.whenDefined?.('scramble-display').then(()=>tuneScrambleDisplay(display)).catch(()=>{});
    return true;
  }

  function fitPreviewToContainer(container){
    if(!(container instanceof Element)||!container.isConnected)return;
    applyFitProfile(container);
    const requested=getPreviewSize();
    const layout=computeLayout(requested);
    container.dataset.previewRequestedSize=String(requested);
    container.dataset.previewActualScale=layout.actualScale.toFixed(4);
    container.classList.toggle('ssc-preview-small',layout.width<72||layout.height<56);
    fitNativeCube(container);
    fitWcaPreview(container);
    container.querySelectorAll('svg').forEach(tuneSvg);
    container.querySelectorAll('canvas').forEach(prepareOwnedCanvas);
  }

  function scheduleFit(container){
    if(!(container instanceof Element))return;
    if(container.__sscPreviewFitRaf)cancelAnimationFrame(container.__sscPreviewFitRaf);
    container.__sscPreviewFitRaf=requestAnimationFrame(()=>{
      container.__sscPreviewFitRaf=0;
      fitPreviewToContainer(container);
    });
  }

  function observe(container){
    if(!(container instanceof Element)||observed.has(container))return;
    observed.add(container);
    resizeObserver?.observe(container);
    new MutationObserver(()=>scheduleFit(container)).observe(container,{childList:true,subtree:true});
    scheduleFit(container);
  }

  function observeAll(){
    document.querySelectorAll('.cube-preview-card').forEach(observe);
  }

  function applyPreviewSize(){
    const size=getPreviewSize();
    const layout=applyRootVariables(size);
    observeAll();
    document.querySelectorAll('.cube-preview-card').forEach(scheduleFit);
    document.dispatchEvent(new CustomEvent('ssc-preview-size-applied',{detail:{size,requestedScale:layout.requestedScale,actualScale:layout.actualScale,width:layout.width,height:layout.height}}));
    return layout;
  }

  function setPreviewSize(value){
    const size=clampSize(value);
    localStorage.setItem(STORAGE_KEY,String(size));
    applyPreviewSize();
    return size;
  }

  function handleViewportChange(){
    if(resizeRaf)cancelAnimationFrame(resizeRaf);
    resizeRaf=requestAnimationFrame(()=>{
      resizeRaf=0;
      applyPreviewSize();
    });
  }

  window.addEventListener('resize',handleViewportChange,{passive:true});
  window.addEventListener('orientationchange',handleViewportChange,{passive:true});
  window.visualViewport?.addEventListener('resize',handleViewportChange,{passive:true});

  window.SSCPreviewSizing=Object.freeze({
    STORAGE_KEY,
    MIN_SIZE,
    MAX_SIZE,
    STEP,
    DEFAULT_SIZE,
    BASE_CARD_WIDTH,
    BASE_CARD_HEIGHT,
    FIT_PROFILES,
    clampSize,
    getPreviewSize,
    setPreviewSize,
    applyPreviewSize,
    fitPreviewToContainer,
    scheduleFit,
    observe
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyPreviewSize,{once:true});
  else applyPreviewSize();
})();