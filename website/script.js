function createParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  for (let i = 0; i < 15; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';
    particle.style.left = `${Math.random() * 100}%`;
    particle.style.animationDuration = `${15 + Math.random() * 25}s`;
    particle.style.animationDelay = `${Math.random() * 20}s`;
    particle.style.width = `${4 + Math.random() * 6}px`;
    particle.style.height = `${5 + Math.random() * 7}px`;
    container.appendChild(particle);
  }
}

function initScrollAnimations() {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }
      }
    },
    { threshold: 0.1 }
  );

  document.querySelectorAll('.feature-card, .step, .privacy-card, .install-step, .install-quick').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

createParticles();
initScrollAnimations();
