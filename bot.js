
const { chromium } = require("playwright");
const { GoogleSpreadsheet } = require("google-spreadsheet");
const fs = require("fs");

const ACCOUNTS = JSON.parse(process.env.ACCOUNTS);
const SHEET_ID = process.env.SHEET_ID;
const CREDS = JSON.parse(fs.readFileSync("/etc/secrets/credentials.json", "utf8")); // Wenn du Secret File nutzt

async function logToSheet(account, points) {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(CREDS);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle["Einnahme"];
  await sheet.addRow({
    Zeit: new Date().toLocaleString("de-DE", { timeZone: "Europe/Berlin" }),
    Account: account,
    Punkte: points,
  });
}

async function runBot(account) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto("https://firefaucet.win/login");

    await page.fill('input[name="username"]', account.username);
    await page.fill('input[name="password"]', account.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const loggedIn = await page.$('text=Dashboard');
    if (!loggedIn) throw new Error("Login fehlgeschlagen");

    await page.goto("https://firefaucet.win/dashboard");
    await page.waitForTimeout(2000);

    const balance = await page.$eval(".wallet .balance", el => el.textContent.trim());
    console.log(`[${account.username}] ✅ ${balance}`);
    await logToSheet(account.username, balance);
  } catch (e) {
    console.log(`[${account.username}] ❌ Fehler: ${e.message}`);
  } finally {
    await browser.close();
  }
}

(async () => {
  for (const acc of ACCOUNTS) {
    await runBot(acc);
  }
})();