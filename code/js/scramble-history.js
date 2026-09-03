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
  const ABSOLUTE_MIN_FONT_SIZE=4;
  const OVERFLOW_EPSILON=.75;
  let rafId=0;
  let fitting=false;
  let baseBarHeight=0;
  let baseScrambleMaxHeight=0;

  function forceNoScroll(){
    scramble.style.setProperty('overflow','hidden','important');
    scramble.style.setProperty('overflow-x','hidden','important');
    scramble.style.setProperty('overflow-y','hidden','important');
    scramble.style.setProperty('scrollbar-width','none','important');
    scramble.style.setProperty('overscroll-behavior','none','important');
  }

  function setExtraHeight(value){
    const px=Math.max(0,Math.min(MAX_EXTRA_HEIGHT,Number(value)||0));
    bar.style.setProperty('--scramble-extra-height',`${px}px`);
    if(baseBarHeight>0)bar.style.setProperty('min-height',`${baseBarHeight+px}px`,'important');
    if(baseScrambleMaxHeight>0)scramble.style.setProperty('max-height',`${baseScrambleMaxHeight+px}px`,'important');
    bar.classList.toggle('scramble-expanded',px>=MAX_EXTRA_HEIGHT);
    scramble.dataset.fitExtraHeight=String(px);
  }

  function setFontSize(px){
    scramble.style.setProperty('font-size',`${px}px`,'important');
  }

  function overflows(){
    return scramble.scrollHeight>scramble.clientHeight+OVERFLOW_EPSILON
      ||scramble.scrollWidth>scramble.clientWidth+OVERFLOW_EPSILON;
  }

  function resetForMeasurement(){
    scramble.style.removeProperty('font-size');
    scramble.style.removeProperty('max-height');
    bar.style.removeProperty('min-height');
    bar.classList.remove('scramble-expanded');
    bar.style.setProperty('--scramble-extra-height','0px');
    forceNoScroll();
    void scramble.offsetHeight;

    baseBarHeight=Math.max(1,bar.getBoundingClientRect().height);
    const computedMax=parseFloat(getComputedStyle(scramble).maxHeight);
    baseScrambleMaxHeight=Number.isFinite(computedMax)&&computedMax>0
      ?computedMax
      :Math.max(1,scramble.clientHeight);
    setExtraHeight(0);
    void scramble.offsetHeight;
  }

  function fitScramble(){
    rafId=0;
    if(fitting||!scramble.isConnected)return;
    fitting=true;

    try{
      resetForMeasurement();
      const baseFontSize=parseFloat(getComputedStyle(scramble).fontSize)||27;
      scramble.dataset.fitBaseFontSize=baseFontSize.toFixed(2);

      if(!overflows()){
        delete scramble.dataset.fitReducedFont;
        return;
      }

      let fittedWithExtra=false;
      for(let extra=1;extra<=MAX_EXTRA_HEIGHT;extra+=1){
        setExtraHeight(extra);
        void scramble.offsetHeight;
        if(!overflows()){
          fittedWithExtra=true;
          break;
        }
      }

      if(fittedWithExtra){
        delete scramble.dataset.fitReducedFont;
        return;
      }

      setExtraHeight(MAX_EXTRA_HEIGHT);
      let low=MIN_FONT_SIZE;
      let high=baseFontSize;
      setFontSize(low);
      void scramble.offsetHeight;

      while(overflows()&&low>ABSOLUTE_MIN_FONT_SIZE){
        low=Math.max(ABSOLUTE_MIN_FONT_SIZE,low-.5);
        setFontSize(low);
        void scramble.offsetHeight;
      }

      if(!overflows()){
        for(let step=0;step<14;step+=1){
          const mid=(low+high)/2;
          setFontSize(mid);
          void scramble.offsetHeight;
          if(overflows())high=mid;
          else low=mid;
        }
        const fitted=Math.max(ABSOLUTE_MIN_FONT_SIZE,low-.05);
        setFontSize(fitted.toFixed(2));
        scramble.dataset.fitReducedFont=`${fitted.toFixed(2)}px`;
      }else{
        setFontSize(ABSOLUTE_MIN_FONT_SIZE);
        scramble.dataset.fitReducedFont=`${ABSOLUTE_MIN_FONT_SIZE}px`;
      }

      forceNoScroll();
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