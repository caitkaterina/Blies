import {chromium} from 'playwright';
import {mkdir} from 'node:fs/promises';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
const output=process.env.BLIES_VISUAL_OUTPUT||'/tmp/blies-visual-results';await mkdir(output,{recursive:true});
try{for(const [size,viewport] of Object.entries({desktop:{width:1440,height:900},tablet:{width:768,height:1024},mobile:{width:390,height:844}}))for(const route of ['home','quote'])for(const [variant,origin] of Object.entries({baseline:process.env.BLIES_BASELINE_URL||'http://127.0.0.1:3011',current:process.env.BLIES_FRONTEND_TEST_URL||'http://127.0.0.1:8443'})){
 const page=await browser.newPage({viewport,reducedMotion:'reduce'});await page.route(/^https:\/\/(?:images\.unsplash\.com|fonts\.(?:googleapis|gstatic)\.com)/,r=>r.abort());await page.goto(origin+'/#/en'+(route==='home'?'':'/quote'));await page.evaluate(async()=>{await document.fonts.ready;});await page.screenshot({path:`${output}/${route}-${size}-${variant}.png`,animations:'disabled'});await page.close();}
 console.log('Captured six baseline/current viewport pairs with identical external asset blocking and reduced motion.');
}finally{await browser.close();}
