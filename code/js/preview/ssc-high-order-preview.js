(() => {
  'use strict';

  const HIGH_ORDERS=Object.freeze([6,7]);
  const HIGH_ORDER_SET=new Set(HIGH_ORDERS);
  const HIGH_PROFILES=Object.freeze({
    6:Object.freeze({
      stickerSize:15,
      lineWidth:1,
      faceGap:5,
      outerPadding:2,
      stickerRadius:0,
      faceRadius:0,
      layoutStyle:'cstimer-6x6'
    }),
    7:Object.freeze({
      stickerSize:13,
      lineWidth:1,
      faceGap:4,
      outerPadding:1,
      stickerRadius:0,
      faceRadius:0,
      layoutStyle:'cstimer-7x7'
    })
  });

  const baseRenderer=window.SSCSvgCubeRenderer||null;
  if(!baseRenderer||!window.SSCNxNState){
    console.error('[SSC high-order preview] Base NxN renderer is unavailable.');
    return;
  }

  const PIXEL_PERFECT_ORDERS=Object.freeze(
    [...new Set([...(baseRenderer.PIXEL_PERFECT_ORDERS||[]),...HIGH_ORDERS])].sort((a,b)=>a-b)
  );

  function isHighOrder(order){return HIGH_ORDER_SET.has(Number(order));}

  function profileGeometry(order){
    const n=Number(order);
    const profile=HIGH_PROFILES[n];
    if(!profile)return baseRenderer.geometryFor(n);
    const {stickerSize,lineWidth=1,faceGap,outerPadding}=profile;
    const faceSize=(n*stickerSize)+((n+1)*lineWidth);
    const step=faceSize+faceGap;
    const width=(4*faceSize)+(3*faceGap)+(outerPadding*2);
    const height=(3*faceSize)+(2*faceGap)+(outerPadding*2);
    return Object.freeze({
      n,faceSize,step,width,height,...profile,
      lineWidth,stickerGap:lineWidth,facePadding:lineWidth
    });
  }

  function geometryFor(order){
    return isHighOrder(order)?profileGeometry(order):baseRenderer.geometryFor(order);
  }

  function pixelPerfectCubeGeometry(order,boxWidth,boxHeight,devicePixelRatio=1,selectedLineWidth=1){
    const n=Number(order);
    if(!isHighOrder(n))return baseRenderer.pixelPerfectCubeGeometry(n,boxWidth,boxHeight,devicePixelRatio,selectedLineWidth);

    const dpr=Math.max(.25,Number(devicePixelRatio)||1);
    const availableWidth=Math.max(1,Math.floor((Number(boxWidth)||1)*dpr));
    const availableHeight=Math.max(1,Math.floor((Number(boxHeight)||1)*dpr));
    const normalizedLineWidth=baseRenderer.normalizeSelectedLineWidth(selectedLineWidth);
    const lineWidth=baseRenderer.lineDevicePixels(normalizedLineWidth,dpr);
    const maximumSticker=Math.max(1,Math.floor(Math.min(availableWidth/(4*n),availableHeight/(3*n))));

    for(let stickerSize=maximumSticker;stickerSize>=1;stickerSize--){
      const faceGap=Math.max(1,Math.round(stickerSize/3));
      const outerPadding=Math.max(1,Math.round(stickerSize/10));
      const faceSize=(stickerSize*n)+((n+1)*lineWidth);
      const step=faceSize+faceGap;
      const width=(faceSize*4)+(faceGap*3)+(outerPadding*2);
      const height=(faceSize*3)+(faceGap*2)+(outerPadding*2);
      if(width<=availableWidth&&height<=availableHeight){
        return Object.freeze({
          n,dpr,availableWidth,availableHeight,selectedLineWidth:normalizedLineWidth,
          lineWidth,stickerGap:lineWidth,facePadding:lineWidth,stickerSize,
          faceGap,outerPadding,faceSize,step,width,height,
          stickerRadius:0,faceRadius:0,layoutStyle:`cstimer-${n}x${n}`
        });
      }
    }

    throw new RangeError(`The preview card is too small for a ${n}x${n} pixel grid.`);
  }

  function upgradeSvgToPixelGrid(svg,order,geometry){
    if(!(svg instanceof SVGElement)||!isHighOrder(order))return svg;
    const n=Number(order);

    svg.setAttribute('viewBox',`0 0 ${geometry.width} ${geometry.height}`);
    svg.setAttribute('preserveAspectRatio','xMinYMin meet');
    svg.setAttribute('shape-rendering','crispEdges');
    svg.setAttribute('data-layout-style',`cstimer-${n}x${n}`);
    svg.setAttribute('data-pixel-perfect-grid','true');
    svg.setAttribute('data-line-renderer','face-background');
    svg.setAttribute('data-line-device-pixels',String(geometry.lineWidth));

    svg.querySelectorAll('.ssc-svg-face[data-face]').forEach(group=>{
      const face=group.dataset.face;
      const position=baseRenderer.FACE_POSITIONS?.[face];
      if(!position)return;
      const [gridX,gridY]=position;
      const faceX=geometry.outerPadding+(gridX*geometry.step);
      const faceY=geometry.outerPadding+(gridY*geometry.step);
      group.setAttribute('data-origin-x',String(faceX));
      group.setAttribute('data-origin-y',String(faceY));
      group.setAttribute('data-line-device-pixels',String(geometry.lineWidth));
      group.setAttribute('transform',`translate(${faceX} ${faceY})`);

      const background=[...group.children].find(node=>node.classList?.contains('ssc-svg-face-background'));
      if(background){
        background.setAttribute('x','0');
        background.setAttribute('y','0');
        background.setAttribute('width',String(geometry.faceSize));
        background.setAttribute('height',String(geometry.faceSize));
        background.setAttribute('rx','0');
        background.setAttribute('ry','0');
        background.setAttribute('fill','#000000');
        background.setAttribute('data-grid-background','true');
        background.removeAttribute('stroke');
        background.removeAttribute('stroke-width');
      }

      [...group.children].filter(node=>node.classList?.contains('ssc-svg-sticker')).forEach(sticker=>{
        const row=Number(sticker.dataset.row);
        const col=Number(sticker.dataset.col);
        const step=geometry.stickerSize+geometry.lineWidth;
        sticker.setAttribute('x',String(geometry.lineWidth+(col*step)));
        sticker.setAttribute('y',String(geometry.lineWidth+(row*step)));
        sticker.setAttribute('width',String(geometry.stickerSize));
        sticker.setAttribute('height',String(geometry.stickerSize));
        sticker.setAttribute('rx','0');
        sticker.setAttribute('ry','0');
        sticker.removeAttribute('stroke');
        sticker.removeAttribute('stroke-width');
      });
    });

    return svg;
  }

  function syncLayoutClass(container,order){
    if(!(container instanceof Element))return;
    HIGH_ORDERS.forEach(n=>container.classList.remove(`ssc-preview-cstimer-${n}x${n}`));
    if(isHighOrder(order))container.classList.add(`ssc-preview-cstimer-${Number(order)}x${Number(order)}`);
  }

  function renderState(container,state,options={}){
    const svg=baseRenderer.renderState(container,state,options);
    const order=Number(state?.order);
    syncLayoutClass(container,order);
    if(!isHighOrder(order))return svg;

    const geometry=geometryFor(order);
    upgradeSvgToPixelGrid(svg,order,geometry);
    container.dataset.previewLayout=`cstimer-${order}x${order}`;
    return svg;
  }

  function render(container,{scramble='',order=3,colors,idPrefix}={}){
    const n=Number(order);
    if(!isHighOrder(n))return baseRenderer.render(container,{scramble,order:n,colors,idPrefix});
    const state=window.SSCNxNState.buildState(scramble,n,{strict:false});
    const svg=renderState(container,state,{colors,idPrefix});
    return Object.freeze({svg,state});
  }

  function fitPixelPerfectCubeToBox(svg,boxWidth,boxHeight,devicePixelRatio=1,selectedLineWidth=1){
    const order=Number(svg?.getAttribute?.('data-cube-order'));
    if(!isHighOrder(order))return baseRenderer.fitPixelPerfectCubeToBox(svg,boxWidth,boxHeight,devicePixelRatio,selectedLineWidth);
    const geometry=pixelPerfectCubeGeometry(order,boxWidth,boxHeight,devicePixelRatio,selectedLineWidth);
    upgradeSvgToPixelGrid(svg,order,geometry);
    return geometry;
  }

  window.SSCSvgCubeRenderer=Object.freeze({
    ...baseRenderer,
    CSTIMER_6X6_GEOMETRY:HIGH_PROFILES[6],
    CSTIMER_7X7_GEOMETRY:HIGH_PROFILES[7],
    PIXEL_PERFECT_ORDERS,
    geometryFor,
    pixelPerfectCubeGeometry,
    fitPixelPerfectCubeToBox,
    renderState,
    render
  });

  const observedCards=new WeakSet();
  const resizeObserver='ResizeObserver' in window?new ResizeObserver(entries=>{
    entries.forEach(entry=>scheduleHighOrderFit(entry.target));
  }):null;

  function readCardContentBox(container){
    const style=getComputedStyle(container);
    const rect=container.getBoundingClientRect();
    const left=(parseFloat(style.borderLeftWidth)||0)+(parseFloat(style.paddingLeft)||0);
    const right=(parseFloat(style.borderRightWidth)||0)+(parseFloat(style.paddingRight)||0);
    const top=(parseFloat(style.borderTopWidth)||0)+(parseFloat(style.paddingTop)||0);
    const bottom=(parseFloat(style.borderBottomWidth)||0)+(parseFloat(style.paddingBottom)||0);
    const width=Math.max(1,rect.width-left-right);
    const height=Math.max(1,rect.height-top-bottom);
    return{left:rect.left+left,top:rect.top+top,width,height};
  }

  function applyCardParityCorrection(container,geometry,dpr){
    const centering=window.SSCSvgCubeRenderer.centerPixelPerfectGeometry?.(geometry)||null;
    if(!centering)return{centering,box:readCardContentBox(container)};
    const box=readCardContentBox(container);
    const widthCorrection=Math.max(0,box.width-(centering.availableWidth/dpr));
    const heightCorrection=Math.max(0,box.height-(centering.availableHeight/dpr));
    const widthValue=`${widthCorrection}px`;
    const heightValue=`${heightCorrection}px`;
    if(container.style.getPropertyValue('--ssc-preview-card-width-correction')!==widthValue){
      container.style.setProperty('--ssc-preview-card-width-correction',widthValue);
    }
    if(container.style.getPropertyValue('--ssc-preview-card-height-correction')!==heightValue){
      container.style.setProperty('--ssc-preview-card-height-correction',heightValue);
    }
    container.dataset.previewCardWidthCorrectionDevicePixels=String(widthCorrection*dpr);
    container.dataset.previewCardHeightCorrectionDevicePixels=String(heightCorrection*dpr);
    return{centering,box:readCardContentBox(container)};
  }

  function fallbackPlacement(box,geometry,dpr){
    const cssWidth=geometry.width/dpr;
    const cssHeight=geometry.height/dpr;
    const targetLeft=box.left+((box.width-cssWidth)/2);
    const targetTop=box.top+((box.height-cssHeight)/2);
    const snappedLeft=Math.round(targetLeft*dpr)/dpr;
    const snappedTop=Math.round(targetTop*dpr)/dpr;
    return{
      cssWidth,cssHeight,snappedLeft,snappedTop,
      offsetX:snappedLeft-box.left,
      offsetY:snappedTop-box.top,
      centerErrorXDevicePixels:(snappedLeft-targetLeft)*dpr,
      centerErrorYDevicePixels:(snappedTop-targetTop)*dpr
    };
  }

  function fitHighOrder(container){
    if(!(container instanceof Element)||!container.isConnected)return false;
    const svg=container.querySelector([
      ':scope > .ssc-native-preview-svg[data-cube-order="6"]',
      ':scope > .ssc-native-preview-svg[data-cube-order="7"]',
      ':scope > .ssc-preview-content > .ssc-native-preview-svg[data-cube-order="6"]',
      ':scope > .ssc-preview-content > .ssc-native-preview-svg[data-cube-order="7"]'
    ].join(','));
    if(!(svg instanceof SVGElement))return false;

    const order=Number(svg.getAttribute('data-cube-order'));
    const dpr=Math.max(.25,Number(window.devicePixelRatio)||1);
    const selectedLineWidth=window.SSCPreviewSizing?.getCubeLineWidth?.()||1;
    const box=readCardContentBox(container);
    let geometry;
    try{
      geometry=window.SSCSvgCubeRenderer.fitPixelPerfectCubeToBox(
        svg,box.width,box.height,dpr,selectedLineWidth
      );
    }catch(error){
      if(!(error instanceof RangeError))throw error;
      container.dataset.previewFitPending='true';
      return false;
    }

    delete container.dataset.previewFitPending;
    const {centering,box:correctedBox}=applyCardParityCorrection(container,geometry,dpr);
    const placement=window.SSCPreviewSizing?.snapPixelPerfectPlacement?.(correctedBox,geometry,dpr)
      ||fallbackPlacement(correctedBox,geometry,dpr);

    svg.style.width=`${placement.cssWidth}px`;
    svg.style.height=`${placement.cssHeight}px`;
    svg.style.maxWidth='none';
    svg.style.maxHeight='none';
    svg.style.margin='0';
    svg.style.marginLeft=`${placement.offsetX}px`;
    svg.style.marginTop=`${placement.offsetY}px`;
    svg.style.justifySelf='left';
    svg.style.alignSelf='start';
    svg.style.display='block';
    svg.style.overflow='hidden';
    svg.style.removeProperty('transform');

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
    container.dataset.previewHighOrderConnected=String(order);
    return true;
  }

  function scheduleHighOrderFit(container){
    if(!(container instanceof Element))return;
    if(container.__sscHighOrderFitRaf)cancelAnimationFrame(container.__sscHighOrderFitRaf);
    container.__sscHighOrderFitRaf=requestAnimationFrame(()=>{
      container.__sscHighOrderFitRaf=0;
      fitHighOrder(container);
    });
  }

  function observeCard(container){
    if(!(container instanceof Element)||observedCards.has(container))return;
    observedCards.add(container);
    resizeObserver?.observe(container);
    new MutationObserver(()=>scheduleHighOrderFit(container)).observe(container,{childList:true,subtree:true});
    scheduleHighOrderFit(container);
  }

  function observeAll(){document.querySelectorAll('.cube-preview-card').forEach(observeCard);}
  function refitAll(){document.querySelectorAll('.cube-preview-card').forEach(scheduleHighOrderFit);}

  document.addEventListener('ssc-preview-size-applied',refitAll);
  window.addEventListener('ssc-preview-mode-change',refitAll);
  window.addEventListener('resize',refitAll,{passive:true});
  window.addEventListener('orientationchange',refitAll,{passive:true});
  window.visualViewport?.addEventListener('resize',refitAll,{passive:true});

  observeAll();
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{observeAll();refitAll();},{once:true});

  window.SSCHighOrderPreview=Object.freeze({
    orders:HIGH_ORDERS,
    profiles:HIGH_PROFILES,
    geometryFor,
    pixelPerfectCubeGeometry,
    fit:fitHighOrder,
    refitAll
  });
})();
