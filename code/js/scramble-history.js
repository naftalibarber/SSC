(() => {
  const scrambleEl = document.getElementById('scramble');
  const prevButton = document.getElementById('prevScramble');
  const newButton = document.getElementById('newScramble');
  if (!scrambleEl || !prevButton || !newButton) return;

  const STORAGE_KEY = 'rubiksCubeTimerHistoryV1';
  const backStack = [];
  let current = scrambleEl.textContent.trim();
  let suppressObserver = false;
  let showingPrevious = false;

  function setScrambleText(value) {
    suppressObserver = true;
    scrambleEl.textContent = value;
    queueMicrotask(() => { suppressObserver = false; });
  }

  const observer = new MutationObserver(() => {
    if (suppressObserver) return;
    const next = scrambleEl.textContent.trim();
    if (!next || next === current) return;
    if (current) backStack.push(current);
    current = next;
    showingPrevious = false;
    prevButton.disabled = backStack.length === 0;
  });
  observer.observe(scrambleEl, { childList: true, characterData: true, subtree: true });

  prevButton.disabled = true;
  prevButton.addEventListener('click', event => {
    if (!backStack.length) return;
    event.preventDefault();
    event.stopPropagation();
    const previous = backStack.pop();
    current = previous;
    showingPrevious = true;
    setScrambleText(previous);
    prevButton.disabled = backStack.length === 0;
  }, true);

  newButton.addEventListener('click', () => {
    // app.js generates the new scramble; the observer records the current one.
  });

  const nativeSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function(key, value) {
    if (this === localStorage && key === STORAGE_KEY && showingPrevious) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed) && parsed.length && current) {
          parsed[0] = { ...parsed[0], scramble: current };
          value = JSON.stringify(parsed);
          showingPrevious = false;
        }
      } catch {}
    }
    return nativeSetItem.call(this, key, value);
  };
})();