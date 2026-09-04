(() => {
  'use strict';

  const SETTINGS_KEY='sscGeneralSettingsV1';
  const LANGUAGE_KEY='sscLanguageV1';
  const FIXED_CUBE_LINE_WIDTH='1';
  const COLOR_PREVIEW_SCRAMBLE="R U R' U' F2 D L2 B' U2 R2";

  function isEnglish(){
    return localStorage.getItem(LANGUAGE_KEY)==='en';
  }

  function retireLineWidthControl(){
    document.getElementById('cubeLineWidthRange')?.closest('.general-setting-row')?.remove();

    try{
      const raw=localStorage.getItem(SETTINGS_KEY);
      if(raw){
        const saved=JSON.parse(raw);
        if(saved&&Object.prototype.hasOwnProperty.call(saved,'cubeLineWidth')){
          delete saved.cubeLineWidth;
          localStorage.setItem(SETTINGS_KEY,JSON.stringify(saved));
        }
      }
    }catch{}

    document.documentElement.style.removeProperty('--ssc-cube-line-width');
  }

  function injectStyles(){
    if(document.getElementById('sscColorSettingsModalStyles'))return;
    const style=document.createElement('style');
    style.id='sscColorSettingsModalStyles';
    style.textContent=`
      html{--ssc-cube-line-width:${FIXED_CUBE_LINE_WIDTH}!important}
      #colorSettingsButton svg{display:block;width:19px;height:19px;flex:0 0 auto}
      .color-settings-dialog{width:min(720px,94vw)}
      .color-settings-grid{gap:16px}
      .color-settings-grid .general-setting-row{padding:8px 0}
      .color-settings-grid .cube-colors-control{grid-template-columns:repeat(3,minmax(0,1fr))}
      .cube-color-preview-section{display:grid;gap:10px;padding:10px 0 4px;border-top:1px solid var(--border)}
      .cube-color-preview-heading{font-size:.95em;font-weight:800;color:var(--text)}
      .cube-color-preview-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
      .cube-color-preview-card{min-width:0;display:grid;gap:8px;padding:10px;border:1px solid var(--border);border-radius:12px;background:var(--soft)}
      .cube-color-preview-label{font-size:.9em;font-weight:800;text-align:center;color:var(--text)}
      .cube-color-preview-canvas{min-width:0;min-height:128px;display:grid;place-items:center;overflow:hidden;border-radius:8px;background:var(--card-solid)}
      .cube-color-preview-canvas .ssc-native-preview-svg{display:block;width:100%;height:auto;max-width:100%;max-height:170px}
      @media(max-width:700px){
        .color-settings-dialog{width:min(96vw,560px)!important}
        .color-settings-grid .cube-colors-control{grid-template-columns:repeat(2,minmax(0,1fr))!important}
        .cube-color-preview-canvas{min-height:112px}
      }
      @media(max-width:520px){
        .cube-color-preview-grid{grid-template-columns:1fr}
        .cube-color-preview-canvas{min-height:132px}
      }
      @media(max-width:380px){
        .color-settings-grid .cube-colors-control{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(style);
  }

  function createToolbarButton(){
    const existing=document.getElementById('colorSettingsButton');
    if(existing)return existing;

    const toolbar=document.querySelector('.topbar-start');
    if(!toolbar)return null;

    const button=document.createElement('button');
    button.id='colorSettingsButton';
    button.className='toolbar-button';
    button.type='button';
    button.innerHTML=`
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
        <path d="M12 3C7.03 3 3 6.58 3 11c0 3.87 3.13 7 7 7h1.65c.74 0 1.35.6 1.35 1.35 0 .91.74 1.65 1.65 1.65H15c3.87 0 7-3.13 7-7 0-5.52-4.48-10-10-10ZM6.5 12A1.5 1.5 0 1 1 6.5 9a1.5 1.5 0 0 1 0 3Zm3-4A1.5 1.5 0 1 1 9.5 5a1.5 1.5 0 0 1 0 3Zm5 0A1.5 1.5 0 1 1 14.5 5a1.5 1.5 0 0 1 0 3Zm3 4A1.5 1.5 0 1 1 17.5 9a1.5 1.5 0 0 1 0 3Z"/>
      </svg>
      <span id="colorSettingsButtonText">APPEARANCE</span>
    `;

    const settingsButton=document.getElementById('generalSettingsButton');
    if(settingsButton?.parentElement===toolbar)settingsButton.insertAdjacentElement('afterend',button);
    else toolbar.prepend(button);
    return button;
  }

  function currentCubeColors(){
    return window.SSCPreviewV1?.readColors?.()
      ||window.SSCCubePreview?.getColors?.()
      ||window.SSCSvgCubeRenderer?.DEFAULT_COLORS
      ||{};
  }

  function captureMainPreview(){
    const container=document.getElementById('cubePreview2D');
    const scrambleElement=document.getElementById('scramble');
    if(!(container instanceof Element)||!(scrambleElement instanceof Element))return null;
    if(scrambleElement.dataset.scrambleTransient==='true'||scrambleElement.getAttribute('aria-busy')==='true')return null;
    const scramble=String(scrambleElement.textContent||'').trim();
    if(!scramble)return null;
    const eventId=window.SSCTimerEvents?.getCurrent?.()||scrambleElement.dataset.eventId||'333';
    return{container,scramble,eventId};
  }

  async function restoreMainPreview(snapshot){
    if(!snapshot?.container?.isConnected)return;
    try{
      await Promise.resolve(window.SSCCubePreview?.render?.(snapshot.container,snapshot.scramble,snapshot.eventId));
    }catch(error){
      console.warn('[SSC appearance] Unable to restore the main cube preview after color preview rendering.',error);
    }
  }

  function renderColorPreview(container,scramble,idPrefix){
    if(!(container instanceof Element))return false;
    const preview=window.SSCPreviewV1;
    if(!preview?.render)return false;
    try{
      window.SSCPreviewV1Integration?.prepare2DContainer?.(container);
      const result=preview.render(container,scramble,'333',{
        strict:true,
        colors:currentCubeColors(),
        idPrefix
      });
      container.dataset.colorPreview='333';
      container.dataset.wcaEvent='333';
      container.dataset.puzzle='3×3';
      container.dataset.previewModePreference='2d';
      return Boolean(result?.svg);
    }catch(error){
      console.warn('[SSC appearance] Unable to render the regular 3x3 cube preview.',error);
      return false;
    }
  }

  async function renderColorPreviews(){
    const mainPreview=captureMainPreview();
    renderColorPreview(document.getElementById('cubeColorPreviewSolved'),'','ssc-color-preview-solved');
    renderColorPreview(document.getElementById('cubeColorPreviewScrambled'),COLOR_PREVIEW_SCRAMBLE,'ssc-color-preview-scrambled');
    await restoreMainPreview(mainPreview);
  }

  function createPreviewSection(){
    const section=document.createElement('section');
    section.id='cubeColorPreviewSection';
    section.className='cube-color-preview-section';
    section.innerHTML=`
      <div id="cubeColorPreviewHeading" class="cube-color-preview-heading">תצוגה מקדימה</div>
      <div class="cube-color-preview-grid">
        <div class="cube-color-preview-card">
          <div id="cubeColorPreviewSolvedLabel" class="cube-color-preview-label">פתורה</div>
          <div id="cubeColorPreviewSolved" class="cube-color-preview-canvas" role="img"></div>
        </div>
        <div class="cube-color-preview-card">
          <div id="cubeColorPreviewScrambledLabel" class="cube-color-preview-label">מעורבבת</div>
          <div id="cubeColorPreviewScrambled" class="cube-color-preview-canvas" role="img"></div>
        </div>
      </div>
    `;
    return section;
  }

  function createColorModal(){
    if(document.getElementById('colorSettingsModal'))return;

    document.querySelector('.color-settings-launch')?.remove();

    const generalModal=document.getElementById('generalSettingsModal');
    const primaryRow=document.getElementById('primaryColorInput')?.closest('.general-setting-row');
    const cubeRow=document.getElementById('cubeColorsControl')?.closest('.general-setting-row');
    const themeRow=document.querySelector('.theme-row');
    const openButton=createToolbarButton();
    if(!generalModal||!primaryRow||!cubeRow||!themeRow||!openButton)return;

    const modal=document.createElement('div');
    modal.id='colorSettingsModal';
    modal.className='settings-modal';
    modal.hidden=true;
    modal.innerHTML=`
      <div class="settings-backdrop" data-close-color-settings></div>
      <section class="settings-dialog color-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="colorSettingsTitle">
        <div class="settings-dialog-head">
          <h2 id="colorSettingsTitle">הגדרות מראה וצבע</h2>
          <button id="closeColorSettings" class="modal-close" type="button" aria-label="סגור">×</button>
        </div>
        <div id="colorSettingsGrid" class="general-settings-grid color-settings-grid"></div>
      </section>
    `;
    document.body.appendChild(modal);

    const colorGrid=modal.querySelector('#colorSettingsGrid');
    const previewSection=createPreviewSection();
    colorGrid.append(primaryRow,cubeRow,previewSection,themeRow);

    const closeButton=modal.querySelector('#closeColorSettings');
    const cubeColorInputs=[...cubeRow.querySelectorAll('[data-cube-face]')];
    const resetCubeColors=document.getElementById('resetCubeColors');

    function updateLabels(){
      const en=isEnglish();
      const title=document.getElementById('colorSettingsTitle');
      const buttonText=document.getElementById('colorSettingsButtonText');
      const themeLabel=document.getElementById('themeSettingLabel');
      const lightButton=document.getElementById('themeLightButton');
      const darkButton=document.getElementById('themeDarkButton');
      const oledButton=document.querySelector('[data-theme-choice="oled"]');
      const previewHeading=document.getElementById('cubeColorPreviewHeading');
      const solvedLabel=document.getElementById('cubeColorPreviewSolvedLabel');
      const scrambledLabel=document.getElementById('cubeColorPreviewScrambledLabel');
      const solvedPreview=document.getElementById('cubeColorPreviewSolved');
      const scrambledPreview=document.getElementById('cubeColorPreviewScrambled');

      if(title)title.textContent=en?'Appearance & colors':'הגדרות מראה וצבע';
      if(buttonText)buttonText.textContent=en?'APPEARANCE':'עיצוב';
      if(themeLabel)themeLabel.textContent=en?'Theme':'עיצוב';
      if(lightButton)lightButton.textContent=en?'Light':'בהיר';
      if(darkButton)darkButton.textContent=en?'Dark':'כהה';
      if(oledButton)oledButton.textContent='OLED';
      if(previewHeading)previewHeading.textContent=en?'3x3 cube color preview':'תצוגה מקדימה של צבעי 3×3';
      if(solvedLabel)solvedLabel.textContent=en?'Solved 3x3':'3×3 פתורה';
      if(scrambledLabel)scrambledLabel.textContent=en?'Scrambled 3x3':'3×3 מעורבבת';
      if(solvedPreview)solvedPreview.setAttribute('aria-label',en?'Solved 3 by 3 cube color preview':'תצוגת צבעים של קוביית 3 על 3 פתורה');
      if(scrambledPreview)scrambledPreview.setAttribute('aria-label',en?'Scrambled 3 by 3 cube color preview':'תצוגת צבעים של קוביית 3 על 3 מעורבבת');
      if(closeButton)closeButton.setAttribute('aria-label',en?'Close':'סגור');
      if(openButton){
        openButton.title=en?'Appearance and color settings':'הגדרות מראה וצבע';
        openButton.setAttribute('aria-label',openButton.title);
      }
    }

    function openModal(){
      updateLabels();
      modal.hidden=false;
      requestAnimationFrame(()=>{
        renderColorPreviews();
        closeButton?.focus();
      });
    }

    function closeModal(){
      modal.hidden=true;
      updateLabels();
      requestAnimationFrame(()=>openButton?.focus());
    }

    openButton.addEventListener('click',openModal);
    closeButton?.addEventListener('click',closeModal);
    modal.querySelector('[data-close-color-settings]')?.addEventListener('click',closeModal);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!modal.hidden){
        event.preventDefault();
        closeModal();
      }
    });

    cubeColorInputs.forEach(input=>input.addEventListener('input',()=>queueMicrotask(renderColorPreviews)));
    resetCubeColors?.addEventListener('click',()=>queueMicrotask(renderColorPreviews));
    window.addEventListener('storage',event=>{
      if(event.key==='sscCubeColorsV1')queueMicrotask(renderColorPreviews);
    });

    document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(updateLabels,0));
    new MutationObserver(updateLabels).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
    updateLabels();
  }

  injectStyles();
  retireLineWidthControl();
  createColorModal();
})();
