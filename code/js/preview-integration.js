(() => {
  'use strict';

  const MODE_KEY='sscPreviewModeV1';
  const INTERACTIVE_KEY='sscPreviewInteractiveV1';
  const VALID_MODES=new Set(['2d','3d']);

  const basePreview=window.SSCCubePreview || null;
  const baseRender=basePreview?.render?.bind(basePreview) || null;
  let currentMode=VALID_MODES.has(localStorage.getItem(MODE_KEY))?localStorage.getItem(MODE_KEY):'2d';
  let interactive=localStorage.getItem(INTERACTIVE_KEY)!=='false';
  let lastRender=null;
  let rerenderToken=0;

  function isEnglish(){
    return document.documentElement.lang==='en' || document.documentElement.dir==='ltr';
  }

  function normalizeMode(value){
    const mode=window.SSCPreviewManager?.normalizeMode?.(value) || String(value||'').toLowerCase();
    return VALID_MODES.has(mode)?mode:'2d';
  }

  async function connectedRender(container,scramble,eventId='333'){
    if(!(container instanceof Element))return null;
    lastRender={container,scramble,eventId};
    container.dataset.previewModePreference=currentMode;

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
      window.SSCPreviewSizing?.scheduleFit?.(container);
      return result;
    }catch(error){
      console.error('[SSC preview integration] Preview render failed',error);
      if(currentMode!=='2d' && baseRender){
        const result=baseRender(container,scramble,eventId);
        window.SSCPreviewSizing?.scheduleFit?.(container);
        return result;
      }
      return null;
    }
  }

  function installConnectedRenderer(){
    if(!basePreview || !baseRender)return;
    // Replace the public facade instead of mutating the original object.
    // SSCPreviewManager keeps the untouched renderer internally for real 2D rendering.
    window.SSCCubePreview={...basePreview,render:connectedRender};
  }

  async function rerenderLast(){
    const snapshot=lastRender;
    if(!snapshot?.container?.isConnected)return null;
    const token=++rerenderToken;
    const result=await connectedRender(snapshot.container,snapshot.scramble,snapshot.eventId);
    if(token!==rerenderToken)return null;
    return result;
  }

  function syncControls(){
    const modeSelect=document.getElementById('previewModeSelect');
    const interactionSelect=document.getElementById('previewInteractionSelect');
    const resetButton=document.getElementById('previewResetCamera');
    if(modeSelect)modeSelect.value=currentMode;
    if(interactionSelect)interactionSelect.value=interactive?'yes':'no';
    if(resetButton)resetButton.disabled=currentMode!=='3d';
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
    window.SSCPuzzle3D?.setInteractive?.(interactive);
    syncControls();
    window.dispatchEvent(new CustomEvent('ssc-preview-interaction-change',{detail:{interactive}}));
    return interactive;
  }

  function resetCamera(){
    const container=lastRender?.container;
    if(!(container instanceof Element))return false;
    return Boolean(window.SSCPuzzle3D?.resetCamera?.(container));
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
    label('previewModeSettingLabel','Preview type','סוג תצוגה');
    label('previewInteractionSettingLabel','Allow 3D rotation','אפשר לסובב תצוגת 3D');
    label('previewCameraSettingLabel','3D camera','מצלמת 3D');
    label('previewResetCamera','Reset angle','איפוס זווית');

    const interactionSelect=document.getElementById('previewInteractionSelect');
    if(interactionSelect){
      const yes=interactionSelect.querySelector('option[value="yes"]');
      const no=interactionSelect.querySelector('option[value="no"]');
      if(yes)yes.textContent=en?'Yes':'כן';
      if(no)no.textContent=en?'No':'לא';
    }
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
      if(themeChanged && currentMode==='3d')rerenderLast();
    });
    observer.observe(root,{attributes:true,attributeFilter:['lang','dir','data-theme']});
  }

  installConnectedRenderer();
  initSettingsControls();
  observeAppAppearance();
  setInteractive(interactive);

  window.SSCPreviewSettings=Object.freeze({
    MODE_KEY,
    INTERACTIVE_KEY,
    getMode:()=>currentMode,
    setMode,
    isInteractive:()=>interactive,
    setInteractive,
    resetCamera,
    rerender:rerenderLast
  });
})();