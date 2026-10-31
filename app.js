
const PROXY_ENDPOINT='/api/deepseek-proxy';
const DEEPSEEK_MODEL='deepseek-chat';

const state={sessions:[],currentSessionId:null,language:'en',material:'',uploadedFileName:'',isGenerating:false,stats:{quizzes:0,correct:0,wrong:0,problems:0},darkMode:false,practiceOpen:true,questionCount:5,mobileTab:'chat'};

const i18n={
  en:{placeholder:'Ask anything, or /quiz, /coding, /explain…',correct:'✅ Correct!',incorrect:'❌ Incorrect.',partial:'⚠️ Partially correct.',selectAll:'Select all that apply, then click Submit.',selectOne:'Select one answer, then click Submit.',submitAnswer:'Submit Answer',quizComplete:'Quiz Complete!',hint:'💡 Show Hint',hideHint:'💡 Hide Hint',exportTitle:'AI Exam Coach — Session Export',selectFirst:'Please select an answer first.',excellent:'Excellent work!',great:'Great job! Almost perfect!',good:'Good effort! Review the mistakes.',keepStudying:'Keep studying, you\'ll get there!',accuracy:'Accuracy',correctLabel:'Correct',wrongLabel:'Wrong',parseError:'Could not parse AI response. Retrying…',uploadSuccess:'File loaded!',uploadFail:'Failed to parse file.',uploading:'Parsing file…',proxyError:'⚠️ Could not reach AI server. Check your connection and Vercel DEEPSEEK_API_KEY configuration.'},
  ru:{placeholder:'Задайте вопрос: /quiz, /coding, /explain…',correct:'✅ Правильно!',incorrect:'❌ Неправильно.',partial:'⚠️ Частично правильно.',selectAll:'Выберите все правильные и нажмите Ответить.',selectOne:'Выберите один ответ и нажмите Ответить.',submitAnswer:'Ответить',quizComplete:'Тест завершён!',hint:'💡 Подсказка',hideHint:'💡 Скрыть',exportTitle:'AI Exam Coach — Экспорт',selectFirst:'Сначала выберите ответ.',excellent:'Отличная работа!',great:'Здорово! Почти идеально!',good:'Хорошо! Разберите ошибки.',keepStudying:'Продолжайте учиться!',accuracy:'Точность',correctLabel:'Верно',wrongLabel:'Ошибки',parseError:'Не удалось распознать ответ. Повтор…',uploadSuccess:'Файл загружен!',uploadFail:'Не удалось прочитать файл.',uploading:'Чтение файла…',proxyError:'⚠️ Нет связи с ИИ. Проверьте соединение и DEEPSEEK_API_KEY в Vercel.'},
  kk:{placeholder:'Сұрақ қойыңыз: /quiz, /coding, /explain…',correct:'✅ Дұрыс!',incorrect:'❌ Қате.',partial:'⚠️ Жартылай дұрыс.',selectAll:'Барлық дұрыс нұсқаларды таңдап, Жіберу басыңыз.',selectOne:'Бір жауапты таңдап, Жіберу басыңыз.',submitAnswer:'Жіберу',quizComplete:'Тест аяқталды!',hint:'💡 Кеңес',hideHint:'💡 Жасыру',exportTitle:'AI Exam Coach — Экспорт',selectFirst:'Алдымен жауап таңдаңыз.',excellent:'Керемет!',great:'Өте жақсы!',good:'Жақсы! Қателерді қайталаңыз.',keepStudying:'Оқуды жалғастырыңыз!',accuracy:'Дәлдік',correctLabel:'Дұрыс',wrongLabel:'Қате',parseError:'ИИ жауабын талдау мүмкін болмады. Қайта…',uploadSuccess:'Файл жүктелді!',uploadFail:'Файлды оқу мүмкін болмады.',uploading:'Файл оқылуда…',proxyError:'⚠️ ИИ серверіне қосылу мүмкін болмады.'}
};
function t(k){return(i18n[state.language]&&i18n[state.language][k])||i18n.en[k]||k}

// ── PERSISTENCE ──
function saveState(){try{localStorage.setItem('examCoachState',JSON.stringify({sessions:state.sessions,currentSessionId:state.currentSessionId,language:state.language,material:state.material,uploadedFileName:state.uploadedFileName,stats:state.stats,darkMode:state.darkMode,practiceOpen:state.practiceOpen,questionCount:state.questionCount}))}catch(e){if(!state.storageWarning){state.storageWarning=true;showToast('Storage is full or unavailable. Export your session to keep a copy.','error')}}}
function loadState(){try{const s=JSON.parse(localStorage.getItem('examCoachState')||'{}');if(s.language)state.language=s.language;if(s.material)state.material=s.material;if(s.uploadedFileName)state.uploadedFileName=s.uploadedFileName;if(s.sessions)state.sessions=s.sessions;if(s.currentSessionId)state.currentSessionId=s.currentSessionId;if(s.stats)state.stats=s.stats;if(typeof s.darkMode==='boolean')state.darkMode=s.darkMode;if(typeof s.practiceOpen==='boolean')state.practiceOpen=s.practiceOpen;if(s.questionCount)state.questionCount=s.questionCount}catch(e){}}

// ── SESSIONS ──
function getCurrentSession(){return state.sessions.find(s=>s.id===state.currentSessionId)}
function newSession(){cancelGeneration();const session={id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),title:'New Session',messages:[],activeStudyMsgIdx:null,created:Date.now()};state.sessions.unshift(session);state.currentSessionId=session.id;saveState();renderSessionList();renderChat();renderPracticePane();closeSidebar()}
function switchSession(id){cancelGeneration();state.currentSessionId=id;saveState();renderSessionList();renderChat();renderPracticePane();closeSidebar()}
function deleteSession(id,evt){evt.stopPropagation();if(id===state.currentSessionId)cancelGeneration();state.sessions=state.sessions.filter(s=>s.id!==id);if(state.currentSessionId===id)state.currentSessionId=state.sessions.length?state.sessions[0].id:null;saveState();renderSessionList();renderChat();renderPracticePane()}
function renderSessionList(){const el=document.getElementById('sessionList');if(!el)return;el.innerHTML=state.sessions.map(s=>`<div class="session-item ${s.id===state.currentSessionId?'active':''}" onclick="switchSession('${s.id}')"><span class="session-icon">💬</span><span class="session-text">${escHtml(s.title)}</span><button class="session-delete" onclick="deleteSession('${s.id}',event)" title="Delete">✕</button></div>`).join('')}
function updateSessionTitle(session){const first=session.messages.find(m=>m.role==='user');if(first)session.title=first.content.slice(0,55)+(first.content.length>55?'…':'')}

