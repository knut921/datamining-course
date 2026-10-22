(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const fmt=(n,d=2)=>Number(n).toLocaleString('zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct=(p,d=1)=>fmt(100*p,d)+'%', signed=(v,d=0)=>(v>0?'+':v<0?'−':'')+fmt(Math.abs(v),d);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const table=(label,headers,rows)=>`<div class="table-wrap" tabindex="0" role="region" aria-label="${label}"><table><thead><tr>`+headers.map(h=>`<th scope="col">${h}</th>`).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>`<td>${v}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>';
  const stat=(label,value,detail)=>`<div class="stat"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong><span class="stat-detail">${detail}</span></div>`;
  const Z95=1.959963984540054;

  /* ---------- Week 9：發現產生器 ---------- */
  const OUT9={
    life:{label:'生活滿意（Pretty／Fairly satisfied）',col:'整體生活滿意度',pos:['Very satisfied','Pretty satisfied','Fairly satisfied'],bad:[]},
    health:{label:'健康滿意（Pretty／Fairly satisfied）',col:'健康滿意度',pos:['Very satisfied','Pretty satisfied','Fairly satisfied'],bad:[]},
    friends:{label:'朋友關係滿意',col:'朋友關係滿意度',pos:['Very satisfied','Pretty satisfied','Fairly satisfied'],bad:[]},
    happy:{label:'近期快樂（Pretty／Fairly happy）',col:'近期快樂程度',pos:['Pretty happy','Fairly happy'],bad:[]},
    goodhealth:{label:'自評健康「好」以上（Excellent／Very good／Good）',col:'自評健康',pos:['Excellent','Very good','Good'],bad:[]},
    income:{label:'收入夠用（Just enough 以上）',col:'收入足夠日常開支',pos:['Just enough','A little more than enough','Much more than enough'],bad:["Don't know"]}
  };
  const STUDY={'No, I am still a student':'仍在學','Yes, I graduated':'已畢業',"No, I didn't graduate":'未畢業（肄業）','Not applicable':'不適用'};
  const G9={sex:{label:'性別',fn:r=>r.性別==='Female'?'女性':'男性'},age:{label:'年齡',fn:r=>r.年齡<=21?'19–21 歲':'22–24 歲'},study:{label:'學業狀態',fn:r=>STUDY[r.是否完成學業]},net:{label:'每日上網時間',fn:r=>r.每日使用網路分鐘<=240?'上網 ≤240 分鐘':'上網 ＞240 分鐘'}};
  function updateFinding(){
    const d=window.WEEK09_DATA,rows=d.rows.map(r=>Object.fromEntries(d.fields.map((f,i)=>[f,r[i]])));
    const o=OUT9[$('f-outcome').value],g=G9[$('f-group').value],weighted=$('f-weight').value==='weighted';
    const valid=rows.filter(r=>!o.bad.includes(r[o.col])),labels=[...new Set(valid.map(g.fn))].sort((a,b)=>a.localeCompare(b,'zh-Hant'));
    const res=labels.map(l=>{const m=valid.filter(r=>g.fn(r)===l);let sw=0,sw2=0,sh=0,hits=0;m.forEach(r=>{const w=weighted?r.抽樣權數:1;sw+=w;sw2+=w*w;if(o.pos.includes(r[o.col])){sh+=w;hits++;}});const p=sh/sw,neff=sw*sw/sw2,se=Math.sqrt(p*(1-p)/neff);return {l,n:m.length,hits,p,lo:p-Z95*se,hi:p+Z95*se};});
    $('f-table').innerHTML=table('群組比較結果',['群組','人數','符合的人',weighted?'比例（加權）':'比例（不加權）','可能的範圍','提醒'],res.map(r=>[r.l,r.n,r.hits,`<span class="vb-inline" style="--v:${(100*r.p).toFixed(1)}">${pct(r.p)}</span>`,`${pct(Math.max(0,r.lo))}～${pct(Math.min(1,r.hi))}`,r.n<30?'<span class="chip warn">人數少，要小心</span>':'—']));
    const hi=res.reduce((a,b)=>b.p>a.p?b:a),lo=res.reduce((a,b)=>b.p<a.p?b:a),small=res.filter(r=>r.n<30);
    // Difference interval as in week 8: SE = √(SE₁² + SE₂²). Overlapping group intervals alone do not imply "no difference".
    const dse=Math.sqrt(((hi.hi-hi.p)/Z95)**2+((lo.hi-lo.p)/Z95)**2),diff=hi.p-lo.p,dlo=diff-Z95*dse,dhi=diff+Z95*dse,clear=dlo>0;
    $('f-stats').innerHTML=stat('比例最高',pct(hi.p),`${hi.l}（${hi.n} 人）`)+stat('比例最低',pct(lo.p),`${lo.l}（${lo.n} 人）`)+stat('差距',`${fmt(100*diff,1)} 個百分點`,`可能範圍 ${signed(100*dlo,1)} ～ ${signed(100*dhi,1)}${clear?'｜差距明確':'｜不確定有沒有差'}`);
    const x=v=>170+v*440;let s=`<title>${o.label}：依${g.label}比較</title><desc>${res.map(r=>`${r.l} ${pct(r.p)}`).join('；')}</desc>`;
    for(let i=0;i<=10;i+=2)s+=`<line class="gridline" x1="${x(i/10)}" x2="${x(i/10)}" y1="8" y2="${18+res.length*40}"/><text class="tick" x="${x(i/10)}" y="${34+res.length*40}" text-anchor="middle">${i*10}%</text>`;
    res.forEach((r,i)=>{const y=14+i*40;s+=`<text x="160" y="${y+16}" text-anchor="end">${r.l}（n=${r.n}）</text><rect class="bar" x="170" y="${y+4}" width="${x(r.p)-170}" height="18" rx="3"/><line class="ci-line" x1="${x(Math.max(0,r.lo))}" x2="${x(Math.min(1,r.hi))}" y1="${y+13}" y2="${y+13}"/>`;});
    $('f-chart').setAttribute('viewBox',`0 0 660 ${44+res.length*40}`);$('f-chart').innerHTML=s;
    $('f-card').textContent=`發現卡草稿｜2015 年 19–24 歲的受訪者中，${hi.l}「${o.label.replace(/（.*）/,'')}」的比例是 ${pct(hi.p)}，${lo.l}是 ${pct(lo.p)}，相差 ${fmt(100*(hi.p-lo.p),1)} 個百分點（${weighted?'加權':'不加權'}，共 ${valid.length} 人）。差距的可能範圍是 ${signed(100*dlo,1)} 到 ${signed(100*dhi,1)} 個百分點，`+(clear?'不包含 0，所以差距是比較確定的；但這只是描述，不能說是因為身分不同才造成。':'包含 0，代表兩組也可能其實沒差，寫成「看不出明顯差異」比較穩當。')+(hi.lo<=lo.hi&&clear?' 雖然兩組各自的範圍有重疊，但差距的範圍不含 0，判斷有沒有差要看差距本身。':'')+(small.length?` 注意：${small.map(r=>r.l).join('、')}不到 30 人，數字容易大起大落，結論要更保守。`:'')+' （可能範圍超過 0%～100% 的部分已截掉。）';
    window.week9Finding={key:$('f-outcome').value+'-'+$('f-group').value,weighted,diff,dlo,dhi,groups:Object.fromEntries(res.map(r=>[r.l,{n:r.n,hits:r.hits,p:r.p,lo:r.lo,hi:r.hi}]))};
  }
  if($('f-outcome')){
    ['f-outcome','f-group','f-weight'].forEach(id=>$(id).addEventListener('change',updateFinding));
    $('reset-finding').addEventListener('click',()=>{$('f-outcome').value='health';$('f-group').value='sex';$('f-weight').value='weighted';updateFinding();});
    updateFinding();
  }

  /* ---------- Week 10：簡單到多元迴歸 ---------- */
  // Columns enter in a fixed order; a column that is a linear combination of earlier ones
  // (e.g. elevator = 華廈 + 大樓) has ~0 Cholesky pivot and is dropped and reported.
  function design(spec){
    const d=window.WEEK10_DATA,cols=[{name:'截距',f:()=>1}];
    cols.push({name:'面積（坪）',key:'area',f:r=>r[0]});
    if(spec.age)cols.push({name:'屋齡（年）',key:'age',f:r=>r[1]});
    if(spec.floor)cols.push({name:'所在樓層',key:'floor',f:r=>r[2]});
    if(spec.region==='city')cols.push({name:'臺北市（對照：新北市）',key:'city',f:r=>r[3]});
    if(spec.region==='district')d.districts.forEach((n,i)=>{if(i)cols.push({name:`${n}（對照：${d.districts[0]}）`,group:'district',f:r=>r[4]===i?1:0});});
    if(spec.type)d.types.forEach((n,i)=>{if(i)cols.push({name:`${n}（對照：公寓）`,group:'type',f:r=>r[5]===i?1:0});});
    if(spec.elev)cols.push({name:'有電梯（對照：無）',key:'elev',f:r=>r[7]});
    if(spec.rt)d.rentTypes.forEach((n,i)=>{if(i)cols.push({name:`${n}（對照：整棟(戶)出租）`,group:'rt',f:r=>r[6]===i?1:0});});
    return cols;
  }
  function fitOls(spec){
    const rows=window.WEEK10_DATA.rows,cols=design(spec),k=cols.length,A=Array.from({length:k},()=>new Float64Array(k)),b=new Float64Array(k),x=new Float64Array(k);
    let sy=0,syy=0;
    rows.forEach(r=>{for(let i=0;i<k;i++)x[i]=cols[i].f(r);const y=r[8];sy+=y;syy+=y*y;for(let i=0;i<k;i++){b[i]+=x[i]*y;const xi=x[i];if(!xi)continue;const Ai=A[i];for(let j=0;j<=i;j++)Ai[j]+=xi*x[j];}});
    const keep=[],dropped=[],L=[];
    for(let i=0;i<k;i++){
      const li=[];for(let a=0;a<keep.length;a++){let s=A[i][keep[a]];for(let c=0;c<a;c++)s-=li[c]*L[a][c];li.push(s/L[a][a]);}
      let d=A[i][i];li.forEach(v=>d-=v*v);
      if(d<=1e-9*Math.max(1,A[i][i])){dropped.push(cols[i].name);continue;}
      li.push(Math.sqrt(d));L.push(li);keep.push(i);
    }
    const m=keep.length,z=new Float64Array(m),beta=new Float64Array(m);
    for(let a=0;a<m;a++){let s=b[keep[a]];for(let c=0;c<a;c++)s-=L[a][c]*z[c];z[a]=s/L[a][a];}
    for(let a=m-1;a>=0;a--){let s=z[a];for(let c=a+1;c<m;c++)s-=L[c][a]*beta[c];beta[a]=s/L[a][a];}
    const used=keep.map(i=>cols[i]),n=rows.length;let sse=0;
    rows.forEach(r=>{let p=0;for(let a=0;a<m;a++)p+=beta[a]*used[a].f(r);sse+=(r[8]-p)**2;});
    const sst=syy-sy*sy/n,r2=1-sse/sst;
    return {spec,n,k:m,r2,adj:1-(1-r2)*(n-1)/(n-m),rmse:Math.sqrt(sse/n),cols:used,beta:[...beta],dropped,predict:r=>used.reduce((s,c,a)=>s+beta[a]*c.f(r),0)};
  }
  const PRESET10={m1:{age:false,floor:false,region:'none',type:false,elev:false,rt:false},m2:{age:true,floor:false,region:'none',type:false,elev:false,rt:false},m3:{age:true,floor:false,region:'city',type:false,elev:false,rt:false},m4:{age:true,floor:true,region:'city',type:true,elev:false,rt:false}};
  const readSpec=()=>({age:$('reg-age').checked,floor:$('reg-floor').checked,region:$('reg-region').value,type:$('reg-type').checked,elev:$('reg-elev').checked,rt:$('reg-rt').checked});
  let model10=null,ladder=null;
  function plain(c,v){
    if(c.key==='area')return `其他條件相同時，面積每多 1 坪，估計月租平均${v>=0?'多':'少'} ${fmt(Math.abs(v),0)} 元。`;
    if(c.key==='age')return `其他條件相同時，屋齡每多 1 年，估計月租平均${v>=0?'多':'少'} ${fmt(Math.abs(v),0)} 元。`;
    if(c.key==='floor')return `其他條件相同時，樓層每高 1 層，估計月租平均${v>=0?'多':'少'} ${fmt(Math.abs(v),0)} 元。`;
    if(c.name==='截距')return '估計線的起點。0 坪的房子不存在，所以這個數字不用解讀。';
    return `跟對照組比，其他條件相同時，月租平均${v>=0?'貴':'便宜'} ${fmt(Math.abs(v),0)} 元。`;
  }
  function updateModel(){
    const m=fitOls(readSpec());model10=m;
    $('reg-stats').innerHTML=stat('解釋了幾成（R²）',pct(m.r2,1),`R²＝${fmt(m.r2,4)}；越接近 100% 越好`)+stat('平均估錯多少（RMSE）',`${fmt(m.rmse,0)} 元`,'越小越準')+stat('用了多少資料',`${fmt(m.n,0)} 間`,`算出 ${m.k} 個數字（含起點）`);
    const main=m.cols.map((c,i)=>[c,m.beta[i]]).filter(([c])=>!c.group),groups=m.cols.map((c,i)=>[c,m.beta[i]]).filter(([c])=>c.group);
    let html=table('迴歸係數',['條件','數字（元／月）','白話翻譯'],main.map(([c,v])=>[c.name,signed(v,1),plain(c,v)]));
    const names={district:'行政區',type:'建物型態',rt:'出租方式'};
    ['type','rt','district'].forEach(g=>{const rows=groups.filter(([c])=>c.group===g);if(!rows.length)return;const t=table(names[g]+'係數',['類別','數字（元／月，跟對照組比）'],rows.map(([c,v])=>[c.name,signed(v,1)]));html+=g==='district'?`<details class="coef-details"><summary>${names[g]}：${rows.length} 個虛擬變項（展開）</summary>${t}</details>`:`<h4>${names[g]}</h4>${t}`;});
    $('reg-coef').innerHTML=html;
    $('reg-warning').hidden=!m.dropped.length;$('reg-warning').textContent=m.dropped.length?`「${m.dropped.join('、')}」被電腦自動拿掉了：在這份資料裡，華廈和住宅大樓一定有電梯、公寓一定沒有，所以「有無電梯」和「建物型態」說的是同一件事，電腦分不出誰的影響。這不代表電梯不重要。`:'';
    const res=window.WEEK10_DATA.rows.map(r=>r[8]-m.predict(r)),bw=5000,bins=Array(24).fill(0);res.forEach(e=>{const i=Math.floor((e+60000)/bw);if(i>=0&&i<24)bins[i]++;});
    const out=res.filter(e=>e<-60000||e>=60000).length,top=Math.max(...bins),x=v=>50+(v+60000)/120000*560,y=v=>150-v/top*130;
    let s=`<title>殘差分布</title><desc>殘差＝實際月租－估計月租；−6 萬至 +6 萬之間分 24 組，範圍外 ${out} 筆。</desc>`;
    bins.forEach((v,i)=>s+=`<rect class="bar" x="${x(-60000+i*bw)+1}" y="${y(v)}" width="${560/24-2}" height="${150-y(v)}"/>`);
    for(let v=-60000;v<=60000;v+=20000)s+=`<text class="tick" x="${x(v)}" y="168" text-anchor="middle">${signed(v/10000,0)} 萬</text>`;
    s+=`<line class="zero-line" x1="${x(0)}" x2="${x(0)}" y1="12" y2="152"/><text x="630" y="190" text-anchor="end">殘差（實際－估計，元）；範圍外 ${out} 筆未畫出</text>`;
    $('reg-resid').innerHTML=s;
    if(ladder)$('reg-ladder').innerHTML=table('模型比較',['模型','放了哪些條件','筆數','解釋了幾成（R²）','平均估錯（元）'],ladder.map(([k,label,f])=>[k.toUpperCase(),label,fmt(f.n,0),`<span class="vb-inline" style="--v:${(100*f.r2).toFixed(1)}">${pct(f.r2,1)}</span>`,fmt(f.rmse,0)]));
    updatePredict();
    window.week10Model={spec:m.spec,n:m.n,k:m.k,r2:m.r2,adj:m.adj,rmse:m.rmse,dropped:m.dropped,coef:Object.fromEntries(m.cols.map((c,i)=>[c.name,m.beta[i]]))};
  }
  function updatePredict(){
    const d=window.WEEK10_DATA,area=Number($('p-area').value),age=Number($('p-age').value),fl=Number($('p-floor').value),dist=Number($('p-dist').value),type=Number($('p-type').value);
    if(!(area>0&&age>=0&&fl>=1)){$('p-result').textContent='請輸入大於 0 的面積、非負屋齡與至少 1 樓。';return;}
    const r=[area,age,fl,dist>=d.taipeiStart?1:0,dist,type,0,type?1:0,0];
    const v=model10.predict(r),warn=[];if(area>150||area<1.68)warn.push('面積超出資料範圍（1.68–150.32 坪）');if(age>82)warn.push('屋齡超出資料範圍');if(fl>41)warn.push('樓層超出資料範圍');if(type===0&&fl>5)warn.push('公寓（無電梯）通常不超過 5 樓');
    $('p-result').textContent=`目前的模型估計：每月約 ${fmt(Math.round(v/100)*100,0)} 元（平均可能估錯 ±${fmt(model10.rmse,0)} 元）。${model10.spec.rt?'出租方式以「整層出租」計算。':''}${model10.spec.region==='none'?'目前模型沒有放地區，選哪一區都不影響結果。':''}${warn.length?' 注意：'+warn.join('；')+'，模型沒看過類似的房子，估計不可靠。':''} 這只是平均的估計，不是這間房子「應該」的租金。`;
  }
  if($('reg-age')){
    const d=window.WEEK10_DATA;d.taipeiStart=d.rows.reduce((m,r)=>r[3]?Math.min(m,r[4]):m,Infinity);
    $('p-dist').innerHTML=d.districts.map((n,i)=>`<option value="${i}">${i<d.taipeiStart?'新北市':'臺北市'} ${n}</option>`).join('');$('p-dist').value=String(d.districts.indexOf('大安區'));
    $('p-type').innerHTML=d.types.map((n,i)=>`<option value="${i}">${n}</option>`).join('');
    ladder=[['m1','面積',fitOls(PRESET10.m1)],['m2','面積＋屋齡',fitOls(PRESET10.m2)],['m3','＋縣市',fitOls(PRESET10.m3)],['m4','＋樓層＋建物型態',fitOls(PRESET10.m4)]];
    const setSpec=s=>{$('reg-age').checked=s.age;$('reg-floor').checked=s.floor;$('reg-region').value=s.region;$('reg-type').checked=s.type;$('reg-elev').checked=s.elev;$('reg-rt').checked=s.rt;updateModel();};
    ['reg-age','reg-floor','reg-region','reg-type','reg-elev','reg-rt'].forEach(id=>$(id).addEventListener('change',updateModel));
    document.querySelectorAll('[data-model]').forEach(b=>b.addEventListener('click',()=>setSpec(PRESET10[b.dataset.model])));
    ['p-area','p-age','p-floor','p-dist','p-type'].forEach(id=>$(id).addEventListener('input',updatePredict));
    $('reset-reg').addEventListener('click',()=>setSpec(PRESET10.m1));
    // static scatter of area × rent with the simple regression line (all analysis rows)
    const m1=ladder[0][2],x=v=>50+v/160*570,y=v=>230-Math.min(v,400000)/400000*210;let s='<title>面積與月租金散布圖及簡單迴歸線</title><desc>'+fmt(d.rows.length,0)+' 筆；直線：月租＝'+fmt(m1.beta[0],0)+'＋'+fmt(m1.beta[1],1)+'×坪。</desc>';
    for(let v=0;v<=160;v+=20)s+=`<line class="gridline" x1="${x(v)}" x2="${x(v)}" y1="16" y2="232"/><text class="tick" x="${x(v)}" y="248" text-anchor="middle">${v}</text>`;
    for(let v=0;v<=400000;v+=100000)s+=`<text class="tick" x="44" y="${y(v)+4}" text-anchor="end">${v/10000} 萬</text>`;
    s+='<g class="dots">'+d.rows.map(r=>`<circle cx="${x(r[0]).toFixed(1)}" cy="${y(r[8]).toFixed(1)}" r="1.6"/>`).join('')+'</g>';
    s+=`<line class="fit-line" x1="${x(0)}" y1="${y(m1.beta[0])}" x2="${x(160)}" y2="${y(m1.beta[0]+160*m1.beta[1])}"/><text x="620" y="270" text-anchor="end">建物面積（坪）；縱軸：月租金（元）</text>`;
    $('reg-scatter').innerHTML=s;
    updateModel();
  }

  /* ---------- Week 11：門檻、混淆矩陣與決策樹 ---------- */
  const conf=(rows,th)=>{const c={tp:0,fn:0,fp:0,tn:0};rows.forEach(r=>{const p=r[3]>=th-1e-12;if(r[2])p?c.tp++:c.fn++;else p?c.fp++:c.tn++;});return c;};
  const ratio=(a,b)=>b?pct(a/b):'—';
  function updateThreshold(){
    const d=window.WEEK11_DATA,th=Number($('th').value),c=conf(d.rows,th),n=d.rows.length;
    $('th-label').textContent=fmt(th,2);
    $('cm').innerHTML=`<div class="table-wrap" tabindex="0" role="region" aria-label="混淆矩陣"><table class="cm-table"><thead><tr><th scope="col">實際＼電腦判斷</th><th scope="col">電腦說「要關心」</th><th scope="col">電腦說「不用」</th><th scope="col">合計</th></tr></thead><tbody><tr><th scope="row">實際上需要（25 人）</th><td class="cm-good">找對了 ✓<strong>${c.tp}</strong></td><td class="cm-bad">漏掉了 ✗<strong>${c.fn}</strong></td><td>${c.tp+c.fn}</td></tr><tr><th scope="row">實際上不需要（187 人）</th><td class="cm-warn">誤會了 ✗<strong>${c.fp}</strong></td><td class="cm-good">正確排除 ✓<strong>${c.tn}</strong></td><td>${c.fp+c.tn}</td></tr><tr><th scope="row">合計</th><td>${c.tp+c.fp}</td><td>${c.fn+c.tn}</td><td>${n}</td></tr></tbody></table></div>`;
    $('th-stats').innerHTML=stat('召回率：需要的人找到幾成',ratio(c.tp,c.tp+c.fn),`25 人中找到 ${c.tp} 人、漏掉 ${c.fn} 人`)+stat('精確率：被標記的人幾成真的需要',ratio(c.tp,c.tp+c.fp),`標記 ${c.tp+c.fp} 人，其中誤會 ${c.fp} 人`)+stat('正確率（小心會騙人）',ratio(c.tp+c.tn,n),`全部說「不用」也有 ${pct(187/212)}`);
    const x=v=>40+v*580;let s=`<title>每位受訪者的交叉驗證預測機率</title><desc>上排為實際低生活滿意 25 人，下排為其他 187 人；虛線為門檻 ${th}。</desc>`;
    for(let i=0;i<=10;i++)s+=`<line class="gridline" x1="${x(i/10)}" x2="${x(i/10)}" y1="10" y2="132"/><text class="tick" x="${x(i/10)}" y="148" text-anchor="middle">${fmt(i/10,1)}</text>`;
    s+='<text x="40" y="22">實際上需要（對生活不滿意）</text><text x="40" y="82">實際上不需要</text>';
    d.rows.forEach((r,i)=>{const y=(r[2]?36:96)+((i*37)%17)-8;s+=`<circle class="${r[2]?'pos-dot':'neg-dot'}${r[3]>=th-1e-12?' flagged':''}" cx="${x(r[3]).toFixed(1)}" cy="${y}" r="4"/>`;});
    s+=`<line class="th-line" x1="${x(th)}" x2="${x(th)}" y1="6" y2="134"/><text x="620" y="168" text-anchor="end">電腦估計的可能性（用沒看過這個人的模型算出）</text>`;
    $('th-chart').innerHTML=s;
    const regions=[...new Set(d.rows.map(r=>r[0]))].sort((a,b)=>a-b);
    $('region-table').innerHTML=table('各地區錯誤',['地區代碼','人數','需要的人','找對了','漏掉了','誤會了','找到幾成','誤會幾成'],regions.map(g=>{const rs=d.rows.filter(r=>r[0]===g),c=conf(rs,th);return ['代碼 '+g,rs.length,c.tp+c.fn,c.tp,c.fn,c.fp,ratio(c.tp,c.tp+c.fn),ratio(c.fp,c.fp+c.tn)];}));
    window.week11={th,...c,regions:Object.fromEntries(regions.map(g=>[g,conf(d.rows.filter(r=>r[0]===g),th)]))};
  }
  const RULE={'收入足夠日常開支':[v=>v<=2.5?'收入「不太夠」或「非常不夠」':'收入「剛好」或更寬裕'],'健康滿意度':[v=>v<=2.5?'對健康不滿意':'對健康滿意'],'女性':[v=>v<=.5?'男性':'女性'],'每日使用網路分鐘':[(v,t)=>v<=t?`每日上網 ≤${fmt(t,0)} 分鐘`:`每日上網 ＞${fmt(t,0)} 分鐘`],'年齡':[(v,t)=>v<=t?`${Math.floor(t)} 歲以下`:`${Math.ceil(t)} 歲以上`],'近期快樂程度':[v=>v<=2.5?'近期不快樂':'近期快樂'],'自評健康':[(v,t)=>v<=t?'自評健康較差':'自評健康較好'],'朋友關係滿意度':[v=>v<=2.5?'對朋友關係不滿意':'對朋友關係滿意'],'覺得生活沒有希望':[(v,t)=>v<=t?'較少覺得沒希望':'較常覺得沒希望'],};
  const cond=(f,t,left)=>(RULE[f]?RULE[f][0]:(v=>`${f}${v<=t?'≤':'＞'}${t}`))(left?t-1e-9:t+1e-9,t);
  function treeHtml(node,path,th){
    const rate=node.pos/node.n,label=`${node.n} 人｜其中不滿意 ${node.pos} 人（${pct(rate,0)}）`;
    if(!node.feature)return `<li><div class="tree-node leaf${rate>=th-1e-12?' flagged':''}"><span>${path.length?esc(path[path.length-1]):'全部'}</span><strong>${label}</strong><em>${rate>=th-1e-12?'→ 標記「要關心」':'→ 不標記'}</em></div></li>`;
    const l=cond(node.feature,node.threshold,true),r=cond(node.feature,node.threshold,false);
    return `<li><div class="tree-node"><span>${path.length?esc(path[path.length-1]):'全部 212 人'}</span><strong>${label}</strong><em>依「${esc(node.feature)}」分支</em></div><ul>${treeHtml(node.left,[...path,l],th)}${treeHtml(node.right,[...path,r],th)}</ul></li>`;
  }
  function rules(node,path,out){if(!node.feature){out.push({path,node});return out;}rules(node.left,[...path,cond(node.feature,node.threshold,true)],out);rules(node.right,[...path,cond(node.feature,node.threshold,false)],out);return out;}
  function updateTree(){
    const d=window.WEEK11_DATA,depth=$('tree-depth').value,th=$('tree-th').value,t=d.trees[depth],tr=t.train[th],cv=t.cv[th];
    $('tree-view').innerHTML=`<ul class="tree">${treeHtml(t.root,[],Number(th))}</ul>`;
    const rr=rules(t.root,[],[]).filter(x=>x.node.pos/x.node.n>=Number(th)-1e-12);
    $('tree-rules').innerHTML=rr.length?'<ul>'+rr.map(x=>`<li>如果 ${x.path.map(esc).join('，而且 ')} → 標記「要關心」（這群 ${x.node.n} 人中有 ${x.node.pos} 人對生活不滿意）</li>`).join('')+'</ul>':'<p>在這個標準下，沒有任何一群被標記：等於「全部說不用」。</p>';
    $('tree-table').innerHTML=table('練習資料與沒看過的資料比較',['怎麼考','找對了','漏掉了','誤會了','找到幾成','標記中幾成正確','整體分數（AUC）'],[['用練習過的資料考',tr.tp,tr.fn,tr.fp,ratio(tr.tp,tr.tp+tr.fn),ratio(tr.tp,tr.tp+tr.fp),fmt(t.trainAuc,3)],['用沒看過的資料考（輪流考試）',cv.tp,cv.fn,cv.fp,ratio(cv.tp,cv.tp+cv.fn),ratio(cv.tp,cv.tp+cv.fp),fmt(t.cvAuc,3)]]);
    $('tree-description').textContent=`最多問 ${depth} 層，最後分成 ${t.leaves} 群，每群至少 10 人。`+(Number(depth)===3?'第三層開始用「性別」「上網時間」「年齡」來分，練習資料的分數升到 '+fmt(t.trainAuc,3)+'，沒看過的資料卻降到 '+fmt(t.cvAuc,3)+'：這就是過度配適，像只背考古題答案，換了題目就不會。':'比較上下兩列：練習資料考得好、沒看過的資料考不好，差距越大，越可能是在「背答案」（過度配適）。');
    window.week11Tree={depth:Number(depth),th:Number(th),leaves:t.leaves,flagged:rr.length};
  }
  if($('th')){
    $('th').addEventListener('input',updateThreshold);['tree-depth','tree-th'].forEach(id=>$(id).addEventListener('change',updateTree));
    $('reset-th').addEventListener('click',()=>{$('th').value='0.2';updateThreshold();});
    updateThreshold();updateTree();
  }

  /* ---------- Week 12：分群 ---------- */
  const SHORT=['網路','電視','報紙','雜誌','生活滿意','健康滿意','朋友滿意','快樂','自評健康'];
  function updateCluster(){
    const d=window.WEEK12_DATA,key=$('cl-scale').value+'-'+$('cl-k').value,lab=d.clusters[key],k=Number($('cl-k').value),cfg=d.configs[key],F=d.features.length;
    const all=d.features.map((_,j)=>{const v=d.rows.map(r=>r[j]),m=v.reduce((a,b)=>a+b,0)/v.length;return {m,sd:Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/(v.length-1))};});
    const prof=[...Array(k).keys()].map(c=>{const idx=lab.map((l,i)=>l===c?i:-1).filter(i=>i>=0),n=idx.length;return {c,n,female:idx.filter(i=>d.female[i]).length/n,age:idx.reduce((s,i)=>s+d.age[i],0)/n,means:d.features.map((_,j)=>idx.reduce((s,i)=>s+d.rows[i][j],0)/n)};});
    $('cl-stats').innerHTML=stat('各群人數',prof.map(p=>p.n).join('／'),`共 212 人；最小的一群 ${Math.min(...prof.map(p=>p.n))} 人`)+stat('分得清不清楚（輪廓係數）',fmt(cfg.silhouette,3),cfg.silhouette<.25?'低於 0.25：界線模糊':'看起來較清楚，但要檢查原因')+stat('重跑穩不穩（0～1）',fmt(cfg.stabilityMean,2),`重跑 20 次的平均；最低 ${fmt(cfg.stabilityMin,2)}`);
    const name=c=>`群 ${c+1}`;
    $('cl-table').innerHTML=table('群組輪廓',['群組','人數','女性','平均年齡'].concat(SHORT),prof.map(p=>[name(p.c),p.n,pct(p.female,0),fmt(p.age,1)].concat(p.means.map((v,j)=>fmt(v,j<4?0:2)))).concat([['全體',212,pct(d.female.reduce((a,b)=>a+b,0)/212,0),fmt(d.age.reduce((a,b)=>a+b,0)/212,1)].concat(all.map((a,j)=>fmt(a.m,j<4?0:2)))]));
    const cw=58,x0=96;let s=`<title>各群特徵與全體平均的差距（標準差單位）</title><desc>橘色表示高於全體平均，藍色表示低於。</desc>`;
    SHORT.forEach((h,j)=>s+=`<text class="tick" x="${x0+j*cw+cw/2}" y="14" text-anchor="middle">${h}</text>`);
    prof.forEach((p,i)=>{const y=22+i*34;s+=`<text x="${x0-8}" y="${y+21}" text-anchor="end">${name(p.c)}（${p.n}）</text>`;p.means.forEach((v,j)=>{const z=(v-all[j].m)/all[j].sd,a=Math.min(1,Math.abs(z)/1.2);s+=`<rect class="${z>=0?'heat-hi':'heat-lo'}" x="${x0+j*cw+1}" y="${y}" width="${cw-2}" height="30" rx="3" style="fill-opacity:${(.08+.82*a).toFixed(2)}"/><text class="heat-num" x="${x0+j*cw+cw/2}" y="${y+19}" text-anchor="middle">${signed(z,1)}</text>`;});});
    $('cl-heat').setAttribute('viewBox',`0 0 ${x0+F*cw+4} ${30+k*34}`);$('cl-heat').innerHTML=s;
    const big=prof.map(p=>{const z=p.means.map((v,j)=>[(v-all[j].m)/all[j].sd,SHORT[j]]).sort((a,b)=>Math.abs(b[0])-Math.abs(a[0])).slice(0,2);return `${name(p.c)}（${p.n} 人）最突出的是${z.map(([v,h])=>`${h}${v>0?'較高':'較低'}`).join('、')}`;});
    $('cl-description').textContent=($('cl-scale').value==='raw'?'直接用原始數字：分鐘數比 1～5 分的滿意度大太多，電腦幾乎只看媒體時間，少數時間特別長的人就會被單獨分成一群。':'統一尺度後：每個特徵的份量差不多。')+' '+big.join('；')+'。'+(key==='std-3'?` 這組結果和 CSV 的「分群編號」完全一致：群 1＝${d.csvNames[1]}、群 2＝${d.csvNames[2]}、群 3＝${d.csvNames[3]}。`:'');
    window.week12={key,sizes:prof.map(p=>p.n),means:prof.map(p=>p.means),silhouette:cfg.silhouette};
  }
  if($('cl-k')){['cl-k','cl-scale'].forEach(id=>$(id).addEventListener('change',updateCluster));$('reset-cl').addEventListener('click',()=>{$('cl-k').value='3';$('cl-scale').value='std';updateCluster();});updateCluster();}

  /* ---------- Week 13：詞頻與文字雲 ---------- */
  function wordList(){
    const d=window.WEEK13_DATA,key=`${$('wf-dict').value}-${$('wf-field').value}-${$('wf-year').value}`,drop=new Set();
    if($('wf-stop').checked)d.stop.forEach(w=>drop.add(w));if($('wf-domain').checked)d.domain.forEach(w=>drop.add(w));
    $('wf-custom').value.split(/[,，、\s]+/).filter(Boolean).forEach(w=>drop.add(w.trim()));
    const by=$('wf-measure').value==='df'?2:1;
    return {key,list:d.lists[key].filter(r=>!drop.has(r[0])).sort((a,b)=>b[by]-a[by]||(a[0]<b[0]?-1:1)),by,drop};
  }
  function cloud(list,by){
    const W=660,H=360,max=list[0][by],min=list[list.length-1][by],boxes=[];let s='<title>文字雲</title><desc>字越大表示'+(by===2?'出現的提案數':'出現次數')+'越多；位置與顏色沒有意義。</desc>';
    // font-size goes in style: the shared `.chart text` rule would override a presentation attribute
    const top=list.length<=30?54:list.length<=60?46:38;
    list.forEach((r,i)=>{
      const size=Math.round(12+(max===min?1:Math.sqrt((r[by]-min)/(max-min)))*(top-12)),w=r[0].length*size*1.02,h=size*1.08;
      for(let t=0;t<5000;t+=1){const a=.18*t,rad=.9*a,cx=W/2+rad*Math.cos(a)*1.6,cy=H/2+rad*Math.sin(a),b={x:cx-w/2,y:cy-h/2,w,h};
        if(b.x<4||b.y<4||b.x+w>W-4||b.y+h>H-4)continue;
        if(boxes.some(o=>b.x<o.x+o.w&&o.x<b.x+w&&b.y<o.y+o.h&&o.y<b.y+h))continue;
        boxes.push(b);s+=`<text class="wc wc${i%3}" x="${cx.toFixed(1)}" y="${(cy+size*.36).toFixed(1)}" style="font-size:${size}px" text-anchor="middle"><title>${esc(r[0])}：${fmt(r[1],0)} 次，${fmt(r[2],0)} 件提案</title>${esc(r[0])}</text>`;break;}
    });
    return {svg:s,placed:boxes.length};
  }
  function updateWords(){
    const d=window.WEEK13_DATA,{key,list,by}=wordList(),n=Number($('wf-top').value),top=list.slice(0,n),fieldName=$('wf-field').selectedOptions[0].textContent,year=$('wf-year').value;
    const docs=year==='all'?Object.values(d.years).reduce((a,b)=>a+b,0):d.years[year];
    $('wf-stats').innerHTML=stat('提案件數',fmt(docs,0),year==='all'?'2020–2024 全部':`${year} 年`)+stat('第一名',esc(top[0][0]),`出現 ${fmt(top[0][1],0)} 次｜在 ${fmt(top[0][2],0)} 件提案（${pct(top[0][2]/docs)}）`)+stat('文字雲詞數',`${top.length}`,`欄位：${fieldName}`);
    const c=cloud(top,by);$('wf-cloud').innerHTML=c.svg;
    const b=top.slice(0,15),bmax=b[0][by],x=v=>110+v/bmax*470;let s=`<title>前 15 名高頻詞</title><desc>${b.map(r=>r[0]+' '+r[by]).join('；')}</desc>`;
    b.forEach((r,i)=>{const y=8+i*24;s+=`<text x="100" y="${y+15}" text-anchor="end">${esc(r[0])}</text><rect class="bar" x="110" y="${y+3}" width="${x(r[by])-110}" height="16" rx="3"/><text class="tick" x="${x(r[by])+6}" y="${y+15}">${fmt(r[by],0)}</text>`;});
    $('wf-bars').innerHTML=s;
    $('wf-table').innerHTML=table('高頻詞表',['名次','詞','出現次數','出現在幾件提案','占全部提案'],list.slice(0,30).map((r,i)=>[i+1,esc(r[0]),fmt(r[1],0),fmt(r[2],0),pct(r[2]/docs)]));
    $('wf-description').textContent=`${$('wf-dict').value==='user'?'用了自訂詞典':'只用預設詞典'}；只數兩個字以上的中文詞，網址、數字、英文和標點都已去掉。${$('wf-stop').checked?'已刪除一般停用詞。':'沒有刪停用詞：前幾名多半是「可以」「我們」這種看不出主題的詞。'}${$('wf-domain').checked?'也刪除了領域停用詞（政府、台灣、建議等幾乎每件都有的詞）。':''} 文字雲放了 ${c.placed} 個詞；字越大代表${by===2?'出現在越多件提案':'出現越多次'}，位置和顏色沒有意義。`;
    window.week13={key,by,top:top.slice(0,20).map(r=>[r[0],r[by]]),placed:c.placed};
  }
  if($('wf-field')){
    ['wf-field','wf-year','wf-dict','wf-stop','wf-domain','wf-measure','wf-top'].forEach(id=>$(id).addEventListener('change',updateWords));$('wf-custom').addEventListener('input',updateWords);
    $('reset-wf').addEventListener('click',()=>{$('wf-field').value='title';$('wf-year').value='all';$('wf-dict').value='user';$('wf-stop').checked=true;$('wf-domain').checked=false;$('wf-measure').value='tf';$('wf-top').value='60';$('wf-custom').value='';updateWords();});
    const ex=window.WEEK13_DATA.examples;$('seg-table').innerHTML=table('斷詞比較',['原句','只用預設詞典','加入自訂詞典後'],ex.sentences.map((s,i)=>[esc(s),esc(ex.default[i]),esc(ex.user[i])]));
    updateWords();
  }
})();
