(() => {
  const SETTINGS_KEY='sscGeneralSettingsV1';
  const LANGUAGE_KEY='sscLanguageV1';
  const defaults={textSize:100,font:'Arial',theme:'light',primaryColor:'#2563eb'};
  const modal=document.getElementById('generalSettingsModal');
  const openButton=document.getElementById('generalSettingsButton');
  const closeButton=document.getElementById('closeGeneralSettings');
  const languageSelect=document.getElementById('languageSelect');
  const textSizeRange=document.getElementById('textSizeRange');
  const textSizeValue=document.getElementById('textSizeValue');
  const fontSelect=document.getElementById('fontSelect');
  const primaryColorInput=document.getElementById('primaryColorInput');
  const primaryColorValue=document.getElementById('primaryColorValue');
  const resetPrimaryColor=document.getElementById('resetPrimaryColor');
  const hiddenLanguageToggle=document.getElementById('languageToggle');
  const themeButtons=[...document.querySelectorAll('[data-theme-choice]')];
  function loadSettings(){try{return{...defaults,...JSON.parse(localStorage.getItem(SETTINGS_KEY))};}catch{return{...defaults};}}
  let settings=loadSettings();
  function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
  function fontStack(font){if(font==='system')return 'system-ui,-apple-system,"Segoe UI",Arial,sans-serif';if(font==='Rubik')return 'Rubik,Arial,sans-serif';if(font==='Assistant')return 'Assistant,Arial,sans-serif';if(font==='Verdana')return 'Verdana,Arial,sans-serif';return 'Arial,sans-serif';}
  function validColor(value){return /^#[0-9a-f]{6}$/i.test(value)?value:defaults.primaryColor;}
  function applyAppearance(){
    const allowedThemes=['light','dark','oled'];const theme=allowedThemes.includes(settings.theme)?settings.theme:'light';
    settings.primaryColor=validColor(settings.primaryColor);
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.setProperty('--font-scale',String((Number(settings.textSize)||100)/100));
    document.documentElement.style.setProperty('--app-font',fontStack(settings.font));
    document.documentElement.style.setProperty('--accent',settings.primaryColor);
    themeButtons.forEach(button=>button.classList.toggle('active',button.dataset.themeChoice===theme));
    textSizeRange.value=String(settings.textSize||100);textSizeValue.textContent=`${settings.textSize||100}%`;fontSelect.value=settings.font||'Arial';
    primaryColorInput.value=settings.primaryColor;primaryColorValue.textContent=settings.primaryColor.toUpperCase();
  }
  function currentLanguage(){return localStorage.getItem(LANGUAGE_KEY)==='en'?'en':'he';}
  function updateLabels(){
    const en=currentLanguage()==='en';
    document.getElementById('generalSettingsTitle').textContent=en?'General settings':'הגדרות כלליות';
    document.getElementById('languageSettingLabel').textContent=en?'Language':'שפה';document.getElementById('textSizeSettingLabel').textContent=en?'Text size':'גודל הטקסט';document.getElementById('fontSettingLabel').textContent=en?'Font':'גופן הטקסט';document.getElementById('primaryColorSettingLabel').textContent=en?'Primary color':'צבע ראשי';document.getElementById('themeSettingLabel').textContent=en?'Theme':'עיצוב';
    document.getElementById('themeLightButton').textContent=en?'Light':'בהיר';document.getElementById('themeDarkButton').textContent=en?'Dark':'כהה';resetPrimaryColor.textContent=en?'Reset':'איפוס';
    closeButton.setAttribute('aria-label',en?'Close':'סגור');openButton.title=en?'General settings':'הגדרות כלליות';openButton.setAttribute('aria-label',en?'General settings':'הגדרות כלליות');languageSelect.value=en?'en':'he';
  }
  function openModal(){modal.hidden=false;updateLabels();requestAnimationFrame(()=>closeButton.focus());}function closeModal(){modal.hidden=true;openButton.focus();}
  openButton.addEventListener('click',openModal);closeButton.addEventListener('click',closeModal);modal.querySelector('[data-close-settings]').addEventListener('click',closeModal);document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden)closeModal();});
  languageSelect.addEventListener('change',()=>{const target=languageSelect.value;if(target!==currentLanguage())hiddenLanguageToggle.click();updateLabels();});
  textSizeRange.addEventListener('input',()=>{settings.textSize=Number(textSizeRange.value);saveSettings();applyAppearance();});fontSelect.addEventListener('change',()=>{settings.font=fontSelect.value;saveSettings();applyAppearance();});
  primaryColorInput.addEventListener('input',()=>{settings.primaryColor=primaryColorInput.value;saveSettings();applyAppearance();});
  resetPrimaryColor.addEventListener('click',()=>{settings.primaryColor=defaults.primaryColor;saveSettings();applyAppearance();});
  themeButtons.forEach(button=>button.addEventListener('click',()=>{settings.theme=button.dataset.themeChoice;saveSettings();applyAppearance();}));
  applyAppearance();updateLabels();
})();
