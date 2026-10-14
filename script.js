// ===== Защита от встраивания в чужой сайт =====
// Мошенник может открыть наш сайт внутри своей страницы и подложить сверху невидимые кнопки.
// Если страница открыта не напрямую, а внутри чужой, — выходим из неё на настоящий адрес.
if (window.top !== window.self) {
  try { window.top.location = window.location.href; } catch { document.documentElement.hidden = true; }
}

// ===== Меню «три полоски» на телефоне =====
// Нажали на кнопку — меню раскрылось; нажали на раздел — меню закрылось, страница едет к разделу.
const burger = document.querySelector('.burger');
const siteNav = document.getElementById('site-nav');

function setMenu(open) {
  burger.setAttribute('aria-expanded', String(open));
  burger.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
  siteNav.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
}
burger.addEventListener('click', () => setMenu(burger.getAttribute('aria-expanded') !== 'true'));
siteNav.addEventListener('click', (e) => { if (e.target.closest('a')) setMenu(false); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });
// повернули телефон или расширили окно до компьютерного — меню закрываем
window.matchMedia('(max-width: 760px)').addEventListener('change', () => setMenu(false));

// ===== Появление блоков при прокрутке =====
const revealItems = document.querySelectorAll('.reveal');

if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });
  revealItems.forEach((el) => observer.observe(el));
} else {
  revealItems.forEach((el) => el.classList.add('is-in'));
}

// ===== Бесконечные ленты: цитаты и отзывы =====
// Лента сама едет с постоянной скоростью. Её можно тянуть пальцем или мышкой,
// а после резкого свайпа она катится по инерции и плавно возвращается к обычной скорости.
const LOOPS = [
  { selector: '.reviews__viewport', secondsPerLap: 45, direction: -1 }, // влево
  { selector: '.quotes__viewport', secondsPerLap: 60, direction: 1 },   // вправо
];
const FRICTION = 2.2;      // как быстро гаснет инерция после свайпа (больше — быстрее)
const MAX_FLING = 4000;    // предел скорости броска, пикселей в секунду
const calmMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

LOOPS.forEach(({ selector, secondsPerLap, direction }) => {
  const viewport = document.querySelector(selector);
  if (!viewport) return;
  const track = viewport.querySelector('.loop__track');

  // Дублируем карточки: когда лента уезжает на половину длины, незаметно начинаем сначала
  [...track.children].forEach((card) => {
    const copy = card.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    track.append(copy);
  });

  let half = track.scrollWidth / 2;
  let offset = direction > 0 ? -half : 0;  // текущий сдвиг ленты в пикселях
  let extra = 0;                           // добавочная скорость от свайпа
  let pace = 1;                            // 1 — обычный ход, 0 — пауза при наведении мышки
  let hovered = false;
  let drag = null;                         // данные текущего перетаскивания
  let last = performance.now();

  const baseSpeed = () => (calmMotion ? 0 : (half / secondsPerLap) * direction);
  // длина ленты меняется, когда догружаются фото или меняется ширина окна
  new ResizeObserver(() => { half = track.scrollWidth / 2; }).observe(track);

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    if (!drag) {
      pace += ((hovered ? 0 : 1) - pace) * Math.min(dt * 6, 1);  // мягкая остановка и разгон
      offset += (baseSpeed() * pace + extra) * dt;
      extra *= Math.exp(-FRICTION * dt);
      if (Math.abs(extra) < 1) extra = 0;
    }
    // держим сдвиг в пределах одной половины, чтобы лента была бесконечной
    if (half > 0) offset = ((offset % half) - half) % half;
    track.style.transform = `translate3d(${offset}px, 0, 0)`;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // --- Перетаскивание пальцем или мышкой ---
  viewport.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    drag = { id: e.pointerId, x: e.clientX, samples: [{ x: e.clientX, t: e.timeStamp }] };
    extra = 0;
    viewport.classList.add('is-dragging');
    try { viewport.setPointerCapture(e.pointerId); } catch { /* палец уже отпущен */ }
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    offset += e.clientX - drag.x;
    drag.x = e.clientX;
    drag.samples.push({ x: e.clientX, t: e.timeStamp });
    if (drag.samples.length > 6) drag.samples.shift();
  });

  function release(e) {
    if (!drag || e.pointerId !== drag.id) return;
    // скорость пальца за последние доли секунды превращается в инерцию
    const s = drag.samples;
    const first = s[0];
    const lastSample = s[s.length - 1];
    const ms = lastSample.t - first.t;
    const fling = ms > 0 && e.timeStamp - lastSample.t < 100 ? ((lastSample.x - first.x) / ms) * 1000 : 0;
    const clamped = Math.max(-MAX_FLING, Math.min(MAX_FLING, fling));
    // после броска мышкой не ставим ленту на паузу, пока курсор не уйдёт и не вернётся
    if (e.pointerType === 'mouse') { hovered = false; pace = 1; }
    extra = clamped - baseSpeed() * pace;
    drag = null;
    viewport.classList.remove('is-dragging');
  }
  viewport.addEventListener('pointerup', release);
  viewport.addEventListener('pointercancel', release);

  // --- Наведение мышки: лента мягко останавливается (на телефоне не мешает) ---
  viewport.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') hovered = true; });
  viewport.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') hovered = false; });

  // --- Горизонтальный свайп на тачпаде ноутбука ---
  viewport.addEventListener('wheel', (e) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;  // вертикальную прокрутку не трогаем
    e.preventDefault();
    offset -= e.deltaX;
  }, { passive: false });
});

