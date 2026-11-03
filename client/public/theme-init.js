(function () {
  try {
    var saved = localStorage.getItem('det-theme');
    var theme =
      saved || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {
    /* storage blocked: fall back to light */
  }
})();
