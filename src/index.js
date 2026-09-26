const fs = require("fs");
const path = require("path");
const readline = require("readline");
const puppeteer = require("puppeteer-core");
const db = require("./db");

const ROOM_JS = path.join(__dirname, "room.js");

function sor(soru) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(soru, (cevap) => { rl.close(); resolve(cevap.trim()); }));
}

(async () => {
  // Token önce dosyadan okunur (servis için), dosya yoksa terminalden sorulur
  let token;
  if (process.env.TOKEN_FILE && fs.existsSync(process.env.TOKEN_FILE)) {
    token = fs.readFileSync(process.env.TOKEN_FILE, "utf8").trim();
    console.log("Token dosyadan okundu:", process.env.TOKEN_FILE);
  } else if (process.stdin.isTTY) {
    token = await sor("Token'ı yapıştır ve Enter'a bas: ");
  } else {
    console.error("Token bulunamadı. TOKEN_FILE ile bir dosya belirt.");
    process.exit(1);
  }
  if (!token.startsWith("thr1.")) {
    console.error("Bu geçerli bir token gibi görünmüyor. 'thr1.' ile başlamalı.");
    process.exit(1);
  }

const browser = await puppeteer.launch({
    // Chrome'un yeri ve görünür olup olmayacağı ortam değişkeninden okunur.
    // Arch'ta varsayılanlar geçerli, sunucuda komutla birlikte veriyoruz.
    executablePath: process.env.CHROME_PATH || "/usr/bin/chromium",
    headless: process.env.HEADLESS === "true",
    args: [
      "--no-sandbox",
      "--disable-features=WebRtcHideLocalIpsWithMdns",
      "--remote-debugging-port=9222", // captcha çıkarsa uzaktan bağlanabilmek için
    ],
  });
    // Chrome çökerse programı kapat, systemd otomatik yeniden başlatsın
  browser.on("disconnected", () => {
    console.error("Tarayıcı kapandı, çıkılıyor.");
    process.exit(1);
  });

  const page = await browser.newPage();
  page.on("console", (msg) => console.log("[Oda]", msg.text()));
  page.on("pageerror", (err) => console.log("[Sayfa hatası]", err.message));

  // Veritabanı köprüsü
  await page.exposeFunction("dbGetPlayer", db.getOrCreatePlayer);
  await page.exposeFunction("dbSetRole", db.setRole);
  await page.exposeFunction("dbAddStats", db.addStats);
  await page.exposeFunction("dbGetTop", db.getTop);

  await page.goto("https://www.haxball.com/headless", { waitUntil: "networkidle2" });
  await page.waitForFunction(() => typeof HBInit === "function");

  // Odayı SADECE BİR KEZ aç. "room" artık her yerden erişilebilen global bir değişken.
  await page.evaluate((t) => {
    window.room = HBInit({
      roomName: "Orhan'ın Rank Odası",
      maxPlayers: 12,
      public: false,
      noPlayer: true,
      token: t,
    });
        window.room.onRoomLink = (link) => { window.odaLinki = link; console.log("Oda linki:", link); };
  }, token);

  // 15 saniye içinde link gelmezse büyük ihtimalle captcha istiyordur
  setTimeout(async () => {
    const link = await page.evaluate(() => window.odaLinki);
    if (!link) console.log("15 saniyedir link gelmedi, muhtemelen captcha istiyor. chrome://inspect ile bağlanıp çöz.");
  }, 15000);

  // Olay isimleri: yeniden yüklemeden önce eski kuralları temizlemek için
  const OLAYLAR = [
    "onPlayerJoin", "onPlayerLeave", "onPlayerChat", "onPlayerBallKick",
    "onTeamGoal", "onTeamVictory", "onGameStart", "onGameStop", "onGameTick",
    "onGamePause", "onGameUnpause", "onPositionsReset", "onPlayerTeamChange",
    "onPlayerAdminChange", "onPlayerKicked", "onPlayerActivity", "onStadiumChange",
  ];

  // room.js'i odaya yükler (ilk açılışta ve her kaydetmede)
  async function kurallariYukle() {
    const kod = fs.readFileSync(ROOM_JS, "utf8");
    try {
      await page.evaluate((olaylar) => { for (const o of olaylar) window.room[o] = null; }, OLAYLAR);
      // Kodu bir fonksiyonun içine sararak çalıştırıyoruz, böylece her yüklemede sıfırdan başlar
      await page.evaluate(`(function () {\n${kod}\n})();`);
      console.log(`[${new Date().toLocaleTimeString()}] room.js yüklendi`);
    } catch (e) {
      console.log("room.js içinde hata var, eski kurallar yerine hiçbir kural yüklenmedi:", e.message);
    }
  }

  await kurallariYukle();

  // room.js dosyasını izle: kaydedildiğinde yeniden yükle
  fs.watchFile(ROOM_JS, { interval: 500 }, (simdi, once) => {
    if (simdi.mtimeMs !== once.mtimeMs) kurallariYukle();
  });

  console.log("Oda başlatılıyor, link bekleniyor... (room.js'i kaydettiğinde otomatik yenilenecek)");
})();