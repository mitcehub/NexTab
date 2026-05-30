import { state, save, getOrderedEngines } from './store.js';

export function renderEngineDropdown() {
  var dropdown = document.getElementById('search-engine-dropdown');
  var engines = getOrderedEngines();
  dropdown.innerHTML = '';
  engines.forEach(function (eng) {
    var div = document.createElement('div');
    div.className = 'engine-option';
    div.dataset.start = eng.start;
    div.dataset.name = eng.name;
    var img = document.createElement('img');
    img.src = eng.icon;
    img.alt = '';
    div.appendChild(img);
    div.appendChild(document.createTextNode(' ' + eng.name));
    dropdown.appendChild(div);
  });
}

var SUGGEST_ENDPOINTS = {
  'Google': {
    url: 'https://suggestqueries.google.com/complete/search?client=chrome&q=',
    parse: function (text) {
      var data = parseJSONP(text);
      if (Array.isArray(data) && data[1]) {
        return data[1].map(function (item) { return String(Array.isArray(item) ? item[0] : item); });
      }
      return [];
    }
  },
  '百度': {
    url: 'https://sp0.baidu.com/5a1Fazu8AA54nxGko9WTAnF6hhy/su?wd=',
    encoding: 'gbk',
    parse: function (text) {
      try {
        var m = text.match(/\{[\s\S]+\}/);
        if (!m) return [];
        var raw = m[0];
        raw = raw.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
        var data = JSON.parse(raw);
        if (data && Array.isArray(data.s)) return data.s;
        return [];
      } catch (e) { return []; }
    }
  },
  'Bing': {
    url: 'https://www.bing.com/qsonhs.aspx?type=cb&cb=callback&q=',
    parse: function (text) {
      try {
        var s = text.indexOf('{');
        var e = text.lastIndexOf('}');
        if (s === -1 || e <= s) return [];
        var data = JSON.parse(text.slice(s, e + 1));
        if (data && data.AS && data.AS.Results) {
          var result = [];
          data.AS.Results.forEach(function (group) {
            if (group.Suggests) {
              group.Suggests.forEach(function (item) { if (item.Txt) result.push(item.Txt); });
            }
          });
          return result;
        }
        return [];
      } catch (e) { return []; }
    }
  },
  'Bilibili': {
    url: 'https://s.search.bilibili.com/main/suggest?term=',
    parse: function (text) {
      try {
        var data = JSON.parse(text);
        if (data.code === 0 && data.result && Array.isArray(data.result.tag)) {
          return data.result.tag.map(function (r) { return r.value; }).filter(Boolean);
        }
        return [];
      } catch (e) { return []; }
    }
  },
  '知乎': {
    url: 'https://www.zhihu.com/api/v4/search/suggest?q=',
    parse: function (text) {
      try {
        var data = JSON.parse(text);
        if (data && Array.isArray(data.suggest)) {
          return data.suggest.map(function (item) { return item.query; }).filter(Boolean);
        }
        return [];
      } catch (e) { return []; }
    }
  }
};

function parseJSONP(text) {
  var start = text.indexOf('(');
  var end = text.lastIndexOf(')');
  if (start !== -1 && end > start) {
    try { return JSON.parse(text.slice(start + 1, end)); } catch (e) {}
  }
  try { return JSON.parse(text); } catch (e) { return null; }
}

var suggestTimer = null;
var suggestController = null;
var suggestHighlight = -1;

function clearSuggest() {
  var dd = document.getElementById('suggest-dropdown');
  var wrap = document.getElementById('search-wrap');
  dd.classList.remove('show');
  dd.innerHTML = '';
  suggestHighlight = -1;
  wrap.classList.remove('suggest-open');
  wrap.style.removeProperty('--suggest-height');
}

function fetchSuggestions(query, engineName) {
  var config = SUGGEST_ENDPOINTS[engineName] || SUGGEST_ENDPOINTS['Google'];
  var url = config.url + encodeURIComponent(query);
  if (suggestController) suggestController.abort();
  suggestController = new AbortController();
  var headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
  };
  if (engineName === 'Bilibili') headers['Referer'] = 'https://www.bilibili.com';
  if (engineName === '知乎') headers['Referer'] = 'https://www.zhihu.com/';
  return fetch(url, { signal: suggestController.signal, headers: headers })
    .then(function (r) {
      if (config.encoding) return r.arrayBuffer().then(function (buf) { return new TextDecoder(config.encoding).decode(buf); });
      return r.text();
    })
    .then(config.parse)
    .catch(function () { return []; });
}

