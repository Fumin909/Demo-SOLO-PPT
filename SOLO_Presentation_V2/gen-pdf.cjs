const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const workDir = '/Users/Fumin/Documents/_WORK/00 AI课程/AI PPT制作/SOLO_Presentation_V2';
  const imgDir = path.join(workDir, '_screenshot_temp');
  if (fs.existsSync(imgDir)) fs.rmSync(imgDir, { recursive: true });
  fs.mkdirSync(imgDir, { recursive: true });

  const browser = await chromium.launch({
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars']
  });

  const initScript = () => {
    const mark = () => {
      document.querySelectorAll('*').forEach(el => {
        const cs = window.getComputedStyle(el);
        if (cs.opacity === '0' && cs.display !== 'none' && cs.visibility !== 'hidden') {
          const hasAnim = cs.animationName !== 'none' || cs.animationDuration !== '0s' || cs.transitionProperty !== 'none';
          if (hasAnim) el.setAttribute('data-needs-show', '1');
        }
      });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mark);
    else mark();
    setTimeout(mark, 500);
  };

  const slides = [
    'cover.html','about.html','founders.html','problems.html','solutions.html',
    'product.html','materials.html','consumer.html','marketing.html','usp.html',
    'creator.html','sustainable.html','investment.html','growth.html','logo.html','thankyou.html'
  ];

  for (let i = 0; i < slides.length; i++) {
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.addInitScript(initScript);
    const url = `http://localhost:8090/pages/${slides[i]}`;
    process.stdout.write(`[${i+1}/16] ${slides[i]}...`);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(800);
    await page.addStyleTag({ content: `*,*::before,*::after{animation:none!important;transition:none!important;stroke-dashoffset:0!important;}` });
    await page.evaluate(() => { document.querySelectorAll('[data-needs-show="1"]').forEach(el => el.style.opacity='1'); });
    await page.waitForTimeout(500);
    await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
    const imgPath = path.join(imgDir, `slide_${String(i+1).padStart(2,'0')}.jpg`);
    await page.screenshot({ path: imgPath, type: 'jpeg', quality: 92 });
    await context.close();
    process.stdout.write(` OK\n`);
  }

  console.log('\nScreenshots done, building PDF...');
  const { PDFDocument } = require('pdf-lib');
  const pdfDoc = await PDFDocument.create();
  for (let i = 1; i <= 16; i++) {
    const imgBytes = fs.readFileSync(path.join(imgDir, `slide_${String(i).padStart(2,'0')}.jpg`));
    const img = await pdfDoc.embedJpg(imgBytes);
    const p = pdfDoc.addPage([1920, 1080]);
    p.drawImage(img, { x: 0, y: 0, width: 1920, height: 1080 });
  }
  const finalPdf = path.join(workDir, 'SOLO_Back_To_The_Future_Sneakers_V2.pdf');
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(finalPdf, pdfBytes);
  console.log(`Done! Pages: ${pdfDoc.getPageCount()}, Size: ${(pdfBytes.length/1024/1024).toFixed(1)} MB`);
  process.exit(0);
})();
