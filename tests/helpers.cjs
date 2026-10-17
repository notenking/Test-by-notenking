const { chromium } = require('playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const URL = process.env.BASE_URL || 'http://127.0.0.1:8880/StudyOS_0.0.22.html';
async function launch() {
  return chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox']});
}
async function open(browser, size={width:1440,height:900}) {
  const context=await browser.newContext({viewport:size,deviceScaleFactor:1,locale:'en-US',timezoneId:'Asia/Shanghai'});
  const page=await context.newPage(); page.errors=[];
  page.on('pageerror',e=>page.errors.push(e.message));
  await page.goto(URL); await page.locator('.atelier-today').waitFor();
  return page;
}
async function route(page,name) {
  const control=page.locator(`.global-nav [data-screen="${name}"],.global-tools [data-screen="${name}"]`).first();
  if(await control.isVisible()) await control.click();
  else await page.evaluate(name=>{go(name);},name);
  await page.waitForTimeout(250);
}
async function fit(page) {
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
  assert.deepEqual(page.errors,[],'No JavaScript errors');
}
async function fixture(page, count=10) {
  await page.evaluate(count=>{
    const date=today();
    state.tasks=Array.from({length:count},(_,i)=>({id:`qa-task-${i}`,title:i===2?'Compare contrasting interpretations of the causes of the Cold War — 整理不同观点、证据与引用，写出自己的结论（保留原文）':`Test task ${i+1}`,subject:i%2?'Mathematics':'History',scope:'day',start:date,due:date,minutes:[50,25,80,40,60,15,35,20,45,30][i%10],remainingMinutes:i>=8?0:[50,25,80,40,60,15,35,20][i%8],priority:i===3?1:2,done:i>=8,status:i>=8?'done':'pending',completedAt:i>=8?new Date().toISOString():null,createdAt:new Date().toISOString(),note:'原有笔记 — do not translate',substeps:[],links:[]}));
    state.settings.guideDismissed=true;state.sessions=[];state.timer=null;
    persist();render();
  },count);
}
module.exports={launch,open,route,fit,fixture,assert,fs};
