var DB_NAME = 'mh_favicons';
var STORE_NAME = 'icons';
var EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;
var NO_ICON_EXPIRE_MS = 24 * 60 * 60 * 1000;
var MIN_ICON_SIZE = 32;
var MIN_BLOB_SIZE = 500;
var HTML_SIZE_LIMIT = 384 * 1024;

var ICON_REPO = 'https://raw.githubusercontent.com/mitcehub/NexTab/main/icon';
var iconMap = null;
var iconMapLoading = null;

function loadIconMap() {
  if (iconMap) return Promise.resolve(iconMap);
  if (iconMapLoading) return iconMapLoading;
  iconMapLoading = fetch(ICON_REPO + '/list.json', { mode: 'cors', credentials: 'omit' })
    .then(function (r) {
      if (!r.ok) throw new Error('list.json fetch failed');
      return r.json();
    })
    .then(function (list) {
      iconMap = {};
      list.forEach(function (item) {
        var domain = item.domain;
        if (!domain) return;
        if (!iconMap[domain]) {
          iconMap[domain] = item;
        }
      });
      iconMapLoading = null;
      return iconMap;
    })
    .catch(function () {
      iconMapLoading = null;
      iconMap = {};
      return iconMap;
    });
  return iconMapLoading;
}

function lookupLocalIcon(url) {
  try {
    var u = new URL(url);
    var host = u.hostname;
    if (host.indexOf('www.') === 0) host = host.substring(4);
    return loadIconMap().then(function (map) {
      var item = map[host];
      if (item && item.icon) return item.icon;
      return null;
    });
  } catch (e) {
    return Promise.resolve(null);
  }
}

function openDB() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = function () {
      req.result.createObjectStore(STORE_NAME);
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function getCached(key) {
  return openDB().then(function (db) {
    return new Promise(function (resolve) {
      var tx = db.transaction(STORE_NAME, 'readonly');
      var req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = function () {
        var rec = req.result;
        if (!rec) { resolve(undefined); return; }
        if (Date.now() - rec.ts >= (rec.noIcon ? NO_ICON_EXPIRE_MS : EXPIRE_MS)) {
          resolve(undefined); return;
        }
        if (rec.noIcon) resolve(null);
        else resolve(rec.blob);
      };
      req.onerror = function () { resolve(undefined); };
    });
  });
}

function setCached(key, blob) {
  return openDB().then(function (db) {
    return new Promise(function (resolve) {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var record = blob ? { blob: blob, ts: Date.now() } : { noIcon: true, ts: Date.now() };
      tx.objectStore(STORE_NAME).put(record, key);
      tx.oncomplete = function () { resolve(); };
      tx.onerror = function () { resolve(); };
    });
  });
}

function isValidIconBlob(blob) {
  if (!blob || blob.size < MIN_BLOB_SIZE) return false;
  var t = blob.type || '';
  if (t.indexOf('image') !== -1) return true;
  if (t === 'application/octet-stream') return true;
  if (t.indexOf('icon') !== -1) return true;
  return false;
}

function validateIcon(blob) {
  return new Promise(function (resolve) {
    var blobUrl = URL.createObjectURL(blob);
    var img = new Image();
    img.onload = function () {
      URL.revokeObjectURL(blobUrl);
      var w = img.naturalWidth || img.width;
      var h = img.naturalHeight || img.height;
      if (w < MIN_ICON_SIZE || h < MIN_ICON_SIZE) { resolve(null); return; }

      try {
        var c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        var ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0);
        var data = ctx.getImageData(0, 0, w, h).data;
        var hasVisible = false;
        for (var i = 3; i < data.length; i += 16) {
          if (data[i] > 10) { hasVisible = true; break; }
        }
        resolve(hasVisible ? blob : null);
      } catch (e) {
        resolve(blob);
      }
    };
    img.onerror = function () {
      URL.revokeObjectURL(blobUrl);
      resolve(null);
    };
    img.src = blobUrl;
  });
}

