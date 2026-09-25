const fs = require("fs");
const path = require("path");
const readline = require("readline");
const puppeteer = require("puppeteer-core");

// Terminalden soru sorup cevabı döndüren fonksiyon
function sor(soru) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => rl.question(soru, (cevap) => { rl.close(); resolve(cevap.trim()); }));
}

(async () => {
  // 1) Token'ı terminalden iste
  const token = await sor("Token'ı yapıştır ve Enter'a bas: ");
  if (!token.startsWith("thr1.")) {
    console.error("Bu geçerli bir token gibi görünmüyor. 'thr1.' ile başlamalı.");
    process.exit(1);
  }

  // 2) Chromium'u aç
  const browser = await puppeteer.launch({
    executablePath: "/usr/bin/chromium",
    headless: false,
    args: ["--no-sandbox", "--disable-features=WebRtcHideLocalIpsWithMdns"],
  });

  const page = await browser.newPage();
  page.on("console", (msg) => console.log("[Oda]", msg.text()));
  page.on("pageerror", (err) => console.log("[Sayfa hatası]", err.message));

  // 3) HaxBall headless sayfasını aç
  await page.goto("https://www.haxball.com/headless", { waitUntil: "networkidle2" });
  await page.waitForFunction(() => typeof HBInit === "function");

  // 4) Token'ı sayfaya ver ve oda kodunu çalıştır
  await page.evaluate((t) => { window.HAXBALL_TOKEN = t; }, token);
  const roomScript = fs.readFileSync(path.join(__dirname, "room.js"), "utf8");
  await page.evaluate(roomScript);

  console.log("Oda başlatılıyor, link bekleniyor...");
})();