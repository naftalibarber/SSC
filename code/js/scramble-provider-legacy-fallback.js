(() => {
  'use strict';

  // PHASE 3 compatibility adapter only.
  // This file is intentionally not loaded by index.html and does not replace
  // or delete any existing legacy generator. It exists so the new provider can
  // prove its fallback contract before production integration.

  const EVENT_ORDERS=Object.freeze({222:2,333:3,444:4,555:5,666:6,777:7});
  const MODIFIERS=Object.freeze(['',"'",'2']);
  const AXIS=Object.freeze({R:'RL',L:'RL',U:'UD',D:'UD',F:'FB',B:'FB'});
  const LENGTHS=Object.freeze({222:9,333:24,444:40,555:60,666:80,777:100});

  function randomItem(items){return items[Math.floor(Math.random()*items.length)];}

  function moveBases(order){
    const bases=['R','L','U','D','F','B'];
    if(order>=4)bases.push('Rw','Lw','Uw','Dw','Fw','Bw');
    if(order>=6)bases.push('3Rw','3Lw','3Uw','3Dw','3Fw','3Bw');
    return bases;
  }

  function faceOf(base){return base.replace(/^\d+/,'').charAt(0).toUpperCase();}

  function generate(eventId){
    const id=String(eventId||'').trim();
    const order=EVENT_ORDERS[id];
    if(!order)throw new Error(`Unsupported legacy fallback event: ${eventId}`);

    const bases=moveBases(order);
    const moves=[];
    let previousAxis=null;
    for(let i=0;i<LENGTHS[id];i+=1){
      const available=bases.filter(base=>AXIS[faceOf(base)]!==previousAxis);
      const base=randomItem(available);
      moves.push(base+randomItem(MODIFIERS));
      previousAxis=AXIS[faceOf(base)];
    }
    return moves.join(' ');
  }

  window.SSCLegacyScrambleFallback=Object.freeze({
    generate,
    supportedEvents:Object.freeze(Object.keys(EVENT_ORDERS)),
    source:'SSC legacy-compatible NxN fallback adapter',
    productionIntegrated:false
  });
})();
