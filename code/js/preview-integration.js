(() => {
  'use strict';

  const MODE_KEY='sscPreviewModeV1';
  const INTERACTIVE_KEY='sscPreviewInteractiveV1';
  const VALID_MODES=new Set(['2d','3d']);

  const basePreview=window.SSCCubePreview || null;
  const baseRender=basePreview?.render?.bind(basePreview) || null;
  const storedMode=localStorage.getItem(MODE_KEY);
  let currentMode=VALID_MODES.has(storedMode)?storedMode:'3d';
  let interactive=localStorage.getItem(INTERACTIVE_KEY)!=='false';
  let lastRender=null;
  let rerenderToken=0;
  let modalOpen=false;
  let modalPlayer=null;
  let modalRenderToken=0;
  let lastTrigger=null;

  if(!storedMode)localStorage.setItem(MODE_KEY,currentMode);

  function isEnglish(){
    return document.documentElement.lang==='en' || document.documentElement.dir==='ltr';
  }

  function normalizeMode(value){
    const mode=window.SSCPreviewManager?.normalizeMode?.(value) || String(value||'').toLowerCase();
    return VALID_MODES.has(mode)?mode:'3d';
  }

  function injectStyles(){
    if(document.getElementById('sscInteractivePreviewStyles'))return;
    const style=document.createElement('style');
    style.id='sscInteractivePreviewStyles';
    style.textContent=`
      .cube-preview-card{
        cursor:pointer!important;
        outline:none!important;
      }
      .cube-preview-card:focus-visible{
        box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 34%,transparent)!important;
        border-color:color-mix(in srgb,var(--accent) 65%,#cbd0d7)!important;
      }
      .cube-preview-card.ssc-preview-mode-3d{
        --ssc-3d-thumb-side:min(
          var(--ssc-preview-card-width,174px),
          calc(100vw - (var(--ssc-preview-safe-margin,18px) * 2)),
          calc(100dvh - (var(--ssc-preview-safe-margin,18px) * 2))
        );
        width:var(--ssc-3d-thumb-side)!important;
        min-width:var(--ssc-3d-thumb-side)!important;
        height:var(--ssc-3d-thumb-side)!important;
        min-height:var(--ssc-3d-thumb-side)!important;
        max-width:var(--ssc-3d-thumb-side)!important;
        max-height:var(--ssc-3d-thumb-side)!important;
        padding:4px!important;
        border:1px solid #d8dde3!important;
        border-radius:12px!important;
        background:#f7f8fa!important;
        box-shadow:0 2px 9px rgba(15,23,42,.06)!important;
        overflow:hidden!important;
      }
      .cube-preview-card.ssc-preview-mode-3d:hover{
        border-color:#c1c7cf!important;
        box-shadow:0 5px 16px rgba(15,23,42,.1)!important;
      }
      .cube-preview-card.ssc-preview-thumbnail-3d .ssc-puzzle-3d-player{
        pointer-events:none!important;
        cursor:pointer!important;
        touch-action:auto!important;
      }
      .cube-preview-card.ssc-preview-thumbnail-3d::after{
        background:radial-gradient(circle at 50% 48%,rgba(255,255,255,.62),transparent 68%)!important;
      }
      html[data-theme="dark"] .cube-preview-card.ssc-preview-mode-3d,
      html[data-theme="oled"] .cube-preview-card.ssc-preview-mode-3d{
        background:#f5f6f8!important;
        border-color:#656b73!important;
      }

      .ssc-preview-3d-modal[hidden]{display:none!important}
      .ssc-preview-3d-modal{
        position:fixed;
        inset:0;
        z-index:10000;
        display:grid;
        place-items:center;
        padding:max(14px,env(safe-area-inset-top)) max(14px,env(safe-area-inset-right)) max(14px,env(safe-area-inset-bottom)) max(14px,env(safe-area-inset-left));
      }
      .ssc-preview-3d-modal-backdrop{
        position:absolute;
        inset:0;
        background:rgba(15,23,42,.58);
        backdrop-filter:blur(6px);
        -webkit-backdrop-filter:blur(6px);
      }
      .ssc-preview-3d-dialog{
        position:relative;
        z-index:1;
        width:min(92vw,760px);
        max-height:92dvh;
        display:grid;
        grid-template-rows:auto minmax(280px,1fr) auto;
        overflow:hidden;
        border:1px solid var(--border);
        border-radius:18px;
        background:var(--card-solid,#fff);
        color:var(--text,#111827);
        box-shadow:0 28px 80px rgba(0,0,0,.3);
      }
      .ssc-preview-3d-dialog-head{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:16px;
        padding:13px 15px;
        border-bottom:1px solid var(--border);
      }
      .ssc-preview-3d-dialog-title{
        min-width:0;
        display:flex;
        align-items:baseline;
        gap:9px;
      }
      .ssc-preview-3d-dialog-title strong{
        font-size:15px;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .ssc-preview-3d-dialog-title span{
        color:var(--muted);
        font-size:12px;
        white-space:nowrap;
      }
      .ssc-preview-3d-close{
        width:34px;
        height:34px;
        flex:0 0 34px;
        display:grid;
        place-items:center;
        border:1px solid var(--border);
        border-radius:10px;
        background:var(--soft);
        color:var(--text);
        font:inherit;
        font-size:22px;
        line-height:1;
        cursor:pointer;
      }
      .ssc-preview-3d-viewer{
        position:relative;
        width:100%;
        height:min(68dvh,620px);
        min-height:280px;
        overflow:hidden;
        background:color-mix(in srgb,var(--card-solid,#fff) 94%,var(--soft) 6%);
        touch-action:none;
      }
      .ssc-preview-3d-viewer .ssc-puzzle-3d-player{
        pointer-events:auto;
        touch-action:none!important;
        cursor:grab;
      }
      .ssc-preview-3d-viewer .ssc-puzzle-3d-player:active{cursor:grabbing}
      .ssc-preview-3d-dialog-foot{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        padding:11px 15px;
        border-top:1px solid var(--border);
      }
      .ssc-preview-3d-hint{
        color:var(--muted);
        font-size:12px;
      }
      .ssc-preview-3d-reset{
        border:1px solid var(--border);
        border-radius:9px;
        padding:7px 11px;
        background:var(--soft);
        color:var(--text);
        font:inherit;
        font-size:12px;
        font-weight:700;
        cursor:pointer;
      }
      body.ssc-preview-modal-open{overflow:hidden!important}

      @media(max-width:560px){
        .cube-preview-card.ssc-preview-mode-3d{border-radius:10px!important}
        .ssc-preview-3d-modal{padding:9px}
        .ssc-preview-3d-dialog{
          width:100%;
          max-height:94dvh;
          border-radius:15px;
          grid-template-rows:auto minmax(260px,1fr) auto;
        }
        .ssc-preview-3d-viewer{height:min(72dvh,560px);min-height:260px}
        .ssc-preview-3d-dialog-title span{display:none}
        .ssc-preview-3d-dialog-foot{padding:10px 12px}
      }
    `;
    document.head.appendChild(style);
  }

  function getEventInfo(eventId){
    return window.SSCPuzzle3D?.getEvent?.(eventId) || window.SSCCubePreview?.getEvent?.(eventId) || {id:eventId,name:String(eventId||'').toUpperCase(),label:String(eventId||'').toUpperCase()};
  }

  function makeThumbnailStatic(player,container){
    container.classList.add('ssc-preview-thumbnail-3d');
    if(!player)return;
    player.style.pointerEvents='none';
    player.tabIndex=-1;
    try{
      player.experimentalDragInput='none';
      player.experimentalMovePressInput='none';
      player.experimentalFaceletScale=.88;
    }catch{}
  }

  function configureCardAsButton(container,eventId){
    if(!(container instanceof Element))return;
    const event=getEventInfo(eventId);
    container.tabIndex=0;
    container.setAttribute('role','button');
    container.setAttribute('aria-haspopup','dialog');
    container.setAttribute('aria-label',isEnglish()?`Open interactive 3D preview of ${event.name}`:`פתח תצוגת 3D אינטראקטיבית של ${event.name}`);
    container.title=isEnglish()?'Click for interactive 3D view':'לחץ לפתיחת תצוגת 3D אינטראקטיבית';
    if(container.dataset.sscPreviewOpenBound==='true')return;
    container.dataset.sscPreviewOpenBound='true';
    container.addEventListener('click',()=>openModal(container));
    container.addEventListener('keydown',event=>{
      if(event.key!=='Enter'&&event.key!==' ')return;
      event.preventDefault();
      openModal(container);
    });
  }

  async function connectedRender(container,scramble,eventId='333'){
    if(!(container instanceof Element))return null;
    lastRender={container,scramble,eventId};
    container.dataset.previewModePreference=currentMode;
    container.classList.remove('ssc-preview-thumbnail-3d');
    configureCardAsButton(container,eventId);

    if(!window.SSCPreviewManager?.render){
      return baseRender?.(container,scramble,eventId) ?? null;
    }

    try{
      const result=await window.SSCPreviewManager.render({
        container,
        eventId,
        scramble,
        mode:currentMode,
        fallbackTo2D:true
      });
      if(currentMode==='3d'&&container.dataset.previewMode==='3d')makeThumbnailStatic(result,container);
      window.SSCPreviewSizing?.scheduleFit?.(container);
      configureCardAsButton(container,eventId);
      return result;
    }catch(error){
      console.error('[SSC preview integration] Preview render failed',error);
      if(currentMode!=='2d' && baseRender){
        const result=baseRender(container,scramble,eventId);
        window.SSCPreviewSizing?.scheduleFit?.(container);
        configureCardAsButton(container,eventId);
        return result;
      }
      return null;
    }
  }

  async function rerenderLast(){
    const snapshot=lastRender;
    if(!snapshot?.container?.isConnected)return null;
    const token=++rerenderToken;
    const result=await connectedRender(snapshot.container,snapshot.scramble,snapshot.eventId);
    if(token!==rerenderToken)return null;
    return result;
  }

  function installConnectedRenderer(){
    if(!basePreview || !baseRender)return;
    window.SSCCubePreview={
      ...basePreview,
      render:connectedRender,
      setColors(next){
        const result=basePreview.setColors?.(next);
        if(currentMode==='3d')queueMicrotask(()=>rerenderLast());
        return result;
      },
      resetColors(){
        const result=basePreview.resetColors?.();
        if(currentMode==='3d')queueMicrotask(()=>rerenderLast());
        return result;
      }
    };
  }

  function createModal(){
    let modal=document.getElementById('sscPreview3DModal');
    if(modal)return modal;
    modal=document.createElement('div');
    modal.id='sscPreview3DModal';
    modal.className='ssc-preview-3d-modal';
    modal.hidden=true;
    modal.innerHTML=`
      <div class="ssc-preview-3d-modal-backdrop" data-ssc-preview-close></div>
      <section class="ssc-preview-3d-dialog" role="dialog" aria-modal="true" aria-labelledby="sscPreview3DTitle">
        <header class="ssc-preview-3d-dialog-head">
          <div class="ssc-preview-3d-dialog-title"><strong id="sscPreview3DTitle"></strong><span id="sscPreview3DSubtitle">3D</span></div>
          <button class="ssc-preview-3d-close" id="sscPreview3DClose" type="button" aria-label="Close">×</button>
        </header>
        <div id="sscPreview3DViewer" class="ssc-preview-3d-viewer"></div>
        <footer class="ssc-preview-3d-dialog-foot">
          <span id="sscPreview3DHint" class="ssc-preview-3d-hint"></span>
          <button id="sscPreview3DReset" class="ssc-preview-3d-reset" type="button"></button>
        </footer>
      </section>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-ssc-preview-close]')?.addEventListener('click',closeModal);
    modal.querySelector('#sscPreview3DClose')?.addEventListener('click',closeModal);
    modal.querySelector('#sscPreview3DReset')?.addEventListener('click',resetCamera);
    return modal;
  }

  function updateModalLabels(eventId=lastRender?.eventId){
    const modal=createModal();
    const en=isEnglish();
    const event=getEventInfo(eventId);
    const title=modal.querySelector('#sscPreview3DTitle');
    const subtitle=modal.querySelector('#sscPreview3DSubtitle');
    const hint=modal.querySelector('#sscPreview3DHint');
    const reset=modal.querySelector('#sscPreview3DReset');
    const close=modal.querySelector('#sscPreview3DClose');
    if(title)title.textContent=event.name||event.label||event.id;
    if(subtitle)subtitle.textContent=en?'Interactive 3D preview':'תצוגת 3D אינטראקטיבית';
    if(hint)hint.textContent=interactive?(en?'Drag to rotate the puzzle':'גרור כדי לסובב את הפאזל'):(en?'3D rotation is disabled in settings':'סיבוב 3D כבוי בהגדרות');
    if(reset)reset.textContent=en?'Reset angle':'איפוס זווית';
    if(close)close.setAttribute('aria-label',en?'Close 3D preview':'סגור תצוגת 3D');
  }

  function configureModalPlayer(player){
    modalPlayer=player||null;
    if(!player)return;
    player.style.pointerEvents=interactive?'auto':'none';
    player.tabIndex=interactive?0:-1;
    try{
      player.experimentalDragInput=interactive?'auto':'none';
      player.experimentalMovePressInput='none';
      player.experimentalFaceletScale=.9;
    }catch{}
  }

  async function renderModal(){
    if(!modalOpen||!lastRender)return null;
    const modal=createModal();
    const viewer=modal.querySelector('#sscPreview3DViewer');
    if(!(viewer instanceof Element))return null;
    const token=++modalRenderToken;
    window.SSCPuzzle3D?.dispose?.(viewer);
    updateModalLabels(lastRender.eventId);
    try{
      const player=await window.SSCPuzzle3D?.render?.(viewer,lastRender.scramble,lastRender.eventId);
      if(token!==modalRenderToken||!modalOpen){
        window.SSCPuzzle3D?.dispose?.(viewer);
        return null;
      }
      configureModalPlayer(player);
      return player;
    }catch(error){
      console.error('[SSC preview integration] Interactive 3D modal failed',error);
      return null;
    }
  }

  async function openModal(trigger){
    if(!lastRender)return;
    const modal=createModal();
    lastTrigger=trigger instanceof HTMLElement?trigger:document.activeElement;
    modal.hidden=false;
    modalOpen=true;
    document.body.classList.add('ssc-preview-modal-open');
    updateModalLabels(lastRender.eventId);
    modal.querySelector('#sscPreview3DClose')?.focus();
    await renderModal();
  }

  function closeModal(){
    const modal=document.getElementById('sscPreview3DModal');
    if(!modal||modal.hidden)return;
    modalOpen=false;
    modalRenderToken+=1;
    const viewer=modal.querySelector('#sscPreview3DViewer');
    if(viewer instanceof Element)window.SSCPuzzle3D?.dispose?.(viewer);
    modalPlayer=null;
    modal.hidden=true;
    document.body.classList.remove('ssc-preview-modal-open');
    if(lastTrigger?.isConnected)lastTrigger.focus?.();
  }

  function syncControls(){
    const modeSelect=document.getElementById('previewModeSelect');
    const interactionSelect=document.getElementById('previewInteractionSelect');
    const resetButton=document.getElementById('previewResetCamera');
    if(modeSelect)modeSelect.value=currentMode;
    if(interactionSelect)interactionSelect.value=interactive?'yes':'no';
    if(resetButton)resetButton.disabled=!modalOpen;
  }

  async function setMode(value,{rerender=true}={}){
    const next=normalizeMode(value);
    if(next===currentMode){syncControls();return currentMode;}
    currentMode=next;
    localStorage.setItem(MODE_KEY,currentMode);
    syncControls();
    window.dispatchEvent(new CustomEvent('ssc-preview-mode-change',{detail:{mode:currentMode}}));
    if(rerender)await rerenderLast();
    return currentMode;
  }

  function setInteractive(value){
    interactive=Boolean(value);
    localStorage.setItem(INTERACTIVE_KEY,String(interactive));
    configureModalPlayer(modalPlayer);
    updateModalLabels();
    syncControls();
    window.dispatchEvent(new CustomEvent('ssc-preview-interaction-change',{detail:{interactive}}));
    return interactive;
  }

  function resetCamera(){
    const modal=document.getElementById('sscPreview3DModal');
    const viewer=modal?.querySelector('#sscPreview3DViewer');
    if(viewer instanceof Element&&modalOpen)return Boolean(window.SSCPuzzle3D?.resetCamera?.(viewer));
    return false;
  }

  function createSettingRow(id,labelId,controlHtml,before){
    if(document.getElementById(id))return document.getElementById(id);
    const row=document.createElement('label');
    row.id=id;
    row.className='general-setting-row';
    row.innerHTML=`<span id="${labelId}"></span>${controlHtml}`;
    before?.parentElement?.insertBefore(row,before);
    return row;
  }

  function initSettingsControls(){
    const cubeColorsRow=document.getElementById('cubeColorsSettingLabel')?.parentElement;
    if(!cubeColorsRow)return;

    const modeRow=createSettingRow(
      'previewModeSettingRow',
      'previewModeSettingLabel',
      '<select id="previewModeSelect"><option value="2d">2D</option><option value="3d">3D</option></select>',
      cubeColorsRow
    );

    const interactionRow=createSettingRow(
      'previewInteractionSettingRow',
      'previewInteractionSettingLabel',
      '<select id="previewInteractionSelect"><option value="yes"></option><option value="no"></option></select>',
      cubeColorsRow
    );

    if(!document.getElementById('previewCameraSettingRow')){
      const cameraRow=document.createElement('div');
      cameraRow.id='previewCameraSettingRow';
      cameraRow.className='general-setting-row';
      cameraRow.innerHTML='<span id="previewCameraSettingLabel"></span><button id="previewResetCamera" class="cube-colors-reset" type="button"></button>';
      cubeColorsRow.parentElement.insertBefore(cameraRow,cubeColorsRow);
    }

    modeRow?.querySelector('#previewModeSelect')?.addEventListener('change',event=>setMode(event.target.value));
    interactionRow?.querySelector('#previewInteractionSelect')?.addEventListener('change',event=>setInteractive(event.target.value==='yes'));
    document.getElementById('previewResetCamera')?.addEventListener('click',resetCamera);

    updateLabels();
    syncControls();
  }

  function updateLabels(){
    const en=isEnglish();
    const label=(id,enText,heText)=>{const el=document.getElementById(id);if(el)el.textContent=en?enText:heText;};
    label('previewModeSettingLabel','Small preview','תצוגה קטנה');
    label('previewInteractionSettingLabel','Allow rotation in 3D window','אפשר לסובב בחלון 3D');
    label('previewCameraSettingLabel','3D window camera','מצלמת חלון 3D');
    label('previewResetCamera','Reset open window angle','איפוס זווית בחלון פתוח');

    const interactionSelect=document.getElementById('previewInteractionSelect');
    if(interactionSelect){
      const yes=interactionSelect.querySelector('option[value="yes"]');
      const no=interactionSelect.querySelector('option[value="no"]');
      if(yes)yes.textContent=en?'Yes':'כן';
      if(no)no.textContent=en?'No':'לא';
    }
    updateModalLabels();
  }

  function observeAppAppearance(){
    const root=document.documentElement;
    if(!root)return;
    const observer=new MutationObserver(mutations=>{
      let languageChanged=false;
      let themeChanged=false;
      for(const mutation of mutations){
        if(mutation.attributeName==='lang'||mutation.attributeName==='dir')languageChanged=true;
        if(mutation.attributeName==='data-theme')themeChanged=true;
      }
      if(languageChanged)updateLabels();
      if(themeChanged){
        if(currentMode==='3d')rerenderLast();
        if(modalOpen)renderModal();
      }
    });
    observer.observe(root,{attributes:true,attributeFilter:['lang','dir','data-theme']});
  }

  document.addEventListener('keydown',event=>{
    if(event.key==='Escape'&&modalOpen){
      event.preventDefault();
      closeModal();
    }
  });

  injectStyles();
  createModal();
  installConnectedRenderer();
  initSettingsControls();
  observeAppAppearance();
  updateLabels();

  window.SSCPreviewSettings=Object.freeze({
    MODE_KEY,
    INTERACTIVE_KEY,
    getMode:()=>currentMode,
    setMode,
    isInteractive:()=>interactive,
    setInteractive,
    resetCamera,
    open:openModal,
    close:closeModal,
    isOpen:()=>modalOpen,
    rerender:rerenderLast
  });
})();