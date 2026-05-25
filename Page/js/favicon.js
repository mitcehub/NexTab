var DB_NAME = 'mh_favicons';
var STORE_NAME = 'icons';
var EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;
var MIN_ICON_SIZE = 32;
var MIN_BLOB_SIZE = 500;
var HTML_SIZE_LIMIT = 384 * 1024;

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
        if (rec && rec.blob && (Date.now() - rec.ts < EXPIRE_MS)) {
          resolve(rec.blob);
        } else {
          resolve(null);
        }
      };
      req.onerror = function () { resolve(null); };
    });
  });
}

function setCached(key, blob) {
  return openDB().then(function (db) {
    return new Promise(function (resolve) {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ blob: blob, ts: Date.now() }, key);
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

function parseHtmlForIcons(html, baseUrl) {
  var icons = [];
  var headEnd = html.indexOf('</head>');
  if (headEnd === -1) headEnd = html.length;
  var headHtml = html.substring(0, headEnd);

  var linkRe = /<link\s[^>]*>/gi;
  var match;
  while ((match = linkRe.exec(headHtml)) !== null) {
    var tag = match[0];

    var relMatch = tag.match(/rel\s*=\s*["']([^"']+)["']/i);
    if (!relMatch) continue;
    var rel = relMatch[1].toLowerCase();
    if (rel !== 'icon' && rel !== 'shortcut icon' && rel !== 'apple-touch-icon' && rel !== 'apple-touch-icon-precomposed') continue;

    var hrefMatch = tag.match(/href\s*=\s*["']([^"']+)["']/i);
    if (!hrefMatch) continue;

    var href = hrefMatch[1];
    try {
      href = new URL(href, baseUrl).href;
    } catch (e) {
      continue;
    }

    var sizesMatch = tag.match(/sizes\s*=\s*["']([^"']+)["']/i);
    var sizes = sizesMatch ? sizesMatch[1] : '';

    var priority = parseIconPriority(href, sizes);
    icons.push({ priority: priority, href: href });
  }

  icons.sort(function (a, b) { return a.priority - b.priority; });
  return icons;
}

function fetchPageHtml(url) {
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
    } catch (e) {}

    try {
      iconList.push({ priority: 40, href: new URL('/apple-touch-icon.png', result.url).href });
    } catch (e) {}

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
    if (cached) return URL.createObjectURL(cached);

    return getFaviconFromHtml(origin).then(function (blob) {
      if (blob) {
        setCached(cacheKey, blob);
        return URL.createObjectURL(blob);
      }
      return '';
    });
  });
}
