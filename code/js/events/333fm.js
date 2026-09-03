(() => {
  'use strict';

  const EVENT_ID='333fm';
  const ORDER=3;
  const CUBING_SCRAMBLE_URL='https://cdn.cubing.net/v0/js/cubing/scramble';
  let scrambleModulePromise=null;
  let lastRender=null;

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

  async function generate(){
    const {randomScrambleForEvent}=await loadScrambleModule();
    if(typeof randomScrambleForEvent!=='function')throw new TypeError('cubing/scramble did not export randomScrambleForEvent().');
    const alg=await randomScrambleForEvent(EVENT_ID);
    const text=alg?.toString?.().trim()||'';
    if(!text)throw new Error(`Scramble generator returned an empty algorithm for ${EVENT_ID}.`);
    return text;
  }

  function requirePreviewCore(){
    if(!window.SSCNxNState||!window.SSCSvgCubeRenderer)throw new Error(`${EVENT_ID} preview requires SSCNxNState and SSCSvgCubeRenderer.`);
  }

  function readColors(){
    return window.SSCPreviewV1?.getColors?.()||window.SSCSvgCubeRenderer?.DEFAULT_COLORS||null;
  }

  function render2D(container,scramble,options={}){
    requirePreviewCore();
    if(!(container instanceof Element))throw new TypeError(`${EVENT_ID} render2D() requires a DOM container.`);
    const normalizedScramble=String(scramble??'').trim();
    const colors=options.colors||readColors();
    const state=window.SSCNxNState.buildState(normalizedScramble,ORDER,{strict:Boolean(options.strict)});
    const svg=window.SSCSvgCubeRenderer.renderState(container,state,{colors,idPrefix:options.idPrefix});

    container.dataset.previewEngine='ssc-native-v1';
    container.dataset.previewModule=EVENT_ID;
    container.dataset.wcaEvent=EVENT_ID;
    container.dataset.puzzle='3×3';
    container.setAttribute('role','img');
    container.setAttribute(
      'aria-label',
      document.documentElement.lang==='en'
        ?'3 by 3 cube scramble preview'
        :'תצוגת ערבוב קובייה 3 על 3'
    );

    lastRender={container,scramble:normalizedScramble,state,colors};
    window.SSCPreviewSizing?.scheduleFit?.(container);
    return Object.freeze({svg,state,eventId:EVENT_ID,order:ORDER});
  }

  function rerender(){
    if(!lastRender?.container?.isConnected)return null;
    return render2D(lastRender.container,lastRender.scramble,{colors:readColors()});
  }

  function repaint(colors=readColors()){
    if(!lastRender?.container?.isConnected)return false;
    lastRender.colors=colors;
    return window.SSCSvgCubeRenderer.updateColors(lastRender.container,colors);
  }

  const api=Object.freeze({
    id:EVENT_ID,
    order:ORDER,
    source:'isolated-333-copy',
    generate,
    render2D,
    rerender,
    repaint
  });

  const modules=window.SSCEventModules||(window.SSCEventModules=Object.create(null));
  modules[EVENT_ID]=api;
})();
