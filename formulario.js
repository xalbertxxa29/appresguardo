document.addEventListener("DOMContentLoaded", () => {
  const auth            = firebase.auth();
  const db              = firebase.firestore();
  const welcomeEl       = document.getElementById("welcome-message");
  const items           = document.querySelectorAll(".reveal");
  const form            = document.getElementById("checklist-form");
  const backBtn         = document.getElementById("back-btn");
  const lottieModal     = document.getElementById("lottie-modal");
  const lottieContainer = document.getElementById("lottie-container");

  let displayName = null;

  // Guardia de sesión y obtención de nombre
  auth.onAuthStateChanged(async user => {
    if (!user) {
      window.location.href = "index.html";
      return;
    }
    const id = user.email.trim().split("@")[0];
    try {
      const doc = await db.collection("userMap").doc(id).get();
      displayName = doc.exists && doc.data().nombre ? doc.data().nombre : id;
    } catch (e) {
      console.error("Error al leer userMap:", e);
      displayName = id;
    }
    welcomeEl.classList.remove("skeleton");
    welcomeEl.style.animation = "";
    welcomeEl.textContent = `Bienvenido, ${displayName}`;
  });

  // Reveal on scroll
  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });
  items.forEach(item => io.observe(item));

  // Efecto typing
  welcomeEl.style.animation = "typing 1.5s steps(30,end) forwards, blink .7s step-end infinite";

  // Envío del formulario con Lottie y guardado
  form.addEventListener("submit", e => {
    e.preventDefault();
    lottieModal.style.display = "flex";
    const anim = lottie.loadAnimation({
      container: lottieContainer,
      renderer: "svg",
      loop: false,
      autoplay: true,
      path: "https://assets10.lottiefiles.com/packages/lf20_jbrw3hcz.json"
    });
    anim.addEventListener("complete", async () => {
      lottieModal.style.display = "none";

      // Recolectar cada pregunta (texto completo) y su respuesta
      const result = {};
      document.querySelectorAll('.radio-group').forEach(group => {
        const question = group.querySelector('.question').textContent.trim();
        const checked = group.querySelector('input[type="radio"]:checked');
        result[question] = checked ? checked.value : null;
      });

      // Fecha y hora local del equipo
      const now = new Date();
      result["Fecha"] = now.toLocaleDateString();
      result["Hora"]  = now.toLocaleTimeString();

      // Info de usuario
      result["Usuario ID"]     = auth.currentUser.email.split("@")[0];
      result["Usuario Nombre"] = displayName;
      result["timestamp"]      = firebase.firestore.FieldValue.serverTimestamp();

      // Guardar en Firestore
      try {
        await db.collection("checklists").add(result);
        console.log("Checklist guardado:", result);
      } catch (err) {
        console.error("Error guardando checklist:", err);
      }

      // Redirigir al menú
      window.location.href = "menu.html";
    });
  });

  // Botón Atrás
  backBtn.addEventListener("click", () => {
    window.location.href = "tipo.html";
  });
});
