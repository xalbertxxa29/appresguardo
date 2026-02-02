// evidencia-ejercicios.js

document.addEventListener("DOMContentLoaded", () => {
    const auth         = firebase.auth();
    const db           = firebase.firestore();
    const storage      = firebase.storage();
    const welcomeMsg   = document.getElementById("welcome-message");
    const rutinaSelect = document.getElementById("rutina-select");
    const cameraBtn    = document.getElementById("camera-btn");
    const enviarBtn    = document.getElementById("enviar-btn");
    const backBtn      = document.getElementById("back-btn");
    const photoPreview = document.getElementById("photo-preview");
  
    let photoURL = "";
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
  
    // — Abrir cámara y capturar foto —
    cameraBtn.addEventListener("click", async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }
        });
        const video = document.createElement("video");
        video.srcObject = stream;
        await video.play();
  
        const overlay = document.createElement("div");
        overlay.className = "capture-container";
        overlay.appendChild(video);
        document.body.appendChild(overlay);
  
        video.addEventListener("click", () => {
          const canvas = document.createElement("canvas");
          canvas.width  = video.videoWidth;
          canvas.height = video.videoHeight;
          canvas.getContext("2d").drawImage(video, 0, 0);
          canvas.toBlob(async blob => {
            const ref = storage.ref(`ejercicios/${Date.now()}.jpg`);
            await ref.put(blob);
            photoURL = await ref.getDownloadURL();
            photoPreview.src = photoURL;
            photoPreview.style.display = "block";
            // Detener cámara y cerrar overlay
            stream.getTracks().forEach(t => t.stop());
            document.body.removeChild(overlay);
          }, "image/jpeg");
        }, { once: true });
  
      } catch (err) {
        console.error("Error cámara:", err);
        alert("No se pudo acceder a la cámara.");
      }
    });
  
    // — Enviar datos con overlay de carga obligatoria —
    enviarBtn.addEventListener("click", async () => {
      // Validaciones obligatorias
      if (!rutinaSelect.value) {
        alert("Debes seleccionar una rutina.");
        return;
      }
      if (!photoURL) {
        alert("Debes tomar una foto primero.");
        return;
      }
  
      // Obtener la rutina seleccionada
      const rutina = rutinaSelect.options[rutinaSelect.selectedIndex].text;
  
      // Crear y mostrar overlay full-screen
      const loaderOverlay = document.createElement("div");
      loaderOverlay.className = "fullscreen-loader";
      loaderOverlay.innerHTML = `<span class="loader"></span>`;
      document.body.appendChild(loaderOverlay);
  
      try {
        await db.collection("ejercicios").add({
          rutina,
          photoURL,
          user: displayName,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        // Breve delay para que se note el loader
        setTimeout(() => {
          window.location.href = "menu.html";
        }, 800);
  
      } catch (err) {
        console.error("Error al enviar:", err);
        document.body.removeChild(loaderOverlay);
        alert("Error enviando evidencia.");
      }
    });
  
    // — Botón Atrás —
    backBtn.addEventListener("click", () => {
      window.location.href = "menu.html";
    });
  });
  
  