const Database = require("better-sqlite3");
const path = require("path");

// Proje klasöründe haxball.db dosyasını açar, yoksa oluşturur
const db = new Database(path.join(__dirname, "..", "haxball.db"));

// Oyuncular tablosu (yoksa oluşturulur)
db.exec(`
  CREATE TABLE IF NOT EXISTS players (
    auth         TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    role         TEXT,
    xp           INTEGER NOT NULL DEFAULT 0,
    goals        INTEGER NOT NULL DEFAULT 0,
    assists      INTEGER NOT NULL DEFAULT 0,
    wins         INTEGER NOT NULL DEFAULT 0,
    games        INTEGER NOT NULL DEFAULT 0,
    clean_sheets INTEGER NOT NULL DEFAULT 0
  )
`);

// Oyuncuyu getirir, yoksa oluşturur
function getOrCreatePlayer(auth, name) {
  db.prepare(`
    INSERT INTO players (auth, name) VALUES (?, ?)
    ON CONFLICT(auth) DO UPDATE SET name = excluded.name
  `).run(auth, name);
  return db.prepare("SELECT * FROM players WHERE auth = ?").get(auth);
}

// Oyuncunun rolünü kaydeder
function setRole(auth, role) {
  db.prepare("UPDATE players SET role = ? WHERE auth = ?").run(role, auth);
}

// Sayıları artırır. Örnek: addStats(auth, { xp: 10, goals: 1 })
const ARTIRILABILIR = ["xp", "goals", "assists", "wins", "games", "clean_sheets"];
function addStats(auth, degisim) {
  for (const [alan, miktar] of Object.entries(degisim)) {
    if (!ARTIRILABILIR.includes(alan)) throw new Error("Bilinmeyen alan: " + alan);
    db.prepare(`UPDATE players SET ${alan} = ${alan} + ? WHERE auth = ?`).run(miktar, auth);
  }
  return db.prepare("SELECT * FROM players WHERE auth = ?").get(auth);
}

// En çok XP'si olan ilk N oyuncu
function getTop(n = 10) {
  return db.prepare("SELECT name, xp, role FROM players ORDER BY xp DESC LIMIT ?").all(n);
}

module.exports = { getOrCreatePlayer, setRole, addStats, getTop };