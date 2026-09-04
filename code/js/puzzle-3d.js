(() => {
  'use strict';

  const LEGACY_3D=window.SSCPuzzle3D||null;
  const NATIVE_EVENT_ORDERS=new Map([
    ['222',2],
    ['333',3],['333bf',3],['333fm',3],['333oh',3],['333mbf',3],
    ['444',4],['444bf',4],
    ['555',5],['555bf',5],
    ['666',6],
    ['777',7]
  ]);
  const NATIVE_EVENT_IDS=new Set(NATIVE_EVENT_ORDERS.keys());
  const EVENT_ALIASES=Object.freeze({
    '2x2':'222','2×2':'222','222':'222',
    '3x3':'333','3×3':'333','333':'333',
    '4x4':'444','4×4':'444','444':'444',
    '5x5':'555','5×5':'555','555':'555',
    '6x6':'666','6×6':'666','666':'666',
    '7x7':'777','7×7':'777','777':'777',
    '3bld':'333bf','333bf':'333bf','3x3bf':'333bf',
    'fmc':'333fm','333fm':'333fm',
    'oh':'333oh','333oh':'333oh','3x3oh':'333oh',
    '4bld':'444bf','444bf':'444bf','4x4bf':'444bf',
    '5bld':'555bf','555bf':'555bf','5x5bf':'555bf',
    'mbld':'333mbf','multi-blind':'333mbf','333mbf':'333mbf'
  });
  const DEFAULT_COLORS=Object.freeze({U:'#ffffff',D:'#ffff00',F:'#00dd00',B:'#0000ff',R:'#ff0000',L:'#ffaa00'});
  const INITIAL_CAMERA=Object.freeze({x:-28,y:-38,scale:1});
  const DEG=Math.PI/180;
  const CAMERA_DISTANCE=5.4;
  const MIN_RENDER_SCALE=3;
  const MAX_RENDER_SCALE=4;
  const MIN_SAFE_RENDER_SCALE=2;
  const MAX_CANVAS_PIXELS=6500000;
  const INTERNAL_GAP=.048;

  const FACE_DEFS=Object.freeze({
    F:{center:[0,0,1],u:[1,0,0],v:[0,-1,0],normal:[0,0,1]},
    B:{center:[0,0,-1],u:[-1,0,0],v:[0,-1,0],normal:[0,0,-1]},
    R:{center:[1,0,0],u:[0,0,-1],v:[0,-1,0],normal:[1,0,0]},
    L:{center:[-1,0,0],u:[0,0,1],v:[0,-1,0],normal:[-1,0,0]},
    U:{center:[0,1,0],u:[1,0,0],v:[0,0,1],normal:[0,1,0]},
    D:{center:[0,-1,0],u:[1,0,0],v:[0,0,-1],normal:[0,-1,0]}
  });
  const FACE_ORDER=Object.freeze(['F','B','R','L','U','D']);

  const states=new WeakMap();
  const activeContainers=new Set();
  let interactiveEnabled=true;

  function normalizeEventId(value){
    const raw=String(value??'333').trim().toLowerCase();
    return EVENT_ALIASES[raw]||raw;
  }
  function nativeOrder(value){return NATIVE_EVENT_ORDERS.get(normalizeEventId(value))||null;}
  function isNativeEvent(value){return NATIVE_EVENT_IDS.has(normalizeEventId(value));}
  function supportsEvent(value){return isNativeEvent(value)||Boolean(LEGACY_3D?.supportsEvent?.(value));}

  function getEvent(value){
    const id=normalizeEventId(value);
    if(!isNativeEvent(id))return LEGACY_3D?.getEvent?.(value)||null;
    const order=nativeOrder(id);
    const dimensionLabel=`${order}×${order}`;
    const puzzle=`${order}x${order}x${order}`;
    const primaryCubeEvent=['222','333','444','555','666','777'].includes(id);
    const fallback={id,label:primaryCubeEvent?dimensionLabel:id.toUpperCase(),name:`${puzzle} Cube`,family:'cube',puzzle,order};
    const metadata=window.SSCWCAEvents?.[id]||LEGACY_3D?.getEvent?.(id)||null;
    return Object.freeze({
      ...fallback,
      ...(metadata||{}),
      id,
      order,
      puzzle:fallback.puzzle,
      label:primaryCubeEvent?dimensionLabel:metadata?.label||fallback.label,
      name:metadata?.name||fallback.name,
      family:metadata?.family||fallback.family
    });
  }

  function injectStyles(){
    if(document.getElementById('sscNativeCube3DStyles'))return;
    const style=document.createElement('style');
    style.id='sscNativeCube3DStyles';
    style.textContent=`
      .ssc-native-cube3d-root{
        position:relative;
        width:100%;height:100%;min-width:0;min-height:0;
        display:grid!important;place-items:center;
        overflow:visible;background:transparent!important;
        touch-action:none;user-select:none;-webkit-user-select:none;
        cursor:grab;
      }
      .ssc-native-cube3d-root:active{cursor:grabbing}
      .ssc-native-cube3d-root.ssc-native-cube3d-static{cursor:default}
      .ssc-native-cube3d-root::after{
        content:'';position:absolute;left:50%;top:68%;z-index:0;
        width:min(54%,330px);height:min(12%,72px);
        transform:translate(-50%,-50%);border-radius:50%;
        background:rgba(0,0,0,.17);filter:blur(14px);pointer-events:none;
      }
      .ssc-native-cube3d-canvas{
        position:absolute;inset:0;z-index:1;
        width:100%;height:100%;display:block;
        background:transparent;pointer-events:none;
      }
      html[data-theme="dark"] .ssc-native-cube3d-root::after,
      html[data-theme="oled"] .ssc-native-cube3d-root::after{background:rgba(0,0,0,.34)}
    `;
    document.head.appendChild(style);
  }

  function palette(){return{...DEFAULT_COLORS,...(window.SSCCubePreview?.getColors?.()||{})};}

  function rotatePoint(point,camera,includeScale=true){
    const scale=includeScale?camera.scale:1;
    const x=point[0]*scale,y=point[1]*scale,z=point[2]*scale;
    const ry=camera.y*DEG;
    const rx=-camera.x*DEG;
    const cy=Math.cos(ry),sy=Math.sin(ry),cx=Math.cos(rx),sx=Math.sin(rx);
    const x1=x*cy+z*sy;
    const z1=-x*sy+z*cy;
    const y1=y;
    return [x1,y1*cx-z1*sx,y1*sx+z1*cx];
  }

  function facePoint(def,u,v){
    return [
      def.center[0]+def.u[0]*u+def.v[0]*v,
      def.center[1]+def.u[1]*u+def.v[1]*v,
      def.center[2]+def.u[2]*u+def.v[2]*v
    ];
  }

  function projected(state,point){
    const rotated=rotatePoint(point,state.camera,true);
    const shortSide=Math.max(1,Math.min(state.cssWidth,state.cssHeight));
    const focal=shortSide*(state.order===2?1.48:1.42);
    const denominator=Math.max(.3,CAMERA_DISTANCE-rotated[2]);
    const perspective=focal/denominator;
    return {
      x:(state.cssWidth*.5)+(rotated[0]*perspective),
      y:(state.cssHeight*.49)-(rotated[1]*perspective),
      z:rotated[2]
    };
  }

  function polygon(ctx,points,fill){
    if(!points.length)return;
    ctx.beginPath();
    ctx.moveTo(points[0].x,points[0].y);
    for(let i=1;i<points.length;i++)ctx.lineTo(points[i].x,points[i].y);
    ctx.closePath();
    ctx.fillStyle=fill;
    ctx.fill();
  }

  function visibleFaces(state){
    const faces=[];
    for(const side of FACE_ORDER){
      const def=FACE_DEFS[side];
      const normal=rotatePoint(def.normal,state.camera,false);
      if(normal[2]<=.0001)continue;
      const corners=[
        facePoint(def,-1,-1),facePoint(def,1,-1),
        facePoint(def,1,1),facePoint(def,-1,1)
      ];
      const rotated=corners.map(point=>rotatePoint(point,state.camera,true));
      const depth=rotated.reduce((sum,p)=>sum+p[2],0)/rotated.length;
      faces.push({side,def,depth});
    }
    faces.sort((a,b)=>a.depth-b.depth);
    return faces;
  }

  function drawFace(state,face){
    const {ctx,order,cubeState,colors}=state;
    const {side,def}=face;
    const faceCorners=[
      projected(state,facePoint(def,-1,-1)),
      projected(state,facePoint(def,1,-1)),
      projected(state,facePoint(def,1,1)),
      projected(state,facePoint(def,-1,1))
    ];
    const theme=document.documentElement.dataset.theme;
    polygon(ctx,faceCorners,theme==='dark'||theme==='oled'?'#050608':'#07080a');

    const cell=2/order;
    const halfGap=INTERNAL_GAP/2;
    for(let row=0;row<order;row++){
      for(let col=0;col<order;col++){
        let u0=-1+(col*cell),u1=-1+((col+1)*cell);
        let v0=-1+(row*cell),v1=-1+((row+1)*cell);
        if(col>0)u0+=halfGap;
        if(col<order-1)u1-=halfGap;
        if(row>0)v0+=halfGap;
        if(row<order-1)v1-=halfGap;
        const identity=cubeState.faces?.[side]?.[row]?.[col]||side;
        const color=colors[identity]||DEFAULT_COLORS[identity]||'#777';
        polygon(ctx,[
          projected(state,facePoint(def,u0,v0)),
          projected(state,facePoint(def,u1,v0)),
          projected(state,facePoint(def,u1,v1)),
          projected(state,facePoint(def,u0,v1))
        ],color);
      }
    }
  }

  function renderCanvas(state){
    if(!state?.ctx||!state.cssWidth||!state.cssHeight)return;
    const {ctx}=state;
    ctx.save();
    ctx.setTransform(state.renderScale,0,0,state.renderScale,0,0);
    ctx.clearRect(0,0,state.cssWidth,state.cssHeight);
    ctx.imageSmoothingEnabled=true;
    if('imageSmoothingQuality' in ctx)ctx.imageSmoothingQuality='high';
    for(const face of visibleFaces(state))drawFace(state,face);
    ctx.restore();
  }

  function scheduleRender(state){
    if(!state||state.raf)return;
    state.raf=requestAnimationFrame(()=>{
      state.raf=0;
      renderCanvas(state);
    });
  }

  function resizeCanvas(state){
    if(!state?.root?.isConnected)return;
    const rect=state.root.getBoundingClientRect();
    const width=Math.max(1,rect.width||0),height=Math.max(1,rect.height||0);
    const dpr=Math.max(1,Number(window.devicePixelRatio)||1);
    const desiredScale=Math.min(MAX_RENDER_SCALE,Math.max(MIN_RENDER_SCALE,dpr*1.5));
    const pixelSafeScale=Math.sqrt(MAX_CANVAS_PIXELS/Math.max(1,width*height));
    const renderScale=Math.max(MIN_SAFE_RENDER_SCALE,Math.min(desiredScale,pixelSafeScale));
    const pixelWidth=Math.max(1,Math.round(width*renderScale));
    const pixelHeight=Math.max(1,Math.round(height*renderScale));
    const changed=state.canvas.width!==pixelWidth||state.canvas.height!==pixelHeight||Math.abs(state.renderScale-renderScale)>.001;
    state.cssWidth=width;
    state.cssHeight=height;
    state.renderScale=renderScale;
    if(changed){
      state.canvas.width=pixelWidth;
      state.canvas.height=pixelHeight;
      state.ctx=state.canvas.getContext('2d',{alpha:true,desynchronized:true})||state.canvas.getContext('2d');
    }
    renderCanvas(state);
  }

  function setCamera(state,x,y,scale=state.camera.scale){
    state.camera.x=Math.max(-82,Math.min(82,Number(x)||0));
    state.camera.y=Number(y)||0;
    state.camera.scale=Math.max(.62,Math.min(1.55,Number(scale)||1));
    scheduleRender(state);
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
      pointerId=event.pointerId;
      startX=event.clientX;startY=event.clientY;
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
      root.releasePointerCapture?.(pointerId);
      pointerId=null;
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
    for(const key of ['previewReady','previewEngine','previewMode','wcaEvent','wcaPuzzle','puzzle'])delete container.dataset[key];
  }

  function disposeNative(container,{clear=true}={}){
    const state=states.get(container);
    if(state){
      unbindInteraction(state);
      state.resizeObserver?.disconnect();
      if(state.raf)cancelAnimationFrame(state.raf);
      states.delete(container);
    }
    activeContainers.delete(container);
    clearMetadata(container);
    if(clear)container.replaceChildren();
  }

  function observeGeometry(state){
    resizeCanvas(state);
    if(typeof ResizeObserver!=='function')return;
    const observer=new ResizeObserver(()=>resizeCanvas(state));
    observer.observe(state.root);
    state.resizeObserver=observer;
  }

  function applyMetadata(container,event){
    clearMetadata(container);
    container.classList.add('ssc-native-cube3d-host','ssc-preview-mode-3d','ssc-preview-3d-ready','wca-preview-ready','wca-family-cube',`wca-event-${event.id}`);
    container.classList.remove('ssc-preview-mode-2d','ssc-preview-3d-unavailable');
    container.dataset.previewMode='3d';
    container.dataset.previewEngine='ssc-native-canvas3d-hidpi';
    container.dataset.previewReady='true';
    container.dataset.wcaEvent=event.id;
    container.dataset.wcaPuzzle=event.puzzle;
    container.dataset.puzzle=event.label;
  }

  function renderNative(container,scramble,eventValue){
    if(!(container instanceof Element))throw new TypeError('SSC native 3D renderer requires a DOM container');
    if(!window.SSCNxNState?.buildState)throw new Error('SSCNxNState is required for native 3D rendering');
    injectStyles();
    disposeNative(container);
    LEGACY_3D?.dispose?.(container);

    const event=getEvent(eventValue)||getEvent('333');
    const order=nativeOrder(event?.id)||event?.order||3;
    const cubeState=window.SSCNxNState.buildState(scramble,order,{strict:true});
    const colors=palette();

    const root=document.createElement('div');
    root.className='ssc-native-cube3d-root ssc-puzzle-3d-player';
    root.dataset.cubeOrder=String(order);
    root.tabIndex=interactiveEnabled?0:-1;
    root.setAttribute('role','img');
    const sizeLabel=`${order}x${order}`;
    root.setAttribute('aria-label',document.documentElement.lang==='en'?`Interactive 3D ${sizeLabel} scramble preview`:`תצוגת ערבוב תלת־ממדית אינטראקטיבית של ${sizeLabel}`);

    const canvas=document.createElement('canvas');
    canvas.className='ssc-native-cube3d-canvas';
    canvas.setAttribute('aria-hidden','true');
    root.appendChild(canvas);
    container.replaceChildren(root);

    const state={
      root,canvas,ctx:null,cubeState,event,order,colors,
      camera:{...INITIAL_CAMERA},listeners:null,resizeObserver:null,
      cssWidth:0,cssHeight:0,renderScale:1,raf:0
    };
    states.set(container,state);
    activeContainers.add(container);
    bindInteraction(root,state);
    observeGeometry(state);
    applyMetadata(container,event);
    setCamera(state,INITIAL_CAMERA.x,INITIAL_CAMERA.y,INITIAL_CAMERA.scale);
    return root;
  }

  async function render(container,scramble,eventValue='333'){
    if(isNativeEvent(eventValue))return renderNative(container,scramble,eventValue);
    disposeNative(container);
    if(LEGACY_3D?.render)return LEGACY_3D.render(container,scramble,eventValue);
    const fallback=document.createElement('div');
    fallback.className='ssc-puzzle-3d-fallback';
    fallback.setAttribute('role','status');
    fallback.textContent=document.documentElement.lang==='en'?'Native 3D is currently available for 2x2 through 7x7 cube events':'תצוגת 3D אמיתית זמינה כרגע למקצי קובייה מ־2x2 עד 7x7';
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
      const state=states.get(container);
      if(!state)return;
      state.root.tabIndex=interactiveEnabled?0:-1;
      state.root.classList.toggle('ssc-native-cube3d-static',!interactiveEnabled);
      container.classList.toggle('ssc-preview-3d-static',!interactiveEnabled);
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