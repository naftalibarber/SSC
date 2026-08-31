(() => {
  'use strict';

  const STORAGE_KEY='sscCubePreviewSizeV1';
  const MIN_SIZE=150;
  const MAX_SIZE=500;
  const STEP=5;
  const DEFAULT_SIZE=200;
  const BASE_CARD_WIDTH=116;
  const BASE_CARD_HEIGHT=88;
  const BASE_NET_GAP=6;
  const GENERAL_SETTINGS_KEY='sscGeneralSettingsV1';
  const DEFAULT_CUBE_LINE_WIDTH=1;
  const MIN_CUBE_LINE_WIDTH=1;
  const MAX_CUBE_LINE_WIDTH=4;
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

  function smallestViewportLength(fallback,...values){
    const valid=values.map(Number).filter(value=>Number.isFinite(value)&&value>0);
    return Math.max(1,Math.floor(valid.length?Math.min(...valid):fallback));
  }

  function viewportMetrics(){
    const viewport=window.visualViewport,root=document.documentElement;
    // During browser zoom and mobile chrome transitions visualViewport can
    // briefly lag behind the layout viewport. The smaller live measurement is
    // the only one that guarantees the fixed preview remains fully visible.
    const viewportWidth=smallestViewportLength(BASE_CARD_WIDTH,viewport?.width,window.innerWidth,root.clientWidth);
    const viewportHeight=smallestViewportLength(BASE_CARD_HEIGHT,viewport?.height,window.innerHeight,root.clientHeight);
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
    return{...metrics,requestedScale,actualScale,requestedWidth,requestedHeight,width:BASE_CARD_WIDTH*actualScale,height:BASE_CARD_HEIGHT*actualScale};
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
    const rect=container.getBoundingClientRect();
    const left=(parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.paddingLeft)||0);
    const right=(parseFloat(style.borderRightWidth)||0)+(parseFloat(style.paddingRight)||0);
    const top=(parseFloat(style.borderTopWidth)||0)+(parseFloat(style.paddingTop)||0);
    const bottom=(parseFloat(style.borderBottomWidth)||0)+(parseFloat(style.paddingBottom)||0);
    const width=Math.max(1,rect.width-left-right),height=Math.max(1,rect.height-top-bottom);
    return{
      left:rect.left+left,
      top:rect.top+top,
      right:rect.left+left+width,
      bottom:rect.top+top+height,
      width,height
    };
  }

  function clampCubeLineWidth(value){
    const width=Number(value);
    if(!Number.isFinite(width))return DEFAULT_CUBE_LINE_WIDTH;
    return Math.min(MAX_CUBE_LINE_WIDTH,Math.max(MIN_CUBE_LINE_WIDTH,Math.round(width)));
  }

  function getCubeLineWidth(){
    const root=document.documentElement;
    const inline=root.style.getPropertyValue('--ssc-cube-line-width');
    const computed=inline||getComputedStyle(root).getPropertyValue('--ssc-cube-line-width');
    if(computed.trim()!=='')return clampCubeLineWidth(parseFloat(computed));
    try{
      const saved=JSON.parse(localStorage.getItem(GENERAL_SETTINGS_KEY));
      return clampCubeLineWidth(saved?.cubeLineWidth);
    }catch{
      return DEFAULT_CUBE_LINE_WIDTH;
    }
  }

  function snapPixelPerfectPlacement(box,geometry,dpr=geometry?.dpr||1){
    const ratio=Math.max(.25,Number(dpr)||1);
    const cssWidth=geometry.width/ratio,cssHeight=geometry.height/ratio;
    const targetLeft=box.left+((box.width-cssWidth)/2);
    const targetTop=box.top+((box.height-cssHeight)/2);
    const snappedLeft=Math.round(targetLeft*ratio)/ratio;
    const snappedTop=Math.round(targetTop*ratio)/ratio;
    return Object.freeze({
      cssWidth,cssHeight,targetLeft,targetTop,snappedLeft,snappedTop,
      offsetX:snappedLeft-box.left,
      offsetY:snappedTop-box.top,
      centerErrorXDevicePixels:(snappedLeft-targetLeft)*ratio,
      centerErrorYDevicePixels:(snappedTop-targetTop)*ratio
    });
  }

  function clearPixelPerfectCardCorrection(container){
    container.style.setProperty('--ssc-preview-card-width-correction','0px');
    container.style.setProperty('--ssc-preview-card-height-correction','0px');
    delete container.dataset.previewCardWidthCorrectionDevicePixels;
    delete container.dataset.previewCardHeightCorrectionDevicePixels;
  }

  function applyPixelPerfectCardCorrection(container,geometry,dpr){
    const centering=window.SSCSvgCubeRenderer?.centerPixelPerfectGeometry?.(geometry);
    if(!centering)return{centering:null,box:readCardContentBox(container)};
    const box=readCardContentBox(container);
    const widthCorrection=Math.max(0,box.width-(centering.availableWidth/dpr));
    const heightCorrection=Math.max(0,box.height-(centering.availableHeight/dpr));
    container.style.setProperty('--ssc-preview-card-width-correction',`${widthCorrection}px`);
    container.style.setProperty('--ssc-preview-card-height-correction',`${heightCorrection}px`);
    container.dataset.previewCardWidthCorrectionDevicePixels=String(widthCorrection*dpr);
    container.dataset.previewCardHeightCorrectionDevicePixels=String(heightCorrection*dpr);
    return{centering,box:readCardContentBox(container)};
  }

  function domCubeGeometry(net,box,actualScale,dpr){
    const n=Math.max(2,Number(net.dataset.cubeOrder)||3);
    const availableWidth=Math.max(1,Math.floor(box.width*dpr));
    const availableHeight=Math.max(1,Math.floor(box.height*dpr));
    const netGap=Math.max(1,Math.round(BASE_NET_GAP*actualScale*dpr));
    const separator=Math.max(1,Math.round(dpr));
    const padding=separator;
    const fixed=(padding*2)+(separator*(n-1));
    const maximumFace=Math.max(fixed+n,Math.floor(Math.min(
      (availableWidth-(netGap*3))/4,
      (availableHeight-(netGap*2))/3
    )));
    const sticker=Math.max(1,Math.floor((maximumFace-fixed)/n));
    const face=(sticker*n)+fixed;
    return Object.freeze({
      n,dpr,availableWidth,availableHeight,sticker,separator,padding,face,netGap,
      width:(face*4)+(netGap*3),height:(face*3)+(netGap*2)
    });
  }

  function debugDomGeometry(net,n,dpr){
    if(!DEBUG_GEOMETRY)return;
    requestAnimationFrame(()=>{
      const faces=[...net.querySelectorAll(':scope > .ssc-preview-dom-face')],rows=[];
      faces.forEach(face=>{
        const stickers=[...face.querySelectorAll(':scope > .ssc-preview-dom-sticker')];
        const rects=stickers.map(sticker=>sticker.getBoundingClientRect());
        if(rects.length!==n*n)return;
        const widths=rects.map(rect=>Math.round(rect.width*dpr)),heights=rects.map(rect=>Math.round(rect.height*dpr)),horizontalGaps=[],verticalGaps=[];
        for(let row=0;row<n;row++)for(let col=0;col<n-1;col++){
          const index=(row*n)+col;horizontalGaps.push(Math.round((rects[index+1].left-rects[index].right)*dpr));
        }
        for(let row=0;row<n-1;row++)for(let col=0;col<n;col++){
          const index=(row*n)+col;verticalGaps.push(Math.round((rects[index+n].top-rects[index].bottom)*dpr));
        }
        const faceRect=face.getBoundingClientRect(),allGaps=[...horizontalGaps,...verticalGaps];
        const valid=widths.every(value=>value===widths[0])&&heights.every(value=>value===heights[0])&&widths[0]===heights[0]&&allGaps.every(value=>value===allGaps[0])&&Math.round(faceRect.width*dpr)===Math.round(faceRect.height*dpr);
        rows.push({order:n,face:face.dataset.face,facePx:`${Math.round(faceRect.width*dpr)}×${Math.round(faceRect.height*dpr)}`,stickerPx:`${widths[0]}×${heights[0]}`,gapPx:allGaps[0]??0,valid});
        console.assert(valid,`[SSC ${n}x${n} geometry] Uneven geometry detected`,{face:face.dataset.face,widths,heights,horizontalGaps,verticalGaps,faceRect});
      });
      console.table(rows);
    });
  }

  function fitDomCube(container,net,box,actualScale,dpr){
    const geometry=domCubeGeometry(net,box,actualScale,dpr);
    const {box:correctedBox}=applyPixelPerfectCardCorrection(container,geometry,dpr);
    const n=geometry.n;
    const sticker=geometry.sticker/dpr,separator=geometry.separator/dpr,padding=geometry.padding/dpr;
    const face=geometry.face/dpr,netGap=geometry.netGap/dpr;
    const width=geometry.width/dpr,height=geometry.height/dpr;
    net.style.setProperty('--ssc-preview-face',`${face}px`);
    net.style.removeProperty('--ssc-preview-step');
    net.style.setProperty('--ssc-preview-net-gap',`${netGap}px`);
    net.style.setProperty('--ssc-preview-detail-scale',String(actualScale));
    net.style.setProperty('width',`${width}px`,'important');
    net.style.setProperty('height',`${height}px`,'important');
    net.style.setProperty('margin','0','important');
    net.style.setProperty('margin-left',`${Math.max(0,(correctedBox.width-width)/2)}px`,'important');
    net.style.setProperty('margin-top',`${Math.max(0,(correctedBox.height-height)/2)}px`,'important');
    net.style.setProperty('justify-self','left','important');
    net.style.setProperty('align-self','start','important');

    net.querySelectorAll(':scope > .ssc-preview-dom-face').forEach(faceEl=>{
      faceEl.style.setProperty('width',`${face}px`,'important');
      faceEl.style.setProperty('height',`${face}px`,'important');
      faceEl.style.setProperty('padding',`${padding}px`,'important');
      faceEl.style.setProperty('gap',`${separator}px`,'important');
      faceEl.style.setProperty('grid-template-columns',`repeat(${n},${sticker}px)`,'important');
      faceEl.style.setProperty('grid-template-rows',`repeat(${n},${sticker}px)`,'important');
      faceEl.style.setProperty('box-sizing','border-box','important');
      faceEl.querySelectorAll(':scope > .ssc-preview-dom-sticker').forEach(stickerEl=>{
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

    net.dataset.previewNetDeviceWidth=String(geometry.width);
    net.dataset.previewNetDeviceHeight=String(geometry.height);
    net.dataset.previewStickerDevicePixels=String(geometry.sticker);
    net.dataset.previewSeparatorDevicePixels=String(geometry.separator);
    debugDomGeometry(net,n,dpr);
    return true;
  }

  function fitNativeCube(container){
    clearPixelPerfectCardCorrection(container);
    const box=readCardContentBox(container),actualScale=computeLayout().actualScale;
    const dpr=Math.max(.25,Number(window.devicePixelRatio)||1);
    const selectedLineWidth=getCubeLineWidth();
    const pixelPerfectSvg=container.querySelector([
      ':scope > .ssc-native-preview-svg[data-cube-order="2"]',
      ':scope > .ssc-native-preview-svg[data-cube-order="3"]',
      ':scope > .ssc-native-preview-svg[data-cube-order="4"]',
      ':scope > .ssc-native-preview-svg[data-cube-order="5"]',
      ':scope > .ssc-preview-content > .ssc-native-preview-svg[data-cube-order="2"]',
      ':scope > .ssc-preview-content > .ssc-native-preview-svg[data-cube-order="3"]',
      ':scope > .ssc-preview-content > .ssc-native-preview-svg[data-cube-order="4"]',
      ':scope > .ssc-preview-content > .ssc-native-preview-svg[data-cube-order="5"]'
    ].join(','));
    if(pixelPerfectSvg&&window.SSCSvgCubeRenderer?.fitPixelPerfectCubeToBox){
      let geometry;
      try{
        geometry=window.SSCSvgCubeRenderer.fitPixelPerfectCubeToBox(
          pixelPerfectSvg,box.width,box.height,dpr,selectedLineWidth
        );
      }catch(error){
        if(!(error instanceof RangeError))throw error;
        container.dataset.previewFitPending='true';
        return false;
      }
      if(geometry){
        delete container.dataset.previewFitPending;
        const {centering,box:correctedBox}=applyPixelPerfectCardCorrection(container,geometry,dpr);
        const placement=snapPixelPerfectPlacement(correctedBox,geometry,dpr);
        pixelPerfectSvg.style.width=`${placement.cssWidth}px`;
        pixelPerfectSvg.style.height=`${placement.cssHeight}px`;
        pixelPerfectSvg.style.maxWidth='none';
        pixelPerfectSvg.style.maxHeight='none';
        pixelPerfectSvg.style.margin='0';
        pixelPerfectSvg.style.marginLeft=`${placement.offsetX}px`;
        pixelPerfectSvg.style.marginTop=`${placement.offsetY}px`;
        pixelPerfectSvg.style.justifySelf='left';
        pixelPerfectSvg.style.alignSelf='start';
        pixelPerfectSvg.style.display='block';
        pixelPerfectSvg.style.overflow='hidden';
        pixelPerfectSvg.style.removeProperty('transform');
        container.dataset.previewStickerDevicePixels=String(geometry.stickerSize);
        container.dataset.previewSeparatorDevicePixels=String(geometry.lineWidth);
        container.dataset.previewLineDevicePixels=String(geometry.lineWidth);
        container.dataset.previewSelectedLineWidth=String(geometry.selectedLineWidth);
        container.dataset.previewCenteredDeviceWidth=String(centering?.availableWidth??geometry.availableWidth);
        container.dataset.previewCenteredDeviceHeight=String(centering?.availableHeight??geometry.availableHeight);
        container.dataset.previewSnappedLeft=String(placement.snappedLeft);
        container.dataset.previewSnappedTop=String(placement.snappedTop);
        container.dataset.previewCenterErrorXDevicePixels=String(placement.centerErrorXDevicePixels);
        container.dataset.previewCenterErrorYDevicePixels=String(placement.centerErrorYDevicePixels);
        return true;
      }
    }

    const net=container.querySelector(':scope > .cube-preview-net, :scope > .ssc-preview-content > .cube-preview-net');
    if(!net)return false;
    if(net.classList.contains('ssc-preview-dom-net'))return fitDomCube(container,net,box,actualScale,dpr);
    const gap=Math.max(.5,BASE_NET_GAP*actualScale);
    const face=Math.max(1,Math.min((box.width-gap*3)/4,(box.height-gap*2)/3));
    net.style.setProperty('--ssc-preview-face',`${face.toFixed(3)}px`);
    net.style.setProperty('--ssc-preview-net-gap',`${gap.toFixed(3)}px`);
    net.style.setProperty('--ssc-preview-detail-scale',String(actualScale));
    return true;
  }

  function tuneSvg(svg){
    if(!(svg instanceof SVGElement))return;
    if(svg.getAttribute('data-pixel-perfect-grid')==='true')return;
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.style.width='100%';svg.style.height='100%';svg.style.maxWidth='100%';svg.style.maxHeight='100%';svg.style.display='block';svg.style.overflow='hidden';
  }

  function prepareOwnedCanvas(canvas){
    if(!(canvas instanceof HTMLCanvasElement)||canvas.closest('scramble-display'))return;
    if(!canvas.matches('[data-ssc-hi-dpi-canvas]'))return;
    const rect=canvas.getBoundingClientRect(),cssWidth=Math.max(1,Math.round(rect.width)),cssHeight=Math.max(1,Math.round(rect.height)),dpr=Math.min(window.devicePixelRatio||1,2),targetWidth=Math.round(cssWidth*dpr),targetHeight=Math.round(cssHeight*dpr);
    if(canvas.width===targetWidth&&canvas.height===targetHeight)return;
    canvas.width=targetWidth;canvas.height=targetHeight;
    const ctx=canvas.getContext('2d');
    if(ctx){ctx.setTransform(dpr,0,0,dpr,0,0);canvas.dispatchEvent(new CustomEvent('ssc-canvas-resized',{detail:{cssWidth,cssHeight,dpr}}));}
  }

  function tuneScrambleDisplay(display){
    if(!(display instanceof Element))return;
    display.style.width='100%';display.style.height='100%';display.style.maxWidth='100%';display.style.maxHeight='100%';display.style.margin='0';
    const inspect=()=>{const root=display.shadowRoot||display;root.querySelectorAll?.('svg').forEach(tuneSvg);};
    inspect();requestAnimationFrame(()=>{inspect();requestAnimationFrame(inspect);});
  }

  function fitWcaPreview(container){
    const display=container.querySelector(':scope > scramble-display.ssc-wca-scramble-display, :scope > .ssc-preview-content > scramble-display.ssc-wca-scramble-display');
    if(!display)return false;
    const content=display.parentElement?.classList.contains('ssc-preview-content')?display.parentElement:null;
    if(content){content.style.width='100%';content.style.height='100%';content.style.maxWidth='100%';content.style.maxHeight='100%';}
    tuneScrambleDisplay(display);
    window.customElements?.whenDefined?.('scramble-display').then(()=>tuneScrambleDisplay(display)).catch(()=>{});
    return true;
  }

  function fitPreviewToContainer(container){
    if(!(container instanceof Element)||!container.isConnected)return;
    applyFitProfile(container);
    const requested=getPreviewSize(),layout=computeLayout(requested);
    container.dataset.previewRequestedSize=String(requested);
    container.dataset.previewActualScale=layout.actualScale.toFixed(4);
    container.classList.toggle('ssc-preview-small',layout.width<72||layout.height<56);
    fitNativeCube(container);fitWcaPreview(container);
    container.querySelectorAll('svg').forEach(tuneSvg);
    container.querySelectorAll('canvas').forEach(prepareOwnedCanvas);
  }

  function scheduleFit(container){
    if(!(container instanceof Element))return;
    if(container.__sscPreviewFitRaf)cancelAnimationFrame(container.__sscPreviewFitRaf);
    container.__sscPreviewFitRaf=requestAnimationFrame(()=>{container.__sscPreviewFitRaf=0;fitPreviewToContainer(container);});
  }

  function observe(container){
    if(!(container instanceof Element)||observed.has(container))return;
    observed.add(container);resizeObserver?.observe(container);
    new MutationObserver(()=>scheduleFit(container)).observe(container,{childList:true,subtree:true});
    scheduleFit(container);
  }

  function observeAll(){document.querySelectorAll('.cube-preview-card').forEach(observe);}

  function applyPreviewSize(){
    const size=getPreviewSize(),layout=applyRootVariables(size);
    observeAll();document.querySelectorAll('.cube-preview-card').forEach(scheduleFit);
    document.dispatchEvent(new CustomEvent('ssc-preview-size-applied',{detail:{size,requestedScale:layout.requestedScale,actualScale:layout.actualScale,width:layout.width,height:layout.height}}));
    return layout;
  }

  function setPreviewSize(value){const size=clampSize(value);localStorage.setItem(STORAGE_KEY,String(size));applyPreviewSize();return size;}
  function handleViewportChange(){
    if(resizeRaf)cancelAnimationFrame(resizeRaf);
    resizeRaf=requestAnimationFrame(()=>{resizeRaf=0;applyPreviewSize();});
  }

  window.addEventListener('resize',handleViewportChange,{passive:true});
  window.addEventListener('orientationchange',handleViewportChange,{passive:true});
  window.visualViewport?.addEventListener('resize',handleViewportChange,{passive:true});

  window.SSCPreviewSizing=Object.freeze({
    STORAGE_KEY,MIN_SIZE,MAX_SIZE,STEP,DEFAULT_SIZE,BASE_CARD_WIDTH,BASE_CARD_HEIGHT,FIT_PROFILES,
    clampSize,getPreviewSize,setPreviewSize,clampCubeLineWidth,getCubeLineWidth,
    snapPixelPerfectPlacement,applyPreviewSize,fitPreviewToContainer,scheduleFit,observe
  });

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',applyPreviewSize,{once:true});
  else applyPreviewSize();
})();
