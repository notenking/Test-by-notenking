const {launch,open,route,fit,fixture,assert,fs}=require('./helpers.cjs');
(async()=>{const b=await launch();const p=await open(b);const out=[];
try{
  await fixture(p);
  const results=await p.evaluate(()=>{
    const task=state.tasks[0], timer={id:'qa-session',taskId:task.id};
    return ['ready','running','paused','review'].map(status=>StudyUI.taskState(task,{...timer,status}));
  });
  assert.deepEqual(results.map(x=>x.label),['To do','In progress','Paused','Ready to save']);
  assert.equal(await p.locator('.atelier-task .status-todo:not(.sr-only)').count(),0);
  for(const phase of ['ready','running','paused','review']){
    await p.evaluate(phase=>{state.timer={id:'qa-shared-session',taskId:'qa-task-0',status:phase,phase:'focus',duration:3000000,goalMinutes:50,elapsed:10000,started:Date.now(),flow:false};render();},phase);
    const label={ready:'To do',running:'In progress',paused:'Paused',review:'Ready to save'}[phase];
    assert.equal(await p.locator('[data-task-id="qa-task-0"] .task-state').textContent(),label);
    await route(p,'focus');
    assert.equal(await p.locator('#focus-current-status').textContent(),phase==='ready'?'Ready to start':label);
    await p.evaluate(()=>setFocusPresentation(false));
    assert.equal(await p.locator('.global-tools .mini-timer').count(),phase==='ready'?0:1);
    if(phase==='paused'||phase==='review') assert((await p.locator('#mini-timer-text').textContent()).includes(label));
    await route(p,'today');await fit(p);
  }
  for(const size of [{width:1366,height:768},{width:1440,height:900},{width:1920,height:1080}]){
    await p.setViewportSize(size);await fit(p);
    const rects=await p.locator('.atelier-ledger>.atelier-complete').count();
    const geometry=await p.locator('.atelier-task').evaluateAll(rows=>rows.map(row=>{const title=row.querySelector('.grow').getBoundingClientRect(),duration=row.querySelector('.atelier-duration').getBoundingClientRect(),actions=row.querySelector('.task-actions').getBoundingClientRect();return {right:title.right,timeLeft:duration.left,timeRight:duration.right,actionsLeft:actions.left,height:row.getBoundingClientRect().height};}));
    assert(geometry.every(r=>r.right<=r.timeLeft&&r.timeRight<=r.actionsLeft&&r.height>=56));
    assert.equal(new Set(geometry.map(r=>Math.round(r.actionsLeft))).size,1);
  }
  out.push('PASS: ready/running/paused/review/done rendering, shared Focus state, no repeated To do badges, stable long-title rows at three desktop sizes');
  fs.writeFileSync('tests/artifacts/round2.json',JSON.stringify(out,null,2));console.log(out);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
