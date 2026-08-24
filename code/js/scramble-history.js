(() => {
  'use strict';

  const scrambleEl=document.getElementById('scramble');
  const prevButton=document.getElementById('prevScramble');
  const newButton=document.getElementById('newScramble');
  if(!scrambleEl||!prevButton||!newButton)return;

  const backStack=[];
  let current=scrambleEl.dataset.scrambleTransient==='true'?'':scrambleEl.textContent.trim();
  let suppressObserver=false;

  function setScrambleText(value){
    suppressObserver=true;
    scrambleEl.textContent=value;
    queueMicrotask(()=>{suppressObserver=false;});
  }

  const observer=new MutationObserver(()=>{
    if(suppressObserver||scrambleEl.dataset.scrambleTransient==='true')return;
    const next=scrambleEl.textContent.trim();
    if(!next||next===current)return;
    if(current)backStack.push(current);
    current=next;
    prevButton.disabled=backStack.length===0;
  });
  observer.observe(scrambleEl,{childList:true,characterData:true,subtree:true});

  prevButton.disabled=backStack.length===0;
  prevButton.addEventListener('click',event=>{
    if(!backStack.length)return;
    event.preventDefault();
    event.stopPropagation();
    const previous=backStack.pop();
    current=previous;
    setScrambleText(previous);
    scrambleEl.dataset.scrambleTransient='false';
    prevButton.disabled=backStack.length===0;
    window.dispatchEvent(new CustomEvent('ssc-scramble-history-select',{detail:{scramble:previous}}));
  },true);

  newButton.addEventListener('click',()=>{
    // app.js owns async generation; the observer records only completed scrambles.
  });
})();
