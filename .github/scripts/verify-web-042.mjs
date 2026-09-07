import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from '/tmp/cogni-browser-tools/node_modules/playwright/index.mjs';
const out = '/tmp/cogni-browser';
async function checkLayout(page, label) {
  const result = await page.evaluate(() => ({width:innerWidth,scroll:document.documentElement.scrollWidth,overlay:Boolean(document.querySelector('[data-nextjs-dialog]')),text:document.body.innerText.length}));
  assert.ok(result.text > 100, label+' blank'); assert.ok(!result.overlay,label+' framework overlay');
  assert.ok(result.scroll <= result.width+1,label+' horizontal overflow: '+JSON.stringify(result));
}
(async()=>{
 const browser=await chromium.launch({headless:true}); let page; const errors=[]; const records=[];
 fs.writeFileSync(out+'/playwright-version.txt',JSON.parse(fs.readFileSync('/tmp/cogni-browser-tools/node_modules/playwright/package.json','utf8')).version);
 try {
  for(const width of [320,390,430,1280]) {
   const context=await browser.newContext({viewport:{width,height:844}});page=await context.newPage();page.setDefaultTimeout(15000);
   page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
   await page.goto('http://127.0.0.1:3000/',{waitUntil:'networkidle'});
   await checkLayout(page,'Home '+width);assert.match(await page.textContent('body'),/Train your thinking/);
   assert.ok(await page.locator('.cg-practice-demo .cg-full').isDisabled());
   assert.ok(await page.evaluate(()=>{const e=document.querySelector('.cg-editorial-landing');return e.scrollHeight<=e.clientHeight+1 || getComputedStyle(e).overflowY!=='hidden';}));
   await page.screenshot({path:out+'/home-'+width+'.png',fullPage:true});
   await page.locator('a[href="#try-cogni"]').click();
   await page.locator('.cg-demo-option').first().click();
   await page.waitForFunction(()=>document.querySelector('.cg-demo-option').getAttribute('aria-checked')==='true');
   await page.locator('.cg-practice-demo .cg-full').click();
   await page.locator('.cg-demo-feedback').waitFor();assert.match(await page.textContent('.cg-demo-feedback'),/Look for the evidence/);
   await page.screenshot({path:out+'/example-review-'+width+'.png',fullPage:true});
   await page.locator('.cg-demo-reset').click();
   await page.waitForFunction(()=>document.activeElement===document.querySelector('.cg-demo-option'));
   await page.keyboard.press('ArrowDown');await page.keyboard.press('ArrowDown');
   await page.waitForFunction(()=>document.querySelectorAll('.cg-demo-option')[2].getAttribute('aria-checked')==='true');
   await page.keyboard.press('Tab');
   await page.waitForFunction(()=>document.activeElement===document.querySelector('.cg-practice-demo .cg-full'));
   await page.keyboard.press('Enter');await page.locator('.cg-demo-feedback').waitFor();assert.match(await page.textContent('.cg-demo-feedback'),/strongest next step/);
   await page.screenshot({path:out+'/example-correct-'+width+'.png',fullPage:true});
   const signup=page.locator('.cg-public-phone a[href="/signup"]');
   await signup.click();await page.waitForURL(url=>url.pathname==='/signup');await page.locator('#auth-email').waitFor();await checkLayout(page,'Signup '+width);
   assert.equal(await page.locator('#auth-password').count(),1);await page.screenshot({path:out+'/signup-'+width+'.png',fullPage:true});
   await page.locator('.cg-auth-switch a[href="/login"]').click();await page.waitForURL(url=>url.pathname==='/login');await page.locator('#auth-email').waitFor();await checkLayout(page,'Login '+width);
   assert.equal(await page.locator('#auth-password').count(),1);await page.screenshot({path:out+'/login-'+width+'.png',fullPage:true});
   records.push({width,home:true,exampleIncorrect:true,exampleCorrect:true,keyboard:true,signup:true,login:true});console.log('PASS viewport',width);
   await context.close();page=null;
  }
  const context=await browser.newContext({viewport:{width:640,height:900}});page=await context.newPage();await page.goto('http://127.0.0.1:3000/',{waitUntil:'networkidle'});
  await page.evaluate(()=>{const sizes=Array.from(document.querySelectorAll('h1,h2,p,span,a,button,strong,.cg-kicker')).map(e=>({e,font:parseFloat(getComputedStyle(e).fontSize),line:parseFloat(getComputedStyle(e).lineHeight)}));for(const {e,font,line} of sizes){e.style.setProperty('font-size',(font*2)+'px','important');if(Number.isFinite(line))e.style.setProperty('line-height',(line*2)+'px','important');}});
  await checkLayout(page,'Doubled-text probe');await page.screenshot({path:out+'/home-large-text.png',fullPage:true});
  assert.deepEqual(errors,[],'Unexpected browser errors');
  fs.writeFileSync(out+'/result.json',JSON.stringify({status:'PASS',source:process.env.SOURCE_COMMIT,records,doubledTextProbe:true,errors,accountsCreated:0},null,2));
  fs.writeFileSync(out+'/result.txt','PASS: real pointer and keyboard interactions, corrective/correct outcomes, signup and sign-in navigation, scrolling and overflow at 320/390/430/1280px; doubled-text layout probe at 640px; zero browser errors.\n');
 } catch(error) {
  if(page&&!page.isClosed()){await page.screenshot({path:out+'/failure.png',fullPage:true});fs.writeFileSync(out+'/failure-url.txt',page.url());fs.writeFileSync(out+'/failure-text.txt',await page.textContent('body'));}
  throw error;
 } finally {fs.writeFileSync(out+'/browser-errors.json',JSON.stringify(errors));fs.writeFileSync(out+'/partial-results.json',JSON.stringify(records,null,2));await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
