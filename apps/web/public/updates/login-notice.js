// Claim automatic notices on the signed-in landing view. A working session also has a Changelog link.
(() => {
  const preview = new URLSearchParams(location.search).get('whats-new') === '1';
  function show({ content, lang, translations, languageCookie }) {
    const dialog = document.createElement('dialog');
    dialog.className = 'ab-release';
    dialog.lang = lang;
    dialog.setAttribute('aria-labelledby', 'ab-release-title');
    dialog.innerHTML = content;
    let minimizing = false;
    let destination;
    async function minimize() {
      if (minimizing) return;
      minimizing = true;
      destination = document.querySelector('[data-changelog-link]');
      if (destination) {
        destination.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
        if (!matchMedia('(prefers-reduced-motion: reduce)').matches && dialog.animate) {
          const from = dialog.getBoundingClientRect(), to = destination.getBoundingClientRect();
          const x = to.left + to.width / 2 - (from.left + from.width / 2);
          const y = to.top + to.height / 2 - (from.top + from.height / 2);
          dialog.classList.add('is-minimizing');
          const motion = dialog.animate([
            { transform: 'none', opacity: 1 },
            { transform: `translate(${x}px, ${y}px) scale(${to.width / from.width}, ${to.height / from.height})`, opacity: 0.35 },
          ], { duration: 400, easing: 'ease-in-out', fill: 'forwards' });
          await motion.finished.catch(() => {});
        }
      }
      dialog.close();
    }
    dialog.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button || minimizing) return;
      if (button.hasAttribute('data-minimize')) { void minimize(); return; }
      const choice = button.dataset.language;
      if (!choice || !Object.hasOwn(translations, choice)) return;
      const expanded = [...dialog.querySelectorAll('details')].map(el => el.open);
      const scrollTop = dialog.scrollTop;
      dialog.lang = choice;
      dialog.innerHTML = translations[choice];
      dialog.querySelectorAll('details').forEach((el, i) => { el.open = expanded[i]; });
      dialog.querySelector('[aria-pressed="true"]').focus({ preventScroll: true });
      dialog.scrollTop = scrollTop;
      document.cookie = `${languageCookie}=${choice}; Path=/; Max-Age=31536000; SameSite=Lax; Secure`;
    });
    dialog.addEventListener('cancel', event => { event.preventDefault(); void minimize(); });
    dialog.addEventListener('close', () => {
      dialog.remove();
      if (!destination) return;
      destination.focus({ preventScroll: true });
      destination.setAttribute('data-changelog-highlight', '');
      setTimeout(() => destination.removeAttribute('data-changelog-highlight'), 1700);
    }, { once: true });
    document.body.append(dialog);
    dialog.showModal();
    if (preview) {
      const url = new URL(location.href);
      url.searchParams.delete('whats-new');
      history.replaceState(history.state, '', url);
    }
  }
  const selector = preview ? '[data-changelog-link]' : '.landing [data-changelog-link]';
  let lastLink;
  let loading = false;
  let pending;
  async function check() {
    if (document.visibilityState !== 'visible') return;
    const link = document.querySelector(selector);
    if (!link) { lastLink = null; return; }
    if (loading || (lastLink === link && !pending)) return;
    lastLink = link;
    if (pending) {
      // The user may have left home while the request ran. Show it when they return.
      const notice = pending;
      pending = null;
      if (preview) stop();
      show(notice);
      return;
    }
    loading = true;
    try {
      const query = new URLSearchParams({ fallbackLang: document.documentElement.lang, ...(preview ? { preview: '1' } : {}) });
      const res = await fetch('/api/release-notice?' + query, { method: 'POST', cache: 'no-store' });
      if (res.status === 200) pending = await res.json();
    } catch { /* Retry on the next visit to the landing page. */ }
    finally { loading = false; }
    if (pending) void check();
  }
  function restore(event) {
    if (event.persisted) { lastLink = null; void check(); }
  }
  function stop() {
    observer.disconnect();
    document.removeEventListener('visibilitychange', check);
    window.removeEventListener('pageshow', restore);
  }
  const observer = new MutationObserver(check);
  observer.observe(document.body, { childList: true, subtree: true });
  document.addEventListener('visibilitychange', check);
  window.addEventListener('pageshow', restore);
  void check();
})();
