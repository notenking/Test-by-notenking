const {launch,open,route,fixture,assert,fs}=require('./helpers.cjs');
const crypto=require('node:crypto');
(async()=>{const b=await launch(),p=await open(b);const results=[];
try{
  await p.goto('http://127.0.0.1:8880/StudyOS_0.0.21.html');
  await fixture(p,4);
  let before=await p.evaluate(async()=>{
    state.settings.name='原有名称';state.settings.notebook='here';
    state.settings.reminders={enabled:true,quietStart:'22:00',quietEnd:'07:00',duringFocus:true};
    state.tasks[0].links=['https://example.com/study'];state.tasks[0].substeps=[{id:'old-step-id',title:'原有步骤',done:false}];
    state.sessions=[{id:'old-session-id',date:today(),at:new Date().toISOString(),minutes:12.5,taskId:state.tasks[0].id,phase:'focus',source:'manual',note:'旧记录'}];
    const canvas=document.createElement('canvas');canvas.width=canvas.height=8;const ctx=canvas.getContext('2d');ctx.fillStyle='#315cdb';ctx.fillRect(0,0,8,8);
    await StudyNotebook.save({id:'old-resource-id',title:'原有资料',question:'保留题目和图片',ownAnswer:'我的答案',referenceAnswer:'Reference answer',tags:['标签'],status:'待再看',images:[{id:'old-image-id',name:'original.png',group:'question',data:canvas.toDataURL()}]});
    persist();return {state:structuredClone(state),notebook:await StudyNotebook.list(),key:KEY,draftKey:TASK_DRAFT_KEY};
  });
  // Compare against the original version's own load/normalization behavior.
  await p.reload();
  before=await p.evaluate(async()=>({state:structuredClone(state),notebook:await StudyNotebook.list(),key:KEY,draftKey:TASK_DRAFT_KEY}));
  await p.goto('http://127.0.0.1:8880/StudyOS_0.0.22.html');
  const after=await p.evaluate(async()=>({state:structuredClone(state),notebook:await StudyNotebook.list(),key:KEY,draftKey:TASK_DRAFT_KEY}));
  assert.deepEqual(after,before);
  results.push('PASS — Open 0.0.22 over isolated 0.0.21 storage: all state, task/session/step IDs, notes, settings, notebook records and image bytes unchanged');
  await route(p,'settings');const downloadPromise=p.waitForEvent('download');await p.locator('[data-action="export-data"]').first().click();
  const download=await downloadPromise;const buffer=fs.readFileSync(await download.path());const backup=JSON.parse(buffer);
  assert.equal(backup.version,'0.0.4');assert.equal(backup.notebook.records[0].images[0].data,before.notebook[0].images[0].data);
  const fresh=await open(b);
  await fresh.evaluate(async data=>{await importFile(new File([JSON.stringify(data)],'backup.json',{type:'application/json'}));},backup);
  await fresh.locator('[data-action="v4-confirm-import"]').click();
  await fresh.waitForFunction(()=>state.tasks.length===4);
  const restored=await fresh.evaluate(async()=>({tasks:state.tasks,sessions:state.sessions,notebook:await StudyNotebook.list()}));
  assert.deepEqual(restored.tasks,before.state.tasks);assert.deepEqual(restored.sessions,before.state.sessions);
  assert.deepEqual(restored.notebook,before.notebook);await fresh.reload();assert.equal(await fresh.evaluate(()=>state.sessions[0].id),'old-session-id');
  results.push('PASS — Full backup exported through Settings and restored into a separate empty browser context, including image content; reload preserves restored data');
  await fresh.context().setOffline(true);await route(fresh,'plan');await route(fresh,'focus');await route(fresh,'reflection');
  assert.deepEqual(fresh.errors,[]);results.push('PASS — Inline HTML remains functional with networking disabled after load');
  const baseline=fs.readFileSync('StudyOS_0.0.21.html','utf8');const blocks=[...baseline.matchAll(/<(style|script)\b([^>]*)>([\s\S]*?)<\/\1>/g)];
  const unchanged={10:'engine.js',11:'icons.js',12:'copy-en.js',14:'form-controls.js',15:'prompt-engine.js',16:'clipboard.js',17:'planning.js',18:'reminders.js',19:'notebook.js',20:'block-rules.js',21:'assessment.js',23:'guide.js',24:'review-trend.js',25:'assessment-ui.js',28:'blocker-ui.js',30:'desktop-ui.js'};
  for(const [index,file]of Object.entries(unchanged))assert.equal(fs.readFileSync(`source/${file}`,'utf8'),blocks[+index][3],`${file} unchanged`);
  const originalApp=blocks[22][3],currentApp=fs.readFileSync('source/app.js','utf8');
  // Each preserved named function runs to the next top-level function declaration.
  const functions=['baseState','load','commitState','persist','timerTransaction','timerElapsed','timerSeconds','makeTimer','startTaskTimer','startTimer','pauseTimer','finishTimer','saveFeedback'];
  const get=(text,name)=>{const re=new RegExp('^(?:async )?function '+name+'\\(','m');const match=re.exec(text);assert(match,`${name} found`);const tail=text.slice(match.index);const next=/\n(?:async )?function \w+\(/.exec(tail);return tail.slice(0,next?next.index:undefined)};
  for(const name of functions)assert.equal(get(currentApp,name),get(originalApp,name),`${name} unchanged`);
  const mark=text=>text.match(/const SYMBOL = ([\s\S]*?);\n/)[1];assert.equal(mark(currentApp),mark(originalApp));
  results.push(`PASS — ${Object.keys(unchanged).length} modules and ${functions.length} timer/storage functions byte-identical; original S mark and storage schema retained`);
  fs.writeFileSync('tests/artifacts/preservation.json',JSON.stringify(results,null,2));console.log(results);
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
