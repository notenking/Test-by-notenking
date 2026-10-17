const{launch,open,route,fit,fixture,assert,fs}=require('./helpers.cjs');
(async()=>{const b=await launch();const out=[];
try{
 for(const size of [{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080}]){
  const p=await open(b,size),suffix=`${size.width}x${size.height}`;
  await p.screenshot({animations:'disabled',path:`tests/artifacts/today-empty-${suffix}.png`});
  await fit(p);await fixture(p);
  await p.evaluate(()=>{
    const titles=['Outline the Biology IA discussion','Practice integration by substitution',null,'Prepare evidence for the History essay','Read and annotate chapter 8','Check significant figures in lab results','Plan the Economics presentation','整理课堂笔记，标注待确认的公式','Review vocabulary notes','Organize project references'];
    state.tasks.forEach((t,i)=>{if(titles[i])t.title=titles[i]});
    for(const scope of ['week','month']){
      const date=today(),[start,due]=scope==='week'?[E.weekStart(date),E.addDays(E.weekStart(date),6)]:E.monthBounds(date);
      for(let i=0;i<2;i++)state.tasks.push({id:`${scope}-${i}`,title:scope==='week'?['Submit the Biology outline','Finish two practice sets'][i]:['Organize course materials','Complete the first essay draft'][i],scope,start,due,minutes:60,done:i===0,status:i===0?'done':'pending',priority:2});
    }
    state.sessions=[{id:'layout-record',taskId:'qa-task-8',date:today(),minutes:32.5,phase:'focus',source:'timer'}];
    state.timer={id:'layout-timer',taskId:'qa-task-0',status:'paused',phase:'focus',duration:3000000,goalMinutes:50,elapsed:90000,started:Date.now(),startISO:new Date().toISOString(),method:'timeblock',flow:false};persist();render();
  });
  await p.screenshot({animations:'disabled',path:`tests/artifacts/today-tasks-${suffix}.png`});
  await fit(p);
  const nav=await p.locator('.global-link').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return{x:r.x,right:r.right,y:r.y,width:r.width,h:r.height,font:getComputedStyle(el).fontSize}}));
  assert(nav.every((r,i)=>r.h===40&&r.y===nav[0].y&&(!i||r.x>=nav[i-1].right)));
  assert.equal(await p.locator('.global-link .studyos-icon').first().evaluate(el=>getComputedStyle(el).width),'20px');
  const rows=await p.locator('.atelier-task').evaluateAll(els=>els.map(el=>{const a=el.querySelector('.grow').getBoundingClientRect(),b=el.querySelector('.atelier-duration').getBoundingClientRect(),c=el.querySelector('.task-actions').getBoundingClientRect();return {gap:b.left-a.right,gap2:c.left-b.right,x:c.x,font:getComputedStyle(el.querySelector('.task-title')).fontSize,height:el.getBoundingClientRect().height}}));
  assert(rows.every(r=>r.gap>=0&&r.gap2>=0&&r.height>=56&&r.font==='15px'));
  assert.equal(new Set(rows.map(r=>Math.round(r.x))).size,1);
  await p.locator('.global-nav [data-action="toggle-more"]').click();await p.screenshot({animations:'disabled',path:`tests/artifacts/more-${suffix}.png`});
  await p.keyboard.press('Control+k');assert.equal(await p.locator('#more-menu').isVisible(),false);await p.keyboard.press('Escape');
  await p.evaluate(()=>{planView='month'});await route(p,'plan');
  await p.screenshot({animations:'disabled',path:`tests/artifacts/planner-${suffix}.png`});await fit(p);
  await p.locator('.calendar-side [aria-label="Add weekly goal"]').click();
  assert.equal(await p.locator('#task-form [name="scope"]').inputValue(),'week');await p.keyboard.press('Escape');
  await route(p,'focus');await p.screenshot({animations:'disabled',path:`tests/artifacts/focus-paused-${suffix}.png`});await fit(p);
  await route(p,'reflection');await p.screenshot({animations:'disabled',path:`tests/artifacts/review-${suffix}.png`});await fit(p);
  await route(p,'settings');await fit(p);assert.equal(await p.locator('[data-action="export-data"]').count()>0,true);
  await route(p,'today');await p.evaluate(()=>{state.timer=null;state.tasks.forEach(t=>setTaskCompletion(t,true));persist();render();});
  assert.equal(await p.locator('.atelier-goal-progress').first().textContent(),'2 of 2 complete');
  await p.screenshot({animations:'disabled',path:`tests/artifacts/today-complete-${suffix}.png`});await fit(p);
  out.push(`PASS — ${suffix} @ 1×: empty/10 tasks/long mixed title/paused/all-done, More, Planner sidebar, Focus, Review, Settings; 20px nav icons and 15px task text; aligned actions; no overflow or JS errors`);
  await p.context().close();
 }
 fs.writeFileSync('tests/artifacts/layout.json',JSON.stringify(out,null,2));console.log(out);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
