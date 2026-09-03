(() => {
  'use strict';

  const scrambleEl=document.getElementById('scramble');
  const prevButton=document.getElementById('prevScramble');
  if(!scrambleEl||!prevButton)return;

  const backStacks=new Map();
  const currentByEvent=new Map();
  let suppressObserver=false;

  function normalizeEventId(value){return window.SSCScrambles?.normalizeEventId?.(value)||String(value||'333');}
  function currentEvent(){return normalizeEventId(scrambleEl.dataset.eventId||window.SSCTimerEvents?.getCurrent?.()||'333');}
  function stackFor(eventId){if(!backStacks.has(eventId))backStacks.set(eventId,[]);return backStacks.get(eventId);}
  function updateButton(eventId=currentEvent()){prevButton.disabled=stackFor(eventId).length===0;}
  function isTransientText(value){return value.startsWith('Unable to generate scramble')||value.startsWith('לא ניתן ליצור ערבוב')||value==='Generating scramble…'||value==='יוצר ערבוב…';}

  function setScrambleText(value){
    suppressObserver=true;
    scrambleEl.textContent=value;
    queueMicrotask(()=>{suppressObserver=false;});
  }

  const observer=new MutationObserver(()=>{
    const eventId=currentEvent();
    if(suppressObserver||scrambleEl.dataset.scrambleTransient==='true'){updateButton(eventId);return;}
    const next=scrambleEl.textContent.trim();
    if(!next||isTransientText(next)){updateButton(eventId);return;}
    const current=currentByEvent.get(eventId)||'';
    if(next===current){updateButton(eventId);return;}
    if(current)stackFor(eventId).push(current);
    currentByEvent.set(eventId,next);
    updateButton(eventId);
  });
  observer.observe(scrambleEl,{childList:true,characterData:true,subtree:true});

  const initial=scrambleEl.textContent.trim();
  if(scrambleEl.dataset.scrambleTransient!=='true'&&initial&&!isTransientText(initial))currentByEvent.set(currentEvent(),initial);

  prevButton.addEventListener('click',event=>{
    const eventId=currentEvent();
    const stack=stackFor(eventId);
    if(!stack.length)return;
    event.preventDefault();event.stopPropagation();
    const previous=stack.pop();
    currentByEvent.set(eventId,previous);
    scrambleEl.dataset.eventId=eventId;
    scrambleEl.dataset.scrambleTransient='false';
    setScrambleText(previous);
    updateButton(eventId);
    window.dispatchEvent(new CustomEvent('ssc-scramble-history-select',{detail:{scramble:previous,eventId}}));
  },true);

  window.addEventListener('ssc-event-change',event=>{
    const eventId=normalizeEventId(event.detail?.eventId||currentEvent());
    scrambleEl.dataset.eventId=eventId;
    updateButton(eventId);
  });

  updateButton();
})();

(() => {
  'use strict';

  const scramble=document.getElementById('scramble');
  const bar=scramble?.closest('.scramble-bar');
  if(!scramble||!bar)return;

  const MAX_EXTRA_HEIGHT=10;
  const MIN_FONT_SIZE=6;
  const OVERFLOW_EPSILON=.75;
  let rafId=0;
  let fitting=false;

  function setExtraHeight(value){
    const px=Math.max(0,Math.min(MAX_EXTRA_HEIGHT,Number(value)||0));
    bar.style.setProperty('--scramble-extra-height',`${px}px`);
    bar.classList.toggle('scramble-expanded',px>=MAX_EXTRA_HEIGHT);
    scramble.dataset.fitExtraHeight=String(px);
  }

  function overflows(){
    return scramble.scrollHeight>scramble.clientHeight+OVERFLOW_EPSILON
      ||scramble.scrollWidth>scramble.clientWidth+OVERFLOW_EPSILON;
  }

  function fitScramble(){
    rafId=0;
    if(fitting||!scramble.isConnected)return;
    fitting=true;

    try{
      scramble.style.removeProperty('font-size');
      bar.classList.remove('scramble-expanded');
      setExtraHeight(0);
      void scramble.offsetHeight;

      const baseFontSize=parseFloat(getComputedStyle(scramble).fontSize)||27;
      scramble.dataset.fitBaseFontSize=baseFontSize.toFixed(2);

      if(!overflows()){
        delete scramble.dataset.fitReducedFont;
        return;
      }

      const verticalShortage=Math.max(0,Math.ceil(scramble.scrollHeight-scramble.clientHeight));
      const extraHeight=Math.min(MAX_EXTRA_HEIGHT,verticalShortage||MAX_EXTRA_HEIGHT);
      setExtraHeight(extraHeight);
      void scramble.offsetHeight;

      if(!overflows()){
        delete scramble.dataset.fitReducedFont;
        return;
      }

      let low=MIN_FONT_SIZE;
      let high=baseFontSize;
      scramble.style.fontSize=`${low}px`;
      void scramble.offsetHeight;

      // In unusually narrow layouts keep reducing slightly below the normal
      // safety floor so the scramble still never needs its own scrollbar.
      while(overflows()&&low>4){
        low=Math.max(4,low-.5);
        scramble.style.fontSize=`${low}px`;
        void scramble.offsetHeight;
      }

      if(!overflows()){
        for(let step=0;step<12;step+=1){
          const mid=(low+high)/2;
          scramble.style.fontSize=`${mid}px`;
          void scramble.offsetHeight;
          if(overflows())high=mid;
          else low=mid;
        }
        scramble.style.fontSize=`${Math.max(4,low-.05).toFixed(2)}px`;
      }

      scramble.dataset.fitReducedFont=scramble.style.fontSize||`${low}px`;
    }finally{
      fitting=false;
    }
  }

  function scheduleFit(){
    if(rafId)cancelAnimationFrame(rafId);
    rafId=requestAnimationFrame(fitScramble);
  }

  const textObserver=new MutationObserver(scheduleFit);
  textObserver.observe(scramble,{childList:true,characterData:true,subtree:true});

  window.addEventListener('resize',scheduleFit,{passive:true});
  window.addEventListener('orientationchange',scheduleFit,{passive:true});
  window.addEventListener('ssc-event-change',scheduleFit);
  window.addEventListener('ssc-general-settings-change',scheduleFit);
  window.addEventListener('ssc-scramble-history-select',scheduleFit);
  document.getElementById('languageSelect')?.addEventListener('change',scheduleFit);

  if(document.fonts?.ready)document.fonts.ready.then(scheduleFit).catch(()=>{});
  scheduleFit();

  window.SSCScrambleFit=Object.freeze({fit:fitScramble,schedule:scheduleFit});
})();

(() => {
  'use strict';
  const historyList=document.getElementById('historyList');
  const historySettingsButton=document.getElementById('historySettingsButton');
  const historySettings=document.getElementById('historySettings');
  function isMbld(){return window.SSCTimerEvents?.getCurrent?.()==='333mbf';}
  function syncMbldHistoryGuards(){
    const active=isMbld();
    if(historySettingsButton)historySettingsButton.hidden=active;
    if(historySettings&&active)historySettings.hidden=true;
    if(active)historyList?.querySelectorAll('[data-mbld-delete]').forEach(button=>button.remove());
  }
  const observer=historyList?new MutationObserver(syncMbldHistoryGuards):null;
  observer?.observe(historyList,{childList:true,subtree:true});
  window.addEventListener('ssc-event-change',syncMbldHistoryGuards);
  window.addEventListener('ssc-mbld-result-saved',syncMbldHistoryGuards);
  syncMbldHistoryGuards();
})();
