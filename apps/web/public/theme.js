// Architecture Builder: puts the reader's theme on <html> before the first paint, so a page never flashes the wrong one.
// A plain blocking script in <head>, and a file rather than inline code, because the Content Security Policy allows no
// inline script. The app (src/shell/theme.ts) and the Worker's own pages share this key. "light" or "dark" is a choice;
// nothing stored is System: no attribute, and the stylesheet's prefers-color-scheme query follows the device.
(function () {
  try {
    var choice = localStorage.getItem('ab.theme');
    if (choice === 'light' || choice === 'dark') document.documentElement.setAttribute('data-theme', choice);
  } catch (e) {
    /* storage unavailable: System */
  }
})();
