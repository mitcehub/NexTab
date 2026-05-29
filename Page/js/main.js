import { load, applyConfig } from './store.js';
import { initClock } from './clock.js';
import { initSearch } from './search.js';
import { renderSites, initContextMenu, openEditModal, closeEditModal, confirmEdit } from './sites.js';
import { initSettings } from './settings.js';
import { initWallpaper } from './wallpaper.js';
import { getFavicon } from './favicon.js';
import { showToast } from './utils.js';

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
  document.getElementById('edit-fetch-icon').addEventListener('click', function () {
    var urlInput = document.getElementById('edit-url');
    var iconInput = document.getElementById('edit-icon');
    var url = urlInput.value.trim();
    if (!url) { showToast('请先填写网址'); return; }
    if (!/^https?:\/\//i.test(url)) { showToast('网址需以 http:// 或 https:// 开头'); return; }
    var btn = document.getElementById('edit-fetch-icon');
    btn.textContent = '获取中...';
    btn.disabled = true;
    import('./favicon.js').then(function(m) {
      m.forceFetchFavicon(url).then(function (record) {
        btn.textContent = '获取图标';
        btn.disabled = false;
        if (record.fetchStatus === 'success') {
          if (record.url) iconInput.value = record.url;
          showToast('已重新获取并缓存图标');
        } else {
          showToast('未能获取到图标，请尝试手动输入链接');
        }
      });
    });
  });

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
