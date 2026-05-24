// 1. Hero load animation
window.addEventListener('load', () => {
  const hero = document.querySelector('.hero');
  if (hero) hero.classList.add('loaded');
});

// 2. Parallax hero image
const heroBg = document.getElementById('hero-bg');
if (heroBg) {
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    if (scrollY < window.innerHeight) {
      heroBg.style.transition = 'none';
      heroBg.style.transform = `scale(1) translateY(${scrollY * 0.16}px)`;
    }
  }, { passive: true });
}

// 3. Scroll reveal
const srEls = document.querySelectorAll('.sr, .sr-left, .sr-right');
if (srEls.length) {
  const srObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        srObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  srEls.forEach(el => srObserver.observe(el));
}

// 4. Nav shadow on scroll (nav haut uniquement)
const navTop = document.getElementById('nav');
if (navTop) {
  window.addEventListener('scroll', () => {
    navTop.classList.toggle('scrolled', window.scrollY > 10);
  }, { passive: true });
}
