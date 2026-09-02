(() => {
  'use strict';

  const EVENT_ID='333mbf';
  const listId='sscMbldScrambleList';

  function currentEvent(){return window.SSCTimerEvents?.getCurrent?.()||'';}
  function isMbld(){return currentEvent()===EVENT_ID;}

  function injectExact3x3Sizing(){
    if(document.getElementById('sscMbldExact3x3PreviewStyles'))return;
    const style=document.createElement('style');
    style.id='sscMbldExact3x3PreviewStyles';
    style.textContent=`
      .ssc-mbld-item-preview.cube-preview-card{
        width:116px!important;
        min-width:116px!important;
        max-width:116px!important;
        height:76px!important;
        min-height:76px!important;
        max-height:76px!important;
        padding:7px!important;
      }
      .ssc-mbld-scramble-item{
        grid-template-columns:auto minmax(0,1fr) 116px!important;
      }
      @media(max-width:520px){
        .ssc-mbld-scramble-item{grid-template-columns:auto minmax(0,1fr)!important}
        .ssc-mbld-item-preview.cube-preview-card{
          grid-column:2!important;
          width:116px!important;
          min-width:116px!important;
          max-width:116px!important;
          height:76px!important;
          min-height:76px!important;
          max-height:76px!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  async function renderAsReal3x3(card){
    if(!(card instanceof Element))return;
    const scramble=String(card.dataset.scramble||'').trim();
    if(!scramble)return;

    card.dataset.previewPending='false';
    delete card.dataset.previewError;

    try{
      // Same connected renderer used by the ordinary 3x3 timer preview.
      if(window.SSCCubePreview?.render){
        await Promise.resolve(window.SSCCubePreview.render(card,scramble,'333'));
      }else if(window.SSCPreviewManager?.render){
        await window.SSCPreviewManager.render({container:card,eventId:'333',scramble,mode:'2d',fallbackTo2D:true});
      }else{
        throw new Error('Connected 3x3 preview renderer is unavailable.');
      }
      card.dataset.mbldUsesExact3x3='true';
      window.SSCPreviewSizing?.scheduleFit?.(card);
    }catch(error){
      console.error('[SSC MBLD] Exact 3x3 preview failed.',error);
      card.dataset.previewError='true';
    }
  }

  function rerenderAll(){
    if(!isMbld())return;
    injectExact3x3Sizing();
    const list=document.getElementById(listId);
    if(!list)return;
    [...list.querySelectorAll('.ssc-mbld-item-preview[data-scramble]')].forEach(renderAsReal3x3);
  }

  window.addEventListener('ssc-mbld-scramble',()=>queueMicrotask(rerenderAll));
  window.addEventListener('ssc-event-change',event=>{
    if(event.detail?.eventId===EVENT_ID)queueMicrotask(rerenderAll);
  });

  injectExact3x3Sizing();
  queueMicrotask(rerenderAll);
  window.SSCMBLD3x3Preview=Object.freeze({rerender:rerenderAll});
})();
