// script.js
// Manejo de login con “Recordarme” para email/DNI y contraseña
// Incluye validaciones robustas y lógica de color de sirena segura

document.addEventListener("DOMContentLoaded", () => {
  // ——— Inicializar Firebase ———
  const auth = firebase.auth();
  const db = firebase.firestore();

  // ——— Verificación de Sesión Persistente ———
  // Si el usuario ya está logueado, redirigir al menú inmediatamente.
  auth.onAuthStateChanged(user => {
    if (user) {
      window.location.href = "menu.html";
    }
  });

  // ——— Función para validar Hexadecimal ———
  function isValidHex(hex) {
    return /^#([0-9A-F]{3}){1,2}$/i.test(hex);
  }

  // ——— Función para aplicar color de sirena y guardar en localStorage ———
  function applySirenColor(hex) {
    // Fallback de seguridad: si no es válido, usar verde
    if (!hex || !isValidHex(hex)) {
      console.warn(`Color inválido detectado: ${hex}. Usando default.`);
      hex = '#00ff00';
    }

    try {
      document.documentElement.style.setProperty('--siren-color', hex);
      const c = hex.replace('#', '');
      // Manejo seguro de dígitos (3 o 6)
      let r, g, b;
      if (c.length === 3) {
        r = parseInt(c[0] + c[0], 16);
        g = parseInt(c[1] + c[1], 16);
        b = parseInt(c[2] + c[2], 16);
      } else {
        r = parseInt(c.substring(0, 2), 16);
        g = parseInt(c.substring(2, 4), 16);
        b = parseInt(c.substring(4, 6), 16);
      }

      // Validación extra por si parseInt da NaN
      if (isNaN(r) || isNaN(g) || isNaN(b)) throw new Error("Parseo RGB fallido");

      document.documentElement.style.setProperty('--siren-rgb', `${r},${g},${b}`);
      localStorage.setItem('sirenColor', hex);
    } catch (e) {
      console.error("Error aplicando color sirena:", e);
      // Restaurar default visualmente si falla
      document.documentElement.style.setProperty('--siren-color', '#00ff00');
      document.documentElement.style.setProperty('--siren-rgb', '0,255,0');
    }
  }

  // ——— Suscripción en tiempo real a Firestore ———
  db.collection('settings').doc('siren')
    .onSnapshot(doc => {
      let color = '#00ff00'; // verde por defecto
      if (doc.exists && doc.data().color) {
        color = doc.data().color;
      } else {
        const saved = localStorage.getItem('sirenColor');
        if (saved) color = saved;
      }
      applySirenColor(color);
    }, err => {
      console.error("Error escuchando siren en Firestore:", err);
      const saved = localStorage.getItem('sirenColor') || '#00ff00';
      applySirenColor(saved);
    });

  // ——— Captura elementos del DOM ———
  const loginForm = document.getElementById("login-form");
  const loginBtn = document.getElementById("login-btn");
  const loadingOverlay = document.getElementById("loadingOverlay");
  const errorModal = document.getElementById("errorModal");
  const modalMessage = document.getElementById("modalMessage");
  const modalClose = document.getElementById("modalClose");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const rememberCheckbox = document.getElementById("remember");
  const togglePassword = document.getElementById("togglePassword");

  if (!loginForm) {
    console.error("❌ No se encontró #login-form en el DOM");
    return;
  }

  // ——— Estado inicial ———
  loginForm.reset();
  usernameInput.disabled = false;
  passwordInput.disabled = false;
  loginBtn.disabled = false;
  loadingOverlay.hidden = true;
  errorModal.style.display = "none";

  // ——— Prefill “Recordarme” ———
  // OJO: Solo recuperamos el usuario/email, NO la contraseña por seguridad.
  const rememberedUser = localStorage.getItem("rememberedUser");
  if (rememberedUser) {
    usernameInput.value = rememberedUser;
    rememberCheckbox.checked = true;
  }

  // ——— Toggle visibilidad de la contraseña ———
  togglePassword.addEventListener("click", () => {
    const isPwd = passwordInput.type === "password";
    passwordInput.type = isPwd ? "text" : "password";
    togglePassword.style.transform = isPwd ? "rotate(180deg)" : "rotate(0)";
    togglePassword.setAttribute(
      "aria-label",
      isPwd ? "Ocultar contraseña" : "Mostrar contraseña"
    );
  });

  // ——— Cerrar modal de error ———
  modalClose.addEventListener("click", () => {
    errorModal.style.display = "none";
  });
  errorModal.addEventListener("click", e => {
    if (e.target === errorModal) {
      errorModal.style.display = "none";
    }
  });

  // ——— Manejo del submit ———
  loginForm.addEventListener("submit", async e => {
    e.preventDefault();
    modalMessage.textContent = "";
    errorModal.style.display = "none";

    let userInput = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!userInput || !password) {
      return showModal("Por favor, completa todos los campos.");
    }

    // ——— Lógica de Autocompletado de Dominio (DNI vs Email) ———
    // Si NO contiene '@', asumimos que es un DNI/ID y agregamos el dominio.
    if (!userInput.includes('@')) {
      // Opcional: Validar que sean solo números si así se requiere para IDs
      // if (!/^\d+$/.test(userInput)) {
      //   return showModal("El ID debe contener solo números.");
      // }
      userInput = `${userInput}@liderman.com.pe`;
      console.log(`Autocompletando dominio: ${userInput}`);
    } else {
      // Si tiene '@', validamos formato de email básico
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userInput)) {
        return showModal("El formato del correo electrónico no es válido.");
      }
    }

    // ——— Guardar o limpiar "Recordarme" ———
    if (rememberCheckbox.checked) {
      // Guardamos 'userInput' original (lo que escribió el usuario) o el procesado?
      // Mejor guardar lo que escribió el usuario para que no se confunda al volver.
      // Pero para login usamos el procesado.
      // Aquí guardaremos lo que el usuario escribió (usernameInput.value)
      localStorage.setItem("rememberedUser", usernameInput.value.trim());
    } else {
      localStorage.removeItem("rememberedUser");
    }
    // NOTA: Ya no guardamos la contraseña en localStorage por seguridad.

    loginBtn.disabled = true;
    loadingOverlay.hidden = false;

    try {
      // Usamos userInput (ya procesado con dominio si hacía falta)
      await auth.signInWithEmailAndPassword(userInput, password);
      window.location.href = "menu.html";
    } catch (error) {
      loadingOverlay.hidden = true;
      loginBtn.disabled = false;

      const code = error.code;
      // Mapeo amigable de errores
      let msg = "Ha ocurrido un error. Intenta de nuevo.";

      if (["auth/user-not-found", "auth/wrong-password", "auth/invalid-credential"].includes(code)) {
        msg = "Usuario o contraseña incorrectos.";
      } else if (code === "auth/too-many-requests") {
        msg = "Demasiados intentos fallidos. Por favor espera unos minutos.";
      } else if (code === "auth/invalid-email") {
        msg = "El formato del usuario/correo no es válido.";
      } else if (code === "auth/network-request-failed") {
        msg = "Error de conexión. Verifica tu internet.";
      } else {
        msg = `Error: ${error.message}`; // Fallback para errores no comunes
      }

      showModal(msg);
    }
  });

  function showModal(text) {
    modalMessage.textContent = text;
    errorModal.style.display = "flex";
    modalClose.focus();
  }
});
