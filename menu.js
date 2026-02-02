// menu.js
// Versión actualizada con botones adicionales de Evidencia y Reporte de Incidencias

document.addEventListener("DOMContentLoaded", () => {
  const auth = firebase.auth();
  const db = firebase.firestore();
  const statusMessageElem = document.getElementById("status-message");
  const checklistBtn = document.getElementById("checklist-btn");
  const planEjerciciosBtn = document.getElementById("plan-ejercicios-btn");
  const contactosBtn = document.getElementById("contactos-btn");
  const evidenciaBtn = document.getElementById("evidencia-ejercicios-btn");
  const reporteBtn = document.getElementById("reporte-incidencias-btn");
  const logoutBtn = document.getElementById("logout-btn");

  // ——— Función para aplicar color de sirena ———
  function applySiren(colorHex) {
    document.documentElement.style.setProperty('--siren-color', colorHex);
    const c = colorHex.replace('#', '');
    const r = parseInt(c.substr(0, 2), 16);
    const g = parseInt(c.substr(2, 2), 16);
    const b = parseInt(c.substr(4, 2), 16);
    document.documentElement.style.setProperty('--siren-rgb', `${r},${g},${b}`);
    localStorage.setItem('sirenColor', colorHex);
  }

  // ——— Inicializar sirena con valor almacenado en localStorage ———
  const savedColor = localStorage.getItem('sirenColor');
  if (savedColor) applySiren(savedColor);

  // ——— Escuchar cambios en Firestore para actualizar en tiempo real ———
  db.collection('settings').doc('siren')
    .onSnapshot(doc => {
      const color = (doc.exists && doc.data().color) ? doc.data().color : '#00ff00';
      applySiren(color);
    }, err => {
      console.error('Error escuchando siren en Firestore:', err);
      applySiren(localStorage.getItem('sirenColor') || '#00ff00');
    });

  // ——— Escuchar storage events de otras pestañas ———
  window.addEventListener('storage', e => {
    if (e.key === 'sirenColor' && e.newValue) applySiren(e.newValue);
  });

  // --- Modal de cierre de sesión ---
  const logoutModal = document.createElement("div");
  logoutModal.id = "logout-modal";
  logoutModal.setAttribute("role", "dialog");
  logoutModal.setAttribute("aria-modal", "true");
  logoutModal.style.display = "none";

  const modalContent = document.createElement("div");
  modalContent.id = "logout-modal-content";

  const modalMessage = document.createElement("p");
  modalMessage.classList.add("modal-message");
  modalMessage.textContent = "Gracias por preferir a Liderman Alarmas.";

  const continueButton = document.createElement("button");
  continueButton.classList.add("modal-button");
  continueButton.textContent = "Continuar";
  continueButton.addEventListener("click", async () => {
    try {
      await auth.signOut();
      window.location.href = "index.html";
    } catch {
      alert("Error al cerrar sesión. Intenta de nuevo.");
    }
  });

  modalContent.append(modalMessage, continueButton);
  logoutModal.appendChild(modalContent);
  document.body.appendChild(logoutModal);

  // --- Control de acceso y saludo ---
  // --- Control de acceso y saludo ---
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = "index.html";
    const emailName = user.email.trim().split("@")[0];
    let displayName = emailName;

    try {
      const doc = await db.collection("userMap").doc(emailName).get();
      if (doc.exists && doc.data().nombre) {
        displayName = doc.data().nombre;
      }
      statusMessageElem.textContent = `Bienvenido, ${displayName}`;

      // ——— Lógica Inteligente de Inicio de Labores ———
      checkActiveSession(displayName);

    } catch (e) {
      console.error("Error obteniendo nombre de usuario:", e);
      statusMessageElem.textContent = `Bienvenido, ${emailName}`;
      // Intentamos chequear sesión con el emailName si falla lo otro
      checkActiveSession(emailName);
    }
  });

  // Función para verificar si ya existe sesión activa
  // Función para verificar si ya existe sesión activa
  async function checkActiveSession(usuarioNombre) {
    const checkingOverlay = document.getElementById("checking-session-overlay");
    try {
      const snapshot = await db.collection('conexiones')
        .where('usuario', '==', usuarioNombre)
        .where('estado', '==', 'activo')
        .get();

      if (snapshot.empty) {
        // No tiene sesión activa -> Ocultar spinner y mostrar Modal Inicio
        if (checkingOverlay) checkingOverlay.style.display = "none";
        showStartWorkModal(usuarioNombre);
      } else {
        console.log("Usuario ya tiene sesión activa.");
        // Tiene sesión y es activo -> Ocultar spinner y permitir uso
        if (checkingOverlay) checkingOverlay.style.display = "none";
      }
    } catch (error) {
      console.error("Error verificando sesiones activas:", error);
      // En error, ocultar bloqueo
      if (checkingOverlay) checkingOverlay.style.display = "none";
    }
  }

  // Función para mostrar el modal y manejar eventos
  function showStartWorkModal(usuarioNombre) {
    const startModal = document.getElementById("start-work-modal");
    const confirmBtn = document.getElementById("start-work-confirm");
    const cancelBtn = document.getElementById("start-work-cancel");
    const checkingOverlay = document.getElementById("checking-session-overlay");

    if (!startModal) return;

    // Asegurar que spinner ya no esté
    if (checkingOverlay) checkingOverlay.style.display = "none";

    startModal.style.display = "flex";

    // Manejadores de eventos (usamos 'once' para evitar duplicados si se llama varias veces)
    confirmBtn.onclick = () => {
      confirmBtn.textContent = "Obteniendo ubicación...";
      confirmBtn.disabled = true;

      if (!navigator.geolocation) {
        alert("Tu navegador no soporta geolocalización.");
        saveSession(usuarioNombre, "No soportado");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const ubicacion = `${lat}, ${lng}`;
          saveSession(usuarioNombre, ubicacion);
        },
        (error) => {
          console.warn("Error GPS:", error);
          saveSession(usuarioNombre, "Ubicación denegada/error");
        }
      );
    };

    cancelBtn.onclick = () => {
      startModal.style.display = "none";
    };
  }

  // Función para guardar en Firestore con Zona Horaria Perú
  function saveSession(usuario, ubicacion) {
    const startModal = document.getElementById("start-work-modal");

    // Obtener fecha y hora en Perú
    const now = new Date();

    // Formateadores para 'America/Lima'
    const dateOptions = { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' };
    const timeOptions = { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

    const fechaPeru = new Intl.DateTimeFormat('es-PE', dateOptions).format(now); // "dd/mm/yyyy"
    const horaPeru = new Intl.DateTimeFormat('es-PE', timeOptions).format(now); // "HH:mm:ss"

    db.collection('conexiones').add({
      fecha: fechaPeru,
      hora: horaPeru,
      usuario: usuario,
      ubicacion: ubicacion,
      estado: 'activo',
      timestamp: firebase.firestore.FieldValue.serverTimestamp() // Para ordenamiento interno si se requiere
    })
      .then(() => {
        console.log("Sesión iniciada correctamente.");
        startModal.style.display = "none";
        alert(`¡Bienvenido! Inicio de labores registrado a las ${horaPeru}.`);
      })
      .catch((error) => {
        console.error("Error guardando conexión:", error);
        alert("Hubo un error al registrar el inicio. Inténtalo de nuevo.");
        const confirmBtn = document.getElementById("start-work-confirm");
        if (confirmBtn) {
          confirmBtn.textContent = "Iniciar Labores";
          confirmBtn.disabled = false;
        }
      });
  }

  // --- Ripple efecto táctil en todos los botones ---
  document.querySelectorAll(".menu-button").forEach(btn => {
    const ripple = e => {
      const rect = btn.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      btn.style.setProperty("--ripple-x", `${x}px`);
      btn.style.setProperty("--ripple-y", `${y}px`);
    };
    btn.addEventListener("click", ripple);
    btn.addEventListener("touchstart", ripple, { passive: true });
  });

  // --- Navegación a páginas ---
  checklistBtn.addEventListener("click", () => window.location.href = "checklist.html");
  planEjerciciosBtn.addEventListener("click", () => window.location.href = "ejercicios.html");
  contactosBtn.addEventListener("click", () => window.location.href = "contactos.html");
  evidenciaBtn.addEventListener("click", () => window.location.href = "evidencia-ejercicios.html");
  reporteBtn.addEventListener("click", () => window.location.href = "reporte-incidencias.html");
  logoutBtn.addEventListener("click", () => logoutModal.style.display = "flex");

  // --- Cerrar modal con Escape o clic fuera ---
  document.addEventListener("keydown", e => {
    if (e.key === "Escape") logoutModal.style.display = "none";
  });
  logoutModal.addEventListener("click", e => {
    if (e.target === logoutModal) logoutModal.style.display = "none";
  });
});
