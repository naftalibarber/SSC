(() => {
  'use strict';

  const scrambleEl=document.getElementById('scramble');
  const prevButton=document.getElementById('prevScramble');
  const newButton=document.getElementById('newScramble');
  if(!scrambleEl||!prevButton||!newButton)return;

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

  newButton.addEventListener('click',()=>{
    // app.js owns async generation; the observer records only completed scrambles.
  });

  updateButton();
})();
