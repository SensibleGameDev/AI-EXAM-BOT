const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const nodes=new Map(),storage=new Map();
const context=vm.createContext({console,AbortController,setTimeout,clearTimeout,localStorage:{setItem(k,v){storage.set(k,v)},getItem(k){return storage.get(k)||null}},document:{addEventListener(){},getElementById(id){if(!nodes.has(id))nodes.set(id,{value:'',style:{},remove(){},focus(){},querySelector(){return null}});return nodes.get(id)},createElement(){return {set textContent(v){this.innerHTML=String(v).replaceAll('&','&amp;').replaceAll('<','&lt;')}}}}});
for(const file of ['locales.js','app.js','practice.js'])vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../'+file),'utf8'),context);
const run=s=>vm.runInContext(s,context);
async function main(){
 assert.equal(run("getActiveStudyIndex({activeStudyMsgIdx:-1,messages:[{type:'coding'}]})"),-1);
 assert.equal(run("getActiveStudyIndex({messages:[{type:'coding'},{type:'text'}]})"),0);
 assert.equal(run("validatePractice({questions:[{question:'x',options:['a','b'],correctIndex:9}]},'quiz')"),null);
 assert.equal(run("validatePractice({problems:[{title:'x',description:'y',examples:'invalid'}]},'coding')"),null);
 assert.ok(run("validatePractice({questions:[{question:'x',options:['a','b'],correctIndex:1}]},'quiz')"));
 assert.equal(run("validatePractice({questions:[{question:'x',options:['a','b'],correctIndices:[0,0]}]},'multiquiz')"),null);
 assert.equal(run("validatePractice({questions:[{question:'x',options:['a','b'],correctIndex:1,answerType:'multi'}]},'quiz').questions[0].answerType"),'single');
 assert.equal(run("validatePractice({problems:[{title:'x',description:'y',difficulty:42}]},'coding')"),null);
 const snippet='```js\nconst a = 2 * 3;\nconst b = 4 * 5;\n```';
 const code=run('renderMarkdown('+JSON.stringify(snippet)+')');
 assert.ok(code.includes('const a = 2 * 3;\nconst b = 4 * 5;'));
 assert.ok(!code.includes('<em>'));

 // Review copies preserve source attempts, marks and the individual answer type.
 run(`state.sessions=[{id:'test',messages:[{type:'quiz',data:{type:'single',questions:[
 {question:'First',options:['A','B'],correctIndex:1,userAnswers:[0],submitted:true,isCorrect:false,explanation:'hidden first',markedLater:true},
 {question:'Second',options:['A','B','C'],answerType:'multi',correctIndices:[0,2],userAnswers:[0,2],submitted:true,isCorrect:true,explanation:'hidden second'},
 {question:'Third',options:['A','B'],correctIndex:0,userAnswers:[1],submitted:false,explanation:'do not leak'}]}}],activeStudyMsgIdx:0}];state.currentSessionId='test'`);
 assert.equal(run("reviewQuestions('mistakes',getCurrentSession().messages[0]).length"),1);
 assert.equal(run("reviewQuestions('mistakes',getCurrentSession().messages[0])[0].submitted"),false);
 assert.equal(run('getCurrentSession().messages[0].data.questions[0].submitted'),true);
 run("state.savedQuestions=getCurrentSession().messages[0].data.questions.slice(0,2).map(q=>({key:questionKey(getCurrentSession().messages[0],q),type:questionType(getCurrentSession().messages[0],q),question:q}))");
 assert.equal(run("reviewQuestions('saved')[1].answerType"),'multi');
 assert.equal(run("reviewQuestions('saved')[1].userAnswers.length"),0);
 run('quizView(getCurrentSession().messages[0]).index=2');
 const attachment=JSON.parse(run('requestExerciseContext()'));
 assert.equal(attachment.question,'Third');assert.deepEqual(attachment.selectedIndices,[1]);
 assert.equal(attachment.explanation,undefined);assert.equal(attachment.correctIndices,undefined);
 run('quizView(getCurrentSession().messages[0]).index=0');
 assert.deepEqual(JSON.parse(run('requestExerciseContext()')).correctIndices,[1]);
 run('state.includeContext=false');assert.equal(run('requestExerciseContext()'),null);
 run('state.includeContext=true;getCurrentSession().activeStudyMsgIdx=-1');assert.equal(run('requestExerciseContext()'),null);
 for(const lang of ['en','ru','kk']){
   run('state.language='+JSON.stringify(lang));
   assert.equal(run("Object.keys(uiStrings.en).every(k=>typeof uiStrings[state.language][k]==='string'&&uiStrings[state.language][k].length>0)"),true);
   assert.ok(!run("t('progress',{done:2,total:4})").includes('{'));
 }
 run("state.language='en'");
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

 // Submit a mixed saved collection, including a partial multi-answer result.
 run("getCurrentSession().messages=[{type:'quiz',data:{type:'single',questions:reviewQuestions('saved')}}];getCurrentSession().activeStudyMsgIdx=0");
 run('getCurrentSession().messages[0].data.questions[0].userAnswers=[1];submitOpt(0,0)');
 assert.equal(run('getCurrentSession().messages[0].data.questions[0].isCorrect'),true);
 run('getCurrentSession().messages[0].data.questions[1].userAnswers=[0];submitOpt(0,1)');
 assert.equal(run('getCurrentSession().messages[0].data.questions[1].isPartial'),true);
 assert.equal(run('state.stats.quizzes'),2);
 assert.equal(run("getCurrentSession().messages.filter(m=>m.type==='score').length"),1);
 run('submitOpt(0,1)');assert.equal(run('state.stats.quizzes'),2);
 // Reload the same stored state: saved questions, navigation and opt-out survive.
 run("quizView(getCurrentSession().messages[0]).mode='all';state.includeContext=false;saveState();state.sessions=[];state.savedQuestions=[];state.includeContext=true;loadState()");
 assert.equal(run('state.savedQuestions.length'),2);
 assert.equal(run('state.includeContext'),false);
 assert.equal(run('quizView(getCurrentSession().messages[0]).mode'),'all');
 assert.equal(run('getCurrentSession().messages[0].data.questions[1].isPartial'),true);
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
 console.log('PASS: review isolation, mixed question types, context privacy, locale coverage, clearing, validation, formatting, session race, duplicate scores and API errors');
}
main().catch(e=>{console.error(e);process.exitCode=1});
