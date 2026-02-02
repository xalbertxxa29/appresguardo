document.addEventListener('DOMContentLoaded', () => {
    // 0️⃣ Auth guard
    const auth = firebase.auth();
    auth.onAuthStateChanged(user => {
      if (!user) {
        window.location.href = 'index.html';
      }
    });
  
    // 1️⃣ Reveal on scroll secuencial
    const reveals = document.querySelectorAll('.reveal');
    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.2 });
    reveals.forEach(el => io.observe(el));
  
    // 2️⃣ Ripple effect + call
    document.querySelectorAll('.contact-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        // Position ripple
        const rect = btn.getBoundingClientRect();
        const x = `${e.clientX - rect.left}px`;
        const y = `${e.clientY - rect.top}px`;
        btn.style.setProperty('--ripple-x', x);
        btn.style.setProperty('--ripple-y', y);
        btn.classList.add('ripple');
        setTimeout(() => btn.classList.remove('ripple'), 600);
  
        // Make call
        const phone = btn.dataset.phone;
        window.location.href = `tel:${phone}`;
      });
    });
  
    // 3️⃣ Back button
    document.getElementById('back-btn').addEventListener('click', () => {
      window.location.href = 'menu.html';
    });
  });
  