// ── HTML HELPERS ──
function escHtml(s){if(!s)return'';const d=document.createElement('div');d.textContent=String(s);return d.innerHTML}
function renderMarkdown(text){if(!text)return'';const blocks=[];let h=escHtml(text);h=h.replace(/```(\w*)\n([\s\S]*?)```/g,(_,l,c)=>{blocks.push(`<pre><code>${c.trim()}</code></pre>`);return `\u0000${blocks.length-1}\u0000`});h=h.replace(/`([^`]+)`/g,'<code>$1</code>');h=h.replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>');h=h.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g,'<em>$1</em>');h=h.replace(/^#### (.+)$/gm,'<h4>$1</h4>');h=h.replace(/^### (.+)$/gm,'<h3>$1</h3>');h=h.replace(/^## (.+)$/gm,'<h3>$1</h3>');h=h.replace(/^---$/gm,'<hr>');h=h.replace(/^&gt; (.+)$/gm,'<blockquote>$1</blockquote>');h=h.replace(/^[\-\*] (.+)$/gm,'<li>$1</li>');h=h.replace(/(<li>[\s\S]*?<\/li>(\s*<br>)?)+/g,m=>`<ul>${m.replace(/<br>/g,'')}</ul>`);h=h.replace(/^\d+\. (.+)$/gm,'<li>$1</li>');h=h.replace(/\n\n/g,'</p><p>');h=h.replace(/\n/g,'<br>');h='<p>'+h+'</p>';h=h.replace(/<p>\s*<\/p>/g,'');h=h.replace(/<p>\s*(<(?:h[34]|pre|ul|ol|hr|blockquote)>)/g,'$1');h=h.replace(/(<\/(?:h[34]|pre|ul|ol|hr|blockquote)>)\s*<\/p>/g,'$1');return h.replace(/\u0000(\d+)\u0000/g,(_,i)=>blocks[i])}

// ── CHAT RENDERING ──
function renderChat(){const area=document.getElementById('chatArea');const welcome=document.getElementById('welcomeScreen');const session=getCurrentSession();Array.from(area.children).forEach(ch=>{if(ch.id!=='welcomeScreen')ch.remove()});if(!session||session.messages.length===0){if(welcome)welcome.style.display='';return}if(welcome)welcome.style.display='none';session.messages.forEach((msg,msgIdx)=>{if(msg.type!=='text'){const summary=msg.content||(msg.type==='quiz'?'📝 Practice ready → see Practice Workspace':msg.type==='coding'?'💻 Coding problem ready → see Practice Workspace':msg.type==='flashcards'?'🃏 Flashcards ready → see Practice Workspace':msg.type==='score'?'🏆 Score updated.':'Content generated.');const div=document.createElement('div');div.className='msg bot';div.innerHTML=`<div class="msg-avatar">🎓</div><div class="msg-bubble">${renderMarkdown(summary)}</div>`;if(['quiz','coding','flashcards'].includes(msg.type)){const open=document.createElement('button');open.className='practice-link';open.textContent='Open practice →';open.onclick=()=>selectPractice(msgIdx);div.querySelector('.msg-bubble').appendChild(open)}area.appendChild(div);return}const div=document.createElement('div');div.className=`msg ${msg.role==='user'?'user':'bot'}`;div.innerHTML=`<div class="msg-avatar">${msg.role==='user'?'👤':'🎓'}</div><div class="msg-bubble">${msg.role==='user'?escHtml(msg.content):renderMarkdown(msg.content)}</div>`;area.appendChild(div)});scrollToBottom()}
function getActiveStudyIndex(session){if(!session||session.activeStudyMsgIdx===-1)return -1;const valid=i=>i>=0&&i<session.messages.length&&['quiz','coding','flashcards'].includes(session.messages[i].type);if(typeof session.activeStudyMsgIdx==='number'&&valid(session.activeStudyMsgIdx))return session.activeStudyMsgIdx;for(let i=session.messages.length-1;i>=0;i--)if(['quiz','coding','flashcards'].includes(session.messages[i].type)){session.activeStudyMsgIdx=i;return i}session.activeStudyMsgIdx=null;return -1}

function renderPracticePane(){updatePracticeHistory();const session=getCurrentSession();const body=document.getElementById('practiceBody');if(!body)return;body.innerHTML='';const idx=getActiveStudyIndex(session);if(!session||idx<0){body.innerHTML='<div class="practice-empty">No active practice yet. Use <strong>/quiz</strong>, <strong>/coding</strong>, or <strong>/flashcards</strong>.</div>';return}
const msg=session.messages[idx];const chip=document.createElement('div');chip.className='practice-chip';chip.textContent=msg.type==='quiz'?'Quiz':msg.type==='coding'?'Coding':'Flashcards';body.appendChild(chip);
if(msg.type==='quiz'){
  // progress bar
  const done=msg.data.questions.filter(q=>q.submitted).length;const total=msg.data.questions.length;const pbar=document.createElement('div');pbar.className='quiz-progress';pbar.id=`quizProgress_${idx}`;pbar.innerHTML=`<div class="quiz-progress-fill" style="width:${Math.round(done/total*100)}%"></div>`;body.appendChild(pbar);
  renderQuizCards(body,msg.data,idx);const nextStudy=session.messages.findIndex((m,i)=>i>idx&&['quiz','coding','flashcards'].includes(m.type));const scoreMsg=session.messages.slice(idx+1,nextStudy<0?undefined:nextStudy).find(m=>m.type==='score');if(scoreMsg?.data)renderScoreCard(body,scoreMsg.data)
}else if(msg.type==='coding'){renderProblemCards(body,msg.data,idx,false)}else if(msg.type==='flashcards'){renderFlashcards(body,msg.data,idx)}}

function clearPractice(){const session=getCurrentSession();if(!session)return;session.activeStudyMsgIdx=-1;saveState();renderPracticePane()}
function addMsg(role,content,type,data){const session=getCurrentSession();if(!session)return;session.messages.push({role,content:content||'',type:type||'text',data:data||null});updateSessionTitle(session);saveState()}
function appendMsgEl(role,content){const area=document.getElementById('chatArea');const welcome=document.getElementById('welcomeScreen');if(welcome)welcome.style.display='none';const div=document.createElement('div');div.className=`msg ${role}`;div.innerHTML=`<div class="msg-avatar">${role==='user'?'👤':'🎓'}</div><div class="msg-bubble">${role==='user'?escHtml(content):renderMarkdown(content)}</div>`;area.appendChild(div);scrollToBottom()}
function showTyping(){const area=document.getElementById('chatArea');const div=document.createElement('div');div.className='msg bot';div.id='typingIndicator';div.innerHTML=`<div class="msg-avatar">🎓</div><div class="msg-bubble"><div class="typing"><span></span><span></span><span></span></div></div>`;area.appendChild(div);scrollToBottom()}
function removeTyping(){const el=document.getElementById('typingIndicator');if(el)el.remove()}
function scrollToBottom(){const area=document.getElementById('chatArea');requestAnimationFrame(()=>{area.scrollTop=area.scrollHeight})}

// ── QUIZ RENDERING ──
function renderQuizCards(container,quizData,msgIdx){const{questions,type}=quizData;const isMulti=type==='multi';questions.forEach((q,qIdx)=>{const card=document.createElement('div');card.className='quiz-card';card.id=`quiz_${msgIdx}_${qIdx}`;const badge=isMulti?'<span class="badge badge-multi">Multi</span>':'<span class="badge badge-single">Single</span>';const instruction=isMulti?t('selectAll'):t('selectOne');let optionsHtml=q.options.map((opt,oIdx)=>{const cls=['quiz-option'];if(isMulti)cls.push('multi');const userAns=q.userAnswers||[];const checked=userAns.includes(oIdx);const submitted=!!q.submitted;const isCorrectOpt=isMulti?(q.correctIndices||[]).includes(oIdx):q.correctIndex===oIdx;if(submitted){cls.push('disabled');if(isCorrectOpt)cls.push('correct');else if(checked)cls.push('incorrect')}else if(checked)cls.push('selected');let marker='';if(submitted)marker=isCorrectOpt?'✓':(checked?'✗':'');else marker=checked?(isMulti?'✓':'●'):'';return`<button type="button" class="${cls.join(' ')}" ${submitted?'disabled':''} aria-pressed="${checked}" onclick="toggleOpt(${msgIdx},${qIdx},${oIdx},${isMulti})"><span class="marker">${marker}</span><span>${escHtml(opt)}</span></button>`}).join('');let explanationHtml='';if(q.submitted&&q.explanation){const rc=q.isCorrect?'correct-expl':(q.isPartial?'partial-expl':'incorrect-expl');const rt=q.isCorrect?t('correct'):(q.isPartial?t('partial'):t('incorrect'));explanationHtml=`<div class="quiz-explanation ${rc}"><strong>${rt}</strong> ${escHtml(q.explanation)}</div>`}let actionsHtml='';if(!q.submitted)actionsHtml=`<div class="quiz-actions"><button class="quiz-btn quiz-btn-primary" onclick="submitOpt(${msgIdx},${qIdx},${isMulti})">${t('submitAnswer')}</button></div>`;card.innerHTML=`<div class="quiz-card-header"><span style="font-size:.78rem;color:var(--text-secondary)">Q${qIdx+1}/${questions.length}</span>${badge}</div><div class="quiz-question">${escHtml(q.question)}</div><div style="font-size:.73rem;color:var(--text-secondary);margin-bottom:8px">${instruction}</div>${optionsHtml}${explanationHtml}${actionsHtml}`;container.appendChild(card)})}
function toggleOpt(msgIdx,qIdx,oIdx,isMulti){const session=getCurrentSession();if(!session)return;const q=session.messages[msgIdx]?.data?.questions?.[qIdx];if(!q||q.submitted)return;if(!q.userAnswers)q.userAnswers=[];if(isMulti){const i=q.userAnswers.indexOf(oIdx);if(i>=0)q.userAnswers.splice(i,1);else q.userAnswers.push(oIdx)}else{q.userAnswers=[oIdx]}saveState();rerenderQuizCard(msgIdx,qIdx);document.getElementById(`quiz_${msgIdx}_${qIdx}`)?.querySelectorAll('.quiz-option')[oIdx]?.focus({preventScroll:true})}
function submitOpt(msgIdx,qIdx,isMulti){const session=getCurrentSession();if(!session)return;const msg=session.messages[msgIdx];const q=msg?.data?.questions?.[qIdx];if(q?.submitted)return;if(!q||!q.userAnswers||q.userAnswers.length===0){showToast(t('selectFirst'),'info');return}q.submitted=true;if(isMulti){const correct=(q.correctIndices||[]).slice().sort();const user=q.userAnswers.slice().sort();q.isCorrect=JSON.stringify(user)===JSON.stringify(correct);q.isPartial=!q.isCorrect&&user.some(u=>correct.includes(u))}else{q.isCorrect=q.userAnswers[0]===q.correctIndex;q.isPartial=false}state.stats.quizzes++;if(q.isCorrect)state.stats.correct++;else state.stats.wrong++;updateStatsUI();rerenderQuizCard(msgIdx,qIdx);updateQuizProgress(msgIdx);const allDone=msg.data.questions.every(qq=>qq.submitted);if(allDone){const cc=msg.data.questions.filter(qq=>qq.isCorrect).length;const tot=msg.data.questions.length;const scoreData={correct:cc,total:tot,percentage:Math.round(cc/tot*100)};addMsg('bot',`🏆 Quiz: ${cc}/${tot}.`,'score',scoreData);appendMsgEl('bot',`🏆 Quiz: ${cc}/${tot}.`);const body=document.getElementById('practiceBody');if(body)renderScoreCard(body,scoreData)}saveState();renderSessionList()}
function rerenderQuizCard(msgIdx,qIdx){const session=getCurrentSession();if(!session)return;const msg=session.messages[msgIdx];if(!msg||msg.type!=='quiz')return;const cardId=`quiz_${msgIdx}_${qIdx}`;const oldCard=document.getElementById(cardId);if(!oldCard)return;const q=msg.data.questions[qIdx];const isMulti=msg.data.type==='multi';const total=msg.data.questions.length;const badge=isMulti?'<span class="badge badge-multi">Multi</span>':'<span class="badge badge-single">Single</span>';const instruction=isMulti?t('selectAll'):t('selectOne');let optionsHtml=q.options.map((opt,oIdx)=>{const cls=['quiz-option'];if(isMulti)cls.push('multi');const userAns=q.userAnswers||[];const checked=userAns.includes(oIdx);const submitted=!!q.submitted;const isCorrectOpt=isMulti?(q.correctIndices||[]).includes(oIdx):q.correctIndex===oIdx;if(submitted){cls.push('disabled');if(isCorrectOpt)cls.push('correct');else if(checked)cls.push('incorrect')}else if(checked)cls.push('selected');let marker='';if(submitted)marker=isCorrectOpt?'✓':(checked?'✗':'');else marker=checked?(isMulti?'✓':'●'):'';return`<button type="button" class="${cls.join(' ')}" ${submitted?'disabled':''} aria-pressed="${checked}" onclick="toggleOpt(${msgIdx},${qIdx},${oIdx},${isMulti})"><span class="marker">${marker}</span><span>${escHtml(opt)}</span></button>`}).join('');let explanationHtml='';if(q.submitted&&q.explanation){const rc=q.isCorrect?'correct-expl':(q.isPartial?'partial-expl':'incorrect-expl');const rt=q.isCorrect?t('correct'):(q.isPartial?t('partial'):t('incorrect'));explanationHtml=`<div class="quiz-explanation ${rc}"><strong>${rt}</strong> ${escHtml(q.explanation)}</div>`}let actionsHtml='';if(!q.submitted)actionsHtml=`<div class="quiz-actions"><button class="quiz-btn quiz-btn-primary" onclick="submitOpt(${msgIdx},${qIdx},${isMulti})">${t('submitAnswer')}</button></div>`;oldCard.innerHTML=`<div class="quiz-card-header"><span style="font-size:.78rem;color:var(--text-secondary)">Q${qIdx+1}/${total}</span>${badge}</div><div class="quiz-question">${escHtml(q.question)}</div><div style="font-size:.73rem;color:var(--text-secondary);margin-bottom:8px">${instruction}</div>${optionsHtml}${explanationHtml}${actionsHtml}`}
function updateQuizProgress(msgIdx){const session=getCurrentSession();if(!session)return;const msg=session.messages[msgIdx];if(!msg||msg.type!=='quiz')return;const done=msg.data.questions.filter(q=>q.submitted).length;const total=msg.data.questions.length;const pbar=document.getElementById(`quizProgress_${msgIdx}`);if(pbar){const fill=pbar.querySelector('.quiz-progress-fill');if(fill)fill.style.width=`${Math.round(done/total*100)}%`}}

// ── SCORE ──
function renderScoreCard(container,data){const card=document.createElement('div');card.className='score-card';let emoji,comment;if(data.percentage>=100){emoji='🎉';comment=t('excellent')}else if(data.percentage>=75){emoji='🌟';comment=t('great')}else if(data.percentage>=50){emoji='👍';comment=t('good')}else{emoji='📚';comment=t('keepStudying')}card.innerHTML=`<h3>${emoji} ${t('quizComplete')}</h3><div class="score-big">${data.correct}/${data.total}</div><div style="font-size:.88rem;opacity:.9">${comment}</div><div class="score-details"><div class="score-detail"><strong>${data.percentage}%</strong><span>${t('accuracy')}</span></div><div class="score-detail"><strong>${data.correct}</strong><span>${t('correctLabel')}</span></div><div class="score-detail"><strong>${data.total-data.correct}</strong><span>${t('wrongLabel')}</span></div></div>`;container.appendChild(card)}

// ── CODING ──
function renderProblemCards(container,data,msgIdx,countStats=true){(data.problems||[]).forEach((p,pIdx)=>{const card=document.createElement('div');card.className='problem-card';const hintId=`hint_${msgIdx}_${pIdx}`;const diffClass=(p.difficulty||'').toLowerCase()==='easy'?'diff-easy':(p.difficulty||'').toLowerCase()==='hard'?'diff-hard':'diff-medium';let constraintsHtml='';if(p.constraints&&p.constraints.length)constraintsHtml=`<div class="problem-section"><h5>Constraints</h5><ul>${p.constraints.map(c=>`<li>${escHtml(c)}</li>`).join('')}</ul></div>`;let examplesHtml='';if(p.examples&&p.examples.length)examplesHtml=`<div class="problem-section"><h5>Examples</h5>${p.examples.map(ex=>`<pre><code>Input:  ${escHtml(ex.input||'')}\nOutput: ${escHtml(ex.output||'')}${ex.explanation?'\nNote:   '+escHtml(ex.explanation):''}</code></pre>`).join('')}</div>`;let topicsHtml='';if(p.topics&&p.topics.length)topicsHtml=`<div class="problem-section"><h5>Topics</h5><div class="problem-topics">${p.topics.map(tp=>`<span class="problem-topic-tag">${escHtml(tp)}</span>`).join('')}</div></div>`;let hintHtml='';if(p.hint)hintHtml=`<button class="hint-toggle" onclick="toggleHint('${hintId}',this)">${t('hint')}</button><div class="problem-hint" id="${hintId}">💡 ${escHtml(p.hint)}</div>`;card.innerHTML=`<h4>💻 ${escHtml(p.title)} <span class="difficulty-tag ${diffClass}">${escHtml(p.difficulty||'Medium')}</span></h4><div class="problem-section"><h5>Description</h5><p>${escHtml(p.description)}</p></div>${constraintsHtml}${examplesHtml}${topicsHtml}${hintHtml}`;container.appendChild(card)});if(countStats){state.stats.problems+=(data.problems||[]).length;updateStatsUI()}}
function toggleHint(id,btn){const el=document.getElementById(id);if(!el)return;el.classList.toggle('visible');btn.textContent=el.classList.contains('visible')?t('hideHint'):t('hint')}

// ── FLASHCARDS ──
function renderFlashcards(container,data,msgIdx){(data.cards||[]).forEach((card,cIdx)=>{const el=document.createElement('div');el.className='quiz-card';const fcId=`fc_${msgIdx}_${cIdx}`;el.innerHTML=`<div class="quiz-card-header"><span style="font-size:.78rem;color:var(--text-secondary)">Card ${cIdx+1}/${data.cards.length}</span><span class="badge badge-coding">Flashcard</span></div><div class="quiz-question">${escHtml(card.term)}</div><div id="${fcId}" style="display:none;padding:10px 12px;background:var(--primary-light);border-radius:var(--radius-sm);margin-top:8px;font-size:.85rem;line-height:1.6">${escHtml(card.definition)}</div><div class="quiz-actions"><button class="quiz-btn quiz-btn-secondary" onclick="document.getElementById('${fcId}').style.display=document.getElementById('${fcId}').style.display==='none'?'block':'none'">🔄 Flip</button></div>`;container.appendChild(el)})}

// ── AI API ──
async function callAI(messages,forceJson){const body={model:DEEPSEEK_MODEL,messages,temperature:0.7,max_tokens:4096};if(forceJson)body.response_format={type:'json_object'};const resp=await fetch(PROXY_ENDPOINT,{signal:activeRequest?.signal,method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!resp.ok){const errText=await resp.text().catch(()=>'');if(resp.status===502||resp.status===0)throw new Error(t('proxyError'));throw new Error(`API Error ${resp.status}: ${errText.slice(0,300)}`)}const data=await resp.json();const content=data?.choices?.[0]?.message?.content;if(!content)throw new Error('The AI returned an empty response. Please try again.');return content}

// ── JSON PARSER ──
function tryParseJSON(text){if(!text)return null;let c=text.replace(/```(?:json)?\s*/gi,'').trim();const iO=c.indexOf('{'),iA=c.indexOf('[');let start=-1;if(iO>=0&&iA>=0)start=Math.min(iO,iA);else if(iO>=0)start=iO;else if(iA>=0)start=iA;if(start<0)return null;c=c.slice(start);const open=c[0],close=open==='{'?'}':']';let depth=0,inStr=false,esc=false,end=-1;for(let i=0;i<c.length;i++){const ch=c[i];if(esc){esc=false;continue}if(ch==='\\'){esc=true;continue}if(ch==='"'){inStr=!inStr;continue}if(inStr)continue;if(ch===open)depth++;else if(ch===close){depth--;if(depth===0){end=i;break}}}if(end<0)return null;const j=c.slice(0,end+1);try{return JSON.parse(j)}catch(e){try{return JSON.parse(j.replace(/,\s*([}\]])/g,'$1'))}catch(e2){return null}}}

