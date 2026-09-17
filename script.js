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
            document.body.classList.toggle('banner-step6', bannerStep === 6);
        } else {
            document.body.classList.remove('banner-mode');
            document.body.classList.remove('banner-step6');
            document.body.classList.remove('scrolled');
            if (typeof releaseScrollLock === 'function') releaseScrollLock();
            stopIdleAnim();
            if (idleRestartTimer) {
                clearTimeout(idleRestartTimer);
                idleRestartTimer = null;
            }
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
    // 滚出首屏后 header 加实心背景
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
    // Banner 初始化
    // ============================================================
    var BANNER_IMG = 'images/0916.jpg';
    var FRAG_COLS = 6;
    var FRAG_ROWS = 4;
    var FRAG_TOTAL = FRAG_COLS * FRAG_ROWS;

    // ★ 初始状态约束
    var IDLE_MAX_ROTATION = 10;   // 倾斜角度 ±10°
    var IDLE_EDGE_MARGIN = 100;   // 距离屏幕边缘 100px

    var bannerNaturalW = 0;
    var bannerNaturalH = 0;
    var bannerImageLoaded = false;

    function loadBannerImageMeta(callback) {
        if (bannerImageLoaded) { callback(); return; }
        var img = new Image();
        img.onload = function() {
            bannerNaturalW = img.naturalWidth;
            bannerNaturalH = img.naturalHeight;
            bannerImageLoaded = true;
            callback();
        };
        img.onerror = function() { callback(); };
        img.src = BANNER_IMG;
    }

    var bannerStep = 0;
    var bannerScrollReleased = false;
    var bannerPieces = [];
    var bannerScatterTransform = [];
    var correctOrder = [];
    var scatterOrder = [];
    var scatterShownCount = 0;
    var correctedShownCount = 0;

    var idleTimer = null;
    var idleRestartTimer = null;

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

    // ★ 核心：计算某个碎片允许的 translateX / translateY 范围（px）
    // 约束：碎片最终边界（含 scale）必须在 [margin, screenW - margin] 内
    function calcScatterBounds(pieceLeft, pieceTop, pieceW, pieceH, scale) {
        var vw = window.innerWidth;
        var vh = window.innerHeight;
        var m = IDLE_EDGE_MARGIN;

        // 碎片当前中心（未加 translate 前）
        var centerX = pieceLeft + pieceW / 2;
        var centerY = pieceTop + pieceH / 2;

        // 缩放后的半宽 / 半高
        var halfW = pieceW * scale / 2;
        var halfH = pieceH * scale / 2;

        // 允许的最终中心坐标范围
        var minCenterX = m + halfW;
        var maxCenterX = vw - m - halfW;
        var minCenterY = m + halfH;
        var maxCenterY = vh - m - halfH;

        // translate = 允许中心 - 当前中心
        var minX = minCenterX - centerX;
        var maxX = maxCenterX - centerX;
        var minY = minCenterY - centerY;
        var maxY = maxCenterY - centerY;

        // 边界情况：如果 min > max（碎片太大），则返回中心 0
        if (minX > maxX) { minX = maxX = 0; }
        if (minY > maxY) { minY = maxY = 0; }

        return { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
    }

    function applyScatterVars(piece, t) {
        piece.style.setProperty('--tile-x', t.offsetX + 'px');
        piece.style.setProperty('--tile-y', t.offsetY + 'px');
        piece.style.setProperty('--tile-rotation', t.rotation + 'deg');
        piece.style.setProperty('--tile-scale', t.scale);
        piece.style.setProperty('--tile-blur', t.blur + 'px');
    }

    function buildBannerFragments() {
        var wrap = document.getElementById('bannerFragments');
        var bannerFull = document.getElementById('bannerFull');
        var finalImg = document.getElementById('bannerFinalImage');
        if (!wrap || !bannerFull) return;

        bannerFull.style.backgroundImage = 'url(' + BANNER_IMG + ')';
        if (finalImg) finalImg.style.backgroundImage = 'url(' + BANNER_IMG + ')';
        wrap.innerHTML = '';
        bannerPieces = [];
        bannerScatterTransform = [];

        var banner = document.getElementById('banner');
        var bannerRect = banner ? banner.getBoundingClientRect() : {
            width: window.innerWidth,
            height: window.innerHeight,
            left: 0,
            top: 0
        };
        var pieceW = bannerRect.width / FRAG_COLS;
        var pieceH = bannerRect.height / FRAG_ROWS;

        for (var row = 0; row < FRAG_ROWS; row++) {
            for (var col = 0; col < FRAG_COLS; col++) {
                var idx = row * FRAG_COLS + col;
                var piece = document.createElement('div');
                piece.className = 'banner-piece';

                piece.dataset.row = row;
                piece.dataset.column = col;
                piece.dataset.order = idx;

                piece.style.left = (col / FRAG_COLS * 100) + '%';
                piece.style.top = (row / FRAG_ROWS * 100) + '%';
                piece.style.width = 'calc(' + (100 / FRAG_COLS) + '% + 2px)';
                piece.style.height = 'calc(' + (100 / FRAG_ROWS) + '% + 2px)';
                piece.style.backgroundImage = 'url(' + BANNER_IMG + ')';

                // ★ 随机参数
                var sc = randRange(0.85, 1.0);
                var rot = randRange(-IDLE_MAX_ROTATION, IDLE_MAX_ROTATION);
                var blur = randRange(8, 18);

                // ★ 碎片在视口中的位置（未加 translate 前）
                var pieceLeft = bannerRect.left + col * pieceW;
                var pieceTop = bannerRect.top + row * pieceH;

                // ★ 用碎片自身位置算偏移范围
                var bounds = calcScatterBounds(pieceLeft, pieceTop, pieceW, pieceH, sc);

                var tx = randRange(bounds.minX, bounds.maxX);
                var ty = randRange(bounds.minY, bounds.maxY);

                var t = {
                    offsetX: tx,
                    offsetY: ty,
                    rotation: rot,
                    scale: sc,
                    blur: blur
                };

                piece.dataset.offsetX = t.offsetX.toFixed(3);
                piece.dataset.offsetY = t.offsetY.toFixed(3);
                piece.dataset.rotation = t.rotation.toFixed(3);
                piece.dataset.scale = t.scale.toFixed(3);
                piece.dataset.blur = t.blur.toFixed(3);

                applyScatterVars(piece, t);

                piece.style.transform =
                    'translate(' + t.offsetX + 'px, ' + t.offsetY + 'px) ' +
                    'rotate(' + t.rotation + 'deg) ' +
                    'scale(' + t.scale + ')';

                bannerScatterTransform[idx] =
                    'translate(' + t.offsetX + 'px, ' + t.offsetY + 'px) ' +
                    'rotate(' + t.rotation + 'deg) scale(' + t.scale + ')';

                wrap.appendChild(piece);
                bannerPieces[idx] = piece;
            }
        }

        correctOrder = shuffleArray(Array.from({ length: FRAG_TOTAL }, function(_, i) { return i; }));
        scatterOrder = shuffleArray(Array.from({ length: FRAG_TOTAL }, function(_, i) { return i; }));

        layoutFragmentBackgrounds();
        loadBannerImageMeta(layoutFragmentBackgrounds);
    }

    function layoutFragmentBackgrounds() {
        var banner = document.getElementById('banner');
        if (!banner || !bannerPieces.length) return;
        var rect = banner.getBoundingClientRect();
        var w = rect.width, h = rect.height;
        if (!w || !h) return;

        var renderedW, renderedH, offsetX, offsetY;
        if (bannerImageLoaded && bannerNaturalW && bannerNaturalH) {
            var coverScale = Math.max(w / bannerNaturalW, h / bannerNaturalH);
            renderedW = bannerNaturalW * coverScale;
            renderedH = bannerNaturalH * coverScale;
            offsetX = (w - renderedW) / 2;
            offsetY = (h - renderedH) / 2;
        } else {
            renderedW = w; renderedH = h; offsetX = 0; offsetY = 0;
        }

        var pieceW = w / FRAG_COLS;
        var pieceH = h / FRAG_ROWS;
        var sizeStr = renderedW + 'px ' + renderedH + 'px';
        for (var row = 0; row < FRAG_ROWS; row++) {
            for (var col = 0; col < FRAG_COLS; col++) {
                var piece = bannerPieces[row * FRAG_COLS + col];
                if (!piece) continue;
                var px = col * pieceW;
                var py = row * pieceH;
                piece.style.backgroundSize = sizeStr;
                piece.style.backgroundPosition = (offsetX - px) + 'px ' + (offsetY - py) + 'px';
            }
        }
    }

    // ★ resize 时重新计算偏移约束（保持不超屏）
    function recalcScatterTransforms() {
        var banner = document.getElementById('banner');
        if (!banner || !bannerPieces.length) return;
        var bannerRect = banner.getBoundingClientRect();
        var pieceW = bannerRect.width / FRAG_COLS;
        var pieceH = bannerRect.height / FRAG_ROWS;

        for (var row = 0; row < FRAG_ROWS; row++) {
            for (var col = 0; col < FRAG_COLS; col++) {
                var idx = row * FRAG_COLS + col;
                var piece = bannerPieces[idx];
                if (!piece) continue;

                var pieceLeft = bannerRect.left + col * pieceW;
                var pieceTop = bannerRect.top + row * pieceH;
                var sc = parseFloat(piece.dataset.scale) || 1;
                var bounds = calcScatterBounds(pieceLeft, pieceTop, pieceW, pieceH, sc);

                var curX = parseFloat(piece.dataset.offsetX) || 0;
                var curY = parseFloat(piece.dataset.offsetY) || 0;
                var newX = Math.max(bounds.minX, Math.min(bounds.maxX, curX));
                var newY = Math.max(bounds.minY, Math.min(bounds.maxY, curY));

                piece.dataset.offsetX = newX.toFixed(3);
                piece.dataset.offsetY = newY.toFixed(3);

                var rot = parseFloat(piece.dataset.rotation) || 0;
                if (!piece.classList.contains('is-corrected')) {
                    piece.style.transform =
                        'translate(' + newX + 'px, ' + newY + 'px) ' +
                        'rotate(' + rot + 'deg) ' +
                        'scale(' + sc + ')';
                }
            }
        }
    }

    function setPieceScattered(idx) {
        var piece = bannerPieces[idx];
        if (!piece || piece.classList.contains('is-corrected')) return;
        var x = parseFloat(piece.dataset.offsetX) || 0;
        var y = parseFloat(piece.dataset.offsetY) || 0;
        var rot = parseFloat(piece.dataset.rotation) || 0;
        var sc = parseFloat(piece.dataset.scale) || 1;
        piece.style.transform =
            'translate(' + x + 'px, ' + y + 'px) ' +
            'rotate(' + rot + 'deg) ' +
            'scale(' + sc + ')';
        piece.classList.add('is-visible', 'is-scattered');
    }

    function setPieceCorrected(idx) {
        var piece = bannerPieces[idx];
        if (!piece) return;
        piece.classList.remove('is-scattered');
        piece.classList.remove('is-idle-visible');

        if (!piece.classList.contains('is-visible')) {
            piece.style.transform = 'translate(0, 0) rotate(0deg) scale(0.92)';
            void piece.offsetWidth;
            requestAnimationFrame(function() {
                piece.classList.add('is-visible', 'is-corrected');
                piece.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
            });
        } else {
            piece.classList.add('is-visible', 'is-corrected');
            piece.style.transform = 'translate(0, 0) rotate(0deg) scale(1)';
        }
    }

    function uncorrectPiece(idx) {
        var piece = bannerPieces[idx];
        if (!piece) return;
        piece.classList.remove('is-corrected', 'is-visible');
        setPieceScattered(idx);
    }

    function clearLooseScatteredPieces() {
        for (var i = 0; i < FRAG_TOTAL; i++) {
            var piece = bannerPieces[i];
            if (!piece) continue;
            if (piece.classList.contains('is-corrected')) continue;
            if (piece.classList.contains('is-scattered')) {
                piece.classList.remove('is-visible', 'is-scattered');
            }
            piece.classList.remove('is-idle-visible');
        }
    }

    function showScattered(count) {
        for (var i = 0; i < count; i++) setPieceScattered(scatterOrder[i]);
    }
    function showCorrected(count) {
        for (var i = 0; i < count; i++) setPieceCorrected(correctOrder[i]);
    }

    // ============================================================
    // idle 动画
    // ============================================================
    function startIdleAnim() {
        stopIdleAnim();

        var idleCount = randInt(3, 5);
        var pool = shuffleArray(Array.from({ length: FRAG_TOTAL }, function(_, i) { return i; }));
        for (var i = 0; i < idleCount && i < pool.length; i++) {
            var piece = bannerPieces[pool[i]];
            if (piece) piece.classList.add('is-idle-visible');
        }

        idleTimer = setInterval(function() {
            var visible = [];
            for (var m = 0; m < FRAG_TOTAL; m++) {
                var q = bannerPieces[m];
                if (q && q.classList.contains('is-idle-visible')) {
                    visible.push(m);
                }
            }

            if (visible.length < 6) {
                var addCount = Math.min(6 - visible.length, randInt(1, 3));
                var hidden = [];
                for (var k = 0; k < FRAG_TOTAL; k++) {
                    var p = bannerPieces[k];
                    if (!p) continue;
                    if (!p.classList.contains('is-idle-visible')
                        && !p.classList.contains('is-corrected')
                        && !p.classList.contains('is-scattered')) {
                        hidden.push(k);
                    }
                }
                var addPool = shuffleArray(hidden);
                for (var a = 0; a < addCount && a < addPool.length; a++) {
                    bannerPieces[addPool[a]].classList.add('is-idle-visible');
                }
            }

            if (visible.length > 3) {
                var removeCount = Math.min(visible.length - 3, randInt(1, 2));
                var removePool = shuffleArray(visible);
                for (var r = 0; r < removeCount; r++) {
                    bannerPieces[removePool[r]].classList.remove('is-idle-visible');
                }
            }
        }, 500);
    }

    function stopIdleAnim() {
        if (idleTimer) {
            clearInterval(idleTimer);
            idleTimer = null;
        }
        for (var i = 0; i < bannerPieces.length; i++) {
            var p = bannerPieces[i];
            if (p) p.classList.remove('is-idle-visible');
        }
    }

    function resetBannerAnimation() {
        bannerStep = 0;
        bannerScrollReleased = false;
        scatterShownCount = 0;
        correctedShownCount = 0;
        stopIdleAnim();
        if (idleRestartTimer) {
            clearTimeout(idleRestartTimer);
            idleRestartTimer = null;
        }

        var frag = document.getElementById('bannerFragments');
        var finalImg = document.getElementById('bannerFinalImage');
        var overlay = document.getElementById('bannerOverlay');
        var bannerEl = document.getElementById('banner');
        if (frag) frag.classList.remove('zoom-out', 'zoom-full');
        if (finalImg) finalImg.classList.remove('show');
        stopRain();
        if (overlay) overlay.classList.remove('show');
        if (bannerEl) bannerEl.classList.remove('banner-revealed');
        document.body.classList.remove('banner-step6');

        engageScrollLock();
        buildBannerFragments();
        applyBannerStep(0);
    }

    function applyBannerStep(step) {
        var prevStep = bannerStep;
        var frag = document.getElementById('bannerFragments');
        var bannerEl = document.getElementById('banner');

        if (step >= 1) {
            stopIdleAnim();
        }
        if (idleRestartTimer) {
            clearTimeout(idleRestartTimer);
            idleRestartTimer = null;
        }

        if (step < 2 && correctedShownCount > 0) {
            for (var u = 0; u < correctedShownCount; u++) uncorrectPiece(correctOrder[u]);
            correctedShownCount = 0;
            if (bannerEl) bannerEl.classList.remove('banner-revealed');
        }

        if (prevStep === 6 && step < 6) {
            revertBannerFinale();
        }

        bannerStep = step;

        if (step === 0) {
            for (var ci = 0; ci < FRAG_TOTAL; ci++) {
                var pc = bannerPieces[ci];
                if (!pc) continue;
                pc.classList.remove('is-visible', 'is-scattered', 'is-corrected');
            }
            scatterShownCount = 0;
            idleRestartTimer = setTimeout(function() {
                idleRestartTimer = null;
                startIdleAnim();
            }, 2000);
        } else if (step === 1) {
            scatterShownCount = Math.min(FRAG_TOTAL, scatterShownCount + randInt(4, 9));
            showScattered(scatterShownCount);
        } else if (step >= 2 && step <= 5) {
            var newCount = (step - 1) * 6;
            if (newCount < correctedShownCount) {
                for (var d = newCount; d < correctedShownCount; d++) uncorrectPiece(correctOrder[d]);
            }
            correctedShownCount = newCount;
            showCorrected(correctedShownCount);
            clearLooseScatteredPieces();
            if (step === 5 && bannerEl) bannerEl.classList.add('banner-revealed');
        } else if (step === 6) {
            correctedShownCount = FRAG_TOTAL;
            showCorrected(FRAG_TOTAL);
            clearLooseScatteredPieces();
            if (bannerEl) bannerEl.classList.add('banner-revealed');
            triggerBannerFinale();
        }

        if (frag) {
            if (step >= 2 && step <= 5) {
                frag.classList.add('zoom-out');
                frag.classList.remove('zoom-full');
            } else if (step === 6) {
                frag.classList.remove('zoom-out');
                frag.classList.add('zoom-full');
            } else {
                frag.classList.remove('zoom-out', 'zoom-full');
            }
        }

        document.body.classList.toggle('banner-step6', step === 6);
    }

    var bannerFinaleTimers = [];
    var bannerTypewriterTimer = null;

    function clearBannerFinaleTimers() {
        for (var i = 0; i < bannerFinaleTimers.length; i++) clearTimeout(bannerFinaleTimers[i]);
        bannerFinaleTimers = [];
        if (bannerTypewriterTimer) {
            clearInterval(bannerTypewriterTimer);
            bannerTypewriterTimer = null;
        }
    }

    function triggerBannerFinale() {
        var overlay = document.getElementById('bannerOverlay');
        var finalImg = document.getElementById('bannerFinalImage');

        bannerFinaleTimers.push(setTimeout(function() {
            if (finalImg) finalImg.classList.add('show');
            startRain();
        }, 500));

        bannerFinaleTimers.push(setTimeout(function() {
            if (overlay) overlay.classList.add('show');
            startTypewriter();
        }, 1600));
    }

    function revertBannerFinale() {
        clearBannerFinaleTimers();
        var overlay = document.getElementById('bannerOverlay');
        var finalImg = document.getElementById('bannerFinalImage');
        var textEl = document.getElementById('bannerText');
        if (finalImg) finalImg.classList.remove('show');
        stopRain();
        if (overlay) overlay.classList.remove('show');
        if (textEl) textEl.innerHTML = '<span class="cursor"></span>';
    }

    // ============================================================
    // Canvas 下雨
    // ============================================================
    var rainCanvas = null;
    var rainCtx = null;
    var rainParticles = [];
    var rainSplashes = [];
    var rainAnimId = null;
    var rainRunning = false;

    function ensureRainCanvas() {
        if (rainCanvas) return;
        rainCanvas = document.getElementById('bannerRainCanvas');
        if (!rainCanvas) return;
        rainCtx = rainCanvas.getContext('2d');
        window.addEventListener('resize', resizeRainCanvas);
    }

    function resizeRainCanvas() {
        if (!rainCanvas) return;
        var banner = document.getElementById('banner');
        if (!banner) return;
        var rect = banner.getBoundingClientRect();
        var dpr = window.devicePixelRatio || 1;
        rainCanvas.width = Math.max(1, Math.round(rect.width * dpr));
        rainCanvas.height = Math.max(1, Math.round(rect.height * dpr));
        rainCanvas.style.width = rect.width + 'px';
        rainCanvas.style.height = rect.height + 'px';
        if (rainCtx) rainCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
        seedRainParticles(rect.width, rect.height);
    }

    function makeRainParticle(w, h, randomY) {
        return {
            x: Math.random() * (w + 260) - 130,
            y: randomY ? Math.random() * h : -30 - Math.random() * 60,
            len: 34 + Math.random() * 48,
            speed: 4 + Math.random() * 4.5,
            drift: -(1.4 + Math.random() * 2.2),
            opacity: 0.2 + Math.random() * 0.45,
            splashed: false
        };
    }

    function seedRainParticles(w, h) {
        var count = 42;
        rainParticles = [];
        rainSplashes = [];
        for (var i = 0; i < count; i++) {
            rainParticles.push(makeRainParticle(w, h, true));
        }
    }

    function spawnRainSplash(x, y) {
        var count = 5 + Math.floor(Math.random() * 4);
        for (var i = 0; i < count; i++) {
            var angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.5;
            var speed = 1 + Math.random() * 2.2;
            rainSplashes.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                r: 0.8 + Math.random() * 1.3,
                life: 1
            });
        }
    }

    function stepRain() {
        if (!rainRunning || !rainCtx || !rainCanvas) return;
        var dpr = window.devicePixelRatio || 1;
        var w = rainCanvas.width / dpr;
        var h = rainCanvas.height / dpr;
        rainCtx.clearRect(0, 0, w, h);
        rainCtx.lineCap = 'round';
        rainCtx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
        for (var i = 0; i < rainParticles.length; i++) {
            var p = rainParticles[i];
            rainCtx.globalAlpha = p.opacity;
            rainCtx.lineWidth = 3.5;
            rainCtx.beginPath();
            rainCtx.moveTo(p.x, p.y);
            rainCtx.lineTo(p.x + p.drift * 1.8, p.y + p.len);
            rainCtx.stroke();
            p.x += p.drift;
            p.y += p.speed;

            if (!p.splashed && p.y >= h - 4) {
                spawnRainSplash(p.x, h - 2);
                p.splashed = true;
            }
            if (p.y > h + 30 || p.x < -150) {
                var np = makeRainParticle(w, h, false);
                p.x = np.x; p.y = np.y; p.len = np.len;
                p.speed = np.speed; p.drift = np.drift; p.opacity = np.opacity;
                p.splashed = false;
            }
        }

        rainCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        for (var s = rainSplashes.length - 1; s >= 0; s--) {
            var sp = rainSplashes[s];
            sp.vy += 0.16;
            sp.x += sp.vx;
            sp.y += sp.vy;
            sp.life -= 0.045;
            if (sp.life <= 0) {
                rainSplashes.splice(s, 1);
                continue;
            }
            rainCtx.globalAlpha = Math.max(sp.life, 0) * 0.85;
            rainCtx.beginPath();
            rainCtx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
            rainCtx.fill();
        }

        rainCtx.globalAlpha = 1;
        rainAnimId = requestAnimationFrame(stepRain);
    }

    function startRain() {
        ensureRainCanvas();
        if (!rainCanvas) return;
        resizeRainCanvas();
        rainRunning = true;
        var wrap = document.getElementById('bannerRainWrap');
        if (wrap) wrap.classList.add('rain-active');
        if (!rainAnimId) rainAnimId = requestAnimationFrame(stepRain);
    }

    function stopRain() {
        rainRunning = false;
        if (rainAnimId) {
            cancelAnimationFrame(rainAnimId);
            rainAnimId = null;
        }
        rainSplashes = [];
        var wrap = document.getElementById('bannerRainWrap');
        if (wrap) wrap.classList.remove('rain-active');
        if (rainCtx && rainCanvas) {
            var dpr = window.devicePixelRatio || 1;
            rainCtx.clearRect(0, 0, rainCanvas.width / dpr, rainCanvas.height / dpr);
        }
    }

    // ============================================================
    // 滚动锁
    // ============================================================
    function engageScrollLock() {
        document.documentElement.classList.add('banner-scroll-lock');
        document.body.classList.add('banner-scroll-lock');
    }
    function releaseScrollLock() {
        bannerScrollReleased = true;
        document.documentElement.classList.remove('banner-scroll-lock');
        document.body.classList.remove('banner-scroll-lock');
    }

    // ============================================================
    // 滚轮控制
    // ============================================================
    var bannerWheelAccum = 0;
    var bannerWheelCooldown = false;
    var BANNER_WHEEL_THRESHOLD = 55;
    var BANNER_STEP_COOLDOWN = 800;

    function isHomeActive() {
        var home = document.getElementById('page-home');
        return home && home.classList.contains('active');
    }

    function stepBanner(direction) {
        if (bannerStep === 6 && direction === 1) {
            releaseScrollLock();
            return;
        }
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
        if (bannerScrollReleased) return;
        if (!isHomeActive()) return;

        e.preventDefault();
        if (bannerWheelCooldown) return;

        stopIdleAnim();
        if (idleRestartTimer) {
            clearTimeout(idleRestartTimer);
            idleRestartTimer = null;
        }

        bannerWheelAccum += e.deltaY;
        if (Math.abs(bannerWheelAccum) >= BANNER_WHEEL_THRESHOLD) {
            var dir = bannerWheelAccum > 0 ? 1 : -1;
            bannerWheelAccum = 0;
            stepBanner(dir);
        }
    }

    var bannerTouchStartY = null;
    function onBannerTouchStart(e) {
        if (bannerScrollReleased || !isHomeActive()) return;
        bannerTouchStartY = e.touches[0].clientY;
    }
    function onBannerTouchMove(e) {
        if (bannerScrollReleased || !isHomeActive() || bannerTouchStartY === null) return;
        e.preventDefault();
        if (bannerWheelCooldown) return;
        stopIdleAnim();
        if (idleRestartTimer) {
            clearTimeout(idleRestartTimer);
            idleRestartTimer = null;
        }
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

        bannerTypewriterTimer = setInterval(function() {
            if (index < text.length) {
                el.innerHTML = text.substring(0, index + 1) + '<span class="cursor"></span>';
                index++;
            } else {
                clearInterval(bannerTypewriterTimer);
                bannerTypewriterTimer = null;
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
        layoutFragmentBackgrounds();
        // ★ resize 时重算散落偏移（保持边缘 100px 限制）
        recalcScatterTransforms();
    });

})();
