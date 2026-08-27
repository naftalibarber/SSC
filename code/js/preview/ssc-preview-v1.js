(() => {
  'use strict';

  const COLOR_KEY='sscCubeColorsV1';
  const EVENT_ORDERS=Object.freeze({
    '222':2,
    '333':3,
    '333bf':3,
    '333fm':3,
    '333oh':3,
    '333mbf':3,
    '444':4,
    '444bf':4,
    '555':5,
    '555bf':5,
    '666':6,
    '777':7
  });
  const EVENT_ALIASES=Object.freeze({
    '2x2':'222','2×2':'222','222':'222',
    '3x3':'333','3×3':'333','333':'333',
    '4x4':'444','4×4':'444','444':'444',
    '5x5':'555','5×5':'555','555':'555',
    '6x6':'666','6×6':'666','666':'666',
    '7x7':'777','7×7':'777','777':'777',
    '3bld':'333bf','333bf':'333bf',
    'fmc':'333fm','333fm':'333fm',
    'oh':'333oh','333oh':'333oh',
    'mbld':'333mbf','333mbf':'333mbf',
    '4bld':'444bf','444bf':'444bf',
    '5bld':'555bf','555bf':'555bf'
  });

  let lastRender=null;

  function requireCore(){
    if(!window.SSCNxNState||!window.SSCSvgCubeRenderer)throw new Error('SSCPreviewV1 requires SSCNxNState and SSCSvgCubeRenderer.');
  }

  function normalizeEventId(eventId){
    const raw=String(eventId??'333').trim().toLowerCase();
    return EVENT_ALIASES[raw]||raw;
  }

  function supportsEvent(eventId){return Boolean(EVENT_ORDERS[normalizeEventId(eventId)]);}

  function orderForEvent(eventId){
    const normalized=normalizeEventId(eventId);
    const order=EVENT_ORDERS[normalized];
    if(!order)throw new Error(`SSCPreviewV1 does not support event ${String(eventId)} yet.`);
    return order;
  }

  function readColors(){
    requireCore();
    const defaults=window.SSCSvgCubeRenderer.DEFAULT_COLORS;
    try{
      const saved=JSON.parse(localStorage.getItem(COLOR_KEY));
      if(!saved||typeof saved!=='object')return{...defaults};
      return Object.fromEntries(Object.entries(defaults).map(([face,fallback])=>[
        face,
        /^#[0-9a-f]{6}$/i.test(saved[face]||'')?saved[face]:fallback
      ]));
    }catch{return{...defaults};}
  }

  function normalizeMultiBlindScramble(scramble,eventId){
    if(normalizeEventId(eventId)!=='333mbf')return scramble;
    const text=String(scramble??'').trim();
    const match=text.match(/^1\)\s*(.*?)(?:\s+\|\s+2\)|$)/);
    return match?.[1]?.trim()||text;
  }

  function buildState(eventId,scramble,{strict=false}={}){
    requireCore();
    const order=orderForEvent(eventId);
    const normalizedScramble=normalizeMultiBlindScramble(scramble,eventId);
    return window.SSCNxNState.buildState(normalizedScramble,order,{strict});
  }

  function render(container,scramble,eventId='333',options={}){
    requireCore();
    if(!(container instanceof Element))throw new TypeError('SSCPreviewV1.render() requires a DOM container.');
    const normalizedEventId=normalizeEventId(eventId);
    const order=orderForEvent(normalizedEventId);
    const normalizedScramble=normalizeMultiBlindScramble(scramble,normalizedEventId);
    const colors=options.colors||readColors();
    const state=window.SSCNxNState.buildState(normalizedScramble,order,{strict:Boolean(options.strict)});
    const svg=window.SSCSvgCubeRenderer.renderState(container,state,{colors,idPrefix:options.idPrefix});

    container.dataset.previewEngine='ssc-native-v1';
    container.dataset.wcaEvent=normalizedEventId;
    container.dataset.puzzle=`${order}×${order}`;
    container.setAttribute('role','img');
    container.setAttribute(
      'aria-label',
      document.documentElement.lang==='en'
        ?`${order} by ${order} cube scramble preview`
        :`תצוגת ערבוב קובייה ${order} על ${order}`
    );

    lastRender={container,scramble:normalizedScramble,eventId:normalizedEventId,order,state,colors};
    window.SSCPreviewSizing?.scheduleFit?.(container);
    return Object.freeze({svg,state,eventId:normalizedEventId,order});
  }

  function rerender(){
    if(!lastRender?.container?.isConnected)return null;
    return render(lastRender.container,lastRender.scramble,lastRender.eventId,{colors:readColors()});
  }

  function repaint(colors=readColors()){
    if(!lastRender?.container?.isConnected)return false;
    lastRender.colors={...colors};
    return window.SSCSvgCubeRenderer.updateColors(lastRender.container,colors);
  }

  function selfTest(){
    requireCore();
    const stateReport=window.SSCNxNState.selfTest();
    const supported=Object.entries(EVENT_ORDERS).map(([eventId,order])=>{
      try{
        const state=window.SSCNxNState.buildState('',order,{strict:true});
        return{eventId,order,ok:Boolean(state?.faces)};
      }catch(error){
        return{eventId,order,ok:false,error:String(error?.message||error)};
      }
    });
    const report={
      ok:stateReport.ok&&supported.every(item=>item.ok),
      state:stateReport,
      supported
    };
    console[report.ok?'info':'error']('[SSC Preview V1] self-test',report);
    return report;
  }

  window.SSCPreviewV1=Object.freeze({
    version:'1.0.0-alpha.1',
    normalizeEventId,
    supportsEvent,
    orderForEvent,
    readColors,
    buildState,
    render,
    rerender,
    repaint,
    selfTest,
    eventOrders:EVENT_ORDERS
  });
})();