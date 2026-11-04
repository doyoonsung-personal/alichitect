// The Worker includes this script only after sign-in or when the user deliberately opens the preview.
(() => {
  const preview = document.currentScript?.hasAttribute('data-preview');
  async function show() {
    const lang = document.documentElement.lang;
    const query = new URLSearchParams({ lang, ...(preview ? { preview: '1' } : {}) });
    const res = await fetch('/api/release-notice?' + query, { method: 'POST', cache: 'no-store' });
    if (res.status !== 200) return;
    const { content } = await res.json();
    const dialog = document.createElement('dialog');
    dialog.className = 'ab-release';
    dialog.setAttribute('aria-labelledby', 'ab-release-title');
    dialog.innerHTML = content;
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    document.body.append(dialog);
    dialog.showModal();
    if (preview) {
      const url = new URL(location.href);
      url.searchParams.delete('whats-new');
      history.replaceState(history.state, '', url);
    }
  }
  const openWhenVisible = () => { void show().catch(() => {}); };
  if (document.visibilityState === 'visible') openWhenVisible();
  else document.addEventListener('visibilitychange', function visible() {
    if (document.visibilityState !== 'visible') return;
    document.removeEventListener('visibilitychange', visible);
    openWhenVisible();
  });
})();
