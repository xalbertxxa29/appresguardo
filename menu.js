// menu.js
// Versión actualizada con Cierre de Sesión Inteligente y Sistema de Turnos GPS
// + Notificaciones estéticas (sin alert)

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

  let currentUserDisplayName = "";

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

  // --- Control de acceso y saludo ---
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = "index.html";
    const emailName = user.email.trim().split("@")[0];
    currentUserDisplayName = emailName; // Default

    try {
      const doc = await db.collection("userMap").doc(emailName).get();
      if (doc.exists && doc.data().nombre) {
        currentUserDisplayName = doc.data().nombre;
      }
      statusMessageElem.textContent = `Bienvenido, ${currentUserDisplayName}`;

      // ——— Lógica Inteligente de Inicio de Labores ———
      checkActiveSession(currentUserDisplayName);

    } catch (e) {
      console.error("Error obteniendo nombre de usuario:", e);
      statusMessageElem.textContent = `Bienvenido, ${emailName}`;
      checkActiveSession(emailName);
    }
  });

  // ——— Helper para Mostrar Notificación Estética ———
  function showNotification(title, message, isError = false) {
    const modal = document.getElementById("notification-modal");
    const titleEl = document.getElementById("notification-title");
    const msgEl = document.getElementById("notification-message");
    const okBtn = document.getElementById("notification-ok-btn");
    const iconEl = modal.querySelector("div[style*='font-size: 3rem']");

    if (!modal) return alert(message); // Fallback

    titleEl.textContent = title;
    msgEl.innerHTML = message; // Permitir HTML para saltos de línea

    if (isError) {
      titleEl.style.color = "#d32f2f";
      okBtn.style.backgroundColor = "#d32f2f";
      iconEl.textContent = "❌";
    } else {
      titleEl.style.color = "#28a745";
      okBtn.style.backgroundColor = "#28a745";
      iconEl.textContent = "✅";
    }

    modal.style.display = "flex";

    // Manejo del botón OK
    // Clone node para eliminar listeners viejos
    const newOkBtn = okBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);

    newOkBtn.onclick = () => {
      modal.style.display = "none";
    };
    newOkBtn.focus();
  }

  // Función para verificar si ya existe sesión activa (Inicio de Turno)
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
      // En error, ocultar bloqueo para no trabar app
      if (checkingOverlay) checkingOverlay.style.display = "none";
    }
  }

  // Función para mostrar el modal de INICIO
  function showStartWorkModal(usuarioNombre) {
    const startModal = document.getElementById("start-work-modal");
    const confirmBtn = document.getElementById("start-work-confirm");
    const cancelBtn = document.getElementById("start-work-cancel");
    const checkingOverlay = document.getElementById("checking-session-overlay");

    if (!startModal) return;

    if (checkingOverlay) checkingOverlay.style.display = "none";
    startModal.style.display = "flex";

    confirmBtn.onclick = () => {
      confirmBtn.textContent = "Obteniendo ubicación...";
      confirmBtn.disabled = true;

      if (!navigator.geolocation) {
        showNotification("Error GPS", "Tu navegador no soporta geolocalización.", true);
        saveSession(usuarioNombre, "No soportado", "inicio");
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const ubicacion = `${lat}, ${lng}`;
          saveSession(usuarioNombre, ubicacion, "inicio");
        },
        (error) => {
          console.warn("Error GPS:", error);
          saveSession(usuarioNombre, "Ubicación denegada/error", "inicio");
        }
      );
    };

    cancelBtn.onclick = () => {
      startModal.style.display = "none";
    };
  }

  // ——— LÓGICA DE CIERRE DE SESIÓN INTELIGENTE ———
  logoutBtn.addEventListener("click", () => handleLogout(currentUserDisplayName));

  async function handleLogout(usuarioNombre) {
    const checkingOverlay = document.getElementById("checking-session-overlay");
    const logoutModal = document.getElementById("logout-confirm-modal");
    const logoutMsg = document.getElementById("logout-message");
    const confirmBtn = document.getElementById("logout-confirm-btn");
    const cancelBtn = document.getElementById("logout-cancel-btn");

    if (!logoutModal) return;

    // 1. Mostrar spinner mientras consultamos
    if (checkingOverlay) {
      checkingOverlay.querySelector("h2").textContent = "Verificando cierre...";
      checkingOverlay.style.display = "flex";
    }

    try {
      // 2. Buscar si hay documento 'activo' en 'conexiones'
      // NOTA: Se eliminó .orderBy("timestamp", "desc") para evitar requerir un índice compuesto
      // que cause el error "The query requires an index".
      const snapshot = await db.collection('conexiones')
        .where('usuario', '==', usuarioNombre)
        .where('estado', '==', 'activo')
        .limit(1)
        .get();

      if (checkingOverlay) checkingOverlay.style.display = "none"; // Ocultar spinner

      // 3. Configurar Modal
      logoutModal.style.display = "flex";

      let docIdToClose = null;

      if (!snapshot.empty) {
        // ESCENARIO: SI HAY TURNO ACTIVO
        docIdToClose = snapshot.docs[0].id; // ID del documento a cerrar
        logoutMsg.innerHTML = `Identificamos que tu turno sigue <b>ACTIVO</b>.<br><br>
                                 Al cerrar sesión estás indicando que terminaste tu horario de trabajo.<br>
                                 Se registrará tu hora y ubicación de salida.<br><br>
                                 ¿Deseas finalizar el turno y salir?`;
      } else {
        // ESCENARIO: NO HAY TURNO ACTIVO (Solo visualizó)
        docIdToClose = null;
        logoutMsg.innerHTML = `No se encontró un registro de inicio de labores activo.<br><br>
                                 Si cierras sesión ahora, <b>NO</b> se guardará registro de tiempo de trabajo.<br><br>
                                 ¿Deseas salir de todas formas?`;
      }

      // 4. Manejadores del Modal de Cierre

      // Limpiar eventos anteriores para evitar duplicados si reabre
      const newConfirm = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirm, confirmBtn);

      const newCancel = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

      newCancel.onclick = () => {
        logoutModal.style.display = "none";
      };

      newConfirm.onclick = async () => {
        newConfirm.textContent = "Procesando...";
        newConfirm.disabled = true;

        if (docIdToClose) {
          // CERRAR TURNO: Pedir GPS y Actualizar
          if (!navigator.geolocation) {
            await closeSessionRequest(docIdToClose, "No soportado");
          } else {
            navigator.geolocation.getCurrentPosition(
              async (pos) => {
                const loc = `${pos.coords.latitude}, ${pos.coords.longitude}`;
                await closeSessionRequest(docIdToClose, loc);
              },
              async (err) => {
                console.warn(err);
                await closeSessionRequest(docIdToClose, "Ubicación denegada/error");
              }
            );
          }
        } else {
          // SALIDA SIMPLE (Sin turno)
          performFirebaseLogout();
        }
      };

    } catch (error) {
      console.error("Error al verificar cierre:", error);
      if (checkingOverlay) checkingOverlay.style.display = "none";
      // Uso de showNotification en lugar de alert
      showNotification("Error", "Ocurrió un error al verificar tu estado. Intenta de nuevo.", true);
    }
  }

  async function closeSessionRequest(docId, ubicacionSalida) {
    // Obtener fecha y hora en Perú
    const now = new Date();
    const dateOptions = { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' };
    const timeOptions = { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

    const fechaSalida = new Intl.DateTimeFormat('es-PE', dateOptions).format(now);
    const horaSalida = new Intl.DateTimeFormat('es-PE', timeOptions).format(now);

    try {
      await db.collection('conexiones').doc(docId).update({
        estado: 'cerrado',
        fecha_salida: fechaSalida,
        hora_salida: horaSalida,
        ubicacion_salida: ubicacionSalida,
        ended_at: firebase.firestore.FieldValue.serverTimestamp()
      });
      console.log("Turno cerrado correctamente.");
      performFirebaseLogout();
    } catch (e) {
      console.error("Error cerrando turno:", e);
      showNotification("Error", "No se pudo cerrar el turno en base de datos. Revisa tu conexión.", true);
      const confirmBtn = document.getElementById("logout-confirm-btn");
      if (confirmBtn) {
        confirmBtn.textContent = "Aceptar y Salir";
        confirmBtn.disabled = false;
      }
    }
  }

  function performFirebaseLogout() {
    auth.signOut().then(() => {
      window.location.href = "index.html";
    }).catch(e => {
      console.error(e);
      showNotification("Error", "Error al desconectar de Firebase.", true);
    });
  }

  // Función GENERICA para guardar sesión (Usada solo en INICIO)
  function saveSession(usuario, ubicacion, tipo) {
    if (tipo !== "inicio") return; // Solo lógica de inicio aquí

    const startModal = document.getElementById("start-work-modal");

    const now = new Date();
    const dateOptions = { timeZone: 'America/Lima', day: '2-digit', month: '2-digit', year: 'numeric' };
    const timeOptions = { timeZone: 'America/Lima', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };

    const fechaPeru = new Intl.DateTimeFormat('es-PE', dateOptions).format(now);
    const horaPeru = new Intl.DateTimeFormat('es-PE', timeOptions).format(now);

    db.collection('conexiones').add({
      fecha: fechaPeru,
      hora: horaPeru,
      usuario: usuario,
      ubicacion: ubicacion,
      estado: 'activo',
      timestamp: firebase.firestore.FieldValue.serverTimestamp()
    })
      .then(() => {
        console.log("Sesión iniciada correctamente.");
        if (startModal) startModal.style.display = "none";

        // REEMPLAZO DE ALERT POR NOTIFICACIÓN PERSONALIZADA
        showNotification("¡Bienvenido!", `Inicio de labores registrado a las <b>${horaPeru}</b>.`);
      })
      .catch((error) => {
        console.error("Error guardando conexión:", error);
        showNotification("Error", "Hubo un error al registrar el inicio. Inténtalo de nuevo.", true);

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
  // Logout ahora manejado por el listener de arriba 'handleLogout'

  // --- Cerrar modal Logout con Escape ---
  document.addEventListener("keydown", e => {
    const logoutM = document.getElementById("logout-confirm-modal");
    const notifM = document.getElementById("notification-modal");

    if (e.key === "Escape") {
      if (logoutM && logoutM.style.display === "flex") logoutM.style.display = "none";
      if (notifM && notifM.style.display === "flex") notifM.style.display = "none";
    }
  });
});
