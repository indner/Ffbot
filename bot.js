const { chromium } = require("playwright");
const { GoogleSpreadsheet } = require("google-spreadsheet");

const SHEET_ID = process.env.SHEET_ID;
const CREDS = require("/etc/secrets/credentials.json");

const ACCOUNTS = [];
for (let i = 1; i <= 6; i++) {
  const username = process.env[`FIRE_USER_${i}`];
  const password = process.env.FIRE_PASS;
  if (username && password) {
    ACCOUNTS.push({ username, password });
  }
}

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
    await page.goto("https://firefaucet.win/login.php");

    await page.fill('input[name="username"]', account.username);
    await page.fill('input[name="password"]', account.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    const loggedIn = await page.$('text=Dashboard');
    if (!loggedIn) throw new Error("Login fehlgeschlagen");

    await page.goto("https://firefaucet.win/dashboard.php");
    await page.waitForTimeout(2000);

    const balance = await page.$eval(".wallet-bal", el => el.innerText.trim());
    console.log(`[${account.username}] ✅ ${balance}`);
    await logToSheet(account.username, balance);
  } catch (e) {
    console.log(`[${account.username}] ❌`, e.message);
  } finally {
    await browser.close();
  }
}

(async () => {
  for (const acc of ACCOUNTS) {
    await runBot(acc);
  }
})();