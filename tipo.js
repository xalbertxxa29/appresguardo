/* tipo.js */
// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Verificar sesión; si no hay usuario, redirigir a index.html
firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    window.location.href = 'index.html';
    return;
  }
  // Obtener UID del email
  const uid = user.email.split('@')[0];
  firebase.firestore()
    .collection('userMap')
    .doc(uid)
    .get()
    .then(doc => {
      const welcomeElem = document.getElementById('welcome-message');
      if (doc.exists && doc.data().nombre) {
        welcomeElem.textContent = `Bienvenido, ${doc.data().nombre}`;
      } else {
        welcomeElem.textContent = `Bienvenido, ${uid}`;
      }
    });
});

// Redirecciones de botones
document.getElementById('resguardo-btn').addEventListener('click', () => {
  window.location.href = 'formulario.html';
});

document.getElementById('conductor-btn').addEventListener('click', () => {
  window.location.href = 'formulario-conductor.html';
});

document.getElementById('back-btn').addEventListener('click', () => {
  window.location.href = 'menu.html';
});
