export var DEFAULT_SITES = [
  { name: '百度', url: 'https://www.baidu.com/', icon: '' },
  { name: 'B站', url: 'https://www.bilibili.com/', icon: '' },
  { name: '知乎', url: 'https://www.zhihu.com/', icon: '' },
  { name: '微博', url: 'https://weibo.com/', icon: '' },
  { name: '抖音', url: 'https://www.douyin.com/', icon: '' },
  { name: '淘宝', url: 'https://www.taobao.com/', icon: '' },
  { name: '京东', url: 'https://www.jd.com/', icon: '' },
  { name: '小红书', url: 'https://www.xiaohongshu.com/', icon: '' },
  { name: '网易云音乐', url: 'https://music.163.com/', icon: '' },
  { name: '豆瓣', url: 'https://www.douban.com/', icon: '' },
  { name: '爱奇艺', url: 'https://www.iqiyi.com/', icon: '' },
  { name: '腾讯视频', url: 'https://v.qq.com/', icon: '' },
  { name: '优酷', url: 'https://www.youku.com/', icon: '' },
  { name: '快手', url: 'https://www.kuaishou.com/', icon: '' },
  { name: '今日头条', url: 'https://www.toutiao.com/', icon: '' },
  { name: '百度网盘', url: 'https://pan.baidu.com/', icon: '' },
  { name: 'DeepSeek', url: 'https://chat.deepseek.com/', icon: '' },
  { name: '美团', url: 'https://www.meituan.com/', icon: '' },
  { name: '腾讯文档', url: 'https://docs.qq.com/', icon: '' }
];

var CHINESE_POOL = [
  { name: '百度', url: 'https://www.baidu.com/' },
  { name: 'B站', url: 'https://www.bilibili.com/' },
  { name: '知乎', url: 'https://www.zhihu.com/' },
  { name: '微博', url: 'https://weibo.com/' },
  { name: '抖音', url: 'https://www.douyin.com/' },
  { name: '淘宝', url: 'https://www.taobao.com/' },
  { name: '京东', url: 'https://www.jd.com/' },
  { name: '小红书', url: 'https://www.xiaohongshu.com/' },
  { name: '网易云音乐', url: 'https://music.163.com/' },
  { name: '豆瓣', url: 'https://www.douban.com/' },
  { name: '爱奇艺', url: 'https://www.iqiyi.com/' },
  { name: '腾讯视频', url: 'https://v.qq.com/' },
  { name: '优酷', url: 'https://www.youku.com/' },
  { name: '快手', url: 'https://www.kuaishou.com/' },
  { name: '今日头条', url: 'https://www.toutiao.com/' },
  { name: '百度网盘', url: 'https://pan.baidu.com/' },
  { name: 'DeepSeek', url: 'https://chat.deepseek.com/' },
  { name: '美团', url: 'https://www.meituan.com/' },
  { name: '腾讯文档', url: 'https://docs.qq.com/' },
  { name: 'QQ音乐', url: 'https://y.qq.com/' },
  { name: '飞书', url: 'https://www.feishu.cn/' },
  { name: '石墨文档', url: 'https://shimo.im/' },
  { name: '通义千问', url: 'https://tongyi.aliyun.com/' },
  { name: '文心一言', url: 'https://yiyan.baidu.com/' },
  { name: 'Kimi', url: 'https://kimi.moonshot.cn/' },
  { name: '阿里云盘', url: 'https://www.aliyundrive.com/' },
  { name: '百度地图', url: 'https://map.baidu.com/' },
  { name: '携程', url: 'https://www.ctrip.com/' },
  { name: '12306', url: 'https://www.12306.cn/' },
  { name: '大众点评', url: 'https://www.dianping.com/' },
  { name: '高德地图', url: 'https://www.amap.com/' },
  { name: '网易新闻', url: 'https://news.163.com/' },
  { name: '腾讯新闻', url: 'https://news.qq.com/' },
  { name: '搜狐', url: 'https://www.sohu.com/' },
  { name: '什么值得买', url: 'https://www.smzdm.com/' },
  { name: '懂车帝', url: 'https://www.dongchedi.com/' },
  { name: '虎扑', url: 'https://www.hupu.com/' },
  { name: '哔哩哔哩直播', url: 'https://live.bilibili.com/' }
];

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

export function getRandomChineseSites() {
  var siteSize = parseInt(cfg('site_size')) || 60;
  var siteGap = parseInt(cfg('site_gap')) || 30;
  var availableWidth = window.innerWidth;
  var itemTotalWidth = siteSize + siteGap;
  var cols = Math.floor(availableWidth / itemTotalWidth);
  cols = Math.max(5, cols);
  var maxRows = Math.floor((window.innerHeight * 0.4) / (siteSize + 22 + siteGap));
  var totalCount = Math.max(8, Math.min(cols * maxRows, 25));
  return shuffle(CHINESE_POOL).slice(0, totalCount).map(function (s) {
    return { name: s.name, url: s.url, icon: '' };
  });
}

