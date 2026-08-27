(() => {
  'use strict';

  const CUBING_SCRAMBLE_URL='https://cdn.cubing.net/v0/js/cubing/scramble';
  const MAX_BATCH=200;
  const MULTI_BLIND_EVENT='333mbf';
  const NXN_ORDERS=Object.freeze({222:2,333:3,444:4,555:5,666:6,777:7});
  const FALLBACK_LENGTHS=Object.freeze({222:9,333:23,444:40,555:60,666:80,777:100});
  const MODIFIERS=Object.freeze(['',"'",'2']);
  const FACE_AXIS=Object.freeze({R:'RL',L:'RL',U:'UD',D:'UD',F:'FB',B:'FB'});
  let scrambleModulePromise=null;

  function registry(){
    const value=window.SSCWCAEvents;
    if(!value||typeof value!=='object')throw new Error('SSCScrambleProvider requires window.SSCWCAEvents to be loaded first.');
    return value;
  }

  function normalizeEventId(eventId){
    if(typeof eventId!=='string'||!eventId.trim())return null;
    const normalized=window.SSCCubePreview?.normalizeEventId?.(eventId);
    if(!normalized)return null;
    return registry()[normalized]?normalized:null;
  }

  function supportsEvent(eventId){return normalizeEventId(eventId)!==null;}
  function isNxNEvent(eventId){return Boolean(NXN_ORDERS[eventId]);}

  function getEvent(eventId){
    const id=normalizeEventId(eventId);
    const event=id?registry()[id]:null;
    return event?{...event}:null;
  }

  function getEvents(){return Object.values(registry()).map(event=>({...event}));}

  function assertAmount(value,label='amount'){
    if(!Number.isInteger(value)||value<1||value>MAX_BATCH)throw new RangeError(`${label} must be an integer between 1 and ${MAX_BATCH}.`);
  }

  function scrambleModuleLoader(){
    if(typeof window.__SSC_SCRAMBLE_MODULE_LOADER__==='function')return window.__SSC_SCRAMBLE_MODULE_LOADER__;
    return()=>import(CUBING_SCRAMBLE_URL);
  }

  async function loadScrambleModule(){
    if(!scrambleModulePromise){
      const loader=scrambleModuleLoader();
      scrambleModulePromise=Promise.resolve().then(()=>loader());
    }
    return scrambleModulePromise;
  }

  function generatorEventId(eventId){
    const event=getEvent(eventId);
    if(!event)throw new Error(`Unsupported scramble event: ${String(eventId)}`);
    return event.scrambleEvent||event.id;
  }

  function randomItem(items){return items[Math.floor(Math.random()*items.length)];}

  // Preserves SSC's historical 3x3 fallback algorithm. It is deliberately
  // fallback-only; normal production generation always goes through cubing.js.
  function legacyThreeByThree(){
    const length=Math.floor(Math.random()*8)+19;
    const scramble=[];
    const recentFaces=[];
    const faces=['R','L','U','D','F','B'];
    for(let index=0;index<length;index+=1){
      const available=faces.filter(face=>!recentFaces.includes(face));
      const face=randomItem(available);
      scramble.push(face+randomItem(MODIFIERS));
      recentFaces.push(face);
      if(recentFaces.length>2)recentFaces.shift();
    }
    return scramble.join(' ');
  }

  function fallbackBasesForOrder(order){
    const bases=['R','L','U','D','F','B'];
    if(order>=4)bases.push('Rw','Lw','Uw','Dw','Fw','Bw');
    if(order>=6)bases.push('3Rw','3Lw','3Uw','3Dw','3Fw','3Bw');
    return bases;
  }

  // Safe parser-compatible fallback for NxN sizes that never had a dedicated
  // legacy SSC generator. It is not used while cubing.js is available.
  function genericLegacyNxN(eventId){
    const order=NXN_ORDERS[eventId];
    const length=FALLBACK_LENGTHS[eventId];
    const bases=fallbackBasesForOrder(order);
    const scramble=[];
    let previousAxis=null;
    for(let index=0;index<length;index+=1){
      const available=bases.filter(base=>FACE_AXIS[base.replace(/^\d+|w$/g,'')]!==previousAxis);
      const base=randomItem(available.length?available:bases);
      const face=base.replace(/^\d+/,'').charAt(0);
      previousAxis=FACE_AXIS[face];
      scramble.push(base+randomItem(MODIFIERS));
    }
    return scramble.join(' ');
  }

  function legacyNxNFallback(eventId){
    if(eventId==='222'){
      const legacy=window.Scramble2x2?.legacyGenerate;
      if(typeof legacy==='function'){
        const result=legacy();
        const text=Array.isArray(result)?result.join(' ').trim():String(result||'').trim();
        if(text)return text;
      }
      return genericLegacyNxN(eventId);
    }
    if(eventId==='333')return legacyThreeByThree();
    return genericLegacyNxN(eventId);
  }

  async function generateWithCubing(eventId){
    const {randomScrambleForEvent}=await loadScrambleModule();
    if(typeof randomScrambleForEvent!=='function')throw new TypeError('cubing/scramble did not export randomScrambleForEvent().');
    const alg=await randomScrambleForEvent(generatorEventId(eventId));
    const text=alg?.toString?.().trim()||'';
    if(!text)throw new Error('Scramble generator returned an empty algorithm.');
    return text;
  }

  async function generateDirect(eventId){
    const id=normalizeEventId(eventId);
    if(!id)throw new Error(`Unsupported scramble event: ${String(eventId)}`);

    try{
      return await generateWithCubing(id);
    }catch(error){
      if(isNxNEvent(id)){
        console.error('[SSC Scramble] cubing.js generation failed',{eventId:id,error});
        try{
          const fallback=String(legacyNxNFallback(id)||'').trim();
          if(!fallback)throw new Error('Legacy fallback returned an empty scramble.');
          return fallback;
        }catch(fallbackError){
          console.error('[SSC Scramble] legacy fallback failed',{eventId:id,error:fallbackError});
          throw new Error(`Unable to generate scramble for: ${id}`,{cause:fallbackError});
        }
      }
      console.error(`[SSC Scrambles] Unable to generate scramble for: ${id}`,error);
      throw new Error(`Unable to generate scramble for: ${id}`,{cause:error});
    }
  }

  async function generate(eventId){
    const id=normalizeEventId(eventId);
    if(!id)throw new Error(`Unsupported scramble event: ${String(eventId)}`);
    if(id===MULTI_BLIND_EVENT)throw new Error('333mbf is a multi-scramble event. Use SSCScrambleProvider.generateMultiBlind(cubeCount).');
    return generateDirect(id);
  }

  async function generateMany(eventId,amount){
    assertAmount(amount);
    const id=normalizeEventId(eventId);
    if(!id)throw new Error(`Unsupported scramble event: ${String(eventId)}`);
    if(id===MULTI_BLIND_EVENT)throw new Error('Use SSCScrambleProvider.generateMultiBlind(cubeCount) for 333mbf.');
    const scrambles=[];
    for(let index=0;index<amount;index+=1)scrambles.push(await generateDirect(id));
    return scrambles;
  }

  async function generateMultiBlind(cubeCount){
    assertAmount(cubeCount,'cubeCount');
    const scrambles=[];
    for(let index=0;index<cubeCount;index+=1)scrambles.push(await generateDirect(MULTI_BLIND_EVENT));
    return scrambles;
  }

  async function testAll(){
    const results={};
    for(const event of getEvents()){
      try{
        if(event.id===MULTI_BLIND_EVENT){
          const scrambles=await generateMultiBlind(3);
          results[event.id]={ok:true,scrambles};
          console.info(`✓ ${event.id} × 3 cubes`);
        }else{
          const scramble=await generateDirect(event.id);
          results[event.id]={ok:true,scramble};
          console.info(`✓ ${event.id}`);
        }
      }catch(error){
        results[event.id]={ok:false,error:error.message};
        console.error(`✗ ${event.id}`,error);
      }
    }
    return results;
  }

  function getSourceInfo(){
    return Object.freeze({
      provider:'SSCScrambleProvider',
      library:'cubing.js',
      module:'cubing/scramble',
      api:'randomScrambleForEvent',
      wcaNotation:true,
      nxnEvents:Object.keys(NXN_ORDERS),
      fallback:'legacy SSC generators',
      intendedForTimerApps:true,
      officialWcaCompetitionProgram:false,
      officialWcaCompetitionProgramName:'TNoodle-WCA'
    });
  }

  const provider=Object.freeze({
    generate,
    generateMany,
    generateMultiBlind,
    normalizeEventId,
    supportsEvent,
    getEvent,
    getEvents,
    getSourceInfo,
    testAll
  });

  // New canonical API plus a strict backwards-compatible alias for every
  // existing SSC caller. There is only one provider object, not two systems.
  window.SSCScrambleProvider=provider;
  window.SSCScrambles=provider;
})();
