
/* StudyOS 0.0.3. Subject/task-aware prompts; no network calls or image recognition. */
(function(root){'use strict';
const families={
 literature:{role:'文学阅读与赏析老师',material:'原文、节选或课堂问题',placeholder:'粘贴需要讨论的原文或课堂问题；也可以只添加截图。',context:'作品、作者与阅读范围',contextHint:'例如 Never Let Me Go，Kazuo Ishiguro，只读到第7章',guard:'引语只能来自我提供或你能核实的原文，不编造引语、页码或情节。严格区分文本事实与文学解读；没有原文支持的判断说明不确定。不要超出我指定的阅读范围剧透。不要把文学解读写成只有一个标准答案的解题过程。'},
 language:{role:'语言学习老师',material:'句子、文章或练习',placeholder:'粘贴例句、阅读材料或练习；也可以添加截图。',context:'教材、单元或使用场景',contextHint:'例如 G9 English，正式课堂发言',guard:'区分语法错误、语域选择与风格偏好；不把自然的表达差异说成错误。不要凭空补全没有提供的上下文。'},
 writing:{role:'写作与论证老师',material:'草稿、题目或评分标准',placeholder:'粘贴自己的草稿或老师的要求；截图也可以。',context:'文体、读者与作业要求',contextHint:'例如 650字文学评论，论点—证据—分析',guard:'不要编造引文、研究数据或个人经历。修改时保留我的核心观点和表达意图；没有评分标准时不保证具体分数。'},
 math:{role:'严谨的数学老师',material:'完整题干与图表',placeholder:'输入已知条件、要求与自己的解法；也可以添加题图。',context:'知识范围或允许的方法',contextHint:'例如 初中一元二次方程，不使用微积分',guard:'完整读取条件和图表，不凭图形外观补充未给出的关系。说明适用条件，能代回、检验或用反例检查时就做验证；看不清或缺少条件时先询问。'},
 science:{role:'重视证据与条件的科学老师',material:'题目、实验数据或图示',placeholder:'粘贴完整条件、数据和单位；图表可以截图。',context:'单元与已学知识',contextHint:'例如 初中串并联电路，只使用欧姆定律',guard:'核对单位、变量定义、图表坐标和实验条件；区分观测结果与理论解释。数据不足时说明不足，不编造测量结果或实验经历。'},
 history:{role:'历史与人文学科老师',material:'史料、材料题或论述',placeholder:'粘贴史料、问题和自己的判断；也可以添加截图。',context:'时期、地区或课程主题',contextHint:'例如 工业革命，史料比较分析',guard:'区分史实、史料立场与后世解释。无法核实的年代、引语和来源要说明不确定，不编造出处；多因素解释不要简化成单一原因。'},
 code:{role:'编程老师',material:'代码、报错与输入输出',placeholder:'粘贴最小代码、完整报错、输入和期望输出；截图可作补充。',context:'语言与运行环境',contextHint:'例如 C++17，VS Code；或 Python 3',guard:'不要声称运行过未实际运行的代码。说明输入边界和语言/版本假设；缺少关键代码或报错时先询问。优先最小修改，并用可复现样例核对。'},
 general:{role:'学习辅导老师',material:'材料、题目或要求',placeholder:'粘贴这次学习所需的材料，也可以添加图片。',context:'背景与限制',contextHint:'例如 学校课程、作业要求或阅读范围',guard:'只依据实际提供的信息作答，不臆造缺失的材料。区分可以确认的信息与推测，缺少关键条件时先问清楚。'}
};
function task(id,name,kind,example,steps,extra={}){return {id,name,kind,example,steps,...extra};}
const subjects=[
{id:'英语',tasks:[
 task('literary','文学鉴赏','literature','我在读 Never Let Me Go，想理解人物为什么这样说，以及这段话的隐含意义。','先提出一个可讨论的解读，再按照“原文证据→语言或叙述手法→对读者的效果→与主张的关系”展开；必要时给出另一种合理解读和比较依据。'),
 task('seminar','课堂 Seminar','literature','我明天要参加 Seminar，需要用相关引语回应同学的观点，而不是复述剧情。','围绕我的讨论问题，整理一个可以发言的观点、相关证据及分析。提供同意、补充或反驳同学的自然英文表达，以及一个能推进讨论的追问；不要捏造同学的观点。'),
 task('character','人物与叙述','literature','我想分析叙述者是否可靠，以及人物的动机有什么不同解释。','区分人物的言行、叙述者的判断与读者的推断。结合原文分析动机、关系和叙述视角，说明哪些证据支持或限制每一种解释。'),
 task('poetry','诗歌与修辞','literature','我能看出比喻，但不知道如何说明意象与语气对主题的作用。','从具体词语、意象、声音、节奏或结构入手，解释它们如何影响语气、读者体验和主题；不要只列修辞名称或把每个词都象征化。'),
 task('essay','文学评论写作','writing','我已经有论点，想检查这段 PEEL 分析是否真的用证据支持了它。','先检查论点与证据是否对应，再检查分析是否解释了作者的选择及其效果；保留我的观点，给出局部修改和理由，不只把词汇换得更难。'),
 task('reading','阅读理解','language','我想知道为什么这个答案比另一个更符合文章，而不是只看中文翻译。','依据文章定位相关句子，区分直接信息与推断，比较选项的支持程度；解释关键句法与语境，避免仅凭词语相同选择答案。'),
 task('vocabulary','词汇与搭配','language','我想理解这个词在文中的具体意思，以及怎样在自己的句子里自然使用。','根据语境解释词义、词性、常见搭配和语气。给少量自然例句，比较容易混淆的近义词；让我尝试造句后再给反馈。'),
 task('grammar','语法与句子','language','我不明白这个句子的从句关系，想知道为什么这里不能用另一个时态。','先拆清句子结构，再说明相关语法成立的条件。用一组最小对比句解释差异，标出确实的错误与仅属表达偏好的改动。'),
 task('writing','作文与润色','writing','请检查我的英文草稿，指出真正影响意思的错误，同时保留高中生的表达。','按“意思与结构→语法→自然表达”处理草稿。先标出少数最重要的问题，再给局部修改和解释；不擅自增加新经历或观点。'),
 task('speaking','口语与演讲','language','我需要准备两分钟英文发言，希望表达自然、可以自己说出来。','围绕我的实际内容组织适合口头表达的结构，提供可说出口的句子和衔接语，标出重点停顿；没有录音时不要评价真实发音。')
]},
{id:'语文',tasks:[
 task('modern','现代文阅读','literature','我能理解情节，但不知道怎样用文本证据解释作者安排这一段的作用。','结合上下文分析关键语句、结构和人物，按“观点—证据—作用”说明，避免空泛套用“深化主题”等标签。'),
 task('poem','现代诗与古诗','literature','我想分析这首诗的意象、情绪变化与家国情怀，而不是逐句翻译。','联系意象、用词、节奏和结构分析情绪与主题。诗意解释要有文本依据，合理的多义性予以保留，不强行为每个意象套固定象征。'),
 task('classical','文言文','language','我想知道这个实词在这里为什么这样翻译，以及句子省略了什么。','先根据上下文解释词义、句式和省略，再给通顺译文。标明古今异义与可能歧义；不脱离语境机械逐字翻译。'),
 task('composition','作文与修改','writing','我想写人物成长经历，已经有草稿，希望开头具体而不是空泛抒情。','检查内容、结构和细节如何服务中心，再给少量可操作的修改；保留真实经历，不替我编造亲身体验。'),
 task('literature','文学赏析段落','writing','我想把“意象很美”改成有证据和推理的赏析段落。','检查观点是否具体、引用是否准确、分析是否解释手法的效果。示范一个局部修改，并解释如何迁移到另一处原文。')
]},
{id:'数学',tasks:[
 task('algebra','代数与方程','math','我不明白为什么要乘这个系数，想知道每一步变形的依据。','先给结论，再逐步推导，标明等式变形、定义域和可能增根；解释为什么选这种方法，并把结果代回原条件验证。'),
 task('function','函数与图像','math','我想理解图像、解析式和顶点坐标之间的关系，而不只是套公式。','说明变量、定义域及图像信息怎样对应解析式；给出需要的推导，核对交点、极值或边界，不从示意图猜数值。'),
 task('geometry','几何与证明','math','我知道结论但没有证明思路，希望从已知条件找到真正可用的关系。','逐条列出实际已知关系与待证结论，解释每个辅助线或定理的作用；每一步证明注明依据，不能只说“由图可知”。'),
 task('probability','概率与统计','math','我总分不清这些结果是不是等可能，想知道分母为什么这样数。','先定义随机过程、样本空间与事件，核实等可能或独立性条件；通过枚举、补事件或另一种计数验证。'),
 task('concept','概念与原理','math','我想真正理解韦达定理为什么成立，以及什么时候可以用。','从定义或基本关系解释概念为何成立，用具体例子建立直观，再说明适用边界和一个常见反例。'),
 task('competition','竞赛与建模','math','这是一道竞赛题，我想找到不用大量计算的观察和建模方法。','先寻找结构、限制和不变量，解释关键观察如何产生；给严谨解法并验证边界，不只报一个看起来巧妙的结论。'),
 task('correction','错题与解法检查','math','我想找出我的解法从哪一行开始不成立，而不是重新看一份答案。','逐行核对我提供的解法，定位第一个真正错误及其原因；保留正确部分，用最小修改修正，最后代回条件验证。')
]},
{id:'物理',tasks:[
 task('circuit','电学与电路','science','我看不懂这张电路图，尤其不明白电流为什么不能按我想的路线走。','先识别导线连成的节点、元件两端与电源极性，再判断串并联和短路；用电势差与闭合路径解释，不把电流描述成只走一条最短路。'),
 task('mechanics','力学与运动','science','我不知道该对哪个物体分析受力，以及为什么这个方向的力为零。','明确研究对象、参考系和方向，区分受力与运动状态，再依据实际条件列式；检查单位、方向和极限情况。'),
 task('waves','光、声与波','science','我想理解这张光路图各条线分别表示什么，以及为什么这样作图。','明确物理模型、介质、方向与图示，结合传播、反射或折射条件推理；区分实际光路与辅助延长线。'),
 task('experiment','实验与数据','science','我需要根据这组数据分析关系，知道变量该怎么控制，误差从哪里来。','先区分自变量、因变量与控制变量，检查数据和单位，再讨论可支持的结论、误差与改进；不把相关性直接当因果。')
]},
{id:'化学',tasks:[
 task('reaction','反应与方程式','science','我不知道怎样判断反应物与生成物，或者这个方程式为什么这样配平。','先依据条件判断反应，再根据元素与电荷守恒配平，说明必要的反应条件和物态；不能为满足题目随意编造反应。'),
 task('structure','微观结构与概念','science','我想理解原子、离子和分子的区别，并能解释题图。','联系粒子模型与宏观现象，解释结构、性质和图示的关系，区分模型的简化与事实。'),
 task('calculation','化学计算','science','我不明白物质的量和质量为什么这样换算，想知道计算的依据。','先统一物理量、单位与化学方程式，说明比例关系和限制条件；逐步计算并检查守恒、量纲和有效数字。'),
 task('experiment','实验现象与设计','science','我想用实验现象判断结论是否成立，并检查控制变量是否合适。','区分实际观察与解释，说明对照、变量和证据是否支持结论；涉及实验操作时说明必要安全条件，不捏造实验结果。')
]},
{id:'生物',tasks:[
 task('process','概念与生命过程','science','我记住了名词，但不能解释这个过程各环节为什么这样联系。','明确结构与功能，按因果链解释过程，说明发生条件与常见混淆；用一个情境检查能否应用。'),
 task('genetics','遗传与图谱','science','我想知道如何从家系图判断遗传方式，而不是先猜一个答案。','先核实图例和已知条件，比较可能模型，逐步排除；明确推断、概率与必然结论的区别。'),
 task('experiment','实验与图表','science','我想理解这张生物图表能说明什么，以及不能说明什么。','读取坐标、对照和样本条件，解释数据趋势与支持程度；区分实验观察、合理推断和仍未排除的解释。')
]},
{id:'历史',tasks:[
 task('source','史料分析','history','我想比较两份史料的立场、来源和可信程度。','依次检查来源、产生背景、目的与受众，用材料证据说明价值和局限；不能因为有立场就直接否定史料。'),
 task('causes','原因与影响','history','我想解释这个事件为什么发生，区分长期原因和直接诱因。','区分背景条件、触发因素与结果，比较不同因素的作用，建立有证据的因果链并避免以结果倒推必然。'),
 task('essay','论述与论证','history','我的历史论点太笼统，想检查证据是否足以支持。','先界定论题和范围，再检查论点、证据、反面证据与推理关系，给结构性修改，不堆砌无关史实。')
]},
{id:'地理',tasks:[
 task('map','地图与数据判读','science','我想知道怎样读这幅地图或气候图，以及每个信息能支持什么判断。','先核对图例、方向、比例尺、坐标与单位，再有序读取位置和空间关系，区分直接信息与推断。'),
 task('physical','自然地理','science','我能背出结论，但不理解这个地理现象背后的过程和条件。','从过程、能量或物质流动解释成因，联系时间和空间尺度，说明结论适用的环境与限制。'),
 task('human','人文地理与案例','history','我想比较不同地区发展的条件，不想只是背一串区位因素。','结合具体地点与材料，比较自然、社会和经济因素的相互作用，给出有条件的判断，不泛化为所有地区都适用。')
]},
{id:'编程',tasks:[
 task('debug','代码调试','code','我的程序输出不对，请先定位根因，不要直接重写整个项目。','比较实际与期望行为，定位最小可复现错误，解释原因，再给最小修复与测试用例。'),
 task('algorithm','算法与竞赛','code','我需要先理解怎样把题目建模，再学习算法，而不是直接拿到代码。','先提炼输入、输出与约束，比较可行算法及复杂度，说明正确性，再用小样例和边界测试验证；按我要求决定是否展示代码。'),
 task('concept','语法与原理','code','我只学过 Python，不明白 C++ 的这个写法到底做了什么。','从我已有的语言基础解释概念，区分语法形式与实际运行行为；用最小例子说明，并指出类比不成立的地方。'),
 task('review','代码审阅','code','我想检查这段代码的正确性、可读性和边界处理。','优先检查会造成错误的逻辑、输入边界与资源问题，再给必要的可读性建议；标明实际验证与静态推断的区别。')
]},
{id:'其他',tasks:[
 task('understand','理解材料','general','我正在学习……，最不理解的地方是……','围绕我描述的实际任务，解释关键概念与相互关系；不要擅自按数学解题或文学赏析处理。'),
 task('project','项目与研究','general','我在做一个学校研究项目，需要检查研究问题和证据是否对应。','明确目标、对象和限制，检查研究问题与证据是否匹配，给可执行的下一步；不编造调研、访谈或试验结果。'),
 task('feedback','作品与反馈','general','我有一个作品和评分标准，希望找出最影响质量的几个问题。','按我提供的标准评价具体内容，优先给最重要的修改及理由；没有标准或完整作品时说明评价范围。')
]}
];
const SMAP=Object.fromEntries(subjects.map(s=>[s.id,s]));
const getTask=(s,t)=>SMAP[s]?.tasks.find(x=>x.id===t)||null;
function safeDraft(input={}){let subject=SMAP[input.subject]?input.subject:'';return {subject,task:getTask(subject,input.task)?input.task:'',description:String(input.description||'').slice(0,10000),question:String(input.question||'').slice(0,30000),attempt:String(input.attempt||'').slice(0,20000),context:String(input.context||'').slice(0,2000),mode:['full','hint','check','transfer'].includes(input.mode)?input.mode:'full',language:['中文','English','中文讲解＋英文表达'].includes(input.language)?input.language:'中文',stage:String(input.stage||'').slice(0,40)};}
function suggestion(d){const text=(d.description+' '+d.context).toLowerCase();if(/seminar|研讨/.test(text)&&(d.subject!=='英语'||d.task!=='seminar'))return {subject:'英语',task:'seminar',label:'英语 · 课堂 Seminar'};if(/never let me go|hailsham|kathy|kazuo/.test(text)&&!(d.subject==='英语'&&['literary','character','poetry','essay'].includes(d.task)))return {subject:'英语',task:'literary',label:'英语 · 文学鉴赏'};if(/电路|串并联/.test(text)&&d.subject!=='物理')return {subject:'物理',task:'circuit',label:'物理 · 电学与电路'};if(/c\+\+|python|编译|报错/.test(text)&&d.subject!=='编程')return {subject:'编程',task:'debug',label:'编程 · 代码调试'};return null;}
function generate(d,ctx={}){d=safeDraft(d);const t=getTask(d.subject,d.task);if(!t)throw Error('请先选择科目和具体学习任务。');if(!d.description.trim())throw Error('请用一句话描述：你正在做什么，需要什么帮助。');const f=families[t.kind];const n=ctx.imageCount||0;const parts=[`请作为${d.subject}方向的${f.role}帮助我。\n本次任务：${t.name}。${d.stage?`学习阶段：${d.stage}。`:ctx.stage&&ctx.stage!=='尚未确定'?`学习阶段：${ctx.stage}。`:''}回答语言：${d.language}。`,`【我正在做的事与需要的帮助】\n${d.description.trim()}`];
if(d.context.trim())parts.push(`【${f.context}】\n${d.context.trim()}`);
if(d.question.trim())parts.push(`【${f.material}】\n${d.question.trim()}`);
if(n)parts.push(`【图片材料】\n本次共${n}张原始图片，可能以一张含提问文字的材料卡呈现，也可能单独附上。请先读取实际收到的图片；没有收到、模糊或被裁切时直接指出缺失，不依据文件名猜测内容。${t.kind==='literature'?'请同时检查段落、标注与已有答案。':''}`);
if(d.attempt.trim())parts.push(`【我已有的理解、草稿或卡住的地方】\n${d.attempt.trim()}`);
let method=t.steps;
if(d.mode==='hint')method=`采用对话式引导：先定位我具体卡住的概念，最多提出一个有针对性的问题或提示，等待我的回答再继续，不一次输出完整答案。后续分析方向：${t.steps}`;
if(d.mode==='check')method=`先检查我给出的理解、草稿或过程，区分准确、缺乏依据与需要修正的部分，指出最重要的一个问题及理由。${d.attempt.trim()?'不要把正确的部分全部重写。':'我还没有提供自己的尝试，请先向我索取，不假装已经检查。'}参考标准：${t.steps}`;
if(d.mode==='transfer')method=t.steps+(t.kind==='literature'||t.kind==='writing'?'最后围绕同一段已提供的材料给一个新的分析角度，让我独立提出观点与证据；暂不写示范答案。':t.kind==='code'?'最后给一个边界测试或小改动，让我预测结果；暂不揭晓答案。':'最后给一个同原理但表面不同的简短练习，暂不揭晓答案。');
parts.push(`【请怎样帮助我】\n${method}`);
if(d.language==='中文讲解＋英文表达')parts.push('主要用中文解释；关键术语和可用于课堂的表达用自然英文提供，不逐句机械双语翻译。');
parts.push(`【证据与准确性】\n${f.guard}`);
return parts.join('\n\n');}
const api={subjects,SMAP,families,getTask,safeDraft,suggestion,generate};root.StudyPrompts=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

