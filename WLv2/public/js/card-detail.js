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

function buildImageUrls(card) {
  const placeholder = "https://via.placeholder.com/600x900?text=No+Image";

  if (Array.isArray(card.images) && card.images.length > 0) {
    // images: ["file.jpg", ...]
    return card.images.slice(0, 3).map(fn => `/uploads/${fn}`);
  }
  return [placeholder];
}

function setActiveThumb(index) {
  document.querySelectorAll(".thumb").forEach((t, i) => {
    t.classList.toggle("active", i === index);
  });
}

async function loadDetail() {
  const content = document.getElementById("content");
  const id = getIdFromQuery();

  if (!id) {
    content.innerHTML = `<div class="alert alert-warning">Geçersiz kart ID.</div>`;
    return;
  }

  try {
    const res = await fetch(`/cards/${id}`);
    const card = await res.json();

    if (!res.ok) {
      content.innerHTML = `<div class="alert alert-danger">${escapeHtml(card.message || "Kart bulunamadı")}</div>`;
      return;
    }

    // Giriş kontrolü (silme butonu için)
    let me = null;
    try {
      const meRes = await fetch("/auth/me");
      if (meRes.ok) me = await meRes.json();
    } catch (e) {}

    const canDelete = me && Number(me.id) === Number(card.ownerId);
    const canEdit = canDelete;
    const imageUrls = buildImageUrls(card);

    // Carousel items
    const carouselItems = imageUrls.map((url, idx) => `
      <div class="carousel-item ${idx === 0 ? "active" : ""}">
        <img
          src="${url}"
          class="d-block w-100 card-media shadow-sm"
          alt="Kart görseli ${idx + 1}"
          data-zoom-src="${url}"
          data-zoom-title="${escapeHtml(card.title)} (Foto ${idx + 1})"
        />
      </div>
    `).join("");

    // Thumbnails
    const thumbs = imageUrls.map((url, idx) => `
      <img class="thumb ${idx === 0 ? "active" : ""}"
           src="${url}"
           alt="thumb ${idx + 1}"
           data-bs-target="#cardCarousel"
           data-bs-slide-to="${idx}">
    `).join("");

    content.innerHTML = `
      <div class="row g-4 align-items-start">
        <div class="col-md-5">
          <div class="card border-0 shadow-sm rounded-4 overflow-hidden">
            <div id="cardCarousel" class="carousel slide" data-bs-ride="false">
              <div class="carousel-inner p-3">
                ${carouselItems}
              </div>

              ${imageUrls.length > 1 ? `
                <button class="carousel-control-prev" type="button" data-bs-target="#cardCarousel" data-bs-slide="prev">
                  <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                  <span class="visually-hidden">Önceki</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#cardCarousel" data-bs-slide="next">
                  <span class="carousel-control-next-icon" aria-hidden="true"></span>
                  <span class="visually-hidden">Sonraki</span>
                </button>
              ` : ``}
            </div>

            <div class="d-flex gap-2 p-3 pt-0 flex-wrap">
              ${thumbs}
            </div>
          </div>
        </div>

        <div class="col-md-7">
          <h2 class="mb-2">${escapeHtml(card.title)}</h2>
          <div class="text-muted mb-3">${escapeHtml(card.category || "-")}</div>

          <div class="mb-2"><strong>Edition:</strong> ${escapeHtml(card.edition || "-")}</div>
          <div class="mb-2"><strong>PSA:</strong> ${escapeHtml(card.psa || "-")}</div>

          <div class="display-6 fw-bold my-3">${escapeHtml(String(card.price ?? "-"))} ₺</div>

          <a class="btn btn-primary btn-lg w-100 mb-2"
             href="mailto:${encodeURIComponent(card.sellerEmail)}?subject=${encodeURIComponent("Kart hakkında: " + card.title)}">
            Satıcıyla İletişime Geç
          </a>

          ${canEdit ? `<a class="btn btn-outline-primary w-100 mb-2" href="/edit-card.html?id=${card.id}">İlanı Düzenle</a>` : ``}

          ${canDelete ? `<button id="deleteBtn" class="btn btn-danger w-100">İlanı Sil</button>` : ``}

          <div class="mt-3 text-muted small">
            Satıcı Email: ${escapeHtml(card.sellerEmail || "-")}
          </div>

          <div class="mt-2 small text-muted">
            Görsele tıklayarak büyütebilirsin.
          </div>
        </div>
      </div>
    `;

    // Carousel değişince thumbnail active güncelle
    const carouselEl = document.getElementById("cardCarousel");
    const carousel = new bootstrap.Carousel(carouselEl, { interval: false, ride: false });

    carouselEl.addEventListener("slid.bs.carousel", (ev) => {
      setActiveThumb(ev.to);
    });

    // Zoom modal: görsele tıklayınca
    const zoomModalEl = document.getElementById("zoomModal");
    const zoomImg = document.getElementById("zoomImg");
    const zoomTitle = document.getElementById("zoomTitle");
    const zoomModal = new bootstrap.Modal(zoomModalEl);

    document.querySelectorAll(".card-media").forEach(img => {
      img.addEventListener("click", () => {
        zoomImg.src = img.dataset.zoomSrc;
        zoomTitle.textContent = img.dataset.zoomTitle || "Görsel";
        zoomModal.show();
      });
    });

    // Silme butonu
    if (canDelete) {
      document.getElementById("deleteBtn").addEventListener("click", async () => {
        if (!confirm("Bu ilanı silmek istediğine emin misin?")) return;

        const delRes = await fetch(`/cards/${card.id}`, { method: "DELETE" });
        if (delRes.ok) {
          alert("İlan silindi.");
          window.location.href = "/";
        } else {
          alert("Silme işlemi başarısız.");
        }
      });
    }

  } catch (err) {
    console.error(err);
    content.innerHTML = `<div class="alert alert-danger">Sunucuya bağlanılamadı.</div>`;
  }
}

document.addEventListener("DOMContentLoaded", loadDetail);