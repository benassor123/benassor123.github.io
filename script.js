const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- starfield ----

const canvas = document.getElementById('stars');
const ctx = canvas.getContext('2d');

// three depths: far stars are small, dim and slow, near ones bigger and faster
const layerSpecs = [
  { depth: 0.25, density: 1 / 9000,  size: [0.5, 1.0], alpha: [0.20, 0.45], drift: 2.5 },
  { depth: 0.55, density: 1 / 16000, size: [0.8, 1.6], alpha: [0.35, 0.70], drift: 6 },
  { depth: 1.00, density: 1 / 34000, size: [1.2, 2.3], alpha: [0.55, 0.95], drift: 12 }
];

let layers = [];
let width = 0;
let height = 0;
let elapsed = 0;
let lastFrame = 0;
let frameId = null;

// smoothed cursor position, -1..1 on both axes
let px = 0, py = 0;
let targetPx = 0, targetPy = 0;

let meteor = null;
let meteorCountdown = 4 + Math.random() * 8;

const rand = (min, max) => min + Math.random() * (max - min);

function buildStars() {
  layers = layerSpecs.map(spec => {
    const count = Math.max(12, Math.round(width * height * spec.density));
    const stars = [];

    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: rand(spec.size[0], spec.size[1]),
        alpha: rand(spec.alpha[0], spec.alpha[1]),
        twinkleSpeed: rand(0.4, 1.5),
        twinklePhase: Math.random() * Math.PI * 2,
        warm: Math.random() < 0.14
      });
    }

    return { spec, stars };
  });
}

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = window.innerWidth;
  height = window.innerHeight;

  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  buildStars();
  draw();
}

