import { state, cfg, save } from './store.js';
import { showToast } from './utils.js';
import { getFavicon } from './favicon.js';

var currentObjectURLs = {};

function clearObjectURLs() {
  Object.keys(currentObjectURLs).forEach(function (k) {
    URL.revokeObjectURL(currentObjectURLs[k]);
  });
  currentObjectURLs = {};
}

var dragInited = false;
var placeholderEl = null;
var currentPlaceholderIndex = -1;
var AUTO_SCROLL_ZONE = 60;
var AUTO_SCROLL_SPEED = 8;
var autoScrollRaf = null;

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

  clearObjectURLs();

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

    if (site.icon) {
      img.src = site.icon;
    } else {
      getFavicon(site.url).then(function (record) {
        if (record && record.fetchStatus === 'success') {
          if (record.blob) {
            var objUrl = URL.createObjectURL(record.blob);
            currentObjectURLs[i] = objUrl;
            img.src = objUrl;
          } else if (record.url) {
            img.src = record.url;
          } else {
            showLetter();
          }
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

  if (!dragInited) {
    dragInited = true;

    grid.addEventListener('dragstart', function(e) {
      var item = e.target.closest('.site-item');
      if (!item) { e.preventDefault(); return; }
      
      var index = parseInt(item.dataset.index);
      state.dragSrcIndex = index;
      currentPlaceholderIndex = index;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', index.toString());
      
      placeholderEl = document.createElement('div');
      placeholderEl.className = 'site-placeholder';
      
      setTimeout(function() {
        item.classList.add('drag-hidden');
        item.parentNode.insertBefore(placeholderEl, item);
      }, 0);
    });

    grid.addEventListener('dragover', function(e) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (!placeholderEl) return;

      var scrollEl = document.getElementById('site-wrap');
      var scrollRect = scrollEl.getBoundingClientRect();
      if (e.clientY < scrollRect.top + AUTO_SCROLL_ZONE) {
        if (!autoScrollRaf) {
          (function scrollUp() {
            scrollEl.scrollTop -= AUTO_SCROLL_SPEED;
            autoScrollRaf = requestAnimationFrame(scrollUp);
          })();
        }
      } else if (e.clientY > scrollRect.bottom - AUTO_SCROLL_ZONE) {
        if (!autoScrollRaf) {
          (function scrollDown() {
            scrollEl.scrollTop += AUTO_SCROLL_SPEED;
            autoScrollRaf = requestAnimationFrame(scrollDown);
          })();
        }
      } else {
        if (autoScrollRaf) { cancelAnimationFrame(autoScrollRaf); autoScrollRaf = null; }
      }
      
      var targetItem = e.target.closest('.site-item, .site-item-add');
      if (!targetItem) return;
      if (targetItem.classList.contains('drag-hidden')) return;

      var items = Array.from(grid.children).filter(function(el) {
        return !el.classList.contains('drag-hidden') && !el.classList.contains('site-item-add') && el !== placeholderEl;
      });

      var newIndex = items.length;
      if (targetItem.classList.contains('site-item')) {
        var rect = targetItem.getBoundingClientRect();
        var midX = rect.left + rect.width / 2;
        var visualIndex = items.indexOf(targetItem);
        newIndex = e.clientX < midX ? visualIndex : visualIndex + 1;
      }
      
      if (newIndex !== currentPlaceholderIndex) {
        var allMovingItems = Array.from(grid.children).filter(function(el) {
          return !el.classList.contains('drag-hidden') && el !== placeholderEl;
        });
        
        var rects = new Map();
        allMovingItems.forEach(function(el) { rects.set(el, el.getBoundingClientRect()); });

        if (newIndex >= items.length) {
          grid.insertBefore(placeholderEl, addEl);
        } else {
          grid.insertBefore(placeholderEl, items[newIndex]);
        }
        currentPlaceholderIndex = newIndex;

        allMovingItems.forEach(function(el) {
          var oldRect = rects.get(el);
          var newRect = el.getBoundingClientRect();
          if (oldRect && (oldRect.left !== newRect.left || oldRect.top !== newRect.top)) {
            var dx = oldRect.left - newRect.left;
            var dy = oldRect.top - newRect.top;
            el.style.transition = 'none';
            el.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
            
            void el.offsetWidth;
            
            el.style.transition = 'transform 0.25s cubic-bezier(0.2, 0, 0, 1)';
            el.style.transform = 'translate(0, 0)';
            
            setTimeout(function() {
              el.style.transition = '';
              el.style.transform = '';
            }, 250);
          }
        });
      }
    });

    grid.addEventListener('dragend', function(e) {
      if (autoScrollRaf) { cancelAnimationFrame(autoScrollRaf); autoScrollRaf = null; }
      if (!placeholderEl) return;
      var item = document.querySelector('.site-item.drag-hidden');
      if (item) item.classList.remove('drag-hidden');
      if (placeholderEl.parentNode) placeholderEl.parentNode.removeChild(placeholderEl);
      placeholderEl = null;
      
      if (state.dragSrcIndex !== null && state.dragSrcIndex !== currentPlaceholderIndex) {
        var fromIndex = state.dragSrcIndex;
        var toIndex = currentPlaceholderIndex;
        var movedItem = state.sites.splice(fromIndex, 1)[0];
        state.sites.splice(toIndex < 0 ? 0 : toIndex, 0, movedItem);
        save();
        setTimeout(renderSites, 0);
      }
      state.dragSrcIndex = null;
    });

    grid.addEventListener('drop', function(e) {
      e.preventDefault();
    });
  }
}
