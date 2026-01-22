const session = require("express-session");
const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

// Body parsers
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Session (routes'tan önce olmalı)
app.use(
  session({
    secret: "koleksiyonluk-kart-secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Static klasörler
app.use(express.static("public")); // /public/js, /public/uploads vs.
app.use(express.static("views"));  // /index.html, /edit-card.html vb.

// Routes
const cardRoutes = require("./routes/cards");
app.use("/cards", cardRoutes);

const authRoutes = require("./routes/auth");
app.use("/auth", authRoutes);

// Ana sayfa
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "views", "index.html"));
});

// Server
app.listen(PORT, () => {
  console.log(`Server çalışıyor: http://localhost:${PORT}`);
});