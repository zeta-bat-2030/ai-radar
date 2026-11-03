const REFRESH=300,Q=['AI','LLM','OpenAI','GPT','Anthropic','Claude','Gemini','DeepSeek','machine learning','Nvidia'];
const CN_SRC=new Set(['IT之家','cnBeta','极客公园','开源中国','爱范儿','少数派','V2EX']);
const COS={OpenAI:/openai|chatgpt|gpt-?\d|sora/i,Google:/google|gemini|deepmind|谷歌/i,Anthropic:/anthropic|claude/i,Meta:/\bmeta\b|llama/i,xAI:/\bxai\b|grok|马斯克/i,NVIDIA:/nvidia|cuda|英伟达|黄仁勋/i,DeepSeek:/deepseek|深度求索/i,Microsoft:/microsoft|copilot|微软/i,Apple:/\bapple\b|苹果/i,'百度/文心':/百度|文心|baidu|ernie/i,'阿里/通义':/阿里|通义|千问|qwen|alibaba/i,'字节/豆包':/字节|豆包|bytedance|doubao|火山引擎/i,'腾讯/混元':/腾讯|混元|tencent|hunyuan/i,'智谱':/智谱|glm|zhipu/i,'月之暗面/Kimi':/月之暗面|kimi|moonshot/i,'华为':/华为|昇腾|盘古|huawei/i,'小米':/小米|xiaomi/i,Mistral:/mistral/i};
const CATS={'大模型':/llm|gpt|claude|gemini|llama|qwen|大模型|模型|model|token/i,'智能体':/agent|智能体|agentic|mcp|自动化/i,'开源项目':/open.?source|github|开源|weights|repo|hugging/i,'芯片算力':/gpu|chip|nvidia|compute|芯片|算力|英伟达|昇腾|tpu|数据中心|datacenter/i,'融资商业':/funding|raise|valuation|ipo|revenue|billion|acqui|融资|估值|营收|收购|亿元|上市|财报/i,'安全监管':/safety|regulat|law|ban|copyright|lawsuit|security|安全|监管|法规|诉讼|隐私|版权/i,'论文研究':/paper|research|arxiv|benchmark|study|论文|研究|基准|学者/i,'产品发布':/launch|release|announc|introduc|show hn|发布|上线|推出|新品|更新/i,'机器人':/robot|humanoid|机器人|具身|自动驾驶|self.?driving/i,'国内AI':/百度|文心|阿里|通义|千问|字节|豆包|腾讯|混元|智谱|月之暗面|kimi|deepseek|华为|小米|国产|中国|china/i};
const STOP=new Set('the a an and or of to in for on with is are be by from at as it this that how why what your you we i my new not can ai using use vs our its has have will just about into more than show hn ask'.split(' '));
const CNSTOP=new Set('的 了 和 是 在 与 及 将 为 也 等 被 让 从 对 已 一 个 用 有 不 都 就 我 你 吗 啥 什么 如何 一个 这个 可以 正式 宣布 首款 全新 支持 今日 消息 官方'.split(' '));
let items=[],cat='全部',seen=new Set(JSON.parse(localStorage.alertSeen||'[]')),alerts=[],prevHeat=JSON.parse(localStorage.prevHeat||'{}'),known=new Set();
let kws=JSON.parse(localStorage.kws||'["OpenAI","DeepSeek","GPT-5","Anthropic","大模型","豆包"]'),cd=REFRESH;const $=id=>document.getElementById(id);const srcOK={};
/* ---------- 数据 ---------- */
async function hn(){const since=Math.floor(Date.now()/1000)-86400;const rs=await Promise.all(Q.map(q=>fetch(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&numericFilters=created_at_i>${since}&hitsPerPage=40`).then(r=>r.json())));
 return rs.flatMap(r=>r.hits).map(h=>({id:'hn'+h.objectID,title:h.title,url:h.url||`https://news.ycombinator.com/item?id=${h.objectID}`,src:'HN',t:h.created_at_i*1000,heat:(h.points||0)+2*(h.num_comments||0)}));}
async function gh(){const d=new Date(Date.now()-7*864e5).toISOString().slice(0,10);const r=await fetch(`https://api.github.com/search/repositories?q=(llm OR ai OR agent) created:>${d}&sort=stars&order=desc&per_page=40`);if(!r.ok)throw r.status;
 return ((await r.json()).items||[]).map(x=>({id:'gh'+x.id,title:`${x.full_name} — ${x.description||''}`.slice(0,160),url:x.html_url,src:'GitHub',t:new Date(x.created_at).getTime(),heat:x.stargazers_count}));}
async function dev(){const r=await fetch(`https://dev.to/api/articles?tag=ai&top=2&per_page=60`);if(!r.ok)throw r.status;return (await r.json()).map(a=>({id:'dev'+a.id,title:a.title,url:a.url,src:'DEV',t:new Date(a.published_at).getTime(),heat:a.public_reactions_count+2*a.comments_count}));}
let cnMeta={};async function cn(){const r=await fetch('data/cn.json?_='+Date.now());if(!r.ok)throw r.status;cnMeta=await r.json();return cnMeta.items;}
async function load(){log('同步中… 连接 4 条数据链路');const names=['HN','GitHub','DEV','国内源'];const res=await Promise.allSettled([hn(),gh(),dev(),cn()]);const m=new Map(items.map(x=>[x.id,x]));let nw=[];
 names.forEach((s,i)=>{const ok=res[i].status==='fulfilled';srcOK[s]=ok;log(ok?`[OK] ${s} ← ${res[i].value.length} 条`:`[ERR] ${s} 链路失败: ${res[i].reason}`,ok?'':'e');
  if(ok)res[i].value.forEach(x=>{if(!x.title)return;x.cats=Object.keys(CATS).filter(c=>CATS[c].test(x.title));if(CN_SRC.has(x.src)&&!x.cats.includes('国内AI'))x.cats.push('国内AI');if(!known.has(x.id)){known.add(x.id);nw.push(x);}m.set(x.id,x);});});
 items=[...m.values()];if(cnMeta.status){Object.entries(cnMeta.status).forEach(([k,v])=>log(`  └ ${k}: ${v}`,String(v).startsWith('ERR')?'e':''));$('cnUpd').textContent=new Date(cnMeta.updated).toLocaleString('zh-CN');}
 nw.sort((a,b)=>a.t-b.t).slice(-25).forEach(x=>log(`+ [${x.src}] ${x.title.slice(0,70)}`));
 $('srcStatus').innerHTML=Object.entries(srcOK).map(([k,v])=>`<span class="tag ${k==='国内源'?'cn':''}">${v?'●':'○'} ${k}</span>`).join(' ');
 const sel=$('srcFilter');[...new Set(items.map(x=>x.src))].forEach(s=>{if(![...sel.options].some(o=>o.value===s))sel.add(new Option(s,s));});
 detect();render();charts();ticker();$('updated').textContent=new Date().toLocaleTimeString('zh-CN');cd=REFRESH;log(`同步完成 · 情报 ${items.length} · 预警 ${alerts.length}`,'w');}
/* ---------- 渲染 ---------- */
function ago(t){const s=(Date.now()-t)/1000;return s<3600?Math.max(1,s/60|0)+'分钟前':s<86400?(s/3600|0)+'小时前':(s/86400|0)+'天前';}
const hitKw=x=>kws.filter(k=>x.title.toLowerCase().includes(k.toLowerCase()));const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function count(el,v){const s=+el.textContent||0,t0=performance.now();const f=n=>{const p=Math.min(1,(n-t0)/900);el.textContent=Math.round(s+(v-s)*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f);}
function tabs(){const all=['全部',...Object.keys(CATS)];$('tabs').innerHTML=all.map(c=>`<button class="${c===cat?'on':''}" data-c="${c}">${c}<em>${c==='全部'?items.length:items.filter(x=>x.cats.includes(c)).length}</em></button>`).join('');}
function render(){const q=$('search').value.toLowerCase(),s=$('srcFilter').value;let l=items.filter(x=>(cat==='全部'||x.cats.includes(cat))&&(!s||x.src===s)&&(!q||x.title.toLowerCase().includes(q)));
 l.sort($('sort').value==='heat'?(a,b)=>b.heat-a.heat:(a,b)=>b.t-a.t);tabs();
 $('list').innerHTML=l.slice(0,200).map((x,i)=>`<li class="${hitKw(x).length?'hit':''}" style="animation-delay:${Math.min(i,20)*25}ms"><a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a><div class="meta"><span class="tag ${CN_SRC.has(x.src)?'cn':''}">${x.src}</span><span>${ago(x.t)}</span>${x.heat?`<span class="heat">🔥${x.heat}</span>`:''}${x.cats.slice(0,3).map(c=>`<span class="ctag">#${c}</span>`).join('')}</div></li>`).join('')||'<li>// 无匹配情报</li>';
 count($('sTotal'),items.length);count($('sCn'),items.filter(x=>CN_SRC.has(x.src)).length);count($('sHour'),items.filter(x=>Date.now()-x.t<36e5).length);count($('sAlert'),alerts.length);
 $('kwTags').innerHTML=kws.map(k=>`<span title="点击删除" data-k="${esc(k)}">${esc(k)} ✕</span>`).join('');
 $('alertList').innerHTML=alerts.map(a=>`<li class="L-${a.level}"><b>${{red:'🔴 红色',orange:'🟠 橙色',yellow:'🟡 黄色'}[a.level]}</b> ${esc(a.why)}<br><a href="${esc(a.x.url)}" target="_blank">${esc(a.x.title)}</a></li>`).join('')||'<li>// 暂无预警</li>';}
function ticker(){const t=[...items].sort((a,b)=>b.t-a.t).slice(0,30).map(x=>`<span>[${x.src}] ${esc(x.title)}</span>`).join('');$('ticker').innerHTML=t+t;}
function log(s,c=''){const L=$('log'),d=document.createElement('div');d.className=c;d.textContent=`${new Date().toLocaleTimeString('zh-CN',{hour12:false})} ${s}`;L.appendChild(d);while(L.children.length>60)L.firstChild.remove();L.scrollTop=1e9;}
/* ---------- 预警 ---------- */
function detect(){alerts=[];const news=[];const fresh=x=>Date.now()-x.t<6*36e5;
 items.forEach(x=>{const h=hitKw(x),old=prevHeat[x.id],spike=old!=null&&x.heat-old>=50,high=x.src!=='GitHub'&&fresh(x)&&x.heat>=300;let level=null,why='';
  if(spike||high){level='red';why=spike?`热度激增 +${x.heat-old}`:`6小时内热度 ${x.heat}`;}else if(h.length&&x.heat>=100){level='orange';why=`命中「${h.join('、')}」+高热 ${x.heat}`;}else if(h.length&&fresh(x)){level='yellow';why=`命中「${h.join('、')}」`;}
  if(level){const a={level,why,x};alerts.push(a);const k=x.id+level;if(!seen.has(k)){seen.add(k);news.push(a);}}});
 const o={red:0,orange:1,yellow:2};alerts.sort((a,b)=>o[a.level]-o[b.level]||b.x.heat-a.x.heat);alerts=alerts.slice(0,60);
 items.forEach(x=>prevHeat[x.id]=x.heat);localStorage.prevHeat=JSON.stringify(prevHeat);localStorage.alertSeen=JSON.stringify([...seen].slice(-3000));
 if(news.length&&window._init){news.slice(0,5).forEach(a=>log(`!! 预警[${a.level}] ${a.x.title.slice(0,50)}`,'e'));if($('soundT').checked)beep(news.some(a=>a.level==='red'));if($('notifyT').checked&&'Notification'in window&&Notification.permission==='granted')news.slice(0,3).forEach(a=>new Notification('AI 预警 · '+a.why,{body:a.x.title}));}window._init=1;}
function beep(red){const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.type='square';o.frequency.value=red?880:520;o.connect(g);g.connect(c.destination);g.gain.setValueAtTime(.12,c.currentTime);g.gain.exponentialRampToValueAtTime(.001,c.currentTime+.5);o.start();o.stop(c.currentTime+.5);}
/* ---------- 图表 ---------- */
const C={};const ch=id=>C[id]||(C[id]=echarts.init($(id)));const ax={axisLine:{lineStyle:{color:'#0a7a52'}},axisLabel:{color:'#3fbf8a',fontFamily:'monospace'},splitLine:{lineStyle:{color:'#06301f'}}};
const PAL=['#00ff9c','#00e5ff','#ffd93d','#ff3d5a','#c48bff','#ff9a3d','#5dffea','#9dff00','#ff6ad5','#7aa2ff'];
function words(){const wc={};const seg=window.Intl&&Intl.Segmenter?new Intl.Segmenter('zh',{granularity:'word'}):null;
 items.forEach(x=>{const w=Math.log10(2+x.heat)/2+1;const T=x.title;(T.toLowerCase().match(/[a-z][a-z0-9.+-]{2,}/g)||[]).forEach(k=>{if(!STOP.has(k))wc[k]=(wc[k]||0)+w;});
  if(seg)for(const s of seg.segment(T.replace(/[a-zA-Z0-9]+/g,' '))){const k=s.segment.trim();if(s.isWordLike&&k.length>=2&&/[\u4e00-\u9fa5]/.test(k)&&!CNSTOP.has(k))wc[k]=(wc[k]||0)+w;}});
 return Object.entries(wc).sort((a,b)=>b[1]-a[1]).slice(0,100).map(([name,v])=>({name,value:+v.toFixed(1)}));}
function charts(){const now=Date.now(),hrs=[...Array(24)].map((_,i)=>now-(23-i)*36e5);const tk=['大模型','智能体','开源项目','芯片算力','产品发布','国内AI'];
 ch('cTrend').setOption({color:PAL,tooltip:{trigger:'axis'},legend:{textStyle:{color:'#8fffc8'},top:0},grid:{left:35,right:10,top:30,bottom:25},xAxis:{type:'category',data:hrs.map(h=>new Date(h).getHours()+'时'),...ax},yAxis:{type:'value',...ax},
  series:tk.map(n=>({name:n,type:'line',smooth:true,showSymbol:false,lineStyle:{width:2,shadowBlur:8,shadowColor:'#00ff9c'},areaStyle:{opacity:.06},data:hrs.map(h=>items.filter(x=>x.cats.includes(n)&&x.t>h-36e5&&x.t<=h).length)}))});
 const sc={};items.forEach(x=>sc[x.src]=(sc[x.src]||0)+1);
 ch('cSrc').setOption({color:PAL,tooltip:{},series:[{type:'pie',roseType:'radius',radius:['20%','72%'],itemStyle:{borderColor:'#020604',borderWidth:2},label:{color:'#bfffe0',fontFamily:'monospace'},data:Object.entries(sc).map(([name,value])=>({name,value}))}]});
 ch('cCloud').setOption({tooltip:{},series:[{type:'wordCloud',sizeRange:[11,40],gridSize:5,rotationRange:[0,0],textStyle:{fontFamily:'monospace',color:()=>PAL[Math.random()*5|0]},emphasis:{textStyle:{shadowBlur:10,shadowColor:'#0f9'}},data:words()}]});
 const cc=Object.entries(COS).map(([n,re])=>[n,items.filter(x=>re.test(x.title)).length]).filter(c=>c[1]).sort((a,b)=>a[1]-b[1]).slice(-14);
 const bar=(id,d)=>ch(id).setOption({tooltip:{},grid:{left:100,right:30,top:5,bottom:20},xAxis:{type:'value',...ax},yAxis:{type:'category',data:d.map(c=>c[0]),...ax},series:[{type:'bar',data:d.map(c=>c[1]),label:{show:true,position:'right',color:'#0f9'},itemStyle:{color:new echarts.graphic.LinearGradient(0,0,1,0,[{offset:0,color:'#004d33'},{offset:1,color:'#00ff9c'}]),shadowBlur:8,shadowColor:'#00ff9c'}}]});
 bar('cCo',cc);bar('cCat',Object.keys(CATS).map(c=>[c,items.filter(x=>x.cats.includes(c)).length]).sort((a,b)=>a[1]-b[1]));}
/* ---------- 特效 ---------- */
(function rain(){const c=$('rain'),x=c.getContext('2d');let cols,drops;const R=()=>{c.width=innerWidth;c.height=innerHeight;cols=c.width/16|0;drops=Array(cols).fill(0).map(()=>Math.random()*-50)};R();addEventListener('resize',R);
 const ch='アイウエオカキクケコサシスセソ01AIGPTLLM智能模型数据算力神经网络'.split('');setInterval(()=>{x.fillStyle='rgba(2,6,4,.08)';x.fillRect(0,0,c.width,c.height);x.font='14px monospace';
 drops.forEach((d,i)=>{x.fillStyle=Math.random()>.97?'#fff':'#00ff9c';x.fillText(ch[Math.random()*ch.length|0],i*16,d*16);drops[i]=d*16>c.height&&Math.random()>.975?0:d+1;});},50);})();
(function radar(){const c=$('radar'),x=c.getContext('2d');let a=0;function f(){const w=c.width=c.clientWidth,h=c.height=c.clientHeight,cx=w/2,cy=h/2,r=Math.min(w,h)/2-12;
 x.strokeStyle='rgba(0,255,156,.3)';for(let i=1;i<=4;i++){x.beginPath();x.arc(cx,cy,r*i/4,0,7);x.stroke();}x.beginPath();x.moveTo(cx-r,cy);x.lineTo(cx+r,cy);x.moveTo(cx,cy-r);x.lineTo(cx,cy+r);x.stroke();
 const g=x.createConicGradient?x.createConicGradient(a-0.8,cx,cy):null;if(g){g.addColorStop(0,'rgba(0,255,156,0)');g.addColorStop(.127,'rgba(0,255,156,.45)');g.addColorStop(.128,'rgba(0,255,156,0)');x.fillStyle=g;x.beginPath();x.arc(cx,cy,r,0,7);x.fill();}
 const now=Date.now(),src=[...new Set(items.map(i=>i.src))];
 items.slice(0,400).forEach(it=>{const age=(now-it.t)/864e5;if(age>2)return;const ang=(src.indexOf(it.src)/src.length)*Math.PI*2+((parseInt(String(it.id).replace(/\D/g,'').slice(-4))||0)%100)/100*(Math.PI*2/src.length);
  const rr=r*Math.min(1,age/2),px=cx+Math.cos(ang)*rr,py=cy+Math.sin(ang)*rr;let d=((a-ang)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);const glow=Math.max(.15,1-d/2.5);const s=2+Math.min(6,Math.log10(1+it.heat)*1.6);
  x.fillStyle=CN_SRC.has(it.src)?`rgba(255,217,61,${glow})`:`rgba(0,229,255,${glow})`;x.beginPath();x.arc(px,py,s,0,7);x.fill();});
 x.fillStyle='#0a7a52';x.font='10px monospace';x.fillText('中心=最新 · 外圈=48h前 · 黄=国内 · 青=海外',8,h-6);a+=.025;requestAnimationFrame(f);}f();})();
function boot(){const L=['AI//RADAR v2.0 — 全球AI情报终端','[BIOS] 初始化神经网络接口……OK','[NET ] 建立链路 hn.algolia.com ……OK','[NET ] 建立链路 api.github.com ……OK','[NET ] 建立链路 dev.to ……OK','[NET ] 挂载国内情报 data/cn.json ……OK','[SYS ] 加载预警引擎 (红/橙/黄) ……OK','[SYS ] 雷达扫描阵列上线','>>> ACCESS GRANTED_'];
 let i=0,t=$('bootTxt');const iv=setInterval(()=>{t.textContent+=L[i++]+'\n';if(i>=L.length){clearInterval(iv);setTimeout(()=>{$('boot').style.opacity=0;setTimeout(()=>$('boot').remove(),600)},350);}},140);}
/* ---------- 事件 ---------- */
$('search').oninput=$('srcFilter').onchange=$('sort').onchange=render;$('refresh').onclick=load;
$('tabs').onclick=e=>{const b=e.target.closest('button');if(b){cat=b.dataset.c;render();log(`切换分类 → ${cat}`);}};
$('kwInput').onkeydown=e=>{if(e.key==='Enter'&&e.target.value.trim()){kws.push(e.target.value.trim());log(`+ 预警关键词: ${e.target.value.trim()}`,'w');e.target.value='';localStorage.kws=JSON.stringify(kws);detect();render();}};
$('kwTags').onclick=e=>{const k=e.target.dataset.k;if(k){kws=kws.filter(x=>x!==k);localStorage.kws=JSON.stringify(kws);detect();render();}};
$('notifyT').checked=localStorage.notify==='1';$('soundT').checked=localStorage.sound==='1';
$('notifyT').onchange=e=>{localStorage.notify=e.target.checked?1:0;if(e.target.checked&&'Notification'in window)Notification.requestPermission();};$('soundT').onchange=e=>localStorage.sound=e.target.checked?1:0;
setInterval(()=>{cd--;$('countdown').textContent=cd;$('clock').textContent=new Date().toLocaleString('zh-CN',{hour12:false});if(cd<=0)load();},1000);
addEventListener('resize',()=>Object.values(C).forEach(c=>c.resize()));boot();load();
