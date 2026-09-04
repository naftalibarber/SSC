(() => {
  'use strict';

  const LANGUAGE_KEY='sscLanguageV1';
  const isHebrew=()=>document.documentElement.lang==='he'||(document.documentElement.lang!=='en'&&localStorage.getItem(LANGUAGE_KEY)!=='en');
  const pick=(he,en)=>isHebrew()?he:en;

  const EVENTS=Object.freeze({
    '222':{heLabel:'2×2',enLabel:'2×2',heName:'קוביית 2×2×2',enName:'2x2x2 Cube'},
    '333':{heLabel:'3×3',enLabel:'3×3',heName:'קוביית 3×3×3',enName:'3x3x3 Cube'},
    '444':{heLabel:'4×4',enLabel:'4×4',heName:'קוביית 4×4×4',enName:'4x4x4 Cube'},
    '555':{heLabel:'5×5',enLabel:'5×5',heName:'קוביית 5×5×5',enName:'5x5x5 Cube'},
    '666':{heLabel:'6×6',enLabel:'6×6',heName:'קוביית 6×6×6',enName:'6x6x6 Cube'},
    '777':{heLabel:'7×7',enLabel:'7×7',heName:'קוביית 7×7×7',enName:'7x7x7 Cube'},
    '333bf':{heLabel:'3BLD',enLabel:'3BLD',heName:'3×3×3 בעיניים עצומות',enName:'3x3x3 Blindfolded'},
    '333fm':{heLabel:'FMC',enLabel:'FMC',heName:'3×3×3 – מינימום מהלכים',enName:'3x3x3 Fewest Moves'},
    '333oh':{heLabel:'OH',enLabel:'OH',heName:'3×3×3 ביד אחת',enName:'3x3x3 One-Handed'},
    'clock':{heLabel:'שעון',enLabel:'CLOCK',heName:'שעון',enName:'Clock'},
    'minx':{heLabel:'מגהמינקס',enLabel:'MEGAMINX',heName:'מגהמינקס',enName:'Megaminx'},
    'pyram':{heLabel:'פירמינקס',enLabel:'PYRAMINX',heName:'פירמינקס',enName:'Pyraminx'},
    'skewb':{heLabel:'סקיוב',enLabel:'SKEWB',heName:'סקיוב',enName:'Skewb'},
    'sq1':{heLabel:'Square-1',enLabel:'SQ-1',heName:'Square-1',enName:'Square-1'},
    'fto':{heLabel:'FTO',enLabel:'FTO',heName:'אוקטהדרון סיבובי פאות',enName:'Face-Turning Octahedron'},
    '444bf':{heLabel:'4BLD',enLabel:'4BLD',heName:'4×4×4 בעיניים עצומות',enName:'4x4x4 Blindfolded'},
    '555bf':{heLabel:'5BLD',enLabel:'5BLD',heName:'5×5×5 בעיניים עצומות',enName:'5x5x5 Blindfolded'},
    '333mbf':{heLabel:'MBLD',enLabel:'MBLD',heName:'3×3×3 רב־קוביות בעיניים עצומות',enName:'3x3x3 Multi-Blind'}
  });

  const DEFAULT_TAGS=Object.freeze({
    'Good Solve':{he:'פתרון טוב',en:'Good Solve'},
    'Bad Cross':{he:'קרוס לא טוב',en:'Bad Cross'},
    'Bad F2L':{he:'F2L לא טוב',en:'Bad F2L'},
    'OLL Mistake':{he:'טעות OLL',en:'OLL Mistake'},
    'PLL Mistake':{he:'טעות PLL',en:'PLL Mistake'},
    'Lockup':{he:'תקיעה',en:'Lockup'},
    'Recognition':{he:'זיהוי',en:'Recognition'},
    'Lucky':{he:'מזל',en:'Lucky'},
    'Inspection':{he:'בדיקה',en:'Inspection'}
  });

  const SHORTCUTS=Object.freeze({
    'Ctrl/Cmd + 1':{he:'מעבר ל־Square-1',en:'Switch to Square-1'},
    'Ctrl/Cmd + 2':{he:'מעבר ל־2×2',en:'Switch to 2×2'},
    'Ctrl/Cmd + 3':{he:'מעבר ל־3×3',en:'Switch to 3×3'},
    'Ctrl/Cmd + 4':{he:'מעבר ל־4×4',en:'Switch to 4×4'},
    'Ctrl/Cmd + 5':{he:'מעבר ל־5×5',en:'Switch to 5×5'},
    'Ctrl/Cmd + 6':{he:'מעבר ל־6×6',en:'Switch to 6×6'},
    'Ctrl/Cmd + 7':{he:'מעבר ל־7×7',en:'Switch to 7×7'},
    'Ctrl/Cmd + P':{he:'מעבר ל־Pyraminx',en:'Switch to Pyraminx'},
    'Ctrl/Cmd + M':{he:'מעבר ל־Megaminx',en:'Switch to Megaminx'},
    'Ctrl/Cmd + B':{he:'מעבר ל־3BLD',en:'Switch to 3BLD'},
    'Ctrl/Cmd + M + B':{he:'מעבר ל־MBLD',en:'Switch to MBLD'},
    'Ctrl/Cmd + S':{he:'מעבר ל־Skewb',en:'Switch to Skewb'},
    'Ctrl/Cmd + C':{he:'מעבר ל־Clock',en:'Switch to Clock'},
    'Ctrl/Cmd + F':{he:'מעבר ל־FTO',en:'Switch to FTO'},
    'Ctrl/Cmd + D':{he:'סימון הפתרון האחרון כ־DNF',en:'Mark the latest solve DNF'},
    'Ctrl/Cmd + +':{he:'סימון הפתרון האחרון כ־+2',en:'Mark the latest solve +2'},
    'Ctrl/Cmd + N':{he:'מחיקת הפתרון האחרון',en:'Delete the latest solve'},
    'Ctrl/Cmd + Z':{he:'ביטול הפעולה האחרונה',en:'Undo the last action'},
    'Ctrl/Cmd + L':{he:'מעבר לשפה הבאה',en:'Switch to the next language'},
    'Ctrl/Cmd + ?':{he:'עזרה לקיצורים',en:'Shortcuts help'}
  });

  function setText(selector,he,en){
    document.querySelectorAll(selector).forEach(element=>{
      const value=pick(he,en);
      if(element.textContent!==value)element.textContent=value;
    });
  }

  function setAttr(selector,name,he,en){
    document.querySelectorAll(selector).forEach(element=>{
      const value=pick(he,en);
      if(element.getAttribute(name)!==value)element.setAttribute(name,value);
    });
  }

  function setLabelTextPreservingInput(label,he,en){
    if(!(label instanceof HTMLElement))return;
    const value=pick(he,en);
    let textNode=[...label.childNodes].find(node=>node.nodeType===Node.TEXT_NODE&&node.textContent.trim());
    if(!textNode){
      textNode=document.createTextNode('');
      label.insertBefore(textNode,label.querySelector(':scope > input')||null);
    }
    if(textNode.textContent.trim()!==value)textNode.textContent=`${value} `;
  }

  function eventIdFrom(value){
    const raw=String(value||'').trim().toLowerCase();
    const aliases={'2x2':'222','3x3':'333','4x4':'444','5x5':'555','6x6':'666','7x7':'777','3bld':'333bf','fmc':'333fm','oh':'333oh','megaminx':'minx','pyraminx':'pyram','square-1':'sq1','square1':'sq1','mbld':'333mbf'};
    return aliases[raw]||raw;
  }

  function currentEventId(){
    return eventIdFrom(window.SSCTimerEvents?.getCurrent?.()||document.getElementById('eventSelect')?.value||localStorage.getItem('rubiksCubeTimerEventV2')||'333');
  }

  function eventText(eventId){
    const event=EVENTS[eventIdFrom(eventId)];
    if(!event)return null;
    return{
      label:isHebrew()?event.heLabel:event.enLabel,
      name:isHebrew()?event.heName:event.enName
    };
  }

  function translateSettings(){
    const labels=[
      ['generalSettingsTitle','הגדרות כלליות','General settings'],
      ['languageSettingLabel','שפה','Language'],
      ['textSizeSettingLabel','גודל הטקסט','Text size'],
      ['fontSettingLabel','גופן הטקסט','Text font'],
      ['timerFontSettingLabel','גופן הטיימר','Timer font'],
      ['timePrecisionSettingLabel','דיוק הזמן','Time precision'],
      ['competitionModeSettingLabel','מצב תחרות','Competition Mode'],
      ['competitionInspectionSettingLabel','בדיקת תחרות','Competition inspection'],
      ['primaryColorSettingLabel','צבע ראשי','Primary color'],
      ['cubePreviewSizeSettingLabel','גודל התצוגה','Preview size'],
      ['cubeLineWidthSettingLabel','עובי קווי הקובייה','Cube line thickness'],
      ['cubeColorsSettingLabel','צבעי הקובייה','Cube colors'],
      ['resetCubeColors','איפוס צבעי קובייה','Reset cube colors'],
      ['themeSettingLabel','עיצוב','Theme'],
      ['themeLightButton','בהיר','Light'],
      ['themeDarkButton','כהה','Dark'],
      ['previewModeSettingLabel','תצוגה קטנה','Small preview'],
      ['previewInteractionSettingLabel','אפשר לסובב בחלון 3D','Allow rotation in 3D window'],
      ['previewCameraSettingLabel','מצלמת חלון 3D','3D window camera'],
      ['previewResetCamera','איפוס זווית בחלון פתוח','Reset open window angle'],
      ['previewFacesSettingLabel','פאות להצגה (לפחות אחת)','Faces to show (at least one)']
    ];
    labels.forEach(([id,he,en])=>setText(`#${id}`,he,en));
    setText('#resetPrimaryColor','איפוס','Reset');
    setAttr('#closeGeneralSettings','aria-label','סגור','Close');
    setAttr('#generalSettingsButton','title','הגדרות כלליות','General settings');
    setAttr('#generalSettingsButton','aria-label','הגדרות כלליות','General settings');

    const system=document.querySelector('#timerFontSelect option[value="system"]');
    if(system){const value=pick('מערכת','System');if(system.textContent!==value)system.textContent=value;}

    const modeToggle=document.getElementById('competitionModeToggle');
    const modeValue=document.getElementById('competitionModeValue');
    if(modeValue&&modeToggle)modeValue.textContent=isHebrew()?(modeToggle.checked?'מופעל':'כבוי'):(modeToggle.checked?'ON':'OFF');
    const inspectionToggle=document.getElementById('competitionInspectionToggle');
    const inspectionValue=document.getElementById('competitionInspectionValue');
    if(inspectionValue&&inspectionToggle)inspectionValue.textContent=isHebrew()?(inspectionToggle.checked?'מופעל':'כבוי'):(inspectionToggle.checked?'ON':'OFF');

    const interaction=document.getElementById('previewInteractionSelect');
    if(interaction){
      const yes=interaction.querySelector('option[value="yes"]');
      const no=interaction.querySelector('option[value="no"]');
      if(yes)yes.textContent=pick('כן','Yes');
      if(no)no.textContent=pick('לא','No');
    }
    const faces=document.querySelector('#previewModeSelect option[value="faces"]');
    if(faces)faces.textContent=pick('פאות נבחרות','Selected faces');
  }

  function translateToolbar(){
    setText('#generalSettingsButton span','הגדרות','SETTINGS');
    setText('#colorSettingsButtonText','עיצוב','APPEARANCE');
    setText('#importExportButton span','יבוא / יצוא','IMPORT / EXPORT');
    setText('#focusModeButton span','מיקוד','FOCUS');
    setText('#analyticsButton span','ניתוח','ANALYTICS');
    setAttr('#prevScramble','title','ערבוב קודם','Previous scramble');
    setAttr('#prevScramble','aria-label','ערבוב קודם','Previous scramble');
    setAttr('#newScramble','title','ערבוב הבא','Next scramble');
    setAttr('#newScramble','aria-label','ערבוב הבא','Next scramble');
    setAttr('#sessionMenuButton','title','ניהול סשנים','Session manager');
    setAttr('#sessionMenuButton','aria-label','ניהול סשנים','Session manager');
    setAttr('#analyticsButton','title','ניתוח התקדמות','Progress Analytics');
    setAttr('#analyticsButton','aria-label','ניתוח התקדמות','Progress Analytics');
  }

  function translateEvents(){
    document.querySelectorAll('#eventSelect option').forEach(option=>{
      const info=eventText(option.value);
      if(!info)return;
      if(option.textContent!==info.label)option.textContent=info.label;
      if(option.title!==info.name)option.title=info.name;
    });

    const current=currentEventId();
    const info=eventText(current);
    const scrambleLabel=document.getElementById('scrambleLabel');
    if(info&&scrambleLabel){
      const mbldSummary=current==='333mbf'&&document.getElementById('scramble')?.classList.contains('ssc-mbld-summary');
      const value=mbldSummary?'MBLD':`${pick('ערבוב','Scramble')} ${info.label}`;
      if(scrambleLabel.textContent!==value)scrambleLabel.textContent=value;
    }

    document.querySelectorAll('#sessionMenu .session-menu-row').forEach(row=>{
      const first=row.querySelector('span');
      if(!first||!info)return;
      const parts=first.textContent.split(' · ');
      if(parts.length>1){
        const value=[info.label,...parts.slice(1)].join(' · ');
        if(first.textContent!==value)first.textContent=value;
      }
    });

    const fullSession=document.querySelector('#fullHistoryModal [data-full-history-session]');
    if(fullSession&&info){
      const parts=fullSession.textContent.split(' · ');
      if(parts.length>1){const value=[info.label,...parts.slice(1)].join(' · ');if(fullSession.textContent!==value)fullSession.textContent=value;}
    }

    document.querySelectorAll('#solveDetailsModal .solve-detail-row').forEach(row=>{
      const label=row.querySelector('span');
      const value=row.querySelector('strong');
      if(!label||!value)return;
      const text=label.textContent.trim();
      if((text==='מקצה'||text==='Event')&&info)value.textContent=info.label;
    });
  }

  function translateCoreStats(){
    setText('.section-title','סטטיסטיקות','STATISTICS');
    setText('.history-section-head > span','זמנים','TIMES');
    document.querySelectorAll('#statsPrimary .stats-group > div > span,.metric-option > span').forEach(element=>{
      const current=element.textContent.trim();
      if(current==='Single'||current==='יחיד')element.textContent=pick('יחיד','Single');
    });
  }

  function translateSolveDetails(){
    const pairs=new Map([
      ['Final Time',['זמן סופי','Final Time']],['זמן סופי',['זמן סופי','Final Time']],
      ['Raw Time',['זמן גולמי','Raw Time']],['זמן גולמי',['זמן גולמי','Raw Time']],
      ['Penalty',['עונש','Penalty']],['עונש',['עונש','Penalty']],
      ['Scramble',['ערבוב','Scramble']],['ערבוב',['ערבוב','Scramble']],
      ['Date',['תאריך','Date']],['תאריך',['תאריך','Date']],
      ['Event',['מקצה','Event']],['מקצה',['מקצה','Event']],
      ['Session',['סשן','Session']],['סשן',['סשן','Session']]
    ]);
    setText('#solveDetailsModal [data-solve-title]','פרטי פתרון','Solve details');
    document.querySelectorAll('#solveDetailsModal .solve-detail-row > span').forEach(element=>{
      const pair=pairs.get(element.textContent.trim());if(pair)element.textContent=pick(pair[0],pair[1]);
    });
    setText('#solveDetailsModal [data-copy-scramble]','העתק ערבוב','Copy Scramble');
    setText('#solveDetailsModal [data-repeat-scramble]','חזור על הערבוב','Repeat Scramble');
    setAttr('#solveDetailsModal [data-solve-close]','aria-label','סגור','Close');
    setAttr('#solveDetailsModal [data-solve-close]','title','סגור','Close');

    setText('#solveDetailsModal .metadata-head > strong','תגיות','Tags');
    setText('#solveDetailsModal [data-add-tag]','+ תגית','+ Tag');
    setText('#solveDetailsModal .note-field > span','הערות','Notes');
    const saved=document.querySelector('#solveDetailsModal .metadata-save-state');
    if(saved&&['Saved','נשמר'].includes(saved.textContent.trim()))saved.textContent=pick('נשמר','Saved');
  }

  function ensureTagStyle(){
    if(document.getElementById('sscCompleteI18nStyles'))return;
    const style=document.createElement('style');
    style.id='sscCompleteI18nStyles';
    style.textContent=`
      #solveDetailsModal .tag-chip span[data-ssc-i18n-label]{font-size:0!important}
      #solveDetailsModal .tag-chip span[data-ssc-i18n-label]::after{content:attr(data-ssc-i18n-label);font-size:12px!important}
    `;
    document.head.appendChild(style);
  }

  function translateTags(){
    document.querySelectorAll('#solveDetailsModal .tag-chip span').forEach(span=>{
      const canonical=span.dataset.sscCanonicalTag||span.textContent.trim();
      const item=DEFAULT_TAGS[canonical];
      if(!item)return;
      span.dataset.sscCanonicalTag=canonical;
      span.dataset.sscI18nLabel=isHebrew()?item.he:item.en;
    });
    document.querySelectorAll('#analyticsTagFilter option').forEach(option=>{
      const item=DEFAULT_TAGS[option.value];
      if(!item)return;
      const value=isHebrew()?item.he:item.en;
      if(option.textContent!==value)option.textContent=value;
    });
  }

  function translateAnalyticsInsight(text){
    let value=String(text||'').trim();
    if(!value)return value;
    if(isHebrew()){
      let match=value.match(/^Best Ao5 improved by (.+)s\.$/);if(match)return`Ao5 הטוב ביותר השתפר ב־${match[1]}s.`;
      match=value.match(/^Best Ao5 is (.+)s slower than the previous session\.$/);if(match)return`Ao5 הטוב ביותר איטי יותר ב־${match[1]}s לעומת הסשן הקודם.`;
      match=value.match(/^DNF rate changed from (.+)% to (.+)%\.$/);if(match)return`שיעור DNF השתנה מ־${match[1]}% ל־${match[2]}%.`;
      match=value.match(/^Your last 12 solves are (.+)% more consistent\.$/);if(match)return`12 הפתרונות האחרונים עקביים יותר ב־${match[1]}%.`;
      return value.replace(/^Best Ao5 השתפר/,'Ao5 הטוב ביותר השתפר').replace(/^Best Ao5 איטי יותר/,'Ao5 הטוב ביותר איטי יותר');
    }
    let match=value.match(/^(?:Best Ao5|Ao5 הטוב ביותר) השתפר ב־(.+)s\.$/);if(match)return`Best Ao5 improved by ${match[1]}s.`;
    match=value.match(/^(?:Best Ao5|Ao5 הטוב ביותר) איטי יותר ב־(.+)s לעומת הסשן הקודם\.$/);if(match)return`Best Ao5 is ${match[1]}s slower than the previous session.`;
    match=value.match(/^שיעור DNF השתנה מ־(.+)% ל־(.+)%\.$/);if(match)return`DNF rate changed from ${match[1]}% to ${match[2]}%.`;
    match=value.match(/^12 הפתרונות האחרונים עקביים יותר ב־(.+)%\.$/);if(match)return`Your last 12 solves are ${match[1]}% more consistent.`;
    return value;
  }

  function translateAnalytics(){
    const modal=document.getElementById('analyticsModal');
    if(!modal)return;
    setText('#analyticsModal [data-analytics-title]','ניתוח התקדמות','Progress Analytics');
    setText('#analyticsModal [data-range="all"]','הכול','All');
    setAttr('#analyticsTagFilter','aria-label','סינון לפי תגיות','Tag filter');
    setAttr('#analyticsModal [data-analytics-close].modal-close','aria-label','סגור','Close');
    setAttr('#analyticsModal [data-analytics-close].modal-close','title','סגור','Close');

    const firstLegend=modal.querySelector('.graph-legend span:first-child');
    if(firstLegend)firstLegend.textContent=pick('יחיד','Single');

    const summaryMap=new Map([
      ['Best',['הטוב ביותר','Best']],['הטוב ביותר',['הטוב ביותר','Best']],
      ['Best Ao5',['Ao5 הטוב ביותר','Best Ao5']],['Ao5 הטוב ביותר',['Ao5 הטוב ביותר','Best Ao5']],
      ['Best Ao12',['Ao12 הטוב ביותר','Best Ao12']],['Ao12 הטוב ביותר',['Ao12 הטוב ביותר','Best Ao12']],
      ['Best Ao50',['Ao50 הטוב ביותר','Best Ao50']],['Ao50 הטוב ביותר',['Ao50 הטוב ביותר','Best Ao50']],
      ['Best Ao100',['Ao100 הטוב ביותר','Best Ao100']],['Ao100 הטוב ביותר',['Ao100 הטוב ביותר','Best Ao100']],
      ['PBs',['שיאים אישיים','PBs']],['שיאים אישיים',['שיאים אישיים','PBs']]
    ]);
    modal.querySelectorAll('.summary-grid > div > span').forEach(element=>{
      const pair=summaryMap.get(element.textContent.trim());if(pair)element.textContent=pick(pair[0],pair[1]);
    });

    const count=modal.querySelector('.summary-head > span');
    if(count){
      let match=count.textContent.trim().match(/^(\d+) solves$/);if(match&&isHebrew())count.textContent=`${match[1]} פתרונות`;
      match=count.textContent.trim().match(/^(\d+) פתרונות$/);if(match&&!isHebrew())count.textContent=`${match[1]} solves`;
    }

    modal.querySelectorAll('.analytics-insights li').forEach(item=>{
      const value=translateAnalyticsInsight(item.textContent);if(item.textContent!==value)item.textContent=value;
    });
    const insights=modal.querySelector('.analytics-insights > strong');
    if(insights)insights.textContent=pick('תובנות','Insights');
    translateTags();
  }

  function translateImportStatus(){
    const status=document.getElementById('importExportStatus');
    if(!status||!status.textContent.trim())return;
    let value=status.textContent.trim();
    const heRules=[
      [/^CSV exported successfully\.$/,'ה־CSV יוצא בהצלחה.'],
      [/^Full backup exported successfully\.$/,'הגיבוי המלא יוצא בהצלחה.'],
      [/^Backup export failed\.$/,'ייצוא הגיבוי נכשל.'],
      [/^Restore complete\. Reloading\.\.\.$/,'השחזור הושלם. טוען מחדש...'],
      [/^Restore rejected:\s*/,'השחזור נדחה: '],
      [/Solve (\d+) is not an object/g,'פתרון $1 אינו רשומה תקינה'],
      [/Solve (\d+) has invalid ID/g,'לפתרון $1 יש מזהה לא תקין'],
      [/Solve (\d+) has invalid penalty/g,'לפתרון $1 יש עונש לא תקין'],
      [/Solve (\d+) has invalid time/g,'לפתרון $1 יש זמן לא תקין'],
      [/Solve (\d+) has invalid timestamp/g,'לפתרון $1 יש תאריך או שעה לא תקינים'],
      [/Solve (\d+) has invalid tags/g,'לפתרון $1 יש תגיות לא תקינות'],
      [/Solve (\d+) has invalid note/g,'לפתרון $1 יש הערה לא תקינה'],
      [/Missing or invalid sessions/g,'חסרים סשנים או שנתוני הסשנים אינם תקינים'],
      [/Invalid sessions format/g,'מבנה הסשנים אינו תקין'],
      [/Invalid session/g,'סשן לא תקין'],
      [/Duplicate session ID/g,'מזהה סשן כפול'],
      [/Invalid JSON root/g,'מבנה קובץ JSON אינו תקין'],
      [/Wrong app identifier/g,'קובץ הגיבוי אינו שייך ל־SSC'],
      [/Unsupported backup version/g,'גרסת הגיבוי אינה נתמכת'],
      [/Missing solves/g,'חסרים נתוני פתרונות'],
      [/Duplicate solve ID/g,'מזהה פתרון כפול'],
      [/Invalid custom tags/g,'התגיות המותאמות אישית אינן תקינות']
    ];
    const enRules=[
      [/^ה־CSV יוצא בהצלחה\.$/,'CSV exported successfully.'],
      [/^הגיבוי המלא יוצא בהצלחה\.$/,'Full backup exported successfully.'],
      [/^ייצוא הגיבוי נכשל\.$/,'Backup export failed.'],
      [/^השחזור הושלם\. טוען מחדש\.\.\.$/,'Restore complete. Reloading...'],
      [/^השחזור נדחה:\s*/,'Restore rejected: '],
      [/פתרון (\d+) אינו רשומה תקינה/g,'Solve $1 is not an object'],
      [/לפתרון (\d+) יש מזהה לא תקין/g,'Solve $1 has invalid ID'],
      [/לפתרון (\d+) יש עונש לא תקין/g,'Solve $1 has invalid penalty'],
      [/לפתרון (\d+) יש זמן לא תקין/g,'Solve $1 has invalid time'],
      [/לפתרון (\d+) יש תאריך או שעה לא תקינים/g,'Solve $1 has invalid timestamp'],
      [/לפתרון (\d+) יש תגיות לא תקינות/g,'Solve $1 has invalid tags'],
      [/לפתרון (\d+) יש הערה לא תקינה/g,'Solve $1 has invalid note'],
      [/חסרים סשנים או שנתוני הסשנים אינם תקינים/g,'Missing or invalid sessions'],
      [/מבנה הסשנים אינו תקין/g,'Invalid sessions format'],
      [/סשן לא תקין/g,'Invalid session'],
      [/מזהה סשן כפול/g,'Duplicate session ID'],
      [/מבנה קובץ JSON אינו תקין/g,'Invalid JSON root'],
      [/קובץ הגיבוי אינו שייך ל־SSC/g,'Wrong app identifier'],
      [/גרסת הגיבוי אינה נתמכת/g,'Unsupported backup version'],
      [/חסרים נתוני פתרונות/g,'Missing solves'],
      [/מזהה פתרון כפול/g,'Duplicate solve ID'],
      [/התגיות המותאמות אישית אינן תקינות/g,'Invalid custom tags']
    ];
    for(const [pattern,replacement] of (isHebrew()?heRules:enRules))value=value.replace(pattern,replacement);
    if(status.textContent!==value)status.textContent=value;
  }

  function translateImportExport(){
    setText('#importExportModal .settings-dialog-head h2','יבוא / יצוא','Import / Export');
    setText('#exportData','ייצוא גיבוי מלא','Export Full Backup');
    setText('#exportSessionCsv','ייצוא סשן CSV','Export Session CSV');
    setLabelTextPreservingInput(document.querySelector('#importExportModal .file-label'),'שחזור גיבוי','Restore Backup');
    setAttr('#closeImportExport','aria-label','סגור','Close');
    setAttr('#closeImportExport','title','סגור','Close');
    setText('#sscUpdateBanner span','קיים עדכון','Update available');
    setText('#sscUpdateBanner button','עדכן עכשיו','Update now');
    translateImportStatus();
  }

  function translateShortcuts(){
    setText('#shortcutsModal [data-shortcuts-title]','קיצורי מקלדת','Keyboard shortcuts');
    setAttr('#shortcutsModal [data-shortcuts-close]','aria-label','סגור','Close');
    setAttr('#shortcutsModal [data-shortcuts-close]','title','סגור','Close');
    document.querySelectorAll('#shortcutsModal .shortcuts-grid > div').forEach(row=>{
      const key=row.querySelector('kbd')?.textContent.trim();
      const label=row.querySelector('span');
      const item=SHORTCUTS[key];
      if(label&&item)label.textContent=isHebrew()?item.he:item.en;
    });
  }

  function translateMbld(){
    const viewModal=document.getElementById('sscMbldScramblesModal');
    if(viewModal){
      setAttr('#sscMbldScramblesModal .ssc-mbld-close','aria-label','סגור','Close');
      setAttr('#sscMbldScramblesModal .ssc-mbld-close','title','סגור','Close');
      viewModal.querySelectorAll('.ssc-mbld-view-row').forEach(row=>{
        const number=row.querySelector('.ssc-mbld-view-number')?.textContent.trim();
        const preview=row.querySelector('.ssc-mbld-view-preview');
        if(preview&&number)preview.setAttribute('aria-label',pick(`תצוגת 3×3 מספר ${number}`,`3x3 preview ${number}`));
      });
    }
    const resultModal=document.getElementById('sscMbldResultModal');
    if(resultModal){
      const kicker=resultModal.querySelector('.ssc-mbld-dialog-kicker');
      if(kicker)kicker.textContent=pick('תוצאה','RESULT');
    }
    setAttr('#sscMbldCountControl [data-count-minus]','aria-label','הפחת קובייה','Decrease cube count');
    setAttr('#sscMbldCountControl [data-count-plus]','aria-label','הוסף קובייה','Increase cube count');
  }

  function translatePreviewFallbacks(){
    document.querySelectorAll('.wca-preview-unsupported').forEach(element=>{
      const text=element.textContent.trim();
      let value;
      if(/Single Face|פאה יחידה/i.test(text))value=pick('תצוגת פאה יחידה עדיין אינה מחוברת','Single Face preview is not connected yet');
      else if(/2D preview|תצוגת 2D/i.test(text))value=pick('תצוגת 2D אינה זמינה','2D preview unavailable');
      else value=pick('התצוגה אינה מוגדרת','Preview not configured');
      if(element.textContent!==value)element.textContent=value;
    });
    document.querySelectorAll('.ssc-puzzle-3d-fallback').forEach(element=>{
      const text=element.textContent.trim();
      if(/3D preview unavailable|תצוגת 3D אינה זמינה/i.test(text))element.textContent=pick('תצוגת 3D אינה זמינה','3D preview unavailable');
    });
  }

  function translatePreviewMetadata(){
    document.querySelectorAll('.cube-preview-card[data-wca-event]').forEach(card=>{
      if(card.classList.contains('ssc-preview-mode-faces'))return;
      const info=eventText(card.dataset.wcaEvent);
      if(!info)return;
      if(card.getAttribute('role')==='button'){
        card.title=pick('לחץ לפתיחת תצוגת 3D אינטראקטיבית','Click for interactive 3D view');
        card.setAttribute('aria-label',pick(`פתח תצוגת 3D אינטראקטיבית של ${info.name}`,`Open interactive 3D preview of ${info.name}`));
      }else{
        card.title=info.name;
        card.setAttribute('aria-label',pick(`תצוגת ערבוב דו־ממדית של ${info.name}`,`${info.name} 2D scramble preview`));
      }
    });

    const viewer=document.getElementById('sscPreview3DViewer');
    const title=document.getElementById('sscPreview3DTitle');
    const previewEvent=eventIdFrom(viewer?.dataset?.wcaEvent||document.getElementById('cubePreview2D')?.dataset?.wcaEvent||currentEventId());
    const info=eventText(previewEvent);
    if(title&&info)title.textContent=info.name;
  }

  function translateAll(){
    ensureTagStyle();
    translateToolbar();
    translateSettings();
    translateEvents();
    translateCoreStats();
    translateSolveDetails();
    translateAnalytics();
    translateImportExport();
    translateShortcuts();
    translateMbld();
    translatePreviewFallbacks();
    translatePreviewMetadata();
  }

  let pending=false;
  function schedule(){
    if(pending)return;
    pending=true;
    queueMicrotask(()=>{pending=false;translateAll();});
  }

  const relevantSelector=[
    '.topbar','#generalSettingsModal','#colorSettingsModal','#importExportModal','#analyticsModal','#sessionMenu',
    '#statsPrimary','#statsGrid','#historyMetricOptions','#fullHistoryModal','#solveDetailsModal','#shortcutsModal',
    '#sscMbldScramblesModal','#sscMbldResultModal','#sscMbldCountControl','#sscPreview3DModal','.cube-preview-card'
  ].join(',');

  const bodyObserver=new MutationObserver(records=>{
    for(const record of records){
      const target=record.target instanceof Element?record.target:record.target?.parentElement;
      if(target&&(target===document.body||target.matches?.(relevantSelector)||target.closest?.(relevantSelector))){schedule();return;}
      for(const node of record.addedNodes){
        if(node instanceof Element&&(node.matches?.(relevantSelector)||node.querySelector?.(relevantSelector))){schedule();return;}
      }
    }
  });
  if(document.body)bodyObserver.observe(document.body,{childList:true,subtree:true});

  new MutationObserver(schedule).observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
  window.addEventListener('ssc-event-change',schedule);
  window.addEventListener('ssc-general-settings-change',schedule);
  window.addEventListener('ssc-preview-mode-change',schedule);
  window.addEventListener('ssc-selected-faces-mode-change',schedule);
  window.addEventListener('ssc-mbld-result-saved',schedule);
  document.getElementById('languageSelect')?.addEventListener('change',()=>setTimeout(schedule,0));

  translateAll();
  window.SSCI18nComplete=Object.freeze({translate:translateAll,eventText});
})();