function renderSuggestions(items) {
  var dd = document.getElementById('suggest-dropdown');
  var wrap = document.getElementById('search-wrap');
  dd.innerHTML = '';
  suggestHighlight = -1;
  if (!items || items.length === 0) { dd.classList.remove('show'); wrap.classList.remove('suggest-open'); return; }
  var frag = document.createDocumentFragment();
  items.forEach(function (item, i) {
    var div = document.createElement('div');
    div.className = 'suggest-item';
    
    // Create matching linear search icon
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'suggest-icon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '15');
    svg.setAttribute('height', '15');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z');
    path.setAttribute('fill', 'currentColor');
    svg.appendChild(path);

    var span = document.createElement('span');
    span.className = 'suggest-text';
    span.textContent = item;

    div.appendChild(svg);
    div.appendChild(span);
    
    div.dataset.index = i;
    div.addEventListener('mousedown', function (e) {
      e.preventDefault();
      var input = document.getElementById('search-input');
      input.value = item;
      clearSuggest();
      document.getElementById('search-form').dispatchEvent(new Event('submit'));
    });
    frag.appendChild(div);
  });
  dd.appendChild(frag);
  dd.classList.add('show');
  var suggestHeight = Math.min(dd.scrollHeight, 320);
  wrap.style.setProperty('--suggest-height', suggestHeight + 'px');
  wrap.classList.add('suggest-open');
}

function highlightSuggestItem(index) {
  var dd = document.getElementById('suggest-dropdown');
  var items = dd.querySelectorAll('.suggest-item');
  items.forEach(function (el, i) { el.classList.toggle('highlight', i === index); });
}

export function initSearch() {
  var engineBtn = document.getElementById('search-engine-btn');
  var dropdown = document.getElementById('search-engine-dropdown');
  var engineIcon = document.getElementById('search-engine-icon');
  var searchInput = document.getElementById('search-input');
  var searchForm = document.getElementById('search-form');
  var suggestDropdown = document.getElementById('suggest-dropdown');

  renderEngineDropdown();

  function updateEngineUI() {
    var option = dropdown.querySelector('[data-start="' + state.currentEngine.start + '"]');
    if (option) {
      engineIcon.src = option.querySelector('img').src;
      dropdown.querySelectorAll('.engine-option').forEach(function (o) { o.classList.remove('active'); });
      option.classList.add('active');
    }
  }

  engineBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    dropdown.classList.toggle('show');
    clearSuggest();
  });

  dropdown.addEventListener('click', function (e) {
    var option = e.target.closest('.engine-option');
    if (!option) return;
    state.currentEngine.name = option.dataset.name;
    state.currentEngine.start = option.dataset.start;
    save();
    updateEngineUI();
    dropdown.classList.remove('remove');
    dropdown.classList.remove('show');
    clearSuggest();
    searchInput.focus();
  });

  document.addEventListener('click', function (e) {
    dropdown.classList.remove('show');
    if (!suggestDropdown.contains(e.target) && e.target !== searchInput) {
      clearSuggest();
    }
  });

  searchInput.addEventListener('input', function () {
    var q = this.value.trim();
    clearTimeout(suggestTimer);
    if (q.length < 1) { clearSuggest(); return; }
    suggestTimer = setTimeout(function () {
      fetchSuggestions(q, state.currentEngine.name).then(renderSuggestions);
    }, 300);
  });

  searchInput.addEventListener('keydown', function (e) {
    var items = suggestDropdown.querySelectorAll('.suggest-item');
    if (items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      suggestHighlight = Math.min(suggestHighlight + 1, items.length - 1);
      highlightSuggestItem(suggestHighlight);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      suggestHighlight = Math.max(suggestHighlight - 1, -1);
      highlightSuggestItem(suggestHighlight);
    } else if (e.key === 'Enter' && suggestHighlight >= 0) {
      e.preventDefault();
      var textEl = items[suggestHighlight].querySelector('.suggest-text');
      searchInput.value = textEl ? textEl.textContent : items[suggestHighlight].textContent;
      clearSuggest();
      searchForm.dispatchEvent(new Event('submit'));
    } else if (e.key === 'Escape') {
      clearSuggest();
    }
  });

  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = searchInput.value.trim();
    if (!q) return;
    window.open(state.currentEngine.start + encodeURIComponent(q), '_blank');
    searchInput.value = '';
    clearSuggest();
  });

  updateEngineUI();
}
