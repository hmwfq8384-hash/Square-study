/* Study Partner — وحدة داخل نظام المربعات. تستخدم auth/db/الثيمات الموجودة. */
(function(){
  if(typeof auth==='undefined'||typeof db==='undefined')return;
  const E=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const R=()=>db.collection('studyRooms'), TS=()=>firebase.firestore.FieldValue.serverTimestamp();
  const FV=firebase.firestore.FieldValue;
  let me={}, root=null, tick=null;
  const S={rooms:[],room:null,tab:'chat',msgs:[],tasks:[],sess:[],reply:null,unsubs:[],unRooms:null};
  const EMO=['👍','❤️','😂','🔥','😮','😢'];
  const $=s=>root&&root.querySelector(s);

  const css=document.createElement('style');
  css.textContent=`
  #spBtn{margin:10px auto 0;display:block;background:var(--bg-panel-2);color:var(--amber-glow);border:1px solid var(--line);border-radius:14px;padding:10px 18px;font:inherit;font-weight:800;cursor:pointer}
  #spRoot{position:fixed;inset:0;z-index:60;background:var(--bg-deep);color:var(--ink);display:flex;flex-direction:column;font-family:inherit;direction:rtl}
  .sp-top{display:flex;align-items:center;gap:8px;padding:12px 14px;border-bottom:1px solid var(--line);background:var(--bg-panel)}
  .sp-top b{flex:1;color:var(--amber-glow);font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .sp-x{background:none;border:0;color:var(--ink);font-size:20px;cursor:pointer;padding:4px 8px}
  .sp-body{flex:1;overflow-y:auto;padding:14px;max-width:720px;width:100%;margin:0 auto}
  .sp-card{background:var(--bg-panel);border:1px solid var(--line);border-radius:14px;padding:12px 14px;margin-bottom:10px}
  .sp-btn{background:linear-gradient(180deg,var(--amber),var(--amber-deep));color:#1b1630;border:0;border-radius:12px;padding:9px 14px;font:inherit;font-weight:800;cursor:pointer}
  .sp-btn.g{background:var(--bg-panel-2);color:var(--ink);border:1px solid var(--line)}
  .sp-btn.r{background:var(--bad-deep);color:#fff}
  .sp-tabs{display:flex;gap:6px;overflow-x:auto;padding:8px 14px;border-bottom:1px solid var(--line)}
  .sp-tabs button{flex:none;background:var(--bg-panel-2);color:var(--ink-dim);border:1px solid var(--line);border-radius:12px;padding:7px 14px;font:inherit;cursor:pointer}
  .sp-tabs button.on{color:#1b1630;background:var(--amber);font-weight:800}
  .sp-bar{height:8px;background:var(--bg-panel-2);border-radius:8px;overflow:hidden;margin-top:6px}
  .sp-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--ok-deep),var(--ok))}
  .sp-msgs{display:flex;flex-direction:column;gap:6px}
  .sp-m{max-width:82%;background:var(--bg-panel);border:1px solid var(--line);border-radius:14px;padding:7px 11px;align-self:flex-start;word-break:break-word}
  .sp-m.me{align-self:flex-end;background:var(--bg-panel-2)}
  .sp-m small{color:var(--ink-dim);font-size:11px}
  .sp-rp{border-inline-start:3px solid var(--amber);padding:2px 8px;margin-bottom:4px;color:var(--ink-dim);font-size:12px}
  .sp-rx span{display:inline-block;background:var(--bg-deep);border:1px solid var(--line);border-radius:10px;padding:0 6px;margin:3px 3px 0 0;font-size:12px}
  .sp-in{display:flex;gap:8px;padding:10px 14px;border-top:1px solid var(--line);background:var(--bg-panel)}
  .sp-in input,.sp-inp{flex:1;background:var(--bg-deep);color:var(--ink);border:1px solid var(--line);border-radius:12px;padding:10px;font:inherit;width:100%}
  .sp-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .sp-sheet{position:fixed;inset:0;background:rgba(10,8,20,.7);z-index:70;display:flex;align-items:flex-end;justify-content:center}
  .sp-sheet>div{background:var(--bg-panel);border-radius:16px 16px 0 0;padding:14px;width:100%;max-width:520px;display:flex;flex-direction:column;gap:8px}
  .sp-pin{background:var(--bg-panel-2);border:1px solid var(--amber-deep);border-radius:10px;padding:6px 10px;margin-bottom:8px;font-size:13px}
  .sp-clock{font-size:34px;font-weight:900;color:var(--amber-glow);text-align:center;font-variant-numeric:tabular-nums}`;
  document.head.appendChild(css);

  function toast(t,k){ try{ showToast(t,k); }catch(e){ alert(t); } }
  const isOwner=()=>S.room&&S.room.ownerId===me.uid;
  const isAdmin=()=>isOwner()||(S.room&&(S.room.admins||[]).includes(me.uid));
  const nm=u=>(S.room&&S.room.memberInfo&&S.room.memberInfo[u]&&S.room.memberInfo[u].name)||'عضو';
  const log=t=>R().doc(S.room.id).collection('activity').add({t,by:me.uid,name:me.name,at:TS()}).catch(()=>{});
  const fmt=ms=>{const s=Math.max(0,Math.floor(ms/1000));return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');};
  const hm=m=>Math.floor(m/60)+'س '+(m%60)+'د';

  function ensureMe(){
    const u=auth.currentUser; if(!u)return Promise.resolve(false);
    if(me.uid===u.uid)return Promise.resolve(true);
    return db.collection('users').doc(u.uid).get().then(d=>{
      const p=d.exists?d.data():{};
      me={uid:u.uid,name:p.name||(u.email||'').split('@')[0]||'مستخدم',avatar:p.avatar||''}; return true;
    });
  }

  // ---------- فتح/إغلاق ----------
  function open(){
    ensureMe().then(ok=>{
      if(!ok)return;
      if(!root){root=document.createElement('div');root.id='spRoot';document.body.appendChild(root);
        root.addEventListener('click',onClick);}
      root.style.display='flex';
      listenRooms(); showList();
      tick=setInterval(updClock,1000);
    });
  }
  function close(){
    if(root)root.style.display='none';
    clearInterval(tick); leaveRoomView(); if(S.unRooms){S.unRooms();S.unRooms=null;}
  }
  function leaveRoomView(){S.unsubs.forEach(f=>f());S.unsubs=[];S.room=null;S.msgs=[];S.tasks=[];S.sess=[];S.reply=null;}
  function listenRooms(){
    if(S.unRooms)return;
    S.unRooms=R().where('members','array-contains',me.uid).onSnapshot(s=>{
      S.rooms=s.docs.map(d=>({id:d.id,...d.data()}));
      if(!S.room&&root&&$('#spList'))renderList();
    },()=>toast('تعذر تحميل الغرف — تأكد من قواعد Firestore','err'));
  }

  // ---------- قائمة الغرف ----------
  function showList(){
    leaveRoomView();
    root.innerHTML=`<div class="sp-top"><button class="sp-x" data-a="close">✕</button><b>Study Partner 🤝</b>
      <button class="sp-btn" data-a="create">＋ غرفة</button><button class="sp-btn g" data-a="join">انضمام</button></div>
      <div class="sp-body" id="spList"></div>`;
    renderList();
  }
  function renderList(){
    const el=$('#spList'); if(!el)return;
    el.innerHTML=S.rooms.length?S.rooms.map(r=>`<div class="sp-card" data-a="open" data-id="${r.id}" style="cursor:pointer">
      <b>${E(r.name)}</b><div style="color:var(--ink-dim);font-size:13px">${E(r.desc||'')}</div>
      <small style="color:var(--ink-dim)">👥 ${(r.members||[]).length}${r.goal&&r.goal.title?' · 🎯 '+E(r.goal.title):''}</small></div>`).join('')
      :'<div class="sp-card" style="text-align:center;color:var(--ink-dim)">لا توجد غرف بعد. أنشئ غرفة أو انضم بكود.</div>';
  }
  function createRoom(){
    const name=(prompt('اسم الغرفة:')||'').trim(); if(!name)return;
    const desc=(prompt('وصف (اختياري):')||'').trim();
    const code=Math.random().toString(36).slice(2,8).toUpperCase();
    R().add({name,desc,code,ownerId:me.uid,admins:[],members:[me.uid],pending:[],requireApproval:true,
      memberInfo:{[me.uid]:{name:me.name,avatar:me.avatar}},goal:null,pinned:null,timer:null,createdAt:TS()})
      .then(()=>toast('تم إنشاء الغرفة ✅')).catch(e=>toast('فشل الإنشاء: '+e.message,'err'));
  }
  function joinByCode(code){
    code=(code||prompt('كود الغرفة:')||'').trim().toUpperCase(); if(!code)return;
    R().where('code','==',code).limit(1).get().then(s=>{
      if(s.empty)return toast('الكود غير صحيح','err');
      const d=s.docs[0],r=d.data();
      if((r.members||[]).includes(me.uid))return toast('أنت عضو بالفعل');
      const info={name:me.name,avatar:me.avatar};
      if(r.requireApproval)
        return d.ref.update({pending:FV.arrayUnion({uid:me.uid,name:me.name})}).then(()=>toast('أُرسل طلب الانضمام لصاحب الغرفة'));
      return d.ref.update({members:FV.arrayUnion(me.uid),['memberInfo.'+me.uid]:info}).then(()=>toast('تم الانضمام ✅'));
    }).catch(e=>toast('تعذر الانضمام: '+e.message,'err'));
  }

  // ---------- الغرفة ----------
  function openRoom(id){
    leaveRoomView(); S.tab='chat';
    const rr=R().doc(id);
    S.unsubs.push(rr.onSnapshot(d=>{
      if(!d.exists||!(d.data().members||[]).includes(me.uid)){toast('الغرفة غير متاحة');return showList();}
      const first=!S.room; S.room={id:d.id,...d.data()};
      if(first)renderRoom(); else {renderHead(); if(S.tab!=='chat')renderTab();}
    }));
    S.unsubs.push(rr.collection('messages').orderBy('createdAt').limitToLast(200).onSnapshot(s=>{
      S.msgs=s.docs.map(d=>({id:d.id,...d.data()})); renderMsgs();}));
    S.unsubs.push(rr.collection('tasks').orderBy('createdAt').onSnapshot(s=>{
      S.tasks=s.docs.map(d=>({id:d.id,...d.data()})); if(S.room){renderHead(); if(S.tab==='tasks')renderTab();}}));
    const since=new Date(Date.now()-31*864e5);
    S.unsubs.push(rr.collection('sessions').where('at','>=',since).onSnapshot(s=>{
      S.sess=s.docs.map(d=>({id:d.id,...d.data()})); if(S.tab==='timer')renderTab();}));
  }
  function renderRoom(){
    root.innerHTML=`<div class="sp-top"><button class="sp-x" data-a="back">→</button><b id="spTitle"></b>
      <button class="sp-x" data-a="close">✕</button></div><div id="spHead" style="padding:10px 14px 0;max-width:720px;margin:0 auto;width:100%"></div>
      <div class="sp-tabs">${[['chat','💬 الدردشة'],['tasks','✅ المهام'],['goal','🎯 الهدف'],['timer','⏱ المؤقت'],['members','👥 الأعضاء'],['activity','📜 النشاط']]
      .map(t=>`<button data-a="tab" data-t="${t[0]}" class="${t[0]===S.tab?'on':''}">${t[1]}</button>`).join('')}</div>
      <div id="spTab" style="flex:1;display:flex;flex-direction:column;min-height:0"></div>`;
    renderHead(); renderTab();
  }
  function progress(){
    const t=S.tasks,d=t.filter(x=>x.status==='done').length;
    return {d,n:t.length,p:t.length?Math.round(d/t.length*100):0};
  }
  function renderHead(){
    const r=S.room,p=progress(); if(!r||!$('#spHead'))return;
    $('#spTitle').textContent=r.name;
    $('#spHead').innerHTML=`<div class="sp-card"><div class="sp-row" style="justify-content:space-between">
      <span>🎯 ${E(r.goal&&r.goal.title||'بدون هدف مشترك')}</span><b>${p.p}%</b></div>
      <div class="sp-bar"><i style="width:${p.p}%"></i></div>
      <small style="color:var(--ink-dim)">✅ ${p.d} / ${p.n} مهام · 👥 ${(r.members||[]).length}${r.timer?' · 🔥 '+E(r.timer.byName)+' يدرس الآن':''}</small></div>`;
  }
  function renderTab(){
    const el=$('#spTab'); if(!el)return;
    root.querySelectorAll('.sp-tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===S.tab));
    const r=S.room, t=S.tab;
    if(t==='chat'){
      el.innerHTML=`<div class="sp-body" id="spScroll" style="width:100%"><div id="spPin"></div><div class="sp-msgs" id="spMsgs"></div></div>
        <div id="spRpl"></div><div class="sp-in"><input id="spTxt" placeholder="اكتب رسالة… (@اسم للإشارة)" maxlength="2000"><button class="sp-btn" data-a="send">إرسال</button></div>`;
      $('#spTxt').addEventListener('keydown',e=>{if(e.key==='Enter')send();});
      renderMsgs(); return;
    }
    let h='';
    if(t==='tasks'){
      h=`<button class="sp-btn" data-a="addTask">＋ مهمة جديدة</button><div style="height:10px"></div>`+
      (S.tasks.map(k=>`<div class="sp-card"><div class="sp-row"><input type="checkbox" data-a="toggleTask" data-id="${k.id}" ${k.status==='done'?'checked':''}>
        <b style="flex:1;${k.status==='done'?'text-decoration:line-through;opacity:.6':''}">${E(k.title)}</b>
        <select data-a="taskStatus" data-id="${k.id}" class="sp-inp" style="flex:none;width:auto">${[['pending','معلّقة'],['progress','قيد التنفيذ'],['done','مكتملة']].map(o=>`<option value="${o[0]}" ${k.status===o[0]?'selected':''}>${o[1]}</option>`).join('')}</select>
        ${(k.by===me.uid||isAdmin())?`<button class="sp-x" data-a="delTask" data-id="${k.id}">🗑</button>`:''}</div>
        <small style="color:var(--ink-dim)">${k.desc?E(k.desc)+' · ':''}من ${E(k.byName)}${k.assignee?' · ⬅ '+E(nm(k.assignee)):''}${k.due?' · 📅 '+E(k.due):''}</small></div>`).join('')||'<div class="sp-card" style="color:var(--ink-dim)">لا مهام.</div>');
    } else if(t==='goal'){
      const p=progress();
      h=`<div class="sp-card"><b>🎯 ${E(r.goal&&r.goal.title||'لا يوجد هدف')}</b>${r.goal&&r.goal.due?`<div style="color:var(--ink-dim)">📅 ${E(r.goal.due)}</div>`:''}
        <div class="sp-bar"><i style="width:${p.p}%"></i></div><div>التقدم ${p.p}% — يُحسب من المهام المكتملة</div></div>
        ${isAdmin()?'<button class="sp-btn" data-a="setGoal">تعديل الهدف</button>':''}`;
    } else if(t==='timer'){
      const tm=r.timer, j=tm&&tm.joined&&tm.joined[me.uid];
      h=`<div class="sp-card">${tm?`<div style="text-align:center">🔥 ${E(tm.byName)} يدرس · ${Object.keys(tm.joined||{}).length} منضم</div><div class="sp-clock" id="spClock">--:--</div>
        <div class="sp-row" style="justify-content:center">${j?'<button class="sp-btn r" data-a="endSess">إنهاء وتسجيل جلستي</button>':'<button class="sp-btn" data-a="joinSess">انضمام للجلسة</button>'}</div>`
        :`<div style="text-align:center;margin-bottom:8px">لا توجد جلسة حالياً</div><div class="sp-row" style="justify-content:center">${[10,25,45,60,90].map(m=>`<button class="sp-btn g" data-a="startSess" data-m="${m}">${m}د</button>`).join('')}<button class="sp-btn g" data-a="startSess" data-m="0">حر</button></div>`}</div>
        ${statsHtml()}`;
    } else if(t==='members'){
      const pend=(r.pending||[]);
      h=`<div class="sp-card">كود الغرفة: <b>${E(r.code)}</b><div class="sp-row" style="margin-top:6px"><button class="sp-btn g" data-a="copyLink">نسخ رابط الدعوة</button>${isOwner()?`<button class="sp-btn g" data-a="toggleApproval">${r.requireApproval?'الموافقة: مفعّلة':'الموافقة: متوقفة'}</button>`:''}</div></div>`+
      (isAdmin()&&pend.length?pend.map(u=>`<div class="sp-card sp-row"><span style="flex:1">${E(u.name)} يريد الانضمام لغرفتك</span><button class="sp-btn" data-a="accept" data-u="${u.uid}">قبول</button><button class="sp-btn g" data-a="reject" data-u="${u.uid}">رفض</button></div>`).join(''):'')+
      (r.members||[]).map(u=>`<div class="sp-card sp-row"><span style="flex:1">${E(nm(u))}${u===r.ownerId?' 👑':(r.admins||[]).includes(u)?' ⭐':''}${u===me.uid?' (أنت)':''}</span>
        ${isOwner()&&u!==me.uid?`<button class="sp-btn g" data-a="toggleAdmin" data-u="${u}">${(r.admins||[]).includes(u)?'إزالة أدمن':'أدمن'}</button><button class="sp-btn r" data-a="kick" data-u="${u}">إزالة</button>`:''}</div>`).join('')+
      `<div class="sp-row" style="margin-top:10px">${isOwner()?'<button class="sp-btn g" data-a="editRoom">تعديل الغرفة</button><button class="sp-btn r" data-a="delRoom">حذف الغرفة</button>':''}<button class="sp-btn g" data-a="leave">مغادرة</button></div>`;
    } else if(t==='activity'){
      h='<div id="spAct"></div>';
    }
    el.innerHTML=`<div class="sp-body" style="width:100%">${h}</div>`;
    if(t==='timer')updClock();
    if(t==='activity')R().doc(r.id).collection('activity').orderBy('at','desc').limit(50).get().then(s=>{
      const a=$('#spAct'); if(a)a.innerHTML=s.docs.map(d=>`<div class="sp-card">${E(d.data().name)}: ${E(d.data().t)}</div>`).join('')||'<div class="sp-card">لا نشاط.</div>';});
  }
  function statsHtml(){
    const now=Date.now(),d0=new Date();d0.setHours(0,0,0,0);
    const w=now-7*864e5,m=now-30*864e5,agg={};
    S.sess.forEach(s=>{const t=s.at&&s.at.toMillis?s.at.toMillis():now;
      const a=agg[s.uid]||(agg[s.uid]={n:s.name,d:0,w:0,m:0});
      if(t>=d0)a.d+=s.minutes; if(t>=w)a.w+=s.minutes; if(t>=m)a.m+=s.minutes;});
    const rows=Object.values(agg),tot=k=>rows.reduce((x,a)=>x+a[k],0);
    return `<div class="sp-card"><b>📊 جلسات الدراسة</b>`+(rows.map(a=>`<div class="sp-row" style="justify-content:space-between"><span>${E(a.n)}</span><small>اليوم ${hm(a.d)} · أسبوع ${hm(a.w)} · شهر ${hm(a.m)}</small></div>`).join('')||'<div style="color:var(--ink-dim)">لا جلسات بعد.</div>')+
      `<hr style="border-color:var(--line)"><b>إجمالي الغرفة:</b> اليوم ${hm(tot('d'))} · أسبوع ${hm(tot('w'))} · شهر ${hm(tot('m'))}</div>`;
  }
  function updClock(){
    const c=$('#spClock'),tm=S.room&&S.room.timer; if(!c||!tm)return;
    const el=Date.now()-tm.startedAt;
    c.textContent=tm.dur?fmt(tm.dur*60000-el):fmt(el);
    if(tm.dur&&el>=tm.dur*60000)c.textContent='انتهى ✅';
  }

  // ---------- الدردشة ----------
  function renderMsgs(){
    const box=$('#spMsgs'); if(!box)return;
    const r=S.room, byId={}; S.msgs.forEach(m=>byId[m.id]=m);
    const pin=r.pinned&&byId[r.pinned]; $('#spPin').innerHTML=pin&&!pin.deleted?`<div class="sp-pin" data-a="jump" data-id="${pin.id}">📌 ${E(pin.text)}</div>`:'';
    const sc=$('#spScroll'),atEnd=!sc||sc.scrollHeight-sc.scrollTop-sc.clientHeight<120;
    box.innerHTML=S.msgs.filter(m=>!(m.hiddenFor||[]).includes(me.uid)).map(m=>{
      const mine=m.uid===me.uid,rp=m.replyTo&&byId[m.replyTo];
      const rx=Object.entries(m.reactions||{}).filter(x=>x[1].length).map(x=>`<span>${x[0]} ${x[1].length}</span>`).join('');
      return `<div class="sp-m ${mine?'me':''}" id="m_${m.id}" data-a="msg" data-id="${m.id}">
        ${mine?'':`<small><b>${E(m.name)}</b></small><br>`}
        ${rp?`<div class="sp-rp" data-a="jump" data-id="${rp.id}">↩ ${E(rp.deleted?'رسالة محذوفة':rp.text.slice(0,60))}</div>`:''}
        ${m.deleted?'<i style="color:var(--ink-dim)">🚫 تم حذف هذه الرسالة</i>':E(m.text).replace(/(@\S+)/g,'<b style="color:var(--amber-glow)">$1</b>')}
        <br><small>${m.createdAt&&m.createdAt.toDate?m.createdAt.toDate().toLocaleTimeString('ar',{hour:'2-digit',minute:'2-digit'}):''}${m.edited&&!m.deleted?' · تم التعديل':''}</small>
        ${rx?`<div class="sp-rx">${rx}</div>`:''}</div>`;}).join('');
    if(atEnd&&sc)sc.scrollTop=sc.scrollHeight;
  }
  function send(){
    const i=$('#spTxt'),text=i.value.trim(); if(!text)return;
    const m={uid:me.uid,name:me.name,text,createdAt:TS(),edited:false,deleted:false,reactions:{},hiddenFor:[]};
    if(S.reply)m.replyTo=S.reply; S.reply=null; $('#spRpl').innerHTML=''; i.value='';
    R().doc(S.room.id).collection('messages').add(m).catch(e=>toast('فشل الإرسال','err'));
  }
  function msgSheet(id){
    const m=S.msgs.find(x=>x.id===id); if(!m)return;
    const mine=m.uid===me.uid, sh=document.createElement('div'); sh.className='sp-sheet';
    sh.innerHTML=`<div><div class="sp-row" style="justify-content:center">${EMO.map(e=>`<button class="sp-x" data-x="react" data-e="${e}">${e}</button>`).join('')}</div>
      <button class="sp-btn g" data-x="reply">↩ رد</button>
      ${mine&&!m.deleted?'<button class="sp-btn g" data-x="edit">✏️ تعديل</button>':''}
      ${isAdmin()&&!m.deleted?'<button class="sp-btn g" data-x="pin">📌 تثبيت</button>':''}
      <button class="sp-btn g" data-x="delMe">حذف عندي فقط</button>
      ${(mine||isAdmin())&&!m.deleted?'<button class="sp-btn r" data-x="delAll">حذف للجميع</button>':''}</div>`;
    sh.addEventListener('click',e=>{
      const x=e.target.closest('[data-x]'); if(x){ msgAct(x.dataset.x,m,x.dataset.e); }
      if(x||e.target===sh)sh.remove(); });
    document.body.appendChild(sh);
  }
  function msgAct(a,m,emo){
    const ref=R().doc(S.room.id).collection('messages').doc(m.id);
    if(a==='react'){const has=((m.reactions||{})[emo]||[]).includes(me.uid);
      ref.update({['reactions.'+emo]:has?FV.arrayRemove(me.uid):FV.arrayUnion(me.uid)});}
    else if(a==='reply'){S.reply=m.id;$('#spRpl').innerHTML=`<div class="sp-pin">↩ ${E(m.text.slice(0,60))} <button class="sp-x" data-a="cancelReply">✕</button></div>`;$('#spTxt').focus();}
    else if(a==='edit'){const t=(prompt('عدّل الرسالة:',m.text)||'').trim(); if(t&&t!==m.text)ref.update({text:t,edited:true});}
    else if(a==='pin')R().doc(S.room.id).update({pinned:m.id}).then(()=>log('ثبّت رسالة'));
    else if(a==='delMe')ref.update({hiddenFor:FV.arrayUnion(me.uid)});
    else if(a==='delAll'&&confirm('حذف الرسالة للجميع؟'))ref.update({deleted:true,text:''});
  }

  // ---------- الأفعال ----------
  function onClick(e){
    const b=e.target.closest('[data-a]'); if(!b)return;
    const a=b.dataset.a,id=b.dataset.id,u=b.dataset.u,rid=S.room&&S.room.id,ref=rid&&R().doc(rid);
    if(a==='msg'){ if(!e.target.closest('[data-a="jump"]'))msgSheet(id); else return; }
    else if(a==='jump'){const el=document.getElementById('m_'+id);if(el){el.scrollIntoView({block:'center',behavior:'smooth'});el.style.outline='2px solid var(--amber)';setTimeout(()=>el.style.outline='',1200);}}
    else if(a==='close')close();
    else if(a==='back')showList();
    else if(a==='create')createRoom();
    else if(a==='join')joinByCode();
    else if(a==='open')openRoom(id);
    else if(a==='tab'){S.tab=b.dataset.t;renderTab();}
    else if(a==='send')send();
    else if(a==='cancelReply'){S.reply=null;$('#spRpl').innerHTML='';}
    else if(a==='addTask'){
      const title=(prompt('عنوان المهمة:')||'').trim(); if(!title)return;
      const desc=(prompt('وصف (اختياري):')||'').trim(), due=(prompt('الموعد النهائي (اختياري) مثل 2026-10-15:')||'').trim();
      const names=(S.room.members||[]).map(x=>nm(x)).join('، ');
      const who=(prompt('إسناد لمن؟ اكتب الاسم أو اتركه فارغاً.\n'+names)||'').trim();
      const assignee=(S.room.members||[]).find(x=>who&&nm(x)===who)||null;
      ref.collection('tasks').add({title,desc,due,assignee,by:me.uid,byName:me.name,status:'pending',createdAt:TS()}).then(()=>log('أنشأ مهمة «'+title+'»'));
    }
    else if(a==='toggleTask'){const k=S.tasks.find(x=>x.id===id);ref.collection('tasks').doc(id).update({status:b.checked?'done':'pending'}).then(()=>{if(b.checked)log('أكمل «'+k.title+'»');});}
    else if(a==='delTask'&&confirm('حذف المهمة؟'))ref.collection('tasks').doc(id).delete();
    else if(a==='setGoal'){const title=(prompt('الهدف المشترك:',S.room.goal&&S.room.goal.title||'')||'').trim();
      if(title){const due=(prompt('الموعد (اختياري):',S.room.goal&&S.room.goal.due||'')||'').trim();ref.update({goal:{title,due}}).then(()=>log('غيّر الهدف المشترك'));}}
    else if(a==='startSess'){const m=+b.dataset.m;ref.update({timer:{by:me.uid,byName:me.name,startedAt:Date.now(),dur:m,joined:{[me.uid]:Date.now()}}}).then(()=>log('بدأ جلسة دراسة'));}
    else if(a==='joinSess'){ref.update({['timer.joined.'+me.uid]:Date.now()}).then(()=>log('انضم لجلسة الدراسة'));}
    else if(a==='endSess'){
      const tm=S.room.timer,mins=Math.round((Date.now()-tm.joined[me.uid])/60000);
      const left=Object.keys(tm.joined).filter(x=>x!==me.uid);
      const up=left.length?{['timer.joined.'+me.uid]:FV.delete()}:{timer:null};
      if(mins>=1)ref.collection('sessions').add({uid:me.uid,name:me.name,minutes:mins,at:TS()});
      ref.update(up).then(()=>toast('تم تسجيل '+mins+' دقيقة'));
    }
    else if(a==='copyLink'){const l=location.origin+location.pathname+'?room='+S.room.code;(navigator.clipboard?navigator.clipboard.writeText(l):Promise.reject()).then(()=>toast('نُسخ الرابط')).catch(()=>prompt('الرابط:',l));}
    else if(a==='toggleApproval')ref.update({requireApproval:!S.room.requireApproval});
    else if(a==='accept'){const p=S.room.pending.find(x=>x.uid===u);ref.update({members:FV.arrayUnion(u),pending:FV.arrayRemove(p),['memberInfo.'+u]:{name:p.name,avatar:''}}).then(()=>log('قُبل '+p.name));}
    else if(a==='reject'){ref.update({pending:FV.arrayRemove(S.room.pending.find(x=>x.uid===u))});}
    else if(a==='toggleAdmin')ref.update({admins:(S.room.admins||[]).includes(u)?FV.arrayRemove(u):FV.arrayUnion(u)});
    else if(a==='kick'&&confirm('إزالة العضو؟'))ref.update({members:FV.arrayRemove(u),admins:FV.arrayRemove(u)});
    else if(a==='taskStatus'&&e.type==='change')ref.collection('tasks').doc(id).update({status:b.value});
    else if(a==='editRoom'){const name=(prompt('اسم الغرفة:',S.room.name)||'').trim();if(name){const desc=(prompt('الوصف:',S.room.desc||'')||'').trim();ref.update({name,desc});}}
    else if(a==='leave')leaveRoom();
    else if(a==='delRoom')delRoom();
  }
  document.addEventListener('change',e=>{ if(root&&root.contains(e.target)&&e.target.dataset.a==='taskStatus')onClick(e); });

  function leaveRoom(){
    const r=S.room,others=(r.members||[]).filter(x=>x!==me.uid),ref=R().doc(r.id);
    if(isOwner()){
      if(!others.length)return delRoom();
      if(confirm('أنت المالك. موافق = نقل الملكية إلى '+nm(others[0])+' ثم المغادرة. إلغاء = البقاء (أو احذف الغرفة).'))
        ref.update({ownerId:others[0],members:FV.arrayRemove(me.uid),admins:FV.arrayRemove(me.uid)}).then(showList);
      return;
    }
    if(confirm('مغادرة الغرفة؟'))ref.update({members:FV.arrayRemove(me.uid),admins:FV.arrayRemove(me.uid)}).then(showList);
  }
  async function delRoom(){
    if(!confirm('هل أنت متأكد أنك تريد حذف هذه الغرفة نهائياً؟'))return;
    const ref=R().doc(S.room.id);
    for(const c of ['messages','tasks','sessions','activity']){
      const s=await ref.collection(c).get(); let b=db.batch(),n=0;
      for(const d of s.docs){b.delete(d.ref);if(++n===400){await b.commit();b=db.batch();n=0;}}
      if(n)await b.commit();
    }
    await ref.delete(); toast('حُذفت الغرفة'); showList();
  }

  // ---------- زر الدخول من القائمة (☰) بعد «أهدافي» ----------
  function addBtn(){
    const old=document.getElementById('spBtn'); if(old)old.remove();
    const b=document.getElementById('tabStudyPartnerBtn');
    if(!b||b.dataset.spBound)return;
    b.dataset.spBound='1';
    b.addEventListener('click',open);
  }
  addBtn();
  auth.onAuthStateChanged(u=>{
    if(!u){ if(root)close(); return; }
    addBtn();
    const c=new URLSearchParams(location.search).get('room');
    if(c){ history.replaceState(null,'',location.pathname); ensureMe().then(()=>joinByCode(c)); }
  });
})();
