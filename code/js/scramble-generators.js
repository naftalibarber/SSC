(() => {
  'use strict';

  const CUBING_SCRAMBLE_URL='https://cdn.cubing.net/v0/js/cubing/scramble';
  const MAX_BATCH=200;
  const MULTI_BLIND_EVENT='333mbf';
  let scrambleModulePromise=null;

  function registry(){
    const value=window.SSCWCAEvents;
    if(!value||typeof value!=='object')throw new Error('SSCScrambles requires window.SSCWCAEvents to be loaded first.');
    return value;
  }

  function normalizeEventId(eventId){
    if(typeof eventId!=='string'||!eventId.trim())return null;
    const normalized=window.SSCCubePreview?.normalizeEventId?.(eventId);
    if(!normalized)return null;
    return registry()[normalized]?normalized:null;
  }

  function supportsEvent(eventId){return normalizeEventId(eventId)!==null;}

  function getEvent(eventId){
    const id=normalizeEventId(eventId);
    const event=id?registry()[id]:null;
    return event?{...event}:null;
  }

  function getEvents(){return Object.values(registry()).map(event=>({...event}));}

  function assertAmount(value,label='amount'){
    if(!Number.isInteger(value)||value<1||value>MAX_BATCH)throw new RangeError(`${label} must be an integer between 1 and ${MAX_BATCH}.`);
  }

  async function loadScrambleModule(){
    if(!scrambleModulePromise){
      scrambleModulePromise=import(CUBING_SCRAMBLE_URL).catch(error=>{
        scrambleModulePromise=null;
        throw error;
      });
    }
    return scrambleModulePromise;
  }

  function generatorEventId(eventId){
    const event=getEvent(eventId);
    if(!event)throw new Error(`Unsupported scramble event: ${String(eventId)}`);
    return event.scrambleEvent||event.id;
  }

  async function generateDirect(eventId){
    const id=normalizeEventId(eventId);
    if(!id)throw new Error(`Unsupported scramble event: ${String(eventId)}`);

    try{
      const {randomScrambleForEvent}=await loadScrambleModule();
      const alg=await randomScrambleForEvent(generatorEventId(id));
      const text=alg?.toString?.().trim()||'';
      if(!text)throw new Error('Scramble generator returned an empty algorithm.');
      return text;
    }catch(error){
      console.error(`[SSC Scrambles] Unable to generate scramble for: ${id}`,error);
      throw new Error(`Unable to generate scramble for: ${id}`,{cause:error});
    }
  }

  async function generate(eventId){
    const id=normalizeEventId(eventId);
    if(!id)throw new Error(`Unsupported scramble event: ${String(eventId)}`);
    if(id===MULTI_BLIND_EVENT)throw new Error('333mbf is a multi-scramble event. Use SSCScrambles.generateMultiBlind(cubeCount).');
    return generateDirect(id);
  }

  async function generateMany(eventId,amount){
    assertAmount(amount);
    const id=normalizeEventId(eventId);
    if(!id)throw new Error(`Unsupported scramble event: ${String(eventId)}`);
    if(id===MULTI_BLIND_EVENT)throw new Error('Use SSCScrambles.generateMultiBlind(cubeCount) for 333mbf.');

    const scrambles=[];
    for(let i=0;i<amount;i+=1)scrambles.push(await generateDirect(id));
    return scrambles;
  }

  async function generateMultiBlind(cubeCount){
    assertAmount(cubeCount,'cubeCount');
    const scrambles=[];
    for(let i=0;i<cubeCount;i+=1)scrambles.push(await generateDirect(MULTI_BLIND_EVENT));
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
      library:'cubing.js',
      module:'cubing/scramble',
      api:'randomScrambleForEvent',
      wcaNotation:true,
      intendedForTimerApps:true,
      officialWcaCompetitionProgram:false,
      officialWcaCompetitionProgramName:'TNoodle-WCA'
    });
  }

  window.SSCScrambles=Object.freeze({
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
})();
