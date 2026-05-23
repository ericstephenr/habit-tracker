// Lightweight confetti — canvas-free, just DOM nodes with physics.
// Ported from design_handoff_habit_tracker_polish/reference/confetti.jsx.

export type Palette = string[];

export function fireConfetti(originX: number, originY: number, palette: Palette): void {
  const layer = document.getElementById('confetti-layer');
  if (!layer) return;
  const count = 60;
  const pieces: Array<{
    el: HTMLDivElement;
    x: number;
    y: number;
    vx: number;
    vy: number;
    rot: number;
    vr: number;
    life: number;
  }> = [];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    const size = 6 + Math.random() * 8;
    const color = palette[Math.floor(Math.random() * palette.length)];
    const shape = Math.random();
    Object.assign(el.style, {
      position: 'absolute',
      left: originX + 'px',
      top: originY + 'px',
      width: size + 'px',
      height: (shape < 0.4 ? size * 0.45 : size) + 'px',
      background: color,
      borderRadius: shape < 0.7 ? '2px' : '50%',
      pointerEvents: 'none',
      willChange: 'transform, opacity',
      zIndex: '9999'
    });
    layer.appendChild(el);
    const angle = Math.random() * Math.PI - Math.PI / 2; // upward-ish
    const speed = 4 + Math.random() * 7;
    pieces.push({
      el,
      x: 0,
      y: 0,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 2,
      vy: Math.sin(angle) * speed - 2 - Math.random() * 3,
      rot: Math.random() * 360,
      vr: (Math.random() - 0.5) * 20,
      life: 0
    });
  }
  function step() {
    let alive = false;
    for (const p of pieces) {
      p.life += 16;
      if (p.life > 1400) {
        p.el.remove();
        continue;
      }
      alive = true;
      p.vy += 0.35; // gravity
      p.vx *= 0.99;
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      const opacity = Math.max(0, 1 - p.life / 1400);
      p.el.style.transform = `translate(${p.x}px, ${p.y}px) rotate(${p.rot}deg)`;
      p.el.style.opacity = String(opacity);
    }
    if (alive) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

export function accentPalette(): Palette {
  const cs = getComputedStyle(document.documentElement);
  const v = (name: string) => cs.getPropertyValue(name).trim();
  const colors = [v('--accent'), v('--accent-deep'), v('--accent-soft'), v('--accent-fill')].filter(
    Boolean
  );
  return colors.length > 0 ? colors : ['#a855f7', '#7c3aed', '#ddd6fe'];
}

export function fireDayCompleteBursts(): void {
  const layer = document.getElementById('confetti-layer');
  if (!layer) return;
  const rect = layer.getBoundingClientRect();
  const palette = accentPalette();
  const y = rect.height * 0.3;
  const xs = [rect.width * 0.25, rect.width * 0.5, rect.width * 0.75];
  const delays = [0, 120, 240];
  xs.forEach((x, i) => {
    window.setTimeout(() => fireConfetti(x, y, palette), delays[i]);
  });
}