// ── SYSTEM PROMPT ──
function buildSystemPrompt(cmdType){const lang=state.language==='ru'?'Russian':state.language==='kk'?'Kazakh':'English';const mat=state.material?`\n\nSTUDY MATERIAL PROVIDED BY THE STUDENT — base your questions/content on this:\n"""\n${state.material.slice(0,8000)}\n"""`:''
if(['quiz','multiquiz','coding','flashcards'].includes(cmdType)){const qc=state.questionCount||5;const schemas={
quiz:`You generate single-answer multiple choice quizzes. Output valid JSON only.\nSchema: {"type":"single","questions":[{"question":"text","options":["A","B","C","D"],"correctIndex":0,"explanation":"text"}]}\nRules:\n- "correctIndex" is 0-based\n- Always exactly 4 options\n- Generate exactly ${qc} questions\n- Challenging but fair\n- Helpful explanations`,
multiquiz:`You generate multi-answer quizzes. Output valid JSON only.\nSchema: {"type":"multi","questions":[{"question":"text","options":["A","B","C","D","E"],"correctIndices":[0,2],"explanation":"text"}]}\nRules:\n- "correctIndices" = array of 0-based indices\n- 4-5 options, usually 2-3 correct\n- Generate exactly ${qc} questions\n- Helpful explanations`,
coding:`You generate programming problems. Output valid JSON only.\nSchema: {"problems":[{"title":"text","difficulty":"Easy|Medium|Hard","description":"text","constraints":["text"],"examples":[{"input":"text","output":"text","explanation":"text"}],"topics":["text"],"hint":"text"}]}\nRules:\n- Clear LeetCode-style\n- 1-2 problems default\n- 2+ examples each\n- Helpful hints`,
flashcards:`You generate flashcards. Output valid JSON only.\nSchema: {"cards":[{"term":"text","definition":"text"}]}\nRules:\n- Generate ${Math.max(qc,8)} cards\n- Clear, concise definitions`};
return`You are "AI Exam Coach". Respond ONLY with valid JSON. No extra text. Language: ${lang}.\n\n${schemas[cmdType]}${mat}`}
return`You are "AI Exam Coach" — expert educational AI. Always respond in ${lang}. Use markdown.\n\nCommands: /quiz, /multiquiz, /coding, /flashcards (JSON output), /explain, /summary (markdown).\nBe thorough but clear. Use examples.${mat}`}

