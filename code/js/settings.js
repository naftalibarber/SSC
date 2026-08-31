(() => {
  'use strict';

  const SETTINGS_KEY='sscGeneralSettingsV1';
  const LANGUAGE_KEY='sscLanguageV1';
  const PREVIEW_SIZE_KEY='sscCubePreviewSizeV1';
  const PREVIEW_MIN=150;
  const PREVIEW_MAX=500;
  const PREVIEW_STEP=5;
  const PREVIEW_DEFAULT=200;
  const CUBE_LINE_WIDTH_MIN=1;
  const CUBE_LINE_WIDTH_MAX=4;
  const CUBE_LINE_WIDTH_STEP=1;
  const CUBE_LINE_WIDTH_DEFAULT=1;
  const defaults={textSize:100,font:'Rubik',timerFont:'Orbitron',timePrecision:3,theme:'light',primaryColor:'#2563eb',cubeLineWidth:CUBE_LINE_WIDTH_DEFAULT,competitionMode:false,competitionInspection:true};

  const modal=document.getElementById('generalSettingsModal');
  const openButton=document.getElementById('generalSettingsButton');
  const closeButton=document.getElementById('closeGeneralSettings');
  const languageSelect=document.getElementById('languageSelect');
  const textSizeRange=document.getElementById('textSizeRange');
  const textSizeValue=document.getElementById('textSizeValue');
  const fontSelect=document.getElementById('fontSelect');
  const timerFontSelect=document.getElementById('timerFontSelect');
  const timePrecisionSelect=document.getElementById('timePrecisionSelect');
  const primaryColorInput=document.getElementById('primaryColorInput');
  const primaryColorValue=document.getElementById('primaryColorValue');
  const resetPrimaryColor=document.getElementById('resetPrimaryColor');
  const hiddenLanguageToggle=document.getElementById('languageToggle');
  const themeButtons=[...document.querySelectorAll('[data-theme-choice]')];
  const cubeColorInputs=[...document.querySelectorAll('[data-cube-face]')];
  const resetCubeColors=document.getElementById('resetCubeColors');
  let competitionModeToggle=null;
  let competitionInspectionToggle=null;

  const FONT_OPTIONS=[['Rubik','Rubik'],['Assistant','Assistant'],['Heebo','Heebo'],['Alef','Alef'],['NotoHebrew','Noto Sans Hebrew']];
  const TIMER_FONT_OPTIONS=[['Orbitron','Orbitron'],['Audiowide','Audiowide'],['ShareTechMono','Share Tech Mono'],['Oxanium','Oxanium'],['ChakraPetch','Chakra Petch'],['system','System']];

  function injectMobileSettingsFix(){
    if(document.getElementById('sscMobileSettingsFix'))return;
    const style=document.createElement('style');
    style.id='sscMobileSettingsFix';
    style.textContent=`
      @media(max-width:700px){
        .settings-modal{padding:10px!important;align-items:center!important;overflow:auto!important;}
        .settings-dialog{width:min(96vw,520px)!important;max-width:96vw!important;max-height:92vh!important;overflow-y:auto!important;overflow-x:hidden!important;padding:16px!important;}
        .settings-dialog-head{position:sticky!important;top:-16px!important;z-index:5!important;background:var(--card-solid)!important;padding-top:4px!important;}
        .settings-dialog-head h2{font-size:clamp(24px,8vw,34px)!important;line-height:1.15!important;}
        .general-settings-grid{width:100%!important;min-width:0!important;gap:12px!important;}
        .general-setting-row{grid-template-columns:1fr!important;gap:7px!important;width:100%!important;min-width:0!important;padding:4px 0!important;}
        .general-setting-row>span{font-size:1em!important;font-weight:700!important;}
        .general-setting-row select,.range-control,.color-control,.theme-options,.cube-colors-control,.competition-toggle-wrap{width:100%!important;min-width:0!important;max-width:100%!important;}
        .range-control{grid-template-columns:minmax(0,1fr) 54px!important;}
        .range-control input{min-width:0!important;width:100%!important;}
        .color-control{grid-template-columns:52px minmax(0,1fr) auto!important;gap:8px!important;}
        .color-control output{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;}
        .cube-colors-control{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;}
        .cube-color-item{min-width:0!important;padding:8px 9px!important;overflow:hidden!important;}
        .cube-color-item span{white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}
        .cube-color-item input{flex:0 0 34px!important;width:34px!important;height:30px!important;}
        .cube-colors-reset{width:100%!important;min-width:0!important;}
        .theme-options{grid-template-columns:repeat(3,minmax(0,1fr))!important;}
        .theme-options button{min-width:0!important;padding:9px 5px!important;}
      }
      @media(max-width:380px){
        .settings-dialog{padding:13px!important;}
        .cube-colors-control{grid-template-columns:1fr!important;}
        .color-control{grid-template-columns:46px minmax(0,1fr)!important;}
        .color-control button{grid-column:1/-1!important;width:100%!important;}
        .theme-options{grid-template-columns:1fr!important;}
      }
    `;
    document.head.appendChild(style);
  }

  function clampPreviewSize(value){
    if(window.SSCPreviewSizing?.clampSize)return window.SSCPreviewSizing.clampSize(value);
    const n=Number(value);
    if(!Number.isFinite(n))return PREVIEW_DEFAULT;
    return Math.min(PREVIEW_MAX,Math.max(PREVIEW_MIN,n));
  }

  function getPreviewSize(){
    if(window.SSCPreviewSizing?.getPreviewSize)return window.SSCPreviewSizing.getPreviewSize();
    const raw=localStorage.getItem(PREVIEW_SIZE_KEY);
    const value=clampPreviewSize(raw===null?PREVIEW_DEFAULT:raw);
    if(raw===null||Number(raw)!==value)localStorage.setItem(PREVIEW_SIZE_KEY,String(value));
    return value;
  }

  function applyPreviewSize(){
    window.SSCPreviewSizing?.applyPreviewSize?.();
    const value=getPreviewSize();
    const range=document.getElementById('cubePreviewSizeRange');
    const output=document.getElementById('cubePreviewSizeValue');
    if(range)range.value=String(value);
    if(output)output.textContent=`${value}%`;
  }

  function setPreviewSize(value){
    const clamped=window.SSCPreviewSizing?.setPreviewSize?.(value) ?? clampPreviewSize(value);
    if(!window.SSCPreviewSizing)localStorage.setItem(PREVIEW_SIZE_KEY,String(clamped));
    applyPreviewSize();
  }

  function initPreviewSizeControl(){
    if(document.getElementById('cubePreviewSizeRange'))return;
    const cubeColors=document.getElementById('cubeColorsSettingLabel')?.parentElement;
    if(!cubeColors)return;
    const row=document.createElement('label');
    row.className='general-setting-row';
    row.innerHTML=`<span id="cubePreviewSizeSettingLabel">גודל התצוגה</span><div class="range-control"><input id="cubePreviewSizeRange" type="range" min="${PREVIEW_MIN}" max="${PREVIEW_MAX}" step="${PREVIEW_STEP}" value="${PREVIEW_DEFAULT}"><output id="cubePreviewSizeValue">${PREVIEW_DEFAULT}%</output></div>`;
    cubeColors.parentElement.insertBefore(row,cubeColors);
    const range=row.querySelector('#cubePreviewSizeRange');
    range.value=String(getPreviewSize());
    range.addEventListener('input',()=>setPreviewSize(Number(range.value)));
    applyPreviewSize();
  }

  function clampCubeLineWidth(value){
    const width=Number(value);
    if(!Number.isFinite(width))return CUBE_LINE_WIDTH_DEFAULT;
    return Math.min(CUBE_LINE_WIDTH_MAX,Math.max(CUBE_LINE_WIDTH_MIN,Math.round(width)));
  }

  function syncCubeLineWidthControl(){
    settings.cubeLineWidth=clampCubeLineWidth(settings.cubeLineWidth);
    const range=document.getElementById('cubeLineWidthRange');
    const output=document.getElementById('cubeLineWidthValue');
    if(range)range.value=String(settings.cubeLineWidth);
    if(output)output.textContent=`${settings.cubeLineWidth} px`;
  }

  function initCubeLineWidthControl(){
    if(document.getElementById('cubeLineWidthRange'))return;
    const cubeColors=document.getElementById('cubeColorsSettingLabel')?.parentElement;
    if(!cubeColors)return;
    const row=document.createElement('label');
    row.className='general-setting-row';
    row.innerHTML=`<span id="cubeLineWidthSettingLabel">עובי קווי הקובייה</span><div class="range-control"><input id="cubeLineWidthRange" type="range" min="${CUBE_LINE_WIDTH_MIN}" max="${CUBE_LINE_WIDTH_MAX}" step="${CUBE_LINE_WIDTH_STEP}" value="${CUBE_LINE_WIDTH_DEFAULT}"><output id="cubeLineWidthValue">${CUBE_LINE_WIDTH_DEFAULT} px</output></div>`;
    cubeColors.parentElement.insertBefore(row,cubeColors);
    const range=row.querySelector('#cubeLineWidthRange');
    range.addEventListener('input',()=>{
      settings.cubeLineWidth=clampCubeLineWidth(range.value);
      saveSettings();
      applyAppearance();
    });
    syncCubeLineWidthControl();
  }

  function initCompetitionControls(){
    if(document.getElementById('competitionModeToggle')){
      competitionModeToggle=document.getElementById('competitionModeToggle');
      competitionInspectionToggle=document.getElementById('competitionInspectionToggle');
      return;
    }
    const anchor=timePrecisionSelect?.closest('.general-setting-row');
    if(!anchor?.parentElement)return;
    const modeRow=document.createElement('div');
    modeRow.className='general-setting-row competition-setting-row';
    modeRow.innerHTML=`<span id="competitionModeSettingLabel">מצב תחרות</span><div class="competition-toggle-wrap"><label class="ssc-switch"><input id="competitionModeToggle" type="checkbox"><span class="ssc-switch-track" aria-hidden="true"><span class="ssc-switch-thumb"></span></span><span id="competitionModeValue">OFF</span></label></div>`;
    const inspectionRow=document.createElement('div');
    inspectionRow.className='general-setting-row competition-setting-row competition-inspection-row';
    inspectionRow.innerHTML=`<span id="competitionInspectionSettingLabel">בדיקת תחרות</span><div class="competition-toggle-wrap"><label class="ssc-switch"><input id="competitionInspectionToggle" type="checkbox"><span class="ssc-switch-track" aria-hidden="true"><span class="ssc-switch-thumb"></span></span><span id="competitionInspectionValue">ON</span></label></div>`;
    anchor.insertAdjacentElement('afterend',modeRow);
    modeRow.insertAdjacentElement('afterend',inspectionRow);
    competitionModeToggle=modeRow.querySelector('#competitionModeToggle');
    competitionInspectionToggle=inspectionRow.querySelector('#competitionInspectionToggle');
  }

  function fillSelect(select,options,current){
    if(!select)return;
    select.innerHTML='';
    options.forEach(([value,label])=>{
      const option=document.createElement('option');
      option.value=value;
      option.textContent=label;
      select.appendChild(option);
    });
    select.value=options.some(([value])=>value===current)?current:options[0][0];
  }

  function repairSelectors(){
    if(languageSelect)languageSelect.innerHTML='<option value="he">עברית</option><option value="en">English</option>';
    fillSelect(fontSelect,FONT_OPTIONS,fontSelect?.value);
    fillSelect(timerFontSelect,TIMER_FONT_OPTIONS,timerFontSelect?.value);
  }

  function loadSettings(){
    try{
      const saved=JSON.parse(localStorage.getItem(SETTINGS_KEY));
      const merged={...defaults,...saved};
      if(!FONT_OPTIONS.some(([value])=>value===merged.font))merged.font=defaults.font;
      if(!TIMER_FONT_OPTIONS.some(([value])=>value===merged.timerFont))merged.timerFont=defaults.timerFont;
      if(![2,3].includes(Number(merged.timePrecision)))merged.timePrecision=3;
      merged.cubeLineWidth=clampCubeLineWidth(merged.cubeLineWidth);
      merged.competitionMode=Boolean(merged.competitionMode);
      merged.competitionInspection=merged.competitionInspection!==false;
      return merged;
    }catch{return{...defaults}}
  }

  let settings=loadSettings();
  function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
  function notifySettingsChange(){window.dispatchEvent(new CustomEvent('ssc-general-settings-change',{detail:{...settings}}));}

  function fontStack(font){
    if(font==='Assistant')return'"Assistant",sans-serif';
    if(font==='Heebo')return'"Heebo",sans-serif';
    if(font==='Alef')return'"Alef",sans-serif';
    if(font==='NotoHebrew')return'"Noto Sans Hebrew",sans-serif';
    return'"Rubik",sans-serif';
  }

  function timerFontStack(font){
    if(font==='Audiowide')return'"Audiowide",sans-serif';
    if(font==='ShareTechMono')return'"Share Tech Mono",monospace';
    if(font==='Oxanium')return'"Oxanium",sans-serif';
    if(font==='ChakraPetch')return'"Chakra Petch",sans-serif';
    if(font==='system')return'system-ui,-apple-system,"Segoe UI",sans-serif';
    return'"Orbitron",sans-serif';
  }

  function validColor(value){return /^#[0-9a-f]{6}$/i.test(value)?value:defaults.primaryColor;}

  function syncCubeColors(){
    if(!window.SSCCubePreview)return;
    const colors=window.SSCCubePreview.getColors();
    cubeColorInputs.forEach(input=>{input.value=colors[input.dataset.cubeFace]||'#000000';});
  }

  function syncCompetitionControls(){
    if(competitionModeToggle)competitionModeToggle.checked=Boolean(settings.competitionMode);
    if(competitionInspectionToggle){competitionInspectionToggle.checked=settings.competitionInspection!==false;competitionInspectionToggle.disabled=!settings.competitionMode;}
    const modeValue=document.getElementById('competitionModeValue');
    const inspectionValue=document.getElementById('competitionInspectionValue');
    if(modeValue)modeValue.textContent=settings.competitionMode?'ON':'OFF';
    if(inspectionValue)inspectionValue.textContent=settings.competitionInspection!==false?'ON':'OFF';
    document.querySelector('.competition-inspection-row')?.classList.toggle('is-disabled',!settings.competitionMode);
  }

  function applyAppearance(){
    const theme=['light','dark','oled'].includes(settings.theme)?settings.theme:'light';
    settings.primaryColor=validColor(settings.primaryColor);
    document.documentElement.dataset.theme=theme;
    document.documentElement.style.setProperty('--font-scale',String((Number(settings.textSize)||100)/100));
    document.documentElement.style.setProperty('--app-font',fontStack(settings.font));
    document.documentElement.style.setProperty('--timer-font',timerFontStack(settings.timerFont));
    document.documentElement.style.setProperty('--accent',settings.primaryColor);
    document.documentElement.style.setProperty('--ssc-cube-line-width',String(clampCubeLineWidth(settings.cubeLineWidth)));
    themeButtons.forEach(button=>button.classList.toggle('active',button.dataset.themeChoice===theme));
    if(textSizeRange)textSizeRange.value=String(settings.textSize||100);
    if(textSizeValue)textSizeValue.textContent=`${settings.textSize||100}%`;
    if(fontSelect)fontSelect.value=settings.font||defaults.font;
    if(timerFontSelect)timerFontSelect.value=settings.timerFont||defaults.timerFont;
    if(timePrecisionSelect)timePrecisionSelect.value=String(settings.timePrecision);
    if(primaryColorInput)primaryColorInput.value=settings.primaryColor;
    if(primaryColorValue)primaryColorValue.textContent=settings.primaryColor.toUpperCase();
    syncCompetitionControls();
    syncCubeColors();
    syncCubeLineWidthControl();
    applyPreviewSize();
  }

  function currentLanguage(){return localStorage.getItem(LANGUAGE_KEY)==='en'?'en':'he';}

  function updateLabels(){
    const en=currentLanguage()==='en';
    const set=(id,english,hebrew)=>{const element=document.getElementById(id);if(element)element.textContent=en?english:hebrew;};
    set('generalSettingsTitle','General settings','הגדרות כלליות');
    set('languageSettingLabel','Language','שפה');
    set('textSizeSettingLabel','Text size','גודל הטקסט');
    set('fontSettingLabel','Text font','גופן הטקסט');
    set('timerFontSettingLabel','Timer font','גופן הטיימר');
    set('timePrecisionSettingLabel','Time precision','דיוק הזמן');
    set('competitionModeSettingLabel','Competition Mode','מצב תחרות');
    set('competitionInspectionSettingLabel','Competition inspection','בדיקת תחרות');
    set('primaryColorSettingLabel','Primary color','צבע ראשי');
    set('cubePreviewSizeSettingLabel','Preview size','גודל התצוגה');
    set('cubeLineWidthSettingLabel','Cube line thickness','עובי קווי הקובייה');
    set('cubeColorsSettingLabel','Cube colors','צבעי הקובייה');
    set('cubeWhiteLabel','White','לבן');
    set('cubeYellowLabel','Yellow','צהוב');
    set('cubeGreenLabel','Green','ירוק');
    set('cubeBlueLabel','Blue','כחול');
    set('cubeRedLabel','Red','אדום');
    set('cubeOrangeLabel','Orange','כתום');
    set('resetCubeColors','Reset cube colors','איפוס צבעי קובייה');
    set('themeSettingLabel','Theme','עיצוב');
    set('themeLightButton','Light','בהיר');
    set('themeDarkButton','Dark','כהה');
    if(resetPrimaryColor)resetPrimaryColor.textContent=en?'Reset':'איפוס';
    if(closeButton)closeButton.setAttribute('aria-label',en?'Close':'סגור');
    if(openButton){
      openButton.title=en?'General settings':'הגדרות כלליות';
      openButton.setAttribute('aria-label',openButton.title);
    }
    if(languageSelect)languageSelect.value=en?'en':'he';
    syncCompetitionControls();
  }

  function openModal(){
    if(!modal)return;
    modal.hidden=false;
    updateLabels();
    syncCubeColors();
    applyPreviewSize();
    requestAnimationFrame(()=>closeButton?.focus());
  }

  function closeModal(){
    if(!modal)return;
    modal.hidden=true;
    openButton?.focus();
  }

  injectMobileSettingsFix();
  initPreviewSizeControl();
  initCubeLineWidthControl();
  initCompetitionControls();
  repairSelectors();

  openButton?.addEventListener('click',openModal);
  closeButton?.addEventListener('click',closeModal);
  modal?.querySelector('[data-close-settings]')?.addEventListener('click',closeModal);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape'||!modal)return;
    if(!modal.hidden){closeModal();return;}
    if(event.defaultPrevented&&modal.contains(document.activeElement))openButton?.focus();
  });

  languageSelect?.addEventListener('change',()=>{
    if(languageSelect.value!==currentLanguage())hiddenLanguageToggle?.click();
    updateLabels();
    window.SSCPreviewSizing?.applyPreviewSize?.();
  });
  textSizeRange?.addEventListener('input',()=>{settings.textSize=Number(textSizeRange.value);saveSettings();applyAppearance();});
  fontSelect?.addEventListener('change',()=>{settings.font=fontSelect.value;saveSettings();applyAppearance();});
  timerFontSelect?.addEventListener('change',()=>{settings.timerFont=timerFontSelect.value;saveSettings();applyAppearance();});
  timePrecisionSelect?.addEventListener('change',()=>{settings.timePrecision=Number(timePrecisionSelect.value);saveSettings();applyAppearance();window.dispatchEvent(new Event('ssc-time-precision-change'));});
  competitionModeToggle?.addEventListener('change',()=>{settings.competitionMode=competitionModeToggle.checked;saveSettings();syncCompetitionControls();notifySettingsChange();});
  competitionInspectionToggle?.addEventListener('change',()=>{settings.competitionInspection=competitionInspectionToggle.checked;saveSettings();syncCompetitionControls();notifySettingsChange();});
  primaryColorInput?.addEventListener('input',()=>{settings.primaryColor=primaryColorInput.value;saveSettings();applyAppearance();});
  resetPrimaryColor?.addEventListener('click',()=>{settings.primaryColor=defaults.primaryColor;saveSettings();applyAppearance();});
  themeButtons.forEach(button=>button.addEventListener('click',()=>{settings.theme=button.dataset.themeChoice;saveSettings();applyAppearance();}));
  cubeColorInputs.forEach(input=>input.addEventListener('input',()=>{
    if(!window.SSCCubePreview)return;
    const colors=window.SSCCubePreview.getColors();
    colors[input.dataset.cubeFace]=input.value;
    window.SSCCubePreview.setColors(colors);
  }));
  resetCubeColors?.addEventListener('click',()=>{window.SSCCubePreview?.resetColors();syncCubeColors();});

  applyAppearance();
  updateLabels();
  notifySettingsChange();
})();
