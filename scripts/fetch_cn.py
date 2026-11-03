#!/usr/bin/env python3
"""抓取中文 AI 资讯源（无 CORS 的源由服务端/Actions 抓取），输出 data/cn.json"""
import json,re,time,urllib.request,email.utils,xml.etree.ElementTree as ET,os
UA={'User-Agent':'Mozilla/5.0 ai-radar'}
AI=re.compile(r'AI|人工智能|大模型|模型|智能体|Agent|GPT|OpenAI|DeepSeek|Claude|Gemini|LLM|文心|通义|豆包|混元|智谱|Kimi|月之暗面|机器人|算力|英伟达|NVIDIA|芯片|Sora|AIGC|生成式|千问|Qwen|Llama|xAI|Grok|具身',re.I)
def get(u):return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=20).read()
def rss(src,u):
    x=get(u).decode('utf-8','ignore');out=[]
    def g(tag,b):
        m=re.search('<'+tag+'[^>]*>(.*?)</'+tag+'>',b,re.S)
        return re.sub(r'<!\[CDATA\[|\]\]>','',m.group(1)).strip() if m else ''
    for b in re.findall(r'<item>(.*?)</item>',x,re.S):
        t,l,d=g('title',b),g('link',b),g('pubDate',b)
        try: ts=email.utils.parsedate_to_datetime(d).timestamp()*1000
        except Exception: ts=time.time()*1000
        out.append(dict(id=src+l[-40:],title=t,url=l,src=src,t=ts,heat=0))
    return out
def v2ex():
    return [dict(id='v2'+str(x['id']),title=x['title'],url=x['url'],src='V2EX',t=x['created']*1000,heat=x['replies']*3) for p in ('hot','latest') for x in json.loads(get(f'https://www.v2ex.com/api/topics/{p}.json'))]
items,status=[],{}
seen=set()
for name,f in [('IT之家',lambda:rss('IT之家','https://www.ithome.com/rss/')),('cnBeta',lambda:rss('cnBeta','https://www.cnbeta.com.tw/backend.php')),('爱范儿',lambda:rss('爱范儿','https://www.ifanr.com/feed')),('极客公园',lambda:rss('极客公园','https://www.geekpark.net/rss')),('开源中国',lambda:rss('开源中国','https://www.oschina.net/news/rss')),('少数派',lambda:rss('少数派','https://sspai.com/feed')),('V2EX',v2ex)]:
    try:
        r=[x for x in f() if AI.search(x['title']) and x['id'] not in seen and not seen.add(x['id'])];items+=r;status[name]=len(r)
    except Exception as e:status[name]='ERR '+str(e)[:60]
os.makedirs('data',exist_ok=True)
json.dump(dict(updated=int(time.time()*1000),status=status,items=items),open('data/cn.json','w'),ensure_ascii=False)
print(status)
