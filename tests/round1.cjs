const {launch,open,route,fit,assert,fs}=require('./helpers.cjs');
(async()=>{const b=await launch(); const p=await open(b);const results=[];
try{
  assert.equal(await p.locator('.global-tools .mini-timer').count(),0);
  assert.equal(await p.locator('.global-tools [data-screen="guide"]').count(),0);
  await p.locator('.global-nav [data-action="toggle-more"]').click();
  assert.equal(await p.locator('#more-menu').getAttribute('aria-modal'),null);
  assert.equal(await p.locator('#more-menu button').count(),7);
  const box=await p.locator('#more-menu').boundingBox(),trigger=await p.locator('.global-nav [data-action="toggle-more"]').boundingBox();
  assert.equal(box.width,280);assert.equal(Math.round(box.y-trigger.y-trigger.height),8);
  await p.keyboard.press('Escape');assert.equal(await p.locator('#more-menu').isVisible(),false);
  assert.equal(await p.evaluate(()=>document.activeElement.dataset.action),'toggle-more');
  await p.keyboard.press('ArrowDown');assert.equal(await p.evaluate(()=>document.activeElement.textContent.trim()),'Notebook');
  for(let i=0;i<7;i++) await p.keyboard.press('Tab');
  assert.equal(await p.locator('#more-menu').isVisible(),false,'Tab exits instead of trapping');
  for(const dest of ['notebook','profile','assessment','blocking','guide']){
    await p.locator('.global-nav [data-action="toggle-more"]').click();
    await p.locator(`#more-menu [data-screen="${dest}"]`).click();
    assert.equal(await p.locator('.app-main').getAttribute('data-screen'),dest);
    assert.equal(await p.locator('#more-menu').isVisible(),false);await fit(p);
  }
  for(const action of ['open-tree','v4-archive']){
    await p.locator('.global-nav [data-action="toggle-more"]').click();
    await p.locator(`#more-menu [data-action="${action}"]`).click();
    if(action==='open-tree') assert.equal(await p.evaluate(()=>screen==='plan'&&planView==='tree'),true);
    else {assert.equal(await p.locator('#modal-root .modal').isVisible(),true);await p.keyboard.press('Escape');}
  }
  await route(p,'today');await p.locator('.global-nav [data-action="toggle-more"]').click();
  await p.locator('h1').click();assert.equal(await p.locator('#more-menu').isVisible(),false);
  await p.keyboard.press('Control+k');assert.equal(await p.locator('.command-dialog').isVisible(),true);await p.keyboard.press('Escape');
  for(const size of [{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080},{width:980,height:400}]){
    await p.setViewportSize(size);await p.locator('.global-nav [data-action="toggle-more"]').click();
    const r=await p.locator('#more-menu').boundingBox();assert(r.x>=16&&r.x+r.width<=size.width-16);assert(r.y+r.height<=size.height-16);await fit(p);await p.keyboard.press('Escape');
  }
  results.push('PASS: seven More destinations, toggle/outside/Escape/Tab/arrow keys, search shortcut, no idle timer, trigger anchoring and four window sizes');
  console.log(results);fs.writeFileSync('tests/artifacts/round1.json',JSON.stringify(results,null,2));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
