const{launch,open,route,fixture,assert,fs}=require('./helpers.cjs');
(async()=>{const b=await launch(),p=await open(b);const out=[];
try{
  await route(p,'reflection');assert.equal(await p.locator('.review-suggestion').count(),0);
  assert.equal(await p.locator('.review-explanation').count(),1);
  assert.equal(await p.locator('.review-explanation p').first().isVisible(),false);
  await p.locator('.review-explanation summary').click();assert((await p.locator('.review-explanation').textContent()).includes('Missing records do not mean no study'));
  await fixture(p,3);
  for(const count of [1,2,3]){
    await p.evaluate(count=>{state.tasks.forEach(t=>setTaskCompletion(t,true));state.sessions=state.tasks.slice(0,count).map((t,i)=>({id:`review-${i}`,date:today(),phase:'focus',minutes:25,taskId:t.id,source:i===1?'manual':'timer'}));go('reflection');},count);
    assert.equal(await p.locator('.review-suggestion').count(),count===3?1:0);
  }
  assert((await p.locator('.review-suggestion').textContent()).includes('3 tasks'));
  assert.equal(await p.locator('.review-explanation').count(),1);
  await p.locator('[data-action="v4-review-period"][data-period="week"]').click();
  assert.equal(await p.locator('.review-explanation').count(),1);
  for(const dest of ['today','plan','focus','reflection','settings','assessment','profile','blocking','guide']){
    await route(p,dest);
    const foreign=await p.locator('body').innerText();
    const withoutUser=foreign.replaceAll('Compare contrasting interpretations of the causes of the Cold War — 整理不同观点、证据与引用，写出自己的结论（保留原文）','').replaceAll('原有笔记 — do not translate','');
    assert(!/[\u3400-\u9fff]/.test(withoutUser),`English visible copy on ${dest}`);
  }
  out.push('PASS: no empty/insufficient-data suggestion, evidence threshold at three completed linked tasks, one collapsed records explanation, English visible pages (user text excluded)');
  fs.writeFileSync('tests/artifacts/round5.json',JSON.stringify(out,null,2));console.log(out);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
