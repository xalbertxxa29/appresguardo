/* formulario-conductor.js */
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
let displayName = '';

document.addEventListener('DOMContentLoaded', () => {
  // Session guard & fetch user name
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = 'index.html';
    const uid = user.email.split('@')[0];
    try {
      const doc = await db.collection('userMap').doc(uid).get();
      displayName = doc.exists && doc.data().nombre ? doc.data().nombre : uid;
    } catch {
      displayName = uid;
    }
    const welcomeEl = document.getElementById('welcome-message');
    welcomeEl.classList.remove('skeleton');
    welcomeEl.style.animation = 'typing 1.5s steps(30,end) forwards, blink .7s step-end infinite';
    welcomeEl.textContent = `Bienvenido, ${displayName}`;
  });

  // Reveal items and observaciones
  const items = document.querySelectorAll('.reveal');
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  items.forEach(item => io.observe(item));
  const obsGroup = document.querySelector('.textarea-group'); if (obsGroup) io.observe(obsGroup);

  // Submission with Lottie
  const lottieModal = document.getElementById('lottie-modal');
  const lottieContainer = document.getElementById('lottie-container');
  document.getElementById('conductor-form').addEventListener('submit', e => {
    e.preventDefault();
    lottieModal.style.display = 'flex';
    const anim = lottie.loadAnimation({ container: lottieContainer, renderer: 'svg', loop: false, autoplay: true, path: 'https://assets10.lottiefiles.com/packages/lf20_jbrw3hcz.json' });
    anim.addEventListener('complete', async () => {
      lottieModal.style.display = 'none';
      const data = {};
      document.querySelectorAll('.radio-group').forEach(g => {
        const q = g.querySelector('.question').textContent.trim();
        const v = g.querySelector('input[type="radio"]:checked').value;
        data[q] = v;
      });
      data['Observaciones'] = document.getElementById('observaciones').value.trim();
      const now = new Date();
      data['Fecha'] = now.toLocaleDateString();
      data['Hora'] = now.toLocaleTimeString();
      data['Usuario ID'] = auth.currentUser.email.split('@')[0];
      data['Usuario Nombre'] = displayName;
      data['timestamp'] = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('conductor').add(data);
      window.location.href = 'menu.html';
    });
  });

  document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = 'tipo.html';
  });
});