// ── FILE UPLOAD ──
async function handleFileUpload(event){const file=event.target.files[0];if(!file)return;const ext=file.name.split('.').pop().toLowerCase();if(!['pdf','docx','xlsx','xls'].includes(ext)){showToast('Use .pdf, .docx, or .xlsx','error');event.target.value='';return}const btn=document.getElementById('fileUploadBtn');btn.classList.add('loading');updateFileInfo(file.name,t('uploading'));try{let text='';if(ext==='pdf')text=await parsePDF(file);else if(ext==='docx')text=await parseDOCX(file);else text=await parseXLSX(file);if(!text||text.trim().length<10)throw new Error('No text extracted.');const max=15000;if(text.length>max)text=text.slice(0,max)+'\n\n[… truncated]';state.material=text;state.uploadedFileName=file.name;document.getElementById('materialInput').value=text;saveState();updateFileInfo(file.name,`✅ ${text.length.toLocaleString()} chars`);showToast(t('uploadSuccess'),'success')}catch(err){console.error(err);updateFileInfo(file.name,`❌ ${err.message}`);showToast(t('uploadFail')+' '+err.message,'error')}finally{btn.classList.remove('loading');event.target.value=''}}
function clearUploadedFile(){state.material='';state.uploadedFileName='';document.getElementById('materialInput').value='';document.getElementById('fileInput').value='';document.getElementById('fileInfo').innerHTML='';saveState();showToast('Material cleared.','info')}
function updateFileInfo(name,status){const el=document.getElementById('fileInfo');if(el)el.innerHTML=`<span class="file-name">📄 ${escHtml(name)}</span> — ${escHtml(status)}`}
async function parsePDF(file){if(typeof pdfjsLib==='undefined')throw new Error('PDF.js not loaded.');pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const ab=await file.arrayBuffer();const pdf=await pdfjsLib.getDocument({data:ab}).promise;const pages=[];for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i);const content=await page.getTextContent();pages.push(content.items.map(item=>item.str).join(' '))}return pages.join('\n\n')}
async function parseDOCX(file){if(typeof mammoth==='undefined')throw new Error('Mammoth not loaded.');const ab=await file.arrayBuffer();const result=await mammoth.extractRawText({arrayBuffer:ab});return result.value||''}
async function parseXLSX(file){if(typeof XLSX==='undefined')throw new Error('SheetJS not loaded.');const ab=await file.arrayBuffer();const wb=XLSX.read(ab,{type:'array'});const sheets=[];wb.SheetNames.forEach(name=>{const csv=XLSX.utils.sheet_to_csv(wb.Sheets[name],{blankrows:false});if(csv.trim())sheets.push(`=== ${name} ===\n${csv}`)});return sheets.join('\n\n')}

