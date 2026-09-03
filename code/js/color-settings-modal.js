(() => {
  'use strict';

  const SETTINGS_KEY='sscGeneralSettingsV1';
  const LANGUAGE_KEY='sscLanguageV1';
  const FIXED_CUBE_LINE_WIDTH='1';

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
      .color-settings-launch{align-items:center!important}
      .color-settings-open-button{
        width:100%;
        min-height:42px;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:9px;
        border:1px solid var(--border);
        border-radius:9px;
        background:var(--soft);
        color:var(--text);
        font:inherit;
        font-weight:700;
        cursor:pointer;
      }
      .color-settings-open-button:hover,.color-settings-open-button:focus-visible{
        border-color:var(--accent);
        color:var(--accent);
      }
      .color-settings-open-button svg{width:18px;height:18px;flex:0 0 auto}
      .color-settings-dialog{width:min(620px,94vw)}
      .color-settings-grid{gap:16px}
      .color-settings-grid .general-setting-row{padding:8px 0}
      .color-settings-grid .cube-colors-control{grid-template-columns:repeat(3,minmax(0,1fr))}
      @media(max-width:700px){
        .color-settings-dialog{width:min(96vw,520px)!important}
        .color-settings-grid .cube-colors-control{grid-template-columns:repeat(2,minmax(0,1fr))!important}
      }
      @media(max-width:380px){
        .color-settings-grid .cube-colors-control{grid-template-columns:1fr!important}
      }
    `;
    document.head.appendChild(style);
  }

  function createColorModal(){
    if(document.getElementById('colorSettingsModal'))return;

    const generalModal=document.getElementById('generalSettingsModal');
    const grid=generalModal?.querySelector('.general-settings-grid');
    const primaryRow=document.getElementById('primaryColorInput')?.closest('.general-setting-row');
    const cubeRow=document.getElementById('cubeColorsControl')?.closest('.general-setting-row');
    if(!generalModal||!grid||!primaryRow||!cubeRow)return;

    const launchRow=document.createElement('div');
    launchRow.className='general-setting-row color-settings-launch';
    launchRow.innerHTML=`
      <span id="colorSettingsSettingLabel">הגדרות צבע</span>
      <button id="colorSettingsButton" class="color-settings-open-button" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a1.5 1.5 0 0 1 0-3h2a7 7 0 0 0 7-7 5 5 0 0 0-5-5h-4Z"/><circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="14.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
        <span id="colorSettingsButtonText">פתח הגדרות צבע</span>
      </button>
    `;
    grid.insertBefore(launchRow,primaryRow);

    const modal=document.createElement('div');
    modal.id='colorSettingsModal';
    modal.className='settings-modal';
    modal.hidden=true;
    modal.innerHTML=`
      <div class="settings-backdrop" data-close-color-settings></div>
      <section class="settings-dialog color-settings-dialog" role="dialog" aria-modal="true" aria-labelledby="colorSettingsTitle">
        <div class="settings-dialog-head">
          <h2 id="colorSettingsTitle">הגדרות צבע</h2>
          <button id="closeColorSettings" class="modal-close" type="button" aria-label="סגור">×</button>
        </div>
        <div id="colorSettingsGrid" class="general-settings-grid color-settings-grid"></div>
      </section>
    `;
    document.body.appendChild(modal);

    const colorGrid=modal.querySelector('#colorSettingsGrid');
    colorGrid.append(primaryRow,cubeRow);

    const openButton=launchRow.querySelector('#colorSettingsButton');
    const closeButton=modal.querySelector('#closeColorSettings');

    function updateLabels(){
      const en=isEnglish();
      const settingLabel=document.getElementById('colorSettingsSettingLabel');
      const buttonText=document.getElementById('colorSettingsButtonText');
      const title=document.getElementById('colorSettingsTitle');
      if(settingLabel)settingLabel.textContent=en?'Color settings':'הגדרות צבע';
      if(buttonText)buttonText.textContent=en?'Open color settings':'פתח הגדרות צבע';
      if(title)title.textContent=en?'Color settings':'הגדרות צבע';
      if(closeButton)closeButton.setAttribute('aria-label',en?'Close':'סגור');
    }

    function openModal(){
      updateLabels();
      generalModal.hidden=true;
      modal.hidden=false;
      requestAnimationFrame(()=>closeButton?.focus());
    }

    function closeModal(){
      modal.hidden=true;
      generalModal.hidden=false;
      updateLabels();
      requestAnimationFrame(()=>openButton?.focus());
    }

    openButton?.addEventListener('click',openModal);
    closeButton?.addEventListener('click',closeModal);
    modal.querySelector('[data-close-color-settings]')?.addEventListener('click',closeModal);
    document.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!modal.hidden){
        event.preventDefault();
        closeModal();
      }
    });

    document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(updateLabels,0));
    new MutationObserver(updateLabels).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
    updateLabels();
  }

  injectStyles();
  retireLineWidthControl();
  createColorModal();
})();
