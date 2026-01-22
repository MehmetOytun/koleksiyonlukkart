async function requireLogin() {
  const res = await fetch("/auth/me");
  if (!res.ok) {
    window.location.href = "/login.html";
    return false;
  }
  return true;
}

const form = document.getElementById("addCardForm");
const msg = document.getElementById("msg");

function showMessage(type, text) {
  msg.innerHTML = `<div class="alert alert-${type}">${text}</div>`;
}

document.addEventListener("DOMContentLoaded", async () => {
  await requireLogin();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  //3 fotoğraf sınırı
  const fileInput = form.querySelector('input[name="images"]');
  if (fileInput && fileInput.files && fileInput.files.length > 3) {
    showMessage("danger", "En fazla 3 fotoğraf seçebilirsin.");
    return;
  }

  //multipart/form-data gönderimi
  const fd = new FormData(form);

  // (İsteğe bağlı) fiyat boş değilse sayı gibi gönderelim
  const price = fd.get("price");
  if (price !== null && price !== "") {
    fd.set("price", String(Number(price)));
  }

  try {
    const res = await fetch("/cards", {
      method: "POST",
      body: fd // headers YOK! tarayıcı boundary'i kendi ayarlar
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      showMessage("danger", data.message || "Kart eklenemedi.");
      return;
    }

    showMessage("success", "Kart eklendi! Anasayfaya yönlendiriliyorsun...");

    setTimeout(() => {
      window.location.href = "/";
    }, 900);

  } catch (err) {
    console.error(err);
    showMessage("danger", "Sunucuya bağlanılamadı.");
  }
});