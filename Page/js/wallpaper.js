import { cfg, cfgSet, applyConfig, DEFAULT_BG } from './store.js';
import { showToast, refreshSettingsUI, refreshBgFitUI } from './utils.js';

export function initWallpaper() {
  var wallpaperBtn = document.getElementById('wallpaper-btn');
  var wallpaperPanel = document.getElementById('wallpaper-panel');
  var wallpaperClose = document.getElementById('wallpaper-close');

  wallpaperClose.addEventListener('click', function () { wallpaperPanel.classList.remove('open'); });

  var bgUrlInput = document.getElementById('bg-url-input');
  var bgUrlConfirm = document.getElementById('bg-url-confirm');

  var savedBg = localStorage.getItem('mh_bg');
  var bgUrl = savedBg || DEFAULT_BG;
  document.getElementById('bg-wrap').style.backgroundImage = "url('" + bgUrl + "')";
  if (savedBg) bgUrlInput.value = savedBg;

  bgUrlConfirm.addEventListener('click', function () {
    var url = bgUrlInput.value.trim();
    if (!url) return;
    if (!/^https?:\/\//i.test(url) && !/^data:image\//i.test(url)) {
      showToast('壁纸URL需以 http:// 或 https:// 开头');
      return;
    }
    document.getElementById('bg-wrap').style.backgroundImage = "url('" + url + "')";
    localStorage.setItem('mh_bg', url);
    showToast('壁纸已更新');
  });

  document.getElementById('bg-url-default').addEventListener('click', function () {
    bgUrlInput.value = DEFAULT_BG;
    document.getElementById('bg-wrap').style.backgroundImage = "url('" + DEFAULT_BG + "')";
    localStorage.setItem('mh_bg', DEFAULT_BG);
    cfgSet('mask_opacity', '30');
    cfgSet('bg_blur', '0');
    cfgSet('bg_fit', 'cover');
    applyConfig();
    refreshSettingsUI();
    refreshBgFitUI();
    showToast('已恢复默认壁纸');
  });

  document.querySelectorAll('.bg-fit-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var fit = this.dataset.fit;
      if (fit === cfg('bg_fit')) return;
      cfgSet('bg_fit', fit);
      applyConfig();
      document.querySelectorAll('.bg-fit-btn').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
    });
  });

  refreshBgFitUI();

  var gallerySource = 'bing';
  var wallhavenPage = 1;
  var wallhavenLastPage = 1;
  var wallhavenCat = '111';
  var wallhavenQ = '';
  var galleryLoaded = false;
  var galleryLoading = false;

  var sourceBtns = document.querySelectorAll('.gallery-source-btn');
  sourceBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var src = this.dataset.source;
      if (src === gallerySource) return;
      gallerySource = src;
      sourceBtns.forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      var catRow = document.getElementById('wallhaven-categories');
      if (gallerySource === 'wallhaven') {
        catRow.classList.remove('hidden');
      } else {
        catRow.classList.add('hidden');
      }
      loadGallery();
    });
  });

  document.querySelectorAll('.wh-cat-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = this.dataset.cat;
      var q = this.dataset.q || '';
      if (cat === wallhavenCat && q === wallhavenQ) return;
      wallhavenCat = cat;
      wallhavenQ = q;
      document.querySelectorAll('.wh-cat-btn').forEach(function (b) { b.classList.remove('active'); });
      this.classList.add('active');
      loadGallery();
    });
  });

  var galleryLoadMore = document.getElementById('gallery-load-more');

  var galleryScroller = document.getElementById('wp-tab-gallery');
  galleryScroller.addEventListener('scroll', function () {
    if (gallerySource !== 'wallhaven') return;
    if (galleryLoading) return;
    if (wallhavenPage >= wallhavenLastPage) return;
    var threshold = 200;
    if (galleryScroller.scrollTop + galleryScroller.clientHeight >= galleryScroller.scrollHeight - threshold) {
      wallhavenPage++;
      loadGallery(true);
    }
  });

  wallpaperBtn.addEventListener('click', function () {
    wallpaperPanel.classList.toggle('open');
    if (wallpaperPanel.classList.contains('open') && !galleryLoaded) {
      loadGallery();
    }
  });

  document.querySelectorAll('.wp-tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var tabName = this.dataset.tab;
      document.querySelectorAll('.wp-tab').forEach(function (t) { t.classList.remove('active'); });
      document.querySelectorAll('.wp-tab-content').forEach(function (c) { c.classList.remove('active'); });
      this.classList.add('active');
      document.getElementById('wp-tab-' + tabName).classList.add('active');
      if (tabName === 'gallery' && !galleryLoaded) {
        loadGallery();
      }
    });
  });

  function loadGallery(append) {
    var loading = document.getElementById('wallpaper-loading');
    var grid = document.getElementById('wallpaper-grid');

    if (!append) {
      grid.innerHTML = '';
      wallhavenPage = 1;
    }
    galleryLoading = true;
    galleryLoadMore.classList.add('hidden');
    loading.style.display = 'block';

    if (gallerySource === 'bing') {
      fetch('https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=8&mkt=zh-CN')
        .then(function (r) { return r.json(); })
        .then(function (data) {
          loading.style.display = 'none';
          galleryLoaded = true;
          galleryLoading = false;
          var items = data.images.map(function (img) {
            var thumbUrl = 'https://www.bing.com' + img.url;
            var fullUrl = thumbUrl.replace(/1920x1080/g, 'UHD');
            return { thumb: thumbUrl, full: fullUrl, title: img.copyright || img.title || '' };
          });
          renderGallery(items);
        })
        .catch(function () {
          loading.textContent = '加载失败，请检查网络';
          galleryLoading = false;
        });
    } else {
      var whUrl = 'https://wallhaven.cc/api/v1/search?categories=' + wallhavenCat + '&purity=100&atleast=3840x2160&ratios=16x9&sorting=favorites&page=' + wallhavenPage;
      if (wallhavenQ) whUrl += '&q=' + encodeURIComponent(wallhavenQ);
      fetch(whUrl)
        .then(function (r) { return r.json(); })
        .then(function (data) {
          loading.style.display = 'none';
          galleryLoaded = true;
          galleryLoading = false;
          wallhavenLastPage = data.meta && data.meta.last_page ? data.meta.last_page : 1;
          if (wallhavenPage < wallhavenLastPage) {
            galleryLoadMore.classList.remove('hidden');
          }
          var items = data.data.map(function (img) {
            return {
              thumb: img.thumbs.large,
              full: img.path,
              title: (img.category || '') + ' ' + (img.resolution || '')
            };
          });
          renderGallery(items, append);
        })
        .catch(function () {
          loading.textContent = '加载失败，请检查网络';
          galleryLoading = false;
        });
    }
  }

  function renderGallery(items, append) {
    var grid = document.getElementById('wallpaper-grid');
    if (!append) grid.innerHTML = '';

    items.forEach(function (item) {
      var card = document.createElement('div');
      card.className = 'wp-card';

      var img = document.createElement('img');
      img.src = item.thumb;
      img.alt = item.title;
      img.loading = 'lazy';

      var title = document.createElement('div');
      title.className = 'wp-card-title';
      title.textContent = item.title;

      card.appendChild(img);
      card.appendChild(title);
      card.addEventListener('click', function () {
        document.getElementById('bg-wrap').style.backgroundImage = "url('" + item.full + "')";
        localStorage.setItem('mh_bg', item.full);
        bgUrlInput.value = item.full;
        showToast('壁纸已更新');
      });

      grid.appendChild(card);
    });
  }
}
