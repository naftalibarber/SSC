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
    he:{newScramble:'ערבוב חדש',holdHere:'החזק כאן להפעלה',timerAria:'טיימר',puzzleSelectorAria:'בחירת מקצה',historyAria:'היסטוריה וסטטיסטיקות',sessionSelectAria:'בחירת סשן',historySettingsTitle:'מה להציג בסטטיסטיקות',customAo:'Ao מותאם אישית',add:'הוסף',recentSolves:'פתרונות אחרונים',emptyHistory:'עדיין אין פתרונות שמורים.',scramble:'ערבוב',idle:'החזק Space, המתן לירוק ושחרר להתחלה',holding:'המשך להחזיק...',ready:'מוכן — שחרר להתחלה',running:'Space לעצירה',saved:'נשמר! החזק Space לפתרון הבא',addSessionPrompt:'שם לסשן החדש:',deleteSessionConfirm:'למחוק את הסשן הזה ואת כל הפתרונות שבו?',cannotDeleteLastSession:'חייב להישאר לפחות סשן אחד.',clearHistoryConfirm:'למחוק את כל הפתרונות בסשן הנוכחי?',deleteSolve:'מחק',historySettings:'הגדרות היסטוריה',addSession:'הוסף סשן',deleteSession:'מחק סשן',clearHistory:'מחק היסטוריה',remove:'הסר',defaultSession:'סשן 1',languageButton:'English',generatingScramble:'יוצר ערבוב…',scrambleError:'לא ניתן ליצור ערבוב',eventSelector:'בחירת מקצה',inspection:'בדיקה — 15 שניות',inspectionHolding:'המשך להחזיק כדי להתחיל',inspectionReady:'מוכן — שחרר כדי להתחיל',inspection8:'8 שניות',inspection12:'12 שניות',inspectionPlus2:'+2',inspectionDnf:'DNF',ok:'תקין',delete:'מחיקה',penaltyEditor:'עריכת תוצאה'},
    en:{newScramble:'New scramble',holdHere:'Hold here to start',timerAria:'Timer',puzzleSelectorAria:'Event selection',historyAria:'History and statistics',sessionSelectAria:'Session selection',historySettingsTitle:'Choose statistics to display',customAo:'Custom Ao',add:'Add',recentSolves:'Recent solves',emptyHistory:'No saved solves yet.',scramble:'Scramble',idle:'Hold Space, wait for green, then release to start',holding:'Keep holding...',ready:'Ready — release to start',running:'Space to stop',saved:'Saved! Hold Space for the next solve',addSessionPrompt:'Name for the new session:',deleteSessionConfirm:'Delete this session and all of its solves?',cannotDeleteLastSession:'At least one session must remain.',clearHistoryConfirm:'Delete all solves in the current session?',deleteSolve:'Delete',historySettings:'History settings',addSession:'Add session',deleteSession:'Delete session',clearHistory:'Clear history',remove:'Remove',defaultSession:'Session 1',languageButton:'עברית',generatingScramble:'Generating scramble…',scrambleError:'Unable to generate scramble',eventSelector:'Event selection',inspection:'15-second inspection',inspectionHolding:'Keep holding to start',inspectionReady:'Ready — release to start',inspection8:'8 seconds',inspection12:'12 seconds',inspectionPlus2:'+2',inspectionDnf:'DNF',ok:'OK',delete:'Delete',penaltyEditor:'Result penalty'}
  };

  const els={
    timer:document.getElementById('timer'),status:document.getElementById('status'),scramble:document.getElementById('scramble'),touchTimer:document.getElementById('touchTimer'),
    historyList:document.getElementById('historyList'),emptyHistory:document.getElementById('emptyHistory'),solveCount:document.getElementById('solveCount'),scrambleLabel:document.getElementById('scrambleLabel'),
    statsGrid:document.getElementById('statsGrid'),historySettings:document.getElementById('historySettings'),historySettingsButton:document.getElementById('historySettingsButton'),historyMetricOptions:document.getElementById('historyMetricOptions'),
    customAoInput:document.getElementById('customAoInput'),addCustomAo:document.getElementById('addCustomAo'),sessionSelect:document.getElementById('sessionSelect'),addSession:document.getElementById('addSession'),deleteSession:document.getElementById('deleteSession'),
    languageToggle:document.getElementById('languageToggle'),cubePreview2D:document.getElementById('cubePreview2D'),eventSelect:document.getElementById('eventSelect'),quickAo5:document.getElementById('quickAo5'),quickAo12:document.getElementById('quickAo12')
  };

  function t(key){return I18N[currentLanguage]?.[key]||key;}
  function normalizeEventId(value){return window.SSCScrambles?.normalizeEventId?.(value)||null;}
  function eventFor(value){return window.SSCScrambles?.getEvent?.(value)||null;}
  function legacyPuzzleForEvent(eventId){return eventId==='222'?'2x2':eventId==='333'?'3x3':eventId;}
  function eventIdForLegacyPuzzle(puzzle){return normalizeEventId(puzzle)||'333';}
  function formatTime(ms){return Number.isFinite(ms)?(ms/1000).toFixed(3):'DNF';}
  function formatRawSeconds(ms){return Number.isFinite(ms)?Number((ms/1000).toFixed(3)):null;}
  function normalizePenalty(value){return VALID_PENALTIES.has(value)?value:'OK';}
  function getInspectionPenalty(elapsedMs){if(elapsedMs>INSPECTION_DNF_MS)return'DNF';if(elapsedMs>INSPECTION_NORMAL_MS)return'+2';return'OK';}
  function isInspectionState(state){return state==='inspection'||state==='inspection-holding'||state==='inspection-ready';}

  function readGeneralSettings(){
    try{
      const parsed=JSON.parse(localStorage.getItem(GENERAL_SETTINGS_KEY));
      return{mode:Boolean(parsed?.competitionMode),inspection:parsed?.competitionInspection!==false};
    }catch{return{mode:false,inspection:true};}
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
    return{
      ...solve,
      timeMs:rawTimeMs,
      rawTimeMs,
      rawTime:formatRawSeconds(rawTimeMs),
      penalty,
      finalTimeMs,
      finalTime:finalTimeMs===null?null:formatRawSeconds(finalTimeMs),
      puzzle:legacyPuzzle,
      eventId,
      event:solve?.event||eventId,
      puzzleId:solve?.puzzleId||event?.puzzle||legacyPuzzle,
      sessionId:solve?.sessionId||solve?.session||'session-1',
      session:solve?.session||solve?.sessionId||'session-1',
      createdAt:solve?.createdAt||solve?.date||new Date().toISOString(),
      date:solve?.date||solve?.createdAt||new Date().toISOString()
    };
  }

  function getRawHistory(){try{const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY));return Array.isArray(parsed)?parsed:[];}catch{return[];}}
  function getHistory(){return getRawHistory().map(normalizeSolve);}
  function setHistory(history){localStorage.setItem(STORAGE_KEY,JSON.stringify(history));}
  function getEffectiveTime(solve){const normalized=normalizeSolve(solve);if(normalized.penalty==='DNF')return Infinity;return normalized.rawTimeMs+(normalized.penalty==='+2'?2000:0);}
  function withPenaltyFields(solve,penalty){
    const normalized=normalizeSolve(solve);const nextPenalty=normalizePenalty(penalty);const finalTimeMs=nextPenalty==='DNF'?null:normalized.rawTimeMs+(nextPenalty==='+2'?2000:0);
    return{...solve,timeMs:normalized.rawTimeMs,rawTimeMs:normalized.rawTimeMs,rawTime:formatRawSeconds(normalized.rawTimeMs),penalty:nextPenalty,finalTimeMs,finalTime:finalTimeMs===null?null:formatRawSeconds(finalTimeMs)};
  }
  function addSolve(timeMs,scramble,penalty='OK'){
    const history=getRawHistory();
    const event=eventFor(currentEvent);
    const createdAt=new Date().toISOString();
    const rawTimeMs=Math.round(timeMs);
    const base={
      id:(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`),
      timeMs:rawTimeMs,
      rawTimeMs,
      rawTime:formatRawSeconds(rawTimeMs),
      penalty:normalizePenalty(penalty),
      scramble,
      puzzle:legacyPuzzleForEvent(currentEvent),
      eventId:currentEvent,
      event:currentEvent,
      puzzleId:event?.puzzle||currentEvent,
      sessionId:currentSessionId,
      session:currentSessionId,
      createdAt,
      date:createdAt
    };
    history.unshift(withPenaltyFields(base,base.penalty));
    setHistory(history);
  }
  function applyPenalty(id,penalty){
    const history=getRawHistory();const index=history.findIndex(solve=>solve?.id===id);if(index<0)return false;
    history[index]=withPenaltyFields(history[index],penalty);setHistory(history);return true;
  }
  function deleteSolve(id){setHistory(getRawHistory().filter(solve=>solve?.id!==id));}
  function defaultSession(){return{id:'session-1',name:I18N.he.defaultSession};}
  function cloneSessions(value){return Array.isArray(value)&&value.length?value.map(session=>({...session})):[defaultSession()];}
  function readObject(key){try{const value=JSON.parse(localStorage.getItem(key));return value&&typeof value==='object'&&!Array.isArray(value)?value:null;}catch{return null;}}

  function getSessionsByEvent(){
    const existing=readObject(SESSIONS_KEY);
    if(existing)return existing;
    const migrated={};
    const byPuzzle=readObject(LEGACY_SESSIONS_BY_PUZZLE_KEY);
    let legacySessions=null;
    try{const parsed=JSON.parse(localStorage.getItem(LEGACY_SESSIONS_KEY));if(Array.isArray(parsed)&&parsed.length)legacySessions=parsed;}catch{}
    if(byPuzzle?.['2x2'])migrated['222']=cloneSessions(byPuzzle['2x2']);
    else if(legacySessions)migrated['222']=cloneSessions(legacySessions);
    if(byPuzzle?.['3x3'])migrated['333']=cloneSessions(byPuzzle['3x3']);
    else if(legacySessions)migrated['333']=cloneSessions(legacySessions);
    if(!migrated['222'])migrated['222']=[defaultSession()];
    if(!migrated['333'])migrated['333']=[defaultSession()];
    localStorage.setItem(SESSIONS_KEY,JSON.stringify(migrated));
    return migrated;
  }

  function getActiveSessions(){
    const existing=readObject(ACTIVE_SESSION_KEY);
    if(existing)return existing;
    const migrated={};
    const byPuzzle=readObject(LEGACY_ACTIVE_BY_PUZZLE_KEY);
    const legacy=localStorage.getItem(LEGACY_ACTIVE_SESSION_KEY)||null;
    migrated['222']=byPuzzle?.['2x2']||legacy;
    migrated['333']=byPuzzle?.['3x3']||legacy;
    localStorage.setItem(ACTIVE_SESSION_KEY,JSON.stringify(migrated));
    return migrated;
  }

  function saveSessions(){sessionsByEvent[currentEvent]=sessions;localStorage.setItem(SESSIONS_KEY,JSON.stringify(sessionsByEvent));}
  function saveActiveSession(){activeSessionByEvent[currentEvent]=currentSessionId;localStorage.setItem(ACTIVE_SESSION_KEY,JSON.stringify(activeSessionByEvent));}
  function ensureCurrentSession(){
    sessions=sessionsByEvent[currentEvent];
    if(!Array.isArray(sessions)||!sessions.length){sessions=[defaultSession()];sessionsByEvent[currentEvent]=sessions;saveSessions();}
    currentSessionId=activeSessionByEvent[currentEvent];
    if(!sessions.some(session=>session.id===currentSessionId))currentSessionId=sessions[0].id;
    saveActiveSession();
  }
  function createSession(name){const id=(crypto.randomUUID?crypto.randomUUID():`${currentEvent}-session-${Date.now()}-${Math.random()}`);sessions.push({id,name});saveSessions();currentSessionId=id;saveActiveSession();renderSessionSelect();renderHistory();}
  function deleteCurrentSession(){
    if(sessions.length<=1){alert(t('cannotDeleteLastSession'));return;}
    if(!confirm(t('deleteSessionConfirm')))return;
    setHistory(getRawHistory().filter(raw=>{const solve=normalizeSolve(raw);return!(solve.eventId===currentEvent&&solve.sessionId===currentSessionId);}));
    sessions=sessions.filter(session=>session.id!==currentSessionId);sessionsByEvent[currentEvent]=sessions;saveSessions();currentSessionId=sessions[0].id;saveActiveSession();renderSessionSelect();renderHistory();
  }
  function renderSessionSelect(){els.sessionSelect.innerHTML='';sessions.forEach(session=>{const option=document.createElement('option');option.value=session.id;option.textContent=session.name;option.selected=session.id===currentSessionId;els.sessionSelect.appendChild(option);});}

  function getMetricSettings(){const fallback={selected:['best','mo3','ao5','ao12'],custom:[]};try{const parsed=JSON.parse(localStorage.getItem(HISTORY_SETTINGS_KEY));if(!parsed||!Array.isArray(parsed.selected)||!Array.isArray(parsed.custom))return fallback;return{selected:parsed.selected,custom:parsed.custom.filter(n=>Number.isInteger(n)&&n>=3&&n<=100000)};}catch{return fallback;}}
  function saveMetricSettings(settings){localStorage.setItem(HISTORY_SETTINGS_KEY,JSON.stringify(settings));}
  let metricSettings=getMetricSettings();

  function mean(values,count){
    if(values.length<count)return null;
    const sample=values.slice(0,count);
    if(sample.some(value=>!Number.isFinite(value)))return Infinity;
    return sample.reduce((a,b)=>a+b,0)/sample.length;
  }
  function trimmedAverage(values,count){
    if(values.length<count)return null;
    if(count<5)return mean(values,count);
    const sample=values.slice(0,count);
    const sorted=[...sample].sort((a,b)=>a-b);
    const trim=Math.ceil(count*.05);
    const trimmed=sorted.slice(trim,sorted.length-trim);
    if(!trimmed.length)return null;
    if(trimmed.some(value=>!Number.isFinite(value)))return Infinity;
    return trimmed.reduce((a,b)=>a+b,0)/trimmed.length;
  }

  function multiBlindPreviewScramble(scramble){
    if(currentEvent!=='333mbf')return scramble;
    const text=String(scramble||'');
    const match=text.match(/^1\)\s*(.*?)(?:\s+\|\s+2\)|$)/);
    return match?.[1]?.trim()||text;
  }
  function showScramble(scramble,eventId=currentEvent,previewScramble=scramble){
    const text=Array.isArray(scramble)?scramble.join(' ').trim():String(scramble||'').trim();
    els.scramble.dataset.scrambleTransient='false';els.scramble.dataset.eventId=eventId;els.scramble.textContent=text;
    window.SSCCubePreview?.render(els.cubePreview2D,previewScramble,eventId);
  }

  function renderEventSelect(){
    if(!els.eventSelect)return;
    const events=window.SSCScrambles?.getEvents?.()||[];
    els.eventSelect.innerHTML='';
    events.forEach(event=>{
      const option=document.createElement('option');option.value=event.id;option.textContent=event.label||event.id.toUpperCase();option.title=event.name||event.id;els.eventSelect.appendChild(option);
    });
    els.eventSelect.value=currentEvent;
    els.eventSelect.setAttribute('aria-label',t('eventSelector'));
  }

  function updateEventUI(){
    const event=eventFor(currentEvent);
    const label=event?.label||currentEvent.toUpperCase();
    els.scrambleLabel.textContent=`${t('scramble')} ${label}`;
    if(els.eventSelect){els.eventSelect.value=currentEvent;els.eventSelect.setAttribute('aria-label',t('eventSelector'));}
    document.querySelectorAll('.puzzle-btn').forEach(btn=>btn.classList.toggle('active',normalizeEventId(btn.dataset.puzzle)===currentEvent));
  }

  function metricCurrent(metric,values){if(!values.length)return null;if(metric.type==='best')return values[0];if(metric.type==='mean')return mean(values,metric.count);return trimmedAverage(values,metric.count);}
  function metricBest(metric,values){
    if(!values.length)return null;
    if(metric.type==='best')return Math.min(...values);
    if(values.length<metric.count)return null;
    let best=null;
    for(let i=0;i<=values.length-metric.count;i++){
      const sample=values.slice(i,i+metric.count);
      const value=metric.type==='mean'?mean(sample,metric.count):trimmedAverage(sample,metric.count);
      if(value!==null&&(best===null||value<best))best=value;
    }
    return best;
  }

  function renderMetricSettings(){
    els.historyMetricOptions.innerHTML='';
    const all=[...METRICS,...metricSettings.custom.map(count=>({id:`custom-${count}`,label:`Ao${count}`,type:'ao',count,custom:true}))];
    all.forEach(metric=>{
      const item=document.createElement('label');item.className='metric-option';const checked=metricSettings.selected.includes(metric.id);
      item.innerHTML=`<input type="checkbox" ${checked?'checked':''}><span>${metric.label}</span>${metric.custom?`<button class="remove-custom" type="button" title="${t('remove')}">×</button>`:''}`;
      const checkbox=item.querySelector('input');checkbox.addEventListener('change',()=>{if(checkbox.checked){if(!metricSettings.selected.includes(metric.id))metricSettings.selected.push(metric.id);}else metricSettings.selected=metricSettings.selected.filter(id=>id!==metric.id);saveMetricSettings(metricSettings);renderStats();});
      const remove=item.querySelector('.remove-custom');if(remove)remove.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();metricSettings.custom=metricSettings.custom.filter(n=>n!==metric.count);metricSettings.selected=metricSettings.selected.filter(id=>id!==metric.id);saveMetricSettings(metricSettings);renderMetricSettings();renderStats();});
      els.historyMetricOptions.appendChild(item);
    });
  }

  function currentSessionHistory(){return getHistory().filter(solve=>solve.eventId===currentEvent&&solve.sessionId===currentSessionId);}
  function renderStats(){
    const history=currentSessionHistory();const values=history.map(getEffectiveTime);
    const customMetrics=metricSettings.custom.map(count=>({id:`custom-${count}`,label:`Ao${count}`,type:'ao',count,custom:true}));const all=[...METRICS,...customMetrics];const visible=all.filter(metric=>metricSettings.selected.includes(metric.id));
    if(els.quickAo5){const value=trimmedAverage(values,5);els.quickAo5.textContent=value===null?'—':formatTime(value);}
    if(els.quickAo12){const value=trimmedAverage(values,12);els.quickAo12.textContent=value===null?'—':formatTime(value);}
    els.statsGrid.innerHTML='';if(!visible.length){els.statsGrid.hidden=true;return;}els.statsGrid.hidden=false;
    const header=document.createElement('div');header.className='stats-table-header';header.innerHTML=`<span>${currentLanguage==='he'?'מדד':'STAT'}</span><span>${currentLanguage==='he'?'נוכחי':'CURRENT'}</span><span>${currentLanguage==='he'?'שיא':'BEST'}</span>`;els.statsGrid.appendChild(header);
    visible.forEach(metric=>{const current=metricCurrent(metric,values);const best=metricBest(metric,values);const row=document.createElement('div');row.className='stat';row.innerHTML=`<span class="stat-label">${metric.label}</span><strong class="stat-current">${current===null?'—':formatTime(current)}</strong><strong class="stat-best${best===null?' empty':''}">${best===null?'—':formatTime(best)}</strong>`;els.statsGrid.appendChild(row);});
  }

  function solveDisplay(solve){
    const raw=formatTime(solve.rawTimeMs);
    if(solve.penalty==='DNF')return`<span class="solve-result-dnf">DNF</span> <span class="solve-raw">(${raw})</span>`;
    if(solve.penalty==='+2')return`${formatTime(getEffectiveTime(solve))} <span class="solve-penalty-label">(+2)</span>`;
    return raw;
  }

  function renderHistory(){
    const history=currentSessionHistory();els.solveCount.textContent=history.length;renderStats();els.historyList.innerHTML='';
    if(!history.length){els.emptyHistory.hidden=false;els.historyList.hidden=true;return;}
    els.emptyHistory.hidden=true;els.historyList.hidden=false;
    const finiteTimes=history.map(getEffectiveTime).filter(Number.isFinite);const bestSingle=finiteTimes.length?Math.min(...finiteTimes):null;
    history.slice(0,8).forEach((solve,index)=>{
      const effective=getEffectiveTime(solve);const row=document.createElement('div');row.className='solve-row'+(bestSingle!==null&&effective===bestSingle?' best-solve':'')+(solve.penalty!=='OK'?` penalty-${solve.penalty==='DNF'?'dnf':'plus2'}`:'');
      const date=new Date(solve.createdAt);const locale=currentLanguage==='he'?'he-IL':'en-US';const meta=`${date.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})} · ${solve.scramble}`;
      if(competitionSettings.mode){
        row.classList.add('competition-solve-row');
        row.innerHTML=`<div class="solve-index">${index+1}</div><div class="solve-main"><div class="solve-time">${solveDisplay(solve)}</div><div class="solve-meta"></div><div class="penalty-actions" role="group" aria-label="${t('penaltyEditor')}"><button type="button" data-penalty="OK" class="${solve.penalty==='OK'?'active':''}">${t('ok')}</button><button type="button" data-penalty="+2" class="${solve.penalty==='+2'?'active':''}">+2</button><button type="button" data-penalty="DNF" class="${solve.penalty==='DNF'?'active':''}">DNF</button><button type="button" data-action="delete" class="penalty-delete">${t('delete')}</button></div></div>`;
        row.querySelector('.solve-meta').textContent=meta;
        row.querySelectorAll('[data-penalty]').forEach(button=>button.addEventListener('click',()=>{if(applyPenalty(solve.id,button.dataset.penalty))renderHistory();}));
        row.querySelector('[data-action="delete"]').addEventListener('click',()=>{deleteSolve(solve.id);renderHistory();});
      }else{
        row.innerHTML=`<div class="solve-index">${index+1}</div><div class="solve-main"><div class="solve-time">${solveDisplay(solve)}</div><div class="solve-meta"></div></div><button class="delete-solve" type="button" title="${t('deleteSolve')}">×</button>`;
        row.querySelector('.solve-meta').textContent=meta;row.querySelector('.delete-solve').addEventListener('click',()=>{deleteSolve(solve.id);renderHistory();});
      }
      els.historyList.appendChild(row);
    });
  }

  class TimerEngine{
    constructor({holdMs=500,onTick,onInspectionTick,onStateChange,onStop}){
      this.holdMs=holdMs;this.onTick=onTick;this.onInspectionTick=onInspectionTick;this.onStateChange=onStateChange;this.onStop=onStop;
      this.state='idle';this.holdTimeout=null;this.startTime=0;this.animationFrame=null;this.inspectionStartTime=0;this.inspectionFrame=null;this.pendingPenalty='OK';this.cue8Sent=false;this.cue12Sent=false;
    }
    setState(state){this.state=state;this.onStateChange?.(state);}
    isBusy(){return this.state!=='idle';}
    clearHold(){clearTimeout(this.holdTimeout);this.holdTimeout=null;}
    beginHold(fromInspection=false){
      const holdingState=fromInspection?'inspection-holding':'holding';const readyState=fromInspection?'inspection-ready':'ready';
      this.setState(holdingState);this.clearHold();this.holdTimeout=setTimeout(()=>{if(this.state===holdingState)this.setState(readyState);},this.holdMs);
    }
    press(){
      if(this.state==='running'){this.stop();return;}
      if(this.state==='idle'){this.beginHold(false);return;}
      if(this.state==='inspection'){this.beginHold(true);}
    }
    release(){
      if(this.state==='ready'){
        if(competitionSettings.mode&&competitionSettings.inspection)this.startInspection();else this.start();
        return;
      }
      if(this.state==='holding'){this.cancelHold(false);return;}
      if(this.state==='inspection-ready'){this.start();return;}
      if(this.state==='inspection-holding')this.cancelHold(true);
    }
    cancelHold(fromInspection){this.clearHold();if(this.state===(fromInspection?'inspection-holding':'holding'))this.setState(fromInspection?'inspection':'idle');}
    startInspection(){
      this.clearHold();this.cancelRunFrame();this.cancelInspectionFrame();this.pendingPenalty='OK';this.inspectionStartTime=performance.now();this.cue8Sent=false;this.cue12Sent=false;this.setState('inspection');this.tickInspection();
    }
    tickInspection=()=>{
      if(!isInspectionState(this.state))return;
      const elapsed=performance.now()-this.inspectionStartTime;this.pendingPenalty=getInspectionPenalty(elapsed);
      if(!this.cue8Sent&&elapsed>=INSPECTION_CUE_8_MS){this.cue8Sent=true;window.dispatchEvent(new CustomEvent('ssc-inspection-cue',{detail:{cue:'8s',elapsedMs:elapsed}}));}
      if(!this.cue12Sent&&elapsed>=INSPECTION_CUE_12_MS){this.cue12Sent=true;window.dispatchEvent(new CustomEvent('ssc-inspection-cue',{detail:{cue:'12s',elapsedMs:elapsed}}));}
      this.onInspectionTick?.(elapsed,this.pendingPenalty,{cue8:this.cue8Sent,cue12:this.cue12Sent});
      this.inspectionFrame=requestAnimationFrame(this.tickInspection);
    };
    cancelInspectionFrame(){if(this.inspectionFrame!==null)cancelAnimationFrame(this.inspectionFrame);this.inspectionFrame=null;}
    cancelRunFrame(){if(this.animationFrame!==null)cancelAnimationFrame(this.animationFrame);this.animationFrame=null;}
    start(){
      this.clearHold();
      if(isInspectionState(this.state)){
        const elapsed=Math.max(0,performance.now()-this.inspectionStartTime);this.pendingPenalty=getInspectionPenalty(elapsed);this.cancelInspectionFrame();
      }else this.pendingPenalty='OK';
      this.startTime=performance.now();this.setState('running');this.tick();
    }
    tick=()=>{if(this.state!=='running')return;this.onTick?.(performance.now()-this.startTime);this.animationFrame=requestAnimationFrame(this.tick);};
    stop(){
      if(this.state!=='running')return;
      const elapsed=performance.now()-this.startTime;const penalty=this.pendingPenalty;this.cancelRunFrame();this.setState('idle');this.onStop?.(elapsed,penalty);this.pendingPenalty='OK';
    }
    reset(){this.clearHold();this.cancelInspectionFrame();this.cancelRunFrame();this.pendingPenalty='OK';this.setState('idle');}
  }

  function statusKeyForState(state){if(state==='inspection-holding')return'inspectionHolding';if(state==='inspection-ready')return'inspectionReady';return state;}
  function setTimerState(state){
    els.timer.className=state==='idle'?'':state;
    els.status.textContent=t(statusKeyForState(state));
    document.documentElement.dataset.timerState=state;
  }
  function applyCompetitionUiState(){
    document.documentElement.dataset.competitionMode=competitionSettings.mode?'on':'off';
    renderHistory();
  }
  function renderInspection(elapsed,penalty){
    let phase='normal';let display='';let status=t('inspection');
    if(penalty==='DNF'){phase='dnf';display='DNF';status=t('inspectionDnf');}
    else if(penalty==='+2'){phase='penalty';display='+2';status=t('inspectionPlus2');}
    else{
      const remaining=Math.max(0,Math.ceil((INSPECTION_NORMAL_MS-elapsed)/1000));display=String(remaining);
      if(elapsed>=INSPECTION_CUE_12_MS){phase='warning-strong';status=t('inspection12');}
      else if(elapsed>=INSPECTION_CUE_8_MS){phase='warning';status=t('inspection8');}
    }
    if(timer.state==='inspection-ready')status=t('inspectionReady');
    else if(timer.state==='inspection-holding')status=t('inspectionHolding');
    els.timer.textContent=display;els.timer.className=`inspection ${phase}${timer.state==='inspection-ready'?' ready':''}${timer.state==='inspection-holding'?' holding':''}`;els.status.textContent=status;
  }

  let currentLanguage=localStorage.getItem(LANGUAGE_KEY)==='en'?'en':'he';
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
  ensureCurrentSession();

  function applyLanguage(){
    document.documentElement.lang=currentLanguage;document.documentElement.dir=currentLanguage==='he'?'rtl':'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});document.querySelectorAll('[data-i18n-aria]').forEach(el=>{el.setAttribute('aria-label',t(el.dataset.i18nAria));});
    els.languageToggle.textContent=t('languageButton');els.historySettingsButton.title=t('historySettings');els.historySettingsButton.setAttribute('aria-label',t('historySettings'));els.addSession.title=t('addSession');els.addSession.setAttribute('aria-label',t('addSession'));els.deleteSession.title=t('deleteSession');els.deleteSession.setAttribute('aria-label',t('deleteSession'));
    document.getElementById('clearHistory').title=t('clearHistory');document.getElementById('clearHistory').setAttribute('aria-label',t('clearHistory'));
    updateEventUI();setTimerState(timer?.state||'idle');renderMetricSettings();renderHistory();
  }

  async function createNewScramble(){
    if(timer.isBusy())return null;
    const requestId=++scrambleRequestId;const requestedEvent=currentEvent;currentScramble='';
    els.scramble.dataset.scrambleTransient='true';els.scramble.dataset.eventId=requestedEvent;els.scramble.setAttribute('aria-busy','true');els.scramble.textContent=t('generatingScramble');
    try{
      let scramble;let previewScramble;
      if(requestedEvent==='333mbf'){
        const scrambles=await window.SSCScrambles.generateMultiBlind(DEFAULT_MBLD_CUBES);
        scramble=scrambles.map((value,index)=>`${index+1}) ${value}`).join(' | ');previewScramble=scrambles[0]||'';
      }else{
        scramble=await window.SSCScrambles.generate(requestedEvent);previewScramble=scramble;
      }
      if(requestId!==scrambleRequestId||requestedEvent!==currentEvent)return null;
      currentScramble=String(scramble);showScramble(scramble,requestedEvent,previewScramble);return currentScramble;
    }catch(error){
      if(requestId!==scrambleRequestId||requestedEvent!==currentEvent)return null;
      els.scramble.dataset.scrambleTransient='true';els.scramble.textContent=`${t('scrambleError')}: ${requestedEvent}`;console.error(`[SSC] Unable to generate scramble for: ${requestedEvent}`,error);return null;
    }finally{if(requestId===scrambleRequestId)els.scramble.removeAttribute('aria-busy');}
  }

  async function setEvent(value){
    const eventId=normalizeEventId(value);if(!eventId||timer.isBusy()||eventId===currentEvent)return false;
    scrambleRequestId+=1;currentEvent=eventId;currentPuzzle=legacyPuzzleForEvent(eventId);currentScramble='';
    localStorage.setItem(EVENT_KEY,eventId);if(eventId==='222'||eventId==='333')localStorage.setItem(PUZZLE_KEY,currentPuzzle);
    ensureCurrentSession();renderSessionSelect();updateEventUI();renderHistory();
    window.dispatchEvent(new CustomEvent('ssc-event-change',{detail:{eventId}}));
    await createNewScramble();return true;
  }

  const timer=new TimerEngine({
    holdMs:500,
    onTick:ms=>{els.timer.textContent=formatTime(ms);},
    onInspectionTick:(elapsed,penalty)=>renderInspection(elapsed,penalty),
    onStateChange:state=>{setTimerState(state);if(state==='running')els.timer.textContent='0.000';},
    onStop:(elapsed,penalty)=>{const effective=penalty==='DNF'?Infinity:elapsed+(penalty==='+2'?2000:0);els.timer.textContent=formatTime(effective);els.status.textContent=t('saved');addSolve(elapsed,currentScramble,penalty);renderHistory();createNewScramble();}
  });

  window.addEventListener('ssc-general-settings-change',event=>{
    const detail=event.detail||{};const previousMode=competitionSettings.mode;competitionSettings={mode:Boolean(detail.competitionMode),inspection:detail.competitionInspection!==false};
    if(previousMode&&!competitionSettings.mode&&isInspectionState(timer.state))timer.reset();
    applyCompetitionUiState();
  });

  window.addEventListener('storage',event=>{
    if(event.key!==GENERAL_SETTINGS_KEY)return;
    competitionSettings=readGeneralSettings();if(!competitionSettings.mode&&isInspectionState(timer.state))timer.reset();applyCompetitionUiState();
  });

  window.addEventListener('ssc-scramble-history-select',event=>{
    const eventId=normalizeEventId(event.detail?.eventId||currentEvent);const scramble=String(event.detail?.scramble||'').trim();
    if(!scramble||eventId!==currentEvent||timer.isBusy())return;
    scrambleRequestId+=1;currentScramble=scramble;els.scramble.dataset.scrambleTransient='false';els.scramble.dataset.eventId=currentEvent;els.scramble.removeAttribute('aria-busy');window.SSCCubePreview?.render(els.cubePreview2D,multiBlindPreviewScramble(scramble),currentEvent);
  });

  document.addEventListener('keydown',event=>{if(event.code!=='Space'||event.repeat)return;event.preventDefault();if(timer.state!=='running'&&!isInspectionState(timer.state)&&!currentScramble)return;timer.press();});
  document.addEventListener('keyup',event=>{if(event.code!=='Space')return;event.preventDefault();timer.release();});
  els.touchTimer.addEventListener('pointerdown',event=>{event.preventDefault();if(timer.state!=='running'&&!isInspectionState(timer.state)&&!currentScramble)return;els.touchTimer.setPointerCapture?.(event.pointerId);timer.press();});
  ['pointerup','pointercancel'].forEach(type=>els.touchTimer.addEventListener(type,event=>{event.preventDefault();timer.release();}));
  document.getElementById('newScramble').addEventListener('click',createNewScramble);
  document.querySelectorAll('.puzzle-btn').forEach(btn=>btn.addEventListener('click',()=>setEvent(btn.dataset.puzzle)));
  els.eventSelect?.addEventListener('change',()=>setEvent(els.eventSelect.value));

  document.getElementById('clearHistory').addEventListener('click',()=>{const selected=currentSessionHistory();if(!selected.length)return;if(confirm(t('clearHistoryConfirm'))){setHistory(getRawHistory().filter(raw=>{const solve=normalizeSolve(raw);return!(solve.eventId===currentEvent&&solve.sessionId===currentSessionId);}));renderHistory();}});
  els.sessionSelect.addEventListener('change',()=>{currentSessionId=els.sessionSelect.value;saveActiveSession();renderHistory();});
  els.addSession.addEventListener('click',()=>{const name=prompt(t('addSessionPrompt'));if(name&&name.trim())createSession(name.trim());});
  els.deleteSession.addEventListener('click',deleteCurrentSession);
  els.languageToggle.addEventListener('click',()=>{currentLanguage=currentLanguage==='he'?'en':'he';localStorage.setItem(LANGUAGE_KEY,currentLanguage);applyLanguage();});
  els.historySettingsButton.addEventListener('click',()=>{els.historySettings.hidden=!els.historySettings.hidden;});
  els.addCustomAo.addEventListener('click',()=>{const count=Number.parseInt(els.customAoInput.value,10);if(!Number.isInteger(count)||count<3||count>100000)return;if(!metricSettings.custom.includes(count))metricSettings.custom.push(count);const id=`custom-${count}`;if(!metricSettings.selected.includes(id))metricSettings.selected.push(id);metricSettings.custom.sort((a,b)=>a-b);saveMetricSettings(metricSettings);els.customAoInput.value='';renderMetricSettings();renderStats();});
  els.customAoInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();els.addCustomAo.click();}});

  window.SSCTimerEvents=Object.freeze({
    getCurrent:()=>currentEvent,
    getCurrentEvent:()=>eventFor(currentEvent),
    setCurrent:setEvent,
    newScramble:createNewScramble,
    getTimerState:()=>timer.state,
    getCompetitionSettings:()=>({...competitionSettings}),
    getEffectiveTime
  });

  localStorage.setItem(EVENT_KEY,currentEvent);
  renderEventSelect();renderSessionSelect();applyCompetitionUiState();applyLanguage();createNewScramble();
})();
