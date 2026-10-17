
/* StudyOS 0.0.3 — deterministic, inspectable learning and planning rules.
   Questionnaire scores are product heuristics, NOT a validated psychometric scale. */
(function(root){'use strict';
const clamp=(x,min,max)=>Math.min(max,Math.max(min,Number(x)||0));
const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const parseDate=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(s||'');if(!m)return null;const d=new Date(+m[1],+m[2]-1,+m[3],12);return dateKey(d)===s?d:null;};
const addDays=(s,n)=>{const d=parseDate(s)||new Date();d.setDate(d.getDate()+n);return dateKey(d);};
const dayDiff=(a,b)=>{const x=parseDate(a),y=parseDate(b);return x&&y?Math.round((Date.UTC(y.getFullYear(),y.getMonth(),y.getDate())-Date.UTC(x.getFullYear(),x.getMonth(),x.getDate()))/86400000):0;};
const weekStart=s=>{const d=parseDate(s)||new Date();return addDays(dateKey(d),-((d.getDay()+6)%7));};
const monthBounds=s=>{const d=parseDate(s)||new Date();return [dateKey(new Date(d.getFullYear(),d.getMonth(),1)),dateKey(new Date(d.getFullYear(),d.getMonth()+1,0))];};
const bounds=(scope,s)=>{const d=parseDate(s)||new Date();if(scope==='year')return [dateKey(new Date(d.getFullYear(),0,1)),dateKey(new Date(d.getFullYear(),11,31))];if(scope==='month')return monthBounds(s);if(scope==='week'){const w=weekStart(s);return[w,addDays(w,6)];}return [dateKey(d),dateKey(d)];};
const weekNames=['周一','周二','周三','周四','周五','周六','周日'];
const DIMS={start:{name:'学习启动',issue:'计划开始与实际开始有落差',good:'开始学习比较及时',method:'timeblock'},distraction:{name:'干扰与切换',issue:'无关切换挤占学习时间',good:'无关切换较少',method:'pomodoro'},planning:{name:'负荷与计划',issue:'任务安排与可用时间不匹配',good:'任务安排相对可执行',method:'timeblock'},retrieval:{name:'掌握度检验',issue:'较少独立检验是否学会',good:'会主动检验掌握情况',method:'retrieval'},retention:{name:'复习与保持',issue:'复习安排或记忆保持需要调整',good:'已有复习与回忆习惯',method:'spaced'},transfer:{name:'迁移与应用',issue:'换一种题目后不易独立应用',good:'能够尝试不同情境的应用',method:'interleave'},errors:{name:'错题修正',issue:'纠错之后缺少独立复测',good:'会通过重做检验纠错',method:'retrieval'},help:{name:'求助与独立性',issue:'求助后不易独立继续',good:'能够检验外部帮助的结果',method:'explain'},energy:{name:'精力与节奏',issue:'当前学习节奏可能不够可持续',good:'能够根据精力调整安排',method:'flowtime'},monitoring:{name:'反馈与调整',issue:'预估掌握与实际表现存在差距',good:'会参考实际结果调整学习',method:'retrieval'}};
function q(id,title,opts,dim=null,scores=null,when=null){return{id,title,opts,dim,scores,when};}
const BASIC=[
q('grade','你目前处于哪个学习阶段？',['小学高年级','初中','高中','大学','其他']),
q('time','你平均每天的课外自主学习时长是？',['基本不额外学习','1小时以内','1–2.5小时','2.5–4小时','4小时以上']),
q('goal','你现在最希望改善什么？',['减少拖延与分心','把计划真正完成','学过的内容记得更牢','理解更深入，能独立做题','减少无效用功，留出更多时间']),
q('subject','你想优先改善哪一类学习任务？',['数学、编程等推理解题','词汇、概念等知识记忆','阅读、写作与表达','多门科目都需要','其他或还没有决定']),
q('startDelay','过去7天，到了原定学习时间，你通常多久开始？',['5分钟以内','6–15分钟','16–30分钟','超过30分钟','经常没有开始'], 'start',[4,3,2,1,0]),
q('startCause','推迟开始时，最常见的原因是什么？',['还在看视频、聊天或玩游戏','任务太多，不知道先做哪件','题目太难，想要回避','刚结束其他安排，已经很累','实际没有可用时间'],null,null,a=>a.startDelay>=2),
q('finish','过去7天，原定学习任务实际完成了多少？',['几乎全部','大约四分之三','大约一半','不到一半','没有制定过具体计划'],'planning',[4,3,2,0,1]),
q('estimate','没完成任务时，主要是因为？',['估计的用时太短','临时增加了其他任务','被无关的活动占用了时间','计划很多，但没有排列重要性','大部分时间卡在知识问题上'],null,null,a=>a.finish>=2),
q('distraction','最近几次学习中，主动切去做无关事情的频率是？',['基本没有','偶尔一两次','大约每30分钟一次','大约每10分钟一次','几分钟就会切换'],'distraction',[4,3,2,1,0]),
q('distractCause','这些切换最常发生在什么情况下？',['看到通知或想刷视频时','遇到不会的题目时','内容重复、感觉无聊时','连续学习很久，感到疲惫时','没有明确任务时'],null,null,a=>a.distraction>=2),
q('span','在合适的任务上，你通常能舒适地连续学习多久？',['15分钟以内','15–30分钟','30–50分钟','50–90分钟','90分钟以上']),
q('preference','哪种学习节奏让你感觉更自然？',['短一些的学习，固定时间休息','较长的连续学习，再完整休息','有思路就继续，需要时再休息','不同任务用不同节奏','还没试过，不确定']),
q('timerExperience','使用固定时间的计时器时，你最常遇到什么？',['时间到了正好想休息','铃响会打断仍在进行的思考','铃响前就已经疲惫或分心','没有明显帮助，也没有明显影响','还没使用过'],null,null,a=>a.preference===0||a.preference===1),
q('check','学完新知识后，你通常怎样检验自己会了？',['合上资料，独立做新题或解释','会独立回忆一部分，再核对','看着例题跟着做一遍','主要通过重读或整理笔记确认','一般不会专门检验'],'retrieval',[4,3,2,1,0]),
q('recallObstacle','你较少闭卷回忆或独立自测，主要因为？',['以前不知道可以这样复习','知道这个方法，但觉得太费时','一回忆就想不起来，容易受挫','不知道应该给自己出什么题','当前任务主要不是知识学习'],null,null,a=>a.check>=3),
q('review','重要内容学过以后，你通常什么时候再复习？',['分几天安排复习，并检验记忆','有固定周期，但不一定检验','想起来时才重新看看','主要在考试前集中复习','一般不复习'],'retention',[4,3,2,1,0]),
q('retained','几天后不看笔记，你通常能做到什么？',['独立解释，并解决相关问题','大部分内容能自己想起','有一点提示才能想起','觉得熟悉，但说不清或不会做','大部分已经忘记'],'retention',[4,3,2,1,0]),
q('transfer','例题会做后，换一种问法或情境，你通常怎样？',['能自己判断该用什么知识','思考后大部分可以完成','需要先对照类似例题','看得懂讲解，但很难独立做','暂时没有检验过'],'transfer',[4,3,1,0,null]),
q('mistakes','一道题改正后，你通常会做什么？',['隔几天不看答案重新做','马上合上答案独立重做','整理错误原因，但不再做','只抄正确过程或看一遍答案','通常不专门处理'],'errors',[4,3,2,1,0]),
q('help','得到老师、同学或 AI 的讲解后，你通常会？',['核对讲解，再独立完成同类题','独立复述思路或重做原题','跟着讲解做，之后不再检验','直接使用答案，暂时不理解也接受','最近没有求助过'],'help',[4,3,1,0,null]),
q('aiIssue','使用外部讲解时，最大的困难是什么？',['解释跳步骤或有看不懂的词','不知道答案本身是否正确','讲解看懂了，但自己仍不会做','只有照片，不方便输入题目','没有明显困难'],null,null,a=>a.help>=2&&a.help<=3),
q('energy','过去7天，课外学习时的精力情况通常怎样？',['大多数时候精力充足','有点疲惫，会及时调整','后半段明显疲惫，效率下降','很早就疲惫，但仍持续硬撑','变化很大，暂时看不出规律'],'energy',[4,3,1,0,null]),
q('calibration','最近一次觉得“已经学会”的内容，独立检验时怎样？',['与预期基本一致','比预想差一些，之后有调整','经常以为会了，实际不会做','不知道，最近没有独立检验','不同科目差异很大'],'monitoring',[4,3,1,0,null]),
q('capacity','你通常能稳定安排多少课外学习时间？',['每天30分钟以内','每天约60分钟','每天约90分钟','每天约120分钟','不固定，需要每天单独安排'])
];
const DEEP=[
q('d_startReady','最近7天，开始学习前会反复做无关的准备吗？',['很少','偶尔','经常要准备很久','几乎每次都会','没有留意'],'start',[4,3,1,0,null]),
q('d_startTask','相同时间长度下，你会更拖延难题而不是熟悉的任务吗？',['没有明显差异','稍微会，但能按时开始','经常只先做熟悉的任务','难题常常被一直推后','缺少可比较的经历'],'start',[4,3,1,0,null]),
q('d_resume','最近一次被打断后，你用了多久回到原任务？',['5分钟以内','6–15分钟','16–30分钟','超过30分钟或当天没回来','最近没有被打断'],'distraction',[4,3,1,0,4]),
q('d_environment','学习时，你会怎样处理无关的通知和页面？',['主动关闭，不需要时不打开','减少大部分，但偶尔查看','都保持打开，有提示就查看','经常同时学习和看娱乐内容','没有这些干扰来源'],'distraction',[4,3,1,0,4]),
q('d_priority','两个任务都快到期时，你通常依据什么安排？',['结合截止时间、重要性和预估用时','主要依据截止时间','先做最容易完成的','不断来回切换，没有先后安排','最近没有类似情境'],'planning',[4,3,1,0,null]),
q('d_planCost','最近一项较大的任务，实际用时与预计相比如何？',['相差不到约25%','大约多出一半','超过预计的两倍','没有预估过任务用时','最近没有较大的任务'],'planning',[4,2,0,1,null]),
q('d_retrieve','过去7天，你有几次不看资料主动检验掌握度？',['5次及以上','3–4次','1–2次','没有','近期没有知识类学习任务'],'retrieval',[4,3,2,0,null]),
q('d_feedback','自测发现不会时，你通常怎么处理？',['核对具体缺口，再重新独立检验','核对答案并补充理解','只把答案抄入笔记','跳过，不再处理','近期没有做过自测'],'retrieval',[4,3,1,0,null]),
q('d_spacing','同一内容的几次复习，通常如何分布？',['分散在几天，参考记忆情况调整','按固定日期分散安排','集中在同一天重复多次','直到考试前才集中看','最近没有复习过'],'retention',[4,3,1,0,0]),
q('d_forget','复习时确认自己忘记了，你通常会怎样安排？',['补学后较快重测，再逐渐延长间隔','重新学习，但不确定下次何时复习','只是再看一遍','把复习全部推到考试前','近期没有遇到'],'retention',[4,2,1,0,null]),
q('d_mixed','一页题目没有标出题型时，你能独立选择解法吗？',['大部分能够','通常思考后可以','需要查找对应例题','经常不知道题目要考什么','当前学习不适用'],'transfer',[4,3,1,0,null]),
q('d_compare','相似的概念或解法容易混淆时，你通常会？',['用具体例子比较适用条件','重新阅读两者的定义','分别背诵，不比较差异','暂时跳过混淆点','最近没有这种情况'],'transfer',[4,2,1,0,null]),
q('d_errorType','你是否知道最近几次错题主要错在哪里？',['知道具体原因，并验证过','大概知道原因','通常统一归为粗心','很少区分错误来源','近期没有做题'],'errors',[4,3,1,0,null]),
q('d_errorReturn','同样的错误在新题里出现时，你会怎么做？',['比较上次纠正方法，独立复测','再次仔细看讲解','再抄一次正确答案','暂时不处理','近期没有重复错误'],'errors',[4,3,1,0,4]),
q('d_verify','外部讲解给出答案，你怎样确认它可信？',['代回条件或用另一种方法核对','与教材、老师的讲解对照','只要看起来流畅就认为正确','通常不核对，直接使用','近期未使用外部讲解'],'help',[4,3,1,0,null]),
q('d_helpLevel','寻求帮助时，你能明确自己希望得到什么吗？',['能选择提示、检查或完整讲解','通常能说清哪一部分没懂','只是把题目发出去，需求不明确','得到答案就结束，不考虑理解','近期没有求助经历'],'help',[4,3,1,0,null]),
q('d_rest','休息后，你通常能否恢复到可以学习的状态？',['通常能，安排也较灵活','大多数时候可以','休息后仍经常很疲惫','不太会休息，主要继续硬撑','没有留意'],'energy',[4,3,1,0,null]),
q('d_rhythm','学习时段与你较清醒的时间是否匹配？',['高难任务会安排在较清醒时段','大部分时候匹配','常在很累时才开始最难的任务','经常完全无视自己的精力状态','时间受外部安排限制，无法选择'],'energy',[4,3,1,0,null]),
q('d_adjust','尝试一种方法后，你通常依据什么决定是否保留？',['对比几次完成情况和独立检验','参考是否更容易坚持和完成','主要凭当时感觉','用多久都很少回顾效果','最近没有尝试过新方法'],'monitoring',[4,3,2,0,null]),
q('d_prediction','独立测验之前，你会不会预估自己会做哪些内容？',['预估后核对差距，并调整复习','会预估，但不经常核对','凭熟悉感估计，不做核对','基本不考虑自己还有哪些不会','当前学习情境不适用'],'monitoring',[4,3,1,0,null]),
q('d_memorySubject','记忆困难是否集中在特定任务？',['主要是词汇、事实或术语','主要是公式与适用条件','主要是长文章或大段内容','多种内容都有','目前记忆不是主要困难']),
q('d_changeTolerance','新学习方法与原有习惯不同时，你更接受？',['每次只调整一个小设置','保留原习惯，只加一个学习环节','直接完整尝试一种新方法','先看实际效果，再决定是否使用','还不确定'])
];
const ALL=[...BASIC,...DEEP],QMAP=Object.fromEntries(ALL.map(q=>[q.id,q]));
function activeQuestions(mode,answers){return(mode==='deep'?DEEP:BASIC).filter(q=>!q.when||q.when(answers));}
function chosen(a,id){const x=QMAP[id],v=a[id];return x&&Number.isInteger(v)&&v>=0?x.opts[v]:'尚未确定';}
function scores(a){const out=Object.fromEntries(Object.keys(DIMS).map(id=>[id,{sum:0,n:0,score:null,evidence:[],spread:0}]));ALL.forEach(q=>{if(!q.dim||!q.scores||q.when&&!q.when(a))return;const v=a[q.id];if(!Number.isInteger(v)||v<0||q.scores[v]==null)return;const d=out[q.dim];d.sum+=q.scores[v];d.n++;d.evidence.push({id:q.id,title:q.title,answer:q.opts[v],value:q.scores[v]});});for(const d of Object.values(out)){if(d.n)d.score=d.sum/d.n;const v=d.evidence.map(e=>e.value);d.spread=d.n?Math.max(...v)-Math.min(...v):0;}return out;}
const METHODS=[
{id:'pomodoro',name:'番茄工作法',en:'Pomodoro',icon:'timer',tag:'短时节奏',mins:25,rest:5,type:'focus',desc:'专注与休息分段进行。先试25 / 5，也可以改成你的节奏。',why:'想减少无关切换，或更喜欢固定短时段时可试。',steps:['选一项真实学习任务，设定专注和休息时长。','专注阶段只进行这项任务；需要资料时正常查阅。','结束后记录完成情况，再决定休息或调整下一轮。'],limits:'25 / 5 是常见起点，不是适合所有人的最优时长。',evidence:'时间管理策略；需要结合你的实际体验验证。'},
{id:'deep',name:'长时段专注',en:'Deep focus',icon:'circle',tag:'连续思考',mins:60,rest:10,type:'focus',desc:'为推理、写作和编程保留一整块时间，不频繁打断思路。',why:'更偏好完整学习时段，且短计时器容易打断思路时可试。',steps:['为一项需要连续思考的任务预留一整块时间。','选择舒适的时长，保留访问学习资料的自由。','到时检查疲劳与完成情况；不把硬撑等同于专注。'],limits:'时长并不代表能力。感觉疲惫时可以提前结束。',evidence:'任务安排策略；长时段不必然比短时段更有效。'},
{id:'flowtime',name:'弹性专注',en:'Flowtime',icon:'wave',tag:'自主节奏',mins:45,rest:8,type:'focus',desc:'正向计时，需要休息时主动结束，记录自然持续时长。',why:'不喜欢固定铃声，或不同任务的专注时长差别较大时可试。',steps:['开始正向计时，不预设必须坚持多久。','需要休息或任务结束时主动结束计时。','记录精力和任务成果，慢慢找到适合自己的节奏。'],limits:'正向计时最多记录4小时；不是鼓励连续学习4小时。',evidence:'节奏试验策略；效果由后续记录观察。'},
{id:'retrieval',name:'主动回忆',en:'Active recall',icon:'book',tag:'检验掌握',mins:25,rest:5,type:'review',desc:'先不看资料回答问题，再核对遗漏，而不只依靠熟悉感。',why:'复习主要靠重读、或经常以为会了但做不出时优先尝试。',steps:['把需要掌握的内容写成问题，并保存参考答案。','不看答案，用自己的话回忆或独立解题。','显示参考答案，核对缺口并为回忆表现评分。'],limits:'没有学懂的内容需要先补充理解；自评不是客观考试成绩。',evidence:'提取练习具有研究支持；不保证每个场景和每个人收益相同。',source:'https://www.science.org/doi/10.1126/science.1199327'},
{id:'spaced',name:'间隔复习',en:'Spaced practice',icon:'refresh',tag:'长期保持',mins:20,rest:5,type:'review',desc:'把同一内容分到不同日期复习，参考记忆表现调整间隔。',why:'主要在考前突击，或几天后容易遗忘时优先尝试。',steps:['把重要内容加入复习卡，初次在次日回忆。','到期先独立回忆，再显示参考答案。','根据回忆表现重新排期，忘记的内容更早出现。'],limits:'本版本的日期安排是可解释的启发式规则，不是最优记忆模型。',evidence:'分散练习具有研究支持；具体间隔取决于材料与保持目标。',source:'https://pubmed.ncbi.nlm.nih.gov/16719566/'},
{id:'interleave',name:'交错练习',en:'Interleaving',icon:'layers',tag:'辨别题型',mins:40,rest:8,type:'focus',desc:'理解基本方法后，混合练习相近题型，练习选择解法。',why:'原题能做，换一种问法就难以选择方法时可试。',steps:['选两三种已经学过、容易混淆的题型。','混合顺序练习，不提前标明该用哪一种方法。','核对解题依据，记录混淆点，而不只看正确率。'],limits:'刚接触完全陌生内容时，先学习和练习基本方法。',evidence:'研究支持取决于任务类型；不是把无关科目频繁切换。',source:'https://pdf.retrievalpractice.org/InterleavingGuide.pdf'},
{id:'explain',name:'自我解释',en:'Self-explanation',icon:'message',tag:'深入理解',mins:30,rest:5,type:'focus',desc:'解释每一步为什么成立，暴露真正没有理解的地方。',why:'讲解看得懂，离开讲解却无法重现过程时可试。',steps:['选一个已经学过的概念或解题过程。','用自己的话解释为什么成立、适用条件与一个例子。','对照资料核对；不确定处整理为 AI 提问或请教老师。'],limits:'解释流畅不等于正确，需要核对条件和独立检验。',evidence:'自我解释是学习策略；本应用不自动判断解释是否正确。'},
{id:'timeblock',name:'时间块计划',en:'Time blocking',icon:'calendar',tag:'计划执行',mins:45,rest:10,type:'focus',desc:'把任务与实际日期、优先级、预计用时放在一起安排。',why:'任务经常安排过多或不知道先做什么时可试。',steps:['把作业与复习安排到日历，标注预计用时和优先级。','按实际可用时间排入当天，留出余量。','完成后核对预计与记录时间，调整之后的负荷。'],limits:'优先级和截止时间由你决定，应用不会自行改期。',evidence:'计划执行工具；不能代替理解和练习。'}
];
const MMAP=Object.fromEntries(METHODS.map(m=>[m.id,m]));
function recommend(s){const a=s.answers||{},sc=scores(a);const marks=Object.fromEntries(METHODS.map(m=>[m.id,{...m,points:0,reasons:[]}]));const bump=(id,n,r)=>{marks[id].points+=n;if(r)marks[id].reasons.push(r);};
if(a.preference===1){bump('deep',4,'你更偏好较长的连续学习。');}else if(a.preference===2||a.preference===3)bump('flowtime',4,'你倾向按任务状态灵活休息。');else if(a.preference===0)bump('pomodoro',4,'你偏好固定的短时学习节奏。');
if(a.timerExperience===1)bump('deep',3,'固定铃声曾打断你的思路。');if(a.span===0||a.span===1)bump('pomodoro',1,'你报告的舒适连续时长较短。');
if(a.distraction>=2&&a.distractCause===0)bump('pomodoro',2,'无关通知或娱乐网站是你报告的干扰来源。');
for(const[id,d]of Object.entries(sc))if(d.score!=null&&d.score<2.6)bump(DIMS[id].method,(4-d.score)*1.1,`${DIMS[id].name}是当前可尝试改善的环节。`);
if(a.goal===1)bump('timeblock',2,'完成计划是你最希望改善的目标。');if(a.goal===2)bump('spaced',2,'你希望学过的内容记得更牢。');if(a.goal===3){bump('explain',1,'你希望更深入地理解知识。');bump('interleave',1);}if(a.subject===0)bump('interleave',.7);if(a.subject===1)bump('spaced',.7);if(a.subject===2)bump('explain',.7);
for(const m of METHODS){const votes=(s.methodVotes||[]).filter(v=>v.method===m.id).slice(-5);if(votes.length>=2){const good=votes.filter(v=>v.value>0).length;bump(m.id,(good/votes.length-.5)*2,`你最近${votes.length}次方法反馈中有${good}次认为有帮助。`);}}
return Object.values(marks).sort((a,b)=>b.points-a.points).map(m=>({...m,reason:m.reasons.slice(0,2).join(' ')||m.why}));}
function recommendedClock(s){const a=s.answers||{};let id='pomodoro';if(a.preference===1||a.timerExperience===1)id='deep';else if(a.preference===2||a.preference===3)id='flowtime';let mins=id==='deep'?60:id==='flowtime'?45:25;if(id==='deep'&&a.span===2)mins=45;if(a.span===0&&id==='pomodoro')mins=15;return{method:id,minutes:mins,rest:MMAP[id].rest,rounds:id==='pomodoro'?4:1};}
function analysis(s){const a=s.answers||{},sc=scores(a),findings=[];const low=Object.keys(sc).filter(k=>sc[k].score!=null&&sc[k].score<2.6).sort((x,y)=>sc[x].score-sc[y].score);
for(const id of low){let text=DIMS[id].issue,detail='',method=DIMS[id].method;const d=sc[id];
if(id==='distraction'){if(a.distractCause===1){text='中断更多与卡题有关，而不只是娱乐';detail='优先把题目和需要的讲解整理为 AI 提问；得到讲解后再独立检验。网页屏蔽不一定是主要解法。';method='explain';}else if(a.distractCause===3){text='中断可能与连续学习后的疲惫有关';detail='先尝试弹性休息，不因为中断就简单延长学习时间。';method='flowtime';}else{detail='优先减少自己确认无关的切换；屏蔽工具只在主动开启后使用。';}}
if(id==='start'){detail=a.startCause===1?'任务多时，先在日历中明确截止时间与优先级。':a.startCause===2?'困难任务更容易被推后。可以把题目整理为 AI 提问，再给实际练习保留时间。':a.startCause===3||a.startCause===4?'可用时间或精力可能是限制；不要仅用“自律不足”解释。':'把已有任务安排到具体时间段，观察计划与实际开始的差距。';}
if(id==='planning')detail=a.estimate===0?'你报告的主要原因是低估用时。根据完成任务的实际记录调整估算，先不增加每日负荷。':'将年、月、周目标落实为可执行的日任务，再检查是否超过当天容量。';
if(id==='retrieval')detail='给真实知识点建立问题与答案，先闭卷回忆，再核对；避免只用“看起来熟悉”判断掌握。';
if(id==='retention')detail='将重要内容加入到期复习队列，根据每次回忆情况调整日期，而不只按“完成”排期。';
if(id==='transfer')detail='在基本方法已经理解后，尝试不同情境的题目，并比较为什么选这种解法。';
if(id==='errors')detail='把错题改写为可以独立重做的问题，在之后的复习中再次检验。';
if(id==='help')detail='AI 提问可以选择完整讲解、检查解法或变式练习；收到回答后核对条件，而不是自动采纳。';
if(id==='energy')detail='试验更灵活的休息和较轻的任务负荷。这里反映的是你的自述，不是健康诊断。';
if(id==='monitoring')detail='把预计掌握与闭卷检验对照，记录具体结果。计时器运行时间本身不能证明已经学会。';
findings.push({id,title:text,detail,method,evidence:d.evidence.filter(e=>e.value<3).slice(0,2),confidence:d.n>=3?'多条自述支持':'初步线索',n:d.n});}
const strengths=Object.keys(sc).filter(id=>sc[id].score>=3&&sc[id].n>=1).sort((a,b)=>sc[b].score-sc[a].score).map(id=>({id,title:DIMS[id].good,evidence:sc[id].evidence.filter(e=>e.value>=3).slice(0,2),n:sc[id].n}));
const uncertainties=[];if(a.review===0&&a.retained>=3)uncertainties.push('你报告已有分散复习，但保持效果仍不理想。需要结合复习材料和实际回忆记录判断，而不是直接认定方法有效。');if(a.distraction===0&&a.d_resume>=2)uncertainties.push('你很少主动切换，但被打断后恢复较慢。减少外部打断与主动屏蔽娱乐不是同一个问题。');if(a.span>=3&&a.energy>=2&&a.energy<=3)uncertainties.push('你能连续学较久，也报告疲惫。连续时长不能单独证明当前节奏适合你。');
const answered=activeQuestions('basic',a).concat(DEEP).filter(q=>Number.isInteger(a[q.id])&&a[q.id]>=0).length;return{scores:sc,findings,strengths,uncertainties,answered,recommendations:recommend(s)};}
function adaptive(s){const config=s.focusConfig||recommendedClock(s);const records=(s.sessions||[]).filter(r=>r.phase!=='break'&&r.minutes>=1&&r.feedback&&r.method===config.method).slice(-5);if(records.length<3)return null;const recent=records.slice(-3),ids=recent.map(r=>r.id).join('-');let result=null;const n=code=>recent.filter(r=>r.feedback===code).length;
if(config.method!=='flowtime'&&n('interrupted')>=2&&config.minutes<120)result={id:'longer-'+ids,type:'duration',title:`试试 ${Math.min(120,config.minutes+10)} 分钟的连续学习`,detail:`同一种方法最近3次记录里，${n('interrupted')}次反馈铃声打断思路。建议只增加10分钟，观察是否更适合。`,next:{...config,minutes:Math.min(120,config.minutes+10)},count:3};
else if((n('tired')>=2||n('distracted')>=2)&&config.minutes>15&&config.method!=='flowtime')result={id:'shorter-'+ids,type:'duration',title:`试试 ${Math.max(15,config.minutes-10)} 分钟，增加一次休息`,detail:`同一种方法最近3次中，${n('tired')}次疲惫、${n('distracted')}次多次分心。这是小样本建议，不是确定结论。`,next:{...config,minutes:Math.max(15,config.minutes-10),rest:Math.min(30,config.rest+2)},count:3};
else if(n('tired')>=2)result={id:'rest-'+ids,type:'duration',title:'试试更长一点的休息',detail:'最近3次中有至少2次反馈疲惫。先将休息增加2分钟，避免自动增加学习负荷。',next:{...config,rest:Math.min(30,config.rest+2)},count:3};
if(result&&(s.adaptHistory||[]).some(h=>h.id===result.id))return null;return result;}
const scopes=['year','month','week','day'];const scopeNames={year:'年目标',month:'月目标',week:'周目标',day:'日任务'};
function taskProgress(t,tasks,visited=new Set()){if(visited.has(t.id))return{done:0,total:0,percent:0};visited.add(t.id);const children=tasks.filter(x=>x.parentId===t.id);if(!children.length)return{done:t.done?1:0,total:1,percent:t.done?100:0};let done=0,total=0;for(const c of children){const p=taskProgress(c,tasks,new Set(visited));done+=p.done;total+=p.total;}return{done,total,percent:total?Math.round(done/total*100):0};}
function descendants(id,tasks,seen=new Set()){if(seen.has(id))return[];seen.add(id);const children=tasks.filter(t=>t.parentId===id);return children.flatMap(c=>[c,...descendants(c.id,tasks,seen)]);}
function taskOnDate(t,date){return t.scope==='day'&&t.start<=date&&t.due>=date;}
function planErrors(t,tasks){if(!t.title||!t.title.trim())return'请填写任务名称';if(!parseDate(t.start)||!parseDate(t.due))return'请选择有效日期';if(t.due<t.start)return'结束日期不能早于开始日期';if(!scopes.includes(t.scope))return'请选择计划层级';if(t.parentId){const p=tasks.find(x=>x.id===t.parentId);if(!p)return'上级目标不存在';if(p.id===t.id||scopes.indexOf(p.scope)>=scopes.indexOf(t.scope))return'上级目标必须属于更大的计划层级';if(t.start<p.start||t.due>p.due)return'任务日期需要落在上级目标的日期范围内';}for(const c of tasks.filter(x=>x.parentId===t.id)){if(scopes.indexOf(t.scope)>=scopes.indexOf(c.scope))return'新层级不能小于或等于已有子任务层级';if(c.start<t.start||c.due>t.due)return'新的日期范围需要覆盖已有子任务';}return null;}
function rateReview(card,rating,today=dateKey()){const old=clamp(card.interval||1,1,90);let interval=1;if(rating===2)interval=Math.max(2,Math.round(old*1.7));if(rating===3)interval=Math.max(3,Math.round(old*2.4));return{...card,interval:Math.min(90,interval),due:addDays(today,Math.min(90,interval)),lastReviewed:today,reps:(card.reps||0)+1,history:[...(card.history||[]),{date:today,rating,interval}].slice(-80)};}
function normalizeDomain(v){try{let x=String(v||'').trim();const aliases={youtube:'youtube.com','油管':'youtube.com','bilibili':'bilibili.com','b站':'bilibili.com','抖音':'douyin.com','微博':'weibo.com'};x=aliases[x.toLowerCase()]||x;if(!x.includes('://'))x='https://'+x;const u=new URL(x);if(!['https:','http:'].includes(u.protocol))return null;const h=u.hostname.toLowerCase().replace(/^www\./,'');if(h.length>253||!h.includes('.')||h.split('.').some(x=>!x||x.length>63||!/^([a-z0-9]|[a-z0-9][a-z0-9-]*[a-z0-9])$/.test(x)))return null;return ['youtu.be','m.youtube.com','music.youtube.com','youtube-nocookie.com'].includes(h)?'youtube.com':h;}catch{return null;}}
const E={clamp,dateKey,parseDate,addDays,dayDiff,weekStart,monthBounds,bounds,weekNames,DIMS,BASIC,DEEP,ALL,QMAP,activeQuestions,chosen,scores,METHODS,MMAP,recommend,recommendedClock,analysis,adaptive,scopes,scopeNames,taskProgress,descendants,taskOnDate,planErrors,rateReview,normalizeDomain};root.StudyEngine=E;if(typeof module!=='undefined'&&module.exports)module.exports=E;
})(typeof window!=='undefined'?window:globalThis);

