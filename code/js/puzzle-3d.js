(() => {
  'use strict';

  const TWISTY_MODULE_URL='https://cdn.cubing.net/v0/js/cubing/twisty';
  const TWISTY_LOAD_TIMEOUT_MS=12000;
  const states=new WeakMap();
  const activeContainers=new Set();
  let interactiveEnabled=true;
  let renderSequence=0;
  let twistyModulePromise=null;

  const FALLBACK_EVENTS=Object.freeze({
    '222':   {id:'222',label:'2×2',name:'2x2x2 Cube',family:'cube',puzzle:'2x2x2'},
    '333':   {id:'333',label:'3×3',name:'3x3x3 Cube',family:'cube',puzzle:'3x3x3'},
    '444':   {id:'444',label:'4×4',name:'4x4x4 Cube',family:'cube',puzzle:'4x4x4'},
    '555':   {id:'555',label:'5×5',name:'5x5x5 Cube',family:'cube',puzzle:'5x5x5'},
    '666':   {id:'666',label:'6×6',name:'6x6x6 Cube',family:'cube',puzzle:'6x6x6'},
    '777':   {id:'777',label:'7×7',name:'7x7x7 Cube',family:'cube',puzzle:'7x7x7'},
    '333bf': {id:'333bf',label:'3BLD',name:'3x3x3 Blindfolded',family:'cube',puzzle:'3x3x3',baseEvent:'333'},
    '333fm': {id:'333fm',label:'FMC',name:'3x3x3 Fewest Moves',family:'cube',puzzle:'3x3x3',baseEvent:'333'},
    '333oh': {id:'333oh',label:'OH',name:'3x3x3 One-Handed',family:'cube',puzzle:'3x3x3',baseEvent:'333'},
    '333mbf':{id:'333mbf',label:'MBLD',name:'3x3x3 Multi-Blind',family:'cube',puzzle:'3x3x3',baseEvent:'333'},
    '444bf': {id:'444bf',label:'4BLD',name:'4x4x4 Blindfolded',family:'cube',puzzle:'4x4x4',baseEvent:'444'},
    '555bf': {id:'555bf',label:'5BLD',name:'5x5x5 Blindfolded',family:'cube',puzzle:'5x5x5',baseEvent:'555'},
    'clock': {id:'clock',label:'CLOCK',name:'Clock',family:'clock',puzzle:'clock'},
    'minx':  {id:'minx',label:'MEGA',name:'Megaminx',family:'minx',puzzle:'megaminx'},
    'pyram': {id:'pyram',label:'PYRA',name:'Pyraminx',family:'pyram',puzzle:'pyraminx'},
    'skewb': {id:'skewb',label:'SKEWB',name:'Skewb',family:'skewb',puzzle:'skewb'},
    'sq1':   {id:'sq1',label:'SQ-1',name:'Square-1',family:'sq1',puzzle:'square1'},
    'fto':   {id:'fto',label:'FTO',name:'Face-Turning Octahedron',family:'fto',puzzle:'fto'}
  });

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
    'mbld':'333mbf','multi-blind':'333mbf','333mbf':'333mbf',
    '4bld':'444bf','444bf':'444bf','4x4bf':'444bf',
    '5bld':'555bf','555bf':'555bf','5x5bf':'555bf',
    'clock':'clock',
    'megaminx':'minx','mega':'minx','minx':'minx',
    'pyraminx':'pyram','pyra':'pyram','pyram':'pyram',
    'skewb':'skewb',
    'square-1':'sq1','square1':'sq1','sq-1':'sq1','sq1':'sq1',
    'fto':'fto','face-turning-octahedron':'fto','face turning octahedron':'fto','octahedron':'fto'
  });

  const CAMERA_PRESETS=Object.freeze({
    cube:Object.freeze({latitude:28,longitude:35}),
    minx:Object.freeze({latitude:24,longitude:32}),
    pyram:Object.freeze({latitude:18,longitude:30}),
    skewb:Object.freeze({latitude:25,longitude:35}),
    sq1:Object.freeze({latitude:20,longitude:30}),
    clock:Object.freeze({latitude:0,longitude:0}),
    fto:Object.freeze({latitude:22,longitude:35})
  });

  function registry(){return window.SSCWCAEvents||FALLBACK_EVENTS;}

  function normalizeEventId(value){
    if(window.SSCCubePreview?.normalizeEventId)return window.SSCCubePreview.normalizeEventId(value);
    const raw=String(value??'333').trim().toLowerCase();
    return EVENT_ALIASES[raw]||raw;
  }

  function getEvent(eventValue){
    const eventId=normalizeEventId(eventValue);
    const event=registry()[eventId]||FALLBACK_EVENTS[eventId];
    return event?{...event}:null;
  }

  function supportsEvent(eventValue){return Boolean(getEvent(eventValue));}
  function scrambleToText(scramble){return Array.isArray(scramble)?scramble.join(' ').trim():String(scramble??'').trim();}
  function presetFor(event){return CAMERA_PRESETS[event?.family]||CAMERA_PRESETS.cube;}
  function isRTL(){return document.documentElement.dir==='rtl';}
  function nextAnimationFrame(){return new Promise(resolve=>requestAnimationFrame(resolve));}

  async function loadTwistyModule(){
    if(!twistyModulePromise){
      const importPromise=import(TWISTY_MODULE_URL);
      twistyModulePromise=Promise.race([
        importPromise,
        new Promise((_,reject)=>setTimeout(()=>reject(new Error('cubing.js TwistyPlayer did not load in time')),TWISTY_LOAD_TIMEOUT_MS))
      ]).then(module=>{
        if(typeof module?.TwistyPlayer!=='function')throw new Error('cubing.js loaded without TwistyPlayer.');
        return module;
      }).catch(error=>{
        twistyModulePromise=null;
        throw error;
      });
    }
    return twistyModulePromise;
  }

  function applyContainerMetadata(container,event){
    [...container.classList].forEach(className=>{
      if(className.startsWith('wca-family-')||className.startsWith('wca-event-'))container.classList.remove(className);
    });
    container.classList.add('wca-preview-ready','ssc-preview-mode-3d',`wca-family-${event.family}`,`wca-event-${event.id}`);
    container.classList.remove('ssc-preview-mode-2d','ssc-preview-3d-unavailable');
    container.dataset.puzzle=event.label;
    container.dataset.wcaEvent=event.id;
    container.dataset.wcaPuzzle=event.puzzle;
    container.dataset.previewEngine='cubing-twisty-3d';
    container.dataset.previewMode='3d';
    container.setAttribute('aria-label',isRTL()?`תצוגה תלת־ממדית של ${event.name} לאחר הערבוב`:`3D preview of ${event.name} scramble`);
  }

  function renderFallback(container,event,message){
    container.dataset.previewEngine='3d-unavailable';
    container.classList.add('ssc-preview-3d-unavailable');
    const fallback=document.createElement('div');
    fallback.className='ssc-puzzle-3d-fallback';
    fallback.setAttribute('role','status');
    fallback.textContent=message||(isRTL()?'תצוגת 3D אינה זמינה':'3D preview unavailable');
    container.replaceChildren(fallback);
    if(event)container.dataset.puzzle=event.label;
  }

  function cleanupState(container,{clearDOM=true}={}){
    const state=states.get(container);
    if(state){
      state.disposed=true;
      state.resizeObserver?.disconnect();
      if(state.doubleClickHandler)container.removeEventListener('dblclick',state.doubleClickHandler);
      try{state.player?.pause?.();}catch{}
      try{state.player?.remove?.();}catch{}
      states.delete(container);
    }
    activeContainers.delete(container);
    container.classList.remove('ssc-preview-mode-3d','ssc-preview-3d-ready','ssc-preview-3d-static','ssc-preview-3d-unavailable');
    delete container.dataset.previewReady;
    if(clearDOM)container.replaceChildren();
  }

  function configureInteraction(player,enabled){
    player.style.pointerEvents=enabled?'auto':'none';
    player.tabIndex=enabled?0:-1;
    try{
      player.experimentalDragInput=enabled?'auto':'none';
      player.experimentalMovePressInput='none';
    }catch{}
  }

  function applyCamera(player,event){
    const preset=presetFor(event);
    try{
      player.cameraLatitude=preset.latitude;
      player.cameraLongitude=preset.longitude;
    }catch{
      player.setAttribute('camera-latitude',String(preset.latitude));
      player.setAttribute('camera-longitude',String(preset.longitude));
    }
  }

  function applyTheme(player){
    const theme=document.documentElement.dataset.theme;
    try{player.colorScheme=(theme==='dark'||theme==='oled')?'dark':'light';}catch{}
  }

  function configurePlayer(player,event){
    player.className='ssc-puzzle-3d-player';
    player.setAttribute('viewer-link','none');
    player.setAttribute('aria-label',isRTL()?`פאזל ${event.name} בתלת־ממד`:`${event.name} 3D puzzle`);
    player.style.width='100%';
    player.style.height='100%';
    player.style.display='block';
    player.style.background='transparent';
    player.style.maxWidth='100%';
    player.style.maxHeight='100%';
    configureInteraction(player,interactiveEnabled);
    applyCamera(player,event);
    applyTheme(player);
  }

  function setupResizeObserver(container,player,state){
    if(typeof ResizeObserver!=='function')return;
    let frame=0;
    const observer=new ResizeObserver(entries=>{
      const entry=entries[entries.length-1];
      if(!entry||state.disposed)return;
      cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        if(state.disposed)return;
        const {width,height}=entry.contentRect;
        container.style.setProperty('--ssc-3d-width',`${Math.max(0,Math.round(width))}px`);
        container.style.setProperty('--ssc-3d-height',`${Math.max(0,Math.round(height))}px`);
        player.style.width='100%';
        player.style.height='100%';
      });
    });
    observer.observe(container);
    state.resizeObserver=observer;
  }

  function setupResetGesture(container,state){
    const handler=event=>{
      if(!interactiveEnabled||state.disposed)return;
      event.preventDefault();
      resetCamera(container);
    };
    container.addEventListener('dblclick',handler,{passive:false});
    state.doubleClickHandler=handler;
  }

  async function render(container,scramble,eventValue='333'){
    if(!(container instanceof Element))throw new TypeError('SSCPuzzle3D.render() requires a DOM container');

    const token=++renderSequence;
    cleanupState(container);
    const event=getEvent(eventValue);

    if(!event){
      renderFallback(container,null,isRTL()?'הפאזל אינו נתמך בתלת־ממד':'3D preview unavailable for this puzzle');
      console.warn(`[SSC 3D] Unsupported event: ${eventValue}`);
      return null;
    }

    applyContainerMetadata(container,event);
    const state={token,event,player:null,resizeObserver:null,doubleClickHandler:null,disposed:false};
    states.set(container,state);
    activeContainers.add(container);

    const loading=document.createElement('div');
    loading.className='ssc-puzzle-3d-loading';
    loading.setAttribute('aria-hidden','true');
    container.replaceChildren(loading);

    try{
      const {TwistyPlayer}=await loadTwistyModule();
      if(state.disposed||states.get(container)?.token!==token)return null;

      const scrambleText=scrambleToText(scramble);
      const player=new TwistyPlayer({
        puzzle:event.puzzle,
        alg:scrambleText,
        visualization:'3D',
        background:'none',
        controlPanel:'none',
        backView:'none',
        hintFacelets:'none'
      });
      configurePlayer(player,event);
      state.player=player;
      container.replaceChildren(player);
      setupResizeObserver(container,player,state);
      setupResetGesture(container,state);

      await nextAnimationFrame();
      if(state.disposed||states.get(container)?.token!==token)return null;
      try{
        const result=player.jumpToEnd?.();
        if(result&&typeof result.then==='function')await result;
      }catch(error){
        console.warn(`[SSC 3D] Could not jump to final state for ${event.id}`,error);
      }
      if(state.disposed||states.get(container)?.token!==token)return null;

      container.classList.add('ssc-preview-3d-ready');
      container.dataset.previewReady='true';
      return player;
    }catch(error){
      if(state.disposed||states.get(container)?.token!==token)return null;
      console.error(`[SSC 3D] Failed to render ${event.id}`,error);
      cleanupState(container,{clearDOM:false});
      applyContainerMetadata(container,event);
      renderFallback(container,event);
      return null;
    }
  }

  function resetCamera(container){
    const state=states.get(container);
    if(!state?.player)return false;
    applyCamera(state.player,state.event);
    return true;
  }

  function setInteractive(enabled){
    interactiveEnabled=Boolean(enabled);
    activeContainers.forEach(container=>{
      const state=states.get(container);
      if(state?.player)configureInteraction(state.player,interactiveEnabled);
      container.classList.toggle('ssc-preview-3d-static',!interactiveEnabled);
    });
    return interactiveEnabled;
  }

  function clear(container){
    if(!(container instanceof Element))return;
    ++renderSequence;
    cleanupState(container);
  }

  function dispose(container){clear(container);}

  async function getRealScramble(eventId,event){
    if(window.SSCScrambles){
      if(eventId==='333mbf')return (await window.SSCScrambles.generateMultiBlind(1))[0]||'';
      return window.SSCScrambles.generate(eventId);
    }
    const {randomScrambleForEvent}=await import('https://cdn.cubing.net/v0/js/cubing/scramble');
    try{return (await randomScrambleForEvent(eventId)).toString();}
    catch(error){
      if(event.baseEvent)return (await randomScrambleForEvent(event.baseEvent)).toString();
      throw error;
    }
  }

  async function testAll(){
    await loadTwistyModule();
    const testHost=document.createElement('div');
    testHost.className='ssc-puzzle-3d-test-host';
    testHost.setAttribute('aria-hidden','true');
    document.body.appendChild(testHost);

    const results=[];
    try{
      for(const event of Object.values(registry())){
        let scramble='';
        try{
          scramble=await getRealScramble(event.id,event);
          const player=await render(testHost,scramble,event.id);
          await nextAnimationFrame();
          const rect=player?.getBoundingClientRect?.();
          const ok=Boolean(player?.isConnected&&scramble.trim()&&rect&&rect.width>0&&rect.height>0);
          results.push({eventId:event.id,puzzle:event.puzzle,ok,scramble});
          console[ok?'log':'error'](`${ok?'✓':'✗'} ${event.id}`);
        }catch(error){
          results.push({eventId:event.id,puzzle:event.puzzle,ok:false,scramble,error:String(error?.message||error)});
          console.error(`✗ ${event.id}`,error);
        }
      }
    }finally{
      dispose(testHost);
      testHost.remove();
    }
    return {ok:results.every(result=>result.ok),passed:results.filter(result=>result.ok).length,total:results.length,results};
  }

  window.SSCPuzzle3D=Object.freeze({
    render,
    clear,
    dispose,
    supportsEvent,
    getEvent,
    setInteractive,
    resetCamera,
    testAll,
    cameraPresets:CAMERA_PRESETS
  });
})();