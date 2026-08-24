(() => {
  const COLOR_KEY='sscCubeColorsV1';
  const DEFAULT_COLORS={U:'#ffffff',D:'#ffd500',F:'#16a34a',B:'#2563eb',R:'#ef4444',L:'#f97316'};
  const FACE_NORMALS={U:[0,1,0],D:[0,-1,0],F:[0,0,1],B:[0,0,-1],R:[1,0,0],L:[-1,0,0]};
  const FACE_ORDER=['U','L','F','R','B','D'];
  const FACE_CLASS={U:'face-u',L:'face-l',F:'face-f',R:'face-r',B:'face-b',D:'face-d'};
  let lastRender=null;

  function ensureStyles(){
    if(document.querySelector('link[data-ssc-cube-preview-style]'))return;
    const link=document.createElement('link');
    link.rel='stylesheet';
    link.href='./code/css/cube-preview.css?v=20260824-1';
    link.dataset.sscCubePreviewStyle='true';
    document.head.appendChild(link);
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

  function render(container,scramble,puzzle='3x3'){
    if(!container)return;
    const n=puzzle==='2x2'?2:3;
    const faces=buildState(scramble,n);
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
    container.dataset.puzzle=n===2?'2×2':'3×3';
    container.setAttribute('role','img');
    container.setAttribute('aria-label',document.documentElement.lang==='en'?`${n} by ${n} cube scramble preview`:`תצוגת ערבוב קובייה ${n} על ${n}`);
    container.replaceChildren(net);
    lastRender={container,scramble:normalizeScramble(scramble),puzzle};
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
