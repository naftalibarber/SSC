(() => {
  'use strict';

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

  function isEnglish() {
    return document.documentElement.lang === 'en' || document.documentElement.dir === 'ltr';
  }

  function updateButtonLabel(version = document.documentElement.dataset.uiVersion || NEW_VERSION) {
    const isOld = version === OLD_VERSION;
    const nextVersionText = isEnglish()
      ? (isOld ? 'Switch to new version' : 'Switch to previous version')
      : (isOld ? 'לגרסה החדשה' : 'לגרסה הקודמת');
    if (label) label.textContent = nextVersionText;
    button.setAttribute('aria-label', nextVersionText);
    button.setAttribute('title', nextVersionText);
    button.setAttribute('aria-pressed', String(!isOld));
  }

  function applyVersion(version, persist = false) {
    const isOld = version === OLD_VERSION;
    stylesheet.disabled = isOld;
    document.documentElement.dataset.uiVersion = isOld ? OLD_VERSION : NEW_VERSION;
    updateButtonLabel(version);
    if (persist) saveVersion(version);
  }

  applyVersion(getSavedVersion());

  button.addEventListener('click', () => {
    const current = document.documentElement.dataset.uiVersion || NEW_VERSION;
    applyVersion(current === NEW_VERSION ? OLD_VERSION : NEW_VERSION, true);
  });

  const languageObserver = new MutationObserver(mutations => {
    if (mutations.some(mutation => mutation.attributeName === 'lang' || mutation.attributeName === 'dir')) {
      updateButtonLabel();
    }
  });
  languageObserver.observe(document.documentElement, {attributes:true, attributeFilter:['lang','dir']});
})();