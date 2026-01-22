let CURRENT_USER = null;

async function loadAuthUI() {
  const nav = document.getElementById("navAuthArea");

  try {
    const res = await fetch("/auth/me");
    if (!res.ok) throw new Error("not logged");

    const user = await res.json();
    CURRENT_USER = user;

    nav.innerHTML = `
      <div class="dropdown">
        <span class="fw-semibold text-dark">Merhaba,</span>
        <button class="user-dd-btn dropdown-toggle" type="button" data-bs-toggle="dropdown" aria-expanded="false">
          ${escapeHtml(user.username)}
        </button>
        <ul class="dropdown-menu dropdown-menu-end">
          <li><a class="dropdown-item" href="/add-card.html">İlan Ver</a></li>
          <li><a class="dropdown-item" href="/?mine=1">İlanlarım</a></li>
          <li><a class="dropdown-item " href="/profile.html">Profil</a></li>
          <li><hr class="dropdown-divider"></li>
          <li><button id="logoutBtn" class="dropdown-item text-danger" type="button">Çıkış</button></li>
        </ul>
      </div>
    `;

    document.getElementById("logoutBtn").addEventListener("click", async () => {
      await fetch("/auth/logout", { method: "POST" });
      window.location.href = "/";
    });

  } catch (e) {
    CURRENT_USER = null;
    nav.innerHTML = `
      <a class="btn btn-sm btn-outline-primary" href="/login.html">Giriş</a>
      <a class="btn btn-sm btn-primary" href="/register.html">Kayıt Ol</a>
    `;
  }
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeCategory(cat) {
  if (!cat) return "";
  const x = cat.trim();
  if (x.toLowerCase() === "diger") return "Diğer";
  return x;
}

function getParams() {
  return new URLSearchParams(window.location.search);
}

function getCategoryFromUrl() {
  const params = getParams();
  const c = params.get("category");
  return c ? decodeURIComponent(c) : "";
}

function getMineFromUrl() {
  const params = getParams();
  return params.get("mine") === "1";
}

function getQueryFromUrl() {
  const params = getParams();
  const q = params.get("q");
  return (q ? q.trim() : "");
}

function getSortFromUrl() {
  const params = getParams();
  const s = (params.get("sort") || "old").trim(); // DEFAULT: old
  const allowed = ["old","new","price_asc","price_desc","psa_asc","psa_desc"];
  return allowed.includes(s) ? s : "old";
}

function setActiveCategoryUI(category) {
  const cat = normalizeCategory(category);

  document.querySelectorAll(".nav-cats .nav-link").forEach(a => {
    const dataCat = normalizeCategory(a.getAttribute("data-cat") || "");
    a.classList.toggle("active", dataCat === cat);
  });

  const titleEl = document.getElementById("pageTitle");
  if (titleEl) titleEl.textContent = cat ? `${cat} Kartları` : "Kartlar";
}

function initSearchUI() {
  const form = document.getElementById("searchForm");
  const input = document.getElementById("searchInput");
  if (!form || !input) return;

  input.value = getQueryFromUrl();

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const params = getParams();
    const q = input.value.trim();

    if (q) params.set("q", q);
    else params.delete("q");

    const next = `${window.location.pathname}?${params.toString()}`;
    window.location.href = next;
  });
}

function initSortUI() {
  const select = document.getElementById("sortSelect");
  if (!select) return;

  select.value = getSortFromUrl();

  select.addEventListener("change", () => {
    const params = getParams();
    const val = select.value;

    // default old => URL'de tutmaya gerek yok
    if (val && val !== "old") params.set("sort", val);
    else params.delete("sort");

    const next = `${window.location.pathname}?${params.toString()}`;
    window.location.href = next;
  });
}

