(() => {
  'use strict';

  // PHASE 2 ONLY:
  // This provider is intentionally not loaded by index.html yet.
  // Production callers continue using the existing legacy scramble path
  // until the later integration phase.

  const CUBING_SCRAMBLE_URL='https://cdn.cubing.net/v0/js/cubing/scramble';

  const EVENT_ORDERS=Object.freeze({
    '222':2,
    '333':3,
    '444':4,
    '555':5,
    '666':6,
    '777':7
  });

  const EVENT_ALIASES=Object.freeze({
    '2x2':'222','2×2':'222','222':'222',
    '3x3':'333','3×3':'333','333':'333',
    '4x4':'444','4×4':'444','444':'444',
    '5x5':'555','5×5':'555','555':'555',
    '6x6':'666','6×6':'666','666':'666',
    '7x7':'777','7×7':'777','777':'777'
  });

  let cubingModulePromise=null;

  function normalizeEventId(value){
    if(typeof value!=='string'||!value.trim())return null;
    const raw=value.trim().toLowerCase();
    return EVENT_ALIASES[raw]||null;
  }

  function supportsEvent(value){
    return normalizeEventId(value)!==null;
  }

  function getEvent(value){
    const id=normalizeEventId(value);
    if(!id)return null;
    return Object.freeze({
      id,
      order:EVENT_ORDERS[id],
      label:`${EVENT_ORDERS[id]}×${EVENT_ORDERS[id]}`
    });
  }

  function getEvents(){
    return Object.keys(EVENT_ORDERS).map(id=>getEvent(id));
  }

  function loadCubing(){
    if(!cubingModulePromise){
      cubingModulePromise=import(CUBING_SCRAMBLE_URL).catch(error=>{
        cubingModulePromise=null;
        throw error;
      });
    }
    return cubingModulePromise;
  }

  async function generate(eventId){
    const normalizedEventId=normalizeEventId(eventId);
    if(!normalizedEventId)throw new Error(`Unsupported NxN scramble event: ${String(eventId)}`);

    try{
      const module=await loadCubing();
      if(typeof module?.randomScrambleForEvent!=='function')throw new Error('cubing.js randomScrambleForEvent() is unavailable.');

      const alg=await module.randomScrambleForEvent(normalizedEventId);
      const scramble=alg?.toString?.().trim()||'';
      if(!scramble)throw new Error('cubing.js returned an empty scramble.');
      return scramble;
    }catch(error){
      console.error('[SSC Scramble] cubing.js generation failed',{
        eventId:normalizedEventId,
        error
      });
      throw error;
    }
  }

  function getSourceInfo(){
    return Object.freeze({
      library:'cubing.js',
      module:'cubing/scramble',
      api:'randomScrambleForEvent',
      url:CUBING_SCRAMBLE_URL,
      lazy:true,
      cached:true,
      productionIntegrated:false,
      fallbackIntegrated:false
    });
  }

  window.SSCScrambleProvider=Object.freeze({
    generate,
    normalizeEventId,
    supportsEvent,
    getEvent,
    getEvents,
    getSourceInfo,
    eventOrders:EVENT_ORDERS,
    eventAliases:EVENT_ALIASES
  });
})();
