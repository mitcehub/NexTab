var DB_NAME = 'mh_favicons';
var STORE_NAME = 'icons';
var DB_VERSION = 3;
var AUTO_EXPIRE_MS = 7 * 24 * 60 * 60 * 1000;
var MANUAL_CONFIRM_EXPIRE_MS = 30 * 24 * 60 * 60 * 1000;
var MIN_ICON_SIZE = 32;
var MIN_BLOB_SIZE = 500;
var HTML_SIZE_LIMIT = 384 * 1024;
var FETCH_TIMEOUT_MS = 8000;

var ICON_REPO_GITHUB = 'https://raw.githubusercontent.com/mitcehub/NexTab/main/icon';
var ICON_REPO_JSDELIVR = 'https://cdn.jsdelivr.net/gh/mitcehub/NexTab@main/icon';
var iconMap = null;
var iconMapLoading = null;

var SOURCE_PRIORITY = {
  github: 1,
  github_mirror: 2,
  google: 3,
  webpage: 4,
  direct: 5,
  fallback_text: 9
};

var FETCH_STATUS = {
  IDLE: 'idle',
  FETCHING: 'fetching',
  SUCCESS: 'success',
  FAILED: 'failed',
  EXPIRED: 'expired'
};

var PROVIDERS = [
  {
    name: 'github',
    fn: function (ctx) {
      return lookupLocalIcon(ctx.url).then(function (localRes) {
        if (!localRes) return null;
        return fetchIcon(localRes.githubUrl).then(function (githubBlob) {
          if (githubBlob) return { blob: githubBlob, url: localRes.githubUrl, sourceType: 'github' };
          return fetchIcon(localRes.jsdelivrUrl).then(function (jsdelivrBlob) {
            if (jsdelivrBlob) return { blob: jsdelivrBlob, url: localRes.jsdelivrUrl, sourceType: 'github_mirror' };
            return null;
          });
        });
      });
    }
  },
  {
    name: 'google',
    fn: function (ctx) {
      return tryGoogleFavicon(ctx.origin);
    }
  },
  {
    name: 'webpage',
    fn: function (ctx) {
      return getFaviconFromHtml(ctx.origin);
    }
  },
  {
    name: 'direct',
    fn: function (ctx) {
      return tryDirectFavicon(ctx.origin);
    }
  }
];

function loadIconMap() {
  if (iconMap) return Promise.resolve(iconMap);
  if (iconMapLoading) return iconMapLoading;

  function parseList(list) {
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
  }

  function tryFetch(repoUrl) {
    return fetch(repoUrl + '/list.json', { mode: 'cors', credentials: 'omit' })
      .then(function (r) {
        if (!r.ok) throw new Error('list.json fetch failed');
        return r.json();
      });
  }

  iconMapLoading = tryFetch(ICON_REPO_GITHUB)
    .then(function (list) {
      return parseList(list);
    })
    .catch(function () {
      return tryFetch(ICON_REPO_JSDELIVR).then(function (list) {
        return parseList(list);
      });
    })
    .catch(function () {
      iconMapLoading = null;
      iconMap = null;
      return {};
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
      if (item && item.icon) {
        return {
          githubUrl: item.icon,
          jsdelivrUrl: item.icon.indexOf(ICON_REPO_GITHUB) === 0 ? item.icon.replace(ICON_REPO_GITHUB, ICON_REPO_JSDELIVR) : item.icon
        };
      }
      return null;
    });
  } catch (e) {
    return Promise.resolve(null);
  }
}

function openDB() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function (e) {
      var db = req.result;
      if (e.oldVersion < 3) {
        if (db.objectStoreNames.contains(STORE_NAME)) {
          db.deleteObjectStore(STORE_NAME);
        }
      }
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function normalizeCacheKey(url) {
  try {
    var u = new URL(url);
    var host = u.hostname.replace(/^www\./, '');
    var path = u.pathname === '/' ? '/' : u.pathname.replace(/\/$/, '');
    return 'https://' + host + path;
  } catch (e) {
    return url;
  }
}

function getCached(key) {
  return openDB().then(function (db) {
    return new Promise(function (resolve) {
      var tx = db.transaction(STORE_NAME, 'readonly');
      var req = tx.objectStore(STORE_NAME).get(key);
      req.onsuccess = function () {
        var rec = req.result;
        if (!rec) { resolve(undefined); return; }
        if (rec.locked) { resolve(rec); return; }
        if (rec.expireTime && Date.now() >= rec.expireTime) {
          rec.fetchStatus = FETCH_STATUS.EXPIRED;
          resolve(undefined);
          return;
        }
        resolve(rec);
      };
      req.onerror = function () { resolve(undefined); };
    });
  });
}

function setCached(key, record) {
  return openDB().then(function (db) {
    return new Promise(function (resolve) {
      var tx = db.transaction(STORE_NAME, 'readwrite');
      var store = tx.objectStore(STORE_NAME);
      var getReq = store.get(key);
      getReq.onsuccess = function () {
        var existing = getReq.result;
        if (existing && existing.locked) {
          resolve(existing);
          return;
        }
        if (existing) {
          var existingPri = SOURCE_PRIORITY[existing.sourceType] || 9;
          var newPri = SOURCE_PRIORITY[record.sourceType] || 9;
          if (existingPri <= newPri) {
            resolve(existing);
            return;
          }
        }
        store.put(record, key);
      };
      tx.oncomplete = function () { resolve(record); };
      tx.onerror = function () { resolve(record); };
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

function fetchIcon(url, timeoutMs) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, timeoutMs || FETCH_TIMEOUT_MS);
  return fetch(url, { mode: 'cors', credentials: 'omit', signal: controller.signal })
    .then(function (r) {
      clearTimeout(timer);
      if (!r.ok) return null;
      return r.blob().then(function (b) {
        if (!isValidIconBlob(b)) return null;
        return validateIcon(b);
      });
    })
    .catch(function () {
      clearTimeout(timer);
      return null;
    });
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
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, FETCH_TIMEOUT_MS);
  return fetch(url, { mode: 'cors', credentials: 'omit', signal: controller.signal })
    .then(function (r) {
      clearTimeout(timer);
      if (!r.ok) return null;
      return r.text().then(function (text) {
        if (text.length > HTML_SIZE_LIMIT) {
          text = text.substring(0, HTML_SIZE_LIMIT);
        }
        var finalUrl = r.url || url;
        return { html: text, url: finalUrl };
      });
    })
    .catch(function () {
      clearTimeout(timer);
      return null;
    });
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
          resolve({ blob: blob, url: iconUrl, sourceType: 'webpage' });
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
      iconList.push({ priority: 40, href: new URL('/apple-touch-icon.png', result.url).href });
    } catch (e) { }

    iconList.sort(function (a, b) { return a.priority - b.priority; });

    return tryDownloadIconList(iconList);
  });
}

