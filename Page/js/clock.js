import { cfg } from './store.js';

var WEEKDAYS_FULL = ['日', '一', '二', '三', '四', '五', '六'];
var WEEKDAYS_SHORT = ['日', '一', '二', '三', '四', '五', '六'];

function formatDate(now, fmt) {
  var y = now.getFullYear();
  var m = now.getMonth() + 1;
  var d = now.getDate();
  var w = now.getDay();
  switch (fmt) {
    case 'YMD':
      return y + '年' + m + '月' + d + '日 星期' + WEEKDAYS_FULL[w];
    case 'MD_NUM':
      return m + '/' + d + ' 周' + WEEKDAYS_SHORT[w];
    case 'YMD_NUM':
      return y + '/' + m + '/' + d + ' 周' + WEEKDAYS_SHORT[w];
    case 'MD_SHORT':
      return m + '月' + d + '日 周' + WEEKDAYS_SHORT[w];
    case 'FULL':
      return y + '年' + m + '月' + d + '日 星期' + WEEKDAYS_FULL[w];
    default:
      return m + '月' + d + '日 星期' + WEEKDAYS_FULL[w];
  }
}

export function initClock() {
  function update() {
    var now = new Date();
    var h = now.getHours();
    var m = String(now.getMinutes()).padStart(2, '0');
    var s = String(now.getSeconds()).padStart(2, '0');
    var is24h = cfg('clock_24h') === '1';
    var showSec = cfg('clock_seconds') === '1';
    var timeStr;
    if (is24h) {
      timeStr = String(h).padStart(2, '0') + ':' + m;
      if (showSec) timeStr += ':' + s;
    } else {
      var ampm = h >= 12 ? 'PM' : 'AM';
      var h12 = h % 12 || 12;
      timeStr = h12 + ':' + m;
      if (showSec) timeStr += ':' + s;
      timeStr += ' ' + ampm;
    }
    document.getElementById('clock-time').textContent = timeStr;
    document.getElementById('clock-date').textContent = formatDate(now, cfg('clock_date_format'));
  }
  update();
  setInterval(update, 1000);
}
