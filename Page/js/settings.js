import { state, load, cfg, cfgSet, applyConfig, CONFIG_DEFAULTS, WALLPAPER_KEYS, getOrderedEngines, setEngineOrder } from './store.js';
import { showToast, formatRangeLabel, refreshSettingsUI, refreshBgFitUI } from './utils.js';
import { renderSites } from './sites.js';
import { applyPreset, applySuite } from './presets.js';
import { renderEngineDropdown } from './search.js';
import { formatDate } from './clock.js';

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
    if (name !== 'main') syncPresetButtons();
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

  function syncPresetButtons() {
    document.querySelectorAll('.preset-row').forEach(function (row) {
      var group = row.dataset.presetGroup;
      if (!group) return;
      var current = cfg(group + '_style');
      row.querySelectorAll('.preset-btn').forEach(function (btn) {
        btn.classList.toggle('active', btn.dataset.preset === current);
      });
    });
  }
  syncPresetButtons();

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
      syncClockFontSetting();
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
      syncClockFontSetting();
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


  document.querySelectorAll('select[data-key], input[data-key][list]').forEach(function (el) {
    var key = el.dataset.key;
    el.value = cfg(key);
    el.addEventListener('change', function () {
      cfgSet(key, this.value);
      applyConfig();
    });
  });

  // 字体列表（按字母排序）
  var FONT_FALLBACK = [
    'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Candara', 'Comic Sans MS', 'Consolas',
    'Courier New', 'Georgia', 'Gill Sans MT', 'Impact', 'Lucida Console',
    'Microsoft JhengHei', 'Microsoft Sans Serif', 'Microsoft YaHei',
    'MS Gothic', 'Segoe UI', 'SimHei', 'SimSun', 'Tahoma', 'Times New Roman',
    'Trebuchet MS', 'Verdana',
    'PingFang SC', 'Noto Sans SC', 'Noto Serif SC',
    'Helvetica', 'Helvetica Neue', 'SF Pro',
    'Hiragino Sans GB', 'STHeiti', 'STKaiti', 'KaiTi', 'FangSong',
    'Ubuntu', 'DejaVu Sans', 'Liberation Sans', 'WenQuanYi Micro Hei'
  ];

  function isFontAvailable(fontName) {
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var text = 'abcdefghijklmnopqrstuvwxyz0123456789';
    ctx.font = '72px "' + fontName + '", monospace';
    var w1 = ctx.measureText(text).width;
    ctx.font = '72px monospace';
    var w2 = ctx.measureText(text).width;
    return Math.abs(w1 - w2) > 1;
  }


  function initFontPicker() {
    var picker = document.getElementById('clock-font-picker');
    if (!picker) return;
    var trigger = picker.querySelector('.font-picker-trigger');
    var preview = picker.querySelector('.font-picker-preview');
    var dropdown = picker.querySelector('.font-picker-dropdown');
    if (dropdown.children.length > 0) return;

    var def = document.createElement('div');
    def.className = 'font-picker-option';
    def.dataset.font = '';
    def.textContent = '默认';
    dropdown.appendChild(def);

    var available = FONT_FALLBACK.filter(isFontAvailable);
    if (available.length === 0) available = FONT_FALLBACK.slice(0, 10);
    available.forEach(function (name) {
      var opt = document.createElement('div');
      opt.className = 'font-picker-option';
      opt.dataset.font = name;
      opt.textContent = name;
      dropdown.appendChild(opt);
    });

    var root = document.documentElement;
    var savedFont = cfg('clock_font');
    if (savedFont) {
      preview.textContent = savedFont;
    }

    function open() {
      trigger.classList.add('open');
      dropdown.classList.add('open');
      var active = dropdown.querySelector('.font-picker-option.active');
      if (active) active.scrollIntoView({ block: 'nearest' });
      document.addEventListener('mousedown', closeOutside);
    }

    function close() {
      trigger.classList.remove('open');
      dropdown.classList.remove('open');
      document.removeEventListener('mousedown', closeOutside);
    }

    function closeOutside(e) {
      if (!picker.contains(e.target)) close();
    }

    trigger.addEventListener('click', function () {
      if (dropdown.classList.contains('open')) { close(); } else { open(); }
    });

    dropdown.addEventListener('mouseover', function (e) {
      var opt = e.target.closest('.font-picker-option');
      if (!opt) return;
      root.style.setProperty('--clock-font', opt.dataset.font || 'inherit');
    });

    dropdown.addEventListener('mouseleave', function () {
      var saved = cfg('clock_font');
      root.style.setProperty('--clock-font', saved || 'inherit');
    });

    dropdown.addEventListener('click', function (e) {
      var opt = e.target.closest('.font-picker-option');
      if (!opt) return;
      var font = opt.dataset.font;
      cfgSet('clock_font', font);
      applyConfig();
      dropdown.querySelectorAll('.font-picker-option').forEach(function (o) { o.classList.remove('active'); });
      opt.classList.add('active');
      preview.textContent = font || '默认';
      close();
    });
  }
  initFontPicker();

  function updateDateFormatOptions() {
    var sel = document.querySelector('select[data-key="clock_date_format"]');
    if (!sel) return;
    var now = new Date();
    Array.from(sel.options).forEach(function (opt) {
      opt.textContent = formatDate(now, opt.value);
    });
  }
  updateDateFormatOptions();

  function syncRadiusSetting() {
    var style = cfg('site_style');
    var row = document.getElementById('setting-site_radius');
    var slider = row.querySelector('input[type="range"]');
    var hideStyles = ['round', 'minimal', '3d', 'hoverglow', 'neumorphic'];
    if (hideStyles.indexOf(style) !== -1) {
      row.style.display = 'none';
    } else {
      row.style.display = '';
      if (style === 'card') {
        slider.min = '0';
        slider.max = '40';
        if (parseInt(slider.value) > 40) {
          slider.value = '40';
          cfgSet('site_radius', '40');
          slider.nextElementSibling.textContent = formatRangeLabel('site_radius', '40', '%');
        }
      } else if (style === 'squircle') {
        slider.min = '5';
        slider.max = '50';
        if (slider.value === '0' || slider.value === '27') {
          slider.value = '8';
          cfgSet('site_radius', '8');
          slider.nextElementSibling.textContent = formatRangeLabel('site_radius', '8', '%');
        }
      } else {
        slider.min = '0';
        slider.max = '50';
      }
    }
  }
  syncRadiusSetting();

  function syncClockFontSetting() {
    var row = document.getElementById('setting-clock_font');
    if (!row) return;
    var style = cfg('clock_style');
    var hideStyles = ['lcd'];
    row.style.display = hideStyles.indexOf(style) !== -1 ? 'none' : '';
  }
  syncClockFontSetting();

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
