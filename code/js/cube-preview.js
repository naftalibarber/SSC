(() => {
  const COLOR_KEY='sscCubeColorsV1';
  const DEFAULT_COLORS={U:'#ffffff',D:'#ffd500',F:'#16a34a',B:'#2563eb',R:'#ef4444',L:'#f97316'};
  const FACE_NORMALS={U:[0,1,0],D:[0,-1,0],F:[0,0,1],B:[0,0,-1],R:[1,0,0],L:[-1,0,0]};
  const FACE_ORDER=['U','L','F','R','B','D'];
  const FACE_CLASS={U:'face-u',L:'face-l',F:'face-f',R:'face-r',B:'face-b',D:'face-d'};
  const SVG_NS='http://www.w3.org/2000/svg';
  const PREMIUM_2X2_EVENTS=new Set(['2x2','222']);
  const PREMIUM_3X3_EVENTS=new Set(['3x3','333']);
  const SVG_GEOMETRY_BASE=Object.freeze({
    face:96,
    faceGap:8,
    outerMargin:4,
    faceRadius:5.5,
    facePadding:4
  });
  const SVG_PUZZLE_GEOMETRY=Object.freeze({
    2:Object.freeze({stickerGap:2,stickerRadius:2.7642857143,cornerStickerRadius:3.3785714286}),
    3:Object.freeze({stickerGap:2,stickerRadius:1.8,cornerStickerRadius:2.2})
  });

  function createSvgGeometry(n){
    const puzzle=SVG_PUZZLE_GEOMETRY[n]||SVG_PUZZLE_GEOMETRY[3];
    const sticker=(SVG_GEOMETRY_BASE.face-(2*SVG_GEOMETRY_BASE.facePadding)-((n-1)*puzzle.stickerGap))/n;
    const geometry=Object.freeze({...SVG_GEOMETRY_BASE,...puzzle,sticker});
    validateSvgGeometry(n,geometry);
    return geometry;
  }

  function validateSvgGeometry(n,geometry){
    const occupied=(2*geometry.facePadding)+(n*geometry.sticker)+((n-1)*geometry.stickerGap);
    console.assert(Number.isInteger(geometry.sticker),'Sticker geometry should use integer SVG units');
    console.assert(geometry.sticker>0&&geometry.sticker===Math.trunc(geometry.sticker),'Sticker size must be a positive integer');
    console.assert(geometry.sticker*geometry.sticker===geometry.sticker**2,'Sticker must be square');
    console.assert(occupied===geometry.face,'Sticker rows and columns must exactly fill the face');
  }

  const SVG_GEOMETRY_BY_SIZE=Object.freeze({
    2:createSvgGeometry(2),
    3:createSvgGeometry(3)
  });
  const SVG_FACE_POSITIONS=Object.freeze({
    U:[1,0],
    L:[0,1],
    F:[1,1],
    R:[2,1],
    B:[3,1],
    D:[1,2]
  });
  let lastRender=null;

  function ensureStyles(){
    const cubeHref='./code/css/cube-preview.css?v=20260825-3';
    const wcaHref='./code/css/wca-previews.css?v=20260824-3';
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

  function validColor(value){return /^#[0-9a-f]{6}$/i.test(value||'')}
  function loadColors(){
    try{
      const saved=JSON.parse(localStorage.getItem(COLOR_KEY));
      if(!saved||typeof saved!=='object')return{...DEFAULT_COLORS};
      return Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([face,fallback])=>[face,validColor(saved[face])?saved[face]:fallback]));
    }catch{return{...DEFAULT_COLORS}}
  }
  let colors=loadColors();

  function coordsForSize(n){return n===2?[-1,1]:[-1,0,1]}
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
    const coords=coordsForSize(n),m=1,stickers=[];
    for(const face of FACE_ORDER){
      for(let row=0;row<n;row++)for(let col=0;col<n;col++)stickers.push(makeSticker(face,row,col,n,coords,m));
    }
    return stickers;
  }

  function dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
  function cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
  function rotateVector(v,axis,quarterDirection){
    const s=quarterDirection,c=0,axv=cross(axis,v),d=dot(axis,v);
    return[
      Math.round(v[0]*c+axv[0]*s+axis[0]*d*(1-c)),
      Math.round(v[1]*c+axv[1]*s+axis[1]*d*(1-c)),
      Math.round(v[2]*c+axv[2]*s+axis[2]*d*(1-c))
    ];
  }
  function applyQuarterTurn(stickers,face,direction){
    const axis=FACE_NORMALS[face];
    for(const sticker of stickers){
      if(dot(sticker.position,axis)!==1)continue;
      sticker.position=rotateVector(sticker.position,axis,direction);
      sticker.normal=rotateVector(sticker.normal,axis,direction);
    }
  }
  function applyMove(stickers,move){
    if(typeof move!=='string'||!move)return;
    const face=move[0];
    if(!FACE_NORMALS[face])return;
    const half=move.endsWith('2');
    const prime=move.endsWith("'");
    const turns=half?2:1;
    const direction=prime?1:-1;
    for(let i=0;i<turns;i++)applyQuarterTurn(stickers,face,direction);
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
    const faces=Object.fromEntries(FACE_ORDER.map(face=>[face,Array.from({length:n},()=>Array(n).fill(null))]));
    for(const sticker of stickers){
      const face=faceFromNormal(sticker.normal),[row,col]=stickerCell(sticker,face,n,coords);
      if(row>=0&&col>=0&&row<n&&col<n)faces[face][row][col]=sticker.colorFace;
    }
    return faces;
  }
  function buildState(scramble,n){
    const stickers=solvedStickers(n);
    for(const move of normalizeScramble(scramble))applyMove(stickers,move);
    return stateToFaces(stickers,n);
  }

  function svgEl(name,attributes={}){
    const node=document.createElementNS(SVG_NS,name);
    for(const [key,value] of Object.entries(attributes)){
      if(value!==undefined&&value!==null)node.setAttribute(key,String(value));
    }
    return node;
  }

  function appendStickerSurface(group,x,y,size,radius,color){
    group.appendChild(svgEl('rect',{
      class:'ssc-cube-svg-sticker',
      x,y,width:size,height:size,rx:radius,ry:radius,
      fill:color
    }));
    group.appendChild(svgEl('rect',{
      class:'ssc-cube-svg-surface',
      x,y,width:size,height:size,rx:radius,ry:radius,
      fill:'url(#sscStickerSurface)'
    }));
  }

  function appendStickerSurfaceDefs(svg){
    const defs=svgEl('defs');
    const gradient=svgEl('linearGradient',{
      id:'sscStickerSurface',
      x1:'0%',y1:'0%',x2:'0%',y2:'100%'
    });
    gradient.appendChild(svgEl('stop',{offset:'0%','stop-color':'#ffffff','stop-opacity':'.14'}));
    gradient.appendChild(svgEl('stop',{offset:'46%','stop-color':'#ffffff','stop-opacity':'.025'}));
    gradient.appendChild(svgEl('stop',{offset:'100%','stop-color':'#000000','stop-opacity':'.065'}));
    defs.appendChild(gradient);
    svg.appendChild(defs);
  }

  function getSvgGeometry(n){
    return SVG_GEOMETRY_BY_SIZE[n]||SVG_GEOMETRY_BY_SIZE[3];
  }

  function getStickerRect(faceX,faceY,row,col,n,geometry){
    const step=geometry.sticker+geometry.stickerGap;
    return Object.freeze({
      x:faceX+geometry.facePadding+col*step,
      y:faceY+geometry.facePadding+row*step,
      width:geometry.sticker,
      height:geometry.sticker
    });
  }

  function renderCubeSvg(container,faces,n){
    const g=getSvgGeometry(n);
    const viewWidth=(g.outerMargin*2)+(g.face*4)+(g.faceGap*3);
    const viewHeight=(g.outerMargin*2)+(g.face*3)+(g.faceGap*2);
    const svg=svgEl('svg',{
      class:'ssc-cube-preview-svg',
      viewBox:`0 0 ${viewWidth} ${viewHeight}`,
      preserveAspectRatio:'xMidYMid meet',
      'aria-hidden':'true',
      focusable:'false',
      'shape-rendering':'geometricPrecision'
    });

    appendStickerSurfaceDefs(svg);

    for(const face of FACE_ORDER){
      const [gridX,gridY]=SVG_FACE_POSITIONS[face];
      const faceX=g.outerMargin+gridX*(g.face+g.faceGap);
      const faceY=g.outerMargin+gridY*(g.face+g.faceGap);
      const faceGroup=svgEl('g',{
        class:'ssc-cube-svg-face',
        'data-face':face
      });
      faceGroup.appendChild(svgEl('rect',{
        class:'ssc-cube-svg-plastic',
        x:faceX,
        y:faceY,
        width:g.face,
        height:g.face,
        rx:g.faceRadius,
        ry:g.faceRadius
      }));

      for(let row=0;row<n;row++){
        for(let col=0;col<n;col++){
          const colorFace=faces[face][row][col]||face;
          const color=colors[colorFace]||DEFAULT_COLORS[colorFace];
          const rect=getStickerRect(faceX,faceY,row,col,n,g);
          const isCorner=(row===0||row===n-1)&&(col===0||col===n-1);
          appendStickerSurface(faceGroup,rect.x,rect.y,rect.width,isCorner?g.cornerStickerRadius:g.stickerRadius,color);
        }
      }
      svg.appendChild(faceGroup);
    }

    container.classList.remove('ssc-preview-2x2-svg-card','ssc-preview-3x3-svg-card');
    container.classList.add('ssc-preview-svg-card',n===2?'ssc-preview-2x2-svg-card':'ssc-preview-3x3-svg-card');
    container.dataset.previewRenderer=`svg-${n}x${n}`;
    container.replaceChildren(svg);
  }

  function render3x3Svg(container,faces){
    renderCubeSvg(container,faces,3);
  }

  function render2x2Svg(container,faces){
    renderCubeSvg(container,faces,2);
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
      for(let row=0;row<n;row++)for(let col=0;col<n;col++){
        const sticker=document.createElement('span');
        sticker.className='cube-preview-sticker';
        const colorFace=faces[face][row][col]||face;
        sticker.style.backgroundColor=colors[colorFace]||DEFAULT_COLORS[colorFace];
        faceEl.appendChild(sticker);
      }
      net.appendChild(faceEl);
    }
    container.classList.remove('ssc-preview-svg-card','ssc-preview-2x2-svg-card','ssc-preview-3x3-svg-card');
    delete container.dataset.previewRenderer;
    container.replaceChildren(net);
  }

  function normalizePuzzleId(puzzle){
    return String(puzzle||'3x3').trim().toLowerCase();
  }

  function puzzleSize(puzzle){
    return PREMIUM_2X2_EVENTS.has(normalizePuzzleId(puzzle))?2:3;
  }

  function isPremium2x2(puzzle){
    return PREMIUM_2X2_EVENTS.has(normalizePuzzleId(puzzle));
  }

  function isPremium3x3(puzzle){
    return PREMIUM_3X3_EVENTS.has(normalizePuzzleId(puzzle));
  }

  function render(container,scramble,puzzle='3x3'){
    if(!container)return;
    const n=puzzleSize(puzzle);
    const faces=buildState(scramble,n);

    if(n===2&&isPremium2x2(puzzle))render2x2Svg(container,faces);
    else if(n===3&&isPremium3x3(puzzle))render3x3Svg(container,faces);
    else renderLegacyGrid(container,faces,n);

    container.dataset.puzzle=n===2?'2×2':'3×3';
    container.setAttribute('role','img');
    container.setAttribute('aria-label',document.documentElement.lang==='en'?`${n} by ${n} cube scramble preview`:`תצוגת ערבוב קובייה ${n} על ${n}`);
    lastRender={container,scramble:normalizeScramble(scramble),puzzle};
    window.SSCPreviewSizing?.scheduleFit?.(container);
  }
  function rerenderLast(){if(lastRender&&lastRender.container?.isConnected)render(lastRender.container,lastRender.scramble,lastRender.puzzle)}
  function getColors(){return{...colors}}
  function setColors(next){
    colors=Object.fromEntries(Object.entries(DEFAULT_COLORS).map(([face,fallback])=>[face,validColor(next?.[face])?next[face]:colors[face]||fallback]));
    localStorage.setItem(COLOR_KEY,JSON.stringify(colors));
    rerenderLast();
  }
  function resetColors(){colors={...DEFAULT_COLORS};localStorage.removeItem(COLOR_KEY);rerenderLast()}

  window.SSCCubePreview={render,getColors,setColors,resetColors};
})();