export var DEFAULT_ENGINE = { name: 'Google', start: 'https://www.google.com/search?q=' };

export var ENGINE_LIST = [
  { name: 'Google', start: 'https://www.google.com/search?q=', icon: 'icons/engines/google.svg' },
  { name: '百度', start: 'https://www.baidu.com/s?ie=utf-8&wd=', icon: 'icons/engines/baidu.svg' },
  { name: 'Bing', start: 'https://www.bing.com/search?q=', icon: 'icons/engines/bing.svg' },
  { name: 'Bilibili', start: 'https://search.bilibili.com/all?keyword=', icon: 'icons/engines/bilibili.svg' },
  { name: '知乎', start: 'https://www.zhihu.com/search?type=content&q=', icon: 'icons/engines/zhihu.svg' }
];

export function getEngineOrder() {
  try {
    var raw = localStorage.getItem('mh_engine_order');
    if (raw) return JSON.parse(raw);
  } catch (e) { }
  return ENGINE_LIST.map(function (e) { return e.start; });
}

export function setEngineOrder(order) {
  localStorage.setItem('mh_engine_order', JSON.stringify(order));
}

export function getOrderedEngines() {
  var order = getEngineOrder();
  var map = {};
  ENGINE_LIST.forEach(function (e) { map[e.start] = e; });
  var result = [];
  order.forEach(function (start) {
    if (map[start]) { result.push(map[start]); delete map[start]; }
  });
  Object.keys(map).forEach(function (k) { result.push(map[k]); });
  return result;
}

export var DEFAULT_BG = 'https://www.bing.com/th?id=OHR.SichuanTea_ZH-CN6703437873_UHD.jpg&rf=LaDigue_UHD.jpg&pid=hp';

export var WALLPAPER_KEYS = ['mask_opacity', 'bg_blur', 'bg_fit'];

export var CONFIG_DEFAULTS = {
  clock_show: '1', clock_24h: '1', clock_seconds: '0', clock_fontsize: '72', clock_date_fontsize: '16', clock_date_format: 'MD', clock_date_weight: '400', clock_font: '', clock_offset: '0', clock_style: 'classic',
  search_width: '680', search_height: '46', search_radius: '24', search_opacity: '12', search_offset: '0', search_style: 'pill',
  search_site_gap: '60',
  site_cols: '0', site_size: '60', site_radius: '27', site_opacity: '100', site_gap: '30',
  site_showname: '1', site_newtab: '1', site_style: 'round',
  mask_opacity: '30', bg_blur: '0', bg_fit: 'cover',
  wp_autorotate: '0', wp_autorotate_source: 'bing'
};

export var CONFIG_BOUNDS = {
  clock_fontsize: [32, 120], clock_date_fontsize: [12, 30], clock_offset: [-150, 150],
  search_width: [400, 1000], search_height: [36, 56], search_radius: [0, 28], search_opacity: [5, 80], search_offset: [-150, 150],
  search_site_gap: [20, 160],
  site_cols: [0, 15], site_size: [36, 72], site_radius: [0, 50], site_opacity: [20, 100], site_gap: [8, 36],
  mask_opacity: [0, 80], bg_blur: [0, 20]
};

export var state = {
  sites: [],
  currentEngine: {},
  editingIndex: -1,
  dragSrcIndex: null,
  contextTargetIndex: -1
};

export var STYLE_KEYS = ['clock_style', 'search_style', 'site_style', 'bg_fit'];

export function clamp(val, key) {
  if (STYLE_KEYS.indexOf(key) !== -1) return val;
  var b = CONFIG_BOUNDS[key];
  if (!b) return val;
  var n = parseInt(val) || 0;
  if (key === 'site_cols') {
    if (n === 0) return '0';
    return Math.max(5, Math.min(15, n)).toString();
  }
  return Math.max(b[0], Math.min(b[1], n)).toString();
}

export function cfg(key) {
  var v = localStorage.getItem('mh_cfg_' + key);
  if (v !== null) return clamp(v, key);
  return CONFIG_DEFAULTS[key] || '0';
}

export function cfgSet(key, val) {
  localStorage.setItem('mh_cfg_' + key, clamp(val, key));
}

