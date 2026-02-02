// reporte-incidencias.js

document.addEventListener("DOMContentLoaded", () => {
    const auth         = firebase.auth();
    const db           = firebase.firestore();
    const storage      = firebase.storage();
    const welcomeMsg   = document.getElementById("welcome-message");
    const descArea     = document.getElementById("desc-textarea");
    const cameraBtn    = document.getElementById("camera-btn");
    const enviarBtn    = document.getElementById("enviar-btn");
    const backBtn      = document.getElementById("back-btn");
    const photoPreview = document.getElementById("photo-preview");
  
    let photoURL = "";
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
            const ref = storage.ref(`incidencias/${Date.now()}.jpg`);
            await ref.put(blob);
            photoURL = await ref.getDownloadURL();
            photoPreview.src = photoURL;
            photoPreview.style.display = "block";
            stream.getTracks().forEach(t => t.stop());
            document.body.removeChild(overlay);
          }, "image/jpeg");
        }, { once: true });
  
      } catch (err) {
        console.error("Error cámara:", err);
        alert("No se pudo acceder a la cámara.");
      }
    });
  
    // Enviar reporte con overlay loader
    enviarBtn.addEventListener("click", async () => {
      const desc = descArea.value.trim();
      if (!desc) {
        alert("Debes escribir una descripción.");
        return;
      }
      if (!photoURL) {
        alert("Debes tomar una foto primero.");
        return;
      }
  
      const overlay = document.createElement("div");
      overlay.className = "fullscreen-loader";
      overlay.innerHTML = `<span class="loader"></span>`;
      document.body.appendChild(overlay);
  
      try {
        await db.collection("incidencias").add({
          descripción: desc,
          photoURL,
          user: displayName,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString(),
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        setTimeout(() => {
          window.location.href = "menu.html";
        }, 800);
  
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
  