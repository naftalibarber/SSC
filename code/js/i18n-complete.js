(() => {
  'use strict';

  /*
   * Safe final-pass UI translation layer.
   * Important: this file must never create a self-triggering MutationObserver loop.
   * Every text/attribute write is guarded, and the body observer is disconnected
   * while translations are applied.
   */

  const LANGUAGE_KEY='sscLanguageV1';
  const isHebrew=()=>document.documentElement.lang==='he'||(document.documentElement.lang!=='en'&&localStorage.getItem(LANGUAGE_KEY)!=='en');
  const pick=(he,en)=>isHebrew()?he:en;

  const EVENTS=Object.freeze({
    '222':['2×2','2×2','קוביית 2×2×2','2x2x2 Cube'],
    '333':['3×3','3×3','קוביית 3×3×3','3x3x3 Cube'],
    '444':['4×4','4×4','קוביית 4×4×4','4x4x4 Cube'],
    '555':['5×5','5×5','קוביית 5×5×5','5x5x5 Cube'],
    '666':['6×6','6×6','קוביית 6×6×6','6x6x6 Cube'],
    '777':['7×7','7×7','קוביית 7×7×7','7x7x7 Cube'],
    '333bf':['3BLD','3BLD','3×3×3 בעיניים עצומות','3x3x3 Blindfolded'],
    '333fm':['FMC','FMC','3×3×3 – מינימום מהלכים','3x3x3 Fewest Moves'],
    '333oh':['OH','OH','3×3×3 ביד אחת','3x3x3 One-Handed'],
    'clock':['שעון','CLOCK','שעון','Clock'],
    'minx':['מגהמינקס','MEGAMINX','מגהמינקס','Megaminx'],
    'pyram':['פירמינקס','PYRAMINX','פירמינקס','Pyraminx'],
    'skewb':['סקיוב','SKEWB','סקיוב','Skewb'],
    'sq1':['Square-1','SQ-1','Square-1','Square-1'],
    'fto':['FTO','FTO','אוקטהדרון סיבובי פאות','Face-Turning Octahedron'],
    '444bf':['4BLD','4BLD','4×4×4 בעיניים עצומות','4x4x4 Blindfolded'],
    '555bf':['5BLD','5BLD','5×5×5 בעיניים עצומות','5x5x5 Blindfolded'],
    '333mbf':['MBLD','MBLD','3×3×3 רב־קוביות בעיניים עצומות','3x3x3 Multi-Blind']
  });

  const TAGS=Object.freeze({
    'Good Solve':['פתרון טוב','Good Solve'],
    'Bad Cross':['קרוס לא טוב','Bad Cross'],
    'Bad F2L':['F2L לא טוב','Bad F2L'],
    'OLL Mistake':['טעות OLL','OLL Mistake'],
    'PLL Mistake':['טעות PLL','PLL Mistake'],
    'Lockup':['תקיעה','Lockup'],
    'Recognition':['זיהוי','Recognition'],
    'Lucky':['מזל','Lucky'],
    'Inspection':['בדיקה','Inspection']
  });

  function writeText(element,value){
    if(element&&element.textContent!==value)element.textContent=value;
  }
  function text(selector,he,en){
    const value=pick(he,en);
    document.querySelectorAll(selector).forEach(element=>writeText(element,value));
  }
  function attr(selector,name,he,en){
    const value=pick(he,en);
    document.querySelectorAll(selector).forEach(element=>{
      if(element.getAttribute(name)!==value)element.setAttribute(name,value);
    });
  }
  function labelWithInput(selector,he,en){
    const label=document.querySelector(selector);
    if(!(label instanceof HTMLElement))return;
    const value=pick(he,en);
    let node=[...label.childNodes].find(child=>child.nodeType===Node.TEXT_NODE&&child.textContent.trim());
    if(!node){node=document.createTextNode('');label.insertBefore(node,label.querySelector(':scope > input')||null);}
    if(node.textContent.trim()!==value)node.textContent=`${value} `;
  }

  function eventInfo(id){
    const event=EVENTS[String(id||'').trim().toLowerCase()];
    if(!event)return null;
    return{label:isHebrew()?event[0]:event[1],name:isHebrew()?event[2]:event[3]};
  }

  function translateToolbar(){
    text('#generalSettingsButton span','הגדרות','SETTINGS');
    text('#colorSettingsButtonText','עיצוב','APPEARANCE');
    text('#importExportButton span','יבוא / יצוא','IMPORT / EXPORT');
    text('#focusModeButton span','מיקוד','FOCUS');
    text('#analyticsButton span','ניתוח','ANALYTICS');
    attr('#prevScramble','title','ערבוב קודם','Previous scramble');
    attr('#prevScramble','aria-label','ערבוב קודם','Previous scramble');
    attr('#newScramble','title','ערבוב הבא','Next scramble');
    attr('#newScramble','aria-label','ערבוב הבא','Next scramble');
    attr('#sessionMenuButton','title','ניהול סשנים','Session manager');
    attr('#sessionMenuButton','aria-label','ניהול סשנים','Session manager');
    attr('#analyticsButton','title','ניתוח התקדמות','Progress Analytics');
    attr('#analyticsButton','aria-label','ניתוח התקדמות','Progress Analytics');
  }

  function translateSettings(){
    const pairs=[
      ['#generalSettingsTitle','הגדרות כלליות','General settings'],
      ['#languageSettingLabel','שפה','Language'],
      ['#textSizeSettingLabel','גודל הטקסט','Text size'],
      ['#fontSettingLabel','גופן הטקסט','Text font'],
      ['#timerFontSettingLabel','גופן הטיימר','Timer font'],
      ['#timePrecisionSettingLabel','דיוק הזמן','Time precision'],
      ['#competitionModeSettingLabel','מצב תחרות','Competition mode'],
      ['#competitionInspectionSettingLabel','בדיקת תחרות','Competition inspection'],
      ['#primaryColorSettingLabel','צבע ראשי','Primary color'],
      ['#cubePreviewSizeSettingLabel','גודל התצוגה','Preview size'],
      ['#cubeColorsSettingLabel','צבעי הקובייה','Cube colors'],
      ['#resetCubeColors','איפוס צבעי קובייה','Reset cube colors'],
      ['#themeSettingLabel','עיצוב','Theme'],
      ['#themeLightButton','בהיר','Light'],
      ['#themeDarkButton','כהה','Dark'],
      ['#previewModeSettingLabel','תצוגה קטנה','Small preview'],
      ['#previewInteractionSettingLabel','אפשר לסובב בחלון 3D','Allow rotation in 3D window'],
      ['#previewCameraSettingLabel','מצלמת חלון 3D','3D window camera'],
      ['#previewResetCamera','איפוס זווית בחלון פתוח','Reset open window angle'],
      ['#previewFacesSettingLabel','פאות להצגה (לפחות אחת)','Faces to show (at least one)']
    ];
    pairs.forEach(([selector,he,en])=>text(selector,he,en));
    text('#resetPrimaryColor','איפוס','Reset');
    attr('#closeGeneralSettings','aria-label','סגור','Close');

    const system=document.querySelector('#timerFontSelect option[value="system"]');
    writeText(system,pick('מערכת','System'));
    const yes=document.querySelector('#previewInteractionSelect option[value="yes"]');
    const no=document.querySelector('#previewInteractionSelect option[value="no"]');
    writeText(yes,pick('כן','Yes'));writeText(no,pick('לא','No'));
    const faces=document.querySelector('#previewModeSelect option[value="faces"]');
    writeText(faces,pick('פאות נבחרות','Selected faces'));

    const modeToggle=document.getElementById('competitionModeToggle');
    const modeValue=document.getElementById('competitionModeValue');
    if(modeToggle&&modeValue)writeText(modeValue,isHebrew()?(modeToggle.checked?'מופעל':'כבוי'):(modeToggle.checked?'ON':'OFF'));
    const inspectionToggle=document.getElementById('competitionInspectionToggle');
    const inspectionValue=document.getElementById('competitionInspectionValue');
    if(inspectionToggle&&inspectionValue)writeText(inspectionValue,isHebrew()?(inspectionToggle.checked?'מופעל':'כבוי'):(inspectionToggle.checked?'ON':'OFF'));
  }

  function translateCore(){
    text('.section-title','סטטיסטיקות','STATISTICS');
    text('.history-section-head > span','זמנים','TIMES');
    document.querySelectorAll('#statsPrimary .stats-group > div > span,.metric-option > span').forEach(element=>{
      const value=element.textContent.trim();
      if(value==='Single'||value==='יחיד')writeText(element,pick('יחיד','Single'));
    });
    document.querySelectorAll('#eventSelect option').forEach(option=>{
      const info=eventInfo(option.value);if(!info)return;
      writeText(option,info.label);
      if(option.title!==info.name)option.title=info.name;
    });
  }

  function translateImportExport(){
    text('#importExportModal .settings-dialog-head h2','יבוא / יצוא','Import / Export');
    text('#exportData','ייצוא גיבוי מלא','Export Full Backup');
    text('#exportSessionCsv','ייצוא סשן CSV','Export Session CSV');
    labelWithInput('#importExportModal .file-label','שחזור גיבוי','Restore Backup');
    attr('#closeImportExport','aria-label','סגור','Close');
  }

  function translateAnalytics(){
    text('#analyticsModal [data-analytics-title]','ניתוח התקדמות','Progress Analytics');
    text('#analyticsModal [data-range="all"]','הכול','All');
    attr('#analyticsTagFilter','aria-label','סינון לפי תגיות','Tag filter');
    const legend=document.querySelector('#analyticsModal .graph-legend span:first-child');
    if(legend)writeText(legend,pick('יחיד','Single'));
    document.querySelectorAll('#analyticsTagFilter option').forEach(option=>{
      const pair=TAGS[option.value];if(pair)writeText(option,isHebrew()?pair[0]:pair[1]);
    });
  }

  function translateDialogs(){
    text('#shortcutsModal [data-shortcuts-title]','קיצורי מקלדת','Keyboard shortcuts');
    attr('#shortcutsModal [data-shortcuts-close]','aria-label','סגור','Close');
    attr('#solveDetailsModal [data-solve-close]','aria-label','סגור','Close');
    attr('#fullHistoryModal [data-full-history-close]','aria-label','סגור','Close');
    attr('#sscPreview3DClose','aria-label','סגור תצוגת 3D','Close 3D preview');
    text('#sscPreview3DReset','איפוס זווית','Reset angle');
    const subtitle=document.getElementById('sscPreview3DSubtitle');
    if(subtitle)writeText(subtitle,pick('תצוגת 3D אינטראקטיבית','Interactive 3D preview'));
    const hint=document.getElementById('sscPreview3DHint');
    if(hint){
      const enabled=localStorage.getItem('sscPreviewInteractiveV1')!=='false';
      writeText(hint,enabled?pick('גרור כדי לסובב את הפאזל','Drag to rotate the puzzle'):pick('סיבוב 3D כבוי בהגדרות','3D rotation is disabled in settings'));
    }
    const kicker=document.querySelector('#sscMbldResultModal .ssc-mbld-dialog-kicker');
    if(kicker)writeText(kicker,pick('תוצאה','RESULT'));
  }

  function translatePreviewFallbacks(){
    document.querySelectorAll('.wca-preview-unsupported').forEach(element=>{
      const original=element.textContent.trim();
      if(/Single Face|פאה יחידה/i.test(original))writeText(element,pick('תצוגת פאה יחידה עדיין אינה מחוברת','Single Face preview is not connected yet'));
      else if(/2D preview|תצוגת 2D/i.test(original))writeText(element,pick('תצוגת 2D אינה זמינה','2D preview unavailable'));
      else writeText(element,pick('התצוגה אינה מוגדרת','Preview not configured'));
    });
    document.querySelectorAll('.ssc-puzzle-3d-fallback').forEach(element=>{
      if(/3D preview unavailable|תצוגת 3D אינה זמינה/i.test(element.textContent))writeText(element,pick('תצוגת 3D אינה זמינה','3D preview unavailable'));
    });
  }

  function translateAll(){
    translateToolbar();
    translateSettings();
    translateCore();
    translateImportExport();
    translateAnalytics();
    translateDialogs();
    translatePreviewFallbacks();
  }

  let bodyObserver=null;
  let scheduled=false;
  function observeBody(){
    if(!document.body||!bodyObserver)return;
    bodyObserver.observe(document.body,{childList:true,subtree:true});
  }
  function run(){
    scheduled=false;
    bodyObserver?.disconnect();
    try{translateAll();}
    catch(error){console.error('[SSC i18n] Translation pass failed',error);}
    finally{observeBody();}
  }
  function schedule(){
    if(scheduled)return;
    scheduled=true;
    setTimeout(run,0);
  }

  bodyObserver=new MutationObserver(schedule);
  observeBody();
  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
  ['ssc-event-change','ssc-general-settings-change','ssc-preview-mode-change','ssc-selected-faces-mode-change','ssc-mbld-result-saved'].forEach(name=>window.addEventListener(name,schedule));
  document.getElementById('languageSelect')?.addEventListener('change',schedule);

  run();
  window.SSCI18nComplete=Object.freeze({translate:run});
})();
