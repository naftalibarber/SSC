(() => {
  const SETTINGS_KEY='sscGeneralSettingsV1';

  function precision(){
    try{
      return JSON.parse(localStorage.getItem(SETTINGS_KEY))?.timePrecision===2 ? 2 : 3;
    }catch{
      return 3;
    }
  }

  function formatElement(el){
    if(!el)return;
    const text=el.textContent.trim();
    if(!/^\d+\.\d{2,3}$/.test(text))return;

    const value=Number(text);
    if(!Number.isFinite(value))return;

    const formatted=value.toFixed(precision());
    if(text!==formatted){
      el.textContent=formatted;
    }
  }

  function refresh(){
    formatElement(document.getElementById('timer'));
    document.querySelectorAll('.solve-time,.stat-current,.stat-best,.quick-stats strong').forEach(formatElement);
  }

  let scheduled=false;
  const observer=new MutationObserver(()=>{
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(()=>{
      scheduled=false;
      refresh();
    });
  });

  observer.observe(document.body,{subtree:true,childList:true,characterData:true});
  window.addEventListener('ssc-time-precision-change',refresh);
  refresh();
})();