(() => {
  'use strict';

  const STORAGE_KEY='sscCubePreviewSizeV1';
  const MIN_SIZE=150;
  const MAX_SIZE=500;
  const STEP=5;
  const DEFAULT_SIZE=150;
  const BASE_CARD_WIDTH=116;
  const BASE_CARD_HEIGHT=88;
  const BASE_NET_GAP=2;
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

  function fitNativeCube(container){
    const net=container.querySelector(':scope > .cube-preview-net, :scope > .ssc-preview-content > .cube-preview-net');
    if(!net)return false;
    const box=readCardContentBox(container);
    const actualScale=computeLayout().actualScale;
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
