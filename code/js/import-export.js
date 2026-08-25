(() => {
  'use strict';

  const KEYS = [
    // Core timer data and current event selection.
    'rubiksCubeTimerHistoryV1','rubiksCubeTimerPuzzleV1','rubiksCubeTimerEventV2','sscHistoryMetricsV1','sscLanguageV1',
    // Current settings and preview state.
    'sscGeneralSettingsV1','sscCubeColorsV1','sscCubePreviewSizeV1','sscPreviewModeV1','sscPreviewInteractiveV1',
    // Session migrations: keep both current and legacy keys in backups.
    'sscSessionsV1','sscActiveSessionV1','sscSessionsByPuzzleV2','sscActiveSessionByPuzzleV2','sscSessionsByEventV3','sscActiveSessionByEventV3',
    // Older appearance keys retained for backwards-compatible imports/exports.
    'sscThemeV1','sscTextSizeV1','sscFontV1','sscPrimaryColorV1'
  ];
  const modal=document.getElementById('importExportModal');
  const openBtn=document.getElementById('importExportButton');
  const closeBtn=document.getElementById('closeImportExport');
  const exportBtn=document.getElementById('exportData');
  const importInput=document.getElementById('importData');
  const status=document.getElementById('importExportStatus');
  if(!modal||!openBtn||!exportBtn||!importInput)return;

  try{localStorage.removeItem('ssc-ui-version');}catch{}

  const isHebrew=()=>document.documentElement.lang==='he';
  const setStatus=(msg,ok=true)=>{if(status){status.textContent=msg;status.style.color=ok?'var(--ready)':'var(--danger)';}};
  const open=()=>{modal.hidden=false;setStatus('');requestAnimationFrame(()=>closeBtn?.focus());};
  const close=()=>{modal.hidden=true;openBtn.focus();};

  function collectStorage(){
    const storage={};
    KEYS.forEach(key=>{
      const value=localStorage.getItem(key);
      if(value!==null)storage[key]=value;
    });
    return storage;
  }

  function restoreSnapshot(snapshot){
    snapshot.forEach((value,key)=>{
      try{
        if(value===null)localStorage.removeItem(key);
        else localStorage.setItem(key,value);
      }catch{}
    });
  }

  function importStorage(storage){
    const entries=Object.entries(storage).filter(([key,value])=>KEYS.includes(key)&&typeof value==='string');
    const snapshot=new Map(entries.map(([key])=>[key,localStorage.getItem(key)]));
    try{
      entries.forEach(([key,value])=>localStorage.setItem(key,value));
    }catch(error){
      restoreSnapshot(snapshot);
      throw error;
    }
  }

  openBtn.addEventListener('click',open);
  closeBtn?.addEventListener('click',close);
  modal.querySelector('[data-close-import-export]')?.addEventListener('click',close);
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    if(!modal.hidden){close();return;}
    if(event.defaultPrevented&&modal.contains(document.activeElement))openBtn.focus();
  });

  exportBtn.addEventListener('click',()=>{
    try{
      const data={version:3,exportedAt:new Date().toISOString(),storage:collectStorage()};
      const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
      const objectUrl=URL.createObjectURL(blob);
      const a=document.createElement('a');
      a.href=objectUrl;
      a.download=`ssc-backup-${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(objectUrl),0);
      setStatus(isHebrew()?'הנתונים יוצאו בהצלחה.':'Data exported successfully.');
    }catch(error){
      console.error('[SSC] Data export failed',error);
      setStatus(isHebrew()?'יצוא הנתונים נכשל.':'Data export failed.',false);
    }
  });

  importInput.addEventListener('change',async()=>{
    const file=importInput.files?.[0];
    if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      if(!parsed||!parsed.storage||typeof parsed.storage!=='object'||Array.isArray(parsed.storage))throw new Error('Invalid format');
      importStorage(parsed.storage);
      setStatus(isHebrew()?'היבוא הושלם. הדף ייטען מחדש...':'Import complete. Reloading...');
      setTimeout(()=>location.reload(),700);
    }catch(error){
      console.error('[SSC] Data import failed',error);
      setStatus(isHebrew()?'קובץ היבוא אינו תקין או שלא ניתן לשמור את הנתונים.':'Invalid import file or data could not be saved.',false);
    }finally{
      importInput.value='';
    }
  });
})();