// Practice navigation and review use the same locally stored question data.
function quizView(msg){
  if(!msg.quizView)msg.quizView={mode:'one',index:0};
  msg.quizView.index=Math.max(0,Math.min(msg.data.questions.length-1,Number(msg.quizView.index)||0));
  return msg.quizView;
}
function questionType(msg,q){return q.answerType||msg.data.type||'single'}
function questionKey(msg,q){return JSON.stringify([questionType(msg,q),q.question,q.options,q.correctIndex??null,q.correctIndices||[]])}
function isSavedQuestion(msg,q){return (state.savedQuestions||[]).some(item=>item.key===questionKey(msg,q))}
function copyForReview(msg,q){
  return {question:q.question,options:[...q.options],correctIndex:q.correctIndex,correctIndices:q.correctIndices?[...q.correctIndices]:undefined,explanation:q.explanation||'',answerType:questionType(msg,q),userAnswers:[],submitted:false,isCorrect:false,isPartial:false,markedLater:false};
}
function reviewQuestions(kind,msg){
  if(kind==='saved')return (state.savedQuestions||[]).map(item=>copyForReview({data:{type:item.type}},item.question));
  return (msg?.data.questions||[]).filter(q=>q.submitted&&!q.isCorrect).map(q=>copyForReview(msg,q));
}
function startReview(kind,msgIdx){
  const source=getCurrentSession()?.messages[msgIdx];
  const questions=reviewQuestions(kind,source);
  if(!questions.length){showToast(t(kind==='saved'?'noSaved':'noMistakes'),'info');return}
  if(!getCurrentSession())newSession();
  addMsg('bot','', 'quiz',{type:'single',questions,reviewKind:kind});
  const session=getCurrentSession();session.activeStudyMsgIdx=session.messages.length-1;
  saveState();renderChat();renderPracticePane();showPracticeOnMobile();closeSidebar();
}
function toggleSavedQuestion(msgIdx,qIdx){
  const msg=getCurrentSession()?.messages[msgIdx],q=msg?.data.questions[qIdx];if(!q)return;
  const key=questionKey(msg,q);state.savedQuestions=state.savedQuestions||[];
  const index=state.savedQuestions.findIndex(item=>item.key===key);
  if(index>=0)state.savedQuestions.splice(index,1);
  else state.savedQuestions.push({key,type:questionType(msg,q),question:copyForReview(msg,q)});
  saveState();renderPracticePane();
  document.getElementById(`save_${msgIdx}_${qIdx}`)?.focus({preventScroll:true});
}
function toggleLater(msgIdx,qIdx){
  const q=getCurrentSession()?.messages[msgIdx]?.data.questions[qIdx];if(!q)return;
  q.markedLater=!q.markedLater;saveState();renderPracticePane();
  document.getElementById(`later_${msgIdx}_${qIdx}`)?.focus({preventScroll:true});
}
function navigateQuestion(msgIdx,index,mode){
  const msg=getCurrentSession()?.messages[msgIdx];if(!msg)return;
  const view=quizView(msg);view.index=Math.max(0,Math.min(msg.data.questions.length-1,index));
  if(mode)view.mode=mode;
  saveState();renderPracticePane();
  const card=document.getElementById(`quiz_${msgIdx}_${view.index}`);
  if(view.mode==='all')card?.scrollIntoView({block:'start'});else document.getElementById('practiceBody').scrollTop=0;
  card?.querySelector('.quiz-question')?.focus({preventScroll:true});
}
function renderPracticePane(){
  updatePracticeHistory();updateContextUI();
  const session=getCurrentSession(),body=document.getElementById('practiceBody');if(!body)return;
  const previous=body.scrollTop;body.replaceChildren();
  const idx=getActiveStudyIndex(session);
  if(idx<0){body.innerHTML=`<div class="practice-empty">${t('emptyPractice')}</div>`;return}
  const msg=session.messages[idx];
  const chip=document.createElement('div');chip.className='practice-chip';chip.textContent=t(msg.type)+(msg.data.reviewKind?' · '+t('review'):'');body.appendChild(chip);
  if(msg.type==='quiz'){
    renderQuizWorkspace(body,msg,idx);
  }else if(msg.type==='coding')renderProblemCards(body,msg.data,idx,false);
  else if(msg.type==='flashcards')renderFlashcards(body,msg.data,idx);
  body.scrollTop=previous;
}
function renderQuizWorkspace(body,msg,msgIdx){
  const questions=msg.data.questions,view=quizView(msg),done=questions.filter(q=>q.submitted).length;
  const wrong=questions.filter(q=>q.submitted&&!q.isCorrect).length;
  const toolbar=document.createElement('div');toolbar.className='quiz-navigation';
  toolbar.innerHTML=`<div class="quiz-toolbar"><strong role="status">${t('progress',{done,total:questions.length})}</strong><button class="header-btn" onclick="navigateQuestion(${msgIdx},${view.index},'${view.mode==='all'?'one':'all'}')">${t(view.mode==='all'?'oneAtTime':'showAll')}</button></div>
    <div class="quiz-progress"><div class="quiz-progress-fill" style="width:${done/questions.length*100}%"></div></div>
    <div class="question-numbers" role="group" aria-label="${t('questions')}">${questions.map((q,i)=>{
      const status=q.submitted?(q.isCorrect?'statusCorrect':'statusWrong'):'statusUnanswered';
      return `<button class="question-number ${q.submitted?(q.isCorrect?'answered-correct':'answered-wrong'):''}" aria-current="${view.index===i?'step':'false'}" aria-label="${t('question')} ${i+1}: ${t(status)}${q.markedLater?', '+t('markedLater'):''}" onclick="navigateQuestion(${msgIdx},${i})">${i+1}${q.markedLater?' ⚑':''}${q.submitted?(q.isCorrect?' ✓':' ×'):''}</button>`;
    }).join('')}</div>
    <div class="quiz-toolbar"><button class="header-btn" ${wrong?'':'disabled'} onclick="startReview('mistakes',${msgIdx})">${t('reviewMistakes')} (${wrong})</button><button class="header-btn" onclick="startReview('saved')">★ ${t('reviewSaved')} (${(state.savedQuestions||[]).length})</button></div>`;
  body.appendChild(toolbar);
  const indices=view.mode==='all'?questions.map((_,i)=>i):[view.index];
  indices.forEach(i=>body.appendChild(createQuizCard(msg,msgIdx,i)));
  if(view.mode!=='all'){
    const nav=document.createElement('div');nav.className='quiz-pager';
    nav.innerHTML=`<button class="quiz-btn quiz-btn-secondary" ${view.index===0?'disabled':''} onclick="navigateQuestion(${msgIdx},${view.index-1})">← ${t('previous')}</button><span>${view.index+1} / ${questions.length}</span><button class="quiz-btn quiz-btn-primary" ${view.index===questions.length-1?'disabled':''} onclick="navigateQuestion(${msgIdx},${view.index+1})">${t('next')} →</button>`;
    body.appendChild(nav);
  }
  if(done===questions.length){const correct=questions.filter(q=>q.isCorrect).length;renderScoreCard(body,{correct,total:questions.length,percentage:Math.round(correct/questions.length*100)})}
}
function createQuizCard(msg,msgIdx,qIdx){
  const q=msg.data.questions[qIdx],multi=questionType(msg,q)==='multi';
  const card=document.createElement('div');card.className='quiz-card';card.id=`quiz_${msgIdx}_${qIdx}`;
  const saved=isSavedQuestion(msg,q);
  const options=q.options.map((option,i)=>{
    const checked=(q.userAnswers||[]).includes(i),correct=multi?(q.correctIndices||[]).includes(i):q.correctIndex===i;
    const status=q.submitted?(correct?'correct':checked?'incorrect':''):(checked?'selected':'');
    const marker=q.submitted?(correct?'✓':checked?'×':''):(checked?'●':'');
    return `<button class="quiz-option ${multi?'multi':''} ${status} ${q.submitted?'disabled':''}" ${q.submitted?'disabled':''} aria-pressed="${checked}" onclick="toggleOpt(${msgIdx},${qIdx},${i})"><span class="marker">${marker}</span><span>${escHtml(option)}</span></button>`;
  }).join('');
  card.innerHTML=`<div class="quiz-card-header"><span>${t('question')} ${qIdx+1}/${msg.data.questions.length}</span><span class="badge ${multi?'badge-multi':'badge-single'}">${t(multi?'multi':'single')}</span></div>
    <div class="quiz-question" tabindex="-1">${escHtml(q.question)}</div><p class="question-instruction">${t(multi?'selectAll':'selectOne')}</p>${options}
    ${q.submitted?`<div class="quiz-explanation ${q.isCorrect?'correct-expl':q.isPartial?'partial-expl':'incorrect-expl'}" role="status"><strong>${t(q.isCorrect?'correct':q.isPartial?'partial':'incorrect')}</strong> ${escHtml(q.explanation||'')}</div>`:''}
    <div class="quiz-actions">${!q.submitted?`<button class="quiz-btn quiz-btn-primary" onclick="submitOpt(${msgIdx},${qIdx})">${t('submitAnswer')}</button>`:''}
    <button id="later_${msgIdx}_${qIdx}" class="quiz-btn quiz-btn-secondary" aria-pressed="${!!q.markedLater}" onclick="toggleLater(${msgIdx},${qIdx})">⚑ ${t(q.markedLater?'markedLater':'later')}</button>
    <button id="save_${msgIdx}_${qIdx}" class="quiz-btn quiz-btn-secondary" aria-pressed="${saved}" onclick="toggleSavedQuestion(${msgIdx},${qIdx})">${saved?'★':'☆'} ${t(saved?'savedQuestion':'saveQuestion')}</button>
    <button class="quiz-btn quiz-btn-secondary" onclick="askAboutExercise(${msgIdx},${qIdx})">${t('askAbout')}</button></div>`;
  return card;
}
function toggleOpt(msgIdx,qIdx,oIdx){
  const msg=getCurrentSession()?.messages[msgIdx],q=msg?.data.questions[qIdx];if(!q||q.submitted)return;
  quizView(msg).index=qIdx;
  const selected=q.userAnswers||[];
  q.userAnswers=questionType(msg,q)==='multi'?(selected.includes(oIdx)?selected.filter(i=>i!==oIdx):[...selected,oIdx]):[oIdx];
  saveState();
  const old=document.getElementById(`quiz_${msgIdx}_${qIdx}`);old?.replaceWith(createQuizCard(msg,msgIdx,qIdx));
  document.getElementById(`quiz_${msgIdx}_${qIdx}`)?.querySelectorAll('.quiz-option')[oIdx]?.focus({preventScroll:true});
  document.querySelectorAll('.question-number').forEach((button,i)=>button.setAttribute('aria-current',i===qIdx?'step':'false'));
  updateContextUI();
}
function submitOpt(msgIdx,qIdx){
  const msg=getCurrentSession()?.messages[msgIdx],q=msg?.data.questions[qIdx];if(!q||q.submitted)return;
  if(!q.userAnswers?.length){showToast(t('selectFirst'),'info');return}
  quizView(msg).index=qIdx;
  const correct=questionType(msg,q)==='multi'?q.correctIndices:[q.correctIndex];
  q.submitted=true;q.isCorrect=q.userAnswers.length===correct.length&&q.userAnswers.every(i=>correct.includes(i));
  q.isPartial=!q.isCorrect&&questionType(msg,q)==='multi'&&q.userAnswers.some(i=>correct.includes(i));
  state.stats.quizzes++;state.stats[q.isCorrect?'correct':'wrong']++;updateStatsUI();
  if(msg.data.questions.every(item=>item.submitted)&&!msg.scoreRecorded){
    msg.scoreRecorded=true;
    const total=msg.data.questions.length,correct=msg.data.questions.filter(item=>item.isCorrect).length;
    addMsg('bot','','score',{correct,total,percentage:Math.round(correct/total*100),studyIndex:msgIdx});
    renderChat();
  }
  saveState();renderPracticePane();renderSessionList();
  document.getElementById(`quiz_${msgIdx}_${qIdx}`)?.querySelector('.quiz-question')?.focus({preventScroll:true});
}
function practiceSummary(msg){
  if(msg.type==='score')return '🏆 '+t('scoreSummary',msg.data);
  const count=msg.type==='quiz'?msg.data.questions.length:msg.type==='coding'?msg.data.problems.length:msg.data.cards.length;
  return t('ready',{count,type:t(msg.type)})+(msg.data.reviewKind?' · '+t('review'):'');
}
function renderProblemCards(container,data,msgIdx){
  const msg=getCurrentSession().messages[msgIdx];
  (data.problems||[]).forEach((p,i)=>{
    const card=document.createElement('div');card.className='problem-card';
    const difficulty=['easy','medium','hard'].includes((p.difficulty||'').toLowerCase())?p.difficulty.toLowerCase():'medium';
    card.innerHTML=`<h4>💻 ${escHtml(p.title)} <span class="difficulty-tag diff-${difficulty}">${t(difficulty)}</span></h4>
    <div class="problem-section"><h5>${t('description')}</h5><p>${escHtml(p.description)}</p></div>
    ${p.constraints?.length?`<div class="problem-section"><h5>${t('constraints')}</h5><ul>${p.constraints.map(c=>`<li>${escHtml(c)}</li>`).join('')}</ul></div>`:''}
    ${p.examples?.length?`<div class="problem-section"><h5>${t('examples')}</h5>${p.examples.map(ex=>`<pre><code>${t('input')}: ${escHtml(ex.input??'')}\n${t('output')}: ${escHtml(ex.output??'')}${ex.explanation?'\n'+t('note')+': '+escHtml(ex.explanation):''}</code></pre>`).join('')}</div>`:''}
    ${p.topics?.length?`<div class="problem-section"><h5>${t('topics')}</h5><div class="problem-topics">${p.topics.map(topic=>`<span class="problem-topic-tag">${escHtml(topic)}</span>`).join('')}</div></div>`:''}
    ${p.hint?`<details ${msg.openHints?.includes(i)?'open':''} ontoggle="rememberHint(${msgIdx},${i},this.open)"><summary>${t('hint')}</summary><div class="hint-content">${escHtml(p.hint)}</div></details>`:''}
    <div class="quiz-actions"><button class="quiz-btn quiz-btn-secondary" onclick="askAboutExercise(${msgIdx},${i})">${t('askAbout')}</button></div>`;
    container.appendChild(card);
  });
}
function rememberHint(msgIdx,i,open){const msg=getCurrentSession()?.messages[msgIdx];if(!msg)return;const values=msg.openHints||[];msg.openHints=open?[...new Set([...values,i])]:values.filter(v=>v!==i);saveState()}
function renderFlashcards(container,data,msgIdx){
  const msg=getCurrentSession().messages[msgIdx];
  (data.cards||[]).forEach((card,i)=>{
    const el=document.createElement('div');el.className='quiz-card';const shown=msg.revealedCards?.includes(i);
    el.innerHTML=`<div class="quiz-card-header"><span>${t('card')} ${i+1}/${data.cards.length}</span></div><div class="quiz-question">${escHtml(card.term)}</div><div class="flashcard-answer" ${shown?'':'hidden'}>${escHtml(card.definition)}</div><div class="quiz-actions"><button class="quiz-btn quiz-btn-secondary" aria-expanded="${!!shown}" onclick="flipCard(${msgIdx},${i})">${t('flip')}</button><button class="quiz-btn quiz-btn-secondary" onclick="askAboutExercise(${msgIdx},${i})">${t('askAbout')}</button></div>`;
    container.appendChild(el);
  });
}
function flipCard(msgIdx,i){const msg=getCurrentSession()?.messages[msgIdx];if(!msg)return;const revealed=msg.revealedCards||[];msg.revealedCards=revealed.includes(i)?revealed.filter(v=>v!==i):[...revealed,i];msg.activeItem=i;saveState();renderPracticePane()}
function activeExerciseContext(session=getCurrentSession()){
  const idx=getActiveStudyIndex(session);if(idx<0)return null;
  const msg=session.messages[idx];
  if(msg.type==='quiz'){
    const index=quizView(msg).index,q=msg.data.questions[index];
    const context={type:'quiz',number:index+1,question:q.question,options:q.options,selectedIndices:q.userAnswers||[],submitted:!!q.submitted};
    if(q.submitted)Object.assign(context,{correctIndices:questionType(msg,q)==='multi'?q.correctIndices:[q.correctIndex],explanation:q.explanation});
    return {label:t('question')+' '+(index+1),data:context};
  }
  const items=msg.type==='coding'?msg.data.problems:msg.data.cards;
  const index=Math.max(0,Math.min(items.length-1,msg.activeItem||0)),item=items[index];
  if(msg.type==='coding')return {label:item.title,data:{type:'coding',title:item.title,description:item.description,constraints:item.constraints,examples:item.examples}};
  return {label:item.term,data:{type:'flashcard',term:item.term,...(msg.revealedCards?.includes(index)?{definition:item.definition}:{})}};
}
function requestExerciseContext(){
  if(state.includeContext===false)return null;
  const active=activeExerciseContext();if(!active)return null;
  // Bound the attachment without sending hidden answers or the whole exercise history.
  const data=JSON.stringify(active.data);
  return data.length>16000?data.slice(0,16000)+'\n[Context truncated]':data;
}
function updateContextUI(){
  const label=document.getElementById('contextLabel'),checkbox=document.getElementById('includeContext');if(!label||!checkbox)return;
  checkbox.checked=state.includeContext!==false;
  const active=activeExerciseContext();label.textContent=active&&checkbox.checked?t('contextLabel',{name:active.label}):t('noContext');
  label.title=label.textContent;
}
function toggleContext(){state.includeContext=document.getElementById('includeContext').checked;saveState();updateContextUI()}
function askAboutExercise(msgIdx,index){
  const session=getCurrentSession(),msg=session?.messages[msgIdx];if(!msg)return;
  session.activeStudyMsgIdx=msgIdx;
  if(msg.type==='quiz')quizView(msg).index=index;else msg.activeItem=index;
  state.includeContext=true;state.practiceFocus=false;saveState();renderPracticePane();switchMobileTab('chat');
  const input=document.getElementById('userInput');if(!input.value.trim())input.value=t('askPrompt');autoResize(input);input.focus();
}
