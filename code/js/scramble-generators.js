(() => {
  'use strict';

  const CUBING_SCRAMBLE_URL='https://cdn.cubing.net/v0/js/cubing/scramble';
  const MAX_BATCH=200;
  const PREFETCH_SIZE=2;
  const queues=new Map();
  const refillPromises=new Map();
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
    if(id==='333mbf')throw new Error('333mbf is a multi-scramble event. Use SSCScrambles.generateMultiBlind(cubeCount).');

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

  function getQueue(eventId){
    if(!queues.has(eventId))queues.set(eventId,[]);
    return queues.get(eventId);
  }

  function scheduleRefill(eventId){
    if(eventId==='333mbf'||refillPromises.has(eventId))return;
    const queue=getQueue(eventId);
    if(queue.length>=PREFETCH_SIZE)return;
    const refill=(async()=>{
      while(queue.length<PREFETCH_SIZE){
        try{queue.push(await generateDirect(eventId));}
        catch(error){console.warn(`[SSC Scrambles] Prefetch stopped for ${eventId}.`,error);break;}
      }
    })().finally(()=>refillPromises.delete(eventId));
    refillPromises.set(eventId,refill);
  }

  async function generate(eventId){
    const id=normalizeEventId(eventId);
    if(!id)throw new Error(`Unsupported scramble event: ${String(eventId)}`);
    if(id==='333mbf')throw new Error('333mbf is a multi-scramble event. Use SSCScrambles.generateMultiBlind(cubeCount).');

    const queue=getQueue(id);
    if(queue.length){
      const scramble=queue.shift();
      scheduleRefill(id);
      return scramble;
    }

    const scramble=await generateDirect(id);
    scheduleRefill(id);
    return scramble;
  }

  async function generateMany(eventId,amount){
    assertAmount(amount);
    const id=normalizeEventId(eventId);
    if(!id)throw new Error(`Unsupported scramble event: ${String(eventId)}`);
    if(id==='333mbf')throw new Error('Use SSCScrambles.generateMultiBlind(cubeCount) for 333mbf.');
    const scrambles=[];
    for(let i=0;i<amount;i+=1)scrambles.push(await generate(id));
    return scrambles;
  }

  async function generateMultiBlind(cubeCount){
    assertAmount(cubeCount,'cubeCount');
    const scrambles=[];
    for(let i=0;i<cubeCount;i+=1)scrambles.push(await generateDirect('333'));
    return scrambles;
  }

  async function testAll(){
    const results={};
    for(const event of getEvents()){
      if(event.id==='333mbf')continue;
      try{
        const scramble=await generateDirect(event.id);
        results[event.id]={ok:true,scramble};
        console.info(`✓ ${event.id}`);
      }catch(error){
        results[event.id]={ok:false,error:error.message};
        console.error(`✗ ${event.id}`,error);
      }
    }
    try{
      const scrambles=await generateMultiBlind(3);
      results['333mbf']={ok:true,scrambles};
      console.info('✓ 333mbf × 3 cubes');
    }catch(error){
      results['333mbf']={ok:false,error:error.message};
      console.error('✗ 333mbf × 3 cubes',error);
    }
    return results;
  }

  window.SSCScrambles=Object.freeze({
    generate,
    generateMany,
    generateMultiBlind,
    normalizeEventId,
    supportsEvent,
    getEvent,
    getEvents,
    testAll
  });
})();
