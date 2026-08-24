(async () => {
  'use strict';

  async function ensureScrambleEngine(){
    if(window.SSCScrambles)return;
    await new Promise((resolve,reject)=>{
      const script=document.createElement('script');
      script.src='./code/js/scramble-generators.js?v=20260824-1';
      script.async=false;
      script.onload=resolve;
      script.onerror=()=>reject(new Error('Unable to load SSC scramble generator engine.'));
      document.head.appendChild(script);
    });
    if(!window.SSCScrambles)throw new Error('SSC scramble generator engine did not initialize.');
  }

  await ensureScrambleEngine();

  const STORAGE_KEY='rubiksCubeTimerHistoryV1';
  const PUZZLE_KEY='rubiksCubeTimerPuzzleV1';
  const EVENT_KEY='rubiksCubeTimerEventV2';
  const HISTORY_SETTINGS_KEY='sscHistoryMetricsV1';
  const LANGUAGE_KEY='sscLanguageV1';
  const LEGACY_SESSIONS_KEY='sscSessionsV1';
  const LEGACY_ACTIVE_SESSION_KEY='sscActiveSessionV1';
  const LEGACY_SESSIONS_BY_PUZZLE_KEY='sscSessionsByPuzzleV2';
  const LEGACY_ACTIVE_BY_PUZZLE_KEY='sscActiveSessionByPuzzleV2';
  const SESSIONS_KEY='sscSessionsByEventV3';
  const ACTIVE_SESSION_KEY='sscActiveSessionByEventV3';

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
      newScramble:'ערבוב חדש',holdHere:'החזק כאן להפעלה',timerAria:'טיימר',
      puzzleSelectorAria:'בחירת קובייה',historyAria:'היסטוריה וסטטיסטיקות',
      sessionSelectAria:'בחירת סשן',historySettingsTitle:'מה להציג בסטטיסטיקות',
      customAo:'Ao מותאם אישית',add:'הוסף',recentSolves:'פתרונות אחרונים',
      emptyHistory:'עדיין אין פתרונות שמורים.',scramble:'ערבוב',
      idle:'החזק Space, המתן לירוק ושחרר להתחלה',holding:'המשך להחזיק...',
      ready:'מוכן — שחרר להתחלה',running:'Space לעצירה',
      saved:'נשמר! החזק Space לפתרון הבא',addSessionPrompt:'שם לסשן החדש:',
      deleteSessionConfirm:'למחוק את הסשן הזה ואת כל הפתרונות שבו?',
      cannotDeleteLastSession:'חייב להישאר לפחות סשן אחד.',
      clearHistoryConfirm:'למחוק את כל הפתרונות בסשן הנוכחי?',
      deleteSolve:'מחק',historySettings:'הגדרות היסטוריה',addSession:'הוסף סשן',
      deleteSession:'מחק סשן',clearHistory:'מחק היסטוריה',remove:'הסר',
      defaultSession:'סשן 1',languageButton:'English',
      generatingScramble:'יוצר ערבוב…',scrambleError:'לא ניתן ליצור ערבוב'
    },
    en:{
      newScramble:'New scramble',holdHere:'Hold here to start',timerAria:'Timer',
      puzzleSelectorAria:'Puzzle selection',historyAria:'History and statistics',
      sessionSelectAria:'Session selection',historySettingsTitle:'Choose statistics to display',
      customAo:'Custom Ao',add:'Add',recentSolves:'Recent solves',
      emptyHistory:'No saved solves yet.',scramble:'Scramble',
      idle:'Hold Space, wait for green, then release to start',holding:'Keep holding...',
      ready:'Ready — release to start',running:'Space to stop',
      saved:'Saved! Hold Space for the next solve',addSessionPrompt:'Name for the new session:',
      deleteSessionConfirm:'Delete this session and all of its solves?',
      cannotDeleteLastSession:'At least one session must remain.',
      clearHistoryConfirm:'Delete all solves in the current session?',
      deleteSolve:'Delete',historySettings:'History settings',addSession:'Add session',
      deleteSession:'Delete session',clearHistory:'Clear history',remove:'Remove',
      defaultSession:'Session 1',languageButton:'עברית',
      generatingScramble:'Generating scramble…',scrambleError:'Unable to generate scramble'
    }
  };

  const els={
    timer:document.getElementById('timer'),
    status:document.getElementById('status'),
    scramble:document.getElementById('scramble'),
    touchTimer:document.getElementById('touchTimer'),
    historyList:document.getElementById('historyList'),
    emptyHistory:document.getElementById('emptyHistory'),
    solveCount:document.getElementById('solveCount'),
    scrambleLabel:document.getElementById('scrambleLabel'),
    statsGrid:document.getElementById('statsGrid'),
    historySettings:document.getElementById('historySettings'),
    historySettingsButton:document.getElementById('historySettingsButton'),
    historyMetricOptions:document.getElementById('historyMetricOptions'),
    customAoInput:document.getElementById('customAoInput'),
    addCustomAo:document.getElementById('addCustomAo'),
    sessionSelect:document.getElementById('sessionSelect'),
    addSession:document.getElementById('addSession'),
    deleteSession:document.getElementById('deleteSession'),
    languageToggle:document.getElementById('languageToggle'),
    cubePreview2D:document.getElementById('cubePreview2D')
  };

  function t(key){return I18N[currentLanguage][key]||key;}
  function formatTime(ms){return(ms/1000).toFixed(3);}
  function mean(times,count){
    if(times.length<count)return null;
    const sample=times.slice(0,count);
    return sample.reduce((a,b)=>a+b,0)/sample.length;
  }
  function trimmedAverage(times,count){
    if(times.length<count)return null;
    const sample=times.slice(0,count);
    const sorted=[...sample].sort((a,b)=>a-b);
    if(count<5)return mean(times,count);
    const trim=Math.ceil(count*.05);
    const trimmed=sorted.slice(trim,sorted.length-trim);
    return trimmed.length?trimmed.reduce((a,b)=>a+b,0)/trimmed.length:null;
  }

  function legacyPuzzleName(eventId){
    if(eventId==='222')return'2x2';
    if(eventId==='333')return'3x3';
    return window.SSCScrambles.getEvent(eventId)?.puzzleId||eventId;
  }

  function normalizeStoredSolve(solve){
    const eventId=window.SSCScrambles.normalizeEventId(
      solve.eventId||solve.puzzleId||solve.puzzle||'3x3'
    )||'333';
    const event=window.SSCScrambles.getEvent(eventId);
    return {
      ...solve,
      eventId,
      puzzleId:solve.puzzleId||event?.puzzleId||'3x3x3',
      puzzle:solve.puzzle||legacyPuzzleName(eventId),
      sessionId:solve.sessionId||'session-1'
    };
  }

  function getHistory(){
    try{
      return (JSON.parse(localStorage.getItem(STORAGE_KEY))||[]).map(normalizeStoredSolve);
    }catch{
      return[];
    }
  }
  function setHistory(history){localStorage.setItem(STORAGE_KEY,JSON.stringify(history));}
  function addSolve(timeMs,scramble){
    const history=getHistory();
    const event=window.SSCScrambles.getEvent(currentEvent);
    history.unshift({
      id:(crypto.randomUUID?crypto.randomUUID():`${Date.now()}-${Math.random()}`),
      timeMs:Math.round(timeMs),
      eventId:currentEvent,
      puzzleId:event?.puzzleId||currentEvent,
      puzzle:legacyPuzzleName(currentEvent),
      scramble,
      sessionId:currentSessionId,
      createdAt:new Date().toISOString()
    });
    setHistory(history);
  }
  function deleteSolve(id){setHistory(getHistory().filter(solve=>solve.id!==id));}
  function defaultSession(){return{id:'session-1',name:I18N.he.defaultSession};}
  function cloneSessions(list){
    return Array.isArray(list)&&list.length?list.map(s=>({...s})):[defaultSession()];
  }

  function getSessionsByEvent(){
    try{
      const parsed=JSON.parse(localStorage.getItem(SESSIONS_KEY));
      if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))return parsed;
    }catch{}

    let legacyByPuzzle={};
    try{
      const parsed=JSON.parse(localStorage.getItem(LEGACY_SESSIONS_BY_PUZZLE_KEY));
      if(parsed&&typeof parsed==='object')legacyByPuzzle=parsed;
    }catch{}

    let legacySessions=null;
    try{
      const parsed=JSON.parse(localStorage.getItem(LEGACY_SESSIONS_KEY));
      if(Array.isArray(parsed)&&parsed.length)legacySessions=parsed;
    }catch{}

    const base=legacySessions||[defaultSession()];
    const migrated={
      '333':cloneSessions(legacyByPuzzle['3x3']||base),
      '222':cloneSessions(legacyByPuzzle['2x2']||base)
    };
    localStorage.setItem(SESSIONS_KEY,JSON.stringify(migrated));
    return migrated;
  }

  function getActiveSessions(){
    try{
      const parsed=JSON.parse(localStorage.getItem(ACTIVE_SESSION_KEY));
      if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed))return parsed;
    }catch{}

    let legacyByPuzzle={};
    try{
      const parsed=JSON.parse(localStorage.getItem(LEGACY_ACTIVE_BY_PUZZLE_KEY));
      if(parsed&&typeof parsed==='object')legacyByPuzzle=parsed;
    }catch{}

    const legacy=localStorage.getItem(LEGACY_ACTIVE_SESSION_KEY);
    const migrated={
      '333':legacyByPuzzle['3x3']||legacy||null,
      '222':legacyByPuzzle['2x2']||legacy||null
    };
    localStorage.setItem(ACTIVE_SESSION_KEY,JSON.stringify(migrated));
    return migrated;
  }

  function saveSessions(){
    sessionsByEvent[currentEvent]=sessions;
    localStorage.setItem(SESSIONS_KEY,JSON.stringify(sessionsByEvent));
  }
  function saveActiveSession(){
    activeSessionByEvent[currentEvent]=currentSessionId;
    localStorage.setItem(ACTIVE_SESSION_KEY,JSON.stringify(activeSessionByEvent));
  }
  function ensureCurrentSession(){
    sessions=sessionsByEvent[currentEvent];
    if(!Array.isArray(sessions)||!sessions.length){
      sessions=[defaultSession()];
      sessionsByEvent[currentEvent]=sessions;
      saveSessions();
    }
    currentSessionId=activeSessionByEvent[currentEvent];
    if(!sessions.some(s=>s.id===currentSessionId))currentSessionId=sessions[0].id;
    saveActiveSession();
  }
  function createSession(name){
    const id=(crypto.randomUUID?crypto.randomUUID():`${currentEvent}-session-${Date.now()}-${Math.random()}`);
    sessions.push({id,name});
    saveSessions();
    currentSessionId=id;
    saveActiveSession();
    renderSessionSelect();
    renderHistory();
  }
  function deleteCurrentSession(){
    if(sessions.length<=1){alert(t('cannotDeleteLastSession'));return;}
    if(!confirm(t('deleteSessionConfirm')))return;
    setHistory(getHistory().filter(
      s=>!(s.eventId===currentEvent&&s.sessionId===currentSessionId)
    ));
    sessions=sessions.filter(s=>s.id!==currentSessionId);
    sessionsByEvent[currentEvent]=sessions;
    saveSessions();
    currentSessionId=sessions[0].id;
    saveActiveSession();
    renderSessionSelect();
    renderHistory();
  }
  function renderSessionSelect(){
    els.sessionSelect.innerHTML='';
    sessions.forEach(session=>{
      const option=document.createElement('option');
      option.value=session.id;
      option.textContent=session.name;
      option.selected=session.id===currentSessionId;
      els.sessionSelect.appendChild(option);
    });
  }

  function getMetricSettings(){
    const fallback={selected:['best','mo3','ao5','ao12'],custom:[]};
    try{
      const parsed=JSON.parse(localStorage.getItem(HISTORY_SETTINGS_KEY));
      if(!parsed||!Array.isArray(parsed.selected)||!Array.isArray(parsed.custom))return fallback;
      return{
        selected:parsed.selected,
        custom:parsed.custom.filter(n=>Number.isInteger(n)&&n>=3&&n<=100000)
      };
    }catch{
      return fallback;
    }
  }
  function saveMetricSettings(settings){
    localStorage.setItem(HISTORY_SETTINGS_KEY,JSON.stringify(settings));
  }
  let metricSettings=getMetricSettings();

  function eventShortLabel(eventId){
    const labels={
      '222':'2×2','333':'3×3','444':'4×4','555':'5×5','666':'6×6','777':'7×7',
      '333bf':'3BLD','333fm':'FMC','333oh':'OH','clock':'CLOCK','minx':'MEGA',
      'pyram':'PYRA','skewb':'SKEWB','sq1':'SQ-1','444bf':'4BLD','555bf':'5BLD',
      '333mbf':'MBLD','fto':'FTO'
    };
    return labels[eventId]||window.SSCScrambles.getEvent(eventId)?.name||eventId;
  }
  function showScramble(scramble,eventId=currentEvent){
    els.scramble.textContent=scramble;
    window.SSCCubePreview?.render(els.cubePreview2D,scramble,eventId);
  }
  function updatePuzzleUI(){
    els.scrambleLabel.textContent=`${t('scramble')} ${eventShortLabel(currentEvent)}`;
    document.querySelectorAll('.puzzle-btn').forEach(btn=>{
      const eventId=window.SSCScrambles.normalizeEventId(btn.dataset.event||btn.dataset.puzzle);
      btn.classList.toggle('active',eventId===currentEvent);
    });
  }

  function metricCurrent(metric,times){
    if(!times.length)return null;
    if(metric.type==='best')return times[0];
    if(metric.type==='mean')return mean(times,metric.count);
    return trimmedAverage(times,metric.count);
  }
  function metricBest(metric,times){
    if(!times.length)return null;
    if(metric.type==='best')return Math.min(...times);
    if(times.length<metric.count)return null;
    let best=null;
    for(let i=0;i<=times.length-metric.count;i++){
      const sample=times.slice(i,i+metric.count);
      const value=metric.type==='mean'
        ?mean(sample,metric.count)
        :trimmedAverage(sample,metric.count);
      if(value!==null&&(best===null||value<best))best=value;
    }
    return best;
  }
  function renderMetricSettings(){
    els.historyMetricOptions.innerHTML='';
    const all=[
      ...METRICS,
      ...metricSettings.custom.map(count=>({
        id:`custom-${count}`,label:`Ao${count}`,type:'ao',count,custom:true
      }))
    ];
    all.forEach(metric=>{
      const item=document.createElement('label');
      item.className='metric-option';
      const checked=metricSettings.selected.includes(metric.id);
      item.innerHTML=`<input type="checkbox" ${checked?'checked':''}><span>${metric.label}</span>${metric.custom?`<button class="remove-custom" type="button" title="${t('remove')}">×</button>`:''}`;
      const checkbox=item.querySelector('input');
      checkbox.addEventListener('change',()=>{
        if(checkbox.checked){
          if(!metricSettings.selected.includes(metric.id))metricSettings.selected.push(metric.id);
        }else{
          metricSettings.selected=metricSettings.selected.filter(id=>id!==metric.id);
        }
        saveMetricSettings(metricSettings);
        renderStats();
      });
      const remove=item.querySelector('.remove-custom');
      if(remove)remove.addEventListener('click',event=>{
        event.preventDefault();
        event.stopPropagation();
        metricSettings.custom=metricSettings.custom.filter(n=>n!==metric.count);
        metricSettings.selected=metricSettings.selected.filter(id=>id!==metric.id);
        saveMetricSettings(metricSettings);
        renderMetricSettings();
        renderStats();
      });
      els.historyMetricOptions.appendChild(item);
    });
  }

  function currentSessionHistory(){
    return getHistory().filter(
      solve=>solve.eventId===currentEvent&&solve.sessionId===currentSessionId
    );
  }
  function renderStats(){
    const history=currentSessionHistory();
    const times=history.map(s=>s.timeMs);
    const customMetrics=metricSettings.custom.map(count=>({
      id:`custom-${count}`,label:`Ao${count}`,type:'ao',count,custom:true
    }));
    const all=[...METRICS,...customMetrics];
    const visible=all.filter(metric=>metricSettings.selected.includes(metric.id));
    els.statsGrid.innerHTML='';
    if(!visible.length){els.statsGrid.hidden=true;return;}
    els.statsGrid.hidden=false;
    const header=document.createElement('div');
    header.className='stats-table-header';
    header.innerHTML=`<span>${currentLanguage==='he'?'מדד':'STAT'}</span><span>${currentLanguage==='he'?'נוכחי':'CURRENT'}</span><span>${currentLanguage==='he'?'שיא':'BEST'}</span>`;
    els.statsGrid.appendChild(header);
    visible.forEach(metric=>{
      const current=metricCurrent(metric,times);
      const best=metricBest(metric,times);
      const row=document.createElement('div');
      row.className='stat';
      row.innerHTML=`<span class="stat-label">${metric.label}</span><strong class="stat-current">${current===null?'—':formatTime(current)}</strong><strong class="stat-best${best===null?' empty':''}">${best===null?'—':formatTime(best)}</strong>`;
      els.statsGrid.appendChild(row);
    });
  }
  function renderHistory(){
    const history=currentSessionHistory();
    els.solveCount.textContent=history.length;
    renderStats();
    els.historyList.innerHTML='';
    if(!history.length){
      els.emptyHistory.hidden=false;
      els.historyList.hidden=true;
      return;
    }
    els.emptyHistory.hidden=true;
    els.historyList.hidden=false;
    const bestSingle=Math.min(...history.map(s=>s.timeMs));
    history.slice(0,8).forEach((solve,index)=>{
      const row=document.createElement('div');
      row.className='solve-row'+(solve.timeMs===bestSingle?' best-solve':'');
      const date=new Date(solve.createdAt);
      const locale=currentLanguage==='he'?'he-IL':'en-US';
      const meta=`${date.toLocaleTimeString(locale,{hour:'2-digit',minute:'2-digit'})} · ${solve.scramble}`;
      row.innerHTML=`<div class="solve-index">${index+1}</div><div class="solve-main"><div class="solve-time">${formatTime(solve.timeMs)}</div><div class="solve-meta"></div></div><button class="delete-solve" type="button" title="${t('deleteSolve')}">×</button>`;
      row.querySelector('.solve-meta').textContent=meta;
      row.querySelector('.delete-solve').addEventListener('click',()=>{
        deleteSolve(solve.id);
        renderHistory();
      });
      els.historyList.appendChild(row);
    });
  }

  class TimerEngine{
    constructor({holdMs=500,onTick,onStateChange,onStop}){
      this.holdMs=holdMs;
      this.onTick=onTick;
      this.onStateChange=onStateChange;
      this.onStop=onStop;
      this.state='idle';
      this.holdTimeout=null;
      this.startTime=0;
      this.animationFrame=null;
    }
    setState(state){this.state=state;this.onStateChange?.(state);}
    press(){
      if(this.state==='running'){this.stop();return;}
      if(this.state!=='idle')return;
      this.setState('holding');
      this.holdTimeout=setTimeout(()=>{
        if(this.state==='holding')this.setState('ready');
      },this.holdMs);
    }
    release(){
      if(this.state==='ready')this.start();
      else if(this.state==='holding')this.cancelHold();
    }
    cancelHold(){
      clearTimeout(this.holdTimeout);
      this.holdTimeout=null;
      if(this.state==='holding')this.setState('idle');
    }
    start(){
      clearTimeout(this.holdTimeout);
      this.holdTimeout=null;
      this.startTime=performance.now();
      this.setState('running');
      this.tick();
    }
    tick=()=>{
      if(this.state!=='running')return;
      this.onTick?.(performance.now()-this.startTime);
      this.animationFrame=requestAnimationFrame(this.tick);
    };
    stop(){
      if(this.state!=='running')return;
      const elapsed=performance.now()-this.startTime;
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame=null;
      this.setState('idle');
      this.onStop?.(elapsed);
    }
  }

  function setTimerState(state){
    els.timer.className=state==='idle'?'':state;
    els.status.textContent=t(state);
  }

  const storedEvent=localStorage.getItem(EVENT_KEY);
  const legacyPuzzle=localStorage.getItem(PUZZLE_KEY);
  let currentLanguage=localStorage.getItem(LANGUAGE_KEY)==='en'?'en':'he';
  let currentEvent=window.SSCScrambles.normalizeEventId(storedEvent||legacyPuzzle||'333')||'333';
  let sessionsByEvent=getSessionsByEvent();
  let activeSessionByEvent=getActiveSessions();
  let sessions=sessionsByEvent[currentEvent];
  let currentSessionId=null;
  let currentScramble='';
  let scrambleRequestId=0;
  ensureCurrentSession();

  function applyLanguage(){
    document.documentElement.lang=currentLanguage;
    document.documentElement.dir=currentLanguage==='he'?'rtl':'ltr';
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      el.textContent=t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(el=>{
      el.setAttribute('aria-label',t(el.dataset.i18nAria));
    });
    els.languageToggle.textContent=t('languageButton');
    els.historySettingsButton.title=t('historySettings');
    els.historySettingsButton.setAttribute('aria-label',t('historySettings'));
    els.addSession.title=t('addSession');
    els.addSession.setAttribute('aria-label',t('addSession'));
    els.deleteSession.title=t('deleteSession');
    els.deleteSession.setAttribute('aria-label',t('deleteSession'));
    document.getElementById('clearHistory').title=t('clearHistory');
    document.getElementById('clearHistory').setAttribute('aria-label',t('clearHistory'));
    updatePuzzleUI();
    setTimerState(timer?.state||'idle');
    renderMetricSettings();
    renderHistory();
  }

  async function createNewScramble(){
    if(timer.state==='running')return;

    const requestId=++scrambleRequestId;
    const requestedEvent=currentEvent;
    currentScramble='';
    els.scramble.setAttribute('aria-busy','true');
    els.scramble.dataset.generating='true';
    if(!els.scramble.textContent.trim()){
      els.scramble.textContent=t('generatingScramble');
    }

    try{
      const scramble=await window.SSCScrambles.generate(requestedEvent);
      if(requestId!==scrambleRequestId||requestedEvent!==currentEvent)return;
      currentScramble=scramble;
      showScramble(scramble,requestedEvent);
    }catch(error){
      if(requestId!==scrambleRequestId||requestedEvent!==currentEvent)return;
      currentScramble='';
      els.scramble.textContent=`${t('scrambleError')}: ${requestedEvent}`;
      console.error(`[SSC] Unable to generate scramble for: ${requestedEvent}`,error);
    }finally{
      if(requestId===scrambleRequestId){
        els.scramble.removeAttribute('aria-busy');
        delete els.scramble.dataset.generating;
      }
    }
  }

  function setEvent(eventId){
    const normalized=window.SSCScrambles.normalizeEventId(eventId);
    if(timer.state==='running'||!normalized||normalized===currentEvent)return;
    currentEvent=normalized;
    localStorage.setItem(EVENT_KEY,currentEvent);

    if(currentEvent==='222')localStorage.setItem(PUZZLE_KEY,'2x2');
    else if(currentEvent==='333')localStorage.setItem(PUZZLE_KEY,'3x3');

    ensureCurrentSession();
    renderSessionSelect();
    updatePuzzleUI();
    renderHistory();
    createNewScramble();
  }

  const timer=new TimerEngine({
    holdMs:500,
    onTick:ms=>{els.timer.textContent=formatTime(ms);},
    onStateChange:state=>{
      setTimerState(state);
      if(state==='running')els.timer.textContent='0.000';
    },
    onStop:elapsed=>{
      els.timer.textContent=formatTime(elapsed);
      els.status.textContent=t('saved');
      addSolve(elapsed,currentScramble);
      renderHistory();
      createNewScramble();
    }
  });

  document.addEventListener('keydown',event=>{
    if(event.code!=='Space'||event.repeat)return;
    event.preventDefault();
    if(timer.state!=='running'&&!currentScramble)return;
    timer.press();
  });
  document.addEventListener('keyup',event=>{
    if(event.code!=='Space')return;
    event.preventDefault();
    timer.release();
  });

  els.touchTimer.addEventListener('pointerdown',event=>{
    event.preventDefault();
    if(timer.state!=='running'&&!currentScramble)return;
    els.touchTimer.setPointerCapture?.(event.pointerId);
    timer.press();
  });
  ['pointerup','pointercancel'].forEach(type=>{
    els.touchTimer.addEventListener(type,event=>{
      event.preventDefault();
      timer.release();
    });
  });

  document.getElementById('newScramble').addEventListener('click',createNewScramble);
  document.querySelectorAll('.puzzle-btn').forEach(btn=>{
    btn.addEventListener('click',()=>setEvent(btn.dataset.event||btn.dataset.puzzle));
  });

  document.getElementById('clearHistory').addEventListener('click',()=>{
    const selected=currentSessionHistory();
    if(!selected.length)return;
    if(confirm(t('clearHistoryConfirm'))){
      setHistory(getHistory().filter(
        s=>!(s.eventId===currentEvent&&s.sessionId===currentSessionId)
      ));
      renderHistory();
    }
  });

  els.sessionSelect.addEventListener('change',()=>{
    currentSessionId=els.sessionSelect.value;
    saveActiveSession();
    renderHistory();
  });
  els.addSession.addEventListener('click',()=>{
    const name=prompt(t('addSessionPrompt'));
    if(name&&name.trim())createSession(name.trim());
  });
  els.deleteSession.addEventListener('click',deleteCurrentSession);
  els.languageToggle.addEventListener('click',()=>{
    currentLanguage=currentLanguage==='he'?'en':'he';
    localStorage.setItem(LANGUAGE_KEY,currentLanguage);
    applyLanguage();
  });
  els.historySettingsButton.addEventListener('click',()=>{
    els.historySettings.hidden=!els.historySettings.hidden;
  });
  els.addCustomAo.addEventListener('click',()=>{
    const count=Number.parseInt(els.customAoInput.value,10);
    if(!Number.isInteger(count)||count<3||count>100000)return;
    if(!metricSettings.custom.includes(count))metricSettings.custom.push(count);
    const id=`custom-${count}`;
    if(!metricSettings.selected.includes(id))metricSettings.selected.push(id);
    metricSettings.custom.sort((a,b)=>a-b);
    saveMetricSettings(metricSettings);
    els.customAoInput.value='';
    renderMetricSettings();
    renderStats();
  });
  els.customAoInput.addEventListener('keydown',event=>{
    if(event.key==='Enter'){
      event.preventDefault();
      els.addCustomAo.click();
    }
  });

  window.SSCEvents=Object.freeze({
    getCurrent:()=>currentEvent,
    setCurrent:setEvent
  });

  renderSessionSelect();
  applyLanguage();
  createNewScramble();
})();