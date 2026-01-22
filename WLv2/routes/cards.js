const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const multer = require("multer");

const filePath = path.join(__dirname, "../data/cards.json");

function requireLogin(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "İşlem için giriş yapmalısın" });
  }
  next();
}

function readCards() {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function writeCards(cards) {
  fs.writeFileSync(filePath, JSON.stringify(cards, null, 2), "utf-8");
}

// ✅ Multer storage ayarı
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

// ✅ Multer upload ayarı (max 3 dosya + sadece resim + max 2MB)
const upload = multer({
  storage,
  limits: { files: 3, fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Sadece resim dosyası yüklenebilir"));
    }
    cb(null, true);
  },
});

// READ - tüm kartlar
router.get("/", (req, res) => {
  const cards = readCards();
  res.json(cards);
});

// READ - tek kart (detay için)
router.get("/:id", (req, res) => {
  const cards = readCards();
  const id = Number(req.params.id);

  const card = cards.find((c) => c.id === id);
  if (!card) return res.status(404).json({ message: "Kart bulunamadı" });

  res.json(card);
});

// CREATE - kart ekle (sadece giriş yapan ekleyebilsin) + max 3 foto
router.post("/", requireLogin, upload.array("images", 3), (req, res) => {
  const cards = readCards();
  const { title, category, edition, psa, price, sellerEmail } = req.body;

  if (!title || !category || !sellerEmail) {
    return res.status(400).json({ message: "title, category ve sellerEmail zorunlu" });
  }

  const images = (req.files || []).map((f) => f.filename);

  const newCard = {
    id: Date.now(),
    ownerId: req.session.userId,
    title,
    category,
    edition: edition || "",
    psa: psa || "",
    price: price ? Number(price) : "",
    sellerEmail,
    images, // ✅ dizi
  };

  cards.push(newCard);
  writeCards(cards);

  res.status(201).json({ message: "Kart eklendi", card: newCard });
});

// UPDATE - kart güncelle (sadece owner)
router.put("/:id", requireLogin, (req, res) => {
  const cards = readCards();
  const id = Number(req.params.id);

  const index = cards.findIndex((c) => c.id === id);
  if (index === -1) return res.status(404).json({ message: "Kart bulunamadı" });

  if (cards[index].ownerId !== req.session.userId) {
    return res.status(403).json({ message: "Bu kartı güncelleme yetkin yok" });
  }

  const oldImages = cards[index].images; // ✅ images korunur

  cards[index] = {
    ...cards[index],
    ...req.body,
    id,
    ownerId: cards[index].ownerId,
    images: oldImages,
  };

  writeCards(cards);
  res.json({ message: "Kart güncellendi", card: cards[index] });
});

// DELETE - kart sil (sadece owner)
router.delete("/:id", requireLogin, (req, res) => {
  const cards = readCards();
  const id = Number(req.params.id);

  const card = cards.find((c) => c.id === id);
  if (!card) return res.status(404).json({ message: "Kart bulunamadı" });

  if (card.ownerId !== req.session.userId) {
    return res.status(403).json({ message: "Bu kartı silme yetkin yok" });
  }

  const filtered = cards.filter((c) => c.id !== id);
  writeCards(filtered);

  res.json({ message: "Kart silindi" });
});

// ✅ Multer / dosya yükleme hatalarını düzgün döndür
router.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ message: err.message || "Dosya yükleme hatası" });
  }
  next();
});

module.exports = router;