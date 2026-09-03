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
      #colorSettingsButton svg{display:block;width:19px;height:19px;flex:0 0 auto}
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
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M12 3a9 9 0 1 0 0 18h1.5a1.5 1.5 0 0 0 0-3H12a1.5 1.5 0 0 1 0-3h2a7 7 0 0 0 7-7 5 5 0 0 0-5-5h-4Z"/>
        <circle cx="7.5" cy="10" r="1" fill="currentColor" stroke="none"/>
        <circle cx="10" cy="6.5" r="1" fill="currentColor" stroke="none"/>
        <circle cx="14.5" cy="6.5" r="1" fill="currentColor" stroke="none"/>
      </svg>
      <span id="colorSettingsButtonText">APPEARANCE</span>
    `;

    const settingsButton=document.getElementById('generalSettingsButton');
    if(settingsButton?.parentElement===toolbar)settingsButton.insertAdjacentElement('afterend',button);
    else toolbar.prepend(button);
    return button;
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
    colorGrid.append(primaryRow,cubeRow,themeRow);

    const closeButton=modal.querySelector('#closeColorSettings');

    function updateLabels(){
      const en=isEnglish();
      const title=document.getElementById('colorSettingsTitle');
      const buttonText=document.getElementById('colorSettingsButtonText');
      const themeLabel=document.getElementById('themeSettingLabel');
      const lightButton=document.getElementById('themeLightButton');
      const darkButton=document.getElementById('themeDarkButton');
      const oledButton=document.querySelector('[data-theme-choice="oled"]');

      if(title)title.textContent=en?'Appearance & colors':'הגדרות מראה וצבע';
      if(buttonText)buttonText.textContent=en?'APPEARANCE':'עיצוב';
      if(themeLabel)themeLabel.textContent=en?'Theme':'עיצוב';
      if(lightButton)lightButton.textContent=en?'Light':'בהיר';
      if(darkButton)darkButton.textContent=en?'Dark':'כהה';
      if(oledButton)oledButton.textContent='OLED';
      if(closeButton)closeButton.setAttribute('aria-label',en?'Close':'סגור');
      if(openButton){
        openButton.title=en?'Appearance and color settings':'הגדרות מראה וצבע';
        openButton.setAttribute('aria-label',openButton.title);
      }
    }

    function openModal(){
      updateLabels();
      modal.hidden=false;
      requestAnimationFrame(()=>closeButton?.focus());
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

    document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(updateLabels,0));
    new MutationObserver(updateLabels).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
    updateLabels();
  }

  injectStyles();
  retireLineWidthControl();
  createColorModal();
})();
