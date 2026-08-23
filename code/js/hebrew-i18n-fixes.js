(() => {
  const isHebrew=()=>document.documentElement.lang==='he'||document.documentElement.dir==='rtl';
  const setText=(selector,he,en)=>{
    document.querySelectorAll(selector).forEach(el=>{
      const next=isHebrew()?he:en;
      if(el.textContent!==next)el.textContent=next;
    });
  };
  const translate=()=>{
    setText('#generalSettingsButton span','הגדרות','SETTINGS');
    setText('#importExportButton span','יבוא / יצוא','IMPORT / EXPORT');
    setText('.eyebrow-inline','אירוע','EVENT');
    setText('.section-title','סטטיסטיקות','STATISTICS');
    setText('.history-section-head > span','זמנים','TIMES');

    document.querySelectorAll('.stat-label').forEach(el=>{
      if(isHebrew()&&el.textContent==='Single')el.textContent='יחיד';
      else if(!isHebrew()&&el.textContent==='יחיד')el.textContent='Single';
    });

    const modalTitle=document.querySelector('#importExportModal .settings-dialog-head h2');
    if(modalTitle)modalTitle.textContent=isHebrew()?'יבוא / יצוא':'Import / Export';
    const exportLabel=document.querySelector('#exportData span');
    if(exportLabel)exportLabel.textContent=isHebrew()?'יצוא נתונים':'Export data';
    const importLabel=document.querySelector('#importExportModal .file-label span');
    if(importLabel)importLabel.textContent=isHebrew()?'יבוא נתונים':'Import data';
  };

  translate();
  const observer=new MutationObserver(()=>translate());
  observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang','dir']});
  const stats=document.getElementById('statsGrid');
  if(stats)observer.observe(stats,{childList:true,subtree:true});
})();
