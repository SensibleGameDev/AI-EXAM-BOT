from pathlib import Path
import json
questions=[{'question':'Which structure provides FIFO ordering?','options':['Stack','Queue','Tree','Set'],'correctIndex':1,'explanation':'A queue removes the oldest entry first.'},{'question':'Which values are even?','options':['2','3','4','5'],'answerType':'multi','correctIndices':[0,2],'explanation':'Even numbers are divisible by two.'},{'question':'What is the complexity of binary search?','options':['O(n)','O(log n)','O(n²)','O(1)'],'correctIndex':1,'explanation':'Each step halves the search range.'},{'question':'Which operation adds an item to a stack?','options':['push','pop','peek','poll'],'correctIndex':0,'explanation':'Push adds an element to the top.'}]
seed={'language':'ru','savedQuestions':[],'sessions':[{'id':'fixture','title':'Practice fixture','created':0,'activeStudyMsgIdx':0,'messages':[{'role':'bot','type':'quiz','content':'','data':{'type':'single','questions':questions}},{'role':'bot','type':'coding','content':'','data':{'problems':[{'title':'Longest path','description':'Find the longest path in a directed acyclic graph.\n\n'+('Consider disconnected nodes and explain complexity.\n\n'*16),'difficulty':'Hard','examples':[{'input':'edges = [[1,2],[2,3]]','output':'3'}],'hint':'Try topological order.'}]}},{'role':'bot','type':'flashcards','content':'','data':{'cards':[{'term':'Queue','definition':'A FIFO structure.'}]}}]}],'currentSessionId':'fixture'}
h=Path('index.html').read_text(encoding='utf-8').replace('<head>','<head><base href="/">')
setup='''<script>
localStorage.setItem('examCoachState',SEED);
localStorage.removeItem('examCoachLayout');
const nativeFetch=window.fetch;
window.fetch=async(url,options)=>{
 if(url!=='/api/deepseek-proxy')return nativeFetch(url,options);
 document.getElementById('requestCapture').textContent=options.body;
 return {ok:true,json:async()=>({choices:[{message:{content:'Тестовый ответ / Test response / Сынақ жауабы'}}]})};
};
</script><pre id="requestCapture" hidden></pre>'''.replace('SEED',json.dumps(json.dumps(seed,ensure_ascii=False),ensure_ascii=False))
h=h.replace('<script src="locales.js"',setup+'\n<script src="locales.js"')
Path('tests/preview.html').write_text(h,encoding='utf-8')
