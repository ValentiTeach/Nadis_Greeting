(() => {
  const book = document.getElementById('book');
  const spread = document.getElementById('spread');
  const leaves = [...spread.querySelectorAll('.leaf')];
  const prevBtn = document.getElementById('prev');
  const nextBtn = document.getElementById('next');
  const dotsEl = document.getElementById('dots');
  const restartBtn = document.getElementById('restart');

  const n = leaves.length;
  const narrow = window.matchMedia('(max-width: 759px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Десктоп: стан = кількість перегорнутих аркушів (0…n), видно розворот.
  // Телефон: стан = номер видимої сторінки (0…2n-1), видно одну сторінку.
  let mobile = narrow.matches;
  let state = 0;
  let opened = false;
  let shown = [];
  let peekTimer;

  const lastState = () => (mobile ? 2 * n - 1 : n);
  const flippedCount = () => (mobile ? Math.floor((state + 1) / 2) : state);
  const flipMs = () => (reduced.matches ? 350 : 1100);

  function shift() {
    if (mobile) return state % 2 ? '0%' : '-50%';
    if (state === 0) return '-25%';
    if (state === n) return '25%';
    return '0%';
  }

  function visibleFaces() {
    const k = flippedCount();
    const faces = [];
    if (mobile) {
      faces.push(state % 2 ? leaves[k - 1].querySelector('.face--back') : leaves[k].querySelector('.face--front'));
    } else {
      if (k > 0) faces.push(leaves[k - 1].querySelector('.face--back'));
      if (k < n) faces.push(leaves[k].querySelector('.face--front'));
    }
    return faces;
  }

  function render() {
    const k = flippedCount();

    leaves.forEach((leaf, i) => {
      const shouldFlip = i < k;
      const wasFlipped = leaf.classList.contains('flipped');

      if (shouldFlip !== wasFlipped) {
        // Аркуш, що перегортається, — над усіма іншими до кінця анімації.
        leaf.classList.add('turning');
        leaf.style.zIndex = 100 + (shouldFlip ? i : n - i);
        clearTimeout(leaf._t);
        leaf._t = setTimeout(() => {
          leaf.classList.remove('turning');
          leaf.style.zIndex = leaf.classList.contains('flipped') ? i + 1 : n - i;
        }, flipMs());
      } else if (!leaf.classList.contains('turning')) {
        leaf.style.zIndex = shouldFlip ? i + 1 : n - i;
      }

      leaf.classList.toggle('flipped', shouldFlip);
      leaf.classList.toggle('is-next', !shouldFlip && i === k);
      leaf.classList.toggle('is-prev', shouldFlip && i === k - 1 && !mobile);
    });

    spread.style.setProperty('--shift', shift());

    // На телефоні сусідні сторінки ховаються, але лишаються видимими,
    // доки йде перегортання чи зсув — щоб під аркушем не було порожнечі.
    const visible = visibleFaces();
    const spreadPages = [leaves[k - 1]?.querySelector('.face--back'), leaves[k]?.querySelector('.face--front')];
    const peek = new Set([...shown, ...spreadPages].filter((f) => f && !visible.includes(f)));
    clearTimeout(peekTimer);
    spread.querySelectorAll('.face').forEach((face) => {
      face.setAttribute('aria-hidden', visible.includes(face) ? 'false' : 'true');
      face.classList.toggle('peek', peek.has(face));
    });
    peekTimer = setTimeout(() => {
      peek.forEach((face) => face.classList.remove('peek'));
    }, flipMs());
    shown = visible;
    restartBtn.tabIndex = visible.includes(restartBtn.closest('.face')) ? 0 : -1;

    prevBtn.disabled = state === 0;
    nextBtn.disabled = state === lastState();
    renderDots();
  }

  function renderDots() {
    const total = lastState() + 1;
    if (dotsEl.children.length !== total) {
      dotsEl.innerHTML = '';
      for (let i = 0; i < total; i++) dotsEl.appendChild(document.createElement('span'));
    }
    [...dotsEl.children].forEach((d, i) => d.classList.toggle('active', i === state));
  }

  function go(to) {
    const target = Math.max(0, Math.min(lastState(), to));
    if (target === state) return;
    state = target;
    render();
    if (!opened && state > 0) {
      opened = true;
      burst();
    }
  }

  const next = () => go(state + 1);
  const prev = () => go(state - 1);

  // ---------- події ----------

  nextBtn.addEventListener('click', next);
  prevBtn.addEventListener('click', prev);
  restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    go(0);
  });

  let swiped = false;
  spread.addEventListener('click', (e) => {
    if (swiped) { swiped = false; return; }
    const face = e.target.closest('.face');
    if (!face) return;
    if (mobile) {
      if (state === lastState()) return;
      next();
    } else if (face.classList.contains('face--back')) {
      prev();
    } else {
      next();
    }
  });

  let startX = 0;
  let startY = 0;
  spread.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }, { passive: true });
  spread.addEventListener('touchend', (e) => {
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      swiped = true;
      setTimeout(() => { swiped = false; }, 400);
      dx < 0 ? next() : prev();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === 'PageDown') next();
    else if (e.key === 'ArrowLeft' || e.key === 'PageUp') prev();
    else if (e.key === 'Home') go(0);
    else if (e.key === 'End') go(lastState());
  });

  narrow.addEventListener('change', () => {
    const k = flippedCount();
    mobile = narrow.matches;
    if (mobile) state = k === 0 ? 0 : k === n ? 2 * n - 1 : 2 * k - 1;
    else state = k;
    render();
  });

  // ---------- декор ----------

  function sparkles() {
    const holder = document.querySelector('.sparkles');
    for (let i = 0; i < 28; i++) {
      const s = document.createElement('span');
      const size = 1 + Math.random() * 2.2;
      s.style.width = s.style.height = `${size}px`;
      s.style.left = `${Math.random() * 100}%`;
      s.style.top = `${Math.random() * 100}%`;
      s.style.animationDelay = `${-Math.random() * 5}s`;
      s.style.animationDuration = `${4 + Math.random() * 4}s`;
      holder.appendChild(s);
    }
  }

  function burst() {
    if (reduced.matches) return;
    const r = book.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.45;
    const colors = ['#cdc6f5', '#9fb0ee', '#b9a9ff', '#e9e6fb', '#7c8fe0'];
    for (let i = 0; i < 22; i++) {
      const p = document.createElement('span');
      p.className = 'burst';
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
      const dist = 120 + Math.random() * 200;
      const size = 3 + Math.random() * 5;
      p.style.left = `${cx + (Math.random() - 0.5) * 60}px`;
      p.style.top = `${cy}px`;
      p.style.width = p.style.height = `${size}px`;
      p.style.background = colors[i % colors.length];
      p.style.boxShadow = `0 0 10px ${colors[i % colors.length]}`;
      p.style.setProperty('--dx', `${Math.cos(angle) * dist}px`);
      p.style.setProperty('--dy', `${Math.sin(angle) * dist}px`);
      p.style.animationDelay = `${Math.random() * 0.35}s`;
      document.body.appendChild(p);
      setTimeout(() => p.remove(), 2400);
    }
  }

  sparkles();
  render();
})();
