const {launch,open,route,fit,assert,fs}=require('./helpers.cjs');
(async()=>{const b=await launch(),p=await open(b);const out=[];
try{
  const dates=await p.evaluate(()=>{
    const now=today(),later=E.addDays(now,65);
    for(const [date,prefix] of [[now,'Current'],[later,'Future']]) for(const scope of ['week','month']){
      const [start,due]=scope==='week'?[E.weekStart(date),E.addDays(E.weekStart(date),6)]:E.monthBounds(date);
      for(let i=0;i<2;i++)state.tasks.push({id:`${prefix}-${scope}-${i}`,title:`${prefix} ${scope} goal ${i+1}`,scope,start,due,minutes:60,done:i===0,status:i===0?'done':'pending',priority:2});
    }
    state.sessions=[{id:'sidebar-record',date:now,minutes:32.5,phase:'focus',source:'manual'}];
    state.settings.guideDismissed=true;persist();render();return{now,later};
  });
  const today=await p.locator('.atelier-aside .atelier-goals').innerHTML();
  assert.equal(await p.locator('.atelier-goal-progress').first().textContent(),'1 of 2 complete');
  await p.evaluate(()=>{planView='month';selectedDate=today();go('plan')});
  assert.equal(await p.locator('.calendar-side .atelier-goals').innerHTML(),today);
  assert((await p.locator('.calendar-side .atelier-records').textContent()).includes('32.5 min'));
  assert.equal(await p.locator('.calendar-side').evaluate(el=>getComputedStyle(el).padding),'24px');
  assert.equal(await p.locator('.atelier-goal-progress i').first().evaluate(el=>getComputedStyle(el).height),'3px');
  await p.evaluate(date=>{selectedDate=anchor=date;render();},dates.later);
  assert((await p.locator('.calendar-side').textContent()).includes('Future week goal'));
  assert(!(await p.locator('.calendar-side').textContent()).includes('Current week goal'));
  assert(!(await p.locator('.calendar-side').textContent()).includes('32.5 min'));
  await p.locator('.calendar-side [data-action="sidebar-review"]').first().click();
  assert.equal(await p.evaluate(()=>reviewDate),dates.later);
  await fit(p);
  out.push('PASS: identical Today/Planner goal components, partial progress, selected-date goal scope, activity totals, shared 24px padding/3px rails and contextual Review action');
  fs.writeFileSync('tests/artifacts/round3.json',JSON.stringify(out,null,2));console.log(out);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
