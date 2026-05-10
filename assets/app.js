'use strict';

// ═══════════ DOM CACHE ═══════════
// Häufig benutzte Elemente einmal abgreifen statt bei jedem Aufruf neu querySeln.
// Das Script läuft mit `defer`, also ist der DOM beim Ausführen schon geparst.
const dom = {
  hamBtn:           document.getElementById('hamBtn'),
  mobileMenu:       document.getElementById('mobileMenu'),
  mobileMenuClose:  document.getElementById('mobileMenuClose'),
  navbar:           document.getElementById('navbar'),
  galleryTitle:     document.getElementById('galleryTitle'),
  galleryImg:       document.getElementById('galleryImg'),
  galleryIframe:    document.getElementById('galleryIframe'),
  galleryThumbs:    document.getElementById('galleryThumbs'),
  galleryModal:     document.getElementById('galleryModal'),
  galleryCounter:   document.getElementById('galleryCounter'),
  galleryPrev:      document.getElementById('galleryPrev'),
  galleryNext:      document.getElementById('galleryNext'),
  galleryClose:     document.getElementById('galleryClose'),
  kontaktForm:      document.getElementById('kontaktForm'),
  formStatus:       document.getElementById('formStatus'),
};

// ═══════════ MOBILE MENU ═══════════
dom.hamBtn.addEventListener('click', () => {
  dom.mobileMenu.classList.add('open');
  dom.mobileMenu.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  dom.hamBtn.classList.add('active');
  dom.hamBtn.setAttribute('aria-expanded', 'true');
  dom.hamBtn.setAttribute('aria-label', 'Menü schließen');
});
dom.mobileMenuClose.addEventListener('click', closeMobileMenu);
document.querySelectorAll('.mobile-nav-link').forEach(a => {
  a.addEventListener('click', closeMobileMenu);
});
function closeMobileMenu() {
  dom.mobileMenu.classList.remove('open');
  dom.mobileMenu.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  dom.hamBtn.classList.remove('active');
  dom.hamBtn.setAttribute('aria-expanded', 'false');
  dom.hamBtn.setAttribute('aria-label', 'Menü öffnen');
}

// ═══════════ NAVBAR SCROLL ═══════════
window.addEventListener('scroll', () => {
  dom.navbar.classList.toggle('scrolled', window.scrollY > 60);
});

// ═══════════ DYNAMIC GALLERY via Cloudinary Tags ═══════════
const CLOUD_NAME = 'dgxclkj2u';

const galleryConfig = {
  autos:     { title: 'AUTOS',             tag: 'galerie-autos' },
  portrait:  { title: 'PORTRAIT',          tag: 'galerie-portrait' },
  drohne:    { title: 'DROHNE',            tag: 'galerie-drohne' },
  business:  { title: 'BUSINESS & FIRMEN', tag: 'galerie-business' },
  kommunen:  { title: 'KOMMUNEN',          tag: 'galerie-kommunen' },
  natur:     { title: 'NATUR & LANDSCHAFT',tag: 'galerie-natur' },
};

// YouTube-Galerien: Du kannst hier komplette URLs ODER nur die 11-stellige Video-ID einfügen.
// Neues Video hinzufügen → einfach eine Zeile in den videoIds-Array werfen.
const youtubeGalleries = {
  videos: {
    title: 'VIDEOS & BTS',
    videoIds: [
      'https://www.youtube.com/watch?v=aZ8Cn8-Zh_Y',
      'https://www.youtube.com/watch?v=nzC4dtox1hc',
      'https://www.youtube.com/watch?v=TH9RZ7Be88Q',
    ],
  },
};

