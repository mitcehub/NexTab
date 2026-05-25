import { state, load, cfg, cfgSet, applyConfig, CONFIG_DEFAULTS, WALLPAPER_KEYS, getOrderedEngines, setEngineOrder } from './store.js';
import { showToast, formatRangeLabel, refreshSettingsUI, refreshBgFitUI } from './utils.js';
import { renderSites } from './sites.js';
import { applyPreset, applySuite } from './presets.js';
import { renderEngineDropdown } from './search.js';

export function initSettings() {
  var settingsBtn = document.getElementById('settings-btn');
  var settingsPanel = document.getElementById('settings-panel');
  var settingsClose = document.getElementById('settings-close');
  var settingsTitle = document.getElementById('settings-title');
  var settingsBack = document.getElementById('settings-back');

  var pageNames = { clock: '时钟设置', search: '搜索框设置', site: '图标设置' };

  function showSettingsPage(name) {
    document.querySelectorAll('.settings-page').forEach(function (p) { p.classList.remove('active'); });
    document.getElementById('settings-page-' + name).classList.add('active');
    settingsTitle.textContent = name === 'main' ? '设置' : pageNames[name];
    if (name === 'main') {
      settingsBack.classList.add('hidden');
    } else {
      settingsBack.classList.remove('hidden');
    }
  }

  settingsBtn.addEventListener('click', function () {
    if (!settingsPanel.classList.contains('open')) {
      showSettingsPage('main');
    }
    settingsPanel.classList.toggle('open');
  });
  settingsClose.addEventListener('click', function () {
    settingsPanel.classList.remove('open');
    showSettingsPage('main');
  });

  settingsBack.addEventListener('click', function () {
    showSettingsPage('main');
  });

  document.querySelectorAll('.settings-entry').forEach(function (entry) {
    entry.addEventListener('click', function () {
      showSettingsPage(this.dataset.page);
    });
  });

  initEngineSort();

  document.querySelectorAll('.preset-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var row = this.closest('.preset-row');
      var group = row.dataset.presetGroup;
      var name = this.dataset.preset;
      applyPreset(group, name);
      applyConfig();
      refreshSettingsUI();
      renderSites();
      row.querySelectorAll('.preset-btn').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      syncRadiusSetting();
    });
  });

  document.querySelectorAll('.suite-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var suiteName = this.dataset.suite;
      applySuite(suiteName);
      applyConfig();
      refreshSettingsUI();
      renderSites();
      showToast('套装已应用: ' + this.textContent);
      syncRadiusSetting();
    });
  });

  document.querySelectorAll('.toggle-switch').forEach(function (el) {
    var key = el.dataset.key;
    if (cfg(key) === '1') el.classList.add('on');
    else el.classList.remove('on');
    el.addEventListener('click', function () {
      var isOn = this.classList.toggle('on');
      cfgSet(key, isOn ? '1' : '0');
      applyConfig();
      renderSites();
    });
  });

  document.querySelectorAll('input[type="range"][data-key]').forEach(function (el) {
    var key = el.dataset.key;
    var unit = el.dataset.unit;
    if (el.dataset.min !== undefined) el.min = el.dataset.min;
    if (el.dataset.max !== undefined) el.max = el.dataset.max;
    if (!el.step) el.step = 1;
    var val = cfg(key);
    el.value = val;
    el.nextElementSibling.textContent = formatRangeLabel(key, val, unit);

    el.addEventListener('input', function () {
      var v = this.value;
      if (key === 'site_cols' && v > 0 && v < 5) {
        v = '5';
        this.value = 5;
      }
      cfgSet(key, v);
      var actualVal = cfg(key);
      if (actualVal !== v) {
        this.value = actualVal;
      }
      this.nextElementSibling.textContent = formatRangeLabel(key, actualVal, unit);
      applyConfig();
      if (key.indexOf('site_') === 0 || key === 'search_site_gap') {
        renderSites();
      }
    });
  });

  function syncRadiusSetting() {
    var style = cfg('site_style');
    var row = document.getElementById('setting-site_radius');
    var slider = row.querySelector('input[type="range"]');
    var hideStyles = ['round', 'minimal', 'squircle', '3d', 'hoverglow', 'neumorphic'];
    if (hideStyles.indexOf(style) !== -1) {
      row.style.display = 'none';
    } else {
      row.style.display = '';
      if (style === 'card') {
        slider.max = '40';
        if (parseInt(slider.value) > 40) {
          slider.value = '40';
          cfgSet('site_radius', '40');
          slider.nextElementSibling.textContent = formatRangeLabel('site_radius', '40', '%');
        }
      } else {
        slider.max = '50';
      }
    }
  }
  syncRadiusSetting();

  function getAllData() {
    var data = { sites: state.sites, engine: state.currentEngine };
    Object.keys(CONFIG_DEFAULTS).forEach(function (k) { data[k] = cfg(k); });
    data.bg = localStorage.getItem('mh_bg') || '';
    return data;
  }

  function applyAllData(data) {
    if (data.sites) { state.sites = data.sites; localStorage.setItem('mh_sites', JSON.stringify(state.sites)); }
    if (data.engine) { state.currentEngine = data.engine; localStorage.setItem('mh_engine', JSON.stringify(state.currentEngine)); }
    if (data.bg) {
      localStorage.setItem('mh_bg', data.bg);
      document.getElementById('bg-wrap').style.backgroundImage = "url('" + data.bg + "')";
      document.getElementById('bg-url-input').value = data.bg;
    }
    Object.keys(CONFIG_DEFAULTS).forEach(function (k) {
      if (data[k] !== undefined) cfgSet(k, data[k].toString());
    });
    applyConfig();
    renderSites();
    refreshSettingsUI();
    refreshBgFitUI();
  }

  var exportBtn = document.getElementById('export-btn');
  var importBtn = document.getElementById('import-btn');
  var importFileInput = document.getElementById('import-file-input');

  exportBtn.addEventListener('click', function () {
    var json = JSON.stringify(getAllData(), null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'minimal-homepage-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('数据已导出');
  });

  importBtn.addEventListener('click', function () { importFileInput.click(); });
  importFileInput.addEventListener('change', function () {
    var file = this.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function (e) {
      try { applyAllData(JSON.parse(e.target.result)); showToast('数据已导入'); }
      catch (err) { showToast('导入失败: 文件格式错误'); }
    };
    reader.readAsText(file);
    this.value = '';
  });

  var resetBtn = document.getElementById('reset-btn');
  resetBtn.addEventListener('click', function () {
    if (!confirm('确定要重置全部设置和数据吗？此操作不可撤销。')) return;
    Object.keys(CONFIG_DEFAULTS).forEach(function (k) {
      if (WALLPAPER_KEYS.indexOf(k) !== -1) return;
      localStorage.removeItem('mh_cfg_' + k);
    });
    localStorage.removeItem('mh_sites');
    localStorage.removeItem('mh_engine');
    localStorage.removeItem('mh_engine_order');
    load();
    applyConfig();
    renderSites();
    refreshSettingsUI();
    renderEngineDropdown();
    initEngineSort();
    showToast('已重置设置和数据');
  });

  function initEngineSort() {
    var list = document.getElementById('engine-sort-list');
    var engines = getOrderedEngines();
    var dragSrcIdx = null;

    function renderList() {
      engines = getOrderedEngines();
      list.innerHTML = '';
      engines.forEach(function (eng, idx) {
        var item = document.createElement('div');
        item.className = 'engine-sort-item';
        item.draggable = true;
        item.dataset.index = idx;

        var grip = document.createElement('span');
        grip.className = 'engine-sort-grip';
        grip.innerHTML = '&#9776;';

        var img = document.createElement('img');
        img.src = eng.icon;
        img.alt = '';
        img.className = 'engine-sort-icon';

        var nameSpan = document.createElement('span');
        nameSpan.className = 'engine-sort-name';
        nameSpan.textContent = eng.name;

        item.appendChild(grip);
        item.appendChild(img);
        item.appendChild(nameSpan);
        list.appendChild(item);

        item.addEventListener('dragstart', function (e) {
          dragSrcIdx = idx;
          item.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', idx.toString());
        });

        item.addEventListener('dragend', function () {
          item.classList.remove('dragging');
          list.querySelectorAll('.engine-sort-item').forEach(function (el) {
            el.classList.remove('drag-over');
          });
        });

        item.addEventListener('dragover', function (e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          list.querySelectorAll('.engine-sort-item').forEach(function (el) {
            el.classList.remove('drag-over');
          });
          item.classList.add('drag-over');
        });

        item.addEventListener('dragleave', function () {
          item.classList.remove('drag-over');
        });

        item.addEventListener('drop', function (e) {
          e.preventDefault();
          var fromIdx = dragSrcIdx;
          var toIdx = idx;
          if (fromIdx === null || fromIdx === toIdx) return;
          var moved = engines.splice(fromIdx, 1)[0];
          engines.splice(toIdx, 0, moved);
          setEngineOrder(engines.map(function (e) { return e.start; }));
          renderList();
          renderEngineDropdown();
          showToast('引擎顺序已更新');
        });
      });
    }

    renderList();
  }
}
