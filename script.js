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

        var siteHeader = document.getElementById('siteHeader');
        if (pageId === 'page-home') {
            document.body.classList.add('banner-mode');
            if (bannerCurrentStep < 7) {
                if (siteHeader) siteHeader.classList.remove('visible');
            } else {
                if (siteHeader) siteHeader.classList.add('visible');
            }
        } else {
            document.body.classList.remove('banner-mode');
            document.body.classList.remove('scrolled');
            if (siteHeader) siteHeader.classList.add('visible');
        }

        if (pageId === 'page-home' && bannerCurrentStep < 7) {
            document.body.classList.add('banner-locked');
        } else {
            document.body.classList.remove('banner-locked');
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
    // 首页滚出 Banner 后 header 加实心背景
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
    var bannerCurrentStep = 0;

    var BANNER_CONFIG = {
        imageUrl: 'images/wallhaven-qro5vq.jpg',
        imgW: 1920,
        imgH: 1080,
        cols: 6,
        rows: 4,

        // 阶段 1、2 随机碎片数量
        randomStage1Count: 4,
        randomStage2Count: 6,

        // 阶段 3~6 每批新增固定碎片数量
        fixedStageAdd: {
            3: 6,
            4: 6,
            5: 6,
            6: 6
        },

        // 随机碎片参数
        random: {
            offset: 260,
            rotate: 25,
            blurMin: 6,
            blurMax: 14,
            scaleMin: 1.1,
            scaleMax: 1.4
        },

        rainAngle: -15,
        rainCount: 80,
        rainSpeedMin: 8,
        rainSpeedMax: 16,
        rainWidth: 2.2,
        rainLengthMin: 18,
        rainLengthMax: 34
    };

    var bannerState = {
        ready: false,
        randomFragments: [],
        fixedFragments: {},
        fixedRevealed: {},
        shuffledIds: null,
        lastWheelTime: 0,
        typewriterDone: false,
        rainStarted: false,
        rainRAF: null,
        rainDrops: []
    };

    function initBannerFragments() {
        var banner = document.getElementById('banner');
        var randomLayer = document.getElementById('randomLayer');
        var fixedLayer = document.getElementById('fixedLayer');
        var fullLayer = document.getElementById('bannerFull');
        var rainCanvas = document.getElementById('bannerRain');
        var siteHeader = document.getElementById('siteHeader');

        if (!banner || !randomLayer || !fixedLayer) return;

        document.body.classList.add('banner-mode');

        var COLS = BANNER_CONFIG.cols;
        var ROWS = BANNER_CONFIG.rows;
        var TOTAL = COLS * ROWS;

        function computeCoverRect() {
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var imgW = BANNER_CONFIG.imgW;
            var imgH = BANNER_CONFIG.imgH;

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

        function setRandomState(el) {
            var rg = BANNER_CONFIG.random;
            el.style.setProperty('--dx', (Math.random() * rg.offset * 2 - rg.offset).toFixed(1) + 'px');
            el.style.setProperty('--dy', (Math.random() * rg.offset * 2 - rg.offset).toFixed(1) + 'px');
            el.style.setProperty('--rot', (Math.random() * rg.rotate * 2 - rg.rotate).toFixed(1) + 'deg');
            var s = rg.scaleMin + Math.random() * (rg.scaleMax - rg.scaleMin);
            el.style.setProperty('--scale', s.toFixed(2));
            el.style.setProperty('--blur',
                (rg.blurMin + Math.random() * (rg.blurMax - rg.blurMin)).toFixed(1) + 'px');
        }

        // 创建固定碎片（24 块，位置正确，初始 opacity:0）
        function createFixedFragments() {
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var cellW = vw / COLS;
            var cellH = vh / ROWS;
            var cover = computeCoverRect();

            fixedLayer.innerHTML = '';
            bannerState.fixedFragments = {};

            var id = 1;
            for (var r = 0; r < ROWS; r++) {
                for (var c = 0; c < COLS; c++) {
                    var el = document.createElement('div');
                    el.className = 'fixed-fragment';
                    el.dataset.id = String(id);
                    el.style.width = cellW + 'px';
                    el.style.height = cellH + 'px';
                    el.style.left = (c * cellW) + 'px';
                    el.style.top = (r * cellH) + 'px';

                    el.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                    el.style.backgroundSize = cover.width + 'px ' + cover.height + 'px';
                    el.style.backgroundPosition = (c * cellW - cover.offsetX) + 'px ' + (r * cellH - cover.offsetY) + 'px';

                    fixedLayer.appendChild(el);
                    bannerState.fixedFragments[id] = el;
                    id++;
                }
            }

            // 一次性乱序 1~24
            var ids = [];
            for (var k = 1; k <= TOTAL; k++) ids.push(k);
            for (var m = ids.length - 1; m > 0; m--) {
                var j = Math.floor(Math.random() * (m + 1));
                var t = ids[m]; ids[m] = ids[j]; ids[j] = t;
            }
            bannerState.shuffledIds = ids;
        }

        // 创建随机碎片（随机位置、模糊、倾斜）
        function spawnRandomFragments(count) {
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var cellW = vw / COLS;
            var cellH = vh / ROWS;
            var cover = computeCoverRect();

            for (var i = 0; i < count; i++) {
                var c = Math.floor(Math.random() * COLS);
                var r = Math.floor(Math.random() * ROWS);

                var el = document.createElement('div');
                el.className = 'random-fragment';
                el.style.width = cellW + 'px';
                el.style.height = cellH + 'px';
                el.style.left = (c * cellW) + 'px';
                el.style.top = (r * cellH) + 'px';

                el.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                el.style.backgroundSize = cover.width + 'px ' + cover.height + 'px';
                el.style.backgroundPosition = (c * cellW - cover.offsetX) + 'px ' + (r * cellH - cover.offsetY) + 'px';

                setRandomState(el);
                randomLayer.appendChild(el);
                bannerState.randomFragments.push(el);

                (function(element) {
                    requestAnimationFrame(function() {
                        element.classList.add('show');
                    });
                })(el);
            }
        }

        function clearRandomFragments() {
            for (var i = 0; i < bannerState.randomFragments.length; i++) {
                var el = bannerState.randomFragments[i];
                if (el.parentNode) el.parentNode.removeChild(el);
            }
            bannerState.randomFragments = [];
        }

        function hideAllFixed() {
            for (var id = 1; id <= TOTAL; id++) {
                var el = bannerState.fixedFragments[id];
                if (!el) continue;
                bannerState.fixedRevealed[id] = false;
                el.classList.remove('show');
            }
        }

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
        // 核心：从阶段 0 完整重放到 target
        // ============================================================
        function applyStep(target) {
            bannerCurrentStep = target;

            // 1. 清空所有状态
            stopRain();
            fullLayer.classList.remove('zoom');
            fullLayer.classList.remove('show');
            fixedLayer.style.opacity = '1';
            clearRandomFragments();
            hideAllFixed();

            // 2. 非 7 阶段：隐藏 header + 锁屏 + 清文字
            if (target < 7) {
                if (siteHeader) siteHeader.classList.remove('visible');
                document.body.classList.add('banner-locked');
                var overlay = document.getElementById('bannerOverlay');
                if (overlay) overlay.classList.remove('show');
                var hint = document.getElementById('bannerScrollHint');
                if (hint) hint.classList.remove('hide');
                bannerState.typewriterDone = false;
                var txt = document.getElementById('bannerText');
                if (txt) txt.innerHTML = '';
            }

            // 阶段 0：全黑
            if (target === 0) return;

            // 阶段 1：随机 4 块
            if (target === 1) {
                spawnRandomFragments(BANNER_CONFIG.randomStage1Count);
                return;
            }

            // 阶段 2：随机 4 + 6 块
            if (target === 2) {
                spawnRandomFragments(BANNER_CONFIG.randomStage1Count);
                spawnRandomFragments(BANNER_CONFIG.randomStage2Count);
                return;
            }

            // 阶段 3~6：正确位置累积显示
            if (target >= 3 && target <= 6) {
                var ids = bannerState.shuffledIds;
                if (!ids || ids.length < TOTAL) {
                    var newIds = [];
                    for (var k2 = 1; k2 <= TOTAL; k2++) newIds.push(k2);
                    for (var m2 = newIds.length - 1; m2 > 0; m2--) {
                        var j2 = Math.floor(Math.random() * (m2 + 1));
                        var t2 = newIds[m2]; newIds[m2] = newIds[j2]; newIds[j2] = t2;
                    }
                    bannerState.shuffledIds = newIds;
                    ids = newIds;
                }

                var totalCount = 0;
                var add = BANNER_CONFIG.fixedStageAdd;
                for (var s = 3; s <= target; s++) {
                    totalCount += add[s] || 0;
                }
                if (totalCount > TOTAL) totalCount = TOTAL;

                for (var idx = 0; idx < totalCount; idx++) {
                    var id2 = ids[idx];
                    var el2 = bannerState.fixedFragments[id2];
                    if (!el2) continue;
                    bannerState.fixedRevealed[id2] = true;
                    el2.classList.add('show');
                }
            }

            // 阶段 6：图片完整，显示完整图（90% 缩放）
            if (target === 6) {
                setTimeout(function() {
                    fullLayer.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                    fixedLayer.style.opacity = '0';
                    fullLayer.classList.add('show');   // .show = scale(0.9)
                }, 700);
            }

            // 阶段 7：放大铺满 + 下雨 + 打字机 + 显示 header
            if (target === 7) {
                fullLayer.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                fixedLayer.style.opacity = '0';
                fullLayer.classList.add('show');
                fullLayer.classList.add('zoom');      // .zoom = scale(1)

                rainCanvas.classList.add('show');
                startRain();

                setTimeout(function() {
                    var overlay2 = document.getElementById('bannerOverlay');
                    if (overlay2) overlay2.classList.add('show');
                    var hint2 = document.getElementById('bannerScrollHint');
                    if (hint2) hint2.classList.add('hide');
                    if (siteHeader) siteHeader.classList.add('visible');
                    updateHeaderHeight();
                    document.body.classList.remove('banner-locked');
                    startTypewriter();
                }, 800);
            }
        }

        function nextStep() {
            if (!bannerState.ready) return;
            if (bannerCurrentStep >= 7) return;
            bannerCurrentStep++;
            applyStep(bannerCurrentStep);
        }

        function prevStep() {
            if (!bannerState.ready) return;
            if (bannerCurrentStep <= 0) return;
            bannerCurrentStep--;
            applyStep(bannerCurrentStep);
        }

        // ============================================================
        // 滚轮监听（800ms 节流）
        // ============================================================
        window.addEventListener('wheel', function(e) {
            var homeActive = document.getElementById('page-home').classList.contains('active');
            if (!homeActive) return;

            // 阶段 7 后：页面滚动，但页面在顶部 + 向上滚 → 回退
            if (bannerCurrentStep >= 7) {
                if (e.deltaY < 0 && window.scrollY <= 5) {
                    e.preventDefault();
                    var now2 = Date.now();
                    if (now2 - bannerState.lastWheelTime < 800) return;
                    bannerState.lastWheelTime = now2;
                    prevStep();
                }
                return;
            }

            // 阶段 0~6：拦截滚轮，控制 Banner
            e.preventDefault();

            var now = Date.now();
            if (now - bannerState.lastWheelTime < 800) return;
            bannerState.lastWheelTime = now;

            if (e.deltaY > 0) {
                nextStep();
            } else if (e.deltaY < 0) {
                prevStep();
            }
        }, { passive: false });

        // ============================================================
        // 下雨
        // ============================================================
        function startRain() {
            if (bannerState.rainStarted) return;
            bannerState.rainStarted = true;

            rainCanvas.width = banner.offsetWidth;
            rainCanvas.height = banner.offsetHeight;

            var ctx = rainCanvas.getContext('2d');
            var angleRad = BANNER_CONFIG.rainAngle * Math.PI / 180;
            var sinA = Math.sin(angleRad);
            var cosA = Math.cos(angleRad);

            bannerState.rainDrops = [];
            for (var i = 0; i < BANNER_CONFIG.rainCount; i++) {
                bannerState.rainDrops.push({
                    x: Math.random() * rainCanvas.width,
                    y: Math.random() * rainCanvas.height,
                    len: BANNER_CONFIG.rainLengthMin +
                         Math.random() * (BANNER_CONFIG.rainLengthMax - BANNER_CONFIG.rainLengthMin),
                    speed: BANNER_CONFIG.rainSpeedMin +
                           Math.random() * (BANNER_CONFIG.rainSpeedMax - BANNER_CONFIG.rainSpeedMin),
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
                    ctx.lineWidth = BANNER_CONFIG.rainWidth;
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
        // 初始化
        // ============================================================
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            BANNER_CONFIG.imgW = img.naturalWidth;
            BANNER_CONFIG.imgH = img.naturalHeight;

            createFixedFragments();
            bannerState.ready = true;

            // 移动端：直接显示完整 Banner
            if (window.innerWidth <= 768) {
                fullLayer.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                fullLayer.classList.add('show');
                fullLayer.classList.add('zoom');

                var overlay = document.getElementById('bannerOverlay');
                if (overlay) overlay.classList.add('show');
                var hint = document.getElementById('bannerScrollHint');
                if (hint) hint.classList.add('hide');

                if (siteHeader) siteHeader.classList.add('visible');
                updateHeaderHeight();
                document.body.classList.remove('banner-locked');
                startTypewriter();

                bannerCurrentStep = 7;
                return;
            }

            document.body.classList.add('banner-locked');
            // 阶段 0：不显示任何碎片，等待用户滚轮
        };
        img.onerror = function() {
            console.error('Banner 图片加载失败：', BANNER_CONFIG.imageUrl);
            BANNER_CONFIG.imgW = 1920;
            BANNER_CONFIG.imgH = 1080;
            createFixedFragments();
            bannerState.ready = true;
            document.body.classList.add('banner-locked');
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
