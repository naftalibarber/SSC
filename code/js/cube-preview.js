(() => {
  'use strict';

  const COLOR_KEY='sscCubeColorsV1';
  const DEFAULT_COLORS={U:'#ffffff',D:'#ffd500',F:'#16a34a',B:'#2563eb',R:'#ef4444',L:'#f97316'};
  const FACE_NORMALS={U:[0,1,0],D:[0,-1,0],F:[0,0,1],B:[0,0,-1],R:[1,0,0],L:[-1,0,0]};
  const FACE_ORDER=['U','L','F','R','B','D'];
  const FACE_CLASS={U:'face-u',L:'face-l',F:'face-f',R:'face-r',B:'face-b',D:'face-d'};
  const SVG_NS='http://www.w3.org/2000/svg';
  const DEBUG_CUBE_MAPPING=false;
  const NATIVE_CUBE_ORDERS=new Map([
    ['2x2',2],['222',2],
    ['3x3',3],['333',3],
    ['4x4',4],['444',4]
  ]);
  const DOM_CUBE_ORDERS=new Set([2,3]);
  const SVG_GEOMETRY_BASE=Object.freeze({stickerSize:32,stickerGap:0,faceGap:8,outerMargin:1,gridLine:1});

  function createSvgGeometry(n){
    const sticker=SVG_GEOMETRY_BASE.stickerSize;
    const stickerGap=SVG_GEOMETRY_BASE.stickerGap;
    const face=(n*sticker)+((n-1)*stickerGap);
    const geometry=Object.freeze({...SVG_GEOMETRY_BASE,face,sticker});
    validateSvgGeometry(n,geometry);
    return geometry;
  }
  function validateSvgGeometry(n,geometry){
    const occupied=(n*geometry.sticker)+((n-1)*geometry.stickerGap);
    console.assert(Number.isInteger(geometry.sticker),'Sticker geometry should use integer SVG units');
    console.assert(geometry.sticker>0&&geometry.sticker===Math.trunc(geometry.sticker),'Sticker size must be a positive integer');
    console.assert(geometry.sticker*geometry.sticker===geometry.sticker**2,'Sticker must be square');
    console.assert(occupied===geometry.face,'Sticker rows and columns must exactly fill the face');
  }
  const SVG_GEOMETRY_BY_SIZE=Object.freeze({2:createSvgGeometry(2),3:createSvgGeometry(3),4:createSvgGeometry(4)});
  const SVG_FACE_POSITIONS=Object.freeze({U:[1,0],L:[0,1],F:[1,1],R:[2,1],B:[3,1],D:[1,2]});
  const nativeDomCache=new WeakMap();
  const containerIdentityCache=new WeakMap();
  let containerIdentitySequence=0;
  let lastRender=null;

  function ensureStyles(){
    const cubeHref='./code/css/cube-preview.css?v=20260827-22-33-shared-dom';
    const wcaHref='./code/css/wca-previews.css?v=20260824-3';
    const existing=document.querySelector('link[data-ssc-cube-preview-style]');
    if(existing)existing.href=cubeHref;
    else{
      const link=document.createElement('link');
      link.rel='stylesheet';link.href=cubeHref;link.dataset.sscCubePreviewStyle='true';document.head.appendChild(link);
    }
    const wca=document.querySelector('link[href*="wca-previews.css"]');
    if(wca)wca.href=wcaHref;
  }
  ensureStyles();

  function validColor(value){return /^#[0-9a-f]{6}$/i.test(value||'');}
  function loadColors(){
    try{
      const saved=JSON.parse(localStorage.getItem(COLOR_KEY));
      if(!saved||typeof saved!=='object')return{...DEFAULT_COLORS};
      return Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([face,fallback])=>[face,validColor(saved[face])?saved[face]:fallback]));
    }catch{return{...DEFAULT_COLORS};}
  }
  let colors=loadColors();

  function coordsForSize(n){return Array.from({length:n},(_,index)=>(index*2)-(n-1));}
  function makeSticker(face,row,col,n,coords,m){
    let position;
    if(face==='U')position=[coords[col],m,coords[row]];
    else if(face==='D')position=[coords[col],-m,coords[n-1-row]];
    else if(face==='F')position=[coords[col],coords[n-1-row],m];
    else if(face==='B')position=[coords[n-1-col],coords[n-1-row],-m];
    else if(face==='R')position=[m,coords[n-1-row],coords[n-1-col]];
    else position=[-m,coords[n-1-row],coords[col]];
    return{position,normal:[...FACE_NORMALS[face]],colorFace:face};
  }
  function solvedStickers(n){
    const coords=coordsForSize(n),m=n-1,stickers=[];
    for(const face of FACE_ORDER)for(let row=0;row<n;row++)for(let col=0;col<n;col++)stickers.push(makeSticker(face,row,col,n,coords,m));
    return stickers;
  }
  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
  function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}
  function rotateVector(v,axis,quarterDirection){
    const s=quarterDirection,c=0,axv=cross(axis,v),d=dot(axis,v);
    return[Math.round(v[0]*c+axv[0]*s+axis[0]*d*(1-c)),Math.round(v[1]*c+axv[1]*s+axis[1]*d*(1-c)),Math.round(v[2]*c+axv[2]*s+axis[2]*d*(1-c))];
  }
  function applyQuarterTurn(stickers,face,direction,wide=false,n=3){
    const axis=FACE_NORMALS[face],outer=n-1,inner=outer-2;
    for(const sticker of stickers){
      const layer=dot(sticker.position,axis);
      if(layer!==outer&&!(wide&&n>=4&&layer===inner))continue;
      sticker.position=rotateVector(sticker.position,axis,direction);
      sticker.normal=rotateVector(sticker.normal,axis,direction);
    }
  }
  function parseMove(move,n){
    if(typeof move!=='string'||!move)return;
    const token=move.trim(),rawFace=token[0],lower=rawFace>='a'&&rawFace<='z',face=rawFace.toUpperCase();
    if(!FACE_NORMALS[face])return;
    const wide=lower||/^\d*[URFDLB]w/i.test(token);
    if(wide&&n<4)return;
    return{face,wide,half:token.endsWith('2'),prime:token.endsWith("'")};
  }
  function applyMove(stickers,move,n){
    const parsed=parseMove(move,n);if(!parsed)return;
    const {face,wide,half,prime}=parsed,turns=half?2:1,direction=prime?1:-1;
    for(let i=0;i<turns;i++)applyQuarterTurn(stickers,face,direction,wide,n);
  }
  function normalizeScramble(scramble){
    if(Array.isArray(scramble))return scramble.filter(Boolean);
    if(typeof scramble==='string')return scramble.trim()?scramble.trim().split(/\s+/):[];
    return[];
  }
  function faceFromNormal(normal){
    const [x,y,z]=normal;
    if(y===1)return'U';if(y===-1)return'D';if(z===1)return'F';if(z===-1)return'B';if(x===1)return'R';return'L';
  }
  function stickerCell(sticker,face,n,coords){
    const idx=value=>coords.indexOf(value),[x,y,z]=sticker.position;
    if(face==='F')return[n-1-idx(y),idx(x)];
    if(face==='B')return[n-1-idx(y),n-1-idx(x)];
    if(face==='R')return[n-1-idx(y),n-1-idx(z)];
    if(face==='L')return[n-1-idx(y),idx(z)];
    if(face==='U')return[idx(z),idx(x)];
    return[n-1-idx(z),idx(x)];
  }
  function stateToFaces(stickers,n){
    const coords=coordsForSize(n);
    const faces=Object.fromEntries(FACE_ORDER.map(face=>[face,Array.from({length:n},()=>Array(n).fill(null))]));
    for(const sticker of stickers){
      const face=faceFromNormal(sticker.normal),[row,col]=stickerCell(sticker,face,n,coords);
      if(row>=0&&col>=0&&row<n&&col<n)faces[face][row][col]=sticker.colorFace;
    }
    return faces;
  }
  function buildCoordinateState(scramble,n){
    const stickers=solvedStickers(n);
    for(const move of normalizeScramble(scramble))applyMove(stickers,move,n);
    return stateToFaces(stickers,n);
  }
  function validateCubeState(faces,n,{puzzle,scramble}={}){
    const expected=n*n;
    for(const face of FACE_ORDER){
      const rows=Array.isArray(faces?.[face])?faces[face]:[];
      const received=rows.reduce((count,row)=>count+(Array.isArray(row)?row.length:0),0);
      const rectangular=rows.length===n&&rows.every(row=>Array.isArray(row)&&row.length===n);
      if(received!==expected||!rectangular){
        const active=normalizeScramble(scramble).join(' ')||'(solved)';
        const message=`[SSC cube preview] Invalid ${face} face: received ${received} stickers, expected ${expected}; puzzle=${puzzle||`${n}x${n}`}; scramble=${active}`;
        console.error(message,{face,received,expected,puzzle,scramble,rows});throw new Error(message);
      }
    }
  }

  function stickerKey(face,row,col,n){return`${face}${(row*n)+col+1}`;}
  function buildStickerMapping(faces,n){
    const mapping={};
    for(const face of FACE_ORDER)for(let row=0;row<n;row++)for(let col=0;col<n;col++)mapping[stickerKey(face,row,col,n)]=faces[face][row][col]||face;
    return Object.freeze(mapping);
  }
  function buildTwoByTwoState(scramble){
    if(!window.Cube2x2?.applyScramble||!window.Cube2x2?.toStickerMapping||!window.Cube2x2?.toFaceState)throw new Error('[SSC cube preview] Cube2x2 state engine is required for the 2x2 preview');
    const engineState=window.Cube2x2.applyScramble(normalizeScramble(scramble));
    return{engineState,faces:window.Cube2x2.toFaceState(engineState),mapping:window.Cube2x2.toStickerMapping(engineState)};
  }
  function getFaceColor(layer){return colors[layer]||DEFAULT_COLORS[layer]||'transparent';}

  function getContainerIdentity(container){
    const cached=containerIdentityCache.get(container);if(cached)return cached;
    const raw=container.id||`ssc-cube-preview-${++containerIdentitySequence}`;
    const identity=raw.replace(/[^a-zA-Z0-9_-]/g,'-');containerIdentityCache.set(container,identity);return identity;
  }
  function ensureNativeDom(container,n){
    const cached=nativeDomCache.get(container);
    if(cached?.n===n&&cached.net?.parentElement===container)return cached;
    const net=document.createElement('div');
    net.className=`cube-preview-net ssc-preview-dom-net ssc-preview-${n}x${n}-net`;
    if(n===3)net.classList.add('ssc-preview-333-net');
    net.dataset.cubeOrder=String(n);net.setAttribute('aria-hidden','true');
    const stickerElements=new Map(),prefix=`${getContainerIdentity(container)}-${n}x${n}-`;
    for(const face of FACE_ORDER){
      const faceEl=document.createElement('div');
      faceEl.className=`cube-preview-face ${FACE_CLASS[face]} ssc-preview-dom-face ssc-preview-${n}x${n}-face`;
      if(n===3)faceEl.classList.add('ssc-preview-333-face');
      faceEl.dataset.face=face;faceEl.style.setProperty('--n',String(n));
      for(let row=0;row<n;row++)for(let col=0;col<n;col++){
        const semanticId=stickerKey(face,row,col,n),sticker=document.createElement('span');
        sticker.id=`${prefix}${semanticId}`;
        sticker.className=`cube-preview-sticker ssc-preview-dom-sticker ssc-preview-${n}x${n}-sticker`;
        if(n===3)sticker.classList.add('ssc-preview-333-sticker');
        sticker.dataset.stickerId=semanticId;sticker.dataset.face=face;sticker.dataset.row=String(row);sticker.dataset.col=String(col);
        faceEl.appendChild(sticker);stickerElements.set(semanticId,sticker);
      }
      net.appendChild(faceEl);
    }
    container.replaceChildren(net);
    const created={n,net,stickers:stickerElements};nativeDomCache.set(container,created);return created;
  }
  function paintNativeDom(container,mapping,n){
    const dom=ensureNativeDom(container,n),debugRows=[];
    for(const [stickerId,layer] of Object.entries(mapping)){
      const sticker=dom.stickers.get(stickerId);if(!sticker)continue;
      const color=getFaceColor(layer);sticker.style.backgroundColor=color;sticker.dataset.layer=layer;
      if(DEBUG_CUBE_MAPPING){sticker.title=`${stickerId}\nLayer: ${layer}\nColor: ${color}`;debugRows.push({stickerId,layer,color});}else sticker.removeAttribute('title');
    }
    if(DEBUG_CUBE_MAPPING&&debugRows.length)console.table(debugRows);
  }
  function clearRendererClasses(container){
    container.classList.remove('ssc-preview-svg-card','ssc-preview-2x2-svg-card','ssc-preview-3x3-svg-card','ssc-preview-4x4-svg-card','ssc-preview-333-dom-card','ssc-preview-dom-card','ssc-preview-2x2-dom-card','ssc-preview-3x3-dom-card');
  }
  function renderNativeDom(container,mapping,n){
    clearRendererClasses(container);container.classList.add('ssc-preview-dom-card',`ssc-preview-${n}x${n}-dom-card`);
    if(n===3)container.classList.add('ssc-preview-333-dom-card');
    container.dataset.previewRenderer=`dom-${n}x${n}-id-map`;paintNativeDom(container,mapping,n);
  }

  function svgEl(name,attributes={}){const node=document.createElementNS(SVG_NS,name);for(const [key,value] of Object.entries(attributes))if(value!==undefined&&value!==null)node.setAttribute(key,String(value));return node;}
  function appendSticker(group,x,y,size,color,face,row,col){group.appendChild(svgEl('rect',{class:'ssc-cube-svg-sticker',x,y,width:size,height:size,fill:color,'data-face':face,'data-row':row,'data-col':col}));}
  function appendFaceGrid(group,faceX,faceY,n,geometry){
    const path=[];
    for(let index=1;index<n;index++){
      const offset=index*(geometry.sticker+geometry.stickerGap)-(geometry.stickerGap/2);
      path.push(`M ${faceX+offset} ${faceY} V ${faceY+geometry.face}`);path.push(`M ${faceX} ${faceY+offset} H ${faceX+geometry.face}`);
    }
    if(path.length)group.appendChild(svgEl('path',{class:'ssc-cube-svg-grid-lines',d:path.join(' '),'stroke-width':geometry.gridLine}));
    group.appendChild(svgEl('rect',{class:'ssc-cube-svg-face-outline',x:faceX,y:faceY,width:geometry.face,height:geometry.face,'stroke-width':geometry.gridLine}));
  }
  function getSvgGeometry(n){return SVG_GEOMETRY_BY_SIZE[n]||SVG_GEOMETRY_BY_SIZE[3];}
  function getStickerRect(faceX,faceY,row,col,n,geometry){const step=geometry.sticker+geometry.stickerGap;return Object.freeze({x:faceX+col*step,y:faceY+row*step,width:geometry.sticker,height:geometry.sticker});}
  function renderCubeSvg({container,cubeOrder,cubeState,palette=colors,displayScale=1,theme='light'}){
    const n=cubeOrder,faces=cubeState,g=getSvgGeometry(n),viewWidth=(g.outerMargin*2)+(g.face*4)+(g.faceGap*3),viewHeight=(g.outerMargin*2)+(g.face*3)+(g.faceGap*2);
    const svg=svgEl('svg',{class:'ssc-cube-preview-svg',viewBox:`0 0 ${viewWidth} ${viewHeight}`,preserveAspectRatio:'xMidYMid meet','aria-hidden':'true',focusable:'false','shape-rendering':'crispEdges','data-display-scale':displayScale,'data-theme':theme});
    for(const face of FACE_ORDER){
      const [gridX,gridY]=SVG_FACE_POSITIONS[face],faceX=g.outerMargin+gridX*(g.face+g.faceGap),faceY=g.outerMargin+gridY*(g.face+g.faceGap);
      const faceGroup=svgEl('g',{class:'ssc-cube-svg-face','data-face':face});
      for(let row=0;row<n;row++)for(let col=0;col<n;col++){
        const colorFace=faces[face][row][col]||face,color=palette[colorFace]||DEFAULT_COLORS[colorFace],rect=getStickerRect(faceX,faceY,row,col,n,g);
        appendSticker(faceGroup,rect.x,rect.y,rect.width,color,face,row,col);
      }
      appendFaceGrid(faceGroup,faceX,faceY,n,g);svg.appendChild(faceGroup);
    }
    clearRendererClasses(container);container.classList.add('ssc-preview-svg-card',`ssc-preview-${n}x${n}-svg-card`);container.dataset.previewRenderer=`svg-${n}x${n}`;container.replaceChildren(svg);
  }
  function renderNativeSvg(container,faces,n){renderCubeSvg({container,cubeOrder:n,cubeState:faces,palette:colors,displayScale:Number(document.documentElement.style.getPropertyValue('--ssc-preview-actual-scale'))||1,theme:document.documentElement.dataset.theme||'light'});}
  function renderLegacyGrid(container,faces,n){
    const net=document.createElement('div');net.className='cube-preview-net';net.setAttribute('aria-hidden','true');
    for(const face of FACE_ORDER){
      const faceEl=document.createElement('div');faceEl.className=`cube-preview-face ${FACE_CLASS[face]}`;faceEl.dataset.face=face;faceEl.style.setProperty('--n',String(n));
      for(let row=0;row<n;row++)for(let col=0;col<n;col++){
        const sticker=document.createElement('span');sticker.className='cube-preview-sticker';const colorFace=faces[face][row][col]||face;sticker.style.backgroundColor=colors[colorFace]||DEFAULT_COLORS[colorFace];faceEl.appendChild(sticker);
      }
      net.appendChild(faceEl);
    }
    clearRendererClasses(container);delete container.dataset.previewRenderer;container.replaceChildren(net);
  }

  function normalizePuzzleId(puzzle){return String(puzzle||'3x3').trim().toLowerCase();}
  function puzzleSize(puzzle){return NATIVE_CUBE_ORDERS.get(normalizePuzzleId(puzzle))||3;}
  function render(container,scramble,puzzle='3x3'){
    if(!container)return;
    const normalizedPuzzle=normalizePuzzleId(puzzle),n=puzzleSize(puzzle),normalizedScramble=normalizeScramble(scramble);
    let faces,mapping=null,engineState=null;
    if(n===2&&NATIVE_CUBE_ORDERS.has(normalizedPuzzle)){
      const twoByTwo=buildTwoByTwoState(normalizedScramble);faces=twoByTwo.faces;mapping=twoByTwo.mapping;engineState=twoByTwo.engineState;
    }else{
      faces=buildCoordinateState(normalizedScramble,n);
      if(DOM_CUBE_ORDERS.has(n)&&NATIVE_CUBE_ORDERS.has(normalizedPuzzle))mapping=buildStickerMapping(faces,n);
    }
    validateCubeState(faces,n,{puzzle,scramble:normalizedScramble});
    if(mapping&&DOM_CUBE_ORDERS.has(n)&&NATIVE_CUBE_ORDERS.has(normalizedPuzzle))renderNativeDom(container,mapping,n);
    else if(NATIVE_CUBE_ORDERS.has(normalizedPuzzle))renderNativeSvg(container,faces,n);
    else renderLegacyGrid(container,faces,n);
    container.dataset.puzzle=`${n}×${n}`;container.setAttribute('role','img');container.setAttribute('aria-label',document.documentElement.lang==='en'?`${n} by ${n} cube scramble preview`:`תצוגת ערבוב קובייה ${n} על ${n}`);
    lastRender={container,scramble:normalizedScramble,puzzle,n,cubeState:faces,mapping,engineState};
    window.SSCPreviewSizing?.scheduleFit?.(container);
  }
  function rerenderLast({paletteOnly=false}={}){
    if(!lastRender?.container?.isConnected)return;
    if(paletteOnly&&lastRender.mapping&&DOM_CUBE_ORDERS.has(lastRender.n)){
      paintNativeDom(lastRender.container,lastRender.mapping,lastRender.n);window.SSCPreviewSizing?.scheduleFit?.(lastRender.container);return;
    }
    render(lastRender.container,lastRender.scramble,lastRender.puzzle);
  }
  function getColors(){return{...colors};}
  function setColors(next){colors=Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([face,fallback])=>[face,validColor(next?.[face])?next[face]:colors[face]||fallback]));localStorage.setItem(COLOR_KEY,JSON.stringify(colors));rerenderLast({paletteOnly:true});}
  function resetColors(){colors={...DEFAULT_COLORS};localStorage.removeItem(COLOR_KEY);rerenderLast({paletteOnly:true});}

  window.SSCCubePreview=Object.freeze({render,getColors,setColors,resetColors});
})();