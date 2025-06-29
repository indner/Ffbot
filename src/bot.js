import { chromium } from "playwright";
import { GoogleSpreadsheet } from "google-spreadsheet";

// 📦 Hole Umgebungsvariablen
const creds = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON || "{}");
const sheetId = process.env.SHEET_ID || "";
const accountsRaw = process.env.ACCOUNTS_JSON || "[]";

let accounts = [];
try {
  accounts = JSON.parse(accountsRaw);
} catch (e) {
  console.error("❌ Fehler beim Parsen von ACCOUNTS_JSON:", e.message);
  process.exit(1);
}

// 📄 Funktion zum Eintragen in Google Sheet
async function logToSheet(account, points) {
  const doc = new GoogleSpreadsheet(sheetId);
  await doc.useServiceAccountAuth(creds);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle["Einnahmen"];
  await sheet.addRow({
    Zeit: new Date().toLocaleString("de-DE"),
    Account: account,
    Punkte: points
  });
}

// 🤖 Hauptfunktion für jeden Bot
async function runBot(account) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto("https://firefaucet.win/login", { waitUntil: "domcontentloaded" });
    await page.fill('input[name="username"]', account.user);
    await page.fill('input[name="password"]', process.env.FIRE_PASS);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const dashboard = await page.$('text=Dashboard');
    if (!dashboard) throw new Error("Login fehlgeschlagen");

    await page.goto("https://firefaucet.win/dashboard");
    await page.waitForTimeout(2000);

    const balance = await page.$eval(".wallet-balance", el => el.textContent.trim());
    console.log(`[${account.user}] ✅ Punkte: ${balance}`);
    await logToSheet(account.user, balance);

  } catch (err) {
    console.error(`[${account.user}] ❌ Fehler: ${err.message}`);
  } finally {
    await browser.close();
  }
}

// ▶️ Starte alle Bots
for (const acc of accounts) {
  runBot(acc);
}
