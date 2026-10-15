(() => {
  'use strict';
  const $=id=>document.getElementById(id), data=window.WEEK78_DATA;
  const fmt=(n,d=2)=>Number(n).toLocaleString('zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct=(p,d=2)=>fmt(100*p,d)+'%', pp=(d,k=2)=>(d>0?'+':d<0?'−':'')+fmt(Math.abs(100*d),k);
  const Z={90:1.6448536269514722,95:1.959963984540054,99:2.5758293035489004};
  // Abramowitz–Stegun 7.1.26; error below 1.5e-7, enough for a teaching p-value.
  const phi=z=>{const t=1/(1+.3275911*Math.abs(z)/Math.SQRT2),e=1-t*(.254829592+t*(-.284496736+t*(1.421413741+t*(-1.453152027+t*1.061405429))))*Math.exp(-z*z/2);return z>=0?(1+e)/2:(1-e)/2;};
  const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  const table=(label,headers,rows)=>`<div class="table-wrap" tabindex="0" role="region" aria-label="${label}"><table><thead><tr>`+headers.map(h=>`<th scope="col">${h}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>`<td>${v}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>';
  const stat=(label,value,detail)=>`<div class="stat"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong><span class="stat-detail">${detail}</span></div>`;
  // Weighted proportion with Kish effective sample size; reflects weight variation only, not clustering.
  function prop(rows,hit,weight){
    let sw=0,sw2=0,sh=0,hits=0;rows.forEach(r=>{const w=weight(r);sw+=w;sw2+=w*w;if(hit(r)){sh+=w;hits++;}});
    const p=sw?sh/sw:NaN,neff=sw2?sw*sw/sw2:0;return {n:rows.length,hits,p,neff,se:Math.sqrt(p*(1-p)/neff)};
  }

  /* ---------- Week 7 ---------- */
  const HIGHER=new Set(['College (continue with 6a2)','Institute of technology, science and technological college (continue with 6a2)',"Master's degree (continue with 6a2)",'Military/police college_duplicated_17']);
  const IND={
    female:{label:'女性比例',valid:()=>true,hit:r=>r[0]==='Female',rule:'分母為全部 212 人。'},
    higher:{label:'大學／技職校院以上比例',valid:r=>r[3]!=="Don't know",hit:r=>HIGHER.has(r[3]),rule:'大學、科大／技術學院、碩士、軍警校院合併；教育程度 Don\'t know 1 人排除。'},
    student:{label:'仍在學比例',valid:r=>r[4]!=='Not applicable',hit:r=>r[4]==='No, I am still a student',rule:'是否完成學業為 Not applicable 的 34 人排除；不把它當成「不在學」。'}
  };
  const CONV={age1921:{label:'只問 19–21 歲（像在大學部課堂發問卷）',keep:r=>['19','20','21'].includes(r[1])},region1:{label:'只問地區代碼 1 的受訪者（像只在一個地區招募）',keep:r=>r[2]==='1'}};
  function updateCi(){
    const ind=IND[$('ci-indicator').value],weighted=$('ci-weight').value==='weighted',level=$('ci-level').value,z=Z[level];
    const rows=data.w7.filter(ind.valid),e=prop(rows,ind.hit,r=>weighted?r[5]:1),lo=e.p-z*e.se,hi=e.p+z*e.se;
    $('ci-stats').innerHTML=stat(weighted?'加權估計比例':'未加權比例',pct(e.p),`符合 ${e.hits} 人／有效 n=${e.n}`)+stat(`${level}% 信賴區間`,`${fmt(100*lo,1)}–${fmt(100*hi,1)}%`,'常態近似（Wald）')+stat('誤差範圍',`±${fmt(100*z*e.se)} 個百分點`,`有效樣本數 n_eff=${fmt(e.neff)}`);
    $('ci-description').textContent=`${ind.label}｜${ind.rule}${weighted?'加權時以 Kish 有效樣本數 n_eff＝(Σw)²／Σw² 計算標準誤，權數差異越大，n_eff 越小、區間越寬。':'未加權時 n_eff 等於有效 n。'} 這個區間只反映「隨機抽到哪些人」的不確定性，沒有包含分層、集群抽樣的設計效果，也不包含拒訪或題目設計造成的偏誤。`;
    const x=v=>40+v*580;let s=`<title>${ind.label}的 ${level}% 信賴區間</title><desc>點估計 ${pct(e.p)}，區間 ${pct(lo)} 至 ${pct(hi)}。</desc>`;
    for(let i=0;i<=10;i++)s+=`<line class="gridline" x1="${x(i/10)}" x2="${x(i/10)}" y1="18" y2="78"/><text class="tick" x="${x(i/10)}" y="96" text-anchor="middle">${i*10}%</text>`;
    s+=`<line class="ci-line" x1="${x(Math.max(0,lo))}" x2="${x(Math.min(1,hi))}" y1="48" y2="48"/><line class="ci-line" x1="${x(Math.max(0,lo))}" x2="${x(Math.max(0,lo))}" y1="38" y2="58"/><line class="ci-line" x1="${x(Math.min(1,hi))}" x2="${x(Math.min(1,hi))}" y1="38" y2="58"/><circle class="ci-point" cx="${x(e.p)}" cy="48" r="7"/>`;
    $('ci-chart').innerHTML=s;window.week7Ci={p:e.p,lo,hi,n:e.n,neff:e.neff};
  }
  function updateComp(){
    const col={性別:0,年齡:1,地區代碼:2}[$('comp-var').value],tw=data.w7.reduce((s,r)=>s+r[5],0);
    const groups=[...new Set(data.w7.map(r=>r[col]))].sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
    const rows=groups.map(g=>{const m=data.w7.filter(r=>r[col]===g),u=m.length/data.w7.length,w=m.reduce((s,r)=>s+r[5],0)/tw;return [col===0?(g==='Female'?'女性':'男性'):col===1?g+' 歲':'代碼 '+g,m.length,pct(u),pct(w),pp(w-u),`<div class="comp-track" aria-hidden="true"><span style="width:${u*100}%"></span><span class="w" style="width:${w*100}%"></span></div>`];});
    $('comp-table').innerHTML=table('未加權與加權組成比較',['群組','人數 n','未加權 %','加權 %','差（百分點）','長條：上未加權／下加權'],rows);
  }
  let simSeed=20261015;
  function updateSim(){
    const ind=IND[$('sim-indicator').value],conv=CONV[$('sim-type').value],pop=data.w7.filter(ind.valid),N=pop.length;
    const truth=prop(pop,ind.hit,()=>1).p,cs=prop(pop.filter(conv.keep),ind.hit,()=>1),n=cs.n,z=Z[95],fpc=Math.sqrt((N-n)/(N-1)),rand=rng(simSeed),draws=[];
    for(let k=0;k<100;k++){
      const idx=[...pop.keys()];for(let i=0;i<n;i++){const j=i+Math.floor(rand()*(N-i));[idx[i],idx[j]]=[idx[j],idx[i]];}
      const e=prop(idx.slice(0,n).map(i=>pop[i]),ind.hit,()=>1),half=z*e.se*fpc;draws.push({p:e.p,lo:e.p-half,hi:e.p+half,hit:e.p-half<=truth&&truth<=e.p+half});
    }
    const cover=draws.filter(d=>d.hit).length,chalf=z*cs.se*fpc,chit=cs.p-chalf<=truth&&truth<=cs.p+chalf,mean=draws.reduce((s,d)=>s+d.p,0)/100;
    $('sim-stats').innerHTML=stat('教學母體值',pct(truth),`212 人中有效 N=${N}`)+stat('便利樣本估計',pct(cs.p),`n=${n}；偏差 ${pp(cs.p-truth)} 個百分點`)+stat('100 次隨機抽樣',`${cover} / 100`,`區間涵蓋母體值；估計平均 ${pct(mean)}`);
    $('sim-description').textContent=`${ind.label}｜${conv.label}。把這 ${N} 位有效受訪者暫時當成「教學母體」，從中以簡單隨機抽樣抽出同樣 ${n} 人，重複 100 次；區間使用 95% 常態近似並加上有限母體校正。便利樣本的區間${chit?'這次剛好涵蓋母體值，但不能保證；換個指標可能就偏離。':'沒有涵蓋母體值：樣本再大，系統性偏誤也不會自動消失。'}`;
    const x=v=>40+v*580,h=18+100*3.4+40;let s=`<title>100 次隨機抽樣與便利樣本的 95% 信賴區間</title><desc>母體值 ${pct(truth)}；${cover} 次隨機樣本區間涵蓋母體值；便利樣本估計 ${pct(cs.p)}。</desc>`;
    for(let i=0;i<=10;i++)s+=`<line class="gridline" x1="${x(i/10)}" x2="${x(i/10)}" y1="8" y2="${h-22}"/><text class="tick" x="${x(i/10)}" y="${h-6}" text-anchor="middle">${i*10}%</text>`;
    s+=`<line class="truth-line" x1="${x(truth)}" x2="${x(truth)}" y1="4" y2="${h-22}"/><text class="sim-label" x="${x(cs.p)}" y="12" text-anchor="middle">便利樣本</text><line class="conv-line" x1="${x(Math.max(0,cs.p-chalf))}" x2="${x(Math.min(1,cs.p+chalf))}" y1="24" y2="24"/><circle class="conv-point" cx="${x(cs.p)}" cy="24" r="5"/>`;
    draws.forEach((d,i)=>{const y=44+i*3.4;s+=`<line class="${d.hit?'draw-line':'miss-line'}" x1="${x(Math.max(0,d.lo))}" x2="${x(Math.min(1,d.hi))}" y1="${y}" y2="${y}"/>`;});
    $('sim-chart').setAttribute('viewBox',`0 0 660 ${h}`);$('sim-chart').innerHTML=s;window.week7Sim={truth,conv:cs.p,n,cover};
  }
  if($('ci-indicator')){
    ['ci-indicator','ci-weight','ci-level'].forEach(id=>$(id).addEventListener('change',updateCi));
    $('reset-ci').addEventListener('click',()=>{$('ci-indicator').value='student';$('ci-weight').value='weighted';$('ci-level').value='95';updateCi();});
    $('comp-var').addEventListener('change',updateComp);
    ['sim-indicator','sim-type'].forEach(id=>$(id).addEventListener('change',updateSim));
    $('sim-redraw').addEventListener('click',()=>{simSeed=Math.floor(Math.random()*1e9);updateSim();});
    updateCi();updateComp();updateSim();
  }

  /* ---------- Week 8 ---------- */
  const SAT=new Set(['Very satisfied','Pretty satisfied','Fairly satisfied']);
  const compare=(rows,isHigh,weighted)=>{
    const w=r=>weighted?r[2]:1,hit=r=>SAT.has(r[1]),lo=prop(rows.filter(r=>!isHigh(r)),hit,w),hi=prop(rows.filter(isHigh),hit,w);
    const d=hi.p-lo.p,se=Math.sqrt(lo.se**2+hi.se**2);return {lo,hi,d,se,h:2*Math.asin(Math.sqrt(hi.p))-2*Math.asin(Math.sqrt(lo.p)),p:2*(1-phi(Math.abs(d/se)))};
  };
  const hLabel=h=>{const a=Math.abs(h);return a<.2?'很小（|h|＜0.2）':a<.5?'小（0.2–0.5）':a<.8?'中等（0.5–0.8）':'大（≥0.8）';};
  function diffChart(id,c,z,labels){
    const lo=Math.min(-.15,c.d-z*c.se-.05),hi=Math.max(.15,c.d+z*c.se+.05),x=v=>60+(v-lo)/(hi-lo)*540;
    let s=`<title>兩組差異與 95% 信賴區間</title><desc>差異 ${pp(c.d)} 個百分點，區間 ${pp(c.d-z*c.se)} 至 ${pp(c.d+z*c.se)}。</desc>`;
    const step=(hi-lo)>.6?.2:(hi-lo)>.3?.1:.05;
    for(let v=Math.ceil(lo/step)*step;v<=hi+1e-9;v+=step)s+=`<line class="gridline" x1="${x(v)}" x2="${x(v)}" y1="16" y2="70"/><text class="tick" x="${x(v)}" y="88" text-anchor="middle">${pp(v,0)}</text>`;
    s+=`<line class="zero-line" x1="${x(0)}" x2="${x(0)}" y1="10" y2="74"/><text class="sim-label" x="${x(0)}" y="8" text-anchor="middle">無差異</text>`;
    s+=`<line class="ci-line" x1="${x(c.d-z*c.se)}" x2="${x(c.d+z*c.se)}" y1="44" y2="44"/><circle class="ci-point" cx="${x(c.d)}" cy="44" r="7"/><text x="630" y="108" text-anchor="end">${labels}（百分點）</text>`;
    $(id).innerHTML=s;
  }
  let lastDiff=null;
  function updateDiff(){
    const cut=Number($('cut').value),weighted=$('diff-weight').value==='weighted',z=Z[95],isHigh=r=>r[0]>cut,c=compare(data.w8,isHigh,weighted);lastDiff={cut,weighted,c};
    const row=(name,range,g)=>[name,range,g.n,g.hits,g.n-g.hits,pct(g.p),`${fmt(100*(g.p-z*g.se),1)}–${fmt(100*Math.min(1,g.p+z*g.se),1)}%`];
    $('diff-table').innerHTML=table('低高使用組比較',['組別','每日上網','n','滿意 n','不滿意 n',weighted?'加權滿意率':'滿意率','95% 信賴區間'],[row('低使用組',`≤ ${cut} 分鐘`,c.lo),row('高使用組',`＞ ${cut} 分鐘`,c.hi)]);
    $('diff-stats').innerHTML=stat('差距（高−低）',`${pp(c.d)} 個百分點`,`95% CI ${pp(c.d-z*c.se)} 至 ${pp(c.d+z*c.se)}`)+stat('效果大小 Cohen’s h',fmt(c.h,3),hLabel(c.h))+stat('近似 p 值',c.p<.001?'＜0.001':fmt(c.p,3),'雙尾 z 檢定');
    $('diff-description').textContent=`切點 ${cut} 分鐘／日${cut===240?'（中位數）':''}；低使用組含等於切點者。生活滿意度 212 人皆為有效回答；Pretty／Fairly satisfied 合為滿意，Fairly dissatisfied 為不滿意（本檔沒有 Very dissatisfied）。${weighted?'加權時標準誤用各組 Kish 有效樣本數。':''} 信賴區間${c.d-z*c.se<0&&c.d+z*c.se>0?'跨過 0：資料同時容許高使用組略低、相同或略高，不能說兩組有差。':'沒有跨過 0。'} 這是觀察資料，不能宣稱網路時間造成滿意度差異。`;
    diffChart('diff-chart',c,z,'高使用組 − 低使用組');
    $('perm-result').textContent='按「洗牌 2,000 次」，看看「網路時間與滿意度無關」時，差距通常有多大。';$('perm-chart').innerHTML='';
    window.week8Diff={cut,weighted,lowN:c.lo.n,highN:c.hi.n,diff:c.d,h:c.h,p:c.p};
  }
  function runPerm(){
    const {cut,weighted,c}=lastDiff,rand=rng(cut*7919+(weighted?1:0)),labels=data.w8.map(r=>r[0]>cut),diffs=[];
    for(let k=0;k<2000;k++){
      for(let i=labels.length-1;i>0;i--){const j=Math.floor(rand()*(i+1));[labels[i],labels[j]]=[labels[j],labels[i]];}
      let a=[0,0],b=[0,0];data.w8.forEach((r,i)=>{const w=weighted?r[2]:1,g=labels[i]?b:a;g[0]+=w;if(SAT.has(r[1]))g[1]+=w;});diffs.push(b[1]/b[0]-a[1]/a[0]);
    }
    const extreme=diffs.filter(d=>Math.abs(d)>=Math.abs(c.d)-1e-12).length,bins=Array(30).fill(0),m=Math.max(.15,...diffs.map(Math.abs)),bw=2*m/30;
    diffs.forEach(d=>bins[Math.min(29,Math.floor((d+m)/bw))]++);
    const top=Math.max(...bins),x=v=>60+(v+m)/(2*m)*540,y=v=>130-v/top*110;
    let s=`<title>2,000 次洗牌後的差距分布</title><desc>觀察差距 ${pp(c.d)} 個百分點；洗牌差距絕對值不小於觀察值的比例為 ${fmt(100*extreme/2000,1)}%。</desc>`;
    bins.forEach((v,i)=>{s+=`<rect class="bar" x="${x(-m+i*bw)+.5}" y="${y(v)}" width="${540/30-1}" height="${130-y(v)}"/>`;});
    for(let v=-Math.floor(m*20)/20;v<=m+1e-9;v+=.05)s+=`<text class="tick" x="${x(v)}" y="148" text-anchor="middle">${pp(Math.abs(v)<1e-9?0:v,0)}</text>`;
    [c.d,-c.d].forEach((v,i)=>{s+=`<line class="obs-line" x1="${x(v)}" x2="${x(v)}" y1="14" y2="132"/>`+(i?'':`<text class="sim-label" x="${x(v)}" y="10" text-anchor="middle">觀察值</text>`);});
    s+=`<text x="630" y="168" text-anchor="end">洗牌後的差距（百分點）</text>`;
    $('perm-chart').innerHTML=s;
    $('perm-result').textContent=`2,000 次洗牌中，有 ${fmt(extreme,0)} 次（${fmt(100*extreme/2000,1)}%）的差距絕對值不小於實際觀察的 ${fmt(Math.abs(100*c.d))} 個百分點。這個比例就是洗牌版的 p 值：比例很大，表示觀察到的差距在「完全無關」的世界裡很常見。`;
    window.week8Perm={share:extreme/2000};
  }
  function updateScenario(){
    const p1=Number($('sc-p1').value)/100,p2=Number($('sc-p2').value)/100,n=Math.round(Number($('sc-n').value));
    if(!(p1>0&&p1<1&&p2>0&&p2<1&&n>=2)){$('sc-result').innerHTML='';$('sc-description').textContent='請輸入 1–99 的百分比，以及每組至少 2 人。';return;}
    const se=Math.sqrt(p1*(1-p1)/n+p2*(1-p2)/n),d=p2-p1,z=Z[95],c={d,se,h:2*Math.asin(Math.sqrt(p2))-2*Math.asin(Math.sqrt(p1)),p:2*(1-phi(Math.abs(d/se)))};
    $('sc-result').innerHTML=stat('差距（B−A）',`${pp(d)} 個百分點`,`95% CI ${pp(d-z*se)} 至 ${pp(d+z*se)}`)+stat('效果大小 Cohen’s h',fmt(c.h,3),hLabel(c.h))+stat('近似 p 值',c.p<.001?'＜0.001':fmt(c.p,3),c.p<.05?'＜0.05：統計顯著':'≥0.05：不顯著');
    const sig=c.p<.05,big=Math.abs(c.h)>=.5;
    $('sc-description').textContent=`假設情境，每組 ${fmt(n,0)} 人。`+(sig&&!big?'統計上顯著，但效果很小：樣本夠大時，再小的差距也可能「顯著」，仍要問這幾個百分點是否值得投入資源。':!sig&&big?'差距看起來很大卻不顯著：樣本太少，區間很寬，資料同時容許「沒有差」與「差非常多」。需要更多資料，而不是直接下結論。':sig?'顯著且效果不小；仍要確認資料來源、比較是否公平及成本。':'不顯著且效果小：目前沒有證據支持兩方案有實務上的差異。');
    diffChart('sc-chart',c,z,'方案 B − 方案 A');window.week8Scenario={d,h:c.h,p:c.p};
  }
  const PRESET={small:[88,90,5000],large:[60,90,10]};
  if($('cut')){
    ['cut','diff-weight'].forEach(id=>$(id).addEventListener('change',updateDiff));
    $('run-perm').addEventListener('click',runPerm);
    $('reset-diff').addEventListener('click',()=>{$('cut').value='240';$('diff-weight').value='weighted';updateDiff();});
    ['sc-p1','sc-p2','sc-n'].forEach(id=>$(id).addEventListener('input',updateScenario));
    document.querySelectorAll('[data-preset]').forEach(b=>b.addEventListener('click',()=>{const v=PRESET[b.dataset.preset];['sc-p1','sc-p2','sc-n'].forEach((id,i)=>$(id).value=v[i]);updateScenario();}));
    updateDiff();updateScenario();
  }
})();