// ── MESSAGE HANDLING ──
let activeRequest = null;
function cancelGeneration(){
  if(activeRequest) activeRequest.abort();
  activeRequest=null; state.isGenerating=false; removeTyping();
  document.getElementById('sendBtn').disabled=false;
  document.getElementById('stopBtn').hidden=true;
}
async function sendMessage(){
  const input=document.getElementById('userInput');
  const text=input.value.trim(); if(!text||state.isGenerating)return;
  if(!getCurrentSession())newSession();
  input.value='';autoResize(input);addMsg('user',text);appendMsgEl('user',text);
  const cmdType=detectCommand(text), structured=['quiz','multiquiz','coding','flashcards'].includes(cmdType);
  const request=new AbortController(); activeRequest=request;
  state.isGenerating=true;document.getElementById('sendBtn').disabled=true;
  document.getElementById('stopBtn').hidden=false;showTyping();
  const timer=setTimeout(()=>request.abort('timeout'),90000);
  try{await processAIRequest(text,cmdType,structured,0,request)}
  catch(err){if(activeRequest===request && (!request.signal.aborted||request.signal.reason==='timeout')){
    const message=request.signal.reason==='timeout'?'The request timed out. Try fewer questions or a shorter prompt.':err.message;
    addMsg('bot','⚠️ '+message);appendMsgEl('bot','⚠️ '+message);showToast(message,'error');
  }}finally{clearTimeout(timer);if(activeRequest===request){cancelGeneration();saveState();renderSessionList()}}
}

