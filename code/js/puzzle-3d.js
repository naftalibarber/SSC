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
  const FACE_ORDER=Object.freeze(['F','B','R','L','U','D']);
  // Standard cubing orientation: U (white) on top, F (green) on the left/front,
  // and R (red) on the right. The same camera is used for thumbnail and modal reset.
  const INITIAL_CAMERA=Object.freeze({x:-28,y:-38,scale:1});
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
        --ssc-native-cube-size:150px;
        --ssc-native-cube-half:75px;
        position:relative;
        width:100%;height:100%;min-width:0;min-height:0;
        display:grid!important;place-items:center;
        perspective:760px;perspective-origin:50% 44%;
        overflow:visible;background:transparent!important;
        touch-action:none;user-select:none;-webkit-user-select:none;
        cursor:grab;
      }
      .ssc-native-cube3d-root:active{cursor:grabbing}
      .ssc-native-cube3d-root.ssc-native-cube3d-static{cursor:default}
      .ssc-native-cube3d-root::after{
        content:'';
        position:absolute;
        left:50%;top:68%;
        width:min(54%,330px);height:min(12%,72px);
        transform:translate(-50%,-50%);
        border-radius:50%;
        background:rgba(0,0,0,.17);
        filter:blur(14px);
        pointer-events:none;
      }
      .ssc-native-cube3d-stage{
        position:relative;
        width:var(--ssc-native-cube-size);
        height:var(--ssc-native-cube-size);
        transform-style:preserve-3d;
        z-index:1;
      }
      .ssc-native-cube3d-cube{
        position:absolute;inset:0;
        transform-style:preserve-3d;
        transform-origin:50% 50%;
        will-change:transform;
      }
      .ssc-native-cube3d-face{
        position:absolute;inset:0;
        box-sizing:border-box;
        display:grid;
        grid-template-columns:repeat(3,minmax(0,1fr));
        grid-template-rows:repeat(3,minmax(0,1fr));
        gap:2.4%;
        padding:3.6%;
        border:1px solid rgba(0,0,0,.88);
        border-radius:7.5%;
        background:linear-gradient(145deg,#24272c,#07080a 76%);
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,.035),
          0 0 0 .5px rgba(0,0,0,.65);
        backface-visibility:hidden;
        overflow:hidden;
      }
      .ssc-native-cube3d-face[data-side="F"]{transform:translateZ(var(--ssc-native-cube-half))}
      .ssc-native-cube3d-face[data-side="B"]{transform:rotateY(180deg) translateZ(var(--ssc-native-cube-half))}
      .ssc-native-cube3d-face[data-side="R"]{transform:rotateY(90deg) translateZ(var(--ssc-native-cube-half))}
      .ssc-native-cube3d-face[data-side="L"]{transform:rotateY(-90deg) translateZ(var(--ssc-native-cube-half))}
      .ssc-native-cube3d-face[data-side="U"]{transform:rotateX(90deg) translateZ(var(--ssc-native-cube-half))}
      .ssc-native-cube3d-face[data-side="D"]{transform:rotateX(-90deg) translateZ(var(--ssc-native-cube-half))}
      .ssc-native-cube3d-sticker{
        min-width:0;min-height:0;
        display:block;
        box-sizing:border-box;
        border-radius:10%;
        background:var(--sticker,#777);
        border:1px solid rgba(0,0,0,.28);
        box-shadow:
          inset 0 1px 1px rgba(255,255,255,.24),
          inset 0 -1px 1px rgba(0,0,0,.12);
      }
      .ssc-preview-3d-viewer .ssc-native-cube3d-root{perspective:1080px}
      .cube-preview-card .ssc-native-cube3d-root{perspective:620px}
      html[data-theme="dark"] .ssc-native-cube3d-face{background:linear-gradient(145deg,#2a2e34,#050608 78%)}
      html[data-theme="oled"] .ssc-native-cube3d-face{background:linear-gradient(145deg,#16181b,#000 80%)}
      html[data-theme="dark"] .ssc-native-cube3d-root::after,
      html[data-theme="oled"] .ssc-native-cube3d-root::after{background:rgba(0,0,0,.34)}
      @media(max-width:560px){
        .ssc-native-cube3d-face{gap:2.2%;padding:3.4%}
      }
    `;
    document.head.appendChild(style);
  }

  function palette(){return{...DEFAULT_COLORS,...(window.SSCCubePreview?.getColors?.()||{})};}

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
      setCamera(state,state.camera.x,state.camera.y,state.camera.scale+(event.deltaY<0?.07:-.07));
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

  function createFace(side,faces,colors){
    const face=document.createElement('div');
    face.className='ssc-native-cube3d-face';
    face.dataset.side=side;
    for(let row=0;row<3;row++){
      for(let col=0;col<3;col++){
        const identity=faces?.[side]?.[row]?.[col]||side;
        const sticker=document.createElement('span');
        sticker.className='ssc-native-cube3d-sticker';
        sticker.dataset.side=side;
        sticker.dataset.row=String(row);
        sticker.dataset.col=String(col);
        sticker.dataset.identity=identity;
        sticker.style.setProperty('--sticker',colors[identity]||DEFAULT_COLORS[identity]||'#777');
        face.appendChild(sticker);
      }
    }
    return face;
  }

  function updateGeometry(state){
    if(!state?.root?.isConnected)return;
    const rect=state.root.getBoundingClientRect();
    const shortSide=Math.max(120,Math.min(rect.width||0,rect.height||0));
    const modal=Boolean(state.root.closest('.ssc-preview-3d-viewer'));
    const cubeSize=Math.max(modal?190:92,Math.min(modal?430:166,shortSide*(modal?.60:.68)));
    state.root.style.setProperty('--ssc-native-cube-size',`${cubeSize}px`);
    state.root.style.setProperty('--ssc-native-cube-half',`${cubeSize/2}px`);
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
    container.dataset.previewEngine='ssc-native-css3d-solid';
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
    const cube=document.createElement('div');
    cube.className='ssc-native-cube3d-cube';
    FACE_ORDER.forEach(side=>cube.appendChild(createFace(side,cubeState.faces,colors)));
    stage.appendChild(cube);
    root.appendChild(stage);
    container.replaceChildren(root);

    const state={root,cube,cubeState,event,camera:{...INITIAL_CAMERA},listeners:null,resizeObserver:null};
    states.set(container,state);
    activeContainers.add(container);
    bindInteraction(root,state);
    observeGeometry(state);
    setCamera(state,INITIAL_CAMERA.x,INITIAL_CAMERA.y,INITIAL_CAMERA.scale);
    applyMetadata(container,event);
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