export function load() {
  try {
    var raw = localStorage.getItem('mh_sites');
    state.sites = raw ? JSON.parse(raw) : DEFAULT_SITES.map(function (s) { return { name: s.name, url: s.url, icon: s.icon }; });
  } catch (e) { state.sites = DEFAULT_SITES.map(function (s) { return { name: s.name, url: s.url, icon: s.icon }; }); }
  try {
    var raw = localStorage.getItem('mh_engine');
    state.currentEngine = raw ? JSON.parse(raw) : { name: DEFAULT_ENGINE.name, start: DEFAULT_ENGINE.start };
  } catch (e) { state.currentEngine = { name: DEFAULT_ENGINE.name, start: DEFAULT_ENGINE.start }; }
}

export function save() {
  localStorage.setItem('mh_sites', JSON.stringify(state.sites));
  localStorage.setItem('mh_engine', JSON.stringify(state.currentEngine));
}

export function applyConfig() {
  var root = document.documentElement.style;
  var clockWrap = document.getElementById('clock-wrap');
  var searchWrap = document.getElementById('search-wrap');
  var siteGrid = document.getElementById('site-grid');

  clockWrap.classList.toggle('hidden', cfg('clock_show') !== '1');

  root.setProperty('--clock-fontsize', cfg('clock_fontsize') + 'px');
  root.setProperty('--clock-date-fontsize', cfg('clock_date_fontsize') + 'px');
  root.setProperty('--clock-date-weight', cfg('clock_date_weight'));
  root.setProperty('--clock-font', cfg('clock_font') || 'inherit');
  root.setProperty('--clock-offset', cfg('clock_offset') + 'px');

  var clockStyles = ['classic', 'glow', 'outline', 'shadow', 'gradient', 'hologram', 'lcd', 'neon'];
  clockStyles.forEach(function (s) { clockWrap.classList.remove('clock-' + s); });
  clockWrap.classList.add('clock-' + cfg('clock_style'));

  root.setProperty('--search-width', cfg('search_width') + 'px');
  root.setProperty('--search-height', cfg('search_height') + 'px');
  root.setProperty('--search-radius', cfg('search_radius') + 'px');
  root.setProperty('--search-opacity', (parseInt(cfg('search_opacity')) / 100).toString());
  root.setProperty('--search-offset', cfg('search_offset') + 'px');
  root.setProperty('--search-site-gap', cfg('search_site_gap') + 'px');

  var searchStyles = ['pill', 'glass', 'border', 'minimal', 'neumorphism', 'spotlight', 'glowborder', 'acrylic'];
  searchStyles.forEach(function (s) { searchWrap.classList.remove('search-' + s); });
  searchWrap.classList.add('search-' + cfg('search_style'));

  var cols = parseInt(cfg('site_cols'));
  if (cols > 0) {
    root.setProperty('--site-cols', cols.toString());
    siteGrid.classList.add('grid-cols');
  } else {
    root.setProperty('--site-cols', '0');
    siteGrid.classList.remove('grid-cols');
  }

  root.setProperty('--site-size', cfg('site_size') + 'px');
  root.setProperty('--site-radius', cfg('site_radius') + '%');
  root.setProperty('--site-opacity', (parseInt(cfg('site_opacity')) / 100).toString());
  root.setProperty('--site-gap', cfg('site_gap') + 'px');
  root.setProperty('--site-icon-img', Math.round(parseInt(cfg('site_size')) * 0.58) + 'px');

  var siteStyles = ['round', 'card', 'outline', 'minimal', 'squircle', '3d', 'hoverglow', 'neumorphic'];
  siteStyles.forEach(function (s) { siteGrid.classList.remove('site-' + s); });
  siteGrid.classList.add('site-' + cfg('site_style'));

  root.setProperty('--mask-opacity', (parseInt(cfg('mask_opacity')) / 100).toString());
  root.setProperty('--bg-blur', cfg('bg_blur') + 'px');

  var bgWrap = document.getElementById('bg-wrap');
  var fitMode = cfg('bg_fit');
  if (fitMode === 'cover') {
    bgWrap.style.backgroundSize = 'cover';
    bgWrap.style.backgroundRepeat = 'no-repeat';
    bgWrap.style.backgroundPosition = 'center';
  } else if (fitMode === 'contain') {
    bgWrap.style.backgroundSize = 'contain';
    bgWrap.style.backgroundRepeat = 'no-repeat';
    bgWrap.style.backgroundPosition = 'center';
  } else if (fitMode === 'stretch') {
    bgWrap.style.backgroundSize = '100% 100%';
    bgWrap.style.backgroundRepeat = 'no-repeat';
    bgWrap.style.backgroundPosition = 'center';
  } else if (fitMode === 'tile') {
    bgWrap.style.backgroundSize = 'auto';
    bgWrap.style.backgroundRepeat = 'repeat';
    bgWrap.style.backgroundPosition = 'top left';
  }
}
