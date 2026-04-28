const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// Fake bill image generator from before
function createFakeBillImage() {
  const { createCanvas } = require('canvas'); // Not available in backend? I will generate using playwright itself!
}

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('Navigating to app...');
    await page.goto('http://localhost:5173/');
    
    // Check if we are at login or setup
    await page.waitForTimeout(2000);
    const content = await page.content();
    
    // Clear local storage and IndexedDB just in case to start fresh
    console.log('Clearing old data to ensure fresh scan...');
    await page.evaluate(async () => {
      localStorage.clear();
      const dbs = await window.indexedDB.databases();
      for (const db of dbs) { window.indexedDB.deleteDatabase(db.name); }
    });
    
    console.log('Reloading after clear...');
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000);

    // Click "Shop Owner"
    if (content.includes('Shop Owner (First Time Setup)')) {
      console.log('Clicking Owner setup...');
      await page.click('text=Shop Owner (First Time Setup)');
    } else {
      console.log('Creating owner setup...');
      await page.goto('http://localhost:5173/#owner-setup');
    }
    
    console.log('Filling setup form...');
    await page.waitForSelector('input[placeholder*="Full Name"]', {timeout: 3000}).catch(()=>null);
    const nameInputs = await page.$$('input');
    if (nameInputs.length >= 3) {
      await nameInputs[0].fill('Test Shop Owner');
      await nameInputs[1].fill('owner');
      await nameInputs[2].fill('admin123');
      await page.click('button:has-text("Create Owner Account")');
      console.log('Form submitted');
    } else {
      // Must be login form
      await page.goto('http://localhost:5173/#login');
      await page.waitForTimeout(1000);
      const loginInputs = await page.$$('input');
      if (loginInputs.length >= 2) {
        await loginInputs[0].fill('owner');
        await loginInputs[1].fill('admin123');
        await page.click('button:has-text("Login")');
      }
    }

    await page.waitForTimeout(1500);

    // If opening stock appears, go to dashboard
    await page.goto('http://localhost:5173/#dashboard');
    await page.waitForTimeout(1000);

    console.log('Going to Shop Settings to connect cloud...');
    await page.goto('http://localhost:5173/#settings');
    await page.waitForTimeout(1000);
    
    await page.screenshot({ path: 'step1_settings.png' });
    console.log('Connecting Cloud...');
    
    // Now look for "Connect Cloud" button
    const connectBtn = await page.waitForSelector('button:has-text("Connect Server")', {timeout: 3000}).catch(() => null)
        || await page.waitForSelector('button:has-text("Connect Cloud Database")', {timeout: 3000}).catch(() => null)
        || await page.waitForSelector('button:has-text("Connect")', {timeout: 3000}).catch(() => null);

    if (connectBtn) {
       await connectBtn.click();
       console.log('Clicked connect cloud button');
       await page.waitForTimeout(2000); // Wait for toast/connection
    } else {
       console.log('Connect Cloud button not found, maybe already connected or text diff?');
    }
    
    await page.screenshot({ path: 'step2_cloud_connected.png' });

    console.log('Going to Bill Scanner...');
    await page.goto('http://localhost:5173/#bill-scanner');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'step3_bill_scanner.png' });

    console.log('Generating test bill image directly in browser...');
    // Create image and trigger upload
    const injectRes = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 700; canvas.height = 900;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 700, 900);
      ctx.fillStyle = '#000000'; ctx.font = 'bold 28px Arial'; ctx.fillText('TAX INVOICE', 350, 50);
      ctx.font = '16px Arial';
      ctx.fillText('GST No: 07AABCS1429B1Z1', 30, 125);
      ctx.fillText('Mobile: 9876543210', 30, 148);
      ctx.fillText('Address: 12 Main Market, Karol Bagh, Delhi - 110005', 30, 171);
      ctx.fillText('Bill No: INV-2024-0999', 30, 215);
      ctx.fillText('Date: 03/04/2024', 400, 215);
      
      const items = [
        ['Amul Butter 500g',   '0402', '10', 'pcs', '55.00', '550.00'],
        ['Tata Salt 1kg',      '2501', '20', 'kg',  '22.00', '440.00'],
        ['Parle-G Biscuit',    '1905', '50', 'pkt', '10.00', '500.00']
      ];
      ctx.font = '13px Arial';
      items.forEach((item, i) => {
        const y = 310 + (i * 28);
        ctx.fillText(item[0], 30, y);
        ctx.fillText(item[1], 280, y);
        ctx.fillText(item[2], 360, y);
        ctx.fillText(item[4], 490, y);
      });

      return new Promise(resolve => {
        canvas.toBlob(blob => {
          const file = new File([blob], 'test_bill.jpg', { type: 'image/jpeg' });
          const input = document.getElementById('bill-file');
          if(!input) return resolve('ERROR: no bill-file input');
          const dt = new DataTransfer(); dt.items.add(file);
          input.files = dt.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          resolve('TEST FILE INJECTED');
        }, 'image/jpeg');
      });
    });

    console.log(injectRes);
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'step4_after_inject.png' });

    console.log('Clicking Scan with AI...');
    await page.click('#do-scan-btn');
    
    console.log('Waiting for Scan to finish (up to 30s)...');
    // Wait until the supplier name input has a value, or 30s timeout
    await page.waitForFunction(() => {
       const el = document.getElementById('sup-name');
       return el && el.value.length > 0;
    }, { timeout: 30000 }).catch(e => console.log('Timeout waiting for scan extraction'));

    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'step5_scan_result.png', fullPage: true });

    // Check what was extracted
    const extractedData = await page.evaluate(() => {
       return {
         supplier: document.getElementById('sup-name')?.value,
         billNumber: document.getElementById('bill-number')?.value,
         totalItems: document.querySelectorAll('.items-table tbody tr').length
       };
    });
    console.log('Extracted Data on UI:', extractedData);
    
    console.log('Done!');
  } catch(e) {
    console.error('Script Error:', e);
  } finally {
    await browser.close();
  }
})();