function toNumberPrice(p) {
  const raw = String(p ?? "").replace(/[^\d.,-]/g, "").replaceAll(".", "").replace(",", ".");
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function toPsaNumber(psa) {
  // "PSA 9", "9", "psa:10" -> 9 / 10
  const s = String(psa ?? "").toUpperCase();
  const m = s.match(/(\d{1,2})/); // 0-99
  if (!m) return NaN;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : NaN;
}

async function loadCards() {
  const container = document.getElementById("cardsContainer");
  container.innerHTML = `<div class="text-muted">Yükleniyor...</div>`;

  const selectedCategory = getCategoryFromUrl();
  const mineOnly = getMineFromUrl();
  const q = getQueryFromUrl().toLowerCase();
  const sort = getSortFromUrl();

  setActiveCategoryUI(selectedCategory);

  try {
    const res = await fetch("/cards");
    const cards = await res.json();

    if (!Array.isArray(cards) || cards.length === 0) {
      container.innerHTML = `<div class="alert alert-info">Henüz kart eklenmemiş.</div>`;
      return;
    }

    let filtered = cards;

    if (selectedCategory) {
      const cat = normalizeCategory(selectedCategory);
      filtered = filtered.filter(c => normalizeCategory(c.category || "") === cat);
    }

    if (mineOnly) {
      if (!CURRENT_USER) {
        container.innerHTML = `
          <div class="alert alert-warning">
            İlanlarını görmek için giriş yapmalısın.
            <a href="/login.html" class="alert-link ms-1">Giriş yap</a>
          </div>
        `;
        return;
      }
      filtered = filtered.filter(c => Number(c.ownerId) === Number(CURRENT_USER.id));
      const titleEl = document.getElementById("pageTitle");
      if (titleEl) titleEl.textContent = "İlanlarım";
    }

    if (q) {
      filtered = filtered.filter(c => {
        const haystack = [c.title, c.category, c.edition, c.psa]
          .map(x => String(x ?? "").toLowerCase())
          .join(" ");
        return haystack.includes(q);
      });
    }

    // Sıralama (DEFAULT: old)
    if (sort === "old") {
      filtered = filtered.slice().sort((a, b) => Number(a.id) - Number(b.id));
    } else if (sort === "new") {
      filtered = filtered.slice().sort((a, b) => Number(b.id) - Number(a.id));
    } else if (sort === "price_asc") {
      filtered = filtered.slice().sort((a, b) => {
        const pa = toNumberPrice(a.price);
        const pb = toNumberPrice(b.price);
        const na = Number.isFinite(pa) ? pa : Number.POSITIVE_INFINITY;
        const nb = Number.isFinite(pb) ? pb : Number.POSITIVE_INFINITY;
        return na - nb;
      });
    } else if (sort === "price_desc") {
      filtered = filtered.slice().sort((a, b) => {
        const pa = toNumberPrice(a.price);
        const pb = toNumberPrice(b.price);
        const na = Number.isFinite(pa) ? pa : Number.NEGATIVE_INFINITY;
        const nb = Number.isFinite(pb) ? pb : Number.NEGATIVE_INFINITY;
        return nb - na;
      });
    } else if (sort === "psa_asc") {
      filtered = filtered.slice().sort((a, b) => {
        const pa = toPsaNumber(a.psa);
        const pb = toPsaNumber(b.psa);
        const na = Number.isFinite(pa) ? pa : Number.POSITIVE_INFINITY; // bilinmiyor sona
        const nb = Number.isFinite(pb) ? pb : Number.POSITIVE_INFINITY;
        return na - nb;
      });
    } else if (sort === "psa_desc") {
      filtered = filtered.slice().sort((a, b) => {
        const pa = toPsaNumber(a.psa);
        const pb = toPsaNumber(b.psa);
        const na = Number.isFinite(pa) ? pa : Number.NEGATIVE_INFINITY; // bilinmiyor sona
        const nb = Number.isFinite(pb) ? pb : Number.NEGATIVE_INFINITY;
        return nb - na;
      });
    }

    if (filtered.length === 0) {
      container.innerHTML = `<div class="alert alert-warning">Gösterilecek ilan bulunamadı.</div>`;
      return;
    }

    container.innerHTML = filtered.map(card => {
      const hasImg = Array.isArray(card.images) && card.images.length > 0;
      const imgSrc = hasImg ? `/uploads/${card.images[0]}` : `https://via.placeholder.com/600x400?text=No+Image`;

      return `
        <div class="col">
          <div class="card h-100"
            style="
              border: 1px solid rgba(0,0,0,0.12);
              border-radius: 14px;
              overflow: hidden;
              transition: transform 150ms ease, box-shadow 150ms ease, border-color 150ms ease;
            "
            onmouseenter="this.style.transform='translateY(-4px)'; this.style.boxShadow='0 .6rem 1.4rem rgba(0,0,0,.18)'; this.style.borderColor='rgba(0,0,0,0.25)';"
            onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow=''; this.style.borderColor='rgba(0,0,0,0.12)';"
          >
            <div class="ratio ratio-4x3 bg-light" style="border-bottom: 1px solid rgba(0,0,0,0.08);">
              <img
                src="${imgSrc}"
                alt="Kart görseli"
                style="width:100%;height:100%;object-fit:contain;padding:10px;transition:transform 180ms ease;"
                onmouseenter="this.style.transform='scale(1.04)'"
                onmouseleave="this.style.transform='scale(1)'"
                onerror="this.onerror=null; this.src='https://via.placeholder.com/600x400?text=No+Image';"
              />
            </div>

            <div class="card-body d-flex flex-column">
              <h6 class="card-title mb-2">${escapeHtml(card.title || "")}</h6>

              <div class="small text-muted mb-2">
                <div><strong>Kategori:</strong> ${escapeHtml(card.category || "-")}</div>
                <div><strong>Edition:</strong> ${escapeHtml(card.edition || "-")}</div>
                <div><strong>PSA:</strong> ${escapeHtml(card.psa || "-")}</div>
              </div>

              <div class="mt-auto d-flex justify-content-between align-items-center">
                <div class="fw-semibold">${escapeHtml(String(card.price ?? "-"))} ₺</div>
                <a class="btn btn-sm btn-primary" href="/card-detail.html?id=${card.id}">Detay</a>
              </div>
            </div>
          </div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error(err);
    container.innerHTML = `<div class="alert alert-danger">Kartlar yüklenemedi.</div>`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadAuthUI();
  initSearchUI();
  initSortUI();
  loadCards();
});