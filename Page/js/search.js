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

export function initSearch() {
  var engineBtn = document.getElementById('search-engine-btn');
  var dropdown = document.getElementById('search-engine-dropdown');
  var engineIcon = document.getElementById('search-engine-icon');
  var searchInput = document.getElementById('search-input');
  var searchForm = document.getElementById('search-form');

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
  });

  dropdown.addEventListener('click', function (e) {
    var option = e.target.closest('.engine-option');
    if (!option) return;
    state.currentEngine.name = option.dataset.name;
    state.currentEngine.start = option.dataset.start;
    save();
    updateEngineUI();
    dropdown.classList.remove('show');
    searchInput.focus();
  });

  document.addEventListener('click', function () { dropdown.classList.remove('show'); });

  searchForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = searchInput.value.trim();
    if (!q) return;
    window.open(state.currentEngine.start + encodeURIComponent(q), '_blank');
    searchInput.value = '';
  });

  updateEngineUI();
}
