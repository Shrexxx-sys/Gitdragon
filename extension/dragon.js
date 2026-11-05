// THE DRAGON: the mascot in the corner of the page.
//   idle  = mouth closed, looping (dragon-idle video)
//   fire  = breathing fire (dragon-fire video), shown on hover and when clicked
// Both videos are preloaded and stacked; switching is a quick cross-fade, so there's no flash.
// Videos: extension/mascot/dragon-idle.(webm|mp4) and dragon-fire.(webm|mp4).
//   A .webm next to the .mp4 is preferred automatically. If a WebM is used we assume it has a
//   transparent background and drop the frame (data-alpha) -> swap files, no code changes.
// Loaded as a content script (sets globalThis.GitAutopsyDragon) and by Node tests.
(function () {
  const FIRE_BEFORE_OPEN_MS = 900; // how long the dragon breathes fire before the box opens
  const DRAG_THRESHOLD_PX = 6;
  const CORNERS = ['br', 'bl', 'tr', 'tl'];

  // The frame look lives in ONE place: these CSS variables (edit them, or set --mascot-frame to none).
  const DRAGON_CSS = `
    .dock {
      --mascot-size: 112px;
      --mascot-frame-radius: 50%;
      --mascot-frame-ring: 3px solid rgba(255, 255, 255, 0.85);
      --mascot-frame-shadow: 0 6px 22px rgba(0, 0, 0, 0.35);
      --mascot-frame-bg: #ffffff; /* matches the current videos' white background */
      --mascot-fit: contain;      /* contain = whole flame visible; cover = fills the circle */
      position: fixed; z-index: 2147483000; width: var(--mascot-size); height: var(--mascot-size);
      user-select: none; -webkit-user-select: none; touch-action: none;
    }
    .dock[data-corner="br"] { right: 20px; bottom: 20px; }
    .dock[data-corner="bl"] { left: 20px; bottom: 20px; }
    .dock[data-corner="tr"] { right: 20px; top: 76px; }
    .dock[data-corner="tl"] { left: 20px; top: 76px; }
    .dock[data-dragging="true"] { transition: none; cursor: grabbing; }
    .dock[hidden] { display: none; }
    .frame {
      position: relative; width: 100%; height: 100%; overflow: hidden; cursor: pointer;
      border-radius: var(--mascot-frame-radius); border: var(--mascot-frame-ring);
      box-shadow: var(--mascot-frame-shadow); background: var(--mascot-frame-bg);
      transition: transform .15s ease;
    }
    .frame:hover { transform: scale(1.05); }
    .frame:focus-visible { outline: 3px solid var(--link, #0969da); outline-offset: 3px; }
    /* Transparent (WebM alpha) videos: no frame at all. */
    .dock[data-alpha="true"] .frame { border: none; box-shadow: none; background: transparent; border-radius: 0; overflow: visible; }
    .frame video {
      position: absolute; inset: 0; width: 100%; height: 100%; object-fit: var(--mascot-fit); pointer-events: none;
      transition: opacity .14s linear;
    }
    .dock[data-alpha="true"] .frame video { object-fit: contain; }
    .frame video.fire { opacity: 0; }
    .dock[data-state="fire"] .frame video.fire { opacity: 1; }
    .mini {
      position: absolute; top: -6px; left: -6px; width: 24px; height: 24px; border-radius: 50%;
      border: 1px solid rgba(0,0,0,.2); background: #fff; color: #333; font: 700 14px/20px sans-serif;
      cursor: pointer; opacity: 0; transition: opacity .15s; padding: 0;
    }
    .dock:hover .mini, .mini:focus-visible { opacity: 1; }
    .restore {
      position: fixed; z-index: 2147483000; border: none; border-radius: 14px; padding: 6px 12px;
      background: #24292f; color: #fff; font: 600 12px -apple-system, "Segoe UI", sans-serif; cursor: pointer;
      box-shadow: 0 2px 10px rgba(0,0,0,.3);
    }
    .restore[hidden] { display: none; }
    .restore[data-corner="br"] { right: 20px; bottom: 20px; }
    .restore[data-corner="bl"] { left: 20px; bottom: 20px; }
    .restore[data-corner="tr"] { right: 20px; top: 76px; }
    .restore[data-corner="tl"] { left: 20px; top: 76px; }
  `;

  function makeVideo(cls, base, getUrl, autoplay) {
    const v = document.createElement('video');
    v.className = cls;
    v.muted = true;
    v.defaultMuted = true;
    v.loop = true;
    v.playsInline = true;
    v.preload = 'auto';
    v.setAttribute('muted', '');
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    if (autoplay) v.setAttribute('autoplay', '');
    // WebM first (transparent version, if you add one), then MP4.
    for (const [ext, type] of [['webm', 'video/webm'], ['mp4', 'video/mp4']]) {
      const s = document.createElement('source');
      s.src = getUrl(`mascot/${base}.${ext}`);
      s.type = type;
      v.appendChild(s);
    }
    return v;
  }

  function safePlay(v) {
    try {
      const p = v.play();
      return p && typeof p.then === 'function' ? p.catch(() => {}) : Promise.resolve();
    } catch {
      return Promise.resolve();
    }
  }

  function safePause(v) {
    try {
      v.pause();
    } catch {
      /* ignore */
    }
  }

  /**
   * @param opts.root           element (inside the shadow root) to append to
   * @param opts.getUrl         file path -> URL (chrome.runtime.getURL)
   * @param opts.reducedMotion  true = show still frames, never play video
   * @param opts.corner         'br' | 'bl' | 'tr' | 'tl'
   * @param opts.onClick        called when the dragon is clicked (not dragged)
   * @param opts.onCornerChange called with the new corner after a drag
   * @param opts.onMinimize     called when minimized / restored (true / false)
   */
  function createDragon(opts) {
    const getUrl = opts.getUrl;
    const reduced = Boolean(opts.reducedMotion);
    const dock = document.createElement('div');
    dock.className = 'dock';
    dock.dataset.state = 'idle';
    dock.dataset.corner = CORNERS.includes(opts.corner) ? opts.corner : 'br';
    if (reduced) dock.dataset.reducedMotion = 'true';

    const frame = document.createElement('div');
    frame.className = 'frame';
    frame.setAttribute('role', 'button');
    frame.setAttribute('tabindex', '0');
    frame.setAttribute('aria-label', 'Git Autopsy dragon: click to open the analysis');
    frame.title = 'Git Autopsy: click me (drag to move)';

    const idle = makeVideo('idle', 'dragon-idle', getUrl, !reduced);
    const fire = makeVideo('fire', 'dragon-fire', getUrl, false);
    frame.appendChild(idle);
    frame.appendChild(fire);

    // If the browser picked a WebM, treat it as transparent and drop the frame.
    const checkAlpha = () => {
      if (/\.webm(\?|$)/i.test(idle.currentSrc || '')) dock.dataset.alpha = 'true';
    };
    idle.addEventListener('loadeddata', checkAlpha);

    // Reduced motion: show the first frame as a still image.
    if (reduced) {
      const still = () => {
        safePause(idle);
        try {
          idle.currentTime = 0.05;
        } catch {
          /* not loaded yet */
        }
      };
      idle.addEventListener('loadeddata', still);
      still();
    } else {
      safePlay(idle);
    }

    const mini = document.createElement('button');
    mini.className = 'mini';
    mini.type = 'button';
    mini.title = 'Minimize for this session';
    mini.setAttribute('aria-label', 'Minimize the dragon for this session');
    mini.textContent = '–';

    dock.appendChild(frame);
    dock.appendChild(mini);

    const restore = document.createElement('button');
    restore.className = 'restore';
    restore.type = 'button';
    restore.hidden = true;
    restore.textContent = 'Git Autopsy';
    restore.title = 'Bring the dragon back';

    opts.root.appendChild(dock);
    opts.root.appendChild(restore);

    // ---------- states ----------
    let hovering = false;
    let breathing = false;
    let fireTimer = null;

    function setState(state) {
      if (reduced) state = 'idle'; // no animation at all
      if (dock.dataset.state === state) return;
      if (state === 'fire') {
        clearTimeout(fireTimer);
        try {
          fire.currentTime = 0;
        } catch {
          /* not loaded yet */
        }
        // The fire video is preloaded and rewound to frame 0, so fading it in can't show a stale frame.
        safePlay(fire);
        dock.dataset.state = 'fire';
      } else {
        dock.dataset.state = 'idle';
        // pause the fire video after the cross-fade finished
        fireTimer = setTimeout(() => {
          if (dock.dataset.state === 'idle') safePause(fire);
        }, 200);
      }
    }

    /** Breathe fire, then resolve (the box opens after this). Instant with reduced motion. */
    function breatheFire() {
      if (reduced) return Promise.resolve();
      breathing = true;
      setState('fire');
      return new Promise((resolve) =>
        setTimeout(() => {
          breathing = false;
          if (!hovering) setState('idle');
          resolve();
        }, FIRE_BEFORE_OPEN_MS)
      );
    }

    frame.addEventListener('pointerenter', () => {
      hovering = true;
      if (dock.dataset.dragging !== 'true') setState('fire');
    });
    frame.addEventListener('pointerleave', () => {
      hovering = false;
      if (!breathing) setState('idle');
    });

    // ---------- click vs drag ----------
    let down = null;
    frame.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      const r = dock.getBoundingClientRect();
      down = { x: e.clientX, y: e.clientY, offX: e.clientX - r.left, offY: e.clientY - r.top, moved: false };
      try {
        frame.setPointerCapture(e.pointerId);
      } catch {
        /* not supported (tests) */
      }
    });
    frame.addEventListener('pointermove', (e) => {
      if (!down) return;
      if (!down.moved && Math.hypot(e.clientX - down.x, e.clientY - down.y) < DRAG_THRESHOLD_PX) return;
      down.moved = true;
      dock.dataset.dragging = 'true';
      setState('idle');
      dock.style.left = `${e.clientX - down.offX}px`;
      dock.style.top = `${e.clientY - down.offY}px`;
      dock.style.right = 'auto';
      dock.style.bottom = 'auto';
    });
    frame.addEventListener('pointerup', (e) => {
      if (!down) return;
      const wasDrag = down.moved;
      down = null;
      if (wasDrag) {
        const w = window.innerWidth || 1024;
        const h = window.innerHeight || 768;
        const corner = (e.clientY < h / 2 ? 't' : 'b') + (e.clientX < w / 2 ? 'l' : 'r');
        dock.removeAttribute('style');
        dock.dataset.dragging = 'false';
        setCorner(corner);
        if (opts.onCornerChange) opts.onCornerChange(corner);
      } else if (opts.onClick) {
        opts.onClick();
      }
    });
    frame.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (opts.onClick) opts.onClick();
      }
    });

    function setCorner(corner) {
      if (!CORNERS.includes(corner)) return;
      dock.dataset.corner = corner;
      restore.dataset.corner = corner;
    }
    setCorner(dock.dataset.corner);

    // ---------- minimize for the session ----------
    function minimize() {
      dock.hidden = true;
      restore.hidden = false;
      safePause(idle);
      safePause(fire);
      if (opts.onMinimize) opts.onMinimize(true);
    }
    function unminimize() {
      dock.hidden = false;
      restore.hidden = true;
      if (!reduced) safePlay(idle);
      if (opts.onMinimize) opts.onMinimize(false);
    }
    mini.addEventListener('click', (e) => {
      e.stopPropagation();
      minimize();
    });
    restore.addEventListener('click', unminimize);

    return {
      el: dock,
      frame,
      videos: { idle, fire },
      setState,
      breatheFire,
      setCorner,
      minimize,
      restore: unminimize,
      isMinimized: () => dock.hidden,
      getState: () => dock.dataset.state,
      getCorner: () => dock.dataset.corner,
    };
  }

  const api = { createDragon, DRAGON_CSS, FIRE_BEFORE_OPEN_MS, CORNERS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else globalThis.GitAutopsyDragon = api;
})();
