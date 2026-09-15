// script.js —— 须臾之间 前端逻辑
(function() {
    var DB = window.DB;

    // ============================================================
    // 站点信息
    // ============================================================
    var _siteCache = null;

    async function getSite() {
        if (_siteCache) return _siteCache;
        var list = await DB.getAll('site_settings');
        _siteCache = list && list.length > 0 ? list[0] : {};
        return _siteCache;
    }

    // ============================================================
    // 页面导航
    // ============================================================
    var sections = document.querySelectorAll('.page-section');
    var navLinks = document.querySelectorAll('#globalNav a');

    function showPage(pageId) {
        for (var i = 0; i < sections.length; i++) {
            sections[i].classList.remove('active');
        }
        var target = document.getElementById(pageId);
        if (target) target.classList.add('active');

        for (var j = 0; j < navLinks.length; j++) {
            navLinks[j].classList.remove('active');
            if (navLinks[j].dataset.page === pageId) {
                navLinks[j].classList.add('active');
            }
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });

        if (pageId === 'page-home') renderHome();
        if (pageId === 'page-suibi') renderSuibiList();
        if (pageId === 'page-zaji') renderZajiPage();
        if (pageId === 'page-xianhua') renderXianhua();
    }

    for (var i = 0; i < navLinks.length; i++) {
        navLinks[i].addEventListener('click', function(e) {
            e.preventDefault();
            var page = this.dataset.page;
            if (page) showPage(page);
        });
    }

    // ============================================================
    // 内部跳转（data-sub / data-back）
    // ============================================================
    document.addEventListener('click', function(e) {
        var target = e.target.closest('[data-sub]');
        if (target) {
            e.preventDefault();
            var sub = target.dataset.sub;
            if (sub) {
                var section = document.getElementById(sub);
                if (section) {
                    for (var i = 0; i < sections.length; i++) {
                        sections[i].classList.remove('active');
                    }
                    section.classList.add('active');
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    if (sub === 'zaji-detail') loadZajiDetail(target.dataset.id);
                }
            }
            return;
        }

        var backBtn = e.target.closest('[data-back]');
        if (backBtn) {
            e.preventDefault();
            var backId = backBtn.dataset.back;
            if (backId) showPage(backId);
        }
    });

    // ============================================================
    // Logo
    // ============================================================
    function updateLogo(site) {
        var siteNameEl = document.getElementById('siteName');
        var siteDescEl = document.getElementById('siteDesc');
        if (siteNameEl) siteNameEl.textContent = site.site_name || '须臾之间';
        if (siteDescEl) siteDescEl.textContent = site.site_desc || '寄蜉蝣于天地，渺沧海之一粟';
    }

    // ============================================================
    // header 高度 → CSS 变量（供竖线定位使用）
    // ============================================================
    function updateHeaderHeight() {
        var header = document.querySelector('.site-header');
        if (!header) return;
        var h = header.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', h + 'px');
    }

    // ============================================================
    // 打字机
    // ============================================================
    var bannerFullText = '写信告诉我，今夜你想要梦什么';
    var bannerTextEl = document.getElementById('bannerText');
    var bannerBtnEl = document.getElementById('bannerBtn');
    var typewriterTimer = null;
    var typewriterDone = false;

    function startTypewriter() {
        if (typewriterDone || !bannerTextEl) return;
        var index = 0;
        bannerTextEl.innerHTML = '<span class="cursor"></span>';
        typewriterTimer = setInterval(function() {
            if (index < bannerFullText.length) {
                var current = bannerFullText.substring(0, index + 1);
                bannerTextEl.innerHTML = current + '<span class="cursor"></span>';
                index++;
            } else {
                clearInterval(typewriterTimer);
                typewriterTimer = null;
                typewriterDone = true;
                setTimeout(function() {
                    bannerTextEl.innerHTML = bannerFullText;
                    if (bannerBtnEl) bannerBtnEl.classList.add('show');
                }, 400);
            }
        }, 120);
    }

  // ============================================================
// Banner 高亮：自动播放 + 鼠标跟随
// ============================================================
function initBannerHighlight() {
    var banner = document.getElementById('banner');
    var auto = document.getElementById('bannerAuto');
    var mouse = document.getElementById('bannerHighlight');
    if (!banner || !auto || !mouse) return;

    var GRID = 50;             // 与 .banner background-size 一致
    var STEP_MS = 350;         // 每格停留时间（越大越慢）
    var COLS = 0;              // 列数
    var ROWS = 0;              // 行数

    var autoIndex = 0;
    var autoTimer = null;

    // 计算格子行列数
    function calcGrid() {
        var rect = banner.getBoundingClientRect();
        COLS = Math.floor(rect.width / GRID);
        ROWS = Math.floor(rect.height / GRID);
    }

    // 自动播放：按顺序移动
    function autoNext() {
        if (COLS === 0 || ROWS === 0) return;
        var total = COLS * ROWS;
        var idx = autoIndex % total;

        var col = idx % COLS;
        var row = Math.floor(idx / COLS);

        auto.style.left = (col * GRID) + 'px';
        auto.style.top  = (row * GRID) + 'px';
        auto.classList.add('show');

        autoIndex++;
        if (autoIndex >= total) autoIndex = 0;  // 循环
    }

    function startAuto() {
        if (autoTimer) return;
        // 先立即执行一次，避免等 350ms
        autoNext();
        autoTimer = setInterval(autoNext, STEP_MS);
    }

    function stopAuto() {
        if (autoTimer) {
            clearInterval(autoTimer);
            autoTimer = null;
        }
        auto.classList.remove('show');
    }

    // 鼠标跟随
    banner.addEventListener('mousemove', function(e) {
        var rect = banner.getBoundingClientRect();
        var x = e.clientX - rect.left;
        var y = e.clientY - rect.top;
        var col = Math.floor(x / GRID);
        var row = Math.floor(y / GRID);

        mouse.style.left = (col * GRID) + 'px';
        mouse.style.top  = (row * GRID) + 'px';
        mouse.classList.add('show');

        // 鼠标进入时暂停自动播放
        stopAuto();
    });

    banner.addEventListener('mouseleave', function() {
        mouse.classList.remove('show');
        // 鼠标离开后恢复自动播放
        startAuto();
    });

    // 初始化
    calcGrid();
    startAuto();

    // 窗口 resize 时重新计算
    window.addEventListener('resize', function() {
        calcGrid();
    });
}
    // ============================================================
    // 随笔卡片生成器（首页 4 列布局用）
    // ============================================================
    function buildEssayCard(data) {
        if (!data) {
            return '<div class="essay-cell essay-card">' +
                '<div class="essay-text essay-empty">...</div>' +
                '</div>';
        }
        // 首页卡片只显示日期部分
        var dateShort = (data.date || '').split(' ')[0];
        return '<div class="essay-cell essay-card">' +
            '<div class="essay-text">' + (data.content || '') + '</div>' +
            '<div class="essay-date">' + dateShort + '</div>' +
            '</div>';
    }

    // ============================================================
    // 序章首页
    // ============================================================
    async function renderHome() {
        var site = await getSite();
        updateLogo(site);

        // ① 随笔：4 列交替空白布局
        var suibiList = await DB.getAll('suibi', { orderBy: 'id' });
        var essayContainer = document.getElementById('homeSuibi');
        if (essayContainer) {
            var displayList = suibiList.slice(-6);
            while (displayList.length < 6) displayList.push(null);

            var html = '';
            // 第一行：空白 + 卡1 + 卡2 + 卡3
            html += '<div class="essay-cell essay-blank essay-blank-left"><span class="essay-mark"></span></div>';
            html += buildEssayCard(displayList[0]);
            html += buildEssayCard(displayList[1]);
            html += buildEssayCard(displayList[2]);
            // 第二行：卡4 + 卡5 + 卡6 + 空白
            html += buildEssayCard(displayList[3]);
            html += buildEssayCard(displayList[4]);
            html += buildEssayCard(displayList[5]);
            html += '<div class="essay-cell essay-blank essay-blank-right"><span class="essay-mark"></span></div>';

            essayContainer.innerHTML = html;
        }

        // ② 杂记：最新 3 条
        var zajiList = await DB.getAll('zaji', { orderBy: 'id' });
        var noteContainer = document.getElementById('homeZaji');
        if (noteContainer) {
            var latestThree = zajiList.slice(-3).reverse();
            var html2 = '';
            for (var j = 0; j < latestThree.length; j++) {
                var z = latestThree[j];
                var summary = z.content ? z.content.substring(0, 60) : '';
                if (z.content && z.content.length > 60) summary += '...';
                html2 += '<div class="note-item" data-sub="zaji-detail" data-id="' + z.id + '">';
                html2 += '  <div class="note-thumb"></div>';
                html2 += '  <div class="note-body">';
                html2 += '    <div class="note-title">' + (z.title || '无标题') + '</div>';
                html2 += '    <div class="note-summary">' + summary + '</div>';
                html2 += '  </div>';
                html2 += '</div>';
            }
            if (latestThree.length === 0) {
                html2 = '<p style="color:#999999;padding:20px 0;">暂无杂记</p>';
            }
            noteContainer.innerHTML = html2;
        }

        if (!typewriterDone) startTypewriter();
    }

    // ============================================================
    // 随笔页面（3 列卡片，日期到时分秒）
    // ============================================================
    async function renderSuibiList() {
        var list = await DB.getAll('suibi', { orderBy: 'id' });
        var container = document.getElementById('suibiList');
        if (!container) return;

        // 倒序：最新在前
        var sorted = list.slice().reverse();

        if (sorted.length === 0) {
            container.innerHTML = '<div class="suibi-empty">暂无随笔</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < sorted.length; i++) {
            var item = sorted[i];
            html += '<div class="suibi-card">';
            html += '  <div class="suibi-card-head">';
            html += '    <span class="suibi-date">' + (item.date || '') + '</span>';
            html += '  </div>';
            html += '  <div class="suibi-card-body">' + (item.content || '') + '</div>';
            html += '</div>';
        }
        container.innerHTML = html;
    }

    // ============================================================
    // 杂记页面
    // ============================================================
    var _currentZajiCategory = null;

    async function renderZajiPage() {
        var list = await DB.getAll('zaji', { orderBy: 'id' });
        var categories = await DB.getAll('zaji_categories', { orderBy: 'id' });

        if (categories.length === 0) {
            var catSet = {};
            for (var i = 0; i < list.length; i++) {
                if (list[i].category) catSet[list[i].category] = true;
            }
            categories = Object.keys(catSet).map(function(name) {
                return { name: name };
            });
        }

        var seriesContainer = document.getElementById('zajiSeriesList');
        if (seriesContainer) {
            var seriesHtml = '';
            for (var j = 0; j < categories.length; j++) {
                var cat = categories[j];
                var activeClass = (_currentZajiCategory === cat.name) ? ' active' : '';
                seriesHtml += '<a class="zaji-series-item' + activeClass + '" data-series="' + cat.name + '">' + cat.name + '</a>';
            }
            seriesContainer.innerHTML = seriesHtml;
        }

        renderZajiArticleList(list);
    }

    function renderZajiArticleList(list) {
        var container = document.getElementById('zajiArticleList');
        if (!container) return;

        var filtered = list;
        if (_currentZajiCategory) {
            filtered = list.filter(function(x) {
                return x.category === _currentZajiCategory;
            });
        }

        var sorted = filtered.slice().reverse();

        if (sorted.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#999999;padding:40px 0;">暂无文章</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < sorted.length; i++) {
            var item = sorted[i];
            html += '<div class="zaji-article-item">';
            html += '<a class="zaji-article-title" data-sub="zaji-detail" data-id="' + item.id + '">' + (item.title || '无标题') + '</a>';
            html += '<span class="zaji-article-tag">#' + (item.category || '未分类') + '</span>';
            html += '<span class="zaji-article-date">' + (item.date || '') + '</span>';
            html += '</div>';
        }
        container.innerHTML = html;
    }

    document.addEventListener('click', function(e) {
        var seriesItem = e.target.closest('.zaji-series-item');
        if (seriesItem) {
            e.preventDefault();
            var series = seriesItem.dataset.series;
            if (_currentZajiCategory === series) _currentZajiCategory = null;
            else _currentZajiCategory = series;

            DB.getAll('zaji', { orderBy: 'id' }).then(function(list) {
                renderZajiArticleList(list);
                var items = document.querySelectorAll('.zaji-series-item');
                for (var i = 0; i < items.length; i++) {
                    items[i].classList.remove('active');
                    if (items[i].dataset.series === _currentZajiCategory) {
                        items[i].classList.add('active');
                    }
                }
            });
            return;
        }
    });

    // ============================================================
    // 杂记详情
    // ============================================================
    async function loadZajiDetail(id) {
        var item = await DB.getById('zaji', id);
        if (!item) return;

        var titleEl = document.getElementById('zajiDetailTitle');
        var dateEl = document.getElementById('zajiDetailDate');
        var contentEl = document.getElementById('zajiDetailContent');

        if (titleEl) titleEl.textContent = item.title;
        if (dateEl) dateEl.textContent = item.date;
        if (contentEl) contentEl.innerHTML = '<p>' + (item.content || '').replace(/\n/g, '</p><p>') + '</p>';
    }

    // ============================================================
    // 闲话
    // ============================================================
 async function renderXianhua() {
    var list = await DB.getAll('xianhua');
    var content = list.length > 0 ? (list[0].content || '') : '';
    var container = document.getElementById('xianhuaContent');
    if (!container) return;
        if (!container) return;
        var lines = content.split('\n');
        var html = '';
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (line) html += '<p>' + line + '</p>';
        }
        container.innerHTML = html;
    }

    // ============================================================
    // 初始化
    // ============================================================
    document.addEventListener('DOMContentLoaded', function() {
        updateHeaderHeight();
        showPage('page-home');
        initBannerHighlight();
    });

    window.addEventListener('resize', updateHeaderHeight);
})();
