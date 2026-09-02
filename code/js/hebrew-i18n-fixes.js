(() => {
  'use strict';

  const isHebrew=()=>document.documentElement.lang==='he'||document.documentElement.dir==='rtl';
  const setText=(selector,he,en)=>{
    document.querySelectorAll(selector).forEach(el=>{
      const next=isHebrew()?he:en;
      if(el.textContent!==next)el.textContent=next;
    });
  };

  function setLabelTextPreservingInput(label,he,en){
    if(!(label instanceof HTMLElement))return;
    const next=isHebrew()?he:en;
    const textNode=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
    if(textNode){
      if(textNode.textContent.trim()!==next)textNode.textContent=next;
      return;
    }
    const input=label.querySelector(':scope > input');
    label.insertBefore(document.createTextNode(next),input||null);
  }

  const translate=()=>{
    setText('#generalSettingsButton span','הגדרות','SETTINGS');
    setText('#importExportButton span','יבוא / יצוא','IMPORT / EXPORT');
    setText('.eyebrow-inline','אירוע','EVENT');
    setText('.section-title','סטטיסטיקות','STATISTICS');
    setText('.history-section-head > span','זמנים','TIMES');

    document.querySelectorAll('.stat-label').forEach(el=>{
      if(isHebrew()&&el.textContent==='Single')el.textContent='יחיד';
      else if(!isHebrew()&&el.textContent==='יחיד')el.textContent='Single';
    });

    const modalTitle=document.querySelector('#importExportModal .settings-dialog-head h2');
    if(modalTitle)modalTitle.textContent=isHebrew()?'יבוא / יצוא':'Import / Export';

    const exportButton=document.getElementById('exportData');
    if(exportButton)exportButton.textContent=isHebrew()?'יצוא נתונים':'Export data';

    setLabelTextPreservingInput(
      document.querySelector('#importExportModal .file-label'),
      'יבוא נתונים',
      'Import data'
    );
  };

  translate();
  const observer=new MutationObserver(()=>translate());
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
  const stats=document.getElementById('statsGrid');
  if(stats)observer.observe(stats,{childList:true,subtree:true});
})();

(() => {
  'use strict';

  const EVENT_ID='333mbf';

  function currentEvent(){return window.SSCTimerEvents?.getCurrent?.()||'';}
  function isMbld(){return currentEvent()===EVENT_ID;}

  function injectMbld3x3Sizing(){
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

  async function renderNormal3x3(card){
    if(!(card instanceof Element))return;
    const scramble=String(card.dataset.scramble||'').trim();
    if(!scramble)return;
    card.dataset.previewPending='false';
    delete card.dataset.previewError;

    try{
      // This is the exact connected renderer used by the regular 3x3 timer preview.
      await Promise.resolve(window.SSCCubePreview?.render?.(card,scramble,'333'));
      card.dataset.mbldUsesExact3x3='true';
      window.SSCPreviewSizing?.scheduleFit?.(card);
    }catch(error){
      console.error('[SSC MBLD] Normal 3x3 preview failed.',error);
      card.dataset.previewError='true';
    }
  }

  function rerenderMbld3x3Previews(){
    if(!isMbld())return;
    injectMbld3x3Sizing();
    document.querySelectorAll('#sscMbldScrambleList .ssc-mbld-item-preview[data-scramble]').forEach(renderNormal3x3);
  }

  window.addEventListener('ssc-mbld-scramble',()=>queueMicrotask(rerenderMbld3x3Previews));
  window.addEventListener('ssc-event-change',event=>{
    if(event.detail?.eventId===EVENT_ID)queueMicrotask(rerenderMbld3x3Previews);
  });

  injectMbld3x3Sizing();
  window.SSCMBLD3x3Preview=Object.freeze({rerender:rerenderMbld3x3Previews});
})();