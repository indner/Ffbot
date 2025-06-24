import { chromium } from "playwright";
import { GoogleSpreadsheet } from "google-spreadsheet";

const ACCOUNTS = JSON.parse(process.env.ACCOUNTS_JSON);
const SHEET_ID = process.env.SHEET_ID;
const CREDS = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);

async function logToSheet(account, points) {
  const doc = new GoogleSpreadsheet(SHEET_ID);
  await doc.useServiceAccountAuth(CREDS);
  await doc.loadInfo();
  const sheet = doc.sheetsByTitle['Einnahmen'];
  await sheet.addRow({
    Zeit: new Date().toLocaleString("de-DE"),
    Account: account,
    Punkte: points
  });
}

async function runBot(account) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    await page.goto("https://firefaucet.win/login");

    await page.fill('input[name="username"]', account.username);
    await page.fill('input[name="password"]', process.env.FIRE_PASS);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const loggedIn = await page.$('text=Dashboard');
    if (!loggedIn) throw new Error("Login fehlgeschlagen");

    await page.goto("https://firefaucet.win/dashboard");
    await page.waitForTimeout(2000);

    const balance = await page.$eval(".wallet-balance", el => el.textContent.trim());
    console.log(`[${account.username}] ✅ Punkte: ${balance}`);
    await logToSheet(account.username, balance);

  } catch (e) {
    console.log(`[${account.username}] ❌`, e.message);
  } finally {
    await browser.close();
  }
}

for (let i = 1; i <= 6; i++) {
  const username = process.env[`FIRE_USER_${i}`];
  if (username) {
    runBot({ username });
  }
}