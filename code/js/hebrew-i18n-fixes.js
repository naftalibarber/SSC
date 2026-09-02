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

  const scheduleRerender=()=>queueMicrotask(rerenderMbld3x3Previews);

  window.addEventListener('ssc-mbld-scramble',scheduleRerender);
  window.addEventListener('ssc-event-change',event=>{
    if(event.detail?.eventId===EVENT_ID)scheduleRerender();
  });
  window.addEventListener('ssc-preview-mode-change',scheduleRerender);
  window.addEventListener('ssc-preview-interaction-change',scheduleRerender);
  window.addEventListener('ssc-selected-faces-mode-change',scheduleRerender);
  window.addEventListener('ssc-general-settings-change',scheduleRerender);

  injectMbld3x3Sizing();
  window.SSCMBLD3x3Preview=Object.freeze({rerender:rerenderMbld3x3Previews});
})();

(() => {
  'use strict';

  // MBLD previews use the same .cube-preview-card class as the floating main
  // preview. The global cube-preview stylesheet intentionally makes that class
  // position:fixed. Inside the MBLD viewer we explicitly restore normal flow.
  // The interactive 3D modal must also stack above the MBLD scramble modal.
  function injectMbldViewerRowFix(){
    if(document.getElementById('sscMbldViewerSideBySideStyles'))return;
    const style=document.createElement('style');
    style.id='sscMbldViewerSideBySideStyles';
    style.textContent=`
      #sscPreview3DModal.ssc-preview-3d-modal{
        z-index:14100!important;
      }

      #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-row{
        grid-template-columns:44px minmax(0,1fr) 116px!important;
        align-items:center!important;
        gap:12px!important;
      }
      #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-row:has(.ssc-mbld-view-preview.ssc-preview-mode-2d){
        grid-template-columns:44px minmax(0,1fr) 184px!important;
      }
      #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-preview.cube-preview-card{
        position:relative!important;
        inset:auto!important;
        top:auto!important;
        right:auto!important;
        bottom:auto!important;
        left:auto!important;
        z-index:1!important;
        isolation:isolate!important;
        grid-column:3!important;
        grid-row:1!important;
        justify-self:end!important;
        align-self:center!important;
        display:grid!important;
        width:116px!important;
        min-width:116px!important;
        max-width:116px!important;
        height:76px!important;
        min-height:76px!important;
        max-height:76px!important;
        margin:0!important;
        padding:7px!important;
      }
      #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-preview.cube-preview-card.ssc-preview-mode-2d{
        width:184px!important;
        min-width:184px!important;
        max-width:184px!important;
        height:132px!important;
        min-height:132px!important;
        max-height:132px!important;
        padding:8px!important;
      }
      html[lang="he"] #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-preview.cube-preview-card,
      html[lang="en"] #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-preview.cube-preview-card{
        right:auto!important;
        left:auto!important;
        bottom:auto!important;
      }
      @media(max-width:680px){
        #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-row{
          grid-template-columns:34px minmax(0,1fr) 94px!important;
          gap:7px!important;
          padding:9px 8px!important;
        }
        #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-row:has(.ssc-mbld-view-preview.ssc-preview-mode-2d){
          grid-template-columns:34px minmax(0,1fr) 132px!important;
        }
        #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-preview.cube-preview-card{
          position:relative!important;
          top:auto!important;
          right:auto!important;
          bottom:auto!important;
          left:auto!important;
          grid-column:3!important;
          grid-row:1!important;
          width:94px!important;
          min-width:94px!important;
          max-width:94px!important;
          height:64px!important;
          min-height:64px!important;
          max-height:64px!important;
          padding:5px!important;
        }
        #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-preview.cube-preview-card.ssc-preview-mode-2d{
          width:132px!important;
          min-width:132px!important;
          max-width:132px!important;
          height:96px!important;
          min-height:96px!important;
          max-height:96px!important;
          padding:6px!important;
        }
        #sscMbldViewList .ssc-mbld-view-text{
          font-size:12px!important;
          line-height:1.35!important;
          word-spacing:2px!important;
        }
        #sscMbldViewList .ssc-mbld-view-number{
          width:29px!important;
          height:29px!important;
          font-size:12px!important;
        }
      }
      @media(max-width:430px){
        #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-row{
          grid-template-columns:28px minmax(0,1fr) 78px!important;
          gap:5px!important;
          padding:7px 6px!important;
        }
        #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-row:has(.ssc-mbld-view-preview.ssc-preview-mode-2d){
          grid-template-columns:28px minmax(0,1fr) 100px!important;
        }
        #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-preview.cube-preview-card{
          width:78px!important;
          min-width:78px!important;
          max-width:78px!important;
          height:54px!important;
          min-height:54px!important;
          max-height:54px!important;
          padding:4px!important;
        }
        #sscMbldScramblesModal #sscMbldViewList .ssc-mbld-view-preview.cube-preview-card.ssc-preview-mode-2d{
          width:100px!important;
          min-width:100px!important;
          max-width:100px!important;
          height:74px!important;
          min-height:74px!important;
          max-height:74px!important;
          padding:4px!important;
        }
        #sscMbldViewList .ssc-mbld-view-text{
          font-size:10.5px!important;
          line-height:1.3!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  injectMbldViewerRowFix();
})();
