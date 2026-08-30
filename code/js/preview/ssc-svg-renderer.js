(() => {
  'use strict';

  const SVG_NS='http://www.w3.org/2000/svg';
  const DEFAULT_COLORS=Object.freeze({
    U:'#ffffff',
    D:'#ffd500',
    F:'#16a34a',
    B:'#2563eb',
    R:'#ef4444',
    L:'#f97316'
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
    faceGap:24,
    outerPadding:12,
    stickerRadius:7,
    faceRadius:11,
    stickerStroke:null,
    stickerStrokeWidth:0,
    layoutStyle:'ssc-standard'
  });
  // csTimer's 3x3 image uses contiguous square stickers with a black SVG
  // outline, a one-third-sticker gap between faces, and a small outer margin.
  // Keep this profile order-specific so every other NxN preview is unchanged.
  const CSTIMER_3X3_GEOMETRY=Object.freeze({
    stickerSize:100,
    stickerGap:0,
    faceGap:100/3,
    outerPadding:10,
    stickerRadius:0,
    faceRadius:0,
    stickerStroke:'#050505',
    stickerStrokeWidth:10/3,
    layoutStyle:'cstimer-3x3'
  });

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
    const profile=n===3?CSTIMER_3X3_GEOMETRY:GEOMETRY;
    const {stickerSize,stickerGap,faceGap,outerPadding}=profile;
    const faceSize=(n*stickerSize)+((n-1)*stickerGap);
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

  function appendFace(svg,face,faceMatrix,order,colors,prefix,geometry){
    const [faceX,faceY]=faceOrigin(face,geometry);
    const group=svgElement('g',{
      class:'ssc-svg-face',
      'data-face':face,
      transform:`translate(${faceX} ${faceY})`
    });

    const background=svgElement('rect',{
      class:'ssc-svg-face-background',
      x:0,
      y:0,
      width:geometry.faceSize,
      height:geometry.faceSize,
      rx:geometry.faceRadius,
      ry:geometry.faceRadius
    });
    group.appendChild(background);

    for(let row=0;row<order;row++){
      for(let col=0;col<order;col++){
        const semanticId=getCore().stickerId(face,row,col,order);
        const layer=faceMatrix[row][col];
        const x=col*(geometry.stickerSize+geometry.stickerGap);
        const y=row*(geometry.stickerSize+geometry.stickerGap);
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
          stroke:geometry.stickerStroke,
          'stroke-width':geometry.stickerStrokeWidth||null,
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
      'data-preview-engine':'ssc-svg-v1'
    });

    for(const face of getCore().FACE_ORDER){
      appendFace(svg,face,state.faces[face],order,palette,prefix,geometry);
    }

    container.replaceChildren(svg);
    container.dataset.previewRenderer='ssc-svg-v1';
    container.dataset.cubeOrder=String(order);
    container.dataset.previewLayout=geometry.layoutStyle;
    container.classList.remove('ssc-preview-cstimer-3x3');
    if(order===3)container.classList.add('ssc-preview-cstimer-3x3');
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
    CSTIMER_3X3_GEOMETRY,
    geometryFor,
    render,
    renderState,
    updateColors
  });
})();
