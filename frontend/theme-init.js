// theme-init.js — include this as the FIRST script in every HTML page
(function() {
  const saved = localStorage.getItem('eemci-theme') || 'dark';
  document.documentElement.setAttribute('data-theme', saved);
  
  // Set correct icon on load
  document.addEventListener('DOMContentLoaded', () => {
    const icon = document.getElementById('themeIcon');
    if (icon) {
      icon.className = saved === 'light' ? 'fas fa-sun' : 'fas fa-moon';
    }
  });
})();

function toggleThemeLogin() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('eemci-theme', next);
  const icon = document.getElementById('themeIcon');
  if (icon) icon.className = next === 'light' ? 'fas fa-sun' : 'fas fa-moon';
}
