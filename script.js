// script.js —— 须臾之间
(function() {
    var DB = window.DB;

    // ============================================================
    // 站点信息
    // ============================================================
    async function getSite() {
        return {
            site_name: '须臾之间',
            site_desc: '寄蜉蝣于天地，渺沧海之一粟'
        };
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

        // ★ 切换 header 模式
        if (pageId === 'page-home') {
            document.body.classList.add('banner-mode');
        } else {
            document.body.classList.remove('banner-mode');
            document.body.classList.remove('scrolled');
        }

        updateHeaderHeight();

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
    // 内部跳转
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
    // header 高度
    // ============================================================
    function updateHeaderHeight() {
        var header = document.querySelector('.site-header');
        if (!header) return;
        var h = header.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--header-height', h + 'px');
    }

    // ============================================================
    // 滚出首屏后 header 加实心背景（仅首页）
    // ============================================================
    function initHeaderScroll() {
        var banner = document.getElementById('banner');
        if (!banner) return;

        window.addEventListener('scroll', function() {
            // 只在首页处理
            if (!document.body.classList.contains('banner-mode')) return;

            var bannerBottom = banner.offsetTop + banner.offsetHeight;
            if (window.scrollY >= bannerBottom - 50) {
                document.body.classList.add('scrolled');
            } else {
                document.body.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    // ============================================================
    // Banner 初始化 —— 碎片拼图 + 滚轮分步动画
    // ============================================================
    var BANNER_IMG = 'images/0916.jpg';
    var FRAG_COLS = 6;
    var FRAG_ROWS = 4;
    var FRAG_TOTAL = FRAG_COLS * FRAG_ROWS; // 24

    var bannerStep = 0;          // 当前步骤 0-6
    var bannerIntroDone = false; // 拼图动画是否已完成（完成后交还滚动权）
    var bannerPieces = [];       // 24 个碎片元素
    var bannerScatterTransform = []; // 每个碎片的随机散落 transform（缓存，保持一致）
    var correctOrder = [];       // 步骤 2-5 拼图归位的随机顺序
    var scatterOrder = [];       // 步骤 0-1 随机散落出现的顺序
    var scatterShownCount = 0;
    var correctedShownCount = 0;

    function shuffleArray(arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1));
            var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
        }
        return a;
    }
    function randRange(min, max) {
        return Math.random() * (max - min) + min;
    }
    function randInt(min, max) {
        return Math.floor(randRange(min, max + 1));
    }

    function buildBannerFragments() {
        var wrap = document.getElementById('bannerFragments');
        var bannerFull = document.getElementById('bannerFull');
        if (!wrap || !bannerFull) return;

        bannerFull.style.backgroundImage = 'url(' + BANNER_IMG + ')';
        wrap.innerHTML = '';
        bannerPieces = [];
        bannerScatterTransform = [];

        for (var row = 0; row < FRAG_ROWS; row++) {
            for (var col = 0; col < FRAG_COLS; col++) {
                var idx = row * FRAG_COLS + col;
                var piece = document.createElement('div');
                piece.className = 'banner-piece';
                piece.style.left = (col / FRAG_COLS * 100) + '%';
                piece.style.top = (row / FRAG_ROWS * 100) + '%';
                piece.style.width = (100 / FRAG_COLS) + '%';
                piece.style.height = (100 / FRAG_ROWS) + '%';
                piece.style.backgroundImage = 'url(' + BANNER_IMG + ')';
                piece.style.backgroundSize = (FRAG_COLS * 100) + '% ' + (FRAG_ROWS * 100) + '%';
                piece.style.backgroundPosition =
                    (col / (FRAG_COLS - 1) * 100) + '% ' + (row / (FRAG_ROWS - 1) * 100) + '%';
                wrap.appendChild(piece);
                bannerPieces[idx] = piece;

                // 预生成随机散落效果，保证前后一致不跳变
                bannerScatterTransform[idx] =
                    'translate(' + randRange(-46, 46) + 'vw, ' + randRange(-42, 42) + 'vh) ' +
                    'rotate(' + randRange(-35, 35) + 'deg) scale(' + randRange(0.85, 1.05) + ')';
            }
        }

        correctOrder = shuffleArray(Array.from({ length: FRAG_TOTAL }, function(_, i) { return i; }));
        scatterOrder = shuffleArray(Array.from({ length: FRAG_TOTAL }, function(_, i) { return i; }));
    }

    function setPieceScattered(idx) {
        var piece = bannerPieces[idx];
        if (!piece || piece.classList.contains('is-corrected')) return;
        piece.style.transform = bannerScatterTransform[idx];
        piece.classList.add('is-visible', 'is-scattered');
    }

    function setPieceCorrected(idx) {
        var piece = bannerPieces[idx];
        if (!piece) return;
        piece.classList.remove('is-scattered');
        piece.classList.add('is-visible', 'is-corrected');
        piece.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
    }

    function uncorrectPiece(idx) {
        var piece = bannerPieces[idx];
        if (!piece) return;
        piece.classList.remove('is-corrected', 'is-visible');
        piece.style.transform = bannerScatterTransform[idx];
    }

    function showScattered(count) {
        for (var i = 0; i < count; i++) setPieceScattered(scatterOrder[i]);
    }
    function showCorrected(count) {
        for (var i = 0; i < count; i++) setPieceCorrected(correctOrder[i]);
    }

    function resetBannerAnimation() {
        bannerStep = 0;
        bannerIntroDone = false;
        scatterShownCount = 0;
        correctedShownCount = 0;
        var frag = document.getElementById('bannerFragments');
        var rain = document.getElementById('bannerRain');
        var overlay = document.getElementById('bannerOverlay');
        var bannerEl = document.getElementById('banner');
        if (frag) frag.classList.remove('zoom-out', 'zoom-full');
        if (rain) rain.classList.remove('rain-active');
        if (overlay) overlay.classList.remove('show');
        if (bannerEl) bannerEl.classList.remove('banner-revealed');

        buildBannerFragments();
        applyBannerStep(0);
    }

    function applyBannerStep(step) {
        var frag = document.getElementById('bannerFragments');
        var bannerEl = document.getElementById('banner');

        // 往回滚出拼图阶段：把已归位的碎片还原
        if (step < 2 && correctedShownCount > 0) {
            for (var u = 0; u < correctedShownCount; u++) uncorrectPiece(correctOrder[u]);
            correctedShownCount = 0;
            if (frag) frag.classList.remove('zoom-out', 'zoom-full');
            if (bannerEl) bannerEl.classList.remove('banner-revealed');
        }

        bannerStep = step;

        if (step === 0) {
            scatterShownCount = randInt(4, 8);
            showScattered(scatterShownCount);
        } else if (step === 1) {
            scatterShownCount = Math.min(FRAG_TOTAL, scatterShownCount + randInt(3, 8));
            showScattered(scatterShownCount);
        } else if (step >= 2 && step <= 5) {
            var newCount = (step - 1) * 6; // 6 / 12 / 18 / 24
            if (newCount < correctedShownCount) {
                for (var d = newCount; d < correctedShownCount; d++) uncorrectPiece(correctOrder[d]);
            }
            correctedShownCount = newCount;
            showCorrected(correctedShownCount);
            if (step === 5) {
                if (frag) frag.classList.add('zoom-out');
                if (bannerEl) bannerEl.classList.add('banner-revealed');
            } else if (frag) {
                frag.classList.remove('zoom-out', 'zoom-full');
            }
        } else if (step === 6) {
            correctedShownCount = FRAG_TOTAL;
            showCorrected(FRAG_TOTAL);
            if (frag) {
                frag.classList.remove('zoom-out');
                frag.classList.add('zoom-full');
            }
            bannerIntroDone = true;
            triggerBannerFinale();
        }
    }

    function triggerBannerFinale() {
        var rain = document.getElementById('bannerRain');
        var overlay = document.getElementById('bannerOverlay');

        // 缩放到 100% 铺满全屏后，出现向左倾斜的下雨效果
        setTimeout(function() {
            if (rain) {
                buildRainDrops(rain);
                rain.classList.add('rain-active');
            }
        }, 600);

        // 下雨效果出现后，打字机文字浮现
        setTimeout(function() {
            if (overlay) overlay.classList.add('show');
            startTypewriter();
        }, 1500);
    }

    function buildRainDrops(rain) {
        if (rain.childElementCount > 0) return; // 只生成一次
        var count = 90;
        var html = '';
        for (var i = 0; i < count; i++) {
            var left = randRange(-5, 105);
            var height = randRange(50, 130);
            var duration = randRange(0.9, 2.1);
            var delay = randRange(0, 2.5);
            html += '<span class="rain-drop" style="left:' + left + '%;height:' + height +
                'px;animation-duration:' + duration + 's;animation-delay:' + delay + 's;"></span>';
        }
        rain.innerHTML = html;
    }

    // ============================================================
    // 滚轮控制：拼图完成前拦截滚动，逐步推进 6 个阶段
    // ============================================================
    var bannerWheelAccum = 0;
    var bannerWheelCooldown = false;
    var BANNER_WHEEL_THRESHOLD = 55;
    var BANNER_STEP_COOLDOWN = 750;

    function isHomeActive() {
        var home = document.getElementById('page-home');
        return home && home.classList.contains('active');
    }

    function stepBanner(direction) {
        var next = bannerStep + direction;
        if (next < 0) next = 0;
        if (next > 6) next = 6;
        if (next === bannerStep) return;
        bannerWheelCooldown = true;
        applyBannerStep(next);
        setTimeout(function() {
            bannerWheelCooldown = false;
        }, BANNER_STEP_COOLDOWN);
    }

    function onBannerWheel(e) {
        if (bannerIntroDone) return; // 动画已完成，交还正常滚动
        if (!isHomeActive()) return;
        if (window.scrollY > 4) return; // 已滚出首屏，不再拦截

        e.preventDefault();
        if (bannerWheelCooldown) return;

        bannerWheelAccum += e.deltaY;
        if (Math.abs(bannerWheelAccum) >= BANNER_WHEEL_THRESHOLD) {
            var dir = bannerWheelAccum > 0 ? 1 : -1;
            bannerWheelAccum = 0;
            stepBanner(dir);
        }
    }

    // 触屏兼容：用触摸位移模拟滚轮
    var bannerTouchStartY = null;
    function onBannerTouchStart(e) {
        if (bannerIntroDone || !isHomeActive() || window.scrollY > 4) return;
        bannerTouchStartY = e.touches[0].clientY;
    }
    function onBannerTouchMove(e) {
        if (bannerIntroDone || !isHomeActive() || window.scrollY > 4 || bannerTouchStartY === null) return;
        e.preventDefault();
        if (bannerWheelCooldown) return;
        var dy = bannerTouchStartY - e.touches[0].clientY;
        if (Math.abs(dy) >= 40) {
            stepBanner(dy > 0 ? 1 : -1);
            bannerTouchStartY = e.touches[0].clientY;
        }
    }
    function onBannerTouchEnd() {
        bannerTouchStartY = null;
    }

    function initBanner() {
        var bannerFull = document.getElementById('bannerFull');
        if (!bannerFull) return;

        // 首页默认 banner-mode，header 悬浮
        document.body.classList.add('banner-mode');

        resetBannerAnimation();

        window.addEventListener('wheel', onBannerWheel, { passive: false });
        window.addEventListener('touchstart', onBannerTouchStart, { passive: true });
        window.addEventListener('touchmove', onBannerTouchMove, { passive: false });
        window.addEventListener('touchend', onBannerTouchEnd, { passive: true });
    }

    function startTypewriter() {
        var text = '写信告诉我，今夜你想要梦什么';
        var el = document.getElementById('bannerText');
        if (!el) return;
        var index = 0;
        el.innerHTML = '<span class="cursor"></span>';

        var timer = setInterval(function() {
            if (index < text.length) {
                el.innerHTML = text.substring(0, index + 1) + '<span class="cursor"></span>';
                index++;
            } else {
                clearInterval(timer);
                setTimeout(function() {
                    el.innerHTML = text;
                }, 400);
            }
        }, 120);
    }

    // ============================================================
    // 首页渲染
    // ============================================================
    function buildEssayCard(data) {
        if (!data) {
            return '<div class="essay-cell essay-card"><div class="essay-text essay-empty">...</div></div>';
        }
        var dateShort = (data.date || '').split(' ')[0];
        return '<div class="essay-cell essay-card">' +
            '<div class="essay-text">' + (data.content || '') + '</div>' +
            '<div class="essay-date">' + dateShort + '</div>' +
            '</div>';
    }

    async function renderHome() {
        var site = await getSite();
        updateLogo(site);

        var suibiList = await DB.getAll('suibi', { orderBy: 'id' });
        var essayContainer = document.getElementById('homeSuibi');
        if (essayContainer) {
            var displayList = suibiList.slice(0, 6);
            while (displayList.length < 6) displayList.push(null);

            var html = '';
            html += '<div class="essay-cell essay-blank essay-blank-left"><span class="essay-mark"></span></div>';
            html += buildEssayCard(displayList[0]);
            html += buildEssayCard(displayList[1]);
            html += buildEssayCard(displayList[2]);
            html += buildEssayCard(displayList[3]);
            html += buildEssayCard(displayList[4]);
            html += buildEssayCard(displayList[5]);
            html += '<div class="essay-cell essay-blank essay-blank-right"><span class="essay-mark"></span></div>';
            essayContainer.innerHTML = html;
        }

        var zajiList = await DB.getAll('zaji', { orderBy: 'id' });
        var noteContainer = document.getElementById('homeZaji');
        if (noteContainer) {
            var latestThree = zajiList.slice(0, 3);
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
    }

    // ============================================================
    // 随笔页面
    // ============================================================
    async function renderSuibiList() {
        var list = await DB.getAll('suibi', { orderBy: 'id' });
        var container = document.getElementById('suibiList');
        if (!container) return;

        if (list.length === 0) {
            container.innerHTML = '<div class="suibi-empty">暂无随笔</div>';
            return;
        }

        var html = '';
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
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

        if (filtered.length === 0) {
            container.innerHTML = '<p style="text-align:center;color:#999999;padding:40px 0;">暂无文章</p>';
            return;
        }

        var html = '';
        for (var i = 0; i < filtered.length; i++) {
            var item = filtered[i];
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
        }
    });

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
        initBanner();
        initHeaderScroll();
        renderHome();
        updateHeaderHeight();
    });

    window.addEventListener('resize', function() {
        updateHeaderHeight();
    });

})();
