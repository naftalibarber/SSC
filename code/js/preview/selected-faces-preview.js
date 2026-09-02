(() => {
  'use strict';

  const ENABLED_KEY='sscSelectedFacesPreviewEnabledV1';
  const FACES_KEY='sscSelectedFacesV1';
  const FACE_ORDER=Object.freeze(['U','L','F','R','B','D']);
  const FACE_SET=new Set(FACE_ORDER);
  const underlyingPreview=window.SSCCubePreview||null;
  const underlyingRender=underlyingPreview?.render?.bind(underlyingPreview)||null;
  let enabled=localStorage.getItem(ENABLED_KEY)==='true';
  let selectedFaces=loadFaces();
  let lastRender=null;
  let renderToken=0;

  function isEnglish(){
    return document.documentElement.lang==='en'||document.documentElement.dir==='ltr';
  }

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
      .cube-preview-card.ssc-preview-mode-faces{
        overflow:hidden!important;
        padding:4px!important;
      }
      .ssc-native-selected-faces{
        direction:ltr!important;
        width:100%;height:100%;min-width:0;min-height:0;
        box-sizing:border-box;
        display:flex!important;
        flex-wrap:wrap;
        align-content:center;
        align-items:center;
        justify-content:center;
        gap:6px;
        padding:3px;
        overflow:hidden;
      }
      .ssc-native-selected-faces>.ssc-native-cube3d-face.ssc-native-flat-face{
        position:relative!important;
        inset:auto!important;
        transform:none!important;
        flex:0 0 var(--ssc-native-flat-face-size)!important;
        width:var(--ssc-native-flat-face-size)!important;
        height:auto!important;
        max-width:var(--ssc-native-flat-face-size)!important;
        max-height:none!important;
        aspect-ratio:1/1!important;
        box-sizing:border-box!important;
        direction:ltr!important;
      }
      .ssc-native-selected-faces[data-count="1"]{
        --ssc-native-flat-face-size:min(88%,118px);
      }
      .ssc-native-selected-faces[data-count="2"]{
        --ssc-native-flat-face-size:min(calc((100% - 8px)/2),92px);
        flex-wrap:nowrap!important;
      }
      .ssc-native-selected-faces[data-count="3"],
      .ssc-native-selected-faces[data-count="4"]{
        --ssc-native-flat-face-size:min(calc((100% - 8px)/2),62px);
      }
      .ssc-native-selected-faces[data-count="5"],
      .ssc-native-selected-faces[data-count="6"]{
        --ssc-native-flat-face-size:min(calc((100% - 14px)/3),56px);
      }
      .ssc-native-selected-faces>.ssc-native-cube3d-face.ssc-native-flat-face[data-side]{
        transform:none!important;
      }
      .ssc-preview-face-setting[hidden]{display:none!important}
      .ssc-preview-face-options{
        direction:ltr;
        width:100%;
        display:grid;
        grid-template-columns:repeat(6,minmax(0,1fr));
        gap:6px;
      }
      .ssc-preview-face-option{
        min-width:0;
        display:flex;
        align-items:center;
        justify-content:center;
        gap:5px;
        padding:7px 4px;
        border:1px solid var(--border);
        border-radius:8px;
        background:var(--soft);
        color:var(--text);
        font-weight:800;
        cursor:pointer;
        user-select:none;
      }
      .ssc-preview-face-option:has(input:checked){
        border-color:var(--accent);
        box-shadow:inset 0 0 0 1px var(--accent);
      }
      .ssc-preview-face-option:has(input:disabled){opacity:.72;cursor:not-allowed}
      .ssc-preview-face-option input{margin:0;accent-color:var(--accent)}
      @media(max-width:520px){
        .ssc-preview-face-options{grid-template-columns:repeat(3,minmax(0,1fr))}
      }
    `;
    document.head.appendChild(style);
  }

  function isNativeFaceEvent(eventId){
    return Boolean(window.SSCPuzzle3D?.isNative3D?.(eventId));
  }

  function clearCardGeometry(container){
    if(!(container instanceof HTMLElement))return;
    container.classList.remove(
      'ssc-preview-mode-2d','ssc-preview-mode-3d','ssc-preview-mode-single-face',
      'ssc-preview-thumbnail-3d','ssc-preview-3d-ready','ssc-preview-3d-static',
      'ssc-native-cube3d-host','ssc-native-cube3d-static'
    );
    container.classList.add('ssc-preview-mode-faces','ssc-native-selected-faces-host');
    for(const property of ['display','width','min-width','height','min-height','max-width','max-height'])container.style.removeProperty(property);
    container.style.setProperty('visibility','visible','important');
    container.style.setProperty('opacity','1','important');
    container.style.setProperty('pointer-events','auto','important');
  }

  async function buildFacesFromNative3D(scramble,eventId){
    if(!isNativeFaceEvent(eventId)||!window.SSCPuzzle3D?.render)return null;
    const source=document.createElement('div');
    source.className='ssc-selected-faces-native-source';
    let player=null;
    try{
      player=await window.SSCPuzzle3D.render(source,scramble,eventId);
      if(!(player instanceof Element))return null;
      const event=window.SSCPuzzle3D.getEvent?.(eventId)||null;
      const order=Number(player.dataset.cubeOrder)||Number(event?.order)||0;
      if(!order)return null;

      const root=document.createElement('div');
      root.className='ssc-native-selected-faces';
      root.dataset.count=String(selectedFaces.length);
      root.dataset.faces=selectedFaces.join('');
      root.dataset.cubeOrder=String(order);
      root.dataset.source='native-3d';
      root.style.setProperty('--ssc-native-order',String(order));

      for(const side of selectedFaces){
        const face=source.querySelector(`.ssc-native-cube3d-face[data-side="${side}"]`);
        if(!(face instanceof HTMLElement))return null;
        face.classList.add('ssc-native-flat-face');
        face.setAttribute('aria-label',side);
        root.appendChild(face);
      }
      return{root,order,event};
    }finally{
      window.SSCPuzzle3D?.dispose?.(source);
    }
  }

  async function renderSelectedFaces(container,scramble,eventId='333'){
    if(!(container instanceof Element))return null;
    const token=++renderToken;
    const built=await buildFacesFromNative3D(scramble,eventId);
    if(token!==renderToken)return null;
    if(!built)return null;

    clearCardGeometry(container);
    container.replaceChildren(built.root);
    container.dataset.previewMode='faces';
    container.dataset.previewModePreference='faces';
    container.dataset.previewEngine='ssc-native-3d-selected-faces';
    container.dataset.previewReady='true';
    container.dataset.wcaEvent=built.event?.id||String(eventId||'333');
    container.dataset.wcaPuzzle=built.event?.puzzle||`${built.order}x${built.order}x${built.order}`;
    container.dataset.selectedFaces=selectedFaces.join(',');
    container.dataset.puzzle=`${built.order}×${built.order}`;
    container.setAttribute('role','button');
    container.setAttribute('aria-label',isEnglish()?`Selected cube faces from 3D: ${selectedFaces.join(', ')}`:`פאות קובייה נבחרות מתוך תצוגת 3D: ${selectedFaces.join(', ')}`);
    lastRender={container,scramble,eventId};
    window.SSCPreviewSettings?.syncLastRender?.(container,scramble,eventId);
    window.SSCPreviewSizing?.scheduleFit?.(container);
    return Object.freeze({root:built.root,eventId,order:built.order,faces:[...selectedFaces],source:'native-3d'});
  }

  async function connectedRender(container,scramble,eventId='333'){
    lastRender={container,scramble,eventId};
    if(!enabled)return underlyingRender?.(container,scramble,eventId)??null;

    let baseResult=null;
    if(underlyingRender){
      try{baseResult=await underlyingRender(container,scramble,eventId);}
      catch(error){console.warn('[SSC selected faces] Base preview bridge failed before native face render.',error);}
    }

    const nativeResult=await renderSelectedFaces(container,scramble,eventId);
    return nativeResult||baseResult;
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
    if(!option){
      option=document.createElement('option');
      option.value='faces';
      select.appendChild(option);
    }
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
      const label=document.createElement('span');
      label.id='previewFacesSettingLabel';
      const options=document.createElement('div');
      options.id='previewFacesOptions';
      options.className='ssc-preview-face-options';
      for(const face of FACE_ORDER){
        const option=document.createElement('label');
        option.className='ssc-preview-face-option';
        option.innerHTML=`<input type="checkbox" data-ssc-preview-face="${face}"><span>${face}</span>`;
        options.appendChild(option);
      }
      row.append(label,options);
      modeRow.insertAdjacentElement('afterend',row);
    }
    const label=row.querySelector('#previewFacesSettingLabel');
    if(label)label.textContent=isEnglish()?'Faces to show (at least one)':'פאות להצגה (לפחות אחת)';
    return row;
  }

  function syncControls(){
    const select=ensureFaceOption();
    const row=ensureFaceControls();
    if(select&&enabled)select.value='faces';
    if(row)row.hidden=!enabled;
    document.querySelectorAll('[data-ssc-preview-face]').forEach(input=>{
      const checked=selectedFaces.includes(input.dataset.sscPreviewFace);
      input.checked=checked;
      input.disabled=checked&&selectedFaces.length===1;
    });
    applyFaceColorLabels();
  }

  async function rerenderFaces(){
    if(!enabled||!lastRender?.container?.isConnected)return null;
    const result=await renderSelectedFaces(lastRender.container,lastRender.scramble,lastRender.eventId);
    if(result)return result;
    return underlyingRender?.(lastRender.container,lastRender.scramble,lastRender.eventId)??null;
  }

  async function setFaces(value,{rerender=true}={}){
    selectedFaces=normalizeFaces(value);
    saveFaces();
    syncControls();
    if(rerender)await rerenderFaces();
    return[...selectedFaces];
  }

  async function setEnabled(value,{rerender=true}={}){
    enabled=Boolean(value);
    localStorage.setItem(ENABLED_KEY,String(enabled));
    syncControls();
    if(rerender&&lastRender?.container?.isConnected){
      if(enabled)await rerenderFaces();
      else await underlyingRender?.(lastRender.container,lastRender.scramble,lastRender.eventId);
    }
    window.dispatchEvent(new CustomEvent('ssc-selected-faces-mode-change',{detail:{enabled,faces:[...selectedFaces]}}));
    return enabled;
  }

  function bindControls(){
    const select=ensureFaceOption();
    ensureFaceControls();
    if(select&&select.dataset.sscSelectedFacesBound!=='true'){
      select.dataset.sscSelectedFacesBound='true';
      select.addEventListener('change',event=>{
        if(event.target.value==='faces'){
          event.stopImmediatePropagation();
          setEnabled(true);
          return;
        }
        if(enabled)setEnabled(false,{rerender:false});
      },true);
    }

    document.querySelectorAll('[data-ssc-preview-face]').forEach(input=>{
      if(input.dataset.sscSelectedFaceBound==='true')return;
      input.dataset.sscSelectedFaceBound='true';
      input.addEventListener('change',event=>{
        const face=event.target.dataset.sscPreviewFace;
        const next=new Set(selectedFaces);
        if(event.target.checked)next.add(face);else next.delete(face);
        if(next.size===0){event.target.checked=true;syncControls();return;}
        setFaces(FACE_ORDER.filter(item=>next.has(item)));
      });
    });
    syncControls();
  }

  function refreshLabelsAndControls(){
    ensureFaceOption();
    ensureFaceControls();
    applyFaceColorLabels();
    syncControls();
  }

  function observeLanguage(){
    const root=document.documentElement;
    if(!root)return;
    new MutationObserver(()=>refreshLabelsAndControls()).observe(root,{attributes:true,attributeFilter:['lang','dir']});
  }

  injectStyles();
  installPreviewWrapper();
  bindControls();
  applyFaceColorLabels();
  observeLanguage();
  document.getElementById('generalSettingsButton')?.addEventListener('click',()=>queueMicrotask(refreshLabelsAndControls),true);
  window.addEventListener('ssc-preview-interaction-change',()=>queueMicrotask(syncControls));
  window.addEventListener('ssc-preview-mode-change',()=>queueMicrotask(syncControls));

  if(enabled&&lastRender)queueMicrotask(()=>rerenderFaces());

  window.SSCSelectedFacesPreview=Object.freeze({
    ENABLED_KEY,FACES_KEY,FACE_ORDER,
    isEnabled:()=>enabled,
    setEnabled,
    getFaces:()=>[...selectedFaces],
    setFaces,
    render:renderSelectedFaces,
    rerender:rerenderFaces,
    usesNative3DFaces:true
  });
})();
