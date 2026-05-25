import { load, applyConfig } from './store.js';
import { initClock } from './clock.js';
import { initSearch } from './search.js';
import { renderSites, initContextMenu, openEditModal, closeEditModal, confirmEdit } from './sites.js';
import { initSettings } from './settings.js';
import { initWallpaper } from './wallpaper.js';

function init() {
  load();
  applyConfig();
  renderSites();
  initClock();
  initSearch();
  initSettings();
  initWallpaper();
  initContextMenu();
  document.getElementById('site-edit-modal').addEventListener('click', function (e) { if (e.target === this) closeEditModal(); });
  document.getElementById('edit-cancel').addEventListener('click', closeEditModal);
  document.getElementById('edit-confirm').addEventListener('click', confirmEdit);
  document.getElementById('edit-url').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); confirmEdit(); } });

  document.addEventListener('click', function (e) {
    var sp = document.getElementById('settings-panel');
    var wp = document.getElementById('wallpaper-panel');
    var sb = document.getElementById('settings-btn');
    var wb = document.getElementById('wallpaper-btn');
    if (sp.classList.contains('open') && !sp.contains(e.target) && !sb.contains(e.target)) {
      sp.classList.remove('open');
      document.querySelectorAll('.settings-page').forEach(function (p) { p.classList.remove('active'); });
      document.getElementById('settings-page-main').classList.add('active');
      document.getElementById('settings-title').textContent = '设置';
      document.getElementById('settings-back').classList.add('hidden');
    }
    if (wp.classList.contains('open') && !wp.contains(e.target) && !wb.contains(e.target)) {
      wp.classList.remove('open');
    }
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
