const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  const username = `testuser_${Date.now()}`;
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));
  
  await page.goto('http://localhost:5173');
  await page.waitForTimeout(500);
  
  // Register
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const loginToggle = btns.find(b => b.innerText.includes('Switch to Register') || b.textContent.includes('Don\'t have an account?'));
    if (loginToggle) loginToggle.click();
  });
  
  await page.waitForTimeout(500);

  const inputs = await page.$$('input');
  if (inputs.length >= 3) {
    await inputs[0].fill(username);
    await inputs[1].fill(username + '@example.com');
    await inputs[2].fill('password');
  }
  
  await page.evaluate(() => {
    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.type === 'submit');
    if (submitBtn) submitBtn.click();
  });
  
  await page.waitForTimeout(2000);
  
  const html = await page.content();
  const index = html.indexOf('Something went wrong');
  if (index !== -1) {
    console.log("FOUND ERROR BOUNDARY TEXT!");
    const pre = await page.$('pre');
    if (pre) {
      console.log("ERROR MESSAGE:", await pre.innerText());
    }
  } else {
    console.log("No error boundary triggered. Dashboard might be fine.");
  }
  
  await browser.close();
})();
