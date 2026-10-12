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
// Дублируем карточки: лента сдвигается на половину длины и незаметно начинается заново
document.querySelectorAll('.loop__track').forEach((track) => {
  [...track.children].forEach((card) => {
    const copy = card.cloneNode(true);
    copy.setAttribute('aria-hidden', 'true');
    track.append(copy);
  });
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