async function processAIRequest(userText,cmdType,isStructured,retryCount,request){const session=getCurrentSession();const history=session.messages.filter(m=>m.type==='text'&&m.content).slice(-16).map(m=>({role:m.role==='user'?'user':'assistant',content:m.content}));let apiMessages;if(isStructured){apiMessages=[{role:'system',content:buildSystemPrompt(cmdType)},{role:'user',content:userText}]}else{apiMessages=[{role:'system',content:buildSystemPrompt(cmdType)},...history];if(!history.length||history[history.length-1].content!==userText)apiMessages.push({role:'user',content:userText})}
const response=await callAI(apiMessages,isStructured);if(request.signal.aborted||activeRequest!==request)return;removeTyping();
if(isStructured){const parsed=validatePractice(tryParseJSON(response),cmdType);
if((cmdType==='quiz'||cmdType==='multiquiz')&&parsed&&parsed.questions&&parsed.questions.length>0){if(!parsed.type)parsed.type=cmdType==='multiquiz'?'multi':'single';parsed.questions.forEach(q=>{q.userAnswers=[];q.submitted=false;q.isCorrect=false;q.isPartial=false});addMsg('bot',`📝 ${parsed.questions.length} questions ready.`,'quiz',parsed);session.activeStudyMsgIdx=session.messages.length-1;renderChat();renderPracticePane();showPracticeOnMobile();return}
if(cmdType==='coding'&&parsed&&parsed.problems&&parsed.problems.length>0){addMsg('bot',`💻 ${parsed.problems.length} problem(s) ready.`,'coding',parsed);session.activeStudyMsgIdx=session.messages.length-1;state.stats.problems+=parsed.problems.length;updateStatsUI();renderChat();renderPracticePane();showPracticeOnMobile();return}
if(cmdType==='flashcards'&&parsed&&parsed.cards&&parsed.cards.length>0){addMsg('bot',`🃏 ${parsed.cards.length} flashcards ready.`,'flashcards',parsed);session.activeStudyMsgIdx=session.messages.length-1;renderChat();renderPracticePane();showPracticeOnMobile();return}
if(retryCount<1){console.warn('JSON parse failed, retrying');showTyping();return processAIRequest(userText,cmdType,isStructured,retryCount+1,request)}console.error('JSON parse failed after retry')}
addMsg('bot',response);appendMsgEl('bot',response)}