function draw() {
  ctx.clearRect(0, 0, width, height);

  px += (targetPx - px) * 0.045;
  py += (targetPy - py) * 0.045;

  for (const { spec, stars } of layers) {
    const offsetX = -px * 26 * spec.depth;
    const offsetY = -py * 18 * spec.depth;

    for (const star of stars) {
      // drift up and to the left, wrapping round the edges
      let x = (star.x - elapsed * spec.drift) % width;
      let y = (star.y - elapsed * spec.drift * 0.35) % height;
      if (x < 0) x += width;
      if (y < 0) y += height;

      const twinkle = 0.72 + Math.sin(elapsed * star.twinkleSpeed + star.twinklePhase) * 0.28;
      const alpha = star.alpha * twinkle;

      ctx.fillStyle = star.warm
        ? `rgba(255, 205, 150, ${alpha})`
        : `rgba(214, 228, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x + offsetX, y + offsetY, star.r, 0, Math.PI * 2);
      ctx.fill();

      // halo on the biggest near stars only, it gets noisy otherwise
      if (spec.depth === 1 && star.r > 1.9) {
        ctx.fillStyle = `rgba(180, 210, 255, ${alpha * 0.13})`;
        ctx.beginPath();
        ctx.arc(x + offsetX, y + offsetY, star.r * 3.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  if (meteor) drawMeteor();
}

function drawMeteor() {
  const dx = -meteor.length * 0.86;
  const dy = meteor.length * 0.5;

  const trail = ctx.createLinearGradient(meteor.x, meteor.y, meteor.x + dx, meteor.y + dy);
  trail.addColorStop(0, `rgba(235, 244, 255, ${0.85 * meteor.life})`);
  trail.addColorStop(1, 'rgba(235, 244, 255, 0)');

  ctx.strokeStyle = trail;
  ctx.lineWidth = 1.6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(meteor.x, meteor.y);
  ctx.lineTo(meteor.x + dx, meteor.y + dy);
  ctx.stroke();
}

function update(dt) {
  elapsed += dt;

  if (meteor) {
    meteor.x -= meteor.speed * 0.86;
    meteor.y += meteor.speed * 0.5;
    meteor.life -= dt * 0.85;

    if (meteor.life <= 0 || meteor.x < -220 || meteor.y > height + 220) {
      meteor = null;
      meteorCountdown = 5 + Math.random() * 11;
    }
    return;
  }

  meteorCountdown -= dt;
  if (meteorCountdown <= 0) {
    meteor = {
      x: rand(width * 0.35, width * 1.05),
      y: rand(-40, height * 0.42),
      length: rand(90, 190),
      speed: rand(7.5, 12),
      life: 1
    };
  }
}

function tick(now) {
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.05) : 0.016;
  lastFrame = now;
  update(dt);
  draw();
  frameId = requestAnimationFrame(tick);
}

function startAnimation() {
  if (frameId || prefersReducedMotion) return;
  lastFrame = 0;
  frameId = requestAnimationFrame(tick);
}

function stopAnimation() {
  if (!frameId) return;
  cancelAnimationFrame(frameId);
  frameId = null;
}

window.addEventListener('pointermove', e => {
  targetPx = (e.clientX / window.innerWidth) * 2 - 1;
  targetPy = (e.clientY / window.innerHeight) * 2 - 1;
}, { passive: true });

window.addEventListener('resize', resize);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopAnimation();
  else startAnimation();
});

resize();

if (prefersReducedMotion) {
  elapsed = 3;
  draw();
} else {
  startAnimation();
}


// ---- photo ----
// the img 404s until me.jpg exists, so hide it and leave the placeholder showing

const photoBox = document.getElementById('photo');
const photoImg = document.getElementById('photoImg');

photoImg.addEventListener('load', () => photoBox.classList.add('has-image'));
photoImg.addEventListener('error', () => { photoImg.style.display = 'none'; });

if (photoImg.complete && photoImg.naturalWidth > 0) {
  photoBox.classList.add('has-image');
}


// ---- scroll reveal ----

const revealTargets = document.querySelectorAll('.reveal');

if (prefersReducedMotion) {
  revealTargets.forEach(el => el.classList.add('in'));
} else {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('in');
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });

  revealTargets.forEach(el => observer.observe(el));
}


// ---- skill filter ----

const chips = [...document.querySelectorAll('.chip')];
const projects = [...document.querySelectorAll('.entry[data-skills]')];
const statusBar = document.getElementById('filterStatus');
const statusText = document.getElementById('filterText');
const clearButton = document.getElementById('clearFilter');

let activeSkill = null;

function skillsFor(el) {
  return el.dataset.skills
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

function applyFilter() {
  let matches = 0;

  projects.forEach(el => {
    el.classList.remove('is-dim', 'is-lit');
    if (!activeSkill) return;

    if (skillsFor(el).includes(activeSkill)) {
      el.classList.add('is-lit');
      matches++;
    } else {
      el.classList.add('is-dim');
    }
  });

  chips.forEach(chip => {
    chip.setAttribute('aria-pressed', chip.dataset.skill === activeSkill ? 'true' : 'false');
  });

  if (!activeSkill) {
    statusBar.classList.remove('is-on');
    return;
  }

  const label = chips.find(chip => chip.dataset.skill === activeSkill).textContent;
  statusText.textContent = matches
    ? `${matches} ${matches === 1 ? 'project uses' : 'projects use'} ${label}`
    : `No project tagged ${label} yet`;
  statusBar.classList.add('is-on');
}

chips.forEach(chip => {
  chip.addEventListener('click', () => {
    activeSkill = activeSkill === chip.dataset.skill ? null : chip.dataset.skill;
    applyFilter();
  });
});

clearButton.addEventListener('click', () => {
  activeSkill = null;
  applyFilter();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && activeSkill) {
    activeSkill = null;
    applyFilter();
  }
});


// ---- copy email ----

const copyButton = document.getElementById('copyEmail');
const copyLabel = copyButton.textContent;

copyButton.addEventListener('click', async () => {
  const email = copyButton.dataset.email;

  try {
    await navigator.clipboard.writeText(email);
    copyButton.textContent = 'Copied';
    setTimeout(() => { copyButton.textContent = copyLabel; }, 1600);
  } catch {
    window.location.href = `mailto:${email}`;
  }
});
