function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getIdFromQuery() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  return id ? Number(id) : null;
}

function showMsg(type, text) {
  const el = document.getElementById("msg");
  el.innerHTML = `<div class="alert alert-${type}">${escapeHtml(text)}</div>`;
}

async function fetchMe() {
  const res = await fetch("/auth/me");
  if (!res.ok) return null;
  return res.json();
}

async function fetchCard(id) {
  const res = await fetch(`/cards/${id}`);
  if (!res.ok) throw new Error("Kart bulunamadı");
  return res.json();
}

function fillForm(card) {
  const form = document.getElementById("editCardForm");
  form.title.value = card.title ?? "";
  form.category.value = card.category ?? "";
  form.edition.value = card.edition ?? "";
  form.psa.value = card.psa ?? "";
  form.price.value = card.price ?? "";
  form.sellerEmail.value = card.sellerEmail ?? "";
}

function getPayloadFromForm() {
  const form = document.getElementById("editCardForm");
  return {
    title: form.title.value.trim(),
    category: form.category.value.trim(),
    edition: form.edition.value.trim(),
    psa: form.psa.value.trim(),
    price: Number(form.price.value),
    sellerEmail: form.sellerEmail.value.trim(),
  };
}

async function init() {
  const id = getIdFromQuery();
  if (!id) {
    showMsg("danger", "Geçersiz ilan id");
    return;
  }

  const me = await fetchMe();
  if (!me) {
    showMsg("warning", "İlanı düzenlemek için giriş yapmalısın.");
    setTimeout(() => (window.location.href = "/login.html"), 800);
    return;
  }

  try {
    const card = await fetchCard(id);

    // yetki kontrolü (front-end)
    if (Number(card.ownerId) !== Number(me.id)) {
      showMsg("danger", "Bu ilanı düzenleme yetkin yok.");
      document.getElementById("editCardForm").querySelectorAll("input,select,button").forEach(x => x.disabled = true);
      return;
    }

    fillForm(card);

    // iptal butonu detaya dönsün
    document.getElementById("cancelBtn").href = `/card-detail.html?id=${id}`;

    document.getElementById("editCardForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const payload = getPayloadFromForm();

      // basit validasyon
      if (!payload.title || !payload.category || !payload.sellerEmail || Number.isNaN(payload.price)) {
        showMsg("warning", "Lütfen zorunlu alanları doldur.");
        return;
      }

      const res = await fetch(`/cards/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        showMsg("danger", data.message || "Güncelleme başarısız");
        return;
      }

      showMsg("success", "İlan güncellendi. Yönlendiriliyorsun...");
      setTimeout(() => (window.location.href = `/card-detail.html?id=${id}`), 600);
    });

  } catch (err) {
    console.error(err);
    showMsg("danger", err.message || "Bir hata oluştu");
  }
}

document.addEventListener("DOMContentLoaded", init);
