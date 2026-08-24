(() => {
  'use strict';

  const renderTokens = new WeakMap();
  const MODE_ALIASES = Object.freeze({
    '2d':'2d','2-d':'2d','flat':'2d','net':'2d',
    '3d':'3d','3-d':'3d','three':'3d','threejs':'3d',
    'single-face':'single-face','singleface':'single-face','face':'single-face'
  });

  function normalizeMode(value){
    const raw = String(value ?? '2d').trim().toLowerCase();
    return MODE_ALIASES[raw] || raw;
  }

  function nextToken(container){
    const token = (renderTokens.get(container) || 0) + 1;
    renderTokens.set(container,token);
    return token;
  }

  function isCurrent(container,token){
    return renderTokens.get(container) === token;
  }

  function setModeClass(container,mode){
    container.classList.remove('ssc-preview-mode-2d','ssc-preview-mode-3d','ssc-preview-mode-single-face');
    container.classList.add(`ssc-preview-mode-${mode}`);
    container.dataset.previewMode = mode;
  }

  function supportsMode(mode,eventId){
    const normalized = normalizeMode(mode);
    if(normalized === '2d') return Boolean(window.SSCCubePreview?.supportsEvent?.(eventId) ?? window.SSCCubePreview?.render);
    if(normalized === '3d') return Boolean(window.SSCPuzzle3D?.supportsEvent?.(eventId));
    if(normalized === 'single-face') return false;
    return false;
  }

  function getRenderer(mode){
    const normalized = normalizeMode(mode);
    if(normalized === '2d') return window.SSCCubePreview || null;
    if(normalized === '3d') return window.SSCPuzzle3D || null;
    return null;
  }

  function render2D(container,scramble,eventId){
    window.SSCPuzzle3D?.dispose?.(container);
    setModeClass(container,'2d');
    if(!window.SSCCubePreview?.render){
      container.innerHTML = '<div class="wca-preview-unsupported" role="status">2D preview unavailable</div>';
      return null;
    }
    return window.SSCCubePreview.render(container,scramble,eventId);
  }

  async function render3D(container,scramble,eventId,token,fallbackTo2D){
    if(!window.SSCPuzzle3D?.supportsEvent?.(eventId)){
      if(fallbackTo2D) return render2D(container,scramble,eventId);
      container.innerHTML = '<div class="ssc-puzzle-3d-fallback" role="status">3D preview unavailable</div>';
      return null;
    }

    setModeClass(container,'3d');
    const player = await window.SSCPuzzle3D.render(container,scramble,eventId);
    if(!isCurrent(container,token)) return null;
    if(!player && fallbackTo2D) return render2D(container,scramble,eventId);
    return player;
  }

  async function render({container,eventId='333',scramble='',mode='2d',fallbackTo2D=true}={}){
    if(!(container instanceof Element)) throw new TypeError('SSCPreviewManager.render() requires a DOM container');
    const normalizedMode = normalizeMode(mode);
    const token = nextToken(container);

    if(normalizedMode === '2d') return render2D(container,scramble,eventId);
    if(normalizedMode === '3d') return render3D(container,scramble,eventId,token,fallbackTo2D);

    if(normalizedMode === 'single-face'){
      if(fallbackTo2D) return render2D(container,scramble,eventId);
      container.innerHTML = '<div class="wca-preview-unsupported" role="status">Single Face preview is not connected yet</div>';
      return null;
    }

    throw new Error(`Unknown SSC preview mode: ${mode}`);
  }

  function clear(container){
    if(!(container instanceof Element)) return;
    nextToken(container);
    window.SSCPuzzle3D?.dispose?.(container);
    if(window.SSCCubePreview?.clear) window.SSCCubePreview.clear(container);
    else container.replaceChildren();
    container.classList.remove('ssc-preview-mode-2d','ssc-preview-mode-3d','ssc-preview-mode-single-face');
    delete container.dataset.previewMode;
  }

  window.SSCPreviewManager = Object.freeze({
    render,
    clear,
    supportsMode,
    getRenderer,
    normalizeMode
  });
})();
