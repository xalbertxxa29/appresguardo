// evidencia-ejercicios.js
// Cámara optimizada: Captura local -> Subida diferida

document.addEventListener("DOMContentLoaded", () => {
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();
  const welcomeMsg = document.getElementById("welcome-message");
  const rutinaSelect = document.getElementById("rutina-select");
  const cameraBtn = document.getElementById("camera-btn");
  const enviarBtn = document.getElementById("enviar-btn");
  const backBtn = document.getElementById("back-btn");
  const photoPreview = document.getElementById("photo-preview");

  let currentPhotoBlob = null; // Almacena el blob localmente
  let displayName = "";

  // — Verificar sesión y mostrar nombre —
  auth.onAuthStateChanged(async user => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    const key = user.email.split("@")[0].trim();
    try {
      const doc = await db.collection("userMap").doc(key).get();
      displayName = doc.exists && doc.data().nombre
        ? doc.data().nombre
        : key;
    } catch {
      displayName = key;
    }
    welcomeMsg.textContent = `Bienvenido, ${displayName}`;
  });

  // — Abrir cámara y capturar foto (Local) —
  cameraBtn.addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      const video = document.createElement("video");
      video.srcObject = stream;
      video.setAttribute("playsinline", "true"); // Importante para iOS
      await video.play();

      // Crear Overlay
      const overlay = document.createElement("div");
      overlay.className = "capture-container";

      // Estructura interna
      overlay.innerHTML = `
            <div style="position:relative; width:100%; max-width:360px; display:flex; flex-direction:column; align-items:center;">
                <video id="camera-feed" style="width:100%; border-radius:8px; box-shadow:0 4px 20px rgba(0,0,0,0.5);"></video>
                <div style="margin-top:20px;">
                    <button id="capture-trigger" style="
                        background-color: #ff3b30; 
                        color: white; 
                        border: 4px solid white; 
                        border-radius: 50%; 
                        width: 70px; 
                        height: 70px; 
                        font-size: 0;
                        box-shadow: 0 4px 10px rgba(0,0,0,0.5);
                        cursor: pointer;">
                    Capturar
                    </button>
                    <button id="close-camera" style="
                        margin-left: 20px;
                        background: #333;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 20px;
                        font-weight: bold;
                        cursor: pointer;">
                    Cancelar
                    </button>
                </div>
            </div>
        `;

      document.body.appendChild(overlay);
      const videoEl = overlay.querySelector("#camera-feed");
      videoEl.srcObject = stream;
      videoEl.play();

      // Botón Capturar
      const triggerBtn = overlay.querySelector("#capture-trigger");
      triggerBtn.addEventListener("click", () => {
        const canvas = document.createElement("canvas");
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        canvas.getContext("2d").drawImage(videoEl, 0, 0);

        canvas.toBlob(blob => {
          currentPhotoBlob = blob; // Guardar en memoria

          // Crear URL local para preview
          const localURL = URL.createObjectURL(blob);
          photoPreview.src = localURL;
          photoPreview.style.display = "block";

          // Limpieza
          stream.getTracks().forEach(t => t.stop());
          document.body.removeChild(overlay);
        }, "image/jpeg", 0.8); // Calidad 0.8
      });

      // Botón Cancelar
      overlay.querySelector("#close-camera").addEventListener("click", () => {
        stream.getTracks().forEach(t => t.stop());
        document.body.removeChild(overlay);
      });

    } catch (err) {
      console.error("Error cámara:", err);
      alert("No se pudo acceder a la cámara.");
    }
  });

  // — Enviar datos (Subida a Firebase) —
  enviarBtn.addEventListener("click", async () => {
    // Validaciones
    if (!rutinaSelect.value) {
      alert("Debes seleccionar una rutina.");
      return;
    }
    if (!currentPhotoBlob) {
      alert("Debes tomar una foto primero.");
      return;
    }

    const rutina = rutinaSelect.options[rutinaSelect.selectedIndex].text;

    // Overlay de carga
    const loaderOverlay = document.createElement("div");
    loaderOverlay.className = "fullscreen-loader";
    loaderOverlay.innerHTML = `<span class="loader"></span>`;
    document.body.appendChild(loaderOverlay);

    try {
      // 1. Subir imagen a Firebase Storage
      const filename = `ejercicios/${Date.now()}.jpg`;
      const ref = storage.ref(filename);

      await ref.put(currentPhotoBlob);
      const downloadURL = await ref.getDownloadURL();

      // 2. Guardar metadata en Firestore
      await db.collection("ejercicios").add({
        rutina,
        photoURL: downloadURL,
        user: displayName,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });

      setTimeout(() => {
        window.location.href = "menu.html";
      }, 500);

    } catch (err) {
      console.error("Error al enviar:", err);
      document.body.removeChild(loaderOverlay);
      alert("Error enviando evidencia. Verifica tu conexión.");
    }
  });

  // — Botón Atrás —
  backBtn.addEventListener("click", () => {
    window.location.href = "menu.html";
  });
});