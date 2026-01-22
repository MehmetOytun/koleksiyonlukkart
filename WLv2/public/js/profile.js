function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Şifre kuralı: 8+ / büyük / küçük / sayı / işaret
function validatePassword(pw) {
  const p = String(pw || "");
  if (p.length < 8) return "Şifre en az 8 karakter olmalı.";
  if (!/[A-Z]/.test(p)) return "Şifre en az 1 büyük harf içermeli.";
  if (!/[a-z]/.test(p)) return "Şifre en az 1 küçük harf içermeli.";
  if (!/[0-9]/.test(p)) return "Şifre en az 1 sayı içermeli.";
  // “işaret” için en basit: harf-rakam olmayan karakter
  if (!/[^a-zA-Z0-9]/.test(p)) return "Şifre en az 1 işaret (özel karakter) içermeli.";
  return null;
}

function showAlert(type, msg) {
  const el = document.getElementById("pageAlert");
  el.innerHTML = `
    <div class="alert alert-${type}">${escapeHtml(msg)}</div>
  `;
}

async function loadUserOrRedirect() {
  const res = await fetch("/auth/me");
  if (!res.ok) {
    // giriş yoksa login’e
    window.location.href = "/login.html";
    return null;
  }
  const user = await res.json();
  document.getElementById("profileUsername").textContent = user.username || "-";
  document.getElementById("profileEmail").textContent = user.email || "-";

  // navbar sağa “Merhaba, {ad}” dropdown (profil sayfasında da aynı his)
  const nav = document.getElementById("navAuthArea");
  nav.innerHTML = `
    <div class="dropdown">
      <span class="fw-semibold text-dark">Merhaba,</span>
      <button class="user-dd-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
        ${escapeHtml(user.username)}
      </button>
      <ul class="dropdown-menu dropdown-menu-end">
        <li><a class="dropdown-item" href="/add-card.html">İlan Ver</a></li>
        <li><a class="dropdown-item" href="/?mine=1">İlanlarım</a></li>
        <li><a class="dropdown-item active" href="/profile.html">Profil</a></li>
        <li><hr class="dropdown-divider"></li>
        <li><button id="navLogoutBtn" class="dropdown-item text-danger" type="button">Çıkış</button></li>
      </ul>
    </div>
  `;

  document.getElementById("navLogoutBtn").addEventListener("click", async () => {
    await fetch("/auth/logout", { method: "POST" });
    window.location.href = "/";
  });

  return user;
}

async function handleLogout() {
  await fetch("/auth/logout", { method: "POST" });
  window.location.href = "/";
}

async function handleChangePassword(e) {
  e.preventDefault();

  const form = document.getElementById("changePasswordForm");
  form.classList.add("was-validated");

  const oldPassword = document.getElementById("oldPassword").value;
  const newPassword = document.getElementById("newPassword").value;
  const newPassword2 = document.getElementById("newPassword2").value;
  const hint = document.getElementById("pwHint");
  hint.textContent = "";

  if (!form.checkValidity()) return;

  if (newPassword !== newPassword2) {
    showAlert("danger", "Yeni şifreler eşleşmiyor.");
    return;
  }

  const ruleErr = validatePassword(newPassword);
  if (ruleErr) {
    showAlert("warning", ruleErr);
    return;
  }

  const res = await fetch("/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ oldPassword, newPassword })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    showAlert("danger", data.message || "Şifre değiştirilemedi.");
    return;
  }

  showAlert("success", "Şifre başarıyla değiştirildi.");
  form.reset();
  form.classList.remove("was-validated");
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadUserOrRedirect();

  document.getElementById("logoutBtn").addEventListener("click", handleLogout);
  document.getElementById("changePasswordForm").addEventListener("submit", handleChangePassword);
});