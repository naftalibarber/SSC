(() => {
  'use strict';

  const SVG_NS='http://www.w3.org/2000/svg';
  const DEFAULT_COLORS=Object.freeze({
    U:'#ffffff',
    D:'#ffff00',
    F:'#00dd00',
    B:'#0000ff',
    R:'#ff0000',
    L:'#ffaa00'
  });
  const FACE_POSITIONS=Object.freeze({
    U:Object.freeze([1,0]),
    L:Object.freeze([0,1]),
    F:Object.freeze([1,1]),
    R:Object.freeze([2,1]),
    B:Object.freeze([3,1]),
    D:Object.freeze([1,2])
  });
  const GEOMETRY=Object.freeze({
    stickerSize:100,
    stickerGap:7,
    facePadding:0,
    faceGap:24,
    outerPadding:12,
    stickerRadius:7,
    faceRadius:11,
    layoutStyle:'ssc-standard'
  });
  // The 2x2 through 4x4 profiles use one solid black rectangle per face. The
  // colored stickers sit above it, so both the outer frame and every internal
  // separator are parts of the same continuous area rather than SVG strokes.
  const CSTIMER_2X2_GEOMETRY=Object.freeze({
    stickerSize:44,
    lineWidth:1,
    faceGap:15,
    outerPadding:4,
    stickerRadius:0,
    faceRadius:0,
    layoutStyle:'cstimer-2x2'
  });
  const CSTIMER_3X3_GEOMETRY=Object.freeze({
    stickerSize:30,
    lineWidth:1,
    faceGap:10,
    outerPadding:3,
    stickerRadius:0,
    faceRadius:0,
    layoutStyle:'cstimer-3x3'
  });
  const CSTIMER_4X4_GEOMETRY=Object.freeze({
    stickerSize:22,
    lineWidth:1,
    faceGap:7,
    outerPadding:2,
    stickerRadius:0,
    faceRadius:0,
    layoutStyle:'cstimer-4x4'
  });
  const CSTIMER_GEOMETRIES=Object.freeze({
    2:CSTIMER_2X2_GEOMETRY,
    3:CSTIMER_3X3_GEOMETRY,
    4:CSTIMER_4X4_GEOMETRY
  });
  const PIXEL_PERFECT_ORDERS=Object.freeze([2,3,4]);

  let instanceSequence=0;
  const containerIds=new WeakMap();

  function getCore(){
    if(!window.SSCNxNState)throw new Error('SSCSvgCubeRenderer requires SSCNxNState.');
    return window.SSCNxNState;
  }

  function validColor(value){return /^#[0-9a-f]{6}$/i.test(String(value||''));}

  function normalizeColors(colors){
    return Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([face,fallback])=>[
      face,
      validColor(colors?.[face])?String(colors[face]):fallback
    ]));
  }

  function containerPrefix(container){
    const cached=containerIds.get(container);
    if(cached)return cached;
    const base=(container.id||`instance-${++instanceSequence}`).replace(/[^a-zA-Z0-9_-]/g,'-');
    const prefix=`ssc-svg-${base}`;
    containerIds.set(container,prefix);
    return prefix;
  }

  function svgElement(name,attributes={}){
    const element=document.createElementNS(SVG_NS,name);
    for(const [key,value] of Object.entries(attributes)){
      if(value===undefined||value===null)continue;
      element.setAttribute(key,String(value));
    }
    return element;
  }

  function geometryFor(order){
    const n=Number(order);
    const profile=CSTIMER_GEOMETRIES[n]||GEOMETRY;
    if(PIXEL_PERFECT_ORDERS.includes(n)){
      const {stickerSize,lineWidth=1,faceGap,outerPadding}=profile;
      const faceSize=(n*stickerSize)+((n+1)*lineWidth);
      const step=faceSize+faceGap;
      const width=(4*faceSize)+(3*faceGap)+(outerPadding*2);
      const height=(3*faceSize)+(2*faceGap)+(outerPadding*2);
      // stickerGap and facePadding remain read-only aliases for compatibility
      // with diagnostics that predate the background-based grid.
      return Object.freeze({
        n,faceSize,step,width,height,...profile,
        lineWidth,stickerGap:lineWidth,facePadding:lineWidth
      });
    }
    const {stickerSize,stickerGap,facePadding=0,faceGap,outerPadding}=profile;
    const faceSize=(n*stickerSize)+((n-1)*stickerGap)+(facePadding*2);
    const step=faceSize+faceGap;
    const width=(4*faceSize)+(3*faceGap)+(outerPadding*2);
    const height=(3*faceSize)+(2*faceGap)+(outerPadding*2);
    return Object.freeze({n,faceSize,step,width,height,...profile});
  }

  function faceOrigin(face,geometry){
    const [gridX,gridY]=FACE_POSITIONS[face];
    return[
      geometry.outerPadding+(gridX*geometry.step),
      geometry.outerPadding+(gridY*geometry.step)
    ];
  }

  function normalizeSelectedLineWidth(value){
    const width=Number(value);
    if(!Number.isFinite(width))return 1;
    return Math.min(4,Math.max(1,Math.round(width)));
  }

  function lineDevicePixels(selectedLineWidth,devicePixelRatio=1){
    const dpr=Math.max(.25,Number(devicePixelRatio)||1);
    return Math.max(1,Math.round(normalizeSelectedLineWidth(selectedLineWidth)*dpr));
  }

  function pixelPerfectCubeGeometry(order,boxWidth,boxHeight,devicePixelRatio=1,selectedLineWidth=1){
    const n=Number(order);
    if(!PIXEL_PERFECT_ORDERS.includes(n))throw new RangeError('Pixel-perfect SVG geometry is available only for 2x2 through 4x4.');
    const dpr=Math.max(.25,Number(devicePixelRatio)||1);
    const availableWidth=Math.max(1,Math.floor((Number(boxWidth)||1)*dpr));
    const availableHeight=Math.max(1,Math.floor((Number(boxHeight)||1)*dpr));
    const normalizedLineWidth=normalizeSelectedLineWidth(selectedLineWidth);
    const lineWidth=lineDevicePixels(normalizedLineWidth,dpr);
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
          faceGap,outerPadding,faceSize,step,width,height
        });
      }
    }

    throw new RangeError(`The preview card is too small for a ${n}x${n} pixel grid.`);
  }

  function pixelPerfect3x3Geometry(boxWidth,boxHeight,devicePixelRatio=1,selectedLineWidth=1){
    return pixelPerfectCubeGeometry(3,boxWidth,boxHeight,devicePixelRatio,selectedLineWidth);
  }

  function centerPixelPerfectGeometry(geometry){
    if(!geometry||![
      geometry.availableWidth,geometry.availableHeight,geometry.width,geometry.height
    ].every(Number.isInteger))throw new TypeError('Pixel-perfect centering requires integer device-pixel geometry.');
    const remainingWidth=Math.max(0,geometry.availableWidth-geometry.width);
    const remainingHeight=Math.max(0,geometry.availableHeight-geometry.height);
    const widthCorrection=remainingWidth%2;
    const heightCorrection=remainingHeight%2;
    const availableWidth=geometry.availableWidth-widthCorrection;
    const availableHeight=geometry.availableHeight-heightCorrection;
    return Object.freeze({
      widthCorrection,heightCorrection,availableWidth,availableHeight,
      offsetX:(availableWidth-geometry.width)/2,
      offsetY:(availableHeight-geometry.height)/2
    });
  }

  function appendFace(svg,face,faceMatrix,order,colors,prefix,geometry){
    const [faceX,faceY]=faceOrigin(face,geometry);
    const pixelPerfect=PIXEL_PERFECT_ORDERS.includes(order);
    const lineWidth=pixelPerfect?geometry.lineWidth:geometry.stickerGap;
    const group=svgElement('g',{
      class:'ssc-svg-face',
      'data-face':face,
      'data-origin-x':faceX,
      'data-origin-y':faceY,
      'data-line-device-pixels':pixelPerfect?lineWidth:null,
      transform:`translate(${faceX} ${faceY})`
    });

    const background=svgElement('rect',{
      class:'ssc-svg-face-background',
      x:0,
      y:0,
      width:geometry.faceSize,
      height:geometry.faceSize,
      rx:geometry.faceRadius,
      ry:geometry.faceRadius,
      fill:pixelPerfect?'#000000':null,
      'data-grid-background':pixelPerfect?'true':null,
      'aria-hidden':'true'
    });
    group.appendChild(background);

    for(let row=0;row<order;row++){
      for(let col=0;col<order;col++){
        const semanticId=getCore().stickerId(face,row,col,order);
        const layer=faceMatrix[row][col];
        const x=(pixelPerfect?lineWidth:geometry.facePadding)+col*(geometry.stickerSize+lineWidth);
        const y=(pixelPerfect?lineWidth:geometry.facePadding)+row*(geometry.stickerSize+lineWidth);
        const sticker=svgElement('rect',{
          id:`${prefix}-${semanticId}`,
          class:'ssc-svg-sticker',
          x,
          y,
          width:geometry.stickerSize,
          height:geometry.stickerSize,
          rx:geometry.stickerRadius,
          ry:geometry.stickerRadius,
          fill:colors[layer]||DEFAULT_COLORS[layer]||'transparent',
          'data-sticker-id':semanticId,
          'data-face':face,
          'data-row':row,
          'data-col':col,
          'data-layer':layer
        });
        group.appendChild(sticker);
      }
    }

    svg.appendChild(group);
  }

  function fitPixelPerfectCubeToBox(svg,boxWidth,boxHeight,devicePixelRatio=1,selectedLineWidth=1){
    const order=Number(svg?.getAttribute?.('data-cube-order'));
    if(!PIXEL_PERFECT_ORDERS.includes(order))return null;
    const geometry=pixelPerfectCubeGeometry(order,boxWidth,boxHeight,devicePixelRatio,selectedLineWidth);
    svg.setAttribute('viewBox',`0 0 ${geometry.width} ${geometry.height}`);
    svg.setAttribute('preserveAspectRatio','xMinYMin meet');
    svg.setAttribute('shape-rendering','crispEdges');
    svg.setAttribute('data-pixel-perfect-grid','true');
    svg.setAttribute('data-line-renderer','face-background');
    svg.setAttribute('data-line-device-pixels',String(geometry.lineWidth));

    svg.querySelectorAll('.ssc-svg-face[data-face]').forEach(group=>{
      const face=group.dataset.face;
      const [gridX,gridY]=FACE_POSITIONS[face];
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
        sticker.removeAttribute('stroke');
        sticker.removeAttribute('stroke-width');
      });
    });

    return geometry;
  }

  function fitThreeByThreeToBox(svg,boxWidth,boxHeight,devicePixelRatio=1,selectedLineWidth=1){
    if(!svg||svg.getAttribute?.('data-cube-order')!=='3')return null;
    return fitPixelPerfectCubeToBox(svg,boxWidth,boxHeight,devicePixelRatio,selectedLineWidth);
  }

  function renderState(container,state,{colors,idPrefix}={}){
    if(!(container instanceof Element))throw new TypeError('SSCSvgCubeRenderer.renderState() requires a DOM container.');
    if(!state?.faces||!state?.order)throw new TypeError('SSCSvgCubeRenderer.renderState() requires an SSC NxN state.');

    const order=Number(state.order);
    getCore().validateFaces(state.faces,order);
    const palette=normalizeColors(colors);
    const geometry=geometryFor(order);
    const prefix=idPrefix||containerPrefix(container);

    const svg=svgElement('svg',{
      class:'ssc-native-preview-svg',
      viewBox:`0 0 ${geometry.width} ${geometry.height}`,
      preserveAspectRatio:'xMidYMid meet',
      role:'img',
      'aria-hidden':'true',
      focusable:'false',
      'data-cube-order':order,
      'data-layout-style':geometry.layoutStyle,
      'data-preview-engine':'ssc-svg-v1',
      'data-pixel-perfect-grid':PIXEL_PERFECT_ORDERS.includes(order)?'true':null,
      'data-line-renderer':PIXEL_PERFECT_ORDERS.includes(order)?'face-background':null,
      'data-line-device-pixels':PIXEL_PERFECT_ORDERS.includes(order)?geometry.lineWidth:null,
      'shape-rendering':PIXEL_PERFECT_ORDERS.includes(order)?'crispEdges':null
    });

    for(const face of getCore().FACE_ORDER){
      appendFace(svg,face,state.faces[face],order,palette,prefix,geometry);
    }

    container.replaceChildren(svg);
    container.dataset.previewRenderer='ssc-svg-v1';
    container.dataset.cubeOrder=String(order);
    container.dataset.previewLayout=geometry.layoutStyle;
    container.classList.remove(...PIXEL_PERFECT_ORDERS.map(n=>`ssc-preview-cstimer-${n}x${n}`));
    if(PIXEL_PERFECT_ORDERS.includes(order))container.classList.add(`ssc-preview-cstimer-${order}x${order}`);
    container.classList.add('ssc-native-svg-preview');
    return svg;
  }

  function render(container,{scramble='',order=3,colors,idPrefix}={}){
    const state=getCore().buildState(scramble,order,{strict:false});
    const svg=renderState(container,state,{colors,idPrefix});
    return Object.freeze({svg,state});
  }

  function updateColors(container,colors){
    if(!(container instanceof Element))return false;
    const palette=normalizeColors(colors);
    const stickers=container.querySelectorAll('.ssc-native-preview-svg .ssc-svg-sticker[data-layer]');
    if(!stickers.length)return false;
    stickers.forEach(sticker=>{
      const layer=sticker.dataset.layer;
      sticker.setAttribute('fill',palette[layer]||DEFAULT_COLORS[layer]||'transparent');
    });
    return true;
  }

  window.SSCSvgCubeRenderer=Object.freeze({
    DEFAULT_COLORS,
    FACE_POSITIONS,
    GEOMETRY,
    CSTIMER_2X2_GEOMETRY,
    CSTIMER_3X3_GEOMETRY,
    CSTIMER_4X4_GEOMETRY,
    PIXEL_PERFECT_ORDERS,
    geometryFor,
    normalizeSelectedLineWidth,
    lineDevicePixels,
    pixelPerfectCubeGeometry,
    pixelPerfect3x3Geometry,
    centerPixelPerfectGeometry,
    fitPixelPerfectCubeToBox,
    fitThreeByThreeToBox,
    render,
    renderState,
    updateColors
  });
})();
