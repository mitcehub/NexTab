import { cfg } from './store.js';

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
    var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    document.getElementById('clock-date').textContent =
      (now.getMonth() + 1) + '月' + now.getDate() + '日 星期' + weekdays[now.getDay()];
  }
  update();
  setInterval(update, 1000);
}
