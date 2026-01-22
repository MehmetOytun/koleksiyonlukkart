const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const filePath = path.join(__dirname, "../data/users.json");

function readUsers() {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}
function writeUsers(users) {
  fs.writeFileSync(filePath, JSON.stringify(users, null, 2), "utf-8");
}

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}

// 🔐 Şifre kuralları
function validatePassword(password) {
  if (password.length < 8)
    return "Şifre en az 8 karakter olmalı.";

  if (!/[A-Z]/.test(password))
    return "Şifre en az 1 büyük harf içermeli.";

  if (!/[a-z]/.test(password))
    return "Şifre en az 1 küçük harf içermeli.";

  if (!/[0-9]/.test(password))
    return "Şifre en az 1 rakam içermeli.";

  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password))
    return "Şifre en az 1 özel karakter içermeli.";

  return null;
}

function requireLogin(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ message: "Giriş yapmalısın" });
  }
  next();
}

// REGISTER
router.post("/register", (req, res) => {
  const users = readUsers();
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: "username, email, password zorunlu" });
  }

  const passError = validatePassword(password);
  if (passError) return res.status(400).json({ message: passError });

  const exists = users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (exists) return res.status(409).json({ message: "Bu email zaten kayıtlı" });

  const salt = crypto.randomBytes(16).toString("hex");
  const passwordHash = hashPassword(password, salt);

  const newUser = {
    id: Date.now(),
    username,
    email,
    salt,
    passwordHash
  };

  users.push(newUser);
  writeUsers(users);

  req.session.userId = newUser.id;

  res.status(201).json({ message: "Kayıt başarılı", user: { id: newUser.id, username, email } });
});

// LOGIN
router.post("/login", (req, res) => {
  const users = readUsers();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email ve password zorunlu" });
  }

  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) return res.status(401).json({ message: "Email veya şifre hatalı" });

  const checkHash = hashPassword(password, user.salt);
  if (checkHash !== user.passwordHash) {
    return res.status(401).json({ message: "Email veya şifre hatalı" });
  }

  req.session.userId = user.id;
  res.json({ message: "Giriş başarılı", user: { id: user.id, username: user.username, email: user.email } });
});

// 🔁 ŞİFRE DEĞİŞTİR
router.post("/change-password", requireLogin, (req, res) => {
  const users = readUsers();
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword)
    return res.status(400).json({ message: "Eski ve yeni şifre zorunlu" });

  const userIndex = users.findIndex(u => u.id === req.session.userId);
  if (userIndex === -1)
    return res.status(404).json({ message: "Kullanıcı bulunamadı" });

  const user = users[userIndex];

  const oldHash = hashPassword(oldPassword, user.salt);
  if (oldHash !== user.passwordHash)
    return res.status(401).json({ message: "Eski şifre yanlış" });

  const passError = validatePassword(newPassword);
  if (passError) return res.status(400).json({ message: passError });

  const newSalt = crypto.randomBytes(16).toString("hex");
  const newHash = hashPassword(newPassword, newSalt);

  users[userIndex].salt = newSalt;
  users[userIndex].passwordHash = newHash;

  writeUsers(users);
  res.json({ message: "Şifre başarıyla değiştirildi" });
});

// LOGOUT
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ message: "Çıkış yapıldı" });
  });
});

// ME
router.get("/me", (req, res) => {
  if (!req.session.userId) return res.status(401).json({ message: "Giriş yapılmamış" });

  const users = readUsers();
  const user = users.find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ message: "Kullanıcı bulunamadı" });

  res.json({ id: user.id, username: user.username, email: user.email });
});

module.exports = router;