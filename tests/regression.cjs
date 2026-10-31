const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const nodes=new Map();
const context=vm.createContext({console,AbortController,setTimeout,clearTimeout,localStorage:{setItem(){}},document:{addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,{value:'',style:{},remove(){},focus(){}});return nodes.get(id)},createElement(){return {set textContent(v){this.innerHTML=String(v).replaceAll('&','&amp;').replaceAll('<','&lt;')}}}}});
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../app.js'),'utf8'),context);
const run=s=>vm.runInContext(s,context);
async function main(){
 assert.equal(run("getActiveStudyIndex({activeStudyMsgIdx:-1,messages:[{type:'coding'}]})"),-1);
 assert.equal(run("getActiveStudyIndex({messages:[{type:'coding'},{type:'text'}]})"),0);
 assert.equal(run("validatePractice({questions:[{question:'x',options:['a','b'],correctIndex:9}]},'quiz')"),null);
 assert.equal(run("validatePractice({problems:[{title:'x',description:'y',examples:'invalid'}]},'coding')"),null);
 assert.ok(run("validatePractice({questions:[{question:'x',options:['a','b'],correctIndex:1}]},'quiz')"));
 const snippet='```js\nconst a = 2 * 3;\nconst b = 4 * 5;\n```';
 const code=run('renderMarkdown('+JSON.stringify(snippet)+')');
 assert.ok(code.includes('const a = 2 * 3;\nconst b = 4 * 5;'));
 assert.ok(!code.includes('<em>'));
 let resolveResponse;
 context.fetch=()=>new Promise(resolve=>resolveResponse=resolve);
 run("renderChat=renderPracticePane=renderSessionList=appendMsgEl=showTyping=removeTyping=showToast=closeSidebar=()=>{};newSession();document.getElementById('userInput').value='hello'");
 const oldId=run('state.currentSessionId'),pending=run('sendMessage()');
 run('newSession()');
 resolveResponse({ok:true,json:async()=>({choices:[{message:{content:'stale response'}}]})});
 await pending;
 assert.equal(run('getCurrentSession().messages.length'),0);
 assert.notEqual(run('state.currentSessionId'),oldId);
 assert.equal(run('state.isGenerating'),false);
 run("getCurrentSession().messages=[{type:'quiz',data:{questions:[{submitted:true,userAnswers:[0]}]}}];submitOpt(0,0,false)");
 assert.equal(run('state.stats.quizzes'),0);
 const handler=require('../api/deepseek-proxy.js'),originalFetch=global.fetch,originalKey=process.env.DEEPSEEK_API_KEY;
 const invoke=async(method,body)=>{const res={headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this},send(v){this.body=v;return this}};await handler({method,body},res);return res};
 try{
  process.env.DEEPSEEK_API_KEY='test-only';
  assert.equal((await invoke('GET')).code,405);
  assert.equal((await invoke('POST',{messages:[]})).code,400);
  assert.equal((await invoke('POST',{messages:[{role:'user',content:123}]})).code,400);
  let forwarded;
  global.fetch=async(url,opts)=>{forwarded=JSON.parse(opts.body);return {status:200,text:async()=>'{}'}};
  assert.equal((await invoke('POST',{model:'other',max_tokens:999999,messages:[{role:'user',content:'test'}]})).code,200);
  assert.equal(forwarded.model,'deepseek-chat');assert.equal(forwarded.max_tokens,4096);
  global.fetch=async()=>{const e=new Error();e.name='TimeoutError';throw e};
  assert.equal((await invoke('POST',{messages:[{role:'user',content:'test'}]})).code,504);
 }finally{global.fetch=originalFetch;if(originalKey===undefined)delete process.env.DEEPSEEK_API_KEY;else process.env.DEEPSEEK_API_KEY=originalKey}
 console.log('PASS: clearing, validation, formatting, session race, duplicate scores, API limits and timeout');
}
main().catch(e=>{console.error(e);process.exitCode=1});
