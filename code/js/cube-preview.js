(() => {
  'use strict';

  const COLOR_KEY='sscCubeColorsV1';
  const DEFAULT_COLORS={U:'#ffffff',D:'#ffd500',F:'#16a34a',B:'#2563eb',R:'#ef4444',L:'#f97316'};
  const FACE_NORMALS={U:[0,1,0],D:[0,-1,0],F:[0,0,1],B:[0,0,-1],R:[1,0,0],L:[-1,0,0]};
  const FACE_ORDER=['U','L','F','R','B','D'];
  const FACE_CLASS={U:'face-u',L:'face-l',F:'face-f',R:'face-r',B:'face-b',D:'face-d'};
  const FACE_IDENTITIES=new Set(FACE_ORDER);
  const DEBUG_CUBE_MAPPING=false;
  const NATIVE_CUBE_ORDERS=new Map([
    ['2x2',2],['222',2],
    ['3x3',3],['333',3],
    ['4x4',4],['444',4]
  ]);
  const DOM_CUBE_ORDERS=new Set([2,3,4]);
  const nativeDomCache=new WeakMap();
  const containerIdentityCache=new WeakMap();
  let containerIdentitySequence=0;
  let lastRender=null;

  function ensureStyles(){
    const cubeHref='./code/css/cube-preview.css?v=20260827-234-shared-dom';
    const wcaHref='./code/css/wca-previews.css?v=20260827-444-native-dom';
    const existing=document.querySelector('link[data-ssc-cube-preview-style]');
    if(existing)existing.href=cubeHref;
    else{
      const link=document.createElement('link');
      link.rel='stylesheet';
      link.href=cubeHref;
      link.dataset.sscCubePreviewStyle='true';
      document.head.appendChild(link);
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
      return Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([face,fallback])=>[
        face,
        validColor(saved[face])?saved[face]:fallback
      ]));
    }catch{return{...DEFAULT_COLORS};}
  }
  let colors=loadColors();

  function normalizeScramble(scramble){
    if(Array.isArray(scramble))return scramble.filter(Boolean).map(String);
    if(typeof scramble==='string')return scramble.trim()?scramble.trim().split(/\s+/):[];
    return[];
  }

  /*
   * Shared NxN sticker-state engine for 3x3/4x4.
   * Every visible sticker owns a cubie-space position, outward normal and solved
   * face identity. Turns rotate the sticker state itself; the renderer never
   * interprets moves, corners, wings or centers.
   */
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
    for(const face of FACE_ORDER){
      for(let row=0;row<n;row++){
        for(let col=0;col<n;col++)stickers.push(makeSticker(face,row,col,n,coords,m));
      }
    }
    return stickers;
  }

  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2];}
  function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];}

  function rotateVector(v,axis,quarterDirection){
    const s=quarterDirection,axv=cross(axis,v),d=dot(axis,v);
    return[
      Math.round(axv[0]*s+axis[0]*d),
      Math.round(axv[1]*s+axis[1]*d),
      Math.round(axv[2]*s+axis[2]*d)
    ];
  }

  function applyQuarterTurn(stickers,face,direction,layerDepth=1,n=3){
    const axis=FACE_NORMALS[face];
    const outer=n-1;
    const activeLayers=new Set();
    for(let depth=0;depth<layerDepth;depth++)activeLayers.add(outer-(depth*2));

    for(const sticker of stickers){
      const layer=dot(sticker.position,axis);
      if(!activeLayers.has(layer))continue;
      sticker.position=rotateVector(sticker.position,axis,direction);
      sticker.normal=rotateVector(sticker.normal,axis,direction);
    }
  }

  function parseMove(move,n){
    if(typeof move!=='string'||!move.trim())return null;
    const token=move.trim();
    const match=token.match(/^(\d+)?([URFDLBurfdlb])(w)?(2'|2|'|)?$/);
    if(!match)return null;

    const [,depthPrefix,rawFace,wideSuffix,suffix='']=match;
    const lower=rawFace===rawFace.toLowerCase();
    const explicitWide=Boolean(wideSuffix);
    if(depthPrefix&&!explicitWide)return null;

    const face=rawFace.toUpperCase();
    const layerDepth=depthPrefix?Number(depthPrefix):(lower||explicitWide?2:1);
    if(!FACE_NORMALS[face]||!Number.isInteger(layerDepth)||layerDepth<1||layerDepth>n)return null;
    if(layerDepth>1&&n<4)return null;

    return{
      face,
      layerDepth,
      half:suffix.startsWith('2'),
      prime:suffix.includes("'")
    };
  }

  function applyMove(stickers,move,n){
    const parsed=parseMove(move,n);
    if(!parsed)return;
    const turns=parsed.half?2:1;
    const direction=parsed.prime?1:-1;
    for(let turn=0;turn<turns;turn++)applyQuarterTurn(stickers,parsed.face,direction,parsed.layerDepth,n);
  }

  function faceFromNormal(normal){
    const [x,y,z]=normal;
    if(y===1)return'U';
    if(y===-1)return'D';
    if(z===1)return'F';
    if(z===-1)return'B';
    if(x===1)return'R';
    return'L';
  }

  function stickerCell(sticker,face,n,coords){
    const idx=value=>coords.indexOf(value);
    const [x,y,z]=sticker.position;
    if(face==='F')return[n-1-idx(y),idx(x)];
    if(face==='B')return[n-1-idx(y),n-1-idx(x)];
    if(face==='R')return[n-1-idx(y),n-1-idx(z)];
    if(face==='L')return[n-1-idx(y),idx(z)];
    if(face==='U')return[idx(z),idx(x)];
    return[n-1-idx(z),idx(x)];
  }

  function stateToFaces(stickers,n){
    const coords=coordsForSize(n);
    const faces=Object.fromEntries(FACE_ORDER.map(face=>[
      face,
      Array.from({length:n},()=>Array(n).fill(null))
    ]));

    for(const sticker of stickers){
      const face=faceFromNormal(sticker.normal);
      const [row,col]=stickerCell(sticker,face,n,coords);
      if(row>=0&&col>=0&&row<n&&col<n)faces[face][row][col]=sticker.colorFace;
    }
    return faces;
  }

  function buildCoordinateNxNState(scramble,n){
    const stickers=solvedStickers(n);
    for(const move of normalizeScramble(scramble))applyMove(stickers,move,n);
    const faces=stateToFaces(stickers,n);
    return{engineState:stickers,faces,mapping:buildStickerMapping(faces,n)};
  }

  function validateCubeState(faces,n,{puzzle,scramble}={}){
    const expected=n*n;
    for(const face of FACE_ORDER){
      const rows=Array.isArray(faces?.[face])?faces[face]:[];
      const received=rows.reduce((count,row)=>count+(Array.isArray(row)?row.length:0),0);
      const rectangular=rows.length===n&&rows.every(row=>Array.isArray(row)&&row.length===n);
      const validIdentities=rows.every(row=>Array.isArray(row)&&row.every(identity=>FACE_IDENTITIES.has(identity)));
      if(received!==expected||!rectangular||!validIdentities){
        const active=normalizeScramble(scramble).join(' ')||'(solved)';
        const message=`[SSC cube preview] Invalid ${face} face: received ${received} stickers, expected ${expected}; puzzle=${puzzle||`${n}x${n}`}; scramble=${active}`;
        console.error(message,{face,received,expected,puzzle,scramble,rows});
        throw new Error(message);
      }
    }
  }

  function stickerKey(face,row,col,n){return`${face}${(row*n)+col+1}`;}

  function buildStickerMapping(faces,n){
    const mapping={};
    for(const face of FACE_ORDER){
      for(let row=0;row<n;row++){
        for(let col=0;col<n;col++)mapping[stickerKey(face,row,col,n)]=faces[face][row][col];
      }
    }
    return Object.freeze(mapping);
  }

  function validateStickerMapping(mapping,n){
    const expected=FACE_ORDER.length*n*n;
    const entries=Object.entries(mapping||{});
    if(entries.length!==expected||entries.some(([,identity])=>!FACE_IDENTITIES.has(identity))){
      throw new Error(`[SSC cube preview] Invalid ${n}x${n} sticker mapping: expected ${expected} face identities, received ${entries.length}.`);
    }
  }

  function buildTwoByTwoState(scramble){
    if(!window.Cube2x2?.applyScramble||!window.Cube2x2?.toStickerMapping||!window.Cube2x2?.toFaceState){
      throw new Error('[SSC cube preview] Cube2x2 state engine is required for the 2x2 preview');
    }
    const engineState=window.Cube2x2.applyScramble(normalizeScramble(scramble));
    return{
      engineState,
      faces:window.Cube2x2.toFaceState(engineState),
      mapping:window.Cube2x2.toStickerMapping(engineState)
    };
  }

  function buildNativeState(scramble,n){
    return n===2?buildTwoByTwoState(scramble):buildCoordinateNxNState(scramble,n);
  }

  function getFaceColor(faceIdentity){
    return colors[faceIdentity]||DEFAULT_COLORS[faceIdentity]||'transparent';
  }

  function getContainerIdentity(container){
    const cached=containerIdentityCache.get(container);
    if(cached)return cached;
    const raw=container.id||`ssc-cube-preview-${++containerIdentitySequence}`;
    const identity=raw.replace(/[^a-zA-Z0-9_-]/g,'-');
    containerIdentityCache.set(container,identity);
    return identity;
  }

  function ensureNativeDom(container,n){
    const cached=nativeDomCache.get(container);
    if(cached?.n===n&&cached.net?.parentElement===container)return cached;

    const net=document.createElement('div');
    net.className=`cube-preview-net ssc-preview-dom-net ssc-preview-${n}x${n}-net`;
    if(n===3)net.classList.add('ssc-preview-333-net');
    net.dataset.cubeOrder=String(n);
    net.setAttribute('aria-hidden','true');

    const stickerElements=new Map();
    const prefix=`${getContainerIdentity(container)}-${n}x${n}-`;

    for(const face of FACE_ORDER){
      const faceEl=document.createElement('div');
      faceEl.className=`cube-preview-face ${FACE_CLASS[face]} ssc-preview-dom-face ssc-preview-${n}x${n}-face`;
      if(n===3)faceEl.classList.add('ssc-preview-333-face');
      faceEl.dataset.face=face;
      faceEl.style.setProperty('--n',String(n));

      for(let row=0;row<n;row++){
        for(let col=0;col<n;col++){
          const semanticId=stickerKey(face,row,col,n);
          const sticker=document.createElement('span');
          sticker.id=`${prefix}${semanticId}`;
          sticker.className=`cube-preview-sticker ssc-preview-dom-sticker ssc-preview-${n}x${n}-sticker`;
          if(n===3)sticker.classList.add('ssc-preview-333-sticker');
          sticker.dataset.stickerId=semanticId;
          sticker.dataset.face=face;
          sticker.dataset.row=String(row);
          sticker.dataset.col=String(col);
          faceEl.appendChild(sticker);
          stickerElements.set(semanticId,sticker);
        }
      }
      net.appendChild(faceEl);
    }

    container.replaceChildren(net);
    const created={n,net,stickers:stickerElements};
    nativeDomCache.set(container,created);
    return created;
  }

  function paintNativeDom(container,mapping,n){
    validateStickerMapping(mapping,n);
    const dom=ensureNativeDom(container,n);
    const debugRows=[];

    for(const [stickerId,faceIdentity] of Object.entries(mapping)){
      const sticker=dom.stickers.get(stickerId);
      if(!sticker)continue;
      const color=getFaceColor(faceIdentity);
      sticker.style.backgroundColor=color;
      sticker.dataset.layer=faceIdentity;
      if(DEBUG_CUBE_MAPPING){
        sticker.title=`${stickerId}\nLayer: ${faceIdentity}\nColor: ${color}`;
        debugRows.push({stickerId,faceIdentity,color});
      }else sticker.removeAttribute('title');
    }

    if(DEBUG_CUBE_MAPPING&&debugRows.length)console.table(debugRows);
  }

  function clearRendererClasses(container){
    container.classList.remove(
      'ssc-preview-svg-card',
      'ssc-preview-2x2-svg-card',
      'ssc-preview-3x3-svg-card',
      'ssc-preview-4x4-svg-card',
      'ssc-preview-333-dom-card',
      'ssc-preview-dom-card',
      'ssc-preview-2x2-dom-card',
      'ssc-preview-3x3-dom-card',
      'ssc-preview-4x4-dom-card'
    );
  }

  function renderNativeDom(container,mapping,n){
    clearRendererClasses(container);
    container.classList.add('ssc-preview-dom-card',`ssc-preview-${n}x${n}-dom-card`);
    if(n===3)container.classList.add('ssc-preview-333-dom-card');
    container.dataset.previewRenderer=`dom-${n}x${n}-id-map`;
    paintNativeDom(container,mapping,n);
  }

  function renderLegacyGrid(container,faces,n){
    const net=document.createElement('div');
    net.className='cube-preview-net';
    net.setAttribute('aria-hidden','true');

    for(const face of FACE_ORDER){
      const faceEl=document.createElement('div');
      faceEl.className=`cube-preview-face ${FACE_CLASS[face]}`;
      faceEl.dataset.face=face;
      faceEl.style.setProperty('--n',String(n));
      for(let row=0;row<n;row++){
        for(let col=0;col<n;col++){
          const sticker=document.createElement('span');
          sticker.className='cube-preview-sticker';
          const faceIdentity=faces[face][row][col]||face;
          sticker.style.backgroundColor=getFaceColor(faceIdentity);
          faceEl.appendChild(sticker);
        }
      }
      net.appendChild(faceEl);
    }

    clearRendererClasses(container);
    delete container.dataset.previewRenderer;
    container.replaceChildren(net);
  }

  function normalizePuzzleId(puzzle){return String(puzzle||'3x3').trim().toLowerCase();}
  function puzzleSize(puzzle){return NATIVE_CUBE_ORDERS.get(normalizePuzzleId(puzzle))||3;}

  function render(container,scramble,puzzle='3x3'){
    if(!container)return;
    const normalizedPuzzle=normalizePuzzleId(puzzle);
    const n=puzzleSize(puzzle);
    const normalizedScramble=normalizeScramble(scramble);
    const isNative=NATIVE_CUBE_ORDERS.has(normalizedPuzzle)&&DOM_CUBE_ORDERS.has(n);

    let faces,mapping=null,engineState=null;
    if(isNative){
      const nativeState=buildNativeState(normalizedScramble,n);
      faces=nativeState.faces;
      mapping=nativeState.mapping;
      engineState=nativeState.engineState;
      validateCubeState(faces,n,{puzzle,scramble:normalizedScramble});
      validateStickerMapping(mapping,n);
      renderNativeDom(container,mapping,n);
    }else{
      const legacyState=buildCoordinateNxNState(normalizedScramble,n);
      faces=legacyState.faces;
      validateCubeState(faces,n,{puzzle,scramble:normalizedScramble});
      renderLegacyGrid(container,faces,n);
    }

    container.dataset.puzzle=`${n}×${n}`;
    container.setAttribute('role','img');
    container.setAttribute(
      'aria-label',
      document.documentElement.lang==='en'?`${n} by ${n} cube scramble preview`:`תצוגת ערבוב קובייה ${n} על ${n}`
    );
    lastRender={container,scramble:normalizedScramble,puzzle,n,cubeState:faces,mapping,engineState};
    window.SSCPreviewSizing?.scheduleFit?.(container);
  }

  function rerenderLast({paletteOnly=false}={}){
    if(!lastRender?.container?.isConnected)return;
    if(paletteOnly&&lastRender.mapping&&DOM_CUBE_ORDERS.has(lastRender.n)){
      paintNativeDom(lastRender.container,lastRender.mapping,lastRender.n);
      window.SSCPreviewSizing?.scheduleFit?.(lastRender.container);
      return;
    }
    render(lastRender.container,lastRender.scramble,lastRender.puzzle);
  }

  function getColors(){return{...colors};}

  function setColors(next){
    colors=Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([face,fallback])=>[
      face,
      validColor(next?.[face])?next[face]:colors[face]||fallback
    ]));
    localStorage.setItem(COLOR_KEY,JSON.stringify(colors));
    rerenderLast({paletteOnly:true});
  }

  function resetColors(){
    colors={...DEFAULT_COLORS};
    localStorage.removeItem(COLOR_KEY);
    rerenderLast({paletteOnly:true});
  }

  window.SSCCubePreview=Object.freeze({render,getColors,setColors,resetColors});
})();