// ===== Адреса: разбиваем название улицы на буквы для «волны» при наведении =====
document.querySelectorAll('.places__street').forEach((street) => {
  const text = street.textContent;
  street.textContent = '';
  // целый адрес для программ, которые читают сайт вслух; буквы для них скрыты
  const label = document.createElement('span');
  label.className = 'sr-only';
  label.textContent = text;
  street.append(label);
  let i = 0;
  text.split(' ').forEach((word, w) => {
    // слово целиком не переносится, переносы только между словами
    if (w > 0) street.append(' ');
    const wordEl = document.createElement('span');
    wordEl.className = 'word';
    wordEl.setAttribute('aria-hidden', 'true');
    [...word].forEach((char) => {
      const span = document.createElement('span');
      span.className = 'ch';
      span.style.setProperty('--i', i++);
      span.textContent = char;
      wordEl.append(span);
    });
    street.append(wordEl);
  });
});

// ===== Видео:не крутим его, если человек просит меньше движения =====
// и неон: после включения он иногда коротко «подмигивает»
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const video = document.querySelector('.hero__video');
const neon = document.querySelector('.neon');

if (!reduceMotion) {
  // видео без звука, поэтому браузеры разрешают запускать его сразу
  video.play().catch(() => { /* если браузер запретил — остаётся красивый первый кадр */ });
}

// Неон загорается, когда исчезла заставка (вызывается из блока «Заставка» ниже)
function startNeon() {
  if (reduceMotion) return;
  document.body.classList.add('is-ready');  // запускает «мерцающее» включение (flicker в styles.css)
  setTimeout(() => {                        // flicker длится 2,6 с
    neon.classList.add('is-lit');
    scheduleGlitch();
  }, 2600);
}

function scheduleGlitch() {
  const delay = 3000 + Math.random() * 5000; // от 3 до 8 секунд
  setTimeout(() => {
    neon.classList.add('glitch');
    setTimeout(() => neon.classList.remove('glitch'), 500); // длительность glitch
    scheduleGlitch();
  }, delay);
}

// ===== Заставка: обжарка зерна =====
// Пока сайт грузится, зерно меняет цвет от зелёного до тёмного, внизу заполняется полоска.
// В конце надпись «Готово». Заставка видна минимум 1,8 с и максимум 5 с — даже на медленном интернете.
(function roast() {
  const pre = document.getElementById('preloader');
  if (!pre || reduceMotion) { if (pre) pre.remove(); startNeon(); return; }

  const MIN_MS = 1800;
  const MAX_MS = 5000;
  // цвета зерна по ходу обжарки: свет, середина, тень, бороздка
  const COLORS = [
    { at: 0,   c: ['#c5cd88', '#8d9c5e', '#4a552c', '#36401c'] },  // зелёное
    { at: .35, c: ['#e6c48e', '#c4945a', '#86592f', '#5e3d1f'] },  // светлая обжарка
    { at: .7,  c: ['#b97f4c', '#86512c', '#4a2a16', '#2a170b'] },  // средняя
    { at: 1,   c: ['#7d5034', '#4a2b1a', '#21120a', '#100804'] },  // тёмная
  ];
  const stops = ['bean-light', 'bean-mid', 'bean-dark'].map((id) => document.getElementById(id));
  const crease = document.getElementById('bean-crease');
  const shine = document.getElementById('bean-shine');
  const label = document.getElementById('preloader-stage');
  const bar = document.getElementById('preloader-bar');

  const start = performance.now();
  let loaded = document.readyState === 'complete';
  let progress = 0;
  let finished = false;
  window.addEventListener('load', () => { loaded = true; });

  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => {
    const [x, y] = [hex(a), hex(b)];
    return `rgb(${x.map((v, i) => Math.round(v + (y[i] - v) * t)).join(',')})`;
  };

  function paint(p) {
    // находим две соседние стадии и плавно смешиваем их цвета
    let i = 0;
    while (i < COLORS.length - 2 && p > COLORS[i + 1].at) i++;
    const a = COLORS[i];
    const b = COLORS[i + 1];
    const t = Math.min(Math.max((p - a.at) / (b.at - a.at), 0), 1);
    stops.forEach((stop, k) => stop.setAttribute('stop-color', mix(a.c[k], b.c[k], t)));
    crease.setAttribute('stroke', mix(a.c[3], b.c[3], t));
    shine.style.opacity = (0.3 + p * 0.25).toFixed(3);  // к концу зерно маслянисто блестит
    bar.style.transform = `scaleX(${p})`;
  }

  function finish() {
    if (finished) return;
    finished = true;
    paint(1);                       // зерно всегда доходит до тёмной обжарки
    label.textContent = 'Готово';
    pre.classList.add('is-roasted');
    setTimeout(() => {              // даём полсекунды увидеть «Готово»
      pre.classList.add('is-done');
      startNeon();
      setTimeout(() => pre.remove(), 700);
    }, 500);
  }

  function tick(now) {
    const elapsed = now - start;
    // пока страница грузится, обжарка идёт до 90 %; когда загрузилась — доходит до конца
    const target = (loaded && elapsed >= MIN_MS) || elapsed >= MAX_MS ? 1 : Math.min(0.9, elapsed / (MIN_MS * 1.4));
    progress += (target - progress) * 0.08;
    if (target === 1 && progress > 0.985) progress = 1;
    paint(progress);
    if (progress >= 1) { finish(); return; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  setTimeout(finish, MAX_MS + 1500);  // страховка, если вкладка была в фоне и анимация стояла
})();