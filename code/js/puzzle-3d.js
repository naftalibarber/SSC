(() => {
  'use strict';

  const LEGACY_3D=window.SSCPuzzle3D||null;
  const NATIVE_EVENT_IDS=new Set(['333','333bf','333fm','333oh','333mbf']);
  const EVENT_ALIASES=Object.freeze({
    '3x3':'333','3×3':'333','333':'333',
    '3bld':'333bf','333bf':'333bf','3x3bf':'333bf',
    'fmc':'333fm','333fm':'333fm',
    'oh':'333oh','333oh':'333oh','3x3oh':'333oh',
    'mbld':'333mbf','multi-blind':'333mbf','333mbf':'333mbf'
  });
  const DEFAULT_COLORS=Object.freeze({U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'});
  const INITIAL_CAMERA=Object.freeze({x:-27,y:-38,scale:1});
  const states=new WeakMap();
  const activeContainers=new Set();
  let interactiveEnabled=true;

  function normalizeEventId(value){
    const raw=String(value??'333').trim().toLowerCase();
    return EVENT_ALIASES[raw]||raw;
  }

  function isNativeEvent(value){return NATIVE_EVENT_IDS.has(normalizeEventId(value));}
  function supportsEvent(value){return isNativeEvent(value)||Boolean(LEGACY_3D?.supportsEvent?.(value));}
  function getEvent(value){
    const id=normalizeEventId(value);
    if(isNativeEvent(id)){
      const legacy=LEGACY_3D?.getEvent?.(id);
      return legacy||{id,label:id==='333'?'3×3':id.toUpperCase(),name:'3x3x3 Cube',family:'cube',puzzle:'3x3x3'};
    }
    return LEGACY_3D?.getEvent?.(value)||null;
  }

  function injectStyles(){
    if(document.getElementById('sscNativeCube3DStyles'))return;
    const style=document.createElement('style');
    style.id='sscNativeCube3DStyles';
    style.textContent=`
      .ssc-native-cube3d-root{
        --ssc-cube3d-size:min(72%,220px);
        position:relative;
        width:100%;height:100%;min-width:0;min-height:0;
        display:grid!important;place-items:center;
        perspective:780px;perspective-origin:50% 45%;
        overflow:visible;background:transparent!important;
        touch-action:none;user-select:none;-webkit-user-select:none;
        cursor:grab;
      }
      .ssc-native-cube3d-root:active{cursor:grabbing}
      .ssc-native-cube3d-stage{
        position:relative;
        width:var(--ssc-cube3d-size);height:var(--ssc-cube3d-size);
        transform-style:preserve-3d;
      }
      .ssc-native-cube3d-cube{
        position:absolute;left:50%;top:50%;
        width:0;height:0;transform-style:preserve-3d;
        will-change:transform;
      }
      .ssc-native-cube3d-cubie{
        --cubie:52px;--half:26px;
        position:absolute;left:0;top:0;
        width:var(--cubie);height:var(--cubie);
        margin-left:calc(var(--cubie) / -2);margin-top:calc(var(--cubie) / -2);
        transform-style:preserve-3d;
      }
      .ssc-native-cube3d-face{
        position:absolute;inset:0;
        display:grid;place-items:center;
        box-sizing:border-box;
        border:1px solid rgba(0,0,0,.72);
        border-radius:4px;
        background:linear-gradient(145deg,#24272c,#090a0c 72%);
        backface-visibility:hidden;
        transform-style:preserve-3d;
      }
      .ssc-native-cube3d-face::before{
        content:'';position:absolute;inset:4px;
        border-radius:4px;
        background:var(--sticker,transparent);
        box-shadow:inset 0 0 0 1px rgba(0,0,0,.2),inset 0 1px 1px rgba(255,255,255,.2),0 1px 2px rgba(0,0,0,.28);
        opacity:var(--sticker-visible,0);
      }
      .ssc-native-cube3d-face[data-side="F"]{transform:translateZ(var(--half))}
      .ssc-native-cube3d-face[data-side="B"]{transform:rotateY(180deg) translateZ(var(--half))}
      .ssc-native-cube3d-face[data-side="R"]{transform:rotateY(90deg) translateZ(var(--half))}
      .ssc-native-cube3d-face[data-side="L"]{transform:rotateY(-90deg) translateZ(var(--half))}
      .ssc-native-cube3d-face[data-side="U"]{transform:rotateX(90deg) translateZ(var(--half))}
      .ssc-native-cube3d-face[data-side="D"]{transform:rotateX(-90deg) translateZ(var(--half))}
      .ssc-native-cube3d-shadow{
        position:absolute;left:50%;top:50%;width:68%;height:24%;
        transform:translate(-50%,115%) rotateX(72deg) translateZ(-92px);
        border-radius:50%;background:rgba(0,0,0,.18);filter:blur(12px);pointer-events:none;
      }
      .ssc-preview-3d-viewer .ssc-native-cube3d-root{--ssc-cube3d-size:min(72vmin,520px);perspective:1050px}
      .cube-preview-card .ssc-native-cube3d-root{--ssc-cube3d-size:min(82%,190px);perspective:620px}
      html[data-theme="dark"] .ssc-native-cube3d-face{background:linear-gradient(145deg,#2b2f35,#08090b 74%)}
      html[data-theme="oled"] .ssc-native-cube3d-face{background:linear-gradient(145deg,#17191d,#000 78%)}
      html[data-theme="dark"] .ssc-native-cube3d-shadow,html[data-theme="oled"] .ssc-native-cube3d-shadow{background:rgba(0,0,0,.34)}
      @media(max-width:560px){.ssc-preview-3d-viewer .ssc-native-cube3d-root{--ssc-cube3d-size:min(76vmin,390px)}}
    `;
    document.head.appendChild(style);
  }

  function palette(){return{...DEFAULT_COLORS,...(window.SSCCubePreview?.getColors?.()||{})};}
  function cellFor(side,x,y,z){
    if(side==='F')return[1-y,x+1];
    if(side==='B')return[1-y,1-x];
    if(side==='R')return[1-y,1-z];
    if(side==='L')return[1-y,z+1];
    if(side==='U')return[z+1,x+1];
    return[1-z,x+1];
  }
  function exposed(side,x,y,z){
    return(side==='F'&&z===1)||(side==='B'&&z===-1)||(side==='R'&&x===1)||(side==='L'&&x===-1)||(side==='U'&&y===1)||(side==='D'&&y===-1);
  }

  function setCamera(state,x,y,scale=state.camera.scale){
    state.camera.x=Math.max(-82,Math.min(82,Number(x)||0));
    state.camera.y=Number(y)||0;
    state.camera.scale=Math.max(.62,Math.min(1.55,Number(scale)||1));
    state.cube.style.transform=`rotateX(${state.camera.x}deg) rotateY(${state.camera.y}deg) scale3d(${state.camera.scale},${state.camera.scale},${state.camera.scale})`;
  }

  function resetNativeCamera(container){
    const state=states.get(container);
    if(!state)return false;
    setCamera(state,INITIAL_CAMERA.x,INITIAL_CAMERA.y,INITIAL_CAMERA.scale);
    return true;
  }

  function bindInteraction(root,state){
    let pointerId=null,startX=0,startY=0,startCamX=0,startCamY=0;
    const down=event=>{
      if(!interactiveEnabled||root.style.pointerEvents==='none')return;
      pointerId=event.pointerId;startX=event.clientX;startY=event.clientY;
      startCamX=state.camera.x;startCamY=state.camera.y;
      root.setPointerCapture?.(pointerId);
      event.preventDefault();
    };
    const move=event=>{
      if(pointerId!==event.pointerId||!interactiveEnabled)return;
      const dx=event.clientX-startX,dy=event.clientY-startY;
      setCamera(state,startCamX-(dy*.45),startCamY+(dx*.52));
      event.preventDefault();
    };
    const up=event=>{
      if(pointerId!==event.pointerId)return;
      root.releasePointerCapture?.(pointerId);pointerId=null;
    };
    const wheel=event=>{
      if(!interactiveEnabled||root.closest('.cube-preview-card'))return;
      setCamera(state,state.camera.x,state.camera.y,state.camera.scale+(event.deltaY<0 ? .07 : -.07));
      event.preventDefault();
    };
    root.addEventListener('pointerdown',down,{passive:false});
    root.addEventListener('pointermove',move,{passive:false});
    root.addEventListener('pointerup',up);
    root.addEventListener('pointercancel',up);
    root.addEventListener('wheel',wheel,{passive:false});
    state.listeners={down,move,up,wheel};
  }

  function unbindInteraction(state){
    const {root,listeners}=state||{};
    if(!root||!listeners)return;
    root.removeEventListener('pointerdown',listeners.down);
    root.removeEventListener('pointermove',listeners.move);
    root.removeEventListener('pointerup',listeners.up);
    root.removeEventListener('pointercancel',listeners.up);
    root.removeEventListener('wheel',listeners.wheel);
  }

  function clearMetadata(container){
    [...container.classList].forEach(className=>{
      if(className.startsWith('wca-family-')||className.startsWith('wca-event-'))container.classList.remove(className);
    });
    container.classList.remove('ssc-native-cube3d-host','ssc-preview-mode-3d','ssc-preview-3d-ready','ssc-preview-3d-static','ssc-preview-3d-unavailable','wca-preview-ready');
    for(const key of ['previewReady','previewEngine','previewMode','wcaEvent','wcaPuzzle'])delete container.dataset[key];
  }

  function disposeNative(container,{clear=true}={}){
    const state=states.get(container);
    if(state){unbindInteraction(state);state.resizeObserver?.disconnect();states.delete(container);}
    activeContainers.delete(container);
    clearMetadata(container);
    if(clear)container.replaceChildren();
  }

  function createCubie(x,y,z,faces,colors){
    const cubie=document.createElement('div');
    cubie.className='ssc-native-cube3d-cubie';
    cubie.dataset.x=String(x);cubie.dataset.y=String(y);cubie.dataset.z=String(z);

    for(const side of ['F','B','R','L','U','D']){
      const face=document.createElement('span');
      face.className='ssc-native-cube3d-face';
      face.dataset.side=side;
      if(exposed(side,x,y,z)){
        const [row,col]=cellFor(side,x,y,z);
        const identity=faces?.[side]?.[row]?.[col]||side;
        face.style.setProperty('--sticker',colors[identity]||DEFAULT_COLORS[identity]||'#777');
        face.style.setProperty('--sticker-visible','1');
        face.dataset.identity=identity;
        face.dataset.row=String(row);face.dataset.col=String(col);
      }
      cubie.appendChild(face);
    }
    return cubie;
  }

  function updateGeometry(state){
    if(!state?.root?.isConnected)return;
    const rect=state.root.getBoundingClientRect();
    const shortSide=Math.max(120,Math.min(rect.width||0,rect.height||0));
    const modal=Boolean(state.root.closest('.ssc-preview-3d-viewer'));
    const cubieSize=Math.max(modal?54:30,Math.min(modal?132:52,shortSide*(modal ? .215 : .225)));
    const half=cubieSize/2;
    const step=cubieSize*.965;
    state.root.style.setProperty('--cubie',`${cubieSize}px`);
    state.root.style.setProperty('--half',`${half}px`);
    state.cubies.forEach(cubie=>{
      const x=Number(cubie.dataset.x),y=Number(cubie.dataset.y),z=Number(cubie.dataset.z);
      cubie.style.transform=`translate3d(${x*step}px,${-y*step}px,${z*step}px)`;
    });
  }

  function observeGeometry(state){
    updateGeometry(state);
    if(typeof ResizeObserver!=='function')return;
    const observer=new ResizeObserver(()=>updateGeometry(state));
    observer.observe(state.root);
    state.resizeObserver=observer;
  }

  function applyMetadata(container,event){
    clearMetadata(container);
    container.classList.add('ssc-native-cube3d-host','ssc-preview-mode-3d','ssc-preview-3d-ready','wca-preview-ready','wca-family-cube',`wca-event-${event.id}`);
    container.classList.remove('ssc-preview-mode-2d','ssc-preview-3d-unavailable');
    container.dataset.previewMode='3d';
    container.dataset.previewEngine='ssc-native-css3d';
    container.dataset.previewReady='true';
    container.dataset.wcaEvent=event.id;
    container.dataset.wcaPuzzle='3x3x3';
    container.dataset.puzzle=event.label||'3×3';
  }

  function renderNative(container,scramble,eventValue){
    if(!(container instanceof Element))throw new TypeError('SSC native 3D renderer requires a DOM container');
    if(!window.SSCNxNState?.buildState)throw new Error('SSCNxNState is required for native 3D rendering');
    injectStyles();
    disposeNative(container);
    LEGACY_3D?.dispose?.(container);

    const event=getEvent(eventValue)||{id:'333',label:'3×3',name:'3x3x3 Cube'};
    const cubeState=window.SSCNxNState.buildState(scramble,3,{strict:true});
    const colors=palette();
    const root=document.createElement('div');
    root.className='ssc-native-cube3d-root ssc-puzzle-3d-player';
    root.tabIndex=interactiveEnabled?0:-1;
    root.setAttribute('role','img');
    root.setAttribute('aria-label',document.documentElement.lang==='en'?'Interactive 3D 3x3 scramble preview':'תצוגת ערבוב תלת־ממדית אינטראקטיבית של 3x3');

    const stage=document.createElement('div');
    stage.className='ssc-native-cube3d-stage';
    const shadow=document.createElement('div');shadow.className='ssc-native-cube3d-shadow';
    const cube=document.createElement('div');cube.className='ssc-native-cube3d-cube';
    const cubies=[];
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){const cubie=createCubie(x,y,z,cubeState.faces,colors);cubies.push(cubie);cube.appendChild(cubie);}
    stage.append(shadow,cube);root.appendChild(stage);container.replaceChildren(root);

    const state={root,cube,cubies,cubeState,event,camera:{...INITIAL_CAMERA},listeners:null,resizeObserver:null};
    states.set(container,state);activeContainers.add(container);bindInteraction(root,state);observeGeometry(state);setCamera(state,INITIAL_CAMERA.x,INITIAL_CAMERA.y,INITIAL_CAMERA.scale);applyMetadata(container,event);
    return root;
  }

  async function render(container,scramble,eventValue='333'){
    if(isNativeEvent(eventValue))return renderNative(container,scramble,eventValue);
    disposeNative(container);
    if(LEGACY_3D?.render)return LEGACY_3D.render(container,scramble,eventValue);
    const fallback=document.createElement('div');
    fallback.className='ssc-puzzle-3d-fallback';
    fallback.setAttribute('role','status');
    fallback.textContent=document.documentElement.lang==='en'?'Native 3D is currently available for 3x3 only':'תצוגת 3D אמיתית זמינה כרגע ל־3x3 בלבד';
    container.classList.add('ssc-preview-3d-unavailable');
    container.dataset.previewEngine='native-3d-unavailable';
    container.replaceChildren(fallback);
    return null;
  }

  function resetCamera(container){
    if(states.has(container))return resetNativeCamera(container);
    return Boolean(LEGACY_3D?.resetCamera?.(container));
  }

  function setInteractive(enabled){
    interactiveEnabled=Boolean(enabled);
    activeContainers.forEach(container=>{
      const state=states.get(container);if(!state)return;
      state.root.tabIndex=interactiveEnabled?0:-1;
      state.root.classList.toggle('ssc-native-cube3d-static',!interactiveEnabled);
    });
    LEGACY_3D?.setInteractive?.(interactiveEnabled);
    return interactiveEnabled;
  }

  function clear(container){
    if(!(container instanceof Element))return;
    if(states.has(container))disposeNative(container);
    else LEGACY_3D?.clear?.(container);
  }
  function dispose(container){
    if(!(container instanceof Element))return;
    if(states.has(container))disposeNative(container);
    else LEGACY_3D?.dispose?.(container);
  }

  window.SSCPuzzle3D=Object.freeze({
    render,clear,dispose,resetCamera,setInteractive,supportsEvent,getEvent,
    isNative3D:eventValue=>isNativeEvent(eventValue),
    legacyRenderer:LEGACY_3D
  });
})();