function extractYouTubeId(input) {
  if (!input) return null;
  if (/^[\w-]{11}$/.test(input)) return input;
  const m = String(input).match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

let currentGallery = [];
let currentIndex = 0;
let currentGalleryTitle = '';
let isVideoGallery = false;

async function openGallery(key) {
  const yt = youtubeGalleries[key];
  const cfg = galleryConfig[key];
  if (!yt && !cfg) return;

  // History-Eintrag pushen → Hardware-Zurück-Taste schließt Modal statt Seite zu verlassen
  if (!history.state || !history.state.galleryOpen) {
    history.pushState({ galleryOpen: true }, '');
  }

  if (yt) {
    openYouTubeGallery(yt);
    return;
  }
  isVideoGallery = false;
  currentGalleryTitle = cfg.title;
  dom.galleryTitle.textContent = cfg.title;
  dom.galleryImg.src = '';
  dom.galleryImg.alt = '';
  dom.galleryImg.classList.remove('is-hidden');
  dom.galleryIframe.classList.add('is-hidden');
  dom.galleryIframe.src = '';
  dom.galleryThumbs.innerHTML = '<p class="gallery-empty-msg">Bilder werden geladen…</p>';

  dom.galleryModal.classList.add('active');
  dom.galleryModal.classList.remove('video-mode');
  dom.galleryModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  try {
    const res = await fetch(`https://res.cloudinary.com/${CLOUD_NAME}/image/list/${cfg.tag}.json`);
    const data = await res.json();
    currentGallery = data.resources.map(r =>
      `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/q_auto,f_auto,w_1400/${r.public_id}.${r.format}`
    );
    if (currentGallery.length === 0) {
      dom.galleryThumbs.innerHTML = '<p class="gallery-empty-msg">Noch keine Bilder vorhanden.</p>';
      return;
    }
    currentIndex = 0;
    renderGallery();
  } catch (e) {
    dom.galleryThumbs.innerHTML = '<p class="gallery-empty-msg">Bilder konnten nicht geladen werden.</p>';
  }
}

function openYouTubeGallery(yt) {
  isVideoGallery = true;
  currentGalleryTitle = yt.title;
  dom.galleryTitle.textContent = yt.title;
  dom.galleryImg.classList.add('is-hidden');
  dom.galleryImg.src = '';
  dom.galleryIframe.classList.remove('is-hidden');
  dom.galleryThumbs.innerHTML = '';

  currentGallery = yt.videoIds.map(extractYouTubeId).filter(Boolean);

  dom.galleryModal.classList.add('active', 'video-mode');
  dom.galleryModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  if (currentGallery.length === 0) {
    dom.galleryThumbs.innerHTML = '<p class="gallery-empty-msg">Noch keine Videos vorhanden.</p>';
    return;
  }
  currentIndex = 0;
  renderGallery();
}

function renderGallery() {
  dom.galleryCounter.textContent = (currentIndex + 1) + ' / ' + currentGallery.length;

  if (isVideoGallery) {
    const id = currentGallery[currentIndex];
    // youtube-nocookie.com → setzt erst beim Play Cookies (DSGVO-freundlicher)
    dom.galleryIframe.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
    dom.galleryIframe.title = currentGalleryTitle + ' – Video ' + (currentIndex + 1);
    dom.galleryThumbs.innerHTML = currentGallery.map((vid, i) =>
      `<img class="gallery-thumb ${i === currentIndex ? 'active' : ''}" src="https://img.youtube.com/vi/${vid}/hqdefault.jpg" alt="Vorschau ${i + 1}" onclick="goToImage(${i})" loading="lazy">`
    ).join('');
    return;
  }

  dom.galleryImg.src = currentGallery[currentIndex];
  dom.galleryImg.alt = currentGalleryTitle + ' – Bild ' + (currentIndex + 1) + ' von ' + currentGallery.length;
  dom.galleryThumbs.innerHTML = currentGallery.map((src, i) =>
    `<img class="gallery-thumb ${i === currentIndex ? 'active' : ''}" src="${src.replace('w_1400','w_120')}" alt="Vorschau ${i + 1}" onclick="goToImage(${i})" loading="lazy">`
  ).join('');
}

function goToImage(i) {
  currentIndex = i;
  renderGallery();
}

dom.galleryPrev.addEventListener('click', () => {
  if (currentGallery.length === 0) return;
  currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
  renderGallery();
});
dom.galleryNext.addEventListener('click', () => {
  if (currentGallery.length === 0) return;
  currentIndex = (currentIndex + 1) % currentGallery.length;
  renderGallery();
});
dom.galleryClose.addEventListener('click', closeGallery);
dom.galleryModal.addEventListener('click', function (e) {
  if (e.target === this) closeGallery();
});

// Click/Tap aufs Bild → Vollbildmodus toggeln
// (feuert auf Mobile nur bei stationärem Tap, nicht bei Swipe-Gesten)
dom.galleryImg.addEventListener('click', () => {
  dom.galleryModal.classList.toggle('expanded');
});
document.addEventListener('keydown', function (e) {
  if (!dom.galleryModal.classList.contains('active')) return;
  if (currentGallery.length === 0 && e.key !== 'Escape') return;
  if (e.key === 'ArrowLeft') {
    currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
    renderGallery();
  }
  if (e.key === 'ArrowRight') {
    currentIndex = (currentIndex + 1) % currentGallery.length;
    renderGallery();
  }
  if (e.key === 'Escape') {
    // ESC verlässt zuerst Vollbild, beim zweiten Mal die Galerie
    if (dom.galleryModal.classList.contains('expanded')) {
      dom.galleryModal.classList.remove('expanded');
    } else {
      closeGallery();
    }
  }
});
// Wird via UI-Klick (Schließen-Button, ESC, Klick außerhalb) aufgerufen.
// Wenn history-Eintrag gesetzt → history.back() triggern, popstate-Handler schließt dann.
// So wird der History-Stack sauber aufgeräumt — kein Doppel-Back-Drücken nötig.
function closeGallery() {
  if (history.state && history.state.galleryOpen) {
    history.back();
  } else {
    closeGalleryNow();
  }
}

function closeGalleryNow() {
  dom.galleryModal.classList.remove('active');
  dom.galleryModal.classList.remove('expanded');
  dom.galleryModal.classList.remove('video-mode');
  dom.galleryModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  // YouTube-Video stoppen (sonst läuft Audio im Hintergrund weiter)
  if (dom.galleryIframe) dom.galleryIframe.src = '';
  isVideoGallery = false;
}

// Hardware-Zurück-Taste (Mobile) / Browser-Back schließt Modal, statt Seite zu verlassen
window.addEventListener('popstate', () => {
  if (dom.galleryModal && dom.galleryModal.classList.contains('active')) {
    closeGalleryNow();
  }
});

// ═══════════ SWIPE-GESTE für Galerie auf Touch-Geräten ═══════════
(function () {
  let touchStartX = 0;
  let touchStartY = 0;
  const SWIPE_THRESHOLD = 50;

  dom.galleryImg.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  dom.galleryImg.addEventListener('touchend', e => {
    if (currentGallery.length === 0) return;
    const diffX = touchStartX - e.changedTouches[0].screenX;
    const diffY = Math.abs(touchStartY - e.changedTouches[0].screenY);
    // Nur als Swipe werten, wenn horizontal stärker als vertikal (kein Scrollen verwechseln)
    if (Math.abs(diffX) < SWIPE_THRESHOLD || diffY > Math.abs(diffX)) return;
    if (diffX > 0) {
      currentIndex = (currentIndex + 1) % currentGallery.length;
    } else {
      currentIndex = (currentIndex - 1 + currentGallery.length) % currentGallery.length;
    }
    renderGallery();
  }, { passive: true });
})();

// ═══════════ SERVICE-CARD „IN-VIEW" → volle Farbe ═══════════
// Sobald eine Card ins mittlere 60 % des Viewports kommt, kriegt sie .in-view →
// CSS schaltet das Bild auf Farbe. Universell (kein @media-Gating), greift auch
// auf Mobile zuverlässig (frühere @media (hover: none)-Variante hatte auf
// manchen Hybrid-Geräten Probleme).
(function () {
  const cards = document.querySelectorAll('.leistung-card');
  if (cards.length === 0 || !('IntersectionObserver' in window)) return;
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      e.target.classList.toggle('in-view', e.isIntersecting);
    });
  }, { threshold: 0, rootMargin: '-20% 0px -20% 0px' });
  cards.forEach(c => observer.observe(c));
})();