function detectCommand(text){const l=text.toLowerCase().trim();if(l.startsWith('/multiquiz'))return'multiquiz';if(l.startsWith('/quiz'))return'quiz';if(l.startsWith('/coding')||l.startsWith('/code')||l.startsWith('/problem'))return'coding';if(l.startsWith('/flashcard'))return'flashcards';if(l.startsWith('/explain'))return'explain';if(l.startsWith('/summary')||l.startsWith('/summarize'))return'summary';return null}

function quickCommand(cmd){const input=document.getElementById('userInput');input.value=cmd+' ';state.practiceFocus=false;switchMobileTab('chat');input.focus();autoResize(input);closeSidebar()}
function quickSend(text){document.getElementById('userInput').value=text;sendMessage()}

// ── UI ──
function handleInputKey(e){if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();sendMessage()}}
function autoResize(el){el.style.height='auto';el.style.height=Math.min(el.scrollHeight,180)+'px'}
function toggleSidebar(){if(window.innerWidth>1024){layout.sidebarHidden=!layout.sidebarHidden;saveLayout();applyLayout();return}document.getElementById('sidebar').classList.toggle('open');document.getElementById('sidebarOverlay').classList.toggle('active');syncSidebarAccess()}
function closeSidebar(){document.getElementById('sidebar').classList.remove('open');document.getElementById('sidebarOverlay').classList.remove('active');syncSidebarAccess()}
function showToast(message,type){const toast=document.createElement('div');toast.className=`toast ${type||'info'}`;toast.textContent=message;document.body.appendChild(toast);setTimeout(()=>toast.remove(),4000)}
function updateStatsUI(){document.getElementById('statQuizzes').textContent=state.stats.quizzes;document.getElementById('statCorrect').textContent=state.stats.correct;document.getElementById('statWrong').textContent=state.stats.wrong;document.getElementById('statProblems').textContent=state.stats.problems}

// ── DARK MODE ──
function toggleDarkMode(){state.darkMode=!state.darkMode;applyDarkMode();saveState()}
function applyDarkMode(){document.documentElement.classList.toggle('dark',state.darkMode);document.getElementById('darkModeBtn').textContent=state.darkMode?'☀️':'🌙'}

// ── PRACTICE PANEL TOGGLE ──
function togglePractice(){state.practiceOpen=!state.practiceOpen;state.practiceFocus=false;applyPracticeState();saveState()}
function applyPracticeState(){applyLayout()}
function switchMobileTab(tab){state.mobileTab=tab;applyLayout()}
function showPracticeOnMobile(){state.practiceOpen=true;state.mobileTab='practice';applyLayout()}

// ── SETTINGS ──
function onLangChange(){state.language=document.getElementById('langSelect').value;document.getElementById('userInput').placeholder=t('placeholder');document.documentElement.lang=state.language;saveState()}
function onQCountChange(){state.questionCount=parseInt(document.getElementById('qcountSelect').value)||5;saveState()}
function saveMaterial(){state.material=document.getElementById('materialInput').value;saveState()}

