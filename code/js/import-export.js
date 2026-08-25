(() => {
  'use strict';

  const APP='SSC';
  const BACKUP_VERSION=1;
  const HISTORY_KEY='rubiksCubeTimerHistoryV1';
  const SESSIONS_KEY='sscSessionsByEventV3';
  const ACTIVE_KEY='sscActiveSessionByEventV3';
  const CUSTOM_TAGS_KEY='sscCustomTagsV1';
  const EVENT_KEY='rubiksCubeTimerEventV2';
  const GENERAL_SETTINGS_KEY='sscGeneralSettingsV1';
  const VALID_PENALTIES=new Set(['OK','+2','DNF']);
  const KEYS=[
    'rubiksCubeTimerHistoryV1','rubiksCubeTimerPuzzleV1','rubiksCubeTimerEventV2','sscHistoryMetricsV1','sscLanguageV1',
    'sscGeneralSettingsV1','sscCubeColorsV1','sscCubePreviewSizeV1','sscPreviewModeV1','sscPreviewInteractiveV1','sscCustomTagsV1',
    'sscSessionsV1','sscActiveSessionV1','sscSessionsByPuzzleV2','sscActiveSessionByPuzzleV2','sscSessionsByEventV3','sscActiveSessionByEventV3',
    'sscThemeV1','sscTextSizeV1','sscFontV1','sscPrimaryColorV1','sscTrainingStateV1','sscTrainingGoalsV1'
  ];

  const modal=document.getElementById('importExportModal');
  const openBtn=document.getElementById('importExportButton');
  const closeBtn=document.getElementById('closeImportExport');
  const exportBtn=document.getElementById('exportData');
  const importInput=document.getElementById('importData');
  const status=document.getElementById('importExportStatus');
  if(!modal||!openBtn||!exportBtn||!importInput)return;

  const isHebrew=()=>document.documentElement.lang==='he';
  const text=(he,en)=>isHebrew()?he:en;
  const setStatus=(msg,ok=true)=>{if(status){status.textContent=msg;status.style.color=ok?'var(--ready)':'var(--danger)';}};
  const safeJson=(value,fallback)=>{try{return JSON.parse(value);}catch{return fallback;}};
  const download=(name,content,type)=>{const blob=new Blob([content],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),0);};
  const open=()=>{modal.hidden=false;setStatus('');requestAnimationFrame(()=>closeBtn?.focus());};
  const close=()=>{modal.hidden=true;openBtn.focus();};

  function collectStorage(){const storage={};KEYS.forEach(key=>{const value=localStorage.getItem(key);if(value!==null)storage[key]=value;});return storage;}
  function currentBackup(){
    const storage=collectStorage();
    return{app:APP,version:1,backupVersion:BACKUP_VERSION,exportedAt:new Date().toISOString(),sessions:safeJson(storage[SESSIONS_KEY],{}),solves:safeJson(storage[HISTORY_KEY],[]),settings:safeJson(storage[GENERAL_SETTINGS_KEY],{}),customTags:safeJson(storage[CUSTOM_TAGS_KEY],[]),training:safeJson(storage.sscTrainingStateV1,{}),goals:safeJson(storage.sscTrainingGoalsV1,[]),activeSessions:safeJson(storage[ACTIVE_KEY],{}),currentEvent:storage[EVENT_KEY]||'333',storage};
  }

  function validDate(value){return typeof value==='string'&&!Number.isNaN(new Date(value).getTime());}
  function validateSolve(s,index){
    if(!s||typeof s!=='object'||Array.isArray(s))throw new Error(`Solve ${index+1} is not an object`);
    if(typeof s.id!=='string'||!s.id.trim())throw new Error(`Solve ${index+1} has invalid ID`);
    if(s.penalty!==undefined&&!VALID_PENALTIES.has(s.penalty))throw new Error(`Solve ${index+1} has invalid penalty`);
    const raw=Number(s.rawTimeMs??s.timeMs??(Number(s.rawTime)*1000));if(!Number.isFinite(raw)||raw<0)throw new Error(`Solve ${index+1} has invalid time`);
    const date=s.createdAt||s.date;if(date!==undefined&&!validDate(date))throw new Error(`Solve ${index+1} has invalid timestamp`);
    if(s.tags!==undefined&&(!Array.isArray(s.tags)||s.tags.some(tag=>typeof tag!=='string')) )throw new Error(`Solve ${index+1} has invalid tags`);
    if(s.note!==undefined&&typeof s.note!=='string')throw new Error(`Solve ${index+1} has invalid note`);
  }
  function validateSessions(sessions){
    if(!sessions||typeof sessions!=='object'||Array.isArray(sessions))throw new Error('Missing or invalid sessions');
    for(const [eventId,list] of Object.entries(sessions)){if(!eventId||!Array.isArray(list))throw new Error('Invalid sessions format');const ids=new Set();for(const session of list){if(!session||typeof session!=='object'||typeof session.id!=='string'||!session.id.trim())throw new Error('Invalid session');if(ids.has(session.id))throw new Error('Duplicate session ID');ids.add(session.id);}}
  }
  function validateBackup(data){
    if(!data||typeof data!=='object'||Array.isArray(data))throw new Error('Invalid JSON root');
    if(data.app!==APP)throw new Error('Wrong app identifier');
    if(data.backupVersion!==BACKUP_VERSION)throw new Error('Unsupported backup version');
    if(!Array.isArray(data.solves))throw new Error('Missing solves');
    validateSessions(data.sessions);const ids=new Set();data.solves.forEach((s,i)=>{validateSolve(s,i);if(ids.has(s.id))throw new Error('Duplicate solve ID');ids.add(s.id);});
    if(data.customTags!==undefined&&(!Array.isArray(data.customTags)||data.customTags.some(v=>typeof v!=='string')))throw new Error('Invalid custom tags');
    return true;
  }

  function snapshot(){return new Map(KEYS.map(key=>[key,localStorage.getItem(key)]));}
  function restoreSnapshot(snap){for(const [key,value] of snap){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}}
  function applyBackup(data){
    const snap=snapshot();
    try{
      const storage=data.storage&&typeof data.storage==='object'&&!Array.isArray(data.storage)?data.storage:{};
      for(const key of KEYS){if(Object.prototype.hasOwnProperty.call(storage,key)&&typeof storage[key]==='string')localStorage.setItem(key,storage[key]);}
      localStorage.setItem(HISTORY_KEY,JSON.stringify(data.solves));
      localStorage.setItem(SESSIONS_KEY,JSON.stringify(data.sessions));
      localStorage.setItem(CUSTOM_TAGS_KEY,JSON.stringify(data.customTags||[]));
      if(data.activeSessions&&typeof data.activeSessions==='object')localStorage.setItem(ACTIVE_KEY,JSON.stringify(data.activeSessions));
      if(data.settings&&typeof data.settings==='object')localStorage.setItem(GENERAL_SETTINGS_KEY,JSON.stringify(data.settings));
      if(typeof data.currentEvent==='string')localStorage.setItem(EVENT_KEY,data.currentEvent);
    }catch(error){restoreSnapshot(snap);throw error;}
  }

  function csvEscape(value){const textValue=String(value??'');return /[",\n\r]/.test(textValue)?`"${textValue.replace(/"/g,'""')}"`:textValue;}
  function exportSessionCsv(){
    const advanced=window.SSCAdvanced;const solves=advanced?.getCurrentHistory?.()||[];const sessions=safeJson(localStorage.getItem(SESSIONS_KEY),{});const eventId=localStorage.getItem(EVENT_KEY)||'333';const active=safeJson(localStorage.getItem(ACTIVE_KEY),{});const sessionId=active[eventId]||sessions[eventId]?.[0]?.id||'session-1';const sessionName=sessions[eventId]?.find(s=>s.id===sessionId)?.name||sessionId;
    const columns=['ID','Event','Session','Date','Raw Time','Penalty','Final Time','Scramble','Tags','Note'];
    const rows=solves.map(s=>{const n=advanced?.normalizeSolve?.(s)||s;const final=advanced?.effective?.(n);return[n.id,n.eventId||eventId,sessionName,n.createdAt||n.date||'',Number(n.rawTimeMs||n.timeMs||0)/1000,n.penalty||'OK',Number.isFinite(final)?(final/1000).toFixed(3):'DNF',n.scramble||'',(n.tags||[]).join('|'),n.note||''];});
    const csv='\uFEFF'+[columns,...rows].map(row=>row.map(csvEscape).join(',')).join('\r\n');download(`ssc-${eventId}-${new Date().toISOString().slice(0,10)}.csv`,csv,'text/csv;charset=utf-8');setStatus(text('ה־CSV יוצא בהצלחה.','CSV exported successfully.'));
  }

  openBtn.addEventListener('click',open);closeBtn?.addEventListener('click',close);modal.querySelector('[data-close-import-export]')?.addEventListener('click',close);
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!modal.hidden){close();}});

  exportBtn.textContent=text('ייצוא גיבוי מלא','Export Full Backup');
  exportBtn.addEventListener('click',()=>{try{const data=currentBackup();download(`ssc-backup-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(data,null,2),'application/json');setStatus(text('הגיבוי המלא יוצא בהצלחה.','Full backup exported successfully.'));}catch(error){console.error('[SSC] Backup export failed',error);setStatus(text('ייצוא הגיבוי נכשל.','Backup export failed.'),false);}});

  const fileLabel=importInput.closest('label');if(fileLabel){fileLabel.childNodes[0].textContent=text('שחזור גיבוי ','Restore Backup ');}
  importInput.addEventListener('change',async()=>{const file=importInput.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());validateBackup(parsed);if(!confirm(text('לשחזר את הגיבוי הזה? הנתונים הנוכחיים של SSC יוחלפו.','Restore this backup? Your current SSC data will be replaced.')))return;applyBackup(parsed);setStatus(text('השחזור הושלם. טוען מחדש...','Restore complete. Reloading...'));setTimeout(()=>location.reload(),350);}catch(error){console.error('[SSC] Restore rejected',error);setStatus(`${text('השחזור נדחה:','Restore rejected:')} ${error.message}`,false);}finally{importInput.value='';}});

  const grid=modal.querySelector('.import-export-grid');if(grid&&!document.getElementById('exportSessionCsv')){const csv=document.createElement('button');csv.id='exportSessionCsv';csv.className='toolbar-button wide';csv.type='button';csv.textContent=text('ייצוא סשן CSV','Export Session CSV');csv.addEventListener('click',exportSessionCsv);grid.insertBefore(csv,status);}

  if(!document.querySelector('link[rel="manifest"]')){const manifest=document.createElement('link');manifest.rel='manifest';manifest.href='./manifest.webmanifest?v=1';document.head.appendChild(manifest);}
  if(!document.querySelector('meta[name="theme-color"]')){const meta=document.createElement('meta');meta.name='theme-color';meta.content='#111827';document.head.appendChild(meta);}
  if(!document.querySelector('script[data-ssc-advanced]')){const script=document.createElement('script');script.src='./code/js/advanced-features.js?v=20260825-1';script.defer=true;script.dataset.sscAdvanced='1';document.body.appendChild(script);}

  if('serviceWorker' in navigator){
    window.addEventListener('load',async()=>{try{const registration=await navigator.serviceWorker.register('./sw.js',{scope:'./'});registration.addEventListener('updatefound',()=>{const worker=registration.installing;if(!worker)return;worker.addEventListener('statechange',()=>{if(worker.state==='installed'&&navigator.serviceWorker.controller)showUpdate(registration);});});}catch(error){console.warn('[SSC] Service worker registration failed',error);}});
  }
  function showUpdate(registration){if(document.getElementById('sscUpdateBanner'))return;const box=document.createElement('div');box.id='sscUpdateBanner';box.className='ssc-update-banner';box.innerHTML=`<span>${text('קיים עדכון','Update available')}</span><button type="button">${text('עדכן עכשיו','Update now')}</button>`;box.querySelector('button').addEventListener('click',()=>{const waiting=registration.waiting;if(waiting){waiting.postMessage({type:'SKIP_WAITING'});navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});}});document.body.appendChild(box);}
})();