// ═══════════ SCROLL REVEALS ═══════════
(function () {
  const revealEls = document.querySelectorAll('.reveal');
  if (revealEls.length === 0) return;
  if (!('IntersectionObserver' in window)
      || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    revealEls.forEach(el => el.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
  revealEls.forEach(el => observer.observe(el));
})();

// ═══════════ KONTAKTFORMULAR – Inline-Submit ═══════════
(function () {
  const form = dom.kontaktForm;
  const status = dom.formStatus;
  const submitBtn = form.querySelector('.form-submit');
  const originalBtnText = submitBtn.textContent;

  function setStatus(type, message) {
    status.className = 'form-status show ' + type;
    status.textContent = message;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'form-status';
    submitBtn.disabled = true;
    submitBtn.textContent = 'Wird gesendet …';

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        body: new FormData(form),
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        setStatus('success', 'Danke! Ihre Anfrage wurde gesendet – ich melde mich zeitnah bei Ihnen zurück.');
        form.reset();
      } else {
        const data = await res.json().catch(() => ({}));
        const msg = (data.errors && data.errors.map(er => er.message).join(', '))
          || 'Senden fehlgeschlagen. Bitte versuchen Sie es später erneut oder schreiben Sie direkt eine E-Mail.';
        setStatus('error', msg);
      }
    } catch {
      setStatus('error', 'Verbindung fehlgeschlagen. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
})();

// ═══════════ SMOOTH SCROLL (mit Nav-Offset, damit Anker nicht unter fixer Nav landen) ═══════════
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const href = a.getAttribute('href');
    if (!href || href === '#') return;
    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    // Noch nicht sichtbare .reveal-Elemente sofort einblenden — sonst „schrumpft"
    // das Layout während des Scrolls (translateY(28px) → 0) und das Ziel landet
    // hinter der Nav. Transition kurz ausschalten, damit der Layout-Sprung sofort
    // greift und getBoundingClientRect die echte Endposition liefert.
    const reveals = document.querySelectorAll('.reveal:not(.visible)');
    reveals.forEach(el => { el.style.transition = 'none'; el.classList.add('visible'); });
    void document.body.offsetHeight; // erzwingt Reflow
    const navHeight = dom.navbar ? dom.navbar.offsetHeight : 80;
    const offset = navHeight + 12;
    const top = window.scrollY + target.getBoundingClientRect().top - offset;
    window.scrollTo({ top, behavior: 'smooth' });
    // Inline-Transition wieder freigeben, damit zukünftige Reveals normal animieren
    setTimeout(() => { reveals.forEach(el => { el.style.transition = ''; }); }, 100);
  });
});

