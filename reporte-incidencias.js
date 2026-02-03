// reporte-incidencias.js
// Cámara optimizada: Captura local -> Subida diferida

document.addEventListener("DOMContentLoaded", () => {
  const auth = firebase.auth();
  const db = firebase.firestore();
  const storage = firebase.storage();
  const welcomeMsg = document.getElementById("welcome-message");
  const descArea = document.getElementById("desc-textarea");
  const cameraBtn = document.getElementById("camera-btn");
  const enviarBtn = document.getElementById("enviar-btn");
  const backBtn = document.getElementById("back-btn");
  const photoPreview = document.getElementById("photo-preview");

  let currentPhotoBlob = null;
  let displayName = "";

  // Verificar sesión y cargar nombre
  auth.onAuthStateChanged(async user => {
    if (!user) return window.location.href = "index.html";
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

  // Cámara y captura
  cameraBtn.addEventListener("click", async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });

      // Crear Overlay Personalizado
      const overlay = document.createElement("div");
      overlay.className = "capture-container";
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
      videoEl.setAttribute("playsinline", "true");
      await videoEl.play();

      // Evento Capturar
      overlay.querySelector("#capture-trigger").addEventListener("click", () => {
        const canvas = document.createElement("canvas");
        canvas.width = videoEl.videoWidth;
        canvas.height = videoEl.videoHeight;
        canvas.getContext("2d").drawImage(videoEl, 0, 0);

        canvas.toBlob(blob => {
          currentPhotoBlob = blob; // Guardar localmente
          const localURL = URL.createObjectURL(blob);
          photoPreview.src = localURL;
          photoPreview.style.display = "block";

          stream.getTracks().forEach(t => t.stop());
          document.body.removeChild(overlay);
        }, "image/jpeg", 0.8);
      });

      // Evento Cancelar
      overlay.querySelector("#close-camera").addEventListener("click", () => {
        stream.getTracks().forEach(t => t.stop());
        document.body.removeChild(overlay);
      });

    } catch (err) {
      console.error("Error cámara:", err);
      alert("No se pudo acceder a la cámara.");
    }
  });

  // Enviar reporte
  enviarBtn.addEventListener("click", async () => {
    const desc = descArea.value.trim();
    if (!desc) {
      alert("Debes escribir una descripción.");
      return;
    }
    if (!currentPhotoBlob) {
      alert("Debes tomar una foto primero.");
      return;
    }

    const overlay = document.createElement("div");
    overlay.className = "fullscreen-loader";
    overlay.innerHTML = `<span class="loader"></span>`;
    document.body.appendChild(overlay);

    try {
      // 1. Subir imagen
      const filename = `incidencias/${Date.now()}.jpg`;
      const ref = storage.ref(filename);
      await ref.put(currentPhotoBlob);
      const downloadURL = await ref.getDownloadURL();

      // 2. Guardar datos
      await db.collection("incidencias").add({
        descripción: desc,
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
      document.body.removeChild(overlay);
      alert("Error enviando incidencia.");
    }
  });

  // Volver al menú
  backBtn.addEventListener("click", () => {
    window.location.href = "menu.html";
  });
});