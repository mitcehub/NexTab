import { cfg } from './store.js';

export function showToast(msg) {
  var toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(function () { toast.classList.remove('show'); }, 2000);
}

export function formatRangeLabel(key, val, unit) {
  if (key === 'site_cols') {
    if (val === '0') return '自动';
    return val + '个';
  }
  if (unit) return val + unit;
  return val;
}

var ICON_REPO = 'https://raw.githubusercontent.com/mitcehub/NexTab/main/icon';
var _iconMap = null;
var _iconMapLoading = null;

function _loadIconMap() {
  if (_iconMap) return Promise.resolve(_iconMap);
  if (_iconMapLoading) return _iconMapLoading;
  _iconMapLoading = fetch(ICON_REPO + '/list.json', { mode: 'cors', credentials: 'omit' })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (list) {
      _iconMap = {};
      list.forEach(function (item) {
        if (item.domain && !_iconMap[item.domain]) _iconMap[item.domain] = item;
      });
      _iconMapLoading = null;
      return _iconMap;
    })
    .catch(function () { _iconMapLoading = null; _iconMap = {}; return _iconMap; });
  return _iconMapLoading;
}

export function getFaviconUrl(url) {
  try {
    var host = new URL(url).hostname;
    if (host.indexOf('www.') === 0) host = host.substring(4);
    return _loadIconMap().then(function (map) {
      var item = map[host];
      if (item && item.icon) return item.icon;
      return 'https://www.google.com/s2/favicons?domain=' + host + '&sz=64';
    });
  } catch (e) {
    return Promise.resolve('');
  }
}

export function refreshSettingsUI() {
  document.querySelectorAll('.toggle-switch').forEach(function (el) {
    var key = el.dataset.key;
    if (cfg(key) === '1') el.classList.add('on');
    else el.classList.remove('on');
  });
  document.querySelectorAll('input[type="range"][data-key]').forEach(function (el) {
    var key = el.dataset.key;
    var unit = el.dataset.unit;
    var val = cfg(key);
    el.value = val;
    el.nextElementSibling.textContent = formatRangeLabel(key, val, unit);
  });
  document.querySelectorAll('select[data-key], input[data-key][list]').forEach(function (el) {
    el.value = cfg(el.dataset.key);
  });
  document.querySelectorAll('.preset-row').forEach(function (row) {
    var group = row.dataset.presetGroup;
    var currentStyle = cfg(group + '_style');
    row.querySelectorAll('.preset-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.preset === currentStyle);
    });
  });
  refreshFontPicker();
}

function refreshFontPicker() {
  var picker = document.getElementById('clock-font-picker');
  if (!picker) return;
  var preview = picker.querySelector('.font-picker-preview');
  var font = cfg('clock_font');
  picker.querySelectorAll('.font-picker-option').forEach(function (opt) {
    opt.classList.toggle('active', opt.dataset.font === font);
  });
  preview.textContent = font || '默认';
  preview.style.fontFamily = '';
}

export function refreshBgFitUI() {
  var currentFit = cfg('bg_fit');
  document.querySelectorAll('.bg-fit-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.fit === currentFit);
  });
}