// ═══════════ CINEMATIC: LETTERBOX, CHAR-REVEAL, CUSTOM CURSOR ═══════════
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Letterbox-Intro: nur einmal pro Browser-Session ----
  let letterboxRan = false;
  try {
    if (sessionStorage.getItem('letterboxShown')) {
      document.querySelectorAll('.letterbox').forEach(el => el.remove());
    } else {
      sessionStorage.setItem('letterboxShown', '1');
      letterboxRan = true;
    }
  } catch (e) {
    // sessionStorage blockiert (Privacy-Modus o.ä.) — Letterbox läuft halt.
    letterboxRan = true;
  }

  // ---- Buchstaben-Reveal für Hero-Headline ----
  if (!reduced) {
    const heroH1 = document.querySelector('h1[data-split]');
    if (heroH1) {
      const baseDelay = letterboxRan ? 1000 : 200;
      let charIndex = 0;

      function splitTextNodes(node) {
        Array.from(node.childNodes).forEach(child => {
          if (child.nodeType === Node.TEXT_NODE) {
            // Leading/Trailing-Whitespace trimmen — sonst erzeugen sie sichtbare
            // nbsp-Spans direkt vor/nach Block-Elementen wie <em>.
            const text = child.textContent.trim();
            if (!text) { child.remove(); return; }
            const frag = document.createDocumentFragment();
            for (const ch of text) {
              const span = document.createElement('span');
              span.className = 'char-reveal';
              span.style.setProperty('--char-delay', (baseDelay + charIndex * 30) + 'ms');
              if (ch === ' ') {
                span.innerHTML = '&nbsp;';
              } else {
                span.textContent = ch;
              }
              frag.appendChild(span);
              charIndex++;
            }
            child.replaceWith(frag);
          } else if (child.nodeType === Node.ELEMENT_NODE) {
            splitTextNodes(child);
          }
        });
      }
      splitTextNodes(heroH1);
    }
  }

  // ---- Custom Cursor + Hover-Morph ----
  const cursorOK = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (!cursorOK) return;

  const dot = document.querySelector('.cursor-dot');
  const ring = document.querySelector('.cursor-ring');
  if (!dot || !ring) return;

  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;
  let pinned = false;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%, -50%)`;
    if (!pinned) {
      rx = mx; ry = my;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      pinned = true;
    }
  }, { passive: true });

  function loop() {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
    requestAnimationFrame(loop);
  }
  loop();

  const cardSel = '.leistung-card.has-gallery, .gallery-thumb';
  const btnSel  = 'a, button, input, textarea, select, [role="button"], .gallery-btn';

  document.addEventListener('mouseover', (e) => {
    const t = e.target;
    if (t.closest && t.closest(cardSel)) {
      document.body.classList.add('cursor-card');
      document.body.classList.remove('cursor-btn');
    } else if (t.closest && t.closest(btnSel)) {
      document.body.classList.add('cursor-btn');
      document.body.classList.remove('cursor-card');
    } else {
      document.body.classList.remove('cursor-card', 'cursor-btn');
    }
  });

  document.addEventListener('mouseleave', () => document.body.classList.add('cursor-hidden'));
  document.addEventListener('mouseenter', () => document.body.classList.remove('cursor-hidden'));
})();