// ── EXPORT ──
function exportSession(){const session=getCurrentSession();if(!session||session.messages.length===0){showToast('No session','info');return}let md=`# ${t('exportTitle')}\n## ${session.title.replace(/[<>&"]/g,'')}\n**Date:** ${new Date(session.created).toLocaleString()}\n\n---\n\n`;session.messages.forEach(msg=>{if(msg.role==='user')md+=`### 👤 You\n${msg.content}\n\n`;else if(msg.type==='quiz'&&msg.data){md+=`### 📝 Quiz (${msg.data.type==='multi'?'Multi':'Single'})\n`;msg.data.questions.forEach((q,i)=>{md+=`**Q${i+1}.** ${q.question}\n`;q.options.forEach((o,j)=>{const ic=msg.data.type==='multi'?(q.correctIndices||[]).includes(j):j===q.correctIndex;md+=`${ic?'  ✅':'  ◻️'} ${o}\n`});if(q.explanation)md+=`> ${q.explanation}\n`;if(q.submitted)md+=`> ${q.isCorrect?'✅ Correct':'❌ Incorrect'}\n`;md+='\n'})}else if(msg.type==='coding'&&msg.data)(msg.data.problems||[]).forEach(p=>{md+=`### 💻 ${p.title} [${p.difficulty}]\n${p.description}\n\n`});else if(msg.type==='flashcards'&&msg.data){md+=`### 🃏 Flashcards\n`;(msg.data.cards||[]).forEach((c,i)=>{md+=`${i+1}. **${c.term}** — ${c.definition}\n`});md+='\n'}else if(msg.type==='score'&&msg.data)md+=`### 🏆 ${msg.data.correct}/${msg.data.total} (${msg.data.percentage}%)\n\n`;else if(msg.role==='bot')md+=`### 🎓 AI\n${msg.content}\n\n`});const blob=new Blob([md],{type:'text/markdown'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`exam-coach-${session.id}.md`;a.click();URL.revokeObjectURL(url);showToast('Exported!','success')}

// ── INIT ──
function init(){loadState();document.getElementById('langSelect').value=state.language||'en';document.getElementById('materialInput').value=state.material||'';document.getElementById('userInput').placeholder=t('placeholder');document.getElementById('qcountSelect').value=state.questionCount||5;updateStatsUI();renderSessionList();applyDarkMode();applyPracticeState();if(state.uploadedFileName&&state.material)updateFileInfo(state.uploadedFileName,`✅ ${state.material.length.toLocaleString()} chars`);if(state.currentSessionId&&getCurrentSession())renderChat();renderPracticePane();document.getElementById('userInput').focus();
initLayout();document.documentElement.lang=state.language;window.addEventListener('resize',applyLayout)}
document.addEventListener('DOMContentLoaded',init);

// Layout preferences are independent of learning history.
const layout={width:null,sidebarHidden:false};
function saveLayout(){try{localStorage.setItem('examCoachLayout',JSON.stringify(layout))}catch{}}
function applyLayout(){
  const mobile=window.innerWidth<=768;
  const focus=!mobile&&state.practiceOpen&&state.practiceFocus;
  const visible=mobile?state.mobileTab==='practice':state.practiceOpen;
  document.body.classList.toggle('sidebar-hidden',window.innerWidth>1024&&layout.sidebarHidden);
  document.body.classList.toggle('practice-focus',!!focus);
  document.getElementById('chatColumn').style.display=mobile&&visible?'none':'';
  document.getElementById('practicePanel').classList.toggle('collapsed',!visible);document.getElementById('practicePanel').inert=!visible;
  const divider=document.getElementById('paneDivider');
  divider.hidden=!visible||mobile||focus;
  const workspace=document.querySelector('.workspace');
  const max=Math.max(320,workspace.clientWidth-309);
  const preferred=layout.width||workspace.clientWidth*.52;
  const width=Math.min(max,Math.max(320,preferred));
  document.documentElement.style.setProperty('--practice-width',width+'px');
  divider.setAttribute('aria-valuemin','320');divider.setAttribute('aria-valuemax',Math.round(max));divider.setAttribute('aria-valuenow',Math.round(width));
  document.getElementById('practiceToggleBtn').classList.toggle('active',visible);
  document.getElementById('practiceToggleBtn').setAttribute('aria-expanded',visible);
  document.getElementById('practiceToggleText').textContent='Practice';
  document.getElementById('focusPractice').textContent=focus?'↔ Split view':'⛶ Focus';
  document.getElementById('focusPractice').setAttribute('aria-pressed',!!focus);
  for(const tab of ['chat','practice']){
    const button=document.getElementById(tab==='chat'?'tabChat':'tabPractice');
    button.classList.toggle('active',state.mobileTab===tab);button.setAttribute('aria-pressed',state.mobileTab===tab);
  }
  if(window.innerWidth>1024)closeSidebar();syncSidebarAccess();
}
function togglePracticeFocus(){state.practiceFocus=!state.practiceFocus;applyLayout()}
function selectPractice(value){
  const session=getCurrentSession();if(!session)return;
  session.activeStudyMsgIdx=Number(value);saveState();renderPracticePane();
  showPracticeOnMobile();document.getElementById('practiceBody').scrollTop=0;
}
function updatePracticeHistory(){
  const select=document.getElementById('practiceHistory');if(!select)return;
  const session=getCurrentSession();select.replaceChildren();
  select.add(new Option('Choose a practice…','-1'));
  session?.messages.forEach((msg,i)=>{
    if(['quiz','coding','flashcards'].includes(msg.type)){
      const title=msg.type==='coding'?msg.data?.problems?.[0]?.title:msg.content;
      select.add(new Option(`${select.options.length}. ${title||msg.type}`,String(i)));
    }
  });
  select.value=String(getActiveStudyIndex(session));select.disabled=select.options.length===1;
}
function initLayout(){
  try{const saved=JSON.parse(localStorage.getItem('examCoachLayout')||'{}');if(Number.isFinite(saved.width))layout.width=saved.width;layout.sidebarHidden=!!saved.sidebarHidden}catch{}
  const divider=document.getElementById('paneDivider');
  divider.addEventListener('pointerdown',e=>{if(e.button!==0)return;divider.setPointerCapture(e.pointerId);document.body.classList.add('resizing')});
  divider.addEventListener('pointermove',e=>{if(!divider.hasPointerCapture(e.pointerId))return;const rect=document.querySelector('.workspace').getBoundingClientRect();layout.width=Math.max(320,Math.min(rect.width-309,rect.right-e.clientX));applyLayout()});
  function finish(){document.body.classList.remove('resizing');saveLayout()}
  divider.addEventListener('pointerup',finish);divider.addEventListener('lostpointercapture',finish);
  divider.addEventListener('dblclick',()=>{layout.width=null;saveLayout();applyLayout()});
  divider.addEventListener('keydown',e=>{
    if(!['ArrowLeft','ArrowRight','Home'].includes(e.key))return;e.preventDefault();
    layout.width=e.key==='Home'?null:Math.max(320,Math.min(document.querySelector('.workspace').clientWidth-309,document.getElementById('practicePanel').clientWidth+(e.key==='ArrowLeft'?32:-32)));
    saveLayout();applyLayout();
  });
  document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeSidebar();state.practiceFocus=false;applyLayout()}});
  document.querySelectorAll('.feature-card').forEach(card=>{card.tabIndex=0;card.setAttribute('role','button');card.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();card.click()}})});
  applyLayout();
}

// Reject incomplete model output before rendering interactive controls.
function validatePractice(data,type){
  const strings=a=>Array.isArray(a)&&a.every(v=>typeof v==='string');
  if(!data||typeof data!=='object')return null;
  if(type==='quiz'||type==='multiquiz'){
    if(!Array.isArray(data.questions)||!data.questions.length||!data.questions.every(q=>q&&typeof q.question==='string'&&strings(q.options)&&q.options.length>1&&(type==='multiquiz'?Array.isArray(q.correctIndices)&&q.correctIndices.length>0&&q.correctIndices.every(i=>Number.isInteger(i)&&i>=0&&i<q.options.length):Number.isInteger(q.correctIndex)&&q.correctIndex>=0&&q.correctIndex<q.options.length)))return null;
    data.type=type==='multiquiz'?'multi':'single';
  }else if(type==='coding'){
    if(!Array.isArray(data.problems)||!data.problems.length||!data.problems.every(p=>p&&typeof p.title==='string'&&typeof p.description==='string'&&(!p.constraints||strings(p.constraints))&&(!p.topics||strings(p.topics))&&(!p.examples||Array.isArray(p.examples)&&p.examples.every(e=>e&&typeof e==='object'))))return null;
  }else if(type==='flashcards'){
    if(!Array.isArray(data.cards)||!data.cards.length||!data.cards.every(c=>c&&typeof c.term==='string'&&typeof c.definition==='string'))return null;
  }
  return data;
}

function syncSidebarAccess(){
  const sidebar=document.getElementById('sidebar');
  const visible=window.innerWidth>1024?!layout.sidebarHidden:sidebar.classList.contains('open');
  sidebar.inert=!visible;
  document.querySelector('.main-header .hamburger').setAttribute('aria-expanded',visible);
}
