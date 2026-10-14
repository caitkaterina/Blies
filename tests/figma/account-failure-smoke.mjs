import { chromium } from 'playwright';
import { expect } from '@playwright/test';
const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox'],headless:true});
const page=await browser.newPage();const user={id:'failure-smoke',email:'customer@example.test',name:'Test Customer'};
let mode='refresh',refreshes=0,recordsCalls=0,shipmentsCalls=0,profileCalls=0;
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/customer/**',async route=>{
 const req=route.request(),path=new URL(req.url()).pathname;let body,status=200;
 if(path==='/api/customer/session')body={user};
 else if(path==='/api/customer/auth') {
  const action=req.postDataJSON().action;
  if(action==='refresh'){refreshes++;await new Promise(r=>setTimeout(r,100));if(mode==='expired'){status=401;body={error:'Sign in required'}}else body={user};}
  else if(action==='profile'){profileCalls++;if(profileCalls===1){status=401;body={error:'Sign in required'}}else body={user:{...user,name:'Changed name'}};}
  else body={ok:true};
 } else if(path==='/api/customer/records') {
  recordsCalls++;
  if(mode==='malformed')body={};
  else if(mode==='expired'||recordsCalls===1){status=401;body={error:'Sign in required'}}
  else body={records:[]};
 } else if(path==='/api/customer/shipments') {
  shipmentsCalls++;
  if(mode==='expired'||shipmentsCalls===1){status=401;body={error:'Sign in required'}}
  else body={shipments:[]};
 } else body={};
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(body)});
});
try {
 await page.goto(`${process.env.BLIES_FRONTEND_TEST_URL || 'http://localhost:3006'}/#/en/account`);
 await expect(page.getByText('No requests are linked to your account yet. Submit a new request while signed in.',{exact:true})).toBeVisible();
 expect(refreshes).toBe(1);expect(recordsCalls).toBe(2);expect(shipmentsCalls).toBe(2);
 await page.locator('#a-profile').fill('Changed name');await page.getByRole('button',{name:'Save profile',exact:true}).click();
 await expect(page.getByText('Your profile has been updated.',{exact:true})).toBeVisible();expect(profileCalls).toBe(2);expect(refreshes).toBe(2);
 mode='malformed';await page.getByRole('button',{name:'Refresh records',exact:true}).click();
 await expect(page.getByText('The request could not be completed. Please try again.',{exact:true})).toBeVisible();
 mode='expired';await page.getByRole('button',{name:'Refresh records',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
 await expect(page.getByText('Your session has expired. Please sign in again.',{exact:true})).toBeVisible();
 expect(errors).toEqual([]);
 console.log(JSON.stringify({result:'PASS',scope:'Account UI controlled401 and malformed HTTP only',refreshes,profileCalls,browserErrors:errors.length}));
} finally {await browser.close()}
