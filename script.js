// script.js —— 须臾之间 前端逻辑
(function() {
    var DB = window.DB;

    // ============================================================
    // 站点信息
    // ============================================================
    var _siteCache = null;

async function getSite() {
    // 站点信息写死，不请求数据库
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
        var siteHeader = document.getElementById('siteHeader');
        if (pageId === 'page-home') {
            // 首页：悬浮在 Banner 内
            document.body.classList.add('banner-mode');
            if (bannerCurrentStep < 7) {
                if (siteHeader) siteHeader.classList.remove('visible');
            } else {
                if (siteHeader) siteHeader.classList.add('visible');
            }
        } else {
            // 其它页面：独立高度 80px，header 一直显示
            document.body.classList.remove('banner-mode');
            if (siteHeader) siteHeader.classList.add('visible');
        }

        // ★ 锁屏逻辑
        if (pageId === 'page-home' && bannerCurrentStep < 7) {
            document.body.classList.add('banner-locked');
        } else {
            document.body.classList.remove('banner-locked');
        }

        // 重新计算 header 高度
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
    // Banner 碎片拼合
    // ============================================================
    var bannerCurrentStep = 0;

    var BANNER_CONFIG = {
        imageUrl: 'images/wallhaven-qro5vq.jpg,    // ★ 换成你的图片路径
        cols: 6,
        rows: 4,
        randomStage1Count: 4,
        randomStage2Count: 6,
        fixedStageCounts: { 3: 6, 4: 6, 5: 6, 6: 0 },
        random: {
            offset: 260,
            rotate: 25,
            scaleMin: 0.55,
            scaleMax: 1.05,
            blurMin: 6,
            blurMax: 14
        },
        rainAngle: -15,
        rainCount: 80,
        rainSpeedMin: 8,
        rainSpeedMax: 16,
        rainWidth: 2.2,
        rainLengthMin: 18,
        rainLengthMax: 34,
        autoStartDelay: 2000,
        autoInterval: 1500,
        autoResumeDelay: 2000,
        autoEndStep: 7
    };

    var bannerState = {
        randomFragments: [],
        fixedFragments: {},
        fixedRevealed: {},
        wheelLock: false,
        autoPlayTimer: null,
        autoStartTimer: null,
        autoResumeTimer: null,
        autoPlaying: false,
        autoFinished: false,
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

        // ★ 首页默认进入 banner-mode
        document.body.classList.add('banner-mode');

        var COLS = BANNER_CONFIG.cols;
        var ROWS = BANNER_CONFIG.rows;
        var TOTAL = COLS * ROWS;

        function setRandomState(el) {
            var rg = BANNER_CONFIG.random;
            el.style.setProperty('--dx', (Math.random() * rg.offset * 2 - rg.offset).toFixed(1) + 'px');
            el.style.setProperty('--dy', (Math.random() * rg.offset * 2 - rg.offset).toFixed(1) + 'px');
            el.style.setProperty('--rot', (Math.random() * rg.rotate * 2 - rg.rotate).toFixed(1) + 'deg');
            el.style.setProperty('--scale',
                (rg.scaleMin + Math.random() * (rg.scaleMax - rg.scaleMin)).toFixed(2));
            el.style.setProperty('--blur',
                (rg.blurMin + Math.random() * (rg.blurMax - rg.blurMin)).toFixed(1) + 'px');
        }

        function createFixedFragments() {
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var cellW = vw / COLS;
            var cellH = vh / ROWS;

            var id = 1;
            for (var r = 0; r < ROWS; r++) {
                for (var c = 0; c < COLS; c++) {
                    var x = c * cellW;
                    var y = r * cellH;

                    var el = document.createElement('div');
                    el.className = 'fixed-fragment';
                    el.dataset.id = id;
                    el.style.width = cellW + 'px';
                    el.style.height = cellH + 'px';
                    el.style.left = x + 'px';
                    el.style.top = y + 'px';
                    el.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                    el.style.backgroundSize = vw + 'px ' + vh + 'px';
                    el.style.backgroundPosition = '-' + x + 'px -' + y + 'px';

                    fixedLayer.appendChild(el);
                    bannerState.fixedFragments[id] = el;
                    id++;
                }
            }
        }

        function spawnRandomFragments(count) {
            var vw = window.innerWidth;
            var vh = window.innerHeight;
            var cellW = vw / COLS;
            var cellH = vh / ROWS;

            for (var i = 0; i < count; i++) {
                var c = Math.floor(Math.random() * COLS);
                var r = Math.floor(Math.random() * ROWS);
                var x = c * cellW;
                var y = r * cellH;

                var el = document.createElement('div');
                el.className = 'random-fragment';
                el.style.width = cellW + 'px';
                el.style.height = cellH + 'px';
                el.style.left = x + 'px';
                el.style.top = y + 'px';
                el.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                el.style.backgroundSize = vw + 'px ' + vh + 'px';
                el.style.backgroundPosition = '-' + x + 'px -' + y + 'px';

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

        function clearRandomFragmentsInstant() {
            for (var i = 0; i < bannerState.randomFragments.length; i++) {
                var el = bannerState.randomFragments[i];
                if (el.parentNode) el.parentNode.removeChild(el);
            }
            bannerState.randomFragments = [];
        }

        function appendRandomFixed(count) {
            var pool = [];
            for (var id = 1; id <= TOTAL; id++) {
                if (!bannerState.fixedRevealed[id]) pool.push(id);
            }
            for (var i = pool.length - 1; i > 0; i--) {
                var j = Math.floor(Math.random() * (i + 1));
                var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
            }
            var pick = pool.slice(0, count);
            for (var k = 0; k < pick.length; k++) {
                var id2 = pick[k];
                bannerState.fixedRevealed[id2] = true;
                bannerState.fixedFragments[id2].classList.add('show');
            }
        }

        function appendRest() {
            for (var id = 1; id <= TOTAL; id++) {
                if (!bannerState.fixedRevealed[id]) {
                    bannerState.fixedRevealed[id] = true;
                    bannerState.fixedFragments[id].classList.add('show');
                }
            }
        }

        function hideAllFixed() {
            for (var id = 1; id <= TOTAL; id++) {
                bannerState.fixedRevealed[id] = false;
                bannerState.fixedFragments[id].classList.remove('show');
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

        function applyStep(step) {
            bannerCurrentStep = step;

            if (step === 7) {
                fullLayer.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                fixedLayer.style.opacity = '0';
                fullLayer.classList.add('show');
                fullLayer.classList.add('zoom');
                rainCanvas.classList.add('show');
                startRain();

                setTimeout(function() {
                    var overlay = document.getElementById('bannerOverlay');
                    if (overlay) overlay.classList.add('show');
                    var hint = document.getElementById('bannerScrollHint');
                    if (hint) hint.classList.add('hide');
                    if (siteHeader) siteHeader.classList.add('visible');
                    updateHeaderHeight();
                    document.body.classList.remove('banner-locked');
                    startTypewriter();
                }, 800);
                return;
            }

            if (step === 0) {
                stopRain();
                fullLayer.classList.remove('zoom');
                fullLayer.classList.remove('show');
                fixedLayer.style.opacity = '1';
                clearRandomFragmentsInstant();
                hideAllFixed();
                if (siteHeader) siteHeader.classList.remove('visible');
                document.body.classList.add('banner-locked');
                var o0 = document.getElementById('bannerOverlay');
                if (o0) o0.classList.remove('show');
                var h0 = document.getElementById('bannerScrollHint');
                if (h0) h0.classList.remove('hide');
                return;
            }

            if (step === 1) {
                stopRain();
                fullLayer.classList.remove('zoom');
                fullLayer.classList.remove('show');
                fixedLayer.style.opacity = '1';
                clearRandomFragmentsInstant();
                hideAllFixed();
                spawnRandomFragments(BANNER_CONFIG.randomStage1Count);
                return;
            }

            if (step === 2) {
                stopRain();
                fullLayer.classList.remove('zoom');
                fullLayer.classList.remove('show');
                fixedLayer.style.opacity = '1';
                clearRandomFragmentsInstant();
                hideAllFixed();
                spawnRandomFragments(BANNER_CONFIG.randomStage1Count);
                spawnRandomFragments(BANNER_CONFIG.randomStage2Count);
                return;
            }

            if (step === 3) {
                stopRain();
                fullLayer.classList.remove('zoom');
                fullLayer.classList.remove('show');
                fixedLayer.style.opacity = '1';
                clearRandomFragmentsInstant();
                hideAllFixed();
                appendRandomFixed(BANNER_CONFIG.fixedStageCounts[3]);
                return;
            }

            if (step === 4) { appendRandomFixed(BANNER_CONFIG.fixedStageCounts[4]); return; }
            if (step === 5) { appendRandomFixed(BANNER_CONFIG.fixedStageCounts[5]); return; }

            if (step === 6) {
                appendRest();
                setTimeout(function() {
                    fullLayer.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                    fixedLayer.style.opacity = '0';
                    fullLayer.classList.add('show');
                }, 800);
                return;
            }
        }

        function replayToStep(target) {
            stopRain();
            fullLayer.classList.remove('zoom');
            fullLayer.classList.remove('show');
            fixedLayer.style.opacity = '1';
            clearRandomFragmentsInstant();
            hideAllFixed();

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

            for (var s = 1; s <= target; s++) {
                if (s === 1) spawnRandomFragments(BANNER_CONFIG.randomStage1Count);
                if (s === 2) {
                    clearRandomFragmentsInstant();
                    spawnRandomFragments(BANNER_CONFIG.randomStage1Count);
                    spawnRandomFragments(BANNER_CONFIG.randomStage2Count);
                }
                if (s === 3) {
                    clearRandomFragmentsInstant();
                    hideAllFixed();
                    appendRandomFixed(BANNER_CONFIG.fixedStageCounts[3]);
                }
                if (s === 4) appendRandomFixed(BANNER_CONFIG.fixedStageCounts[4]);
                if (s === 5) appendRandomFixed(BANNER_CONFIG.fixedStageCounts[5]);
                if (s === 6) {
                    appendRest();
                    fullLayer.style.backgroundImage = 'url(' + BANNER_CONFIG.imageUrl + ')';
                    fixedLayer.style.opacity = '0';
                    fullLayer.classList.add('show');
                }
                if (s === 7) {
                    applyStep(7);
                    return;
                }
            }
            bannerCurrentStep = target;
        }

        function startAutoPlay() {
            if (bannerState.autoPlaying || bannerState.autoFinished) return;
            if (bannerCurrentStep >= BANNER_CONFIG.autoEndStep) {
                bannerState.autoFinished = true;
                return;
            }
            bannerState.autoPlaying = true;

            bannerState.autoPlayTimer = setInterval(function() {
                if (bannerCurrentStep >= BANNER_CONFIG.autoEndStep) {
                    stopAutoPlay();
                    bannerState.autoFinished = true;
                    return;
                }
                bannerCurrentStep++;
                applyStep(bannerCurrentStep);
            }, BANNER_CONFIG.autoInterval);
        }

        function stopAutoPlay() {
            bannerState.autoPlaying = false;
            if (bannerState.autoPlayTimer) {
                clearInterval(bannerState.autoPlayTimer);
                bannerState.autoPlayTimer = null;
            }
        }

        function scheduleAutoResume() {
            if (bannerState.autoResumeTimer) {
                clearTimeout(bannerState.autoResumeTimer);
                bannerState.autoResumeTimer = null;
            }
            if (bannerState.autoFinished) return;
            if (bannerCurrentStep >= BANNER_CONFIG.autoEndStep) {
                bannerState.autoFinished = true;
                return;
            }
            bannerState.autoResumeTimer = setTimeout(function() {
                bannerState.autoResumeTimer = null;
                startAutoPlay();
            }, BANNER_CONFIG.autoResumeDelay);
        }

        function handleUserScroll(direction) {
            stopAutoPlay();
            if (bannerState.autoResumeTimer) {
                clearTimeout(bannerState.autoResumeTimer);
                bannerState.autoResumeTimer = null;
            }
            if (bannerState.autoStartTimer) {
                clearTimeout(bannerState.autoStartTimer);
                bannerState.autoStartTimer = null;
            }

            if (bannerState.wheelLock) return;

            if (direction > 0) {
                if (bannerCurrentStep >= 7) return;
                bannerState.wheelLock = true;
                bannerCurrentStep++;
                applyStep(bannerCurrentStep);
                setTimeout(function() { bannerState.wheelLock = false; }, 700);
            } else if (direction < 0) {
                if (bannerCurrentStep <= 0) return;
                bannerState.wheelLock = true;
                bannerCurrentStep--;
                replayToStep(bannerCurrentStep);
                setTimeout(function() { bannerState.wheelLock = false; }, 700);
            }

            if (bannerCurrentStep < BANNER_CONFIG.autoEndStep) {
                bannerState.autoFinished = false;
            }

            scheduleAutoResume();
        }

        // 滚轮 / 触摸
        window.addEventListener('wheel', function(e) {
            var homeActive = document.getElementById('page-home').classList.contains('active');
            if (!homeActive) return;
            if (bannerCurrentStep >= 7) return;
            e.preventDefault();
            handleUserScroll(e.deltaY);
        }, { passive: false });

        var touchStartY = 0;
        window.addEventListener('touchstart', function(e) {
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        window.addEventListener('touchend', function(e) {
            var homeActive = document.getElementById('page-home').classList.contains('active');
            if (!homeActive) return;
            if (bannerCurrentStep >= 7) return;
            var dy = touchStartY - e.changedTouches[0].clientY;
            if (dy > 50) handleUserScroll(1);
            else if (dy < -50) handleUserScroll(-1);
        }, { passive: true });

        // 下雨
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
        createFixedFragments();

        // ★ 移动端（≤768px）：跳过动画，直接显示完整 Banner
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
            bannerState.autoFinished = true;
            return;
        }

        // 桌面端：正常走 7 阶段动画
        document.body.classList.add('banner-locked');

        bannerState.autoStartTimer = setTimeout(function() {
            bannerState.autoStartTimer = null;
            startAutoPlay();
        }, BANNER_CONFIG.autoStartDelay);
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
        renderHome();
        updateHeaderHeight();
    });

    window.addEventListener('resize', function() {
        updateHeaderHeight();
    });

})();
