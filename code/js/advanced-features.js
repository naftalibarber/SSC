(() => {
  'use strict';

  const HISTORY_KEY='rubiksCubeTimerHistoryV1';
  const SESSIONS_KEY='sscSessionsByEventV3';
  const ACTIVE_KEY='sscActiveSessionByEventV3';
  const EVENT_KEY='rubiksCubeTimerEventV2';
  const LANGUAGE_KEY='sscLanguageV1';
  const CUSTOM_TAGS_KEY='sscCustomTagsV1';
  const DEFAULT_TAGS=['Good Solve','Bad Cross','Bad F2L','OLL Mistake','PLL Mistake','Lockup','Recognition','Lucky','Inspection'];
  const VALID_PENALTIES=new Set(['OK','+2','DNF']);
  let selectedSolveId=null;
  let analyticsFilter='50';
  let selectedTags=[];

  const isHebrew=()=>localStorage.getItem(LANGUAGE_KEY)!=='en';
  const txt=(he,en)=>isHebrew()?he:en;
  const parse=(key,fallback)=>{try{const value=JSON.parse(localStorage.getItem(key));return value??fallback;}catch{return fallback;}};
  const history=()=>{const data=parse(HISTORY_KEY,[]);return Array.isArray(data)?data:[];};
  const sessionsByEvent=()=>{const data=parse(SESSIONS_KEY,{});return data&&typeof data==='object'&&!Array.isArray(data)?data:{};};
  const activeByEvent=()=>{const data=parse(ACTIVE_KEY,{});return data&&typeof data==='object'&&!Array.isArray(data)?data:{};};
  const currentEvent=()=>localStorage.getItem(EVENT_KEY)||'333';
  const currentSessionId=()=>activeByEvent()[currentEvent()]||sessionsByEvent()[currentEvent()]?.[0]?.id||'session-1';
  const normalizeSolve=s=>({
    ...s,
    tags:Array.isArray(s?.tags)?[...new Set(s.tags.filter(v=>typeof v==='string'&&v.trim()).map(v=>v.trim()))]:[],
    note:typeof s?.note==='string'?s.note:'',
    penalty:VALID_PENALTIES.has(s?.penalty)?s.penalty:'OK',
    rawTimeMs:Number.isFinite(Number(s?.rawTimeMs))?Number(s.rawTimeMs):Number.isFinite(Number(s?.timeMs))?Number(s.timeMs):Number(s?.rawTime||0)*1000,
    eventId:s?.eventId||s?.event||(s?.puzzle==='2x2'?'222':'333'),
    sessionId:s?.sessionId||s?.session||'session-1',
    createdAt:s?.createdAt||s?.date||new Date().toISOString()
  });
  const effective=s=>{const n=normalizeSolve(s);return n.penalty==='DNF'?Infinity:n.rawTimeMs+(n.penalty==='+2'?2000:0);};
  const fmt=ms=>Number.isFinite(ms)?(ms/1000).toFixed(3):'DNF';
  const currentHistory=()=>history().map(normalizeSolve).filter(s=>s.eventId===currentEvent()&&s.sessionId===currentSessionId()&&!s.practice&&!s.training);
  const sessionHistory=(eventId,sessionId)=>history().map(normalizeSolve).filter(s=>s.eventId===eventId&&s.sessionId===sessionId&&!s.practice&&!s.training);
  const notifyCore=()=>window.dispatchEvent(new StorageEvent('storage',{key:HISTORY_KEY,newValue:localStorage.getItem(HISTORY_KEY),storageArea:localStorage}));

  function setSolveMetadata(id,tags,note){
    const all=history();const index=all.findIndex(s=>s?.id===id);if(index<0)return false;
    all[index]={...all[index],tags:[...new Set((tags||[]).filter(Boolean))],note:String(note||'')};
    localStorage.setItem(HISTORY_KEY,JSON.stringify(all));notifyCore();window.dispatchEvent(new CustomEvent('ssc-solve-metadata-change',{detail:{id}}));return true;
  }

  function customTags(){const tags=parse(CUSTOM_TAGS_KEY,[]);return Array.isArray(tags)?tags.filter(v=>typeof v==='string'&&v.trim()):[];}
  function allTags(){return [...new Set([...DEFAULT_TAGS,...customTags()])];}
  function addCustomTag(tag){const value=String(tag||'').trim();if(!value)return;const tags=customTags();if(!tags.includes(value)){tags.push(value);localStorage.setItem(CUSTOM_TAGS_KEY,JSON.stringify(tags));}}

  function mean(values){const finite=values.filter(Number.isFinite);return finite.length?finite.reduce((a,b)=>a+b,0)/finite.length:null;}
  function stddev(values){const finite=values.filter(Number.isFinite);if(finite.length<2)return null;const m=mean(finite);return Math.sqrt(finite.reduce((sum,v)=>sum+((v-m)**2),0)/finite.length);}
  function trimmedAverage(values,count){
    if(values.length<count)return null;const sample=values.slice(0,count);if(count<5)return sample.some(v=>!Number.isFinite(v))?Infinity:sample.reduce((a,b)=>a+b,0)/count;
    const sorted=[...sample].sort((a,b)=>a-b);const trim=Math.ceil(count*.05);const kept=sorted.slice(trim,sorted.length-trim);return kept.some(v=>!Number.isFinite(v))?Infinity:kept.reduce((a,b)=>a+b,0)/kept.length;
  }
  function rollingAo(chronological,count){
    const values=chronological.map(effective),out=[];for(let i=0;i<values.length;i++){if(i+1<count){out.push(null);continue;}out.push(trimmedAverage(values.slice(i-count+1,i+1).reverse(),count));}return out;
  }
  function bestAo(historyItems,count){const chronological=[...historyItems].reverse();const rolling=rollingAo(chronological,count).filter(v=>v!==null);return rolling.length?Math.min(...rolling):null;}
  function metrics(items){
    const values=items.map(effective),finite=values.filter(Number.isFinite),count=items.length,dnf=items.filter(s=>s.penalty==='DNF').length,plus2=items.filter(s=>s.penalty==='+2').length;
    return{count,mean:mean(values),bestSingle:finite.length?Math.min(...finite):null,best5:bestAo(items,5),best12:bestAo(items,12),best50:bestAo(items,50),best100:bestAo(items,100),consistency:stddev(values),dnf,dnfRate:count?dnf/count:0,plus2,plus2Rate:count?plus2/count:0};
  }
  function pbCount(items){
    const chronological=[...items].reverse(),values=chronological.map(effective),ao5=rollingAo(chronological,5),ao12=rollingAo(chronological,12);let best=Infinity,b5=Infinity,b12=Infinity,count=0;
    values.forEach((v,i)=>{if(Number.isFinite(v)&&v<best){best=v;count++;}if(ao5[i]!==null&&ao5[i]<b5){b5=ao5[i];count++;}if(ao12[i]!==null&&ao12[i]<b12){b12=ao12[i];count++;}});return count;
  }
  function previousSession(){
    const event=currentEvent(),list=sessionsByEvent()[event]||[],index=list.findIndex(s=>s.id===currentSessionId());if(index<0)return null;
    const current=list[index],others=list.filter(s=>s.id!==current.id).sort((a,b)=>new Date(b.updatedAt||b.createdAt||0)-new Date(a.updatedAt||a.createdAt||0));
    const older=others.find(s=>new Date(s.updatedAt||s.createdAt||0)<=new Date(current.createdAt||current.updatedAt||Date.now()))||others[0];return older||null;
  }
  const delta=(a,b)=>a===null||b===null?null:a-b;
  function insights(cur,prev,last12,prior12){
    const out=[];if(prev){const d=delta(cur.best5,prev.best5);if(Number.isFinite(d)&&Math.abs(d)>=1)out.push(d<0?txt(`Best Ao5 השתפר ב־${fmt(-d)}s.`,`Best Ao5 improved by ${fmt(-d)}s.`):txt(`Best Ao5 איטי יותר ב־${fmt(d)}s לעומת הסשן הקודם.`,`Best Ao5 is ${fmt(d)}s slower than the previous session.`));
      if(Math.abs(cur.dnfRate-prev.dnfRate)>=.01)out.push(txt(`שיעור DNF השתנה מ־${(prev.dnfRate*100).toFixed(1)}% ל־${(cur.dnfRate*100).toFixed(1)}%.`,`DNF rate changed from ${(prev.dnfRate*100).toFixed(1)}% to ${(cur.dnfRate*100).toFixed(1)}%.`));}
    if(last12&&prior12&&last12.consistency!==null&&prior12.consistency!==null&&last12.consistency<prior12.consistency*.95)out.push(txt(`12 הפתרונות האחרונים עקביים יותר ב־${((1-last12.consistency/prior12.consistency)*100).toFixed(0)}%.`,`Your last 12 solves are ${((1-last12.consistency/prior12.consistency)*100).toFixed(0)}% more consistent.`));
    return out.slice(0,3);
  }

  function ensureUi(){
    if(!document.getElementById('sscAdvancedFeaturesStyle')){const link=document.createElement('link');link.id='sscAdvancedFeaturesStyle';link.rel='stylesheet';link.href='./code/css/advanced-features.css?v=20260825-1';document.head.appendChild(link);}
    const toolbar=document.querySelector('.topbar-start');if(toolbar&&!document.getElementById('analyticsButton')){const b=document.createElement('button');b.id='analyticsButton';b.className='toolbar-button';b.type='button';b.innerHTML='<span>ANALYTICS</span>';toolbar.appendChild(b);b.addEventListener('click',openAnalytics);}
    if(!document.getElementById('analyticsModal')){const modal=document.createElement('div');modal.id='analyticsModal';modal.className='settings-modal analytics-modal';modal.hidden=true;modal.innerHTML=`<div class="settings-backdrop" data-analytics-close></div><section class="settings-dialog analytics-dialog"><div class="settings-dialog-head"><h2 data-analytics-title></h2><button class="modal-close" data-analytics-close type="button">×</button></div><div class="analytics-toolbar"><div class="analytics-ranges"><button data-range="25">25</button><button data-range="50">50</button><button data-range="100">100</button><button data-range="all">All</button></div><select id="analyticsTagFilter" multiple aria-label="Tag filter"></select></div><div id="analyticsGraph" class="analytics-graph"></div><div id="analyticsMetrics" class="analytics-metrics"></div><div id="sessionSummaryCard" class="session-summary-card"></div><div id="analyticsInsights" class="analytics-insights"></div></section>`;document.body.appendChild(modal);modal.querySelectorAll('[data-analytics-close]').forEach(el=>el.addEventListener('click',()=>modal.hidden=true));modal.querySelectorAll('[data-range]').forEach(btn=>btn.addEventListener('click',()=>{analyticsFilter=btn.dataset.range;renderAnalytics();}));modal.querySelector('#analyticsTagFilter').addEventListener('change',e=>{selectedTags=[...e.target.selectedOptions].map(o=>o.value);renderAnalytics();});}
    enhanceSolveDetails();
    window.addEventListener('ssc-event-change',()=>{if(!document.getElementById('analyticsModal')?.hidden)renderAnalytics();});
    document.getElementById('sessionSelect')?.addEventListener('change',()=>setTimeout(()=>{if(!document.getElementById('analyticsModal')?.hidden)renderAnalytics();},0));
    window.addEventListener('ssc-solve-metadata-change',()=>{if(!document.getElementById('analyticsModal')?.hidden)renderAnalytics();});
  }

  function enhanceSolveDetails(){
    const list=document.getElementById('historyList');if(list&&!list.dataset.advancedBound){list.dataset.advancedBound='1';list.addEventListener('click',event=>{const row=event.target.closest('.solve-row');if(!row||event.target.closest('button'))return;const index=Math.max(0,Number(row.querySelector('.solve-index')?.textContent||1)-1);selectedSolveId=currentHistory()[index]?.id||null;setTimeout(renderSolveMetadataEditor,0);},true);}
    const modal=document.getElementById('solveDetailsModal');if(!modal)return;const observer=new MutationObserver(()=>{if(!modal.hidden)renderSolveMetadataEditor();});observer.observe(modal,{attributes:true,attributeFilter:['hidden']});
  }

  function renderSolveMetadataEditor(){
    const modal=document.getElementById('solveDetailsModal');if(!modal||modal.hidden||!selectedSolveId)return;const solve=currentHistory().find(s=>s.id===selectedSolveId);if(!solve)return;
    let box=modal.querySelector('.solve-metadata-editor');if(!box){box=document.createElement('div');box.className='solve-metadata-editor';modal.querySelector('.solve-details-actions')?.before(box);}
    const tags=allTags();box.innerHTML=`<div class="metadata-head"><strong>${txt('תגיות','Tags')}</strong><button type="button" data-add-tag>+ ${txt('תגית','Tag')}</button></div><div class="tag-picker"></div><label class="note-field"><span>${txt('הערות','Notes')}</span><textarea rows="3" maxlength="500"></textarea></label><small class="metadata-save-state"></small>`;
    const picker=box.querySelector('.tag-picker');tags.forEach(tag=>{const label=document.createElement('label');label.className='tag-chip';label.innerHTML='<input type="checkbox"><span></span>';label.querySelector('span').textContent=tag;label.querySelector('input').checked=solve.tags.includes(tag);picker.appendChild(label);});box.querySelector('textarea').value=solve.note;
    const save=()=>{const chosen=[...picker.querySelectorAll('input:checked')].map(input=>input.nextElementSibling.textContent);setSolveMetadata(solve.id,chosen,box.querySelector('textarea').value);box.querySelector('.metadata-save-state').textContent=txt('נשמר','Saved');};
    picker.addEventListener('change',save);box.querySelector('textarea').addEventListener('change',save);box.querySelector('[data-add-tag]').addEventListener('click',()=>{const value=prompt(txt('שם לתגית החדשה:','New tag name:'));if(!value?.trim())return;addCustomTag(value);const current=[...picker.querySelectorAll('input:checked')].map(input=>input.nextElementSibling.textContent);setSolveMetadata(solve.id,[...current,value.trim()],box.querySelector('textarea').value);renderSolveMetadataEditor();});
  }

  function filteredHistory(){let items=currentHistory();if(selectedTags.length)items=items.filter(s=>selectedTags.every(tag=>s.tags.includes(tag)));const amount=analyticsFilter==='all'?items.length:Number(analyticsFilter);return items.slice(0,amount);}
  function openAnalytics(){const modal=document.getElementById('analyticsModal');modal.hidden=false;renderAnalytics();}

  function renderAnalytics(){
    const modal=document.getElementById('analyticsModal');if(!modal)return;modal.querySelector('[data-analytics-title]').textContent=txt('ניתוח התקדמות','Progress Analytics');
    const filter=modal.querySelector('#analyticsTagFilter'),selected=new Set(selectedTags);filter.innerHTML='';allTags().forEach(tag=>{const o=document.createElement('option');o.value=tag;o.textContent=tag;o.selected=selected.has(tag);filter.appendChild(o);});
    modal.querySelectorAll('[data-range]').forEach(b=>b.classList.toggle('active',b.dataset.range===analyticsFilter));const items=filteredHistory();renderGraph(modal.querySelector('#analyticsGraph'),items);renderMetricCards(modal.querySelector('#analyticsMetrics'),items);renderSummary(modal.querySelector('#sessionSummaryCard'));renderInsights(modal.querySelector('#analyticsInsights'));
  }

  function downsample(points,max=700){if(points.length<=max)return points;const bucket=(points.length-2)/(max-2),out=[points[0]];for(let i=0;i<max-2;i++){const start=Math.floor(i*bucket)+1,end=Math.min(points.length-1,Math.floor((i+1)*bucket)+1);let min=points[start],maxP=points[start];for(let j=start;j<end;j++){if(points[j].v<min.v)min=points[j];if(points[j].v>maxP.v)maxP=points[j];}out.push(i%2?maxP:min);}out.push(points.at(-1));return out;}
  function renderGraph(host,items){
    host.innerHTML='';if(!items.length){host.textContent=txt('אין נתונים להצגה.','No data to display.');return;}const chronological=[...items].reverse(),single=chronological.map((s,i)=>({i,v:effective(s),s})).filter(p=>Number.isFinite(p.v)),ao5=rollingAo(chronological,5).map((v,i)=>({i,v})).filter(p=>Number.isFinite(p.v)),ao12=rollingAo(chronological,12).map((v,i)=>({i,v})).filter(p=>Number.isFinite(p.v));const all=[...single,...ao5,...ao12];if(!all.length){host.textContent='DNF';return;}const min=Math.min(...all.map(p=>p.v)),max=Math.max(...all.map(p=>p.v)),w=1000,h=360,pad=42,range=Math.max(1,max-min);const x=i=>pad+(i/Math.max(1,chronological.length-1))*(w-pad*2),y=v=>h-pad-((v-min)/range)*(h-pad*2);
    const path=pts=>downsample(pts).map((p,i)=>`${i?'L':'M'}${x(p.i).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox',`0 0 ${w} ${h}`);svg.setAttribute('role','img');svg.setAttribute('aria-label',txt('גרף התקדמות זמנים','Solve time progress graph'));svg.innerHTML=`<line class="graph-axis" x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}"/><line class="graph-axis" x1="${pad}" y1="${pad}" x2="${pad}" y2="${h-pad}"/><path class="graph-line single" d="${path(single)}"/><path class="graph-line ao5" d="${path(ao5)}"/><path class="graph-line ao12" d="${path(ao12)}"/><text class="graph-label" x="${pad}" y="24">${fmt(max)}s</text><text class="graph-label" x="${pad}" y="${h-8}">${fmt(min)}s</text>`;
    let best=Infinity,b5=Infinity,b12=Infinity;single.forEach(p=>{if(p.v<best){best=p.v;const c=document.createElementNS(svg.namespaceURI,'circle');c.setAttribute('class','pb-marker single');c.setAttribute('cx',x(p.i));c.setAttribute('cy',y(p.v));c.setAttribute('r','4');svg.appendChild(c);}});ao5.forEach(p=>{if(p.v<b5){b5=p.v;const c=document.createElementNS(svg.namespaceURI,'circle');c.setAttribute('class','pb-marker ao5');c.setAttribute('cx',x(p.i));c.setAttribute('cy',y(p.v));c.setAttribute('r','3');svg.appendChild(c);}});ao12.forEach(p=>{if(p.v<b12){b12=p.v;const c=document.createElementNS(svg.namespaceURI,'circle');c.setAttribute('class','pb-marker ao12');c.setAttribute('cx',x(p.i));c.setAttribute('cy',y(p.v));c.setAttribute('r','3');svg.appendChild(c);}});host.appendChild(svg);const legend=document.createElement('div');legend.className='graph-legend';legend.innerHTML='<span>Single</span><span>Ao5</span><span>Ao12</span>';host.appendChild(legend);
  }

  function renderMetricCards(host,items){const m=metrics(items);host.innerHTML=`<div><span>${txt('ממוצע','Mean')}</span><strong>${m.mean===null?'—':fmt(m.mean)}</strong></div><div><span>${txt('שיא','Best')}</span><strong>${m.bestSingle===null?'—':fmt(m.bestSingle)}</strong></div><div><span>Ao5</span><strong>${m.best5===null?'—':fmt(m.best5)}</strong></div><div><span>Ao12</span><strong>${m.best12===null?'—':fmt(m.best12)}</strong></div><div><span>${txt('עקביות','Consistency')}</span><strong>${m.consistency===null?'—':`±${fmt(m.consistency)}s`}</strong></div><div><span>DNF</span><strong>${(m.dnfRate*100).toFixed(1)}%</strong></div><div><span>+2</span><strong>${(m.plus2Rate*100).toFixed(1)}%</strong></div>`;}

  function renderSummary(host){const items=currentHistory(),m=metrics(items),prevSession=previousSession(),prev=prevSession?metrics(sessionHistory(currentEvent(),prevSession.id)):null;const diff=prev&&m.mean!==null&&prev.mean!==null?m.mean-prev.mean:null;host.innerHTML=`<div class="summary-head"><strong>${txt('סיכום סשן','Session Summary')}</strong><span>${m.count} ${txt('פתרונות','solves')}</span></div><div class="summary-grid"><div><span>${txt('ממוצע','Mean')}</span><strong>${m.mean===null?'—':fmt(m.mean)}</strong>${diff===null?'':`<small>${diff<0?'↓':'↑'} ${fmt(Math.abs(diff))}s</small>`}</div><div><span>Best</span><strong>${m.bestSingle===null?'—':fmt(m.bestSingle)}</strong></div><div><span>Best Ao5</span><strong>${m.best5===null?'—':fmt(m.best5)}</strong></div><div><span>Best Ao12</span><strong>${m.best12===null?'—':fmt(m.best12)}</strong></div><div><span>Best Ao50</span><strong>${m.best50===null?'—':fmt(m.best50)}</strong></div><div><span>Best Ao100</span><strong>${m.best100===null?'—':fmt(m.best100)}</strong></div><div><span>DNF</span><strong>${m.dnf} · ${(m.dnfRate*100).toFixed(1)}%</strong></div><div><span>+2</span><strong>${m.plus2} · ${(m.plus2Rate*100).toFixed(1)}%</strong></div><div><span>${txt('עקביות','Consistency')}</span><strong>${m.consistency===null?'—':`±${fmt(m.consistency)}s`}</strong></div><div><span>PBs</span><strong>${pbCount(items)}</strong></div></div>`;}
  function renderInsights(host){const items=currentHistory(),m=metrics(items),prevSession=previousSession(),prev=prevSession?metrics(sessionHistory(currentEvent(),prevSession.id)):null,last12=items.length>=12?metrics(items.slice(0,12)):null,prior12=items.length>=24?metrics(items.slice(12,24)):null,list=insights(m,prev,last12,prior12);host.innerHTML=list.length?`<strong>${txt('תובנות','Insights')}</strong><ul>${list.map(v=>`<li>${v}</li>`).join('')}</ul>`:'';}

  ensureUi();
  window.SSCAdvanced=Object.freeze({normalizeSolve,effective,metrics,setSolveMetadata,getCurrentHistory:currentHistory,getCustomTags:customTags});
})();