function tryGoogleFavicon(origin) {
  var hostname;
  try {
    hostname = new URL(origin).hostname;
  } catch (e) { return Promise.resolve(null); }
  var url = 'https://www.google.com/s2/favicons?domain=' + encodeURIComponent(hostname) + '&sz=64';
  return fetchIcon(url).then(function (blob) {
    if (blob) return { blob: blob, url: url, sourceType: 'google' };
    return null;
  });
}

function tryDirectFavicon(origin) {
  try {
    var url = new URL('/favicon.ico', origin).href;
    return fetchIcon(url).then(function (blob) {
      if (blob) return { blob: blob, url: url, sourceType: 'direct' };
      return null;
    });
  } catch (e) { return Promise.resolve(null); }
}

function buildRecord(blob, url, sourceType, isManual) {
  return {
    blob: blob,
    url: url || '',
    sourceType: sourceType,
    isManual: isManual,
    locked: false,
    lastFetchTime: Date.now(),
    expireTime: Date.now() + (isManual ? MANUAL_CONFIRM_EXPIRE_MS : AUTO_EXPIRE_MS),
    fetchStatus: blob ? FETCH_STATUS.SUCCESS : FETCH_STATUS.FAILED,
    retryCount: 0
  };
}

function runProviders(providers, ctx) {
  var idx = 0;

  function tryNext() {
    if (idx >= providers.length) {
      return Promise.resolve(buildRecord(null, '', 'fallback_text', ctx.isManual));
    }
    var provider = providers[idx];
    idx++;
    return provider.fn(ctx).then(function (result) {
      if (result && result.blob) {
        return buildRecord(result.blob, result.url, result.sourceType, ctx.isManual);
      }
      return tryNext();
    }).catch(function () {
      return tryNext();
    });
  }

  return tryNext();
}

function executeFetchPipeline(url, cacheKey, origin, isManual) {
  var ctx = { url: url, origin: origin, isManual: isManual };
  return runProviders(PROVIDERS, ctx).then(function (record) {
    return setCached(cacheKey, record);
  });
}

var MAX_CONCURRENT = 4;
var fetchQueue = [];
var activeFetches = 0;

function processQueue() {
  while (activeFetches < MAX_CONCURRENT && fetchQueue.length > 0) {
    var task = fetchQueue.shift();
    activeFetches++;
    task.fn().then(function (result) {
      activeFetches--;
      task.resolve(result);
      processQueue();
    }).catch(function (err) {
      activeFetches--;
      task.reject(err);
      processQueue();
    });
  }
}

function enqueueFetch(fn) {
  return new Promise(function (resolve, reject) {
    fetchQueue.push({ fn: fn, resolve: resolve, reject: reject });
    processQueue();
  });
}

export function getFavicon(url, opts) {
  opts = opts || {};

  var cacheKey;
  var origin;
  try {
    cacheKey = normalizeCacheKey(url);
    origin = new URL(url).origin;
  } catch (e) {
    return Promise.resolve(buildRecord(null, '', 'fallback_text', false));
  }

  return getCached(cacheKey).then(function (cached) {
    if (cached) {
      return cached;
    }
    return enqueueFetch(function () {
      return executeFetchPipeline(url, cacheKey, origin, false);
    });
  });
}

export function forceFetchFavicon(url) {
  var cacheKey;
  var origin;
  try {
    cacheKey = normalizeCacheKey(url);
    origin = new URL(url).origin;
  } catch (e) {
    return Promise.resolve(buildRecord(null, '', 'fallback_text', true));
  }

  return enqueueFetch(function () {
    return executeFetchPipeline(url, cacheKey, origin, true);
  });
}
