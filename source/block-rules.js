
/* Pure URL matching, weekly schedules and DNR construction. No browsing data is stored. */
(function(root){'use strict';
const FIRST=63000,LAST=63199;
const ALIASES={youtube:'youtube.com','油管':'youtube.com',bilibili:'bilibili.com','b站':'bilibili.com','抖音':'douyin.com','微博':'weibo.com'};
function host(value){try{let s=String(value||'').trim().toLowerCase();s=ALIASES[s]||s;const u=new URL(s.includes('://')?s:'https://'+s);if(!['http:','https:'].includes(u.protocol))return null;const h=u.hostname.replace(/^www\./,'');if(h.length>253||!h.includes('.')||h.split('.').some(p=>p.length>63||!/^([a-z0-9]|[a-z0-9][a-z0-9-]*[a-z0-9])$/.test(p)))return null;return h;}catch{return null;}}
const matches=(h,d)=>h===d||h.endsWith('.'+d);
function canonical(v){const h=host(v);return h&&['youtube.com','m.youtube.com','music.youtube.com','youtu.be','youtube-nocookie.com'].includes(h)?'youtube.com':h;}
function expand(domains){return [...new Set(domains.flatMap(d=>d==='youtube.com'?['youtube.com','youtu.be','youtube-nocookie.com']:[d]))];}
function sanitize(domains,allow){if(!Array.isArray(domains)||!Array.isArray(allow))throw Error('网站名单格式不正确');if(domains.length>40||allow.length>40)throw Error('每份名单最多40个网站');const ds=[...new Set(domains.map(canonical))],as=[...new Set(allow.map(host))];if(ds.includes(null)||as.includes(null))throw Error('名单中有无效网址，请删除或重新输入');if(!ds.length)throw Error('请先添加至少一个屏蔽网站');for(const b of expand(ds))for(const a of as)if(matches(b,a))throw Error(`白名单 ${a} 覆盖了屏蔽网站 ${b}，请先移除冲突`);return {domains:ds,allow:as};}
function preview(url,domains,allow=[]){
  const lists=sanitize(domains,allow),raw=String(url||'').trim();let u;
  try{u=new URL(raw.includes('://')?raw:'https://'+raw);}catch{return {url:raw,host:'',blocked:false,allowed:false,matchedDomain:'',reason:'请输入完整网址或域名',error:'无效网址'};}
  if(!['http:','https:'].includes(u.protocol)||!host(u.href))return {url:raw,host:u.hostname,blocked:false,allowed:false,matchedDomain:'',reason:'仅匹配普通 http / https 网站',error:'不支持的网址'};
  const h=u.hostname.toLowerCase(),allowed=lists.allow.find(d=>matches(h,d)),matched=expand(lists.domains).find(d=>matches(h,d));
  return {url:u.href,host:h,blocked:Boolean(matched&&!allowed),allowed:Boolean(allowed),matchedDomain:allowed||matched||'',reason:allowed?'命中白名单':matched?'命中屏蔽名单':'未命中屏蔽名单'};
}
function shouldBlock(url,session,now=Date.now()){if(!session||session.until<=now)return false;if(Array.isArray(session.sources))return session.sources.some(s=>shouldBlock(url,s,now));let u;try{u=new URL(url);}catch{return false;}if(!['http:','https:'].includes(u.protocol))return false;const h=u.hostname.toLowerCase();if((session.allow||[]).some(d=>matches(h,d)))return false;return expand(session.domains||[]).some(d=>matches(h,d));}
function rules(session){
  const sources=session.sources||[session],out=[];
  sources.forEach((source,index)=>{
    const blocked=expand(source.domains),allowed=source.allow||[],base=FIRST+index*4;
    // Exclusions are scoped to a source: a whitelist in a manual session cannot
    // accidentally override an independently enabled weekly schedule.
    const exclusions=allowed.length?{excludedRequestDomains:allowed,excludedInitiatorDomains:allowed}:{};
    out.push({id:base+1,priority:10,action:{type:'block'},condition:{requestDomains:blocked,resourceTypes:['main_frame','sub_frame'],...exclusions}});
    out.push({id:base+2,priority:10,action:{type:'block'},condition:{initiatorDomains:blocked,resourceTypes:['media','xmlhttprequest','websocket'],...exclusions}});
    if(source.domains.includes('youtube.com'))out.push({id:base+3,priority:10,action:{type:'block'},condition:{requestDomains:['googlevideo.com','youtubei.googleapis.com'],resourceTypes:['media','xmlhttprequest','sub_frame'],...exclusions}});
  });return out;
}
function minutes(value){if(!/^\d{2}:\d{2}$/.test(value||''))return null;const [h,m]=value.split(':').map(Number);return h<24&&m<60?h*60+m:null;}
function sanitizeSchedules(value){
  if(!Array.isArray(value)||value.length>20)throw Error('每周定时最多20个时段');const ids=new Set();
  return value.map((s,i)=>{if(!s||typeof s!=='object')throw Error('定时时段格式不正确');const id=String(s.id||`schedule-${i+1}`);if(!/^[a-zA-Z0-9_-]{1,64}$/.test(id)||ids.has(id))throw Error('定时时段编号重复或无效');ids.add(id);
    if(!Array.isArray(s.days)||!s.days.length||s.days.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('请为每个时段选择至少一个星期');
    if(minutes(s.start)===null||minutes(s.end)===null||s.start===s.end)throw Error('请输入有效且不同的开始与结束时间');
    return {id,name:String(s.name||'定时屏蔽').trim().slice(0,60)||'定时屏蔽',enabled:s.enabled===true,days:[...new Set(s.days)].sort(),start:s.start,end:s.end};});
}
function scheduleOccurrences(schedules,now=Date.now()){
  const occurrences=[];for(const s of schedules){if(!s.enabled)continue;const begin=minutes(s.start),end=minutes(s.end);if(begin===null||end===null)continue;
    // Calendar dates (not 24-hour increments) also work across daylight-saving changes.
    for(let offset=-1;offset<=7;offset++){const start=new Date(now);start.setDate(start.getDate()+offset);start.setHours(0,0,0,0);if(!s.days.includes(start.getDay()))continue;start.setHours(Math.floor(begin/60),begin%60,0,0);const finish=new Date(start);if(end<begin)finish.setDate(finish.getDate()+1);finish.setHours(Math.floor(end/60),end%60,0,0);if(finish.getTime()<=now)continue;
      occurrences.push({id:`schedule:${s.id}:${start.getTime()}`,scheduleId:s.id,mode:'schedule',name:s.name,startedAt:start.getTime(),until:finish.getTime()});
    }}return occurrences.sort((a,b)=>a.startedAt-b.startedAt||a.id.localeCompare(b.id));
}
function scheduleState(schedules,now=Date.now(),skipped=[]){const occurrences=scheduleOccurrences(schedules,now),skip=new Set(skipped),active=occurrences.filter(o=>o.startedAt<=now&&!skip.has(o.id)),boundaries=occurrences.flatMap(o=>[o.startedAt,o.until]).filter(t=>t>now);return {active,nextChange:boundaries.length?Math.min(...boundaries):null,occurrences};}
function owned(id){return id>=FIRST&&id<=LAST||id>=51000&&id<=51200||id>=41100&&id<=41199;}
function stable(value){if(Array.isArray(value))return value.map(stable).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,stable(value[k])]));return value;}
function sameRules(a,b){return JSON.stringify(stable(a))===JSON.stringify(stable(b));}
const api={FIRST,LAST,host,canonical,matches,expand,sanitize,preview,shouldBlock,rules,minutes,sanitizeSchedules,scheduleOccurrences,scheduleState,owned,sameRules};root.StudyBlockRules=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

