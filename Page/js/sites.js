import { state, cfg, save } from './store.js';
import { showToast } from './utils.js';
import { getFavicon } from './favicon.js';

export function initContextMenu() {
  var menu = document.getElementById('context-menu');
  menu.addEventListener('click', function (e) {
    var item = e.target.closest('.ctx-item');
    if (!item) return;
    var action = item.dataset.action;
    if (action === 'edit' && state.contextTargetIndex >= 0) openEditModal(state.contextTargetIndex);
    else if (action === 'delete' && state.contextTargetIndex >= 0) {
      state.sites.splice(state.contextTargetIndex, 1);
      save();
      renderSites();
      showToast('已删除');
    }
    hideContextMenu();
  });
  document.addEventListener('click', function () { hideContextMenu(); });
  document.addEventListener('contextmenu', function (e) {
    if (!e.target.closest('.site-item')) hideContextMenu();
  });
}

function showContextMenu(x, y, index) {
  state.contextTargetIndex = index;
  var menu = document.getElementById('context-menu');
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
  menu.classList.add('show');
  var mw = menu.offsetWidth;
  var mh = menu.offsetHeight;
  if (x + mw > window.innerWidth) menu.style.left = (window.innerWidth - mw - 8) + 'px';
  if (y + mh > window.innerHeight) menu.style.top = (window.innerHeight - mh - 8) + 'px';
}

function hideContextMenu() {
  document.getElementById('context-menu').classList.remove('show');
  state.contextTargetIndex = -1;
}

export function openEditModal(index) {
  state.editingIndex = index;
  var modal = document.getElementById('site-edit-modal');
  var title = document.getElementById('site-edit-title');
  var nameInput = document.getElementById('edit-name');
  var urlInput = document.getElementById('edit-url');
  var iconInput = document.getElementById('edit-icon');
  if (index >= 0 && index < state.sites.length) {
    title.textContent = '编辑快捷方式';
    nameInput.value = state.sites[index].name;
    urlInput.value = state.sites[index].url;
    iconInput.value = state.sites[index].icon || '';
  } else {
    title.textContent = '添加快捷方式';
    nameInput.value = '';
    urlInput.value = '';
    iconInput.value = '';
  }
  modal.classList.add('open');
  nameInput.focus();
}

export function closeEditModal() {
  document.getElementById('site-edit-modal').classList.remove('open');
  state.editingIndex = -1;
}

export function confirmEdit() {
  var name = document.getElementById('edit-name').value.trim();
  var url = document.getElementById('edit-url').value.trim();
  var icon = document.getElementById('edit-icon').value.trim();
  if (!name || !url) { showToast('请填写名称和网址'); return; }
  if (!/^https?:\/\//i.test(url)) { showToast('网址需以 http:// 或 https:// 开头'); return; }
  if (state.editingIndex >= 0 && state.editingIndex < state.sites.length) {
    state.sites[state.editingIndex] = { name: name, url: url, icon: icon };
  } else {
    state.sites.push({ name: name, url: url, icon: icon });
  }
  save();
  renderSites();
  closeEditModal();
  showToast(state.editingIndex >= 0 ? '已更新' : '已添加');
}

var letterColors = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  '#F8C471', '#82E0AA', '#F1948A', '#85929E', '#73C6B6',
  '#E59866', '#AED6F1', '#D7BDE2', '#A3E4D7', '#FAD7A0',
  '#7FB3D8', '#C39BD3', '#76D7C4', '#F9E79F', '#B2BABB'
];

function getLetterColor(char) {
  var code = char.charCodeAt(0) || 0;
  return letterColors[code % letterColors.length];
}

