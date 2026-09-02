(() => {
  'use strict';

  const EVENT_ID='333mbf';
  const HISTORY_KEY='rubiksCubeTimerHistoryV1';
  const SESSIONS_KEY='sscSessionsByEventV3';
  const ATTEMPTED_KEY='sscMbldAttemptedV1';
  const LIMIT_MS=60*60*1000;
  const MIN_CUBES=2;
  const MAX_CUBES=100;

  const els={
    timer:document.getElementById('timer'),
    status:document.getElementById('status'),
    touchTimer:document.getElementById('touchTimer'),
    eventSelect:document.getElementById('eventSelect'),
    sessionSelect:document.getElementById('sessionSelect'),
    newScramble:document.getElementById('newScramble'),
    scramble:document.getElementById('scramble'),
    scrambleLabel:document.getElementById('scrambleLabel'),
    preview:document.getElementById('cubePreview2D'),
    statsGrid:document.getElementById('statsGrid'),
    historyList:document.getElementById('historyList'),
    emptyHistory:document.getElementById('emptyHistory'),
    solveCount:document.getElementById('solveCount'),
    quickStats:document.querySelector('.quick-stats')
  };
  if(!els.timer||!els.status||!els.touchTimer||!els.scramble)return;

  let phase='inactive';
  let attempted=readAttempted();
  let memoTime=null;
  let totalTime=null;
  let startTime=0;
  let frame=null;
  let currentScramble='';
  let generatedScrambles=[];
  let ignoreNextSpaceUp=false;

  function isEnglish(){return document.documentElement.lang==='en'||document.documentElement.dir==='ltr';}
  function text(he,en){return isEnglish()?en:he;}
  function currentEvent(){return window.SSCTimerEvents?.getCurrent?.()||els.eventSelect?.value||'';}
  function isMbld(){return currentEvent()===EVENT_ID;}
  function isTiming(){return phase==='memo'||phase==='solve';}
  function clampInt(value,min,max,fallback=min){const parsed=Number.parseInt(value,10);if(!Number.isInteger(parsed))return fallback;return Math.min(max,Math.max(min,parsed));}
  function readAttempted(){return clampInt(localStorage.getItem(ATTEMPTED_KEY),MIN_CUBES,MAX_CUBES,3);}
  function writeAttempted(value){attempted=clampInt(value,MIN_CUBES,MAX_CUBES,3);localStorage.setItem(ATTEMPTED_KEY,String(attempted));return attempted;}
  function roundMs(value){return Math.max(0,Math.round(Number(value)||0));}

  function formatClock(ms,{tenths=false}={}){
    const safe=roundMs(ms);
    const totalSeconds=Math.floor(safe/1000);
    const hours=Math.floor(totalSeconds/3600);
    const minutes=Math.floor((totalSeconds%3600)/60);
    const seconds=totalSeconds%60;
    const decimal=Math.floor((safe%1000)/100);
    const core=hours>0?`${hours}:${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}`:`${minutes}:${String(seconds).padStart(2,'0')}`;
    return tenths?`${core}.${decimal}`:core;
  }

  function calculateResult({attempted:attemptedValue,solved:solvedValue,totalTime:totalValue,memoTime:memoValue}){
    const attemptedCount=clampInt(attemptedValue,MIN_CUBES,MAX_CUBES,MIN_CUBES);
    const solvedCount=clampInt(solvedValue,0,attemptedCount,0);
    const total=roundMs(totalValue);
    const memo=roundMs(memoValue);
    const points=solvedCount-(attemptedCount-solvedCount);
    const isDNF=points<1||solvedCount<2||total>LIMIT_MS;
    const resultCore=`${solvedCount}/${attemptedCount} ${formatClock(total)} [${formatClock(memo)}]`;
    return Object.freeze({attempted:attemptedCount,solved:solvedCount,points,isDNF,totalTime:total,memoTime:memo,displayResult:isDNF?`DNF (${resultCore})`:resultCore});
  }

  function injectStyles(){
    if(document.getElementById('sscMbldFlowStyles'))return;
    const style=document.createElement('style');
    style.id='sscMbldFlowStyles';
    style.textContent=`
      .ssc-mbld-stage-wrap{display:flex;flex-direction:column;align-items:center;gap:5px;margin-bottom:4px}
      .ssc-mbld-stage{display:inline-flex;align-items:center;justify-content:center;min-width:84px;padding:5px 13px;border-radius:999px;font-size:12px;font-weight:900;letter-spacing:.16em;border:1px solid var(--border);background:var(--soft);color:var(--text)}
      .ssc-mbld-stage[data-phase="memo"]{border-color:#8b5cf6;background:color-mix(in srgb,#8b5cf6 13%,var(--card-solid,#fff));color:#7c3aed}
      .ssc-mbld-stage[data-phase="solve"]{border-color:#16a34a;background:color-mix(in srgb,#16a34a 12%,var(--card-solid,#fff));color:#15803d}
      .ssc-mbld-memo-record{min-height:18px;font-size:13px;font-weight:700;color:var(--muted);text-align:center}
      .ssc-mbld-phase-action{margin-top:8px;border:1px solid var(--border);border-radius:10px;padding:8px 14px;background:var(--soft);color:var(--text);font:inherit;font-weight:800;cursor:pointer}
      .ssc-mbld-phase-action[hidden]{display:none!important}.ssc-mbld-modal[hidden]{display:none!important}
      .ssc-mbld-modal{position:fixed;inset:0;z-index:12000;display:grid;place-items:center;padding:16px}
      .ssc-mbld-backdrop{position:absolute;inset:0;background:rgba(15,23,42,.62);backdrop-filter:blur(5px);-webkit-backdrop-filter:blur(5px)}
      .ssc-mbld-dialog{position:relative;z-index:1;width:min(92vw,430px);border:1px solid var(--border);border-radius:18px;background:var(--card-solid,#fff);color:var(--text);box-shadow:0 28px 80px rgba(0,0,0,.28);overflow:hidden}
      .ssc-mbld-head{padding:17px 18px 11px;border-bottom:1px solid var(--border)}.ssc-mbld-head h2{margin:0;font-size:20px}.ssc-mbld-head p{margin:5px 0 0;color:var(--muted);font-size:13px}
      .ssc-mbld-body{padding:17px 18px;display:grid;gap:14px}.ssc-mbld-field{display:grid;gap:6px}.ssc-mbld-field span{font-size:13px;font-weight:800;color:var(--muted)}
      .ssc-mbld-field input{width:100%;box-sizing:border-box;border:1px solid var(--border);border-radius:10px;background:var(--soft);color:var(--text);font:inherit;font-size:20px;font-weight:800;padding:10px 12px;text-align:center}
      .ssc-mbld-summary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ssc-mbld-summary div{border:1px solid var(--border);border-radius:10px;background:var(--soft);padding:9px;text-align:center}.ssc-mbld-summary span{display:block;color:var(--muted);font-size:11px;font-weight:800}.ssc-mbld-summary strong{display:block;margin-top:3px;font-size:15px}
      .ssc-mbld-score-preview{padding:10px 12px;border-radius:10px;background:var(--soft);text-align:center;font-weight:900}.ssc-mbld-score-preview.dnf{color:#dc2626}
      .ssc-mbld-actions{display:flex;gap:9px;justify-content:flex-end;padding:0 18px 18px}.ssc-mbld-actions button{border:1px solid var(--border);border-radius:10px;padding:9px 14px;background:var(--soft);color:var(--text);font:inherit;font-weight:800;cursor:pointer}.ssc-mbld-actions .primary{border-color:var(--accent);background:var(--accent);color:#fff}
      .ssc-mbld-history-row .solve-time{font-size:16px;font-weight:900}.ssc-mbld-history-row .solve-meta{white-space:normal}.ssc-mbld-history-actions{display:flex;gap:6px;margin-top:5px}.ssc-mbld-history-actions button{border:1px solid var(--border);border-radius:7px;background:var(--soft);color:var(--muted);font:inherit;font-size:11px;padding:4px 7px;cursor:pointer}
      .ssc-mbld-stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.ssc-mbld-stat{border:1px solid var(--border);border-radius:10px;padding:9px;background:var(--soft);text-align:center}.ssc-mbld-stat span{display:block;color:var(--muted);font-size:11px;font-weight:800}.ssc-mbld-stat strong{display:block;margin-top:3px}
      html[dir="rtl"] .ssc-mbld-dialog{text-align:right}html[data-theme="dark"] .ssc-mbld-stage[data-phase="memo"],html[data-theme="oled"] .ssc-mbld-stage[data-phase="memo"]{color:#c4b5fd}html[data-theme="dark"] .ssc-mbld-stage[data-phase="solve"],html[data-theme="oled"] .ssc-mbld-stage[data-phase="solve"]{color:#86efac}
    `;
    document.head.appendChild(style);
  }

  function ensureTimerUi(){
    if(document.getElementById('sscMbldStage'))return;
    const timerParent=els.timer.parentElement;if(!timerParent)return;
    const stageWrap=document.createElement('div');stageWrap.id='sscMbldStageWrap';stageWrap.className='ssc-mbld-stage-wrap';stageWrap.hidden=true;stageWrap.innerHTML='<div id="sscMbldStage" class="ssc-mbld-stage">MBLD</div><div id="sscMbldMemoRecord" class="ssc-mbld-memo-record"></div>';
    timerParent.insertBefore(stageWrap,els.timer);
    const action=document.createElement('button');action.id='sscMbldPhaseAction';action.className='ssc-mbld-phase-action';action.type='button';action.hidden=true;els.status.insertAdjacentElement('afterend',action);
    action.addEventListener('click',event=>{event.preventDefault();if(phase==='memo')endMemo();else if(phase==='solve')stopExecution();});
  }

  function ensureSetupModal(){
    let modal=document.getElementById('sscMbldSetupModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='sscMbldSetupModal';modal.className='ssc-mbld-modal';modal.hidden=true;
    modal.innerHTML=`<div class="ssc-mbld-backdrop"></div><section class="ssc-mbld-dialog" role="dialog" aria-modal="true" aria-labelledby="sscMbldSetupTitle"><div class="ssc-mbld-head"><h2 id="sscMbldSetupTitle"></h2><p data-mbld-setup-subtitle></p></div><div class="ssc-mbld-body"><label class="ssc-mbld-field"><span data-mbld-attempted-label></span><input id="sscMbldAttempted" type="number" min="${MIN_CUBES}" max="${MAX_CUBES}" step="1" inputmode="numeric"></label></div><div class="ssc-mbld-actions"><button type="button" data-mbld-setup-cancel></button><button type="button" class="primary" data-mbld-start></button></div></section>`;
    document.body.appendChild(modal);
    modal.querySelector('[data-mbld-setup-cancel]').addEventListener('click',()=>closeSetup());modal.querySelector('[data-mbld-start]').addEventListener('click',startAttempt);modal.querySelector('#sscMbldAttempted').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();startAttempt();}});
    return modal;
  }

  function ensureResultModal(){
    let modal=document.getElementById('sscMbldResultModal');if(modal)return modal;
    modal=document.createElement('div');modal.id='sscMbldResultModal';modal.className='ssc-mbld-modal';modal.hidden=true;
    modal.innerHTML=`<div class="ssc-mbld-backdrop"></div><section class="ssc-mbld-dialog" role="dialog" aria-modal="true" aria-labelledby="sscMbldResultTitle"><div class="ssc-mbld-head"><h2 id="sscMbldResultTitle"></h2><p data-mbld-result-subtitle></p></div><div class="ssc-mbld-body"><div class="ssc-mbld-summary"><div><span data-mbld-total-label></span><strong data-mbld-total></strong></div><div><span data-mbld-memo-label></span><strong data-mbld-memo></strong></div></div><label class="ssc-mbld-field"><span data-mbld-solved-label></span><input id="sscMbldSolved" type="number" min="0" step="1" inputmode="numeric"></label><div class="ssc-mbld-score-preview" data-mbld-score-preview></div></div><div class="ssc-mbld-actions"><button type="button" data-mbld-result-cancel></button><button type="button" class="primary" data-mbld-save></button></div></section>`;
    document.body.appendChild(modal);
    const solvedInput=modal.querySelector('#sscMbldSolved');solvedInput.addEventListener('input',updateResultPreview);solvedInput.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();saveResult();}});modal.querySelector('[data-mbld-save]').addEventListener('click',saveResult);modal.querySelector('[data-mbld-result-cancel]').addEventListener('click',()=>{modal.hidden=true;resetToSetup();});
    return modal;
  }

  function syncLabels(){
    const stage=document.getElementById('sscMbldStage');const action=document.getElementById('sscMbldPhaseAction');if(stage)stage.textContent=phase==='solve'?'SOLVE':phase==='memo'?'MEMO':'MBLD';if(action)action.textContent=phase==='memo'?text('סיום זיכרון','End Memo'):text('עצור פתרון','Stop Solve');
    const setup=ensureSetupModal();setup.querySelector('#sscMbldSetupTitle').textContent=text('הגדרת MBLD','MBLD Setup');setup.querySelector('[data-mbld-setup-subtitle]').textContent=text('בחר כמה קוביות ייכללו בניסיון. הטיימר יתחיל בשלב הזיכרון.','Choose how many cubes to attempt. The timer will start in memorization.');setup.querySelector('[data-mbld-attempted-label]').textContent=text('מספר קוביות לניסיון','Cubes attempted');setup.querySelector('[data-mbld-setup-cancel]').textContent=text('סגור','Close');setup.querySelector('[data-mbld-start]').textContent=text('התחל MBLD','Start MBLD');
    const result=ensureResultModal();result.querySelector('#sscMbldResultTitle').textContent=text('תוצאת MBLD','MBLD Result');result.querySelector('[data-mbld-result-subtitle]').textContent=text('הזן כמה קוביות נפתרו בהצלחה.','Enter how many cubes were solved successfully.');result.querySelector('[data-mbld-total-label]').textContent=text('זמן כולל','Total time');result.querySelector('[data-mbld-memo-label]').textContent=text('זמן זיכרון','Memo time');result.querySelector('[data-mbld-solved-label]').textContent=text('קוביות שנפתרו','Cubes solved');result.querySelector('[data-mbld-result-cancel]').textContent=text('בטל ניסיון','Discard');result.querySelector('[data-mbld-save]').textContent=text('שמור תוצאה','Save result');
  }

  function setControlsLocked(locked){if(els.eventSelect)els.eventSelect.disabled=Boolean(locked);if(els.sessionSelect)els.sessionSelect.disabled=Boolean(locked);if(els.newScramble)els.newScramble.disabled=Boolean(locked);}

  function renderPhase(){
    ensureTimerUi();const wrap=document.getElementById('sscMbldStageWrap');const stage=document.getElementById('sscMbldStage');const memoRecord=document.getElementById('sscMbldMemoRecord');const action=document.getElementById('sscMbldPhaseAction');const active=isMbld()&&phase!=='inactive';if(wrap)wrap.hidden=!active;if(stage){stage.dataset.phase=phase;stage.textContent=phase==='memo'?'MEMO':phase==='solve'?'SOLVE':'MBLD';}
    if(memoRecord)memoRecord.textContent=phase==='solve'||phase==='post'?`${text('זיכרון','Memo')}: ${formatClock(memoTime||0)}`:'';
    if(action){action.hidden=!isTiming();action.textContent=phase==='memo'?text('סיום זיכרון','End Memo'):text('עצור פתרון','Stop Solve');}
    if(phase==='memo'){els.status.textContent=text('שלב זיכרון — Space או End Memo למעבר לפתרון','Memorization — Space or End Memo to start solving');els.touchTimer.textContent=text('סיום זיכרון','END MEMO');}
    else if(phase==='solve'){els.status.textContent=text('שלב פתרון — הזמן הכולל ממשיך ברצף','Execution — total time continues without interruption');els.touchTimer.textContent=text('עצור','STOP');}
  }

  function cancelFrame(){if(frame!==null)cancelAnimationFrame(frame);frame=null;}
  function tick(){if(!isTiming())return;const elapsed=performance.now()-startTime;els.timer.textContent=formatClock(elapsed,{tenths:true});frame=requestAnimationFrame(tick);}

  function setScramble(scrambles){
    generatedScrambles=[...scrambles];currentScramble=scrambles.map((value,index)=>`${index+1}) ${value}`).join(' | ');els.scramble.dataset.scrambleTransient='false';els.scramble.dataset.eventId=EVENT_ID;els.scramble.textContent=currentScramble;if(els.scrambleLabel)els.scrambleLabel.textContent=`${text('ערבוב','Scramble')} MBLD · ${attempted}`;if(els.preview&&scrambles[0])window.SSCCubePreview?.render?.(els.preview,scrambles[0],EVENT_ID);window.dispatchEvent(new CustomEvent('ssc-mbld-scramble',{detail:{attempted,scrambles:[...scrambles],scramble:currentScramble}}));
  }
  async function generateScrambles(count){
    if(!window.SSCScrambles?.generateMultiBlind)throw new Error('Multi-blind scramble generator is unavailable.');els.scramble.dataset.scrambleTransient='true';els.scramble.textContent=text('יוצר ערבובים…','Generating scrambles…');const scrambles=await window.SSCScrambles.generateMultiBlind(count);if(!Array.isArray(scrambles)||scrambles.length!==count)throw new Error(`Expected ${count} MBLD scrambles, received ${scrambles?.length||0}.`);setScramble(scrambles.map(String));return scrambles;
  }

  function openSetup(){
    if(!isMbld()||isTiming())return;phase='setup';cancelFrame();setControlsLocked(false);els.timer.textContent='0:00.0';els.status.textContent=text('הגדר מספר קוביות והתחל','Set the attempted cube count and start');ensureTimerUi();renderPhase();syncLabels();const modal=ensureSetupModal();const input=modal.querySelector('#sscMbldAttempted');input.value=String(attempted);modal.hidden=false;requestAnimationFrame(()=>input.focus());
  }
  function closeSetup(){const modal=ensureSetupModal();modal.hidden=true;phase='setup';renderPhase();}

  async function startAttempt(){
    if(!isMbld()||isTiming())return;const modal=ensureSetupModal();const input=modal.querySelector('#sscMbldAttempted');writeAttempted(input.value);const startButton=modal.querySelector('[data-mbld-start]');startButton.disabled=true;input.disabled=true;
    try{await generateScrambles(attempted);memoTime=null;totalTime=null;startTime=performance.now();phase='memo';modal.hidden=true;setControlsLocked(true);renderPhase();cancelFrame();frame=requestAnimationFrame(tick);window.dispatchEvent(new CustomEvent('ssc-mbld-phase-change',{detail:{phase,attempted}}));}
    catch(error){console.error('[SSC MBLD] Could not start attempt.',error);els.status.textContent=text('לא ניתן ליצור ערבובי MBLD','Unable to generate MBLD scrambles');}
    finally{startButton.disabled=false;input.disabled=false;}
  }

  function endMemo(){if(phase!=='memo')return false;memoTime=roundMs(performance.now()-startTime);phase='solve';renderPhase();window.dispatchEvent(new CustomEvent('ssc-mbld-phase-change',{detail:{phase,attempted,memoTime}}));return true;}
  function stopExecution(){if(phase!=='solve')return false;totalTime=roundMs(performance.now()-startTime);cancelFrame();phase='post';els.timer.textContent=formatClock(totalTime,{tenths:true});renderPhase();setControlsLocked(true);openResultModal();window.dispatchEvent(new CustomEvent('ssc-mbld-phase-change',{detail:{phase,attempted,memoTime,totalTime}}));return true;}

  function openResultModal(){
    syncLabels();const modal=ensureResultModal();modal.querySelector('[data-mbld-total]').textContent=formatClock(totalTime||0);modal.querySelector('[data-mbld-memo]').textContent=formatClock(memoTime||0);const input=modal.querySelector('#sscMbldSolved');input.max=String(attempted);input.value=String(attempted);modal.hidden=false;updateResultPreview();requestAnimationFrame(()=>{input.focus();input.select();});
  }
  function currentResultFromModal(){const input=ensureResultModal().querySelector('#sscMbldSolved');return calculateResult({attempted,solved:input.value,totalTime,memoTime});}
  function updateResultPreview(){const modal=ensureResultModal();const result=currentResultFromModal();const preview=modal.querySelector('[data-mbld-score-preview]');preview.classList.toggle('dnf',result.isDNF);preview.textContent=result.isDNF?`${text('DNF','DNF')} · ${result.solved}/${result.attempted} · ${text('נקודות','points')}: ${result.points}`:`${result.displayResult} · ${text('נקודות','points')}: ${result.points}`;}

  function readJson(key,fallback){try{const value=JSON.parse(localStorage.getItem(key));return value??fallback;}catch{return fallback;}}
  function currentSessionId(){return window.SSCTimerEvents?.getCurrentSession?.()?.id||els.sessionSelect?.value||`${EVENT_ID}-session`;}
  function compatibleSolve(result){
    const createdAt=new Date().toISOString();const sessionId=currentSessionId();const id=crypto.randomUUID?crypto.randomUUID():`mbld-${Date.now()}-${Math.random()}`;const finalTimeMs=result.isDNF?null:result.totalTime;
    return {id,event:'mbld',eventId:EVENT_ID,totalTime:result.totalTime,memoTime:result.memoTime,attempted:result.attempted,solved:result.solved,points:result.points,isDNF:result.isDNF,displayResult:result.displayResult,timeMs:result.totalTime,rawTimeMs:result.totalTime,rawTime:result.totalTime/1000,penalty:result.isDNF?'DNF':'OK',finalTimeMs,finalTime:finalTimeMs===null?null:finalTimeMs/1000,scramble:currentScramble,scrambles:[...generatedScrambles],puzzle:'333mbf',puzzleId:'3x3x3',sessionId,session:sessionId,createdAt,date:createdAt,mbld:true};
  }
  function saveSolveRecord(record){
    const history=readJson(HISTORY_KEY,[]);const safeHistory=Array.isArray(history)?history:[];localStorage.setItem(HISTORY_KEY,JSON.stringify([record,...safeHistory.filter(item=>item?.id!==record.id)]));const sessionsByEvent=readJson(SESSIONS_KEY,{});const sessions=Array.isArray(sessionsByEvent?.[EVENT_ID])?sessionsByEvent[EVENT_ID]:[];const session=sessions.find(item=>item.id===record.sessionId);if(session){session.updatedAt=record.createdAt;localStorage.setItem(SESSIONS_KEY,JSON.stringify(sessionsByEvent));}return record;
  }
  function saveResult(){
    if(phase!=='post')return null;const result=currentResultFromModal();const record=saveSolveRecord(compatibleSolve(result));ensureResultModal().hidden=true;phase='setup';setControlsLocked(false);els.timer.textContent=result.isDNF?'DNF':formatClock(result.totalTime,{tenths:true});els.status.textContent=text('תוצאת MBLD נשמרה','MBLD result saved');renderPhase();renderMbldHistory();window.dispatchEvent(new CustomEvent('ssc-mbld-result-saved',{detail:{...record}}));return record;
  }

  function mbldHistory(){const sessionId=currentSessionId();const history=readJson(HISTORY_KEY,[]);return (Array.isArray(history)?history:[]).filter(item=>(item?.eventId===EVENT_ID||item?.event==='mbld')&&item?.sessionId===sessionId);}
  function normalizeStoredMbld(item){if(item?.mbld&&Number.isFinite(Number(item.attempted))&&Number.isFinite(Number(item.solved))){const calculated=calculateResult(item);return {...item,...calculated,displayResult:item.displayResult||calculated.displayResult};}return null;}
  function renderMbldHistory(){
    if(!isMbld())return;const history=mbldHistory().map(normalizeStoredMbld).filter(Boolean);if(els.solveCount)els.solveCount.textContent=String(history.length);if(els.emptyHistory){els.emptyHistory.textContent=text('עדיין אין ניסיונות MBLD שמורים.','No saved MBLD attempts yet.');els.emptyHistory.hidden=history.length>0;}
    if(els.historyList){els.historyList.innerHTML='';els.historyList.hidden=history.length===0;history.slice(0,12).forEach((solve,index)=>{const row=document.createElement('div');row.className='solve-row enhanced-solve-row ssc-mbld-history-row'+(solve.isDNF?' penalty-dnf':'');row.dataset.solveId=solve.id;const date=new Date(solve.createdAt);const locale=isEnglish()?'en-US':'he-IL';row.innerHTML=`<div class="solve-index">${index+1}</div><div class="solve-main"><div class="solve-time"></div><div class="solve-meta"></div><div class="ssc-mbld-history-actions"><button type="button" data-mbld-delete>${text('מחיקה','Delete')}</button></div></div>`;row.querySelector('.solve-time').textContent=solve.displayResult;row.querySelector('.solve-meta').textContent=`${date.toLocaleString(locale,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})} · ${text('נקודות','Points')} ${solve.points} · ${text('זיכרון','Memo')} ${formatClock(solve.memoTime)}`;row.querySelector('[data-mbld-delete]').addEventListener('click',event=>{event.stopPropagation();deleteMbldSolve(solve.id);});els.historyList.appendChild(row);});}
    if(els.statsGrid){const valid=history.filter(item=>!item.isDNF);valid.sort((a,b)=>b.points-a.points||a.totalTime-b.totalTime);const best=valid[0]||null;els.statsGrid.innerHTML=`<div class="ssc-mbld-stats"><div class="ssc-mbld-stat"><span>${text('ניסיון הטוב ביותר','Best result')}</span><strong>${best?`${best.solved}/${best.attempted} · ${best.points} ${text('נק׳','pts')}`:'—'}</strong></div><div class="ssc-mbld-stat"><span>${text('מספר ניסיונות','Attempts')}</span><strong>${history.length}</strong></div></div>`;}
    if(els.quickStats)els.quickStats.hidden=true;
  }
  function deleteMbldSolve(id){const history=readJson(HISTORY_KEY,[]);if(!Array.isArray(history))return false;const next=history.filter(item=>item?.id!==id);if(next.length===history.length)return false;localStorage.setItem(HISTORY_KEY,JSON.stringify(next));renderMbldHistory();return true;}

  function resetToSetup(){cancelFrame();memoTime=null;totalTime=null;startTime=0;setControlsLocked(false);if(isMbld())openSetup();else phase='inactive';}
  function activate(){if(!isMbld())return;injectStyles();ensureTimerUi();ensureSetupModal();ensureResultModal();syncLabels();if(phase==='inactive')phase='setup';if(els.quickStats)els.quickStats.hidden=true;renderPhase();renderMbldHistory();if(!isTiming()&&phase!=='post')openSetup();}
  function deactivate(){if(phase==='memo'||phase==='solve')cancelFrame();phase='inactive';memoTime=null;totalTime=null;startTime=0;ensureSetupModal().hidden=true;ensureResultModal().hidden=true;setControlsLocked(false);const wrap=document.getElementById('sscMbldStageWrap');if(wrap)wrap.hidden=true;const action=document.getElementById('sscMbldPhaseAction');if(action)action.hidden=true;if(els.quickStats)els.quickStats.hidden=false;}

  function interceptSpace(event){
    if(!isMbld()||event.code!=='Space')return false;event.preventDefault();event.stopImmediatePropagation();if(event.repeat)return true;ignoreNextSpaceUp=true;if(phase==='memo')endMemo();else if(phase==='solve')stopExecution();return true;
  }
  document.addEventListener('keydown',event=>{if(interceptSpace(event))return;if(isMbld()&&isTiming()&&(event.ctrlKey||event.metaKey)){event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('keyup',event=>{if(event.code!=='Space'||!ignoreNextSpaceUp)return;ignoreNextSpaceUp=false;event.preventDefault();event.stopImmediatePropagation();},true);
  const interceptPointer=event=>{if(!isMbld())return;event.preventDefault();event.stopImmediatePropagation();if(event.type==='pointerdown'){if(phase==='memo')endMemo();else if(phase==='solve')stopExecution();}};
  els.touchTimer.addEventListener('pointerdown',interceptPointer,true);els.touchTimer.addEventListener('pointerup',interceptPointer,true);els.touchTimer.addEventListener('pointercancel',interceptPointer,true);
  els.newScramble?.addEventListener('click',event=>{if(!isMbld())return;event.preventDefault();event.stopImmediatePropagation();if(!isTiming())openSetup();},true);

  window.addEventListener('ssc-event-change',event=>{const eventId=event.detail?.eventId||currentEvent();if(eventId===EVENT_ID)activate();else deactivate();});
  window.addEventListener('ssc-language-change',()=>{if(isMbld()){syncLabels();renderPhase();renderMbldHistory();}});

  const nativeSetItem=Storage.prototype.setItem;
  Storage.prototype.setItem=function(key,value){
    if(this===localStorage&&key===HISTORY_KEY&&window.SSCMBLD){
      try{const incoming=JSON.parse(value);const existing=JSON.parse(this.getItem(key));if(Array.isArray(incoming)&&Array.isArray(existing)){const external=existing.filter(item=>item?.mbld===true||item?.event==='mbld');const incomingIds=new Set(incoming.map(item=>item?.id).filter(Boolean));const merged=[...incoming,...external.filter(item=>!incomingIds.has(item?.id))];return nativeSetItem.call(this,key,JSON.stringify(merged));}}catch{}
    }
    return nativeSetItem.call(this,key,value);
  };

  window.SSCMBLD=Object.freeze({version:'1.0.0',LIMIT_MS,getPhase:()=>phase,getAttempted:()=>attempted,setAttempted:writeAttempted,calculateResult,formatClock,start:startAttempt,endMemo,stop:stopExecution,openSetup,renderHistory:renderMbldHistory});
  queueMicrotask(()=>{if(isMbld())activate();});
})();
