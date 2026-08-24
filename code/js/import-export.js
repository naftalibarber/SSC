(() => {
  const KEYS = [
    'rubiksCubeTimerHistoryV1','rubiksCubeTimerPuzzleV1','sscHistoryMetricsV1','sscLanguageV1',
    'sscSessionsV1','sscActiveSessionV1','sscSessionsByPuzzleV2','sscActiveSessionByPuzzleV2',
    'sscThemeV1','sscTextSizeV1','sscFontV1','sscPrimaryColorV1'
  ];
  const modal=document.getElementById('importExportModal');
  const openBtn=document.getElementById('importExportButton');
  const closeBtn=document.getElementById('closeImportExport');
  const exportBtn=document.getElementById('exportData');
  const importInput=document.getElementById('importData');
  const status=document.getElementById('importExportStatus');
  if(!modal||!openBtn||!exportBtn||!importInput)return;
  const setStatus=(msg,ok=true)=>{if(status){status.textContent=msg;status.style.color=ok?'var(--ready)':'var(--danger)';}};
  const open=()=>{modal.hidden=false;setStatus('');};
  const close=()=>{modal.hidden=true;};
  openBtn.addEventListener('click',open);
  closeBtn?.addEventListener('click',close);
  modal.querySelector('[data-close-import-export]')?.addEventListener('click',close);
  exportBtn.addEventListener('click',()=>{
    const data={version:1,exportedAt:new Date().toISOString(),storage:{}};
    KEYS.forEach(key=>{const value=localStorage.getItem(key);if(value!==null)data.storage[key]=value;});
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
    const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`ssc-backup-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(a.href);
    setStatus(document.documentElement.lang==='he'?'הנתונים יוצאו בהצלחה.':'Data exported successfully.');
  });
  importInput.addEventListener('change',async()=>{
    const file=importInput.files?.[0];if(!file)return;
    try{
      const parsed=JSON.parse(await file.text());
      if(!parsed||typeof parsed.storage!=='object')throw new Error('Invalid format');
      Object.entries(parsed.storage).forEach(([key,value])=>{if(KEYS.includes(key)&&typeof value==='string')localStorage.setItem(key,value);});
      setStatus(document.documentElement.lang==='he'?'היבוא הושלם. הדף ייטען מחדש...':'Import complete. Reloading...');
      setTimeout(()=>location.reload(),700);
    }catch(error){setStatus(document.documentElement.lang==='he'?'קובץ היבוא אינו תקין.':'Invalid import file.',false);}finally{importInput.value='';}
  });
})();