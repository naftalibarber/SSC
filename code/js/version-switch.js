(() => {
  const STORAGE_KEY = 'ssc-ui-version';
  const NEW_VERSION = 'new';
  const OLD_VERSION = 'old';
  const stylesheet = document.getElementById('minimalCompetitionStylesheet');
  const button = document.getElementById('versionSwitchButton');
  const label = button?.querySelector('.version-switch-label');

  if (!stylesheet || !button) return;

  function getSavedVersion() {
    try {
      return localStorage.getItem(STORAGE_KEY) === OLD_VERSION ? OLD_VERSION : NEW_VERSION;
    } catch (_) {
      return NEW_VERSION;
    }
  }

  function saveVersion(version) {
    try {
      localStorage.setItem(STORAGE_KEY, version);
    } catch (_) {}
  }

  function applyVersion(version, persist = false) {
    const isOld = version === OLD_VERSION;
    stylesheet.disabled = isOld;
    document.documentElement.dataset.uiVersion = isOld ? OLD_VERSION : NEW_VERSION;

    const nextVersionText = isOld ? 'לגרסה החדשה' : 'לגרסה הקודמת';
    if (label) label.textContent = nextVersionText;
    button.setAttribute('aria-label', nextVersionText);
    button.setAttribute('title', nextVersionText);
    button.setAttribute('aria-pressed', String(!isOld));

    if (persist) saveVersion(version);
  }

  applyVersion(getSavedVersion());

  button.addEventListener('click', () => {
    const current = document.documentElement.dataset.uiVersion || NEW_VERSION;
    applyVersion(current === NEW_VERSION ? OLD_VERSION : NEW_VERSION, true);
  });
})();
