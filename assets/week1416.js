// Weeks 14–16 labs: sentiment (NTUSD / SnowNLP), qual–quant theme explorer, chart makeover and dashboard.
// All numbers are recomputed in the browser from weekNN-data.js; check_week1416.cjs compares them with
// assets/data/week1416-statistics.json written by build_week1416_data.py.
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const fmt=(n,d=0)=>Number(n).toLocaleString('zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct=(p,d=1)=>Number.isFinite(p)?fmt(100*p,d)+'%':'—';
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const table=(label,headers,rows,cls='')=>`<div class="table-wrap" tabindex="0" role="region" aria-label="${label}"><table class="${cls}"><thead><tr>`+headers.map(h=>`<th scope="col">${h}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>`<td>${v}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>';
  const stat=(label,value,detail)=>`<div class="stat"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong><span class="stat-detail">${detail}</span></div>`;
  const TONE=['負向','中立','正向'],TCLS=['t-neg','t-mid','t-pos'],CHIP=['neg','mid','pos'];
  const toneChip=l=>`<span class="chip ${CHIP[l]}">${TONE[l]}</span>`;

  /* ---------- tooltip (value first, label second; textContent only) ---------- */
  let tipEl=null;
  const tipA=(v,l='')=>` data-tip="${esc(v)}|${esc(l)}"`;
  function bindTips(svg){
    if(!svg||svg.dataset.tips)return;svg.dataset.tips='1';
    if(!tipEl){tipEl=document.createElement('div');tipEl.className='viz-tip';tipEl.setAttribute('aria-hidden','true');document.body.append(tipEl);}
    const show=(t,x,y)=>{const i=t.indexOf('|'),s=document.createElement('strong');s.textContent=t.slice(0,i);const sp=document.createElement('span');sp.textContent=t.slice(i+1);tipEl.replaceChildren(s,sp);tipEl.classList.add('on');const r=tipEl.getBoundingClientRect();tipEl.style.left=Math.max(8,Math.min(innerWidth-r.width-8,x+14))+'px';tipEl.style.top=Math.max(8,y-r.height-12)+'px';};
    const hide=()=>tipEl.classList.remove('on');
    svg.addEventListener('pointermove',e=>{const m=e.target.closest('[data-tip]');m?show(m.dataset.tip,e.clientX,e.clientY):hide();});
    svg.addEventListener('pointerleave',hide);
    svg.addEventListener('focusin',e=>{const m=e.target.closest('[data-tip]');if(m){const r=m.getBoundingClientRect();show(m.dataset.tip,r.right,r.top);}});
    svg.addEventListener('focusout',hide);
  }
  const put=(id,svg,vb)=>{const el=$(id);if(!el)return;if(vb)el.setAttribute('viewBox',vb);el.innerHTML=svg;bindTips(el);};

  /* 100% stacked bars, one row per group: rows=[{label,c:[neg,mid,pos]}] */
  function stack(id,rows,title){
    const W=660,L=118,R=64,BH=24,G=10,T=6,H=T+rows.length*(BH+G)+20,span=W-L-R;
    let s=`<title>${esc(title)}</title><desc>${rows.map(r=>`${r.label}：`+r.c.map((v,k)=>`${TONE[k]} ${v}`).join('、')).join('；')}</desc>`;
    [0,.5,1].forEach(f=>{s+=`<line class="grid" x1="${L+f*span}" x2="${L+f*span}" y1="${T-2}" y2="${H-18}"/><text x="${L+f*span}" y="${H-4}" text-anchor="middle">${f*100}%</text>`;});
    rows.forEach((r,i)=>{
      const n=r.c[0]+r.c[1]+r.c[2],y=T+i*(BH+G);let x=L;
      s+=`<text class="${r.bold?'strong':'lbl'}" x="${L-8}" y="${y+BH/2+4}" text-anchor="end">${esc(r.label)}</text>`;
      r.c.forEach((v,k)=>{const w=n?span*v/n:0;if(w<=0)return;
        s+=`<rect class="seg ${TCLS[k]} hit" x="${x.toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="${BH}" rx="3" tabindex="0"${tipA(pct(v/n),`${r.label}｜${TONE[k]} ${fmt(v)} 件`)}/>`;
        if(w>36)s+=`<text class="${k===1?'on-mid':'on-dark'}" x="${(x+w/2).toFixed(1)}" y="${y+BH/2+4}" text-anchor="middle" pointer-events="none">${fmt(100*v/n,0)}%</text>`;x+=w;});
      s+=`<text x="${W-R+6}" y="${y+BH/2+4}">${fmt(n)} 件</text>`;
    });
    put(id,s,`0 0 ${W} ${H}`);
  }

  /* ================= Week 14：情緒分析 ================= */
  const D14=window.WEEK14_DATA;
  function labels14(){
    const ex=new Set();if($('s-moto').checked)ex.add('機車');
    $('s-custom').value.split(/[,，、\s]+/).filter(Boolean).forEach(w=>ex.add(w.trim()));
    const wp=D14.words.map(([w,p])=>ex.has(w)?0:p),n=D14.hits.length,nt=new Int8Array(n),sn=new Int8Array(n),nohit=new Uint8Array(n);
    const band=$('s-band').value,[lo,hi]=band.split('-').map(Number),SL=D14.snowLab[band];  // labels precomputed from unrounded scores
    for(let i=0;i<n;i++){let s=0,h=0;for(const k of D14.hits[i]){s+=wp[k];h+=wp[k]!==0;}nt[i]=s>0?2:s<0?0:1;nohit[i]=h===0;sn[i]=SL.charCodeAt(i)-48;}
    return {ex,wp,nt,sn,nohit,lo,hi};
  }
  function update14(){
    const L=labels14(),method=$('s-method').value,group=$('s-group').value,lab=method==='ntusd'?L.nt:L.sn,n=lab.length;
    $('s-moto').disabled=$('s-custom').disabled=method!=='ntusd';$('s-band').disabled=method!=='snow';
    const all=[0,0,0];lab.forEach(v=>all[v]++);
    const names=group==='year'?D14.years.map(String):D14.topics,key=group==='year'?D14.year:D14.topic,cnt=names.map(()=>[0,0,0]);
    for(let i=0;i<n;i++)cnt[key.charCodeAt(i)-48][lab[i]]++;
    const rows=[{label:'全部',c:all,bold:true},...names.map((l,g)=>({label:group==='year'?l+' 年':l,c:cnt[g]}))];
    stack('s-chart',rows,`${method==='ntusd'?'NTUSD 詞典':'SnowNLP 模型'}判斷的標題語氣，依${group==='year'?'年度':'主題'}比較`);
    const nohit=L.nohit.reduce((a,b)=>a+b,0);
    $('s-stats').innerHTML=stat('正向',pct(all[2]/n),`${fmt(all[2])} 件標題`)+stat('中立',pct(all[1]/n),method==='ntusd'?`其中 ${fmt(nohit)} 件一個情緒詞都沒有`:`分數介於 ${L.lo/100}～${L.hi/100}`)+stat('負向',pct(all[0]/n),`${fmt(all[0])} 件標題`);
    const share=rows.slice(1).map(r=>({l:r.label,neg:r.c[0]/(r.c[0]+r.c[1]+r.c[2])})).sort((a,b)=>b.neg-a.neg);
    $('s-desc').textContent=(method==='ntusd'?`NTUSD 的做法：把標題切成詞，正面詞 +1、負面詞 −1，加總大於 0 算正向、小於 0 算負向、等於 0 算中立。${L.ex.size?`已排除：${[...L.ex].join('、')}。`:''}`:`SnowNLP 的做法：模型直接給 0～1 的分數，越接近 1 越正面；本頁把 ≥${L.hi/100} 算正向、≤${L.lo/100} 算負向。`)+` 負向比例最高的是「${share[0].l}」（${pct(share[0].neg)}），最低的是「${share[share.length-1].l}」（${pct(share[share.length-1].neg)}）。這是工具的推論，不是提案人真正的心情，更不是民意。`;
    const ag=[[0,0,0],[0,0,0],[0,0,0]];let same=0;for(let i=0;i<n;i++){ag[L.nt[i]][L.sn[i]]++;same+=L.nt[i]===L.sn[i];}
    $('s-agree').innerHTML=table('NTUSD 與 SnowNLP 判斷對照',['NTUSD ↓ ／ SnowNLP →',...TONE.map(toneChip),'合計'],[0,1,2].map(a=>[toneChip(a),...[0,1,2].map(b=>`<span class="vb-inline" style="--v:${(100*ag[a][b]/n*3).toFixed(1)}">${fmt(ag[a][b])}</span>`),fmt(ag[a][0]+ag[a][1]+ag[a][2])]))+`<p class="fine">兩個工具判斷相同的只有 <strong>${pct(same/n)}</strong>（${fmt(same)} / ${fmt(n)} 件）。對角線以外的格子，就是兩個工具「意見不合」的提案。</p>`;
    const wc=new Map();D14.hits.forEach(h=>h.forEach(k=>{if(L.wp[k])wc.set(k,(wc.get(k)||0)+1);}));
    const top=p=>[...wc].filter(([k])=>L.wp[k]===p).sort((a,b)=>b[1]-a[1]||a[0]-b[0]).slice(0,10);
    const tp=top(1),tn=top(-1);
    $('s-words').innerHTML=table('最常被算分的詞',['名次','正面詞','次數','負面詞','次數'],tp.map((r,i)=>[i+1,`<span class="tok p">${esc(D14.words[r[0]][0])}</span>`,fmt(r[1]),tn[i]?`<span class="tok n">${esc(D14.words[tn[i][0]][0])}</span>`:'',tn[i]?fmt(tn[i][1]):'']));
    window.week14={method,group,all,rows:rows.map(r=>[r.label,...r.c]),agree:ag,same,excluded:[...L.ex],band:[L.lo,L.hi]};
  }
  const toneOf=s=>s>0?2:s<0?0:1,snowTone=v=>v>=.6?2:v<=.4?0:1;
  function detective(){
    const box=$('detective');let mine={};
    box.innerHTML='<div class="det-grid">'+D14.examples.map((e,i)=>`<article class="det-card" data-i="${i}"><p class="src">${esc(e.src)}</p><p class="txt">${esc(e.text)}</p><div class="toks" aria-label="斷詞結果">${e.tokens.filter(([w])=>w.trim()&&!/^[，。、！？；：,.!?;:「」『』（）()\-—…~～/／\s]+$/.test(w)).map(([w,p])=>`<span class="tok${p>0?' p':p<0?' n':''}">${esc(w)}</span>`).join('')}</div><div class="tools"><div>NTUSD 分數<strong>${e.nt>0?'+':''}${e.nt} → ${TONE[toneOf(e.nt)]}</strong></div><div>SnowNLP 分數<strong>${e.snow.toFixed(2)} → ${TONE[snowTone(e.snow)]}</strong></div></div><p class="fine" style="margin:0">你覺得這句是？</p><div class="det-choices">${[2,1,0].map(l=>`<button type="button" class="btn-lite" data-l="${l}" aria-pressed="false">${TONE[l]}</button>`).join('')}</div><div class="det-reveal" hidden aria-live="polite"><span class="chip warn">${esc(e.kind)}</span> 老師的判讀：<strong>${esc(e.teacher)}</strong>。${esc(e.note)}</div></article>`).join('')+'</div>';
    const tally=()=>{const k=Object.keys(mine),T=['負向','中立','正向'];let a=0,b=0,c=0;k.forEach(i=>{const e=D14.examples[i],m=mine[i];a+=m===toneOf(e.nt);b+=m===snowTone(e.snow);c+=T[m]===e.teacher;});
      $('det-score').textContent=k.length?`你判了 ${k.length} / ${D14.examples.length} 句：和 NTUSD 相同 ${a} 句、和 SnowNLP 相同 ${b} 句、和老師的判讀相同 ${c} 句。人和人之間也可能不同，重點是寫出理由。`:'點選每張卡片的「正向／中立／負向」，寫下你的判讀，再看老師的說明。';
      window.week14det={done:k.length,ntusd:a,snow:b,teacher:c};};
    box.addEventListener('click',ev=>{const b=ev.target.closest('.det-choices button');if(!b)return;const card=b.closest('.det-card'),i=card.dataset.i;card.querySelectorAll('.det-choices button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));mine[i]=Number(b.dataset.l);card.querySelector('.det-reveal').hidden=false;tally();});
    $('reset-det').addEventListener('click',()=>{mine={};box.querySelectorAll('.det-choices button').forEach(x=>x.setAttribute('aria-pressed','false'));box.querySelectorAll('.det-reveal').forEach(x=>x.hidden=true);tally();});
    tally();
  }
  if(D14&&$('s-method')){
    ['s-method','s-group','s-moto','s-band'].forEach(id=>$(id).addEventListener('change',update14));$('s-custom').addEventListener('input',update14);
    $('reset-s').addEventListener('click',()=>{$('s-method').value='ntusd';$('s-group').value='year';$('s-moto').checked=false;$('s-custom').value='';$('s-band').value='40-60';update14();});
    update14();detective();
  }

  /* ================= Week 15：質性與量化整合 ================= */
  const D15=window.WEEK15_DATA;
  const quote=(r,extreme)=>`<article class="quote-card${extreme?' extreme':''}"><h4>${esc(r[2])}</h4><blockquote>${esc(r[3])}</blockquote><p class="meta">${r[1]} 年｜${r[7]?`附議 <strong>${fmt(r[4])}</strong> 人`:'<span class="chip warn">未進入附議階段</span>'}｜關注 ${fmt(r[5])}｜留言 ${fmt(r[6])}｜標題語氣（NTUSD）${toneChip(r[8])}｜第 ${r[0]} 筆｜<a href="${esc(r[9])}" target="_blank" rel="noopener">看原文 ↗</a></p></article>`;
  let draw15=0;
  function update15(){
    const t=Number($('q-topic').value),T=D15.topics[t],W=D15.words[t],mode=$('q-mode').value;
    $('q-stats').innerHTML=stat('提案件數',fmt(T.n),`占全部 ${pct(T.n/12842)}`)+stat('至少 1 人附議',pct(T.sig1/T.n),`${fmt(T.sig1)} / ${fmt(T.n)} 件`)+stat('達 5,000 人門檻',pct(T.pass/T.stage,2),`${fmt(T.pass)} / ${fmt(T.stage)} 件（進入附議者）`);
    stack('q-tone',[{label:'標題語氣',c:T.tone}],`${T.name}的標題語氣（NTUSD）`);
    $('q-words').innerHTML=`<p class="fine">標題常見詞（出現在幾件提案）</p><div class="word-chips">${W.title.map(([w,n])=>`<span class="chip">${esc(w)}<small>${fmt(n)}</small></span>`).join('')}</div><p class="fine">「利益與影響」常見詞：提案人怎麼說好處</p><div class="word-chips">${W.impact.map(([w,n])=>`<span class="chip">${esc(w)}<small>${fmt(n)}</small></span>`).join('')}</div>`;
    const B=D15.bins,W2=660,L=110,R=96,BH=22,G=8,H=B.length*(BH+G)+6,max=Math.max(...T.bins);let s=`<title>${esc(T.name)}的附議人數分布</title><desc>${B.map((b,i)=>b+' '+T.bins[i]+' 件').join('；')}</desc>`;
    B.forEach((b,i)=>{const y=4+i*(BH+G),w=(W2-L-R)*T.bins[i]/max;s+=`<text class="lbl" x="${L-8}" y="${y+BH/2+4}" text-anchor="end">${b}</text><rect class="${i===6?'b2':i===0?'bsoft':'b1'} hit" x="${L}" y="${y}" width="${Math.max(1,w).toFixed(1)}" height="${BH}" rx="4" tabindex="0"${tipA(fmt(T.bins[i])+' 件',`${b}｜占 ${pct(T.bins[i]/T.n)}`)}/><text x="${L+w+6}" y="${y+BH/2+4}">${fmt(T.bins[i])} 件（${pct(T.bins[i]/T.n,0)}）</text>`;});
    put('q-bins',s,`0 0 ${W2} ${H}`);
    let list,note;
    if(mode==='typical'){const ty=D15.typical[t],k=draw15%Math.max(1,Math.ceil(ty.length/3));list=ty.slice(k*3,k*3+3);note=`「中段」規則：進入附議、至少 1 人附議的提案中，附議數在這個主題的中間一半（${fmt(T.typLo)}～${fmt(T.typHi)} 人），且不是重複提案。按「換一批」看其他候選。`;}
    else if(mode==='random'){const sm=D15.samples[t],k=draw15%10;list=sm.slice(k*3,k*3+3);note='從這個主題隨機抽出的提案（已排除完全重複者）。隨機抽樣最接近「一般提案長什麼樣」，但不一定剛好有代表性。';}
    else{list=D15.extreme[t];note='附議人數最多的 3 件：它們很顯眼，但不能代表這個主題的一般提案。寫報告時要標明「極端案例」。';}
    $('q-quotes').innerHTML=`<p class="fine">${note}</p><div class="quote-list">${list.map(r=>quote(r,mode==='extreme')).join('')}</div>`;
    $('q-draw').disabled=mode==='extreme';
    $('q-desc').textContent=`「${T.name}」共有 ${fmt(T.n)} 件提案（主題由標題關鍵詞歸類），${pct(T.sig1/T.n,0)} 至少有 1 人附議；進入附議的 ${fmt(T.stage)} 件中，只有 ${fmt(T.pass)} 件達到 5,000 人（${pct(T.pass/T.stage,2)}）。附議數中位數 ${fmt(T.median)} 人、平均 ${fmt(T.mean,1)} 人：平均被少數超高附議的提案拉高，所以描述「一般提案」要用中位數。`;
    window.week15={topic:T.name,n:T.n,sig1:T.sig1,stage:T.stage,pass:T.pass,quotes:list.map(r=>r[0]),mode};
  }
  function joint15(){
    const by=$('q-sort').value,T=D15.topics.map((x,i)=>({...x,i,r1:x.sig1/x.n,rp:x.pass/x.stage,neg:x.tone[0]/x.n}));
    const key={n:x=>x.n,r1:x=>x.r1,rp:x=>x.rp,neg:x=>x.neg}[by];T.sort((a,b)=>key(b)-key(a));
    const mx={n:Math.max(...T.map(x=>x.n)),r1:1,rp:Math.max(...T.map(x=>x.rp)),neg:1};
    $('q-joint').innerHTML=`<div class="table-wrap" tabindex="0" role="region" aria-label="各主題質量對照表"><table class="vtable"><thead><tr><th scope="col">主題</th><th scope="col">提案件數</th><th scope="col">至少 1 人附議</th><th scope="col">達 5,000 門檻</th><th scope="col">負向標題（NTUSD）</th><th scope="col">標題常見詞</th></tr></thead><tbody>`+T.map(x=>`<tr${x.i===9?' class="muted-row"':''}><td>${esc(x.name)}</td><td class="vb" style="--v:${(100*x.n/mx.n).toFixed(1)}">${fmt(x.n)}</td><td class="vb" style="--v:${(100*x.r1).toFixed(1)}">${pct(x.r1,0)}</td><td class="vb acc" style="--v:${(100*x.rp/mx.rp).toFixed(1)}">${pct(x.rp,1)}（${x.pass}）</td><td class="vb acc" style="--v:${(100*x.neg).toFixed(1)}">${pct(x.neg,0)}</td><td>${D15.words[x.i].title.slice(0,4).map(([w])=>esc(w)).join('、')}</td></tr>`).join('')+'</tbody></table></div>';
    window.week15joint=T.map(x=>x.name);
  }
  if(D15&&$('q-topic')){
    $('q-topic').addEventListener('change',()=>{draw15=0;update15();});$('q-mode').addEventListener('change',()=>{draw15=0;update15();});
    $('q-draw').addEventListener('click',()=>{draw15++;update15();});$('q-sort').addEventListener('change',joint15);
    $('reset-q').addEventListener('click',()=>{$('q-topic').value='1';$('q-mode').value='typical';$('q-sort').value='n';draw15=0;update15();joint15();});
    update15();joint15();
  }

  /* ================= Week 16：圖表改造與互動看板 ================= */
  const D16=window.WEEK16_DATA;
  const FIX=[['mk-axis','座標從 0 開始','座標從 300 開始，少的主題看起來幾乎是 0'],['mk-flat','拿掉 3D 與陰影','3D 和陰影讓人看不準長條的高度'],['mk-color','只用一種顏色，強調一個重點','九種顏色沒有意義，還需要圖例對照'],['mk-sort','由多到少排序','順序亂，很難一眼看出誰多誰少'],['mk-label','直接標上數字和單位','沒有數字和單位，只能猜'],['mk-title','標題說出重點，註明來源','標題「提案分析」沒有說重點，也沒有來源']];
  function makeover(){
    const on=Object.fromEntries(FIX.map(([id])=>[id,$(id).checked])),cnt=D16.topics.slice(0,9).map((name,t)=>({name,n:D16.cube.reduce((a,c)=>a+(c[2]===t?c[4]:0),0)}));
    const rows=on['mk-sort']?[...cnt].sort((a,b)=>b.n-a.n):cnt,W=660,H=380,L=56,R=16,T=on['mk-title']?58:40,B=46,base=on['mk-axis']?0:300,max=2500,ph=H-T-B,bw=(W-L-R)/rows.length;
    const y=v=>T+ph*(1-(Math.max(v,base)-base)/(max-base));let s=`<title>${on['mk-title']?'各主題提案件數':'提案分析'}</title><desc>${rows.map(r=>r.name+' '+r.n+' 件').join('；')}</desc>`;
    s+=on['mk-title']?`<text class="strong" x="${L}" y="20" style="font-size:15px">「交通與行人」提案最多：2020–2024 年共 ${fmt(Math.max(...cnt.map(r=>r.n)))} 件</text><text x="${L}" y="38">各主題提案件數（件）｜資料：國發會「提點子」；主題為關鍵詞規則分類，未列「其他」4,178 件</text>`:`<text class="strong" x="${W/2}" y="22" text-anchor="middle" style="font-size:15px">提案分析</text>`;
    const ticks=on['mk-axis']?[0,500,1000,1500,2000,2500]:[300,800,1300,1800,2300];
    ticks.forEach(v=>{s+=`<line class="grid" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end">${fmt(v)}${on['mk-label']&&v===ticks[ticks.length-1]?' 件':''}</text>`;});
    const hi=rows.reduce((a,b)=>b.n>a.n?b:a);
    rows.forEach((r,i)=>{const x=L+i*bw+bw*.18,w=bw*.64,top=y(r.n),h=T+ph-top,cls=on['mk-color']?(r===hi?'b2':'b1'):'r'+cnt.indexOf(r);
      if(!on['mk-flat']){s+=`<polygon class="mk-shadow" points="${x+w},${top} ${x+w+9},${top-7} ${x+w+9},${T+ph-7} ${x+w},${T+ph}"/><polygon class="${cls}" style="opacity:.7" points="${x},${top} ${x+9},${top-7} ${x+w+9},${top-7} ${x+w},${top}"/>`;}
      s+=`<rect class="${cls} hit" x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${w.toFixed(1)}" height="${Math.max(0,h).toFixed(1)}" rx="${on['mk-flat']?3:0}" tabindex="0"${tipA(fmt(r.n)+' 件',r.name)}/>`;
      if(on['mk-label'])s+=`<text class="lbl" x="${(x+w/2).toFixed(1)}" y="${(top-6).toFixed(1)}" text-anchor="middle">${fmt(r.n)}</text>`;
      s+=`<text x="${(x+w/2).toFixed(1)}" y="${H-B+18}" text-anchor="middle" style="font-size:10.5px">${esc(r.name)}</text>`;});
    s+=`<line class="axis" x1="${L}" x2="${W-R}" y1="${T+ph}" y2="${T+ph}"/>`;
    if(!on['mk-color'])s+=`<g>${cnt.slice(0,9).map((r,i)=>`<rect class="r${i}" x="${W-R-118}" y="${T+4+i*13}" width="9" height="9"/><text x="${W-R-104}" y="${T+12+i*13}" style="font-size:9.5px">${esc(r.name)}</text>`).join('')}</g>`;
    put('mk-chart',s,`0 0 ${W} ${H}`);
    const left=FIX.filter(([id])=>!on[id]);
    $('mk-score').innerHTML=`<strong>已修正 ${FIX.length-left.length} / ${FIX.length} 項。</strong>`+(left.length?' 還有這些問題：'+left.map(([,,bad])=>`<span class="bad-badge">${bad}</span>`).join(' '):' 這張圖現在誠實又好讀了。比較一下：最少的「家庭與生育」（322 件）在原圖幾乎看不到。');
    window.week16mk={fixed:FIX.length-left.length,order:rows.map(r=>r.name)};
  }
  const F={year:-1,topic:-1,tone:-1};
  const match=(c,skip)=>(skip==='year'||F.year<0||c[0]===F.year)&&(skip==='topic'||F.topic<0||c[2]===F.topic)&&(skip==='tone'||F.tone<0||c[3]===F.tone);
  const sum=(cells,k)=>cells.reduce((a,c)=>a+c[k],0);
  function dash(){
    const C=D16.cube,sel=C.filter(c=>match(c)),n=sum(sel,4),sig1=sum(sel,5),stage=sum(sel,6),pass=sum(sel,7);
    const yl=F.year<0?'2020–2024':D16.years[F.year]+' 年',tl=F.topic<0?'全部主題':D16.topics[F.topic],nl=F.tone<0?'':`、標題${TONE[F.tone]}`;
    $('d-kpis').innerHTML=stat('提案件數',fmt(n),`${yl}｜${tl}${nl}`)+stat('至少 1 人附議',pct(sig1/n),`${fmt(sig1)} / ${fmt(n)} 件提案`)+stat('達 5,000 人附議門檻',`${fmt(pass)} 件`,`占進入附議的 ${fmt(stage)} 件：${pct(pass/stage,2)}`);
    // trend: 60 months, ignores the year filter so the selected year is shown in context
    const months=Array.from({length:60},(_,i)=>({i,n:0,p:0}));C.filter(c=>match(c,'year')).forEach(c=>{const m=months[c[0]*12+c[1]];m.n+=c[4];m.p+=c[7];});
    const W=660,H=250,L=44,R=12,T=14,B=34,mx=Math.max(10,...months.map(m=>m.n)),x=i=>L+(W-L-R)*i/59,y=v=>T+(H-T-B)*(1-v/mx);
    let s=`<title>每月提案件數</title><desc>${tl}${nl}，2020 年 1 月到 2024 年 12 月每月件數；最多 ${fmt(mx)} 件。</desc>`;
    if(F.year>=0)s+=`<rect class="band" x="${x(F.year*12)-4}" y="${T}" width="${x(F.year*12+11)-x(F.year*12)+8}" height="${H-T-B}"/>`;
    [0,.5,1].forEach(f=>{const v=Math.round(mx*f);s+=`<line class="grid" x1="${L}" x2="${W-R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end">${fmt(v)}</text>`;});
    D16.years.forEach((yr,k)=>{s+=`<text x="${x(k*12+5.5)}" y="${H-12}" text-anchor="middle">${yr}</text>`;if(k)s+=`<line class="grid" x1="${x(k*12)-3}" x2="${x(k*12)-3}" y1="${T}" y2="${H-B}"/>`;});
    const gap=new Set();const tot=new Array(60).fill(0);C.forEach(c=>{tot[c[0]*12+c[1]]+=c[4];});tot.forEach((v,i)=>{if(!v)gap.add(i);});
    let seg=[];const segs=[];months.forEach(m=>{if(gap.has(m.i)){if(seg.length)segs.push(seg);seg=[];}else seg.push(m);});if(seg.length)segs.push(seg);
    segs.forEach(g=>{s+=`<polyline class="ln" points="${g.map(m=>`${x(m.i).toFixed(1)},${y(m.n).toFixed(1)}`).join(' ')}"/>`;});
    gap.forEach(i=>{s+=`<text x="${x(i)}" y="${H-B-6}" text-anchor="middle" style="font-size:10px">無資料</text>`;});
    months.forEach(m=>{const yy=Math.floor(m.i/12),mm=m.i%12+1;s+=`<rect class="hit-area" x="${(x(m.i)-5).toFixed(1)}" y="${T}" width="10" height="${H-T-B}"${tipA(gap.has(m.i)?'無資料':fmt(m.n)+' 件',`${D16.years[yy]} 年 ${mm} 月${gap.has(m.i)?'｜原始資料這個月沒有任何提案紀錄':m.p?`｜其中 ${m.p} 件達門檻`:''}`)}/>`;});
    const peak=months.reduce((a,b)=>b.n>a.n?b:a);s+=`<circle class="c1" cx="${x(peak.i)}" cy="${y(peak.n)}" r="4.5" style="fill:var(--s1);stroke:var(--surface);stroke-width:2"/><text class="lbl" x="${Math.min(W-90,x(peak.i)+8)}" y="${y(peak.n)+4}">最高 ${D16.years[Math.floor(peak.i/12)]}/${peak.i%12+1}：${fmt(peak.n)} 件</text>`;
    put('d-trend',s,`0 0 ${W} ${H}`);
    // topic bars: ignores the topic filter; click a bar to filter
    const tp=D16.topics.map((name,t)=>{const cs=C.filter(c=>c[2]===t&&match(c,'topic'));return {t,name,n:sum(cs,4),p:sum(cs,7)};}).sort((a,b)=>b.n-a.n);
    const W2=660,L2=92,R2=120,BH=20,G=7,H2=tp.length*(BH+G)+4,m2=Math.max(1,...tp.map(r=>r.n));let s2=`<title>各主題提案件數</title><desc>${tp.map(r=>r.name+' '+r.n).join('；')}</desc>`;
    tp.forEach((r,i)=>{const yy=2+i*(BH+G),w=(W2-L2-R2)*r.n/m2,cls=F.topic<0?'b1':F.topic===r.t?'bsel':'bsoft';
      s2+=`<g class="clickable" role="button" tabindex="0" data-t="${r.t}" aria-label="篩選${esc(r.name)}"${tipA(fmt(r.n)+' 件',`${r.name}｜達門檻 ${r.p} 件（點一下篩選）`)}><rect class="hit-area" x="0" y="${yy-2}" width="${W2}" height="${BH+4}"/><text class="lbl" x="${L2-8}" y="${yy+BH/2+4}" text-anchor="end">${esc(r.name)}</text><rect class="${cls}" x="${L2}" y="${yy}" width="${Math.max(1,w).toFixed(1)}" height="${BH}" rx="4"/><text x="${L2+w+6}" y="${yy+BH/2+4}">${fmt(r.n)} 件｜達門檻 ${r.p}</text></g>`;});
    put('d-topics',s2,`0 0 ${W2} ${H2}`);
    // qualitative panel
    const top=tp.find(r=>r.t!==9),qt=F.topic>=0?F.topic:top.t,words=D16.words[`${F.topic}-${F.year}`]||[],tone=[0,1,2].map(k=>sum(C.filter(c=>match(c,'tone')&&c[3]===k),4));
    const cand=D16.typical[qt],qs=[...cand.filter(r=>F.year<0||r[1]===D16.years[F.year]),...cand.filter(r=>!(F.year<0||r[1]===D16.years[F.year]))].slice(0,2);
    $('d-words').innerHTML=words.map(([w,c])=>`<span class="chip">${esc(w)}<small>${fmt(c)}</small></span>`).join('');
    stack('d-tonebar',[{label:'標題語氣',c:tone}],'目前篩選範圍的標題語氣（NTUSD）');
    $('d-quotes').innerHTML=`<p class="fine">代表性引文：「${esc(D16.topics[qt])}」中段附議的提案${F.topic<0?'（未選主題，顯示「其他」以外件數最多的主題）':''}${F.year>=0&&qs.some(r=>r[1]!==D16.years[F.year])?'；該年沒有足夠候選，補上其他年份':''}</p>`+qs.map(r=>`<div class="quote-card"><h4>${esc(r[2])}</h4><p>${esc(r[3])}</p><p class="meta">${r[1]} 年｜附議 ${fmt(r[4])} 人｜第 ${r[0]} 筆</p></div>`).join('');
    $('d-story').innerHTML=`<strong>這個篩選看到的故事：</strong>${yl}、${tl}${nl}共 ${fmt(n)} 件提案；${pct(sig1/n,0)} 至少有 1 人附議，但達到 5,000 人門檻的只有 ${fmt(pass)} 件（${pct(pass/stage,2)}）。${F.topic<0?`除了「其他」，件數最多的主題是「${top.name}」（${fmt(top.n)} 件）。`:''}常見詞是「${words.slice(0,3).map(w=>w[0]).join('、')}」。件數多、常出現，不等於支持的人多。`;
    ['d-year','d-topic','d-tone'].forEach((id,k)=>{$(id).value=String([F.year,F.topic,F.tone][k]);});
    window.week16={filter:{...F},n,sig1,stage,pass,topics:tp.map(r=>[r.name,r.n,r.p]),peak:[peak.i,peak.n],words:words.map(w=>w[0])};
  }
  if(D16&&$('mk-chart')){
    FIX.forEach(([id])=>$(id).addEventListener('change',makeover));
    $('mk-all').addEventListener('click',()=>{FIX.forEach(([id])=>{$(id).checked=true;});makeover();});
    $('mk-reset').addEventListener('click',()=>{FIX.forEach(([id])=>{$(id).checked=false;});makeover();});
    makeover();
  }
  if(D16&&$('d-year')){
    [['d-year','year'],['d-topic','topic'],['d-tone','tone']].forEach(([id,k])=>$(id).addEventListener('change',()=>{F[k]=Number($(id).value);dash();}));
    const pick=e=>{const g=e.target.closest('[data-t]');if(!g)return;const t=Number(g.dataset.t);F.topic=F.topic===t?-1:t;dash();const again=$('d-topics').querySelector(`[data-t="${t}"]`);if(again&&e.type==='keydown')again.focus();};
    $('d-topics').addEventListener('click',pick);$('d-topics').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();pick(e);}});
    $('d-reset').addEventListener('click',()=>{F.year=F.topic=F.tone=-1;dash();});
    dash();
  }
})();
