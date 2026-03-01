const { chromium } = require('playwright');
const { execSync } = require('child_process');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  // Register dynamically
  const username = `u_${Date.now()}`;
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message, error.stack));
  
  await page.goto('http://localhost:5173');
  
  await page.waitForTimeout(1000);
  
  // Click switch to register
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const loginToggle = btns.find(b => b.innerText.includes('Switch to Register') || b.textContent.includes('Switch to Login') || b.textContent.includes('Don\'t have an account?'));
    if (loginToggle) loginToggle.click();
  });
  
  await page.waitForTimeout(500);

  // Fill forms
  const inputs = await page.$$('input');
  if (inputs.length === 3) { // register form usually has 3
    await inputs[0].fill(username);
    await inputs[1].fill(username + '@example.com');
    await inputs[2].fill('password');
  } else {
    console.log('Cant find inputs', inputs.length);
  }
  
  await page.evaluate(() => {
    const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.type === 'submit');
    if (submitBtn) submitBtn.click();
  });
  
  await page.waitForTimeout(3000);
  console.log('Checking current url:', page.url());
  
  const h1 = await page.$('h1');
  if (h1) {
      console.log('Found h1:', await h1.innerText());
  }
  
  await browser.close();
})();
