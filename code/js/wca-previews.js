(() => {
  'use strict';

  const EVENT_REGISTRY = Object.freeze({
    '222':   { id:'222',   label:'2×2',  name:'2x2x2 Cube',              family:'cube',  puzzle:'2x2x2' },
    '333':   { id:'333',   label:'3×3',  name:'3x3x3 Cube',              family:'cube',  puzzle:'3x3x3' },
    '444':   { id:'444',   label:'4×4',  name:'4x4x4 Cube',              family:'cube',  puzzle:'4x4x4' },
    '555':   { id:'555',   label:'5×5',  name:'5x5x5 Cube',              family:'cube',  puzzle:'5x5x5' },
    '666':   { id:'666',   label:'6×6',  name:'6x6x6 Cube',              family:'cube',  puzzle:'6x6x6' },
    '777':   { id:'777',   label:'7×7',  name:'7x7x7 Cube',              family:'cube',  puzzle:'7x7x7' },
    '333bf': { id:'333bf', label:'3BLD', name:'3x3x3 Blindfolded',       family:'cube',  puzzle:'3x3x3', baseEvent:'333' },
    '333fm': { id:'333fm', label:'FMC',  name:'3x3x3 Fewest Moves',      family:'cube',  puzzle:'3x3x3', baseEvent:'333' },
    '333oh': { id:'333oh', label:'OH',   name:'3x3x3 One-Handed',        family:'cube',  puzzle:'3x3x3', baseEvent:'333' },
    'clock': { id:'clock', label:'CLOCK',name:'Clock',                    family:'clock', puzzle:'clock' },
    'minx':  { id:'minx',  label:'MEGA', name:'Megaminx',                family:'minx',  puzzle:'megaminx' },
    'pyram': { id:'pyram', label:'PYRA', name:'Pyraminx',                family:'pyram', puzzle:'pyraminx' },
    'skewb': { id:'skewb', label:'SKEWB',name:'Skewb',                   family:'skewb', puzzle:'skewb' },
    'sq1':   { id:'sq1',   label:'SQ-1', name:'Square-1',                family:'sq1',   puzzle:'square1' },
    'fto':   { id:'fto',   label:'FTO',  name:'Face-Turning Octahedron', family:'fto',   puzzle:'fto', scrambleDisplayEvent:'333ft', officialFrom:'2027-01-02' },
    '444bf': { id:'444bf', label:'4BLD', name:'4x4x4 Blindfolded',        family:'cube',  puzzle:'4x4x4', baseEvent:'444', scrambleDisplayEvent:'444' },
    '555bf': { id:'555bf', label:'5BLD', name:'5x5x5 Blindfolded',        family:'cube',  puzzle:'5x5x5', baseEvent:'555' },
    '333mbf':{ id:'333mbf',label:'MBLD', name:'3x3x3 Multi-Blind',        family:'cube',  puzzle:'3x3x3', baseEvent:'333' }
  });

  const EVENT_ALIASES = Object.freeze({
    '2x2':'222','2×2':'222','222':'222',
    '3x3':'333','3×3':'333','333':'333',
    '4x4':'444','4×4':'444','444':'444',
    '5x5':'555','5×5':'555','555':'555',
    '6x6':'666','6×6':'666','666':'666',
    '7x7':'777','7×7':'777','777':'777',
    '3bld':'333bf','333bf':'333bf','3x3bf':'333bf',
    'fmc':'333fm','333fm':'333fm',
    'oh':'333oh','333oh':'333oh','3x3oh':'333oh',
    'clock':'clock',
    'megaminx':'minx','mega':'minx','minx':'minx',
    'pyraminx':'pyram','pyra':'pyram','pyram':'pyram',
    'skewb':'skewb',
    'square-1':'sq1','square1':'sq1','sq-1':'sq1','sq1':'sq1',
    'fto':'fto','333ft':'fto','face-turning-octahedron':'fto','face turning octahedron':'fto','octahedron':'fto',
    '4bld':'444bf','444bf':'444bf','4x4bf':'444bf',
    '5bld':'555bf','555bf':'555bf','5x5bf':'555bf',
    'mbld':'333mbf','multi-blind':'333mbf','333mbf':'333mbf'
  });

  function normalizeEventId(value){
    const raw=String(value ?? '333').trim().toLowerCase();
    return EVENT_ALIASES[raw] || raw;
  }

  function scrambleToText(scramble){
    if(Array.isArray(scramble))return scramble.join(' ').trim();
    return String(scramble ?? '').trim();
  }

  function clearWcaClasses(container){
    [...container.classList].forEach(className=>{
      if(className.startsWith('wca-family-') || className.startsWith('wca-event-'))container.classList.remove(className);
    });
  }

  function applyContainerMetadata(container,event){
    clearWcaClasses(container);
    container.classList.add('wca-preview-ready',`wca-family-${event.family}`,`wca-event-${event.id}`);
    container.dataset.puzzle=event.label;
    container.dataset.wcaEvent=event.id;
    container.dataset.wcaPuzzle=event.puzzle;
    if(event.officialFrom)container.dataset.wcaOfficialFrom=event.officialFrom;
    else delete container.dataset.wcaOfficialFrom;
    container.title=event.name;
    container.setAttribute('aria-label',`${event.name} 2D scramble preview`);
  }

  function renderWithScrambleDisplay(container,scramble,event){
    applyContainerMetadata(container,event);
    container.dataset.previewEngine='scramble-display';
    container.replaceChildren();

    const display=document.createElement('scramble-display');
    display.className='ssc-wca-scramble-display';
    display.setAttribute('event',event.scrambleDisplayEvent || event.id);
    display.setAttribute('visualization','2D');
    display.setAttribute('scramble',scrambleToText(scramble));
    display.setAttribute('aria-hidden','true');
    container.appendChild(display);

    window.SSCPreviewSizing?.scheduleFit?.(container);
  }

  function render(container,scramble,eventValue='333'){
    if(!container)return;
    const eventId=normalizeEventId(eventValue);
    const event=EVENT_REGISTRY[eventId];

    if(!event){
      container.dataset.puzzle=String(eventValue || '?').toUpperCase();
      container.dataset.wcaEvent=eventId;
      container.dataset.previewEngine='unsupported';
      container.innerHTML='<div class="wca-preview-unsupported" role="status">Preview not configured</div>';
      console.warn(`[SSC preview] Unsupported WCA event: ${eventValue}`);
      window.SSCPreviewSizing?.scheduleFit?.(container);
      return;
    }

    renderWithScrambleDisplay(container,scramble,event);
  }

  const api=Object.freeze({
    render,
    normalizeEventId,
    supportsEvent(eventId){return Boolean(EVENT_REGISTRY[normalizeEventId(eventId)])},
    getEvent(eventId){const event=EVENT_REGISTRY[normalizeEventId(eventId)];return event?{...event}:null},
    getEvents(){return Object.values(EVENT_REGISTRY).map(event=>({...event}))},
    eventRegistry:EVENT_REGISTRY,
    previewEngine:'scramble-display'
  });

  window.SSCCubePreview=api;
  window.SSCWCAEvents=EVENT_REGISTRY;
})();
