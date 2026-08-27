(() => {
  'use strict';

  // NxN scramble provider for SSC. Production integration is controlled by
  // the existing SSC_FEATURES.scrambleProviderV1 flag and is limited to 222–777.

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
    return EVENT_ALIASES[value.trim().toLowerCase()]||null;
  }

  function supportsEvent(value){return normalizeEventId(value)!==null;}

  function getEvent(value){
    const id=normalizeEventId(value);
    if(!id)return null;
    return Object.freeze({id,order:EVENT_ORDERS[id],label:`${EVENT_ORDERS[id]}×${EVENT_ORDERS[id]}`});
  }

  function getEvents(){return Object.keys(EVENT_ORDERS).map(id=>getEvent(id));}

  function moduleLoader(){
    const injected=window.__SSC_SCRAMBLE_MODULE_LOADER__;
    return typeof injected==='function'?injected:()=>import(CUBING_SCRAMBLE_URL);
  }

  function loadCubing(){
    if(!cubingModulePromise){
      cubingModulePromise=Promise.resolve().then(()=>moduleLoader()()).catch(error=>{
        cubingModulePromise=null;
        throw error;
      });
    }
    return cubingModulePromise;
  }

  async function generateFallback(eventId,primaryError){
    const fallback=window.SSCLegacyScrambleFallback?.generate;
    if(typeof fallback!=='function')throw primaryError;
    const value=await fallback(eventId);
    const text=Array.isArray(value)?value.join(' ').trim():String(value??'').trim();
    if(!text)throw new Error(`Legacy fallback returned an empty scramble for ${eventId}.`,{cause:primaryError});
    return text;
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
      console.error('[SSC Scramble] cubing.js generation failed',{eventId:normalizedEventId,error});
      return generateFallback(normalizedEventId,error);
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
      productionIntegrated:Boolean(window.SSC_FEATURES?.scrambleProviderV1),
      fallbackAdapter:'SSCLegacyScrambleFallback',
      fallbackAvailable:typeof window.SSCLegacyScrambleFallback?.generate==='function',
      raceProtection:'integration-layer'
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
