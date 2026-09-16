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
    // Banner 碎片拼合
    // ============================================================
    var bannerStep = 0;

    var BANNER_CONFIG = {
        imageUrl: 'images/0916.jpg',
        cols: 6,
        rows: 4,
        // 阶段 0 显示的随机碎片数量
        initRandomCount: 4,
        // 阶段 1 增加的随机碎片数量
        stage1AddRandom: 6,
        // 阶段 2~4 每批正确位置的碎片数
        fixedStageAdd: 6
    };

    var bannerState = {
        ready: false,
        imageW: 1920,
        imageH: 1080,
        // 随机层
        randomLayer: null,
        // 碎片层容器（90% 缩放）
        fragmentsLayer: null,
        // 所有碎片（按 id 索引 1~24）
        allFragments: {},
        // 已显示为"正确位置"的 id 集合
        revealedIds: [],
        // 打乱后的 id 顺序
        shuffledIds: null,
        // 滚轮节流
        lastWheelTime: 0,
        // 打字机是否已执行
        typewriterDone: false,
        // 下雨是否已启动
        rainStarted: false,
        rainRAF: null,
        rainDrops: []
    };

    function initBannerFragments() {
        var banner = document.getElementById('banner');
        var fragmentsLayer = document.getElementById('bannerFragments');
        var fullLayer = document.getElementById('bannerFull');
        var rainCanvas = document.getElementById('bannerRain');
        var siteHeader = document.getElementById('siteHeader');

        if (!banner || !fragmentsLayer) return;

        document.body.classList.add('banner-mode');
        bannerState.fragmentsLayer = fragmentsLayer;

        var COLS = BANNER_CONFIG.cols;
        var ROWS = BANNER_CONFIG.rows;
        var TOTAL = COLS * ROWS;

        // 计算图片按 cover 规则的实际绘制矩形
        function computeCoverRect() {
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var imgW = bannerState.imageW;
            var imgH = bannerState.imageH;

            var scale = Math.max(vw / imgW, vh / imgH);
            var drawW = imgW * scale;
            var drawH = imgH * scale;

            return {
                width: drawW,
                height: drawH,
                offsetX: (vw - drawW) / 2,
                offsetY: (vh - drawH) / 2
            };
        }

        // 创建 24 个碎片（位置正确，初始 opacity:0）
        function createFragments() {
            fragmentsLayer.innerHTML = '';
            bannerState.allFragments = {};

            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var cellW = vw / COLS;
            var cellH = vh / ROWS;
            var cover = computeCoverRect();

            var id = 1;
            for (var r = 0; r < ROWS; r++) {
                for (var c = 0; c < COLS; c++) {
                    var el = document.createElement('div');
                    el.className = 'fragment fixed';
                    el.dataset.id = String(id);
                    el.style.width = cellW + 'px';
                    el.style.height = cellH + 'px';
                    el.style.left = (c * cellW) + 'px';
                    el.style.top = (r * cellH) + 'px';
                    el.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                    el.style.backgroundSize = cover.width + 'px ' + cover.height + 'px';
                    el.style.backgroundPosition = (c * cellW - cover.offsetX) + 'px ' + (r * cellH - cover.offsetY) + 'px';

                    fragmentsLayer.appendChild(el);
                    bannerState.allFragments[id] = el;
                    id++;
                }
            }

            // 打乱 id 顺序
            var ids = [];
            for (var k = 1; k <= TOTAL; k++) ids.push(k);
            for (var m = ids.length - 1; m > 0; m--) {
                var j = Math.floor(Math.random() * (m + 1));
                var t = ids[m]; ids[m] = ids[j]; ids[j] = t;
            }
            bannerState.shuffledIds = ids;
        }

        // 生成随机碎片（随机位置、倾斜、模糊）
        function spawnRandomFragment() {
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var cellW = vw / COLS;
            var cellH = vh / ROWS;
            var cover = computeCoverRect();

            // 随机选一个格子位置
            var c = Math.floor(Math.random() * COLS);
            var r = Math.floor(Math.random() * ROWS);

            var el = document.createElement('div');
            el.className = 'fragment random';
            el.style.width = cellW + 'px';
            el.style.height = cellH + 'px';
            el.style.left = (c * cellW) + 'px';
            el.style.top = (r * cellH) + 'px';
            el.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
            el.style.backgroundSize = cover.width + 'px ' + cover.height + 'px';
            el.style.backgroundPosition = (c * cellW - cover.offsetX) + 'px ' + (r * cellH - cover.offsetY) + 'px';

            // 随机状态
            el.style.setProperty('--dx', (Math.random() * 520 - 260).toFixed(1) + 'px');
            el.style.setProperty('--dy', (Math.random() * 520 - 260).toFixed(1) + 'px');
            el.style.setProperty('--rot', (Math.random() * 50 - 25).toFixed(1) + 'deg');
            el.style.setProperty('--scale', (1.1 + Math.random() * 0.3).toFixed(2));
            el.style.setProperty('--blur', (6 + Math.random() * 8).toFixed(1) + 'px');

            fragmentsLayer.appendChild(el);

            requestAnimationFrame(function() {
                el.classList.add('show');
            });
        }

        // 清除所有随机碎片
        function clearRandomFragments() {
            var list = fragmentsLayer.querySelectorAll('.fragment.random');
            for (var i = 0; i < list.length; i++) {
                list[i].parentNode.removeChild(list[i]);
            }
        }

        // 重置所有正确位置碎片的显示状态
        function hideAllFixed() {
            for (var id = 1; id <= TOTAL; id++) {
                var el = bannerState.allFragments[id];
                if (!el) continue;
                el.classList.remove('show');
            }
            bannerState.revealedIds = [];
        }

        // 显示指定数量的固定碎片
        function revealFixed(count) {
            var ids = bannerState.shuffledIds;
            for (var i = 0; i < count; i++) {
                var id = ids[i];
                var el = bannerState.allFragments[id];
                if (!el) continue;
                el.classList.add('show');
                bannerState.revealedIds.push(id);
            }
        }

        // 打字机
        function startTypewriter() {
            if (bannerState.typewriterDone) return;
            bannerState.typewriterDone = true;

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
        // 核心：从阶段 0 重放到 target
        // ============================================================
        function applyStep(target) {
            bannerStep = target;

            // 清空状态
            stopRain();
            fullLayer.classList.remove('zoom');
            fullLayer.classList.remove('show');
            clearRandomFragments();
            hideAllFixed();
            fragmentsLayer.style.opacity = '1';
            fragmentsLayer.style.transform = 'scale(0.9)';

            // 隐藏文字 + 隐藏 header
            var overlay = document.getElementById('bannerOverlay');
            if (overlay) overlay.classList.remove('show');
            if (siteHeader) siteHeader.classList.remove('visible');
            document.body.classList.add('banner-locked');
            bannerState.typewriterDone = false;
            var txt = document.getElementById('bannerText');
            if (txt) txt.innerHTML = '';

            // 阶段 0：随机显示部分碎片
            if (target === 0) {
                for (var i = 0; i < BANNER_CONFIG.initRandomCount; i++) {
                    spawnRandomFragment();
                }
                return;
            }

            // 阶段 1：增加随机碎片
            if (target === 1) {
                for (var i = 0; i < BANNER_CONFIG.initRandomCount; i++) {
                    spawnRandomFragment();
                }
                for (var j = 0; j < BANNER_CONFIG.stage1AddRandom; j++) {
                    spawnRandomFragment();
                }
                return;
            }

            // 阶段 2：6 张正确位置
            if (target === 2) {
                revealFixed(6);
                return;
            }

            // 阶段 3：12 张正确位置
            if (target === 3) {
                revealFixed(12);
                return;
            }

            // 阶段 4：18 张正确位置
            if (target === 4) {
                revealFixed(18);
                return;
            }

            // 阶段 5：24 张 → 图片完整（90% 缩放，碎片层保持）
            if (target === 5) {
                revealFixed(24);
                return;
            }

            // 阶段 6：放大铺满 + 下雨 + 打字机
            if (target === 6) {
                revealFixed(24);
                // 切换为完整图
                setTimeout(function() {
                    fragmentsLayer.style.opacity = '0';
                    fullLayer.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                    fullLayer.classList.add('show');   // 90%
                    setTimeout(function() {
                        fullLayer.classList.add('zoom');   // 100%
                        rainCanvas.classList.add('show');
                        startRain();
                        // 显示 header + 文字 + 打字机
                        if (siteHeader) siteHeader.classList.add('visible');
                        document.body.classList.remove('banner-locked');
                        var ov = document.getElementById('bannerOverlay');
                        if (ov) ov.classList.add('show');
                        startTypewriter();
                    }, 900);
                }, 700);
                return;
            }
        }

        // ============================================================
        // 滚轮监听
        // ============================================================
        function nextStep() {
            if (bannerStep >= 6) return;
            bannerStep++;
            applyStep(bannerStep);
        }

        function prevStep() {
            if (bannerStep <= 0) return;
            bannerStep--;
            applyStep(bannerStep);
        }

        window.addEventListener('wheel', function(e) {
            var homeActive = document.getElementById('page-home').classList.contains('active');
            if (!homeActive) return;

            if (bannerStep >= 6) {
                // 阶段 6 后：页面滚动，但在顶部 + 向上滚 → 回退
                if (e.deltaY < 0 && window.scrollY <= 5) {
                    e.preventDefault();
                    var now2 = Date.now();
                    if (now2 - bannerState.lastWheelTime < 800) return;
                    bannerState.lastWheelTime = now2;
                    prevStep();
                }
                return;
            }

            e.preventDefault();

            var now = Date.now();
            if (now - bannerState.lastWheelTime < 800) return;
            bannerState.lastWheelTime = now;

            if (e.deltaY > 0) nextStep();
            else if (e.deltaY < 0) prevStep();
        }, { passive: false });

        // ============================================================
        // 下雨（向左倾斜）
        // ============================================================
        function startRain() {
            if (bannerState.rainStarted) return;
            bannerState.rainStarted = true;

            rainCanvas.width = banner.offsetWidth;
            rainCanvas.height = banner.offsetHeight;

            var ctx = rainCanvas.getContext('2d');
            var angleRad = -15 * Math.PI / 180;  // ★ 负角度 = 向左
            var sinA = Math.sin(angleRad);
            var cosA = Math.cos(angleRad);

            bannerState.rainDrops = [];
            for (var i = 0; i < 80; i++) {
                bannerState.rainDrops.push({
                    x: Math.random() * rainCanvas.width,
                    y: Math.random() * rainCanvas.height,
                    len: 18 + Math.random() * 16,
                    speed: 8 + Math.random() * 8,
                    alpha: 0.18 + Math.random() * 0.35
                });
            }

            function drawRain() {
                if (!bannerState.rainStarted) return;
                ctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);

                for (var i = 0; i < bannerState.rainDrops.length; i++) {
                    var d = bannerState.rainDrops[i];
                    var endX = d.x + d.len * sinA;
                    var endY = d.y + d.len * cosA;

                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(200, 220, 255, ' + d.alpha + ')';
                    ctx.lineWidth = 2.2;
                    ctx.lineCap = 'round';
                    ctx.moveTo(d.x, d.y);
                    ctx.lineTo(endX, endY);
                    ctx.stroke();

                    d.x += d.speed * sinA;
                    d.y += d.speed * cosA;

                    if (d.y > rainCanvas.height + 30) {
                        d.y = -30;
                        d.x = Math.random() * (rainCanvas.width + 100) - 50;
                    }
                    if (d.x < -30) {
                        d.x = rainCanvas.width + 20;
                        d.y = Math.random() * rainCanvas.height * 0.5 - 100;
                    }
                }
                bannerState.rainRAF = requestAnimationFrame(drawRain);
            }
            drawRain();
        }

        function stopRain() {
            if (!bannerState.rainStarted) return;
            bannerState.rainStarted = false;
            if (bannerState.rainRAF) cancelAnimationFrame(bannerState.rainRAF);
            bannerState.rainRAF = null;
            var ctx = rainCanvas.getContext('2d');
            ctx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
        }

        // ============================================================
        // 初始化：预加载图片
        // ============================================================
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            bannerState.imageW = img.naturalWidth;
            bannerState.imageH = img.naturalHeight;

            createFragments();
            bannerState.ready = true;

            // 移动端：直接显示完整图
            if (window.innerWidth <= 768) {
                fragmentsLayer.style.display = 'none';
                fullLayer.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                fullLayer.classList.add('show');
                fullLayer.classList.add('zoom');
                var overlay = document.getElementById('bannerOverlay');
                if (overlay) overlay.classList.add('show');
                if (siteHeader) siteHeader.classList.add('visible');
                document.body.classList.remove('banner-locked');
                startTypewriter();
                bannerStep = 6;
                return;
            }

            document.body.classList.add('banner-locked');
            // 阶段 0：显示初始随机碎片
            applyStep(0);
        };
        img.onerror = function() {
            console.error('Banner 图片加载失败：', BANNER_CONFIG.imageUrl);
            bannerState.imageW = 1920;
            bannerState.imageH = 1080;
            createFragments();
            bannerState.ready = true;
            document.body.classList.add('banner-locked');
            applyStep(0);
        };
        img.src = BANNER_CONFIG.imageUrl;
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
        initBannerFragments();
        initHeaderScroll();
        renderHome();
        updateHeaderHeight();
    });

    window.addEventListener('resize', function() {
        updateHeaderHeight();
    });

})();
