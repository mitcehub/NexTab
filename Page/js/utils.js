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

export function getFaviconUrl(url) {
  try { return 'https://www.google.com/s2/favicons?domain=' + new URL(url).hostname + '&sz=64'; }
  catch (e) { return ''; }
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
  document.querySelectorAll('.preset-row').forEach(function (row) {
    var group = row.dataset.presetGroup;
    var currentStyle = cfg(group + '_style');
    row.querySelectorAll('.preset-btn').forEach(function (btn) {
      btn.classList.toggle('active', btn.dataset.preset === currentStyle);
    });
  });
}

export function refreshBgFitUI() {
  var currentFit = cfg('bg_fit');
  document.querySelectorAll('.bg-fit-btn').forEach(function (b) {
    b.classList.toggle('active', b.dataset.fit === currentFit);
  });
}
