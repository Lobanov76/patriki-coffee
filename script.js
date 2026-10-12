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
  street.setAttribute('aria-label', text);
  street.textContent = '';
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

if (reduceMotion) {
  video.removeAttribute('autoplay');
  video.pause();
} else {
  // первое включение длится 2,6 с (анимация flicker в styles.css)
  setTimeout(() => {
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
