import { chromium } from 'playwright';
import { expect } from '@playwright/test';
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'], headless: true });
const page = await browser.newPage();
let signedIn = false;
let verificationCount = 0;
let user = {id:'test-customer',email:'customer@example.test',name:'Test Customer'};
const actions = [];
const errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.route('**/api/customer/**',async route=>{
 const request=route.request();const url=new URL(request.url());let response;let status=200;
 if(url.pathname==='/api/customer/session') response={user:signedIn?user:null};
 else if(url.pathname==='/api/customer/auth') {
  const body=request.postDataJSON();actions.push(body.action);
  expect(request.headers()['x-blies-csrf']).toBe('1');
  switch(body.action){
   case 'refresh': if(!signedIn){status=401;response={code:'UNAUTHENTICATED'}}else response={user};break;
   case 'login':signedIn=true;response={user};break;
   case 'verify':signedIn=true;verificationCount++;response={user};break;
   case 'logout':signedIn=false;response={ok:true};break;
   case 'profile':user={...user,name:body.name};response={user};break;
   default:response={ok:true};
  }
 } else if(url.pathname==='/api/customer/records') response={records:[{id:'REQ-SMOKE',kind:'quote',status:'received',created:'2026-10-14T10:00:00Z',data:{cargo:'Test cargo',quantity:2},documents:[{id:'doc-smoke',name:'test.pdf',type:'application/pdf'}]}]};
 else if(url.pathname==='/api/customer/shipments') response={shipments:[{id:'shipment-smoke',reference:'SHIP-SMOKE',status:'in_transit',created:'2026-10-14T10:00:00Z',updated:'2026-10-14T11:00:00Z',events:[{id:'event-smoke',status:'collected',location:'Test location',description:'Recorded collection',created:'2026-10-14T10:00:00Z'}]}]};
 else response={};
 await route.fulfill({status,contentType:'application/json',body:JSON.stringify(response)});
});
try {
 await page.goto(`${process.env.BLIES_FRONTEND_TEST_URL || 'http://localhost:3006'}/#/en/account`);
 await expect(page.getByRole('heading',{name:'Sign in',exact:true})).toBeVisible();
 await page.getByLabel('Email',{exact:true}).fill(user.email);
 await page.getByLabel('Password',{exact:true}).fill('Only-a-test-password');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await expect(page.getByRole('heading',{name:'Your requests',exact:true})).toBeVisible();
 await expect(page.getByText('REQ-SMOKE',{exact:true})).toBeVisible();
 await page.getByText('View request details',{exact:true}).click();
 await expect(page.getByText('Test cargo',{exact:true})).toBeVisible();
 await expect(page.getByRole('link',{name:'Download document: test.pdf'})).toHaveAttribute('href','/api/customer/documents/doc-smoke');
 await page.route('**/api/customer/documents/doc-smoke*', async route=>{
  if(new URL(route.request().url()).searchParams.get('format')==='json') await route.fulfill({contentType:'application/json',body:JSON.stringify({url:'/api/customer/documents/doc-smoke'})});
  else await route.fulfill({contentType:'application/pdf',headers:{'Content-Disposition':'attachment; filename=test.pdf'},body:'%PDF-1.4\nTest document'});
 });
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('link',{name:'Download document: test.pdf'}).click()]);
 expect(download.suggestedFilename()).toBe('test.pdf');

 await expect(page.getByText('Recorded collection',{exact:true})).toBeVisible();
 await page.locator('#a-profile').fill('Updated Customer');
 await page.getByRole('button',{name:'Save profile',exact:true}).click();
 await expect(page.getByText('Your profile has been updated.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Sign out',exact:true}).click();
 await expect(page.getByText('You have been signed out.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Create an account',exact:true}).click();
 await page.getByLabel('Full name',{exact:true}).fill('New Customer');
 await page.getByLabel('Email',{exact:true}).fill('new@example.test');
 await page.getByLabel('Password',{exact:true}).fill('Only-a-test-password');
 await page.getByLabel('Confirm password',{exact:true}).fill('Only-a-test-password');
 await page.getByRole('button',{name:'Create your account',exact:true}).click();
 await expect(page.getByText('Registration request received. Check your email for the next step.',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Forgot your password?',exact:true}).click();
 await page.getByLabel('Email',{exact:true}).fill(user.email);
 await page.getByRole('button',{name:'Send recovery email',exact:true}).click();
 await expect(page.getByText('Recovery request received. If an account matches that address, check your email.',{exact:true})).toBeVisible();
 await page.goto(`${process.env.BLIES_FRONTEND_TEST_URL || 'http://localhost:3006'}/?token_hash=synthetic_verification_hash_1234&type=recovery#/en/account`);
 await expect(page.getByRole('heading',{name:'Set a new password',exact:true})).toBeVisible();
 expect(verificationCount).toBe(1);
 expect(new URL(page.url()).searchParams.has('token_hash')).toBe(false);
 expect(new URL(page.url()).searchParams.has('type')).toBe(false);
 await page.getByLabel('New password',{exact:true}).fill('New-only-test-password');
 await page.getByLabel('Confirm password',{exact:true}).fill('New-only-test-password');
 await page.getByRole('button',{name:'Update password',exact:true}).click();
 await expect(page.getByText('Your password has been updated.',{exact:true})).toBeVisible();
 await page.goto(`${process.env.BLIES_FRONTEND_TEST_URL || 'http://localhost:3006'}/#/fr/account`);
 await expect(page.getByRole('heading',{name:'Vos demandes et vos expéditions.',exact:true})).toBeVisible();
 await page.goto(`${process.env.BLIES_FRONTEND_TEST_URL || 'http://localhost:3006'}/#/ar/account`);
 await expect(page.getByRole('heading',{name:'طلباتك وشحناتك.',exact:true})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 expect(errors).toEqual([]);
 console.log(JSON.stringify({result:'PASS',scope:'Account UI with mocked customer HTTP only',actions,verificationCount,browserErrors:errors.length}));
} finally {await browser.close();}