function fetchIcon(url) {
  if (typeof url === 'string' && url.startsWith('http://')) {
    url = url.replace(/^http:\/\//i, 'https://');
  }
  return fetch(url, { mode: 'cors', credentials: 'omit' })
    .then(function (r) {
      if (!r.ok) return null;
      return r.blob().then(function (b) {
        if (!isValidIconBlob(b)) return null;
        return validateIcon(b);
      });
    })
    .catch(function () { return null; });
}

function parseIconPriority(href, sizes) {
  var ext = '';
  var dotIdx = href.lastIndexOf('.');
  if (dotIdx !== -1) {
    ext = href.substring(dotIdx).toLowerCase();
  }

  if (sizes) {
    var m = sizes.match(/(\d+)x(\d+)/i);
    if (m) {
      var w = parseInt(m[1], 10);
      var h = parseInt(m[2], 10);
      if (w === h) {
        if (w === 32) return 1;
        if (w === 64) return 2;
        if (w >= 24 && w <= 192) return 3;
        if (w === 16) return 4;
        return 5;
      }
      return 200;
    }
  }

  if (ext === '.png') return 10;
  if (ext === '.jpg' || ext === '.jpeg') return 20;
  return 30;
}

function getAttrValue(tag, attr) {
  var re = new RegExp(attr + '\\s*=\\s*(?:["\']([^"\']*)["\']|([^\\s>]+))', 'i');
  var match = tag.match(re);
  if (!match) return '';
  return match[1] || match[2] || '';
}

function parseHtmlForIcons(html, baseUrl) {
  var icons = [];
  var headEnd = html.indexOf('</head>');
  if (headEnd === -1) headEnd = html.length;
  var headHtml = html.substring(0, headEnd);

  var linkRe = /<link\s[^>]*>/gi;
  var match;
  while ((match = linkRe.exec(headHtml)) !== null) {
    var tag = match[0];

    var rel = getAttrValue(tag, 'rel').toLowerCase();
    if (!rel) continue;
    if (rel !== 'icon' && rel !== 'shortcut icon' && rel !== 'apple-touch-icon' && rel !== 'apple-touch-icon-precomposed') continue;

    var href = getAttrValue(tag, 'href');
    if (!href) continue;

    try {
      href = new URL(href, baseUrl).href;
    } catch (e) {
      continue;
    }

    var sizes = getAttrValue(tag, 'sizes');

    var priority = parseIconPriority(href, sizes);
    icons.push({ priority: priority, href: href });
  }

  icons.sort(function (a, b) { return a.priority - b.priority; });
  return icons;
}

function fetchPageHtml(url) {
  if (typeof url === 'string' && url.startsWith('http://')) {
    url = url.replace(/^http:\/\//i, 'https://');
  }
  return fetch(url, { mode: 'cors', credentials: 'omit' })
    .then(function (r) {
      if (!r.ok) return null;
      return r.text().then(function (text) {
        if (text.length > HTML_SIZE_LIMIT) {
          text = text.substring(0, HTML_SIZE_LIMIT);
        }
        var finalUrl = r.url || url;
        return { html: text, url: finalUrl };
      });
    })
    .catch(function () { return null; });
}

function tryDownloadIconList(iconList) {
  if (iconList.length === 0) return Promise.resolve(null);

  return new Promise(function (resolve) {
    var idx = 0;

    function tryNext() {
      if (idx >= iconList.length) {
        resolve(null);
        return;
      }
      var iconUrl = iconList[idx].href;
      idx++;
      fetchIcon(iconUrl).then(function (blob) {
        if (blob) {
          resolve(blob);
        } else {
          tryNext();
        }
      });
    }

    tryNext();
  });
}

function getFaviconFromHtml(origin) {
  return fetchPageHtml(origin).then(function (result) {
    if (!result) return null;

    var iconList = parseHtmlForIcons(result.html, result.url);

    try {
      iconList.push({ priority: 35, href: new URL('/favicon.ico', result.url).href });
    } catch (e) { }

    try {
      iconList.push({ priority: 40, href: new URL('/apple-touch-icon.png', result.url).href });
    } catch (e) { }

    iconList.sort(function (a, b) { return a.priority - b.priority; });

    return tryDownloadIconList(iconList);
  });
}

export function getFavicon(url) {
  var cacheKey;
  var origin;
  try {
    var u = new URL(url);
    cacheKey = u.origin + u.pathname;
    origin = u.origin;
  } catch (e) {
    return Promise.resolve('');
  }

  return getCached(cacheKey).then(function (cached) {
    if (cached instanceof Blob) return URL.createObjectURL(cached);
    if (cached === null) return '';
    if (cached) {
      openDB().then(function (db) {
        var tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).delete(cacheKey);
      });
    }

    return lookupLocalIcon(url).then(function (localUrl) {
      if (localUrl) return localUrl;

      return getFaviconFromHtml(origin).then(function (blob) {
        if (blob) {
          setCached(cacheKey, blob);
          return URL.createObjectURL(blob);
        }
        setCached(cacheKey, null);
        return '';
      });
    });
  });
}