export function renderSites() {
  var grid = document.getElementById('site-grid');
  grid.innerHTML = '';
  var showName = cfg('site_showname') === '1';
  var newTab = cfg('site_newtab') === '1';

  state.sites.forEach(function (site, i) {
    var a = document.createElement('a');
    a.className = 'site-item';
    a.href = site.url;
    if (newTab) a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.draggable = true;
    a.dataset.index = i;

    var iconWrap = document.createElement('div');
    iconWrap.className = 'site-icon-wrap';
    var img = document.createElement('img');
    img.alt = site.name;

    function showLetter() {
      img.style.display = 'none';
      iconWrap.classList.add('site-letter');
      var letterBg = document.createElement('span');
      letterBg.className = 'site-letter-bg';
      letterBg.textContent = site.name.charAt(0);
      letterBg.style.background = getLetterColor(site.name.charAt(0));
      iconWrap.appendChild(letterBg);
    }

    if (site.icon && /^https?:\/\//i.test(site.icon)) {
      getFavicon(site.icon).then(function (cachedUrl) {
        img.src = cachedUrl || site.icon;
      });
    } else if (site.icon) {
      img.src = site.icon;
    } else {
      getFavicon(site.url).then(function (cachedUrl) {
        if (cachedUrl) {
          img.src = cachedUrl;
        } else {
          showLetter();
        }
      });
    }

    img.onerror = function () {
      img.onerror = null;
      showLetter();
    };
    iconWrap.appendChild(img);

    var siteStyle = cfg('site_style');
    var maxLen = ['squircle', '3d', 'hoverglow', 'neumorphic'].indexOf(siteStyle) !== -1 ? 4 : 0;
    var name = document.createElement('span');
    name.className = 'site-name' + (showName ? '' : ' hidden');
    name.textContent = maxLen && site.name.length > maxLen ? site.name.slice(0, maxLen) : site.name;

    a.appendChild(iconWrap);
    a.appendChild(name);

    a.addEventListener('contextmenu', function (e) {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, i);
    });

    a.addEventListener('dragstart', function (e) {
      state.dragSrcIndex = i;
      this.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', i.toString());
    });

    a.addEventListener('dragend', function () {
      this.classList.remove('dragging');
      state.dragSrcIndex = null;
      grid.querySelectorAll('.site-item').forEach(function (el) {
        el.classList.remove('drag-over-left', 'drag-over-right');
      });
    });

    a.addEventListener('dragover', function (e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      var rect = this.getBoundingClientRect();
      var midX = rect.left + rect.width / 2;
      this.classList.remove('drag-over-left', 'drag-over-right');
      if (e.clientX < midX) this.classList.add('drag-over-left');
      else this.classList.add('drag-over-right');
    });

    a.addEventListener('dragleave', function () {
      this.classList.remove('drag-over-left', 'drag-over-right');
    });

    a.addEventListener('drop', function (e) {
      e.preventDefault();
      this.classList.remove('drag-over-left', 'drag-over-right');
      var fromIndex = state.dragSrcIndex;
      var toIndex = i;
      if (fromIndex === null || fromIndex === undefined || fromIndex === toIndex) return;
      var item = state.sites.splice(fromIndex, 1)[0];
      var rect = this.getBoundingClientRect();
      var midX = rect.left + rect.width / 2;
      var insertIndex = e.clientX < midX ? toIndex : toIndex + 1;
      if (fromIndex < toIndex) insertIndex--;
      state.sites.splice(insertIndex < 0 ? 0 : insertIndex, 0, item);
      save();
      renderSites();
    });

    grid.appendChild(a);
  });

  var addEl = document.createElement('div');
  addEl.className = 'site-item-add';
  addEl.title = '添加快捷方式';
  var addIconWrap = document.createElement('div');
  addIconWrap.className = 'site-icon-wrap';
  addIconWrap.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/></svg>';
  var addName = document.createElement('span');
  addName.className = 'site-name' + (showName ? '' : ' hidden');
  addName.textContent = '添加';
  addEl.appendChild(addIconWrap);
  addEl.appendChild(addName);
  addEl.addEventListener('click', function () { openEditModal(-1); });
  grid.appendChild(addEl);
}
