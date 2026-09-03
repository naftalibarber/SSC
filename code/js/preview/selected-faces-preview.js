(() => {
  'use strict';

  const SVG_NS='http://www.w3.org/2000/svg';
  const ENABLED_KEY='sscSelectedFacesPreviewEnabledV1';
  const FACES_KEY='sscSelectedFacesV1';
  const FACE_ORDER=Object.freeze(['U','L','F','R','B','D']);
  const FACE_SET=new Set(FACE_ORDER);
  const underlyingPreview=window.SSCCubePreview||null;
  const underlyingRender=underlyingPreview?.render?.bind(underlyingPreview)||null;
  let enabled=localStorage.getItem(ENABLED_KEY)==='true';
  let selectedFaces=loadFaces();
  let lastRender=null;
  let renderSequence=0;

  function isEnglish(){return document.documentElement.lang==='en'||document.documentElement.dir==='ltr';}
  function normalizeFaces(value){
    const source=Array.isArray(value)?value:String(value||'').split(/[\s,]+/);
    const requested=new Set(source.map(face=>String(face||'').trim().toUpperCase()).filter(face=>FACE_SET.has(face)));
    const normalized=FACE_ORDER.filter(face=>requested.has(face));
    return normalized.length?normalized:['F'];
  }
  function loadFaces(){
    try{return normalizeFaces(JSON.parse(localStorage.getItem(FACES_KEY)||'[]'));}
    catch{return['F'];}
  }
  function saveFaces(){localStorage.setItem(FACES_KEY,JSON.stringify(selectedFaces));}

  function injectStyles(){
    if(document.getElementById('sscSelectedFacesPreviewStyles'))return;
    const style=document.createElement('style');
    style.id='sscSelectedFacesPreviewStyles';
    style.textContent=`
      .cube-preview-card.ssc-preview-mode-faces{overflow:hidden!important;padding:5px!important}
      .ssc-selected-faces-preview{
        direction:ltr!important;width:100%;height:100%;min-width:0;min-height:0;box-sizing:border-box;
        display:grid;grid-template-columns:repeat(var(--ssc-selected-face-columns,1),minmax(0,1fr));
        grid-template-rows:repeat(var(--ssc-selected-face-rows,1),minmax(0,1fr));place-items:center;gap:6px;padding:3px;
      }
      .ssc-selected-face-slot{
        direction:ltr!important;height:100%;width:auto;max-width:100%;max-height:100%;aspect-ratio:1/1;
        box-sizing:border-box;display:flex;align-items:stretch;justify-content:stretch;overflow:hidden;
      }
      .ssc-selected-faces-preview[data-count="1"] .ssc-selected-face-slot{height:min(88%,220px);width:auto}
      .ssc-selected-face-svg{
        direction:ltr!important;display:block;width:100%;height:100%;max-width:100%;max-height:100%;overflow:hidden;
      }
      .ssc-preview-face-setting[hidden]{display:none!important}
      .ssc-preview-face-options{direction:ltr;width:100%;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px}
      .ssc-preview-face-option{
        min-width:0;display:flex;align-items:center;justify-content:center;gap:5px;padding:7px 4px;
        border:1px solid var(--border);border-radius:8px;background:var(--soft);color:var(--text);
        font-weight:800;cursor:pointer;user-select:none;
      }
      .ssc-preview-face-option:has(input:checked){border-color:var(--accent);box-shadow:inset 0 0 0 1px var(--accent)}
      .ssc-preview-face-option:has(input:disabled){opacity:.72;cursor:not-allowed}
      .ssc-preview-face-option input{margin:0;accent-color:var(--accent)}
      @media(max-width:520px){.ssc-preview-face-options{grid-template-columns:repeat(3,minmax(0,1fr))}}
    `;
    document.head.appendChild(style);
  }

  function clear3DCardGeometry(container){
    if(!(container instanceof HTMLElement))return;
    container.classList.remove(
      'ssc-preview-mode-2d','ssc-preview-mode-3d','ssc-preview-mode-single-face',
      'ssc-preview-thumbnail-3d','ssc-preview-3d-ready','ssc-preview-3d-static'
    );
    container.classList.add('ssc-preview-mode-faces');
    for(const property of ['display','width','min-width','height','min-height','max-width','max-height'])container.style.removeProperty(property);
    container.style.setProperty('visibility','visible','important');
    container.style.setProperty('opacity','1','important');
    container.style.setProperty('pointer-events','auto','important');
  }
  function geometryForCount(count){
    const columns=count<=1?1:count<=4?2:3;
    return{columns,rows:Math.ceil(count/columns)};
  }
  function createFaceViewport(renderer,state,faceName,order,colors,geometry,prefix,count){
    const slot=document.createElement('div');
    slot.className='ssc-selected-face-slot';
    slot.dataset.face=faceName;
    const widthLimited=count===2||count>=5;
    slot.style.width=widthLimited?'100%':'auto';
    slot.style.height=widthLimited?'auto':'100%';
    slot.style.aspectRatio='1 / 1';
    slot.setAttribute('aria-label',faceName);

    const [faceX,faceY]=renderer.faceOrigin(faceName,geometry);
    const svg=document.createElementNS(SVG_NS,'svg');
    svg.setAttribute('class','ssc-selected-face-svg');
    svg.setAttribute('viewBox',`${faceX} ${faceY} ${geometry.faceSize} ${geometry.faceSize}`);
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.setAttribute('role','img');
    svg.setAttribute('aria-hidden','true');
    svg.setAttribute('focusable','false');
    svg.setAttribute('data-face',faceName);
    svg.setAttribute('data-cube-order',String(order));
    svg.setAttribute('data-preview-engine','ssc-svg-v1');
    svg.setAttribute('data-face-renderer','ssc-svg-face-v1');

    // This is the same face factory used by the full 2D net. Selected Faces
    // creates only a square viewport/slot; it never creates stickers itself.
    svg.appendChild(renderer.createFaceGroup({
      face:faceName,
      faceMatrix:state.faces[faceName],
      order,
      colors,
      idPrefix:prefix,
      geometry
    }));
    slot.appendChild(svg);
    return slot;
  }

  function renderSelectedFaces(container,scramble,eventId='333'){
    if(!(container instanceof Element))return null;
    const preview=window.SSCPreviewV1;
    const renderer=window.SSCSvgCubeRenderer;
    if(
      !preview?.supportsEvent?.(eventId)||!preview?.buildState||!preview?.orderForEvent||
      !renderer?.createFaceGroup||!renderer?.geometryFor||!renderer?.faceOrigin
    )return null;

    window.SSCPuzzle3D?.dispose?.(container);
    const normalizedEventId=preview.normalizeEventId?.(eventId)||String(eventId||'333');
    const order=preview.orderForEvent(normalizedEventId);
    const state=preview.buildState(normalizedEventId,scramble,{strict:true});
    const colors=preview.readColors?.()||window.SSCCubePreview?.getColors?.()||{};
    const selectedLineWidth=window.SSCPreviewSizing?.getCubeLineWidth?.();
    const faceGeometry=renderer.geometryFor(order,selectedLineWidth);
    const prefix=`ssc-selected-${++renderSequence}`;

    const root=document.createElement('div');
    root.className='ssc-selected-faces-preview';
    root.dataset.count=String(selectedFaces.length);
    root.dataset.faces=selectedFaces.join('');
    root.dataset.cubeOrder=String(order);
    root.dataset.faceRenderer='ssc-svg-face-v1';
    const layout=geometryForCount(selectedFaces.length);
    root.style.setProperty('--ssc-selected-face-columns',String(layout.columns));
    root.style.setProperty('--ssc-selected-face-rows',String(layout.rows));

    for(const faceName of selectedFaces){
      root.appendChild(createFaceViewport(renderer,state,faceName,order,colors,faceGeometry,prefix,selectedFaces.length));
    }

    clear3DCardGeometry(container);
    container.replaceChildren(root);
    container.dataset.previewMode='faces';
    container.dataset.previewModePreference='faces';
    container.dataset.previewEngine='ssc-selected-faces';
    container.dataset.previewRenderer='ssc-svg-v1';
    container.dataset.previewReady='true';
    container.dataset.wcaEvent=normalizedEventId;
    container.dataset.selectedFaces=selectedFaces.join(',');
    container.dataset.puzzle=`${order}×${order}`;
    container.setAttribute('role','button');
    container.setAttribute('aria-label',isEnglish()?`Selected cube faces: ${selectedFaces.join(', ')}`:`פאות קובייה נבחרות: ${selectedFaces.join(', ')}`);
    lastRender={container,scramble,eventId:normalizedEventId};
    window.SSCPreviewSettings?.syncLastRender?.(container,scramble,normalizedEventId);
    window.SSCPreviewSizing?.scheduleFit?.(container);
    return Object.freeze({root,state,eventId:normalizedEventId,order,faces:[...selectedFaces],renderer:'ssc-svg-v1'});
  }

  async function connectedRender(container,scramble,eventId='333'){
    if(!enabled)return underlyingRender?.(container,scramble,eventId)??null;
    if(underlyingRender){
      try{await underlyingRender(container,scramble,eventId);}
      catch(error){console.warn('[SSC selected faces] Base preview bridge failed before face render.',error);}
    }
    return renderSelectedFaces(container,scramble,eventId);
  }
  function installPreviewWrapper(){
    if(!underlyingPreview||!underlyingRender||window.SSCCubePreview?.__sscSelectedFacesLayer)return;
    const api=window.SSCCubePreview;
    const setColors=api.setColors?.bind(api);
    const resetColors=api.resetColors?.bind(api);
    window.SSCCubePreview={
      ...api,
      __sscSelectedFacesLayer:true,
      render:connectedRender,
      setColors(next){
        const result=setColors?.(next);
        if(enabled&&lastRender)queueMicrotask(()=>renderSelectedFaces(lastRender.container,lastRender.scramble,lastRender.eventId));
        return result;
      },
      resetColors(){
        const result=resetColors?.();
        if(enabled&&lastRender)queueMicrotask(()=>renderSelectedFaces(lastRender.container,lastRender.scramble,lastRender.eventId));
        return result;
      }
    };
  }

  function applyFaceColorLabels(){
    const control=document.getElementById('cubeColorsControl');
    if(!(control instanceof Element))return;
    const items=new Map();
    control.querySelectorAll('.cube-color-item').forEach(item=>{
      const input=item.querySelector('[data-cube-face]');
      const face=String(input?.dataset?.cubeFace||'').toUpperCase();
      if(FACE_SET.has(face))items.set(face,item);
      const label=item.querySelector('span');
      if(label&&FACE_SET.has(face)&&label.textContent!==face)label.textContent=face;
    });
    const target=FACE_ORDER.filter(face=>items.has(face));
    const current=[...control.querySelectorAll(':scope > .cube-color-item')].map(item=>String(item.querySelector('[data-cube-face]')?.dataset?.cubeFace||'').toUpperCase());
    if(current.join(',')!==target.join(','))target.forEach(face=>control.appendChild(items.get(face)));
    const reset=document.getElementById('resetCubeColors');
    if(reset&&control.lastElementChild!==reset)control.appendChild(reset);
  }
  function ensureFaceOption(){
    const select=document.getElementById('previewModeSelect');
    if(!(select instanceof HTMLSelectElement))return null;
    let option=select.querySelector('option[value="faces"]');
    if(!option){option=document.createElement('option');option.value='faces';select.appendChild(option);}
    option.textContent=isEnglish()?'Selected faces':'פאות נבחרות';
    return select;
  }
  function ensureFaceControls(){
    const modeRow=document.getElementById('previewModeSettingRow');
    if(!modeRow?.parentElement)return null;
    let row=document.getElementById('previewFacesSettingRow');
    if(!row){
      row=document.createElement('div');
      row.id='previewFacesSettingRow';
      row.className='general-setting-row ssc-preview-face-setting';
      const label=document.createElement('span');label.id='previewFacesSettingLabel';
      const options=document.createElement('div');options.id='previewFacesOptions';options.className='ssc-preview-face-options';
      for(const face of FACE_ORDER){
        const option=document.createElement('label');option.className='ssc-preview-face-option';
        option.innerHTML=`<input type="checkbox" data-ssc-preview-face="${face}"><span>${face}</span>`;
        options.appendChild(option);
      }
      row.append(label,options);modeRow.insertAdjacentElement('afterend',row);
    }
    const label=row.querySelector('#previewFacesSettingLabel');
    if(label)label.textContent=isEnglish()?'Faces to show (at least one)':'פאות להצגה (לפחות אחת)';
    return row;
  }
  function syncControls(){
    const select=ensureFaceOption(),row=ensureFaceControls();
    if(select&&enabled)select.value='faces';
    if(row)row.hidden=!enabled;
    document.querySelectorAll('[data-ssc-preview-face]').forEach(input=>{
      const checked=selectedFaces.includes(input.dataset.sscPreviewFace);
      input.checked=checked;input.disabled=checked&&selectedFaces.length===1;
    });
    applyFaceColorLabels();
  }
  async function rerenderFaces(){
    if(!enabled||!lastRender?.container?.isConnected)return null;
    return renderSelectedFaces(lastRender.container,lastRender.scramble,lastRender.eventId);
  }
  async function setFaces(value,{rerender=true}={}){
    selectedFaces=normalizeFaces(value);saveFaces();syncControls();
    if(rerender)await rerenderFaces();
    return[...selectedFaces];
  }
  async function setEnabled(value,{rerender=true}={}){
    enabled=Boolean(value);localStorage.setItem(ENABLED_KEY,String(enabled));syncControls();
    if(rerender){
      if(enabled){
        const card=document.getElementById('cubePreview2D');
        if(lastRender?.container?.isConnected)await renderSelectedFaces(lastRender.container,lastRender.scramble,lastRender.eventId);
        else if(card instanceof Element)await window.SSCPreviewSettings?.rerender?.();
      }else await window.SSCPreviewSettings?.rerender?.();
    }
    window.dispatchEvent(new CustomEvent('ssc-selected-faces-mode-change',{detail:{enabled,faces:[...selectedFaces]}}));
    return enabled;
  }
  function bindControls(){
    const select=ensureFaceOption();ensureFaceControls();
    if(select&&select.dataset.sscSelectedFacesBound!=='true'){
      select.dataset.sscSelectedFacesBound='true';
      select.addEventListener('change',event=>{
        if(event.target.value==='faces'){event.stopImmediatePropagation();setEnabled(true);return;}
        if(enabled){
          const baseMode=window.SSCPreviewSettings?.getMode?.();
          setEnabled(false,{rerender:baseMode===event.target.value});
        }
      },true);
    }
    document.querySelectorAll('[data-ssc-preview-face]').forEach(input=>{
      if(input.dataset.sscSelectedFaceBound==='true')return;
      input.dataset.sscSelectedFaceBound='true';
      input.addEventListener('change',event=>{
        const face=event.target.dataset.sscPreviewFace,next=new Set(selectedFaces);
        if(event.target.checked)next.add(face);else next.delete(face);
        if(next.size===0){event.target.checked=true;syncControls();return;}
        setFaces(FACE_ORDER.filter(item=>next.has(item)));
      });
    });
    syncControls();
  }
  function refreshLabelsAndControls(){ensureFaceOption();ensureFaceControls();applyFaceColorLabels();syncControls();}
  function observeLanguage(){
    const root=document.documentElement;if(!root)return;
    new MutationObserver(()=>refreshLabelsAndControls()).observe(root,{attributes:true,attributeFilter:['lang','dir']});
  }

  injectStyles();installPreviewWrapper();bindControls();applyFaceColorLabels();observeLanguage();
  document.getElementById('generalSettingsButton')?.addEventListener('click',()=>queueMicrotask(refreshLabelsAndControls),true);
  window.addEventListener('ssc-preview-interaction-change',()=>queueMicrotask(syncControls));
  window.addEventListener('ssc-preview-mode-change',()=>queueMicrotask(syncControls));
  if(enabled)queueMicrotask(()=>window.SSCPreviewSettings?.rerender?.());

  window.SSCSelectedFacesPreview=Object.freeze({
    ENABLED_KEY,FACES_KEY,FACE_ORDER,isEnabled:()=>enabled,setEnabled,getFaces:()=>[...selectedFaces],
    setFaces,render:renderSelectedFaces,rerender:rerenderFaces,syncControls
  });
})();