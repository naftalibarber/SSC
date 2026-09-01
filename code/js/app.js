(() => {
  'use strict';

  const STORAGE_KEY='rubiksCubeTimerHistoryV1';
  const PUZZLE_KEY='rubiksCubeTimerPuzzleV1';
  const EVENT_KEY='rubiksCubeTimerEventV2';
  const HISTORY_SETTINGS_KEY='sscHistoryMetricsV1';
  const LANGUAGE_KEY='sscLanguageV1';
  const GENERAL_SETTINGS_KEY='sscGeneralSettingsV1';
  const LEGACY_SESSIONS_KEY='sscSessionsV1';
  const LEGACY_ACTIVE_SESSION_KEY='sscActiveSessionV1';
  const LEGACY_SESSIONS_BY_PUZZLE_KEY='sscSessionsByPuzzleV2';
  const LEGACY_ACTIVE_BY_PUZZLE_KEY='sscActiveSessionByPuzzleV2';
  const SESSIONS_KEY='sscSessionsByEventV3';
  const ACTIVE_SESSION_KEY='sscActiveSessionByEventV3';
  const DEFAULT_MBLD_CUBES=3;
  const INSPECTION_NORMAL_MS=15000;
  const INSPECTION_DNF_MS=17000;
  const INSPECTION_CUE_8_MS=8000;
  const INSPECTION_CUE_12_MS=12000;
  const UNDO_WINDOW_MS=8000;
  const VALID_PENALTIES=new Set(['OK','+2','DNF']);

  const METRICS=[
    {id:'best',label:'Single',type:'best'},
    {id:'mo3',label:'mo3',type:'mean',count:3},
    {id:'ao5',label:'Ao5',type:'ao',count:5},
    {id:'ao12',label:'Ao12',type:'ao',count:12},
    {id:'ao25',label:'Ao25',type:'ao',count:25},
    {id:'ao50',label:'Ao50',type:'ao',count:50},
    {id:'ao100',label:'Ao100',type:'ao',count:100},
    {id:'ao150',label:'Ao150',type:'ao',count:150},
    {id:'ao200',label:'Ao200',type:'ao',count:200},
    {id:'ao250',label:'Ao250',type:'ao',count:250},
    {id:'ao500',label:'Ao500',type:'ao',count:500},
    {id:'ao750',label:'Ao750',type:'ao',count:750},
    {id:'ao1000',label:'Ao1000',type:'ao',count:1000},
    {id:'ao1500',label:'Ao1500',type:'ao',count:1500},
    {id:'ao2000',label:'Ao2000',type:'ao',count:2000},
    {id:'ao5000',label:'Ao5000',type:'ao',count:5000}
  ];

  const I18N={
    he:{
      newScramble:'ערבוב חדש',holdHere:'החזק כאן להפעלה',timerAria:'טיימר',puzzleSelectorAria:'בחירת מקצה',historyAria:'היסטוריה וסטטיסטיקות',sessionSelectAria:'בחירת סשן',historySettingsTitle:'מה להציג בסטטיסטיקות',customAo:'Ao מותאם אישית',add:'הוסף',recentSolves:'פתרונות אחרונים',emptyHistory:'עדיין אין פתרונות שמורים.',scramble:'ערבוב',idle:'החזק Space, המתן לירוק ושחרר להתחלה',holding:'המשך להחזיק...',ready:'מוכן — שחרר להתחלה',running:'Space לעצירה',saved:'נשמר! החזק Space לפתרון הבא',addSessionPrompt:'שם לסשן החדש (אפשר להשאיר ריק לשם אוטומטי):',renameSessionPrompt:'שם חדש לסשן:',deleteSessionConfirm:'למחוק את הסשן הזה ואת כל הפתרונות שבו?',cannotDeleteLastSession:'חייב להישאר לפחות סשן אחד.',clearHistoryConfirm:'למחוק את כל הפתרונות בסשן הנוכחי?',deleteSolve:'מחק',historySettings:'הגדרות היסטוריה',addSession:'סשן חדש',renameSession:'שינוי שם סשן',deleteSession:'מחק סשן',clearHistory:'מחק היסטוריה',remove:'הסר',defaultSession:'סשן 1',languageButton:'English',generatingScramble:'יוצר ערבוב…',scrambleError:'לא ניתן ליצור ערבוב',eventSelector:'בחירת מקצה',inspection:'בדיקה — 15 שניות',inspectionHolding:'המשך להחזיק כדי להתחיל',inspectionReady:'מוכן — שחרר כדי להתחיל',inspection8:'8 שניות',inspection12:'12 שניות',inspectionPlus2:'+2',inspectionDnf:'DNF',ok:'תקין',delete:'מחיקה',penaltyEditor:'עריכת תוצאה',
      sessionMenu:'ניהול סשנים',solves:'פתרונות',mean:'ממוצע',best:'שיא',lastActivity:'פעילות אחרונה',moreStats:'סטטיסטיקות נוספות',lessStats:'פחות סטטיסטיקות',current:'נוכחי',bestSection:'שיאים',worst:'הגרוע ביותר',solveCountLabel:'מספר פתרונות',fullHistoryTitle:'כל הפתרונות',fullHistoryNotice:'הרשימה המקוצרת מציגה את 12 הפתרונות האחרונים. לצפייה בכל הפתרונות פתח את ההיסטוריה המלאה.',openFullHistory:'הצג את כל הפתרונות',focusMode:'מצב מיקוד',exitFocus:'יציאה ממיקוד',enterFullscreen:'מסך מלא',exitFullscreen:'מסך קטן',fullscreenUnavailable:'מסך מלא אינו זמין בדפדפן זה',solveDeleted:'הפתרון נמחק',undo:'ביטול',details:'פרטי פתרון',finalTime:'זמן סופי',rawTime:'זמן גולמי',penalty:'עונש',date:'תאריך',event:'מקצה',session:'סשן',copyScramble:'העתק ערבוב',repeatScramble:'חזור על הערבוב',copied:'הערבוב הועתק',newPb:'PB חדש!',keyboardShortcuts:'קיצורי מקלדת',close:'סגור',shortcutSquare1:'מעבר ל־Square-1',shortcutNxn:'מעבר ל־{n}×{n}',shortcutPyraminx:'מעבר ל־Pyraminx',shortcutMegaminx:'מעבר ל־Megaminx',shortcutBlind:'מעבר ל־3BLD',shortcutMultiBlind:'מעבר ל־MBLD',shortcutSkewb:'מעבר ל־Skewb',shortcutClock:'מעבר ל־Clock',shortcutUndo:'ביטול הפעולה האחרונה',shortcutFto:'מעבר ל־FTO',shortcutMarkDnf:'סימון הפתרון האחרון כ־DNF',shortcutMarkPlus2:'סימון הפתרון האחרון כ־+2',shortcutDeleteSolve:'מחיקת הפתרון האחרון',shortcutHelp:'עזרה לקיצורים',shortcutLanguage:'מעבר לשפה הבאה',sessionEmptyDelete:'למחוק את הסשן הריק הזה?'
    },
    en:{
      newScramble:'New scramble',holdHere:'Hold here to start',timerAria:'Timer',puzzleSelectorAria:'Event selection',historyAria:'History and statistics',sessionSelectAria:'Session selection',historySettingsTitle:'Choose statistics to display',customAo:'Custom Ao',add:'Add',recentSolves:'Recent solves',emptyHistory:'No saved solves yet.',scramble:'Scramble',idle:'Hold Space, wait for green, then release to start',holding:'Keep holding...',ready:'Ready — release to start',running:'Space to stop',saved:'Saved! Hold Space for the next solve',addSessionPrompt:'Name for the new session (leave blank for an automatic name):',renameSessionPrompt:'New session name:',deleteSessionConfirm:'Delete this session and all of its solves?',cannotDeleteLastSession:'At least one session must remain.',clearHistoryConfirm:'Delete all solves in the current session?',deleteSolve:'Delete',historySettings:'History settings',addSession:'New session',renameSession:'Rename session',deleteSession:'Delete session',clearHistory:'Clear history',remove:'Remove',defaultSession:'Session 1',languageButton:'עברית',generatingScramble:'Generating scramble…',scrambleError:'Unable to generate scramble',eventSelector:'Event selection',inspection:'15-second inspection',inspectionHolding:'Keep holding to start',inspectionReady:'Ready — release to start',inspection8:'8 seconds',inspection12:'12 seconds',inspectionPlus2:'+2',inspectionDnf:'DNF',ok:'OK',delete:'Delete',penaltyEditor:'Result penalty',
      sessionMenu:'Session manager',solves:'solves',mean:'Mean',best:'Best',lastActivity:'Last activity',moreStats:'More statistics',lessStats:'Less statistics',current:'CURRENT',bestSection:'BEST',worst:'Worst',solveCountLabel:'Solve count',fullHistoryTitle:'All solves',fullHistoryNotice:'The compact list shows the 12 most recent solves. Open the full history to view every solve.',openFullHistory:'View all solves',focusMode:'Focus Mode',exitFocus:'Exit Focus',enterFullscreen:'Full Screen',exitFullscreen:'Small Screen',fullscreenUnavailable:'Fullscreen is not available in this browser',solveDeleted:'Solve deleted',undo:'Undo',details:'Solve details',finalTime:'Final Time',rawTime:'Raw Time',penalty:'Penalty',date:'Date',event:'Event',session:'Session',copyScramble:'Copy Scramble',repeatScramble:'Repeat Scramble',copied:'Scramble copied',newPb:'NEW PB',keyboardShortcuts:'Keyboard shortcuts',close:'Close',shortcutSquare1:'Switch to Square-1',shortcutNxn:'Switch to {n}×{n}',shortcutPyraminx:'Switch to Pyraminx',shortcutMegaminx:'Switch to Megaminx',shortcutBlind:'Switch to 3BLD',shortcutMultiBlind:'Switch to MBLD',shortcutSkewb:'Switch to Skewb',shortcutClock:'Switch to Clock',shortcutUndo:'Undo the last action',shortcutFto:'Switch to FTO',shortcutMarkDnf:'Mark the latest solve DNF',shortcutMarkPlus2:'Mark the latest solve +2',shortcutDeleteSolve:'Delete the latest solve',shortcutHelp:'Shortcuts help',shortcutLanguage:'Switch to the next language',sessionEmptyDelete:'Delete this empty session?'
    }
  };

  const els={
    timer:document.getElementById('timer'),status:document.getElementById('status'),scramble:document.getElementById('scramble'),touchTimer:document.getElementById('touchTimer'),
    historyList:document.getElementById('historyList'),emptyHistory:document.getElementById('emptyHistory'),solveCount:document.getElementById('solveCount'),scrambleLabel:document.getElementById('scrambleLabel'),
    statsGrid:document.getElementById('statsGrid'),historySettings:document.getElementById('historySettings'),historySettingsButton:document.getElementById('historySettingsButton'),historyMetricOptions:document.getElementById('historyMetricOptions'),
    customAoInput:document.getElementById('customAoInput'),addCustomAo:document.getElementById('addCustomAo'),sessionSelect:document.getElementById('sessionSelect'),addSession:document.getElementById('addSession'),deleteSession:document.getElementById('deleteSession'),
    languageToggle:document.getElementById('languageToggle'),cubePreview2D:document.getElementById('cubePreview2D'),eventSelect:document.getElementById('eventSelect'),quickAo5:document.getElementById('quickAo5'),quickAo12:document.getElementById('quickAo12')
  };

  let currentLanguage=localStorage.getItem(LANGUAGE_KEY)==='en'?'en':'he';
  let timePrecision=readTimePrecision();
  let rawHistoryCache=null;
  let historyRevision=0;
  let sessionHistoryCache={key:'',value:[]};
  const statsCache=new Map();
  let statsExpanded=false;
  let lastDeletedSolve=null;
  let undoTimer=null;
  let solveDetailsId=null;
  const shortcutKeysDown=new Set();
  let pendingMegaminxShortcut=false;

  function t(key){return I18N[currentLanguage]?.[key]||key;}
  function normalizeEventId(value){return window.SSCScrambles?.normalizeEventId?.(value)||null;}
  function eventFor(value){return window.SSCScrambles?.getEvent?.(value)||null;}
  function legacyPuzzleForEvent(eventId){return eventId==='222'?'2x2':eventId==='333'?'3x3':eventId;}
  function eventIdForLegacyPuzzle(puzzle){return normalizeEventId(puzzle)||'333';}
  function formatTime(ms){return Number.isFinite(ms)?(ms/1000).toFixed(timePrecision):'DNF';}
  function formatRawSeconds(ms){return Number.isFinite(ms)?Number((ms/1000).toFixed(3)):null;}
  function normalizePenalty(value){return VALID_PENALTIES.has(value)?value:'OK';}
  function getInspectionPenalty(elapsedMs){if(elapsedMs>INSPECTION_DNF_MS)return'DNF';if(elapsedMs>INSPECTION_NORMAL_MS)return'+2';return'OK';}
  function isInspectionState(state){return state==='inspection'||state==='inspection-holding'||state==='inspection-ready';}
  function isEditableTarget(target){return Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"]'));}
  function formatDate(value,withDate=false){
    const date=new Date(value);if(Number.isNaN(date.getTime()))return'—';
    const locale=currentLanguage==='he'?'he-IL':'en-US';
    return withDate?date.toLocaleString(locale,{dateStyle:'medium',timeStyle:'short'}):date.toLocaleString(locale,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  }

  function readGeneralSettings(){
    try{const parsed=JSON.parse(localStorage.getItem(GENERAL_SETTINGS_KEY));return{mode:Boolean(parsed?.competitionMode),inspection:parsed?.competitionInspection!==false};}
    catch{return{mode:false,inspection:true};}
  }
  function readTimePrecision(){
    try{return Number(JSON.parse(localStorage.getItem(GENERAL_SETTINGS_KEY))?.timePrecision)===2?2:3;}
    catch{return 3;}
  }
  let competitionSettings=readGeneralSettings();

  function normalizeSolve(solve){
    const legacyPuzzle=solve?.puzzle||'3x3';
    const fallbackEvent=eventIdForLegacyPuzzle(legacyPuzzle);
    const eventId=normalizeEventId(solve?.eventId||solve?.event||fallbackEvent)||fallbackEvent;
    const event=eventFor(eventId);
    const rawTimeMs=Number.isFinite(Number(solve?.rawTimeMs))?Number(solve.rawTimeMs):Number.isFinite(Number(solve?.timeMs))?Number(solve.timeMs):Number.isFinite(Number(solve?.rawTime))?Number(solve.rawTime)*1000:0;
    const penalty=normalizePenalty(solve?.penalty);
    const finalTimeMs=penalty==='DNF'?null:rawTimeMs+(penalty==='+2'?2000:0);
    const sessionId=solve?.sessionId||solve?.session||'session-1';
    const createdAt=solve?.createdAt||solve?.date||new Date().toISOString();
    return{...solve,timeMs:rawTimeMs,rawTimeMs,rawTime:formatRawSeconds(rawTimeMs),penalty,finalTimeMs,finalTime:finalTimeMs===null?null:formatRawSeconds(finalTimeMs),puzzle:legacyPuzzle,eventId,event:solve?.event||eventId,puzzleId:solve?.puzzleId||event?.puzzle||legacyPuzzle,sessionId,session:solve?.session||sessionId,createdAt,date:solve?.date||createdAt};
  }

  function getRawHistory(){
    if(rawHistoryCache!==null)return rawHistoryCache;
    try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY));rawHistoryCache=Array.isArray(parsed)?parsed:[];}
    catch{rawHistoryCache=[];}
    return rawHistoryCache;
  }
  function setHistory(history){
    rawHistoryCache=Array.isArray(history)?history:[];historyRevision+=1;sessionHistoryCache={key:'',value:[]};statsCache.clear();
    localStorage.setItem(STORAGE_KEY,JSON.stringify(rawHistoryCache));
  }
  function getEffectiveTime(solve){const normalized=normalizeSolve(solve);if(normalized.penalty==='DNF')return Infinity;return normalized.rawTimeMs+(normalized.penalty==='+2'?2000:0);}
  function withPenaltyFields(solve,penalty){
    const normalized=normalizeSolve(solve);const nextPenalty=normalizePenalty(penalty);const finalTimeMs=nextPenalty==='DNF'?null:normalized.rawTimeMs+(nextPenalty==='+2'?2000:0);
    return{...solve,timeMs:normalized.rawTimeMs,rawTimeMs:normalized.rawTimeMs,rawTime:formatRawSeconds(normalized.rawTimeMs),penalty:nextPenalty,finalTimeMs,finalTime:finalTimeMs===null?null:formatRawSeconds(finalTimeMs)};
  }
  function readObject(key){try{const value=JSON.parse(localStorage.getItem(key));return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}catch{return null;}}

  function inferSessionCreatedAt(sessionId,eventId){
    let oldest=null;
    for(const raw of getRawHistory()){
      const solve=normalizeSolve(raw);if(solve.eventId!==eventId||solve.sessionId!==sessionId)continue;
      const time=new Date(solve.createdAt).getTime();if(Number.isFinite(time)&&(oldest===null||time<oldest))oldest=time;
    }
    return oldest===null?new Date().toISOString():new Date(oldest).toISOString();
  }
  function inferSessionUpdatedAt(sessionId,eventId,createdAt){
    let latest=new Date(createdAt).getTime();
    for(const raw of getRawHistory()){
      const solve=normalizeSolve(raw);if(solve.eventId!==eventId||solve.sessionId!==sessionId)continue;
      const time=new Date(solve.createdAt).getTime();if(Number.isFinite(time)&&time>latest)latest=time;
    }
    return new Date(latest).toISOString();
  }
  function normalizeSession(session,index,eventId){
    const id=session?.id||`${eventId}-session-${index+1}`;
    const createdAt=session?.createdAt||inferSessionCreatedAt(id,eventId);
    return{...session,id,name:String(session?.name||`${eventFor(eventId)?.label||eventId.toUpperCase()} ${currentLanguage==='he'?'סשן':'Session'} ${index+1}`),event:session?.event||eventId,createdAt,updatedAt:session?.updatedAt||inferSessionUpdatedAt(id,eventId,createdAt)};
  }
  function defaultSession(eventId='333'){const createdAt=new Date().toISOString();return{id:'session-1',name:I18N.he.defaultSession,event:eventId,createdAt,updatedAt:createdAt};}
  function cloneSessions(value,eventId){return Array.isArray(value)&&value.length?value.map((session,index)=>normalizeSession({...session},index,eventId)):[defaultSession(eventId)];}

  function getSessionsByEvent(){
    const existing=readObject(SESSIONS_KEY);
    if(existing){
      const normalized={};Object.entries(existing).forEach(([eventId,value])=>{normalized[eventId]=cloneSessions(value,eventId);});
      localStorage.setItem(SESSIONS_KEY,JSON.stringify(normalized));return normalized;
    }
    const migrated={};const byPuzzle=readObject(LEGACY_SESSIONS_BY_PUZZLE_KEY);let legacySessions=null;
    try{const parsed=JSON.parse(localStorage.getItem(LEGACY_SESSIONS_KEY));if(Array.isArray(parsed)&&parsed.length)legacySessions=parsed;}catch{}
    if(byPuzzle?.['2x2'])migrated['222']=cloneSessions(byPuzzle['2x2'],'222');else if(legacySessions)migrated['222']=cloneSessions(legacySessions,'222');
    if(byPuzzle?.['3x3'])migrated['333']=cloneSessions(byPuzzle['3x3'],'333');else if(legacySessions)migrated['333']=cloneSessions(legacySessions,'333');
    if(!migrated['222'])migrated['222']=[defaultSession('222')];if(!migrated['333'])migrated['333']=[defaultSession('333')];
    localStorage.setItem(SESSIONS_KEY,JSON.stringify(migrated));return migrated;
  }
  function getActiveSessions(){
    const existing=readObject(ACTIVE_SESSION_KEY);if(existing)return existing;
    const migrated={};const byPuzzle=readObject(LEGACY_ACTIVE_BY_PUZZLE_KEY);const legacy=localStorage.getItem(LEGACY_ACTIVE_SESSION_KEY)||null;
    migrated['222']=byPuzzle?.['2x2']||legacy;migrated['333']=byPuzzle?.['3x3']||legacy;localStorage.setItem(ACTIVE_SESSION_KEY,JSON.stringify(migrated));return migrated;
  }

  const storedEvent=normalizeEventId(localStorage.getItem(EVENT_KEY));
  const legacyEvent=eventIdForLegacyPuzzle(localStorage.getItem(PUZZLE_KEY)==='2x2'?'2x2':'3x3');
  let currentEvent=storedEvent||legacyEvent||'333';
  let currentPuzzle=legacyPuzzleForEvent(currentEvent);
  let sessionsByEvent=getSessionsByEvent();
  let activeSessionByEvent=getActiveSessions();
  let sessions=sessionsByEvent[currentEvent];
  let currentSessionId=null;
  let currentScramble='';
  let scrambleRequestId=0;

  function saveSessions(){sessionsByEvent[currentEvent]=sessions;localStorage.setItem(SESSIONS_KEY,JSON.stringify(sessionsByEvent));}
  function saveActiveSession(){activeSessionByEvent[currentEvent]=currentSessionId;localStorage.setItem(ACTIVE_SESSION_KEY,JSON.stringify(activeSessionByEvent));}
  function ensureCurrentSession(){
    sessions=sessionsByEvent[currentEvent];
    if(!Array.isArray(sessions)||!sessions.length){sessions=[defaultSession(currentEvent)];sessionsByEvent[currentEvent]=sessions;saveSessions();}
    sessions=sessions.map((session,index)=>normalizeSession(session,index,currentEvent));sessionsByEvent[currentEvent]=sessions;
    currentSessionId=activeSessionByEvent[currentEvent];if(!sessions.some(session=>session.id===currentSessionId))currentSessionId=sessions[0].id;saveSessions();saveActiveSession();
  }
  function currentSessionHistory(){
    const key=`${historyRevision}:${currentEvent}:${currentSessionId}`;if(sessionHistoryCache.key===key)return sessionHistoryCache.value;
    const value=[];for(const raw of getRawHistory()){const solve=normalizeSolve(raw);if(solve.eventId===currentEvent&&solve.sessionId===currentSessionId&&!solve.practice&&!solve.training)value.push(solve);}
    sessionHistoryCache={key,value};return value;
  }
  function sessionHistory(eventId,sessionId){
    if(eventId===currentEvent&&sessionId===currentSessionId)return currentSessionHistory();
    const result=[];for(const raw of getRawHistory()){const solve=normalizeSolve(raw);if(solve.eventId===eventId&&solve.sessionId===sessionId&&!solve.practice&&!solve.training)result.push(solve);}return result;
  }
  function getSessionSnapshot(session,eventId=currentEvent){return{...session,event:eventId,solves:sessionHistory(eventId,session.id)};}
  function touchCurrentSession(){const session=sessions.find(item=>item.id===currentSessionId);if(session){session.updatedAt=new Date().toISOString();saveSessions();}}
  function automaticSessionName(){const label=eventFor(currentEvent)?.label||currentEvent.toUpperCase();return`${label} ${currentLanguage==='he'?'סשן':'Session'} ${sessions.length+1}`;}
  function createSession(name){
    const id=(crypto.randomUUID?crypto.randomUUID():`${currentEvent}-session-${Date.now()}-${Math.random()}`);const now=new Date().toISOString();
    sessions.push({id,name:String(name||'').trim()||automaticSessionName(),event:currentEvent,createdAt:now,updatedAt:now});saveSessions();currentSessionId=id;saveActiveSession();renderSessionSelect();renderSessionMenu();renderHistory();
  }
  function renameCurrentSession(){
    const session=sessions.find(item=>item.id===currentSessionId);if(!session)return;const next=prompt(t('renameSessionPrompt'),session.name);if(next===null||!next.trim())return;session.name=next.trim();session.updatedAt=new Date().toISOString();saveSessions();renderSessionSelect();renderSessionMenu();renderHistory();
  }
  function deleteCurrentSession(){
    if(sessions.length<=1){alert(t('cannotDeleteLastSession'));return;}
    const count=currentSessionHistory().length;if(count>0&&!confirm(t('deleteSessionConfirm')))return;
    setHistory(getRawHistory().filter(raw=>{const solve=normalizeSolve(raw);return!(solve.eventId===currentEvent&&solve.sessionId===currentSessionId);}));
    sessions=sessions.filter(session=>session.id!==currentSessionId);sessionsByEvent[currentEvent]=sessions;saveSessions();currentSessionId=[...sessions].sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt))[0]?.id||sessions[0].id;saveActiveSession();renderSessionSelect();renderSessionMenu();renderHistory();
  }
  function switchSession(id){if(!sessions.some(session=>session.id===id))return false;currentSessionId=id;saveActiveSession();sessionHistoryCache={key:'',value:[]};renderSessionSelect();renderSessionMenu();renderHistory();return true;}

  function getMetricSettings(){const fallback={selected:['best','mo3','ao5','ao12'],custom:[]};try{const parsed=JSON.parse(localStorage.getItem(HISTORY_SETTINGS_KEY));if(!parsed||!Array.isArray(parsed.selected)||!Array.isArray(parsed.custom))return fallback;return{selected:parsed.selected,custom:parsed.custom.filter(n=>Number.isInteger(n)&&n>=3&&n<=100000)};}catch{return fallback;}}
  function saveMetricSettings(settings){localStorage.setItem(HISTORY_SETTINGS_KEY,JSON.stringify(settings));}
  let metricSettings=getMetricSettings();

  function mean(values,count=values.length){if(values.length<count)return null;const sample=values.slice(0,count);if(sample.some(value=>!Number.isFinite(value)))return Infinity;return sample.reduce((a,b)=>a+b,0)/sample.length;}
  function trimmedAverage(values,count){
    if(values.length<count)return null;if(count<5)return mean(values,count);
    const sample=values.slice(0,count);const sorted=[...sample].sort((a,b)=>a-b);const trim=Math.ceil(count*.05);const trimmed=sorted.slice(trim,sorted.length-trim);
    if(!trimmed.length)return null;if(trimmed.some(value=>!Number.isFinite(value)))return Infinity;return trimmed.reduce((a,b)=>a+b,0)/trimmed.length;
  }
  function finiteMinimum(values){let best=null;for(const value of values){if(value<Infinity&&(best===null||value<best))best=value;}return best;}
  function metricCurrent(metric,values){if(!values.length)return null;if(metric.type==='best')return finiteMinimum(values);if(metric.type==='mean')return mean(values,metric.count);return trimmedAverage(values,metric.count);}
  function lowerBound(sorted,value){let low=0,high=sorted.length;while(low<high){const mid=(low+high)>>1;if(sorted[mid]<value)low=mid+1;else high=mid;}return low;}
  function insertSorted(sorted,value){sorted.splice(lowerBound(sorted,value),0,value);}
  function removeSorted(sorted,value){const index=lowerBound(sorted,value);if(index<sorted.length)sorted.splice(index,1);}
  function averageSortedWindow(sorted,count){if(count<5){let total=0;for(const value of sorted){if(!Number.isFinite(value))return Infinity;total+=value;}return total/count;}const trim=Math.ceil(count*.05);let total=0;for(let i=trim;i<count-trim;i++){const value=sorted[i];if(!Number.isFinite(value))return Infinity;total+=value;}return total/(count-(trim*2));}
  function metricBest(metric,values){
    if(!values.length)return null;if(metric.type==='best')return finiteMinimum(values);const count=metric.count;if(values.length<count)return null;
    if(metric.type==='mean'){let sum=0,dnfs=0;for(let i=0;i<count;i++){if(Number.isFinite(values[i]))sum+=values[i];else dnfs+=1;}let best=dnfs?Infinity:sum/count;for(let i=count;i<values.length;i++){const outgoing=values[i-count],incoming=values[i];if(Number.isFinite(outgoing))sum-=outgoing;else dnfs-=1;if(Number.isFinite(incoming))sum+=incoming;else dnfs+=1;const current=dnfs?Infinity:sum/count;if(current<best)best=current;}return best;}
    const sorted=values.slice(0,count).sort((a,b)=>a-b);let best=averageSortedWindow(sorted,count);for(let i=count;i<values.length;i++){removeSorted(sorted,values[i-count]);insertSorted(sorted,values[i]);const current=averageSortedWindow(sorted,count);if(current<best)best=current;}return best;
  }
  function fixedStats(history){
    const key=`${historyRevision}:${currentEvent}:${currentSessionId}`;if(statsCache.has(key))return statsCache.get(key);
    const values=history.map(getEffectiveTime);const finite=values.filter(Number.isFinite);const result={values,count:values.length,bestSingle:finite.length?Math.min(...finite):null,worst:values.some(v=>!Number.isFinite(v))?Infinity:(finite.length?Math.max(...finite):null),mean:values.length?mean(values):null,current:{},best:{}};
    [5,12,50,100].forEach(count=>{result.current[count]=trimmedAverage(values,count);result.best[count]=metricBest({type:'ao',count},values);});statsCache.set(key,result);return result;
  }
  function valueText(value){return value===null?'—':formatTime(value);}
  function showPbToast(){const toast=document.getElementById('pbToast');if(!toast)return;toast.textContent=t('newPb');toast.hidden=false;clearTimeout(showPbToast.timer);showPbToast.timer=setTimeout(()=>{toast.hidden=true;},1800);}
  function detectNewPb(before,after){
    if(!before||!after)return false;if(after.bestSingle!==null&&(before.bestSingle===null||after.bestSingle<before.bestSingle))return true;
    return[5,12,50,100].some(count=>after.best[count]!==null&&(before.best[count]===null||after.best[count]<before.best[count]));
  }

  function addSolve(timeMs,scramble,penalty='OK'){
    const before=fixedStats(currentSessionHistory());const history=[...getRawHistory()];const event=eventFor(currentEvent);const createdAt=new Date().toISOString();const rawTimeMs=Math.round(timeMs);
    const base={id:(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`),timeMs:rawTimeMs,rawTimeMs,rawTime:formatRawSeconds(rawTimeMs),penalty:normalizePenalty(penalty),scramble,puzzle:legacyPuzzleForEvent(currentEvent),eventId:currentEvent,event:currentEvent,puzzleId:event?.puzzle||currentEvent,sessionId:currentSessionId,session:currentSessionId,createdAt,date:createdAt};
    const saved=withPenaltyFields(base,base.penalty);history.unshift(saved);setHistory(history);touchCurrentSession();const after=fixedStats(currentSessionHistory());if(detectNewPb(before,after))showPbToast();return base.id;
  }
  function applyPenalty(id,penalty){
    const before=fixedStats(currentSessionHistory());const history=[...getRawHistory()];const index=history.findIndex(solve=>solve?.id===id);if(index<0)return false;
    history[index]=withPenaltyFields(history[index],penalty);setHistory(history);touchCurrentSession();const after=fixedStats(currentSessionHistory());if(detectNewPb(before,after))showPbToast();return true;
  }
  function clearUndo(){lastDeletedSolve=null;clearTimeout(undoTimer);undoTimer=null;const toast=document.getElementById('undoToast');if(toast)toast.hidden=true;}
  function showUndo(){
    const toast=document.getElementById('undoToast');if(!toast)return;toast.querySelector('[data-undo-text]').textContent=t('solveDeleted');toast.querySelector('[data-undo-action]').textContent=t('undo');toast.hidden=false;
    clearTimeout(undoTimer);undoTimer=setTimeout(clearUndo,UNDO_WINDOW_MS);
  }
  function deleteSolve(id){
    const history=[...getRawHistory()];const index=history.findIndex(solve=>solve?.id===id);if(index<0)return false;lastDeletedSolve={solve:history[index],index,expiresAt:Date.now()+UNDO_WINDOW_MS};history.splice(index,1);setHistory(history);touchCurrentSession();showUndo();return true;
  }
  function undoDelete(){
    if(!lastDeletedSolve||Date.now()>lastDeletedSolve.expiresAt){clearUndo();return false;}
    const history=[...getRawHistory()];if(history.some(solve=>solve?.id===lastDeletedSolve.solve?.id)){clearUndo();return false;}
    const index=Math.min(Math.max(0,lastDeletedSolve.index),history.length);history.splice(index,0,lastDeletedSolve.solve);setHistory(history);touchCurrentSession();clearUndo();renderHistory();return true;
  }

  function ensureAdvancedUi(){
    if(!document.getElementById('sscAppEnhancementStyles')){const link=document.createElement('link');link.id='sscAppEnhancementStyles';link.rel='stylesheet';link.href='./code/css/app-enhancements.css?v=20260901-fullscreen-1';document.head.appendChild(link);}
    const toolbar=document.querySelector('.topbar-start');
    if(toolbar&&!document.getElementById('focusModeButton')){const button=document.createElement('button');button.id='focusModeButton';button.className='toolbar-button';button.type='button';button.innerHTML='<svg data-toolbar-icon="focus-crosshair" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg><span>FOCUS</span>';toolbar.appendChild(button);}
    if(toolbar&&!document.getElementById('fullscreenButton')){const button=document.createElement('button');button.id='fullscreenButton';button.className='toolbar-button';button.type='button';button.setAttribute('aria-pressed','false');button.innerHTML='<svg data-toolbar-icon="fullscreen-enter" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/></svg><svg data-toolbar-icon="fullscreen-exit" viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 8h5V3M21 8h-5V3M3 16h5v5M21 16h-5v5"/></svg><span data-fullscreen-label></span>';toolbar.appendChild(button);}
    const sessionToolbar=document.querySelector('.session-toolbar');
    if(sessionToolbar&&!document.getElementById('sessionMenuButton')){const button=document.createElement('button');button.id='sessionMenuButton';button.className='icon-btn';button.type='button';button.setAttribute('aria-haspopup','true');button.textContent='⋯';sessionToolbar.appendChild(button);const menu=document.createElement('div');menu.id='sessionMenu';menu.className='session-menu';menu.hidden=true;sessionToolbar.appendChild(menu);}
    const statsSection=document.querySelector('.stats-section');
    if(statsSection&&!document.getElementById('statsPrimary')){const primary=document.createElement('div');primary.id='statsPrimary';primary.className='stats-primary';statsSection.insertBefore(primary,els.statsGrid);const more=document.createElement('button');more.id='moreStatsButton';more.className='more-stats-button';more.type='button';statsSection.appendChild(more);}
    if(statsSection&&!document.getElementById('fullHistoryNotice')){const notice=document.createElement('div');notice.id='fullHistoryNotice';notice.className='full-history-notice';notice.hidden=true;notice.innerHTML='<p data-full-history-notice></p><button id="fullHistoryButton" type="button" aria-haspopup="dialog" aria-controls="fullHistoryModal" data-full-history-open></button>';statsSection.appendChild(notice);}
    if(!document.getElementById('focusControls')){const controls=document.createElement('div');controls.id='focusControls';controls.className='focus-controls';controls.innerHTML='<button type="button" data-focus-exit></button>';document.body.appendChild(controls);}
    if(!document.getElementById('undoToast')){const toast=document.createElement('div');toast.id='undoToast';toast.className='ssc-toast undo-toast';toast.hidden=true;toast.innerHTML='<span data-undo-text></span><button type="button" data-undo-action></button>';document.body.appendChild(toast);}
    if(!document.getElementById('pbToast')){const toast=document.createElement('div');toast.id='pbToast';toast.className='ssc-toast pb-toast';toast.hidden=true;document.body.appendChild(toast);}
    if(!document.getElementById('solveDetailsModal')){const modal=document.createElement('div');modal.id='solveDetailsModal';modal.className='settings-modal solve-details-modal';modal.hidden=true;modal.innerHTML='<div class="settings-backdrop" data-solve-close></div><section class="settings-dialog"><div class="settings-dialog-head"><h2 data-solve-title></h2><button class="modal-close" data-solve-close type="button">×</button></div><div class="solve-details-grid"></div><div class="solve-details-actions"><button type="button" data-copy-scramble></button><button type="button" data-repeat-scramble></button></div></section>';document.body.appendChild(modal);}
    if(!document.getElementById('fullHistoryModal')){const modal=document.createElement('div');modal.id='fullHistoryModal';modal.className='settings-modal full-history-modal';modal.hidden=true;modal.innerHTML='<div class="settings-backdrop" data-full-history-close></div><section class="settings-dialog full-history-dialog" role="dialog" aria-modal="true" aria-labelledby="fullHistoryTitle"><div class="settings-dialog-head"><h2 id="fullHistoryTitle" data-full-history-title></h2><button class="modal-close" data-full-history-close type="button">×</button></div><div class="full-history-summary"><span data-full-history-session></span><strong data-full-history-count></strong></div><div class="full-history-list" role="list"></div><div class="full-history-empty" hidden></div></section>';document.body.appendChild(modal);}
    if(!document.getElementById('shortcutsModal')){const modal=document.createElement('div');modal.id='shortcutsModal';modal.className='settings-modal shortcuts-modal';modal.hidden=true;modal.innerHTML='<div class="settings-backdrop" data-shortcuts-close></div><section class="settings-dialog"><div class="settings-dialog-head"><h2 data-shortcuts-title></h2><button class="modal-close" data-shortcuts-close type="button">×</button></div><div class="shortcuts-grid"></div></section>';document.body.appendChild(modal);}
    const generalGrid=document.querySelector('.general-settings-grid');if(generalGrid&&!document.getElementById('keyboardShortcutsButton')){const row=document.createElement('div');row.className='general-setting-row';row.innerHTML='<span data-shortcuts-setting-label></span><button id="keyboardShortcutsButton" class="settings-inline-button" type="button">?</button>';generalGrid.appendChild(row);}
  }

  function sessionDisplayName(session){
    const name=String(session?.name||'');
    if(session?.id==='session-1'&&(name===I18N.he.defaultSession||name===I18N.en.defaultSession))return t('defaultSession');
    return name;
  }
  function renderSessionSelect(){
    els.sessionSelect.innerHTML='';sessions.forEach(session=>{const option=document.createElement('option');option.value=session.id;option.textContent=sessionDisplayName(session);option.selected=session.id===currentSessionId;els.sessionSelect.appendChild(option);});
  }
  function sessionSummary(session){
    const history=sessionHistory(currentEvent,session.id);const stats=fixedStatsFor(history,`${historyRevision}:${currentEvent}:${session.id}`);return{count:history.length,mean:stats.mean,best:stats.bestSingle,last:session.updatedAt||session.createdAt};
  }
  function fixedStatsFor(history,key){
    const cacheKey=`session:${key}`;if(statsCache.has(cacheKey))return statsCache.get(cacheKey);const values=history.map(getEffectiveTime);const finite=values.filter(Number.isFinite);const result={mean:values.length?mean(values):null,bestSingle:finite.length?Math.min(...finite):null};statsCache.set(cacheKey,result);return result;
  }
  function renderSessionMenu(){
    const menu=document.getElementById('sessionMenu');if(!menu)return;menu.innerHTML='';const head=document.createElement('div');head.className='session-menu-head';head.textContent=t('sessionMenu');menu.appendChild(head);
    sessions.forEach(session=>{const summary=sessionSummary(session);const row=document.createElement('button');row.type='button';row.className=`session-menu-row${session.id===currentSessionId?' active':''}`;row.dataset.sessionId=session.id;row.innerHTML=`<strong></strong><span>${eventFor(currentEvent)?.label||currentEvent.toUpperCase()} · ${summary.count} ${t('solves')}</span><span>${t('mean')}: ${valueText(summary.mean)} · ${t('best')}: ${valueText(summary.best)}</span><small>${t('lastActivity')}: ${formatDate(summary.last)}</small>`;row.querySelector('strong').textContent=sessionDisplayName(session);row.addEventListener('click',()=>{switchSession(session.id);menu.hidden=true;});menu.appendChild(row);});
    const actions=document.createElement('div');actions.className='session-menu-actions';actions.innerHTML='<button type="button" data-session-new></button><button type="button" data-session-rename></button><button type="button" data-session-delete></button>';actions.querySelector('[data-session-new]').textContent=`+ ${t('addSession')}`;actions.querySelector('[data-session-rename]').textContent=t('renameSession');actions.querySelector('[data-session-delete]').textContent=t('deleteSession');actions.querySelector('[data-session-new]').addEventListener('click',()=>document.getElementById('addSession').click());actions.querySelector('[data-session-rename]').addEventListener('click',()=>{renameCurrentSession();menu.hidden=true;});actions.querySelector('[data-session-delete]').addEventListener('click',()=>{deleteCurrentSession();menu.hidden=true;});menu.appendChild(actions);
  }

  function renderMetricSettings(){
    els.historyMetricOptions.innerHTML='';const all=[...METRICS,...metricSettings.custom.map(count=>({id:`custom-${count}`,label:`Ao${count}`,type:'ao',count,custom:true}))];
    all.forEach(metric=>{const item=document.createElement('label');item.className='metric-option';const checked=metricSettings.selected.includes(metric.id);item.innerHTML=`<input type="checkbox" ${checked?'checked':''}><span>${metric.label}</span>${metric.custom?`<button class="remove-custom" type="button" title="${t('remove')}">×</button>`:''}`;const checkbox=item.querySelector('input');checkbox.addEventListener('change',()=>{if(checkbox.checked){if(!metricSettings.selected.includes(metric.id))metricSettings.selected.push(metric.id);}else metricSettings.selected=metricSettings.selected.filter(id=>id!==metric.id);saveMetricSettings(metricSettings);renderStats();});const remove=item.querySelector('.remove-custom');if(remove)remove.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();metricSettings.custom=metricSettings.custom.filter(n=>n!==metric.count);metricSettings.selected=metricSettings.selected.filter(id=>id!==metric.id);saveMetricSettings(metricSettings);renderMetricSettings();renderStats();});els.historyMetricOptions.appendChild(item);});
  }

  function renderStats(){
    const history=currentSessionHistory();const stats=fixedStats(history);if(els.quickAo5)els.quickAo5.textContent=valueText(stats.current[5]);if(els.quickAo12)els.quickAo12.textContent=valueText(stats.current[12]);
    const primary=document.getElementById('statsPrimary');if(primary){primary.innerHTML=`<div class="stats-group"><span class="stats-group-title">${t('bestSection')}</span><div><span>Single</span><strong>${valueText(stats.bestSingle)}</strong></div><div><span>Ao5</span><strong>${valueText(stats.best[5])}</strong></div><div><span>Ao12</span><strong>${valueText(stats.best[12])}</strong></div></div><div class="stats-group"><span class="stats-group-title">${t('current')}</span><div><span>Ao5</span><strong>${valueText(stats.current[5])}</strong></div><div><span>Ao12</span><strong>${valueText(stats.current[12])}</strong></div></div>`;}
    const more=document.getElementById('moreStatsButton');if(more)more.textContent=statsExpanded?t('lessStats'):t('moreStats');
    els.statsGrid.innerHTML='';els.statsGrid.hidden=!statsExpanded;if(!statsExpanded)return;
    const fixedRows=[['Ao50',stats.current[50],stats.best[50]],['Ao100',stats.current[100],stats.best[100]],[t('mean'),stats.mean,null],[t('worst'),stats.worst,null],[t('solveCountLabel'),stats.count,null]];
    const header=document.createElement('div');header.className='stats-table-header';header.innerHTML=`<span>${currentLanguage==='he'?'מדד':'STAT'}</span><span>${t('current')}</span><span>${t('best')}</span>`;els.statsGrid.appendChild(header);
    fixedRows.forEach(([label,current,best])=>{const row=document.createElement('div');row.className='stat';const currentText=label===t('solveCountLabel')?String(current):valueText(current);row.innerHTML=`<span class="stat-label"></span><strong class="stat-current">${currentText}</strong><strong class="stat-best">${best===null?'—':valueText(best)}</strong>`;row.querySelector('.stat-label').textContent=label;els.statsGrid.appendChild(row);});
    const customMetrics=metricSettings.custom.map(count=>({id:`custom-${count}`,label:`Ao${count}`,type:'ao',count,custom:true}));const all=[...METRICS,...customMetrics].filter(metric=>metricSettings.selected.includes(metric.id)&&!['best','ao5','ao12','ao50','ao100'].includes(metric.id));
    all.forEach(metric=>{const current=metricCurrent(metric,stats.values);const best=metricBest(metric,stats.values);const row=document.createElement('div');row.className='stat optional-stat';row.innerHTML=`<span class="stat-label">${metric.label}</span><strong class="stat-current">${valueText(current)}</strong><strong class="stat-best">${valueText(best)}</strong>`;els.statsGrid.appendChild(row);});
  }

  function solveDisplay(solve){const raw=formatTime(solve.rawTimeMs);if(solve.penalty==='DNF')return`<span class="solve-result-dnf">DNF</span> <span class="solve-raw">(${raw})</span>`;if(solve.penalty==='+2')return`${formatTime(getEffectiveTime(solve))} <span class="solve-penalty-label">(+2)</span>`;return raw;}
  function renderSolveActions(solve){return`<div class="penalty-actions solve-actions" role="group" aria-label="${t('penaltyEditor')}"><button type="button" data-penalty="OK" class="${solve.penalty==='OK'?'active':''}">${t('ok')}</button><button type="button" data-penalty="+2" class="${solve.penalty==='+2'?'active':''}">+2</button><button type="button" data-penalty="DNF" class="${solve.penalty==='DNF'?'active':''}">DNF</button><button type="button" data-action="delete" class="penalty-delete">${t('delete')}</button></div>`;}
  function createSolveRow(solve,index,bestSingle,{fullHistory=false}={}){
    const effective=getEffectiveTime(solve);const row=document.createElement('div');row.className='solve-row enhanced-solve-row'+(fullHistory?' full-history-row':'')+(bestSingle!==null&&effective===bestSingle?' best-solve':'')+(solve.penalty!=='OK'?` penalty-${solve.penalty==='DNF'?'dnf':'plus2'}`:'');if(solve.id)row.dataset.solveId=solve.id;if(fullHistory)row.setAttribute('role','listitem');const date=new Date(solve.createdAt);const locale=currentLanguage==='he'?'he-IL':'en-US';const meta=`${date.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})} · ${solve.scramble}`;row.innerHTML=`<div class="solve-index">${index+1}</div><div class="solve-main"><div class="solve-time">${solveDisplay(solve)}</div><div class="solve-meta"></div>${renderSolveActions(solve)}</div>`;row.querySelector('.solve-meta').textContent=meta;row.querySelectorAll('[data-penalty]').forEach(button=>button.addEventListener('click',event=>{event.stopPropagation();if(applyPenalty(solve.id,button.dataset.penalty))renderHistory();}));row.querySelector('[data-action="delete"]').addEventListener('click',event=>{event.stopPropagation();if(deleteSolve(solve.id))renderHistory();});row.addEventListener('click',event=>{if(event.target.closest('button'))return;openSolveDetails(solve.id);});return row;
  }
  function renderFullHistory(history=currentSessionHistory(),bestSingle=null){
    const modal=document.getElementById('fullHistoryModal');if(!modal)return;const finiteTimes=history.map(getEffectiveTime).filter(Number.isFinite);const resolvedBest=bestSingle===null&&finiteTimes.length?Math.min(...finiteTimes):bestSingle;const session=sessions.find(item=>item.id===currentSessionId);const event=eventFor(currentEvent);modal.querySelector('[data-full-history-title]').textContent=t('fullHistoryTitle');const closeButton=modal.querySelector('.modal-close[data-full-history-close]');closeButton.setAttribute('aria-label',t('close'));closeButton.title=t('close');modal.querySelector('[data-full-history-session]').textContent=`${event?.label||currentEvent.toUpperCase()} · ${sessionDisplayName(session)}`;modal.querySelector('[data-full-history-count]').textContent=`${history.length} ${t('solves')}`;const list=modal.querySelector('.full-history-list');const empty=modal.querySelector('.full-history-empty');list.innerHTML='';empty.textContent=t('emptyHistory');empty.hidden=history.length>0;list.hidden=history.length===0;if(!history.length)return;const fragment=document.createDocumentFragment();history.forEach((solve,index)=>fragment.appendChild(createSolveRow(solve,index,resolvedBest,{fullHistory:true})));list.appendChild(fragment);
  }
  function openFullHistory(){const modal=document.getElementById('fullHistoryModal');if(!modal)return;renderFullHistory();modal.hidden=false;requestAnimationFrame(()=>modal.querySelector('.modal-close[data-full-history-close]')?.focus());}
  function closeFullHistory(){const modal=document.getElementById('fullHistoryModal');if(!modal||modal.hidden)return;modal.hidden=true;document.getElementById('fullHistoryButton')?.focus();}
  function renderHistory(){
    const history=currentSessionHistory();els.solveCount.textContent=history.length;renderStats();renderSessionMenu();const notice=document.getElementById('fullHistoryNotice');if(notice){notice.querySelector('[data-full-history-notice]').textContent=t('fullHistoryNotice');notice.querySelector('[data-full-history-open]').textContent=t('openFullHistory');notice.hidden=history.length<12;}const finiteTimes=history.map(getEffectiveTime).filter(Number.isFinite);const bestSingle=finiteTimes.length?Math.min(...finiteTimes):null;const modal=document.getElementById('fullHistoryModal');if(modal&&!modal.hidden)renderFullHistory(history,bestSingle);els.historyList.innerHTML='';if(!history.length){els.emptyHistory.hidden=false;els.historyList.hidden=true;return;}els.emptyHistory.hidden=true;els.historyList.hidden=false;
    history.slice(0,12).forEach((solve,index)=>els.historyList.appendChild(createSolveRow(solve,index,bestSingle)));
  }

  function multiBlindPreviewScramble(scramble){if(currentEvent!=='333mbf')return scramble;const text=String(scramble||'');const match=text.match(/^1\)\s*(.*?)(?:\s+\|\s+2\)|$)/);return match?.[1]?.trim()||text;}
  let scrambleFitFrame=0;
  function scrambleOverflows(){
    return els.scramble.scrollWidth>els.scramble.clientWidth+1||els.scramble.scrollHeight>els.scramble.clientHeight+1;
  }
  function fitScrambleText(){
    cancelAnimationFrame(scrambleFitFrame);
    scrambleFitFrame=requestAnimationFrame(()=>{
      const bar=els.scramble.closest('.scramble-bar');
      if(!bar)return;
      bar.classList.remove('scramble-expanded');
      els.scramble.style.removeProperty('font-size');
      if(!scrambleOverflows())return;
      bar.classList.add('scramble-expanded');
      if(!scrambleOverflows())return;
      const natural=parseFloat(getComputedStyle(els.scramble).fontSize)||27;
      let low=8,high=natural,best=low;
      for(let i=0;i<10;i+=1){
        const size=(low+high)/2;
        els.scramble.style.fontSize=`${size}px`;
        if(scrambleOverflows())high=size;else{best=size;low=size;}
      }
      els.scramble.style.fontSize=`${best}px`;
    });
  }
  function showScramble(scramble,eventId=currentEvent,previewScramble=scramble){const text=Array.isArray(scramble)?scramble.join(' ').trim():String(scramble||'').trim();els.scramble.dataset.scrambleTransient='false';els.scramble.dataset.eventId=eventId;els.scramble.textContent=text;fitScrambleText();window.SSCCubePreview?.render(els.cubePreview2D,previewScramble,eventId);}
  function loadScramble(scramble,eventId=currentEvent){const text=String(scramble||'').trim();if(!text||eventId!==currentEvent||timer.isBusy())return false;scrambleRequestId+=1;currentScramble=text;els.scramble.removeAttribute('aria-busy');showScramble(text,currentEvent,multiBlindPreviewScramble(text));return true;}

  function renderEventSelect(){if(!els.eventSelect)return;const events=window.SSCScrambles?.getEvents?.()||[];els.eventSelect.innerHTML='';events.forEach(event=>{const option=document.createElement('option');option.value=event.id;option.textContent=event.label||event.id.toUpperCase();option.title=event.name||event.id;els.eventSelect.appendChild(option);});els.eventSelect.value=currentEvent;els.eventSelect.setAttribute('aria-label',t('eventSelector'));}
  function updateEventUI(){const event=eventFor(currentEvent);const label=event?.label||currentEvent.toUpperCase();els.scrambleLabel.textContent=`${t('scramble')} ${label}`;if(els.eventSelect){els.eventSelect.value=currentEvent;els.eventSelect.setAttribute('aria-label',t('eventSelector'));}document.querySelectorAll('.puzzle-btn').forEach(btn=>btn.classList.toggle('active',normalizeEventId(btn.dataset.puzzle)===currentEvent));}

  function openSolveDetails(id){
    const solve=currentSessionHistory().find(item=>item.id===id);if(!solve)return;solveDetailsId=id;const modal=document.getElementById('solveDetailsModal');if(!modal)return;modal.querySelector('[data-solve-title]').textContent=t('details');const session=sessions.find(item=>item.id===solve.sessionId);const event=eventFor(solve.eventId);const rows=[[t('finalTime'),solve.penalty==='DNF'?'DNF':formatTime(getEffectiveTime(solve))],[t('rawTime'),formatTime(solve.rawTimeMs)],[t('penalty'),solve.penalty],[t('scramble'),solve.scramble],[t('date'),formatDate(solve.createdAt,true)],[t('event'),event?.label||solve.eventId],[t('session'),session?.name||solve.sessionId]];const grid=modal.querySelector('.solve-details-grid');grid.innerHTML='';rows.forEach(([label,value])=>{const row=document.createElement('div');row.className='solve-detail-row';row.innerHTML='<span></span><strong></strong>';row.querySelector('span').textContent=label;row.querySelector('strong').textContent=value;grid.appendChild(row);});modal.querySelector('[data-copy-scramble]').textContent=t('copyScramble');modal.querySelector('[data-repeat-scramble]').textContent=t('repeatScramble');modal.hidden=false;
  }
  function closeSolveDetails(){const modal=document.getElementById('solveDetailsModal');if(modal)modal.hidden=true;solveDetailsId=null;}
  async function copySolveScramble(){const solve=currentSessionHistory().find(item=>item.id===solveDetailsId);if(!solve)return;try{await navigator.clipboard.writeText(solve.scramble);}catch{const area=document.createElement('textarea');area.value=solve.scramble;document.body.appendChild(area);area.select();document.execCommand('copy');area.remove();}const button=document.querySelector('[data-copy-scramble]');if(button){const original=t('copyScramble');button.textContent=t('copied');setTimeout(()=>{button.textContent=original;},1200);}}
  function repeatSolveScramble(){const solve=currentSessionHistory().find(item=>item.id===solveDetailsId);if(solve&&loadScramble(solve.scramble,solve.eventId))closeSolveDetails();}

  function setFocusMode(enabled){document.documentElement.dataset.focusMode=enabled?'on':'off';const button=document.getElementById('focusModeButton');if(button)button.setAttribute('aria-pressed',enabled?'true':'false');}
  function isFocusMode(){return document.documentElement.dataset.focusMode==='on';}
  async function toggleFullscreen(){
    try{
      if(document.fullscreenElement){if(!document.exitFullscreen)throw new Error('Fullscreen exit is unavailable');await document.exitFullscreen();return;}
      if(!document.documentElement.requestFullscreen)throw new Error('Fullscreen entry is unavailable');
      await document.documentElement.requestFullscreen();
    }catch{alert(t('fullscreenUnavailable'));}
    finally{updateFullscreenButton();}
  }
  function updateFullscreenButton(){
    const fullscreen=Boolean(document.fullscreenElement);const label=fullscreen?t('exitFullscreen'):t('enterFullscreen');const toolbarButton=document.getElementById('fullscreenButton');
    if(toolbarButton){toolbarButton.title=label;toolbarButton.setAttribute('aria-label',label);toolbarButton.setAttribute('aria-pressed',fullscreen?'true':'false');const text=toolbarButton.querySelector('[data-fullscreen-label]');if(text)text.textContent=currentLanguage==='he'?label:(fullscreen?'SMALL SCREEN':'FULL SCREEN');}
  }
  function openShortcuts(){const modal=document.getElementById('shortcutsModal');if(!modal)return;modal.querySelector('[data-shortcuts-title]').textContent=t('keyboardShortcuts');const nxn=number=>t('shortcutNxn').replace('{n}',number);const items=[['Ctrl/Cmd + 1',t('shortcutSquare1')],['Ctrl/Cmd + 2',nxn(2)],['Ctrl/Cmd + 3',nxn(3)],['Ctrl/Cmd + 4',nxn(4)],['Ctrl/Cmd + 5',nxn(5)],['Ctrl/Cmd + 6',nxn(6)],['Ctrl/Cmd + 7',nxn(7)],['Ctrl/Cmd + P',t('shortcutPyraminx')],['Ctrl/Cmd + M',t('shortcutMegaminx')],['Ctrl/Cmd + B',t('shortcutBlind')],['Ctrl/Cmd + M + B',t('shortcutMultiBlind')],['Ctrl/Cmd + S',t('shortcutSkewb')],['Ctrl/Cmd + C',t('shortcutClock')],['Ctrl/Cmd + F',t('shortcutFto')],['Ctrl/Cmd + D',t('shortcutMarkDnf')],['Ctrl/Cmd + +',t('shortcutMarkPlus2')],['Ctrl/Cmd + N',t('shortcutDeleteSolve')],['Ctrl/Cmd + Z',t('shortcutUndo')],['Ctrl/Cmd + L',t('shortcutLanguage')],['Ctrl/Cmd + ?',t('shortcutHelp')]];const grid=modal.querySelector('.shortcuts-grid');grid.innerHTML='';items.forEach(([key,label])=>{const row=document.createElement('div');row.innerHTML='<kbd></kbd><span></span>';row.querySelector('kbd').textContent=key;row.querySelector('span').textContent=label;grid.appendChild(row);});modal.hidden=false;}
  function closeShortcuts(){const modal=document.getElementById('shortcutsModal');if(modal)modal.hidden=true;}
  function closeTransientUi(){const settings=document.getElementById('generalSettingsModal');const imp=document.getElementById('importExportModal');if(!document.getElementById('solveDetailsModal')?.hidden){closeSolveDetails();return true;}if(!document.getElementById('fullHistoryModal')?.hidden){closeFullHistory();return true;}if(!document.getElementById('shortcutsModal')?.hidden){closeShortcuts();return true;}if(settings&&!settings.hidden){settings.hidden=true;return true;}if(imp&&!imp.hidden){imp.hidden=true;return true;}const menu=document.getElementById('sessionMenu');if(menu&&!menu.hidden){menu.hidden=true;return true;}return false;}

  class TimerEngine{
    constructor({holdMs=500,onTick,onInspectionTick,onStateChange,onStop}){this.holdMs=holdMs;this.onTick=onTick;this.onInspectionTick=onInspectionTick;this.onStateChange=onStateChange;this.onStop=onStop;this.state='idle';this.holdTimeout=null;this.startTime=0;this.animationFrame=null;this.inspectionStartTime=0;this.inspectionFrame=null;this.pendingPenalty='OK';this.lastInspectionPenalty='OK';this.cue8Sent=false;this.cue12Sent=false;}
    setState(state){this.state=state;this.onStateChange?.(state);}isBusy(){return this.state!=='idle';}clearHold(){clearTimeout(this.holdTimeout);this.holdTimeout=null;}
    beginHold(fromInspection=false){const holdingState=fromInspection?'inspection-holding':'holding';const readyState=fromInspection?'inspection-ready':'ready';this.setState(holdingState);this.clearHold();this.holdTimeout=setTimeout(()=>{if(this.state===holdingState)this.setState(readyState);},this.holdMs);}
    press(){if(this.state==='running'){this.stop();return;}if(this.state==='idle'){this.beginHold(false);return;}if(this.state==='inspection'){this.beginHold(true);}}
    release(){if(this.state==='ready'){if(competitionSettings.mode&&competitionSettings.inspection)this.startInspection();else this.start();return;}if(this.state==='holding'){this.cancelHold(false);return;}if(this.state==='inspection-ready'){this.start();return;}if(this.state==='inspection-holding')this.cancelHold(true);}
    cancelHold(fromInspection){this.clearHold();if(this.state===(fromInspection?'inspection-holding':'holding'))this.setState(fromInspection?'inspection':'idle');}
    cancelArming(){
      this.clearHold();
      if(this.state==='holding'||this.state==='ready'){this.setState('idle');return true;}
      if(this.state==='inspection-holding'||this.state==='inspection-ready'){this.setState('inspection');return true;}
      return false;
    }
    startInspection(){this.clearHold();this.cancelRunFrame();this.cancelInspectionFrame();this.pendingPenalty='OK';this.lastInspectionPenalty='OK';this.inspectionStartTime=performance.now();this.cue8Sent=false;this.cue12Sent=false;this.setState('inspection');this.tickInspection();}
    tickInspection=()=>{if(!isInspectionState(this.state))return;const elapsed=performance.now()-this.inspectionStartTime;const nextPenalty=getInspectionPenalty(elapsed);if(nextPenalty!==this.lastInspectionPenalty){if(nextPenalty==='+2'||nextPenalty==='DNF')window.dispatchEvent(new CustomEvent('ssc-inspection-cue',{detail:{cue:nextPenalty,elapsedMs:elapsed}}));this.lastInspectionPenalty=nextPenalty;}this.pendingPenalty=nextPenalty;if(!this.cue8Sent&&elapsed>=INSPECTION_CUE_8_MS){this.cue8Sent=true;window.dispatchEvent(new CustomEvent('ssc-inspection-cue',{detail:{cue:'8s',elapsedMs:elapsed}}));}if(!this.cue12Sent&&elapsed>=INSPECTION_CUE_12_MS){this.cue12Sent=true;window.dispatchEvent(new CustomEvent('ssc-inspection-cue',{detail:{cue:'12s',elapsedMs:elapsed}}));}this.onInspectionTick?.(elapsed,this.pendingPenalty,{cue8:this.cue8Sent,cue12:this.cue12Sent});this.inspectionFrame=requestAnimationFrame(this.tickInspection);};
    cancelInspectionFrame(){if(this.inspectionFrame!==null)cancelAnimationFrame(this.inspectionFrame);this.inspectionFrame=null;}cancelRunFrame(){if(this.animationFrame!==null)cancelAnimationFrame(this.animationFrame);this.animationFrame=null;}
    start(){this.clearHold();if(isInspectionState(this.state)){const elapsed=Math.max(0,performance.now()-this.inspectionStartTime);this.pendingPenalty=getInspectionPenalty(elapsed);this.cancelInspectionFrame();}else this.pendingPenalty='OK';this.startTime=performance.now();this.setState('running');this.tick();}
    tick=()=>{if(this.state!=='running')return;this.onTick?.(performance.now()-this.startTime);this.animationFrame=requestAnimationFrame(this.tick);};
    stop(){if(this.state!=='running')return;const elapsed=performance.now()-this.startTime;const penalty=this.pendingPenalty;this.cancelRunFrame();this.setState('idle');this.onStop?.(elapsed,penalty);this.pendingPenalty='OK';}
    reset(){this.clearHold();this.cancelInspectionFrame();this.cancelRunFrame();this.pendingPenalty='OK';this.lastInspectionPenalty='OK';this.setState('idle');}
  }

  function statusKeyForState(state){if(state==='inspection-holding')return'inspectionHolding';if(state==='inspection-ready')return'inspectionReady';return state;}
  function setTimerState(state){els.timer.className=state==='idle'?'':state;els.status.textContent=t(statusKeyForState(state));document.documentElement.dataset.timerState=state;}
  function applyCompetitionUiState(){document.documentElement.dataset.competitionMode=competitionSettings.mode?'on':'off';renderHistory();}
  function renderInspection(elapsed,penalty){let phase='normal';let display='';let status=t('inspection');if(penalty==='DNF'){phase='dnf';display='DNF';status=t('inspectionDnf');}else if(penalty==='+2'){phase='penalty';display='+2';status=t('inspectionPlus2');}else{const remaining=Math.max(0,Math.ceil((INSPECTION_NORMAL_MS-elapsed)/1000));display=String(remaining);if(elapsed>=INSPECTION_CUE_12_MS){phase='warning-strong';status=t('inspection12');}else if(elapsed>=INSPECTION_CUE_8_MS){phase='warning';status=t('inspection8');}}if(timer.state==='inspection-ready')status=t('inspectionReady');else if(timer.state==='inspection-holding')status=t('inspectionHolding');els.timer.textContent=display;els.timer.className=`inspection ${phase}${timer.state==='inspection-ready'?' ready':''}${timer.state==='inspection-holding'?' holding':''}`;els.status.textContent=status;}

  ensureCurrentSession();
  ensureAdvancedUi();

  function applyLanguage(){
    document.documentElement.lang=currentLanguage;document.documentElement.dir=currentLanguage==='he'?'rtl':'ltr';document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});document.querySelectorAll('[data-i18n-aria]').forEach(el=>{el.setAttribute('aria-label',t(el.dataset.i18nAria));});
    els.languageToggle.textContent=t('languageButton');els.historySettingsButton.title=t('historySettings');els.historySettingsButton.setAttribute('aria-label',t('historySettings'));els.addSession.title=t('addSession');els.addSession.setAttribute('aria-label',t('addSession'));els.deleteSession.title=t('deleteSession');els.deleteSession.setAttribute('aria-label',t('deleteSession'));document.getElementById('clearHistory').title=t('clearHistory');document.getElementById('clearHistory').setAttribute('aria-label',t('clearHistory'));
    const focus=document.getElementById('focusModeButton');if(focus){focus.title=t('focusMode');focus.setAttribute('aria-label',t('focusMode'));focus.querySelector('span').textContent=currentLanguage==='he'?'מיקוד':'FOCUS';}const menuButton=document.getElementById('sessionMenuButton');if(menuButton){menuButton.title=t('sessionMenu');menuButton.setAttribute('aria-label',t('sessionMenu'));}
    document.querySelector('[data-focus-exit]').textContent=t('exitFocus');document.querySelector('[data-shortcuts-setting-label]').textContent=t('keyboardShortcuts');document.getElementById('keyboardShortcutsButton').title=t('keyboardShortcuts');updateFullscreenButton();
    updateEventUI();setTimerState(timer?.state||'idle');renderMetricSettings();renderSessionSelect();renderSessionMenu();renderHistory();
  }

  function cycleLanguage(){currentLanguage=currentLanguage==='he'?'en':'he';localStorage.setItem(LANGUAGE_KEY,currentLanguage);applyLanguage();}

  async function createNewScramble(){
    if(timer.isBusy())return null;const requestId=++scrambleRequestId;const requestedEvent=currentEvent;currentScramble='';els.scramble.dataset.scrambleTransient='true';els.scramble.dataset.eventId=requestedEvent;els.scramble.setAttribute('aria-busy','true');els.scramble.textContent=t('generatingScramble');
    try{let scramble;let previewScramble;if(requestedEvent==='333mbf'){const scrambles=await window.SSCScrambles.generateMultiBlind(DEFAULT_MBLD_CUBES);scramble=scrambles.map((value,index)=>`${index+1}) ${value}`).join(' | ');previewScramble=scrambles[0]||'';}else{scramble=await window.SSCScrambles.generate(requestedEvent);previewScramble=scramble;}if(requestId!==scrambleRequestId||requestedEvent!==currentEvent)return null;currentScramble=String(scramble);showScramble(scramble,requestedEvent,previewScramble);return currentScramble;}catch(error){if(requestId!==scrambleRequestId||requestedEvent!==currentEvent)return null;els.scramble.dataset.scrambleTransient='true';els.scramble.textContent=`${t('scrambleError')}: ${requestedEvent}`;console.error(`[SSC] Unable to generate scramble for: ${requestedEvent}`,error);return null;}finally{if(requestId===scrambleRequestId)els.scramble.removeAttribute('aria-busy');}
  }
  async function setEvent(value){const eventId=normalizeEventId(value);if(!eventId||timer.isBusy()||eventId===currentEvent)return false;scrambleRequestId+=1;currentEvent=eventId;currentPuzzle=legacyPuzzleForEvent(eventId);currentScramble='';localStorage.setItem(EVENT_KEY,eventId);if(eventId==='222'||eventId==='333')localStorage.setItem(PUZZLE_KEY,currentPuzzle);ensureCurrentSession();renderSessionSelect();renderSessionMenu();updateEventUI();renderHistory();window.dispatchEvent(new CustomEvent('ssc-event-change',{detail:{eventId}}));await createNewScramble();return true;}

  const timer=new TimerEngine({holdMs:500,onTick:ms=>{els.timer.textContent=formatTime(ms);},onInspectionTick:(elapsed,penalty)=>renderInspection(elapsed,penalty),onStateChange:state=>{setTimerState(state);if(state==='running')els.timer.textContent=(0).toFixed(timePrecision);},onStop:(elapsed,penalty)=>{const effective=penalty==='DNF'?Infinity:elapsed+(penalty==='+2'?2000:0);els.timer.textContent=formatTime(effective);els.status.textContent=t('saved');addSolve(elapsed,currentScramble,penalty);renderHistory();createNewScramble();}});

  window.addEventListener('ssc-general-settings-change',event=>{const detail=event.detail||{};const previousMode=competitionSettings.mode;competitionSettings={mode:Boolean(detail.competitionMode),inspection:detail.competitionInspection!==false};if(previousMode&&!competitionSettings.mode&&isInspectionState(timer.state))timer.reset();applyCompetitionUiState();});
  window.addEventListener('storage',event=>{if(event.key===GENERAL_SETTINGS_KEY){competitionSettings=readGeneralSettings();timePrecision=readTimePrecision();if(!competitionSettings.mode&&isInspectionState(timer.state))timer.reset();applyCompetitionUiState();}if(event.key===STORAGE_KEY){rawHistoryCache=null;historyRevision+=1;sessionHistoryCache={key:'',value:[]};statsCache.clear();renderHistory();}});
  window.addEventListener('ssc-scramble-history-select',event=>{const eventId=normalizeEventId(event.detail?.eventId||currentEvent);const scramble=String(event.detail?.scramble||'').trim();if(!scramble||eventId!==currentEvent||timer.isBusy())return;scrambleRequestId+=1;currentScramble=scramble;els.scramble.dataset.scrambleTransient='false';els.scramble.dataset.eventId=currentEvent;els.scramble.removeAttribute('aria-busy');window.SSCCubePreview?.render(els.cubePreview2D,multiBlindPreviewScramble(scramble),currentEvent);});
  window.addEventListener('ssc-time-precision-change',()=>{const next=readTimePrecision();if(next===timePrecision)return;timePrecision=next;renderHistory();if(timer.state==='idle'){const displayed=Number(els.timer.textContent);if(Number.isFinite(displayed))els.timer.textContent=displayed.toFixed(timePrecision);}});
  window.addEventListener('blur',()=>{timer.cancelArming();shortcutKeysDown.clear();pendingMegaminxShortcut=false;});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)timer.cancelArming();});
  document.addEventListener('fullscreenchange',updateFullscreenButton);

  document.addEventListener('keydown',event=>{
    if(event.repeat&&event.code!=='Space')return;
    if(event.code==='Space'){
      if(event.repeat||isEditableTarget(event.target))return;event.preventDefault();if(timer.state!=='running'&&!isInspectionState(timer.state)&&!currentScramble)return;timer.press();return;
    }
    if(isEditableTarget(event.target))return;
    if(event.key==='Escape'){event.preventDefault();if(closeTransientUi())return;if(isFocusMode()){setFocusMode(false);return;}return;}
    const primaryModifier=event.ctrlKey||event.metaKey;
    if(primaryModifier&&!event.altKey){
      const key=event.key.toLowerCase();
      const code=event.code;
      const eventShortcuts={Digit1:'sq1',Numpad1:'sq1',Digit2:'222',Numpad2:'222',Digit3:'333',Numpad3:'333',Digit4:'444',Numpad4:'444',Digit5:'555',Numpad5:'555',Digit6:'666',Numpad6:'666',Digit7:'777',Numpad7:'777',KeyP:'pyram',KeyB:'333bf',KeyS:'skewb',KeyC:'clock',KeyF:'fto'};
      if(code==='Slash'&&event.shiftKey){event.preventDefault();openShortcuts();return;}
      if(code==='KeyZ'){event.preventDefault();undoDelete();return;}
      if(code==='KeyL'){event.preventDefault();cycleLanguage();return;}
      if(code==='KeyM'){event.preventDefault();shortcutKeysDown.add('KeyM');pendingMegaminxShortcut=true;return;}
      if(code==='KeyB'&&shortcutKeysDown.has('KeyM')){event.preventDefault();pendingMegaminxShortcut=false;setEvent('333mbf');return;}
      const plusShortcut=code==='NumpadAdd'||(code==='Equal'&&event.shiftKey)||key==='+';
      if(code==='KeyD'||plusShortcut||code==='KeyN'){
        event.preventDefault();const latest=currentSessionHistory()[0];if(!latest)return;
        if(code==='KeyD'){if(applyPenalty(latest.id,'DNF'))renderHistory();return;}
        if(plusShortcut){if(applyPenalty(latest.id,'+2'))renderHistory();return;}
        if(deleteSolve(latest.id))renderHistory();return;
      }
      if(eventShortcuts[code]){event.preventDefault();setEvent(eventShortcuts[code]);return;}
    }
  });
  document.addEventListener('keyup',event=>{if(event.code==='KeyM'&&shortcutKeysDown.has('KeyM')){shortcutKeysDown.delete('KeyM');const openMegaminx=pendingMegaminxShortcut;pendingMegaminxShortcut=false;if(openMegaminx&&!isEditableTarget(event.target)){event.preventDefault();setEvent('minx');}}if(event.code!=='Space'||isEditableTarget(event.target))return;event.preventDefault();timer.release();});

  els.touchTimer.addEventListener('pointerdown',event=>{event.preventDefault();if(timer.state!=='running'&&!isInspectionState(timer.state)&&!currentScramble)return;els.touchTimer.setPointerCapture?.(event.pointerId);timer.press();});
  els.touchTimer.addEventListener('pointerup',event=>{event.preventDefault();timer.release();});
  els.touchTimer.addEventListener('pointercancel',event=>{event.preventDefault();timer.cancelArming();});
  document.getElementById('newScramble').addEventListener('click',createNewScramble);document.querySelectorAll('.puzzle-btn').forEach(btn=>btn.addEventListener('click',()=>setEvent(btn.dataset.puzzle)));els.eventSelect?.addEventListener('change',()=>setEvent(els.eventSelect.value));
  document.getElementById('clearHistory').addEventListener('click',()=>{const selected=currentSessionHistory();if(!selected.length)return;if(confirm(t('clearHistoryConfirm'))){setHistory(getRawHistory().filter(raw=>{const solve=normalizeSolve(raw);return!(solve.eventId===currentEvent&&solve.sessionId===currentSessionId);}));touchCurrentSession();renderHistory();}});
  els.sessionSelect.addEventListener('change',()=>switchSession(els.sessionSelect.value));els.addSession.addEventListener('click',()=>{const name=prompt(t('addSessionPrompt'));if(name!==null)createSession(name);});els.deleteSession.addEventListener('click',deleteCurrentSession);
  document.getElementById('sessionMenuButton').addEventListener('click',event=>{event.stopPropagation();const menu=document.getElementById('sessionMenu');menu.hidden=!menu.hidden;if(!menu.hidden)renderSessionMenu();});document.addEventListener('click',event=>{const menu=document.getElementById('sessionMenu');if(menu&&!menu.hidden&&!event.target.closest('.session-toolbar'))menu.hidden=true;});
  document.getElementById('focusModeButton').addEventListener('click',()=>setFocusMode(!isFocusMode()));document.getElementById('fullscreenButton').addEventListener('click',toggleFullscreen);document.querySelector('[data-focus-exit]').addEventListener('click',()=>setFocusMode(false));
  document.querySelector('[data-undo-action]').addEventListener('click',undoDelete);document.getElementById('moreStatsButton').addEventListener('click',()=>{statsExpanded=!statsExpanded;renderStats();});
  document.getElementById('fullHistoryButton').addEventListener('click',openFullHistory);document.querySelectorAll('[data-full-history-close]').forEach(el=>el.addEventListener('click',closeFullHistory));
  document.querySelectorAll('[data-solve-close]').forEach(el=>el.addEventListener('click',closeSolveDetails));document.querySelector('[data-copy-scramble]').addEventListener('click',copySolveScramble);document.querySelector('[data-repeat-scramble]').addEventListener('click',repeatSolveScramble);
  document.querySelectorAll('[data-shortcuts-close]').forEach(el=>el.addEventListener('click',closeShortcuts));document.getElementById('keyboardShortcutsButton').addEventListener('click',openShortcuts);
  els.languageToggle.addEventListener('click',cycleLanguage);els.historySettingsButton.addEventListener('click',()=>{els.historySettings.hidden=!els.historySettings.hidden;});
  els.addCustomAo.addEventListener('click',()=>{const count=Number.parseInt(els.customAoInput.value,10);if(!Number.isInteger(count)||count<3||count>100000)return;if(!metricSettings.custom.includes(count))metricSettings.custom.push(count);const id=`custom-${count}`;if(!metricSettings.selected.includes(id))metricSettings.selected.push(id);metricSettings.custom.sort((a,b)=>a-b);saveMetricSettings(metricSettings);els.customAoInput.value='';renderMetricSettings();renderStats();});els.customAoInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();els.addCustomAo.click();}});

  window.SSCTimerEvents=Object.freeze({getCurrent:()=>currentEvent,getCurrentEvent:()=>eventFor(currentEvent),setCurrent:setEvent,newScramble:createNewScramble,getTimerState:()=>timer.state,getCompetitionSettings:()=>({...competitionSettings}),getEffectiveTime,getCurrentSession:()=>getSessionSnapshot(sessions.find(item=>item.id===currentSessionId),currentEvent),getSessions:()=>sessions.map(session=>getSessionSnapshot(session,currentEvent)),setPenalty:applyPenalty,deleteSolve,undoDelete,setFocusMode,isFocusMode,openFullHistory,closeFullHistory,repeatScramble:loadScramble});

  new ResizeObserver(fitScrambleText).observe(document.querySelector('.scramble-center'));
  if(document.fonts?.ready)document.fonts.ready.then(fitScrambleText);
  localStorage.setItem(EVENT_KEY,currentEvent);renderEventSelect();renderSessionSelect();renderSessionMenu();applyCompetitionUiState();applyLanguage();createNewScramble();
})();
