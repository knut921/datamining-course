(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const fmt = (n, digits = 2) => Number(n).toLocaleString('zh-TW', {minimumFractionDigits: digits, maximumFractionDigits: digits});
  const quantile = (sorted, p) => {
    const at = (sorted.length - 1) * p, lo = Math.floor(at), hi = Math.ceil(at);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (at - lo);
  };
  const describe = input => {
    const a = input.filter(Number.isFinite).slice().sort((x,y) => x-y), n = a.length;
    if (!n) return null;
    const mean = a.reduce((s,v) => s+v,0)/n, q1 = quantile(a,.25), median = quantile(a,.5), q3 = quantile(a,.75);
    const sd = n > 1 ? Math.sqrt(a.reduce((s,v) => s+(v-mean)**2,0)/(n-1)) : 0;
    const low = q1-1.5*(q3-q1), high = q3+1.5*(q3-q1), inside = a.filter(v => v>=low && v<=high);
    return {n,mean,median,sd,q1,q3,low,high,min:a[0],max:a[n-1],whiskerLow:inside[0],whiskerHigh:inside[inside.length-1],flags:a.filter(v=>v<low || v>high)};
  };
  window.LessonMath = {describe,quantile};
  function stat(label,value,detail) { return `<div class="stat"><span class="stat-label">${label}</span><strong class="stat-value">${value}</strong><span class="stat-detail">${detail}</span></div>`; }
  function comparisonChart(before,after) {
    const metrics = [['mean','平均數'],['median','中位數'],['sd','標準差']];
    const max = Math.ceil(Math.max(...metrics.flatMap(([key])=>[before[key],after[key]]))/100)*100 || 100;
    const x = n => 98+n/max*505;
    let content = '<title>加入假設觀察值前後，三項統計量的比較</title><desc>藍色為原始資料，橘色為加入後。精確數字列於圖上方。</desc>';
    for(let i=0;i<=4;i++) {const v=max*i/4;content+=`<line class="gridline" x1="${x(v)}" x2="${x(v)}" y1="18" y2="220"/><text class="tick" x="${x(v)}" y="243" text-anchor="middle">${fmt(v,0)}</text>`;}
    metrics.forEach(([key,label],i)=>{const y=30+i*68;content+=`<text x="0" y="${y+20}">${label}</text><rect class="bar" x="98" y="${y}" width="${x(before[key])-98}" height="16" rx="3"/><rect class="accent-bar" x="98" y="${y+22}" width="${x(after[key])-98}" height="16" rx="3"/>`;});
    content+='<text x="605" y="270" text-anchor="end">分鐘／日</text>';
    $('time-chart').innerHTML = content;
  }
  function updateTime() {
    const real = $('time-sample').value === 'real';
    const raw = real ? window.LESSON_DATA.internet : [30,45,60,75,90];
    const added = Number($('extreme-value').value), enabled = $('include-extreme').checked;
    const before = describe(raw), after = describe(enabled ? [...raw,added] : raw);
    $('extreme-label').textContent = `${fmt(added,0)} 分鐘`;
    const metrics = [['mean','平均數'],['median','中位數'],['sd','樣本標準差']];
    $('time-stats').innerHTML = metrics.map(([key,label]) => stat(label,fmt(after[key]),`原為 ${fmt(before[key])} · 變化 ${after[key]-before[key] >= 0 ? '+' : ''}${fmt(after[key]-before[key])}`)).join('');
    $('time-description').textContent = `${real ? '2015 青年網路時間實際資料' : '教學假設小樣本 [30, 45, 60, 75, 90]'}：原始 n=${before.n}，目前 n=${after.n}。${enabled ? `另加入一筆 ${added} 分鐘／日的假設觀察值；它不會寫入原始 CSV。` : '目前沒有加入假設值。'} 比較中位數與平均數的變化，再想想樣本數為什麼會影響一筆資料的作用。`;
    comparisonChart(before,after);
  }
  if ($('time-lab')) {
    ['time-sample','include-extreme'].forEach(id => $(id).addEventListener('change',updateTime));
    $('extreme-value').addEventListener('input',updateTime);
    $('reset-time').addEventListener('click',()=>{$('time-sample').value='real';$('include-extreme').checked=true;$('extreme-value').value='1440';updateTime();});
    updateTime();
  }
  function drawHistogram(values, domainMax, bins, unit) {
    const top=Math.ceil(domainMax/(domainMax>10000 ? 10000 : 1000))*(domainMax>10000 ? 10000 : 1000);
    const counts=Array(bins).fill(0), width=top/bins;
    values.forEach(v=>counts[Math.min(bins-1,Math.floor(v/width))]++);
    const maxCount = Math.ceil(Math.max(...counts)/100)*100 || 1;
    const x=v=>55+v/top*554, y=v=>226-v/maxCount*186;
    let s=`<title>${unit}直方圖</title><desc>涵蓋全部範圍，${bins} 組，顯示 ${values.length} 筆。詳細區間筆數可展開下方資料表。</desc>`;
    for(let i=0;i<=4;i++){const v=maxCount*i/4;s+=`<line class="gridline" x1="55" x2="610" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="47" y="${y(v)+4}" text-anchor="end">${fmt(v,0)}</text>`;}
    counts.forEach((count,i)=>{s+=`<rect class="bar" x="${x(i*width)+1}" y="${y(count)}" width="${554/bins-2}" height="${226-y(count)}" rx="2"><title>${fmt(i*width,1)} 至 ${fmt((i+1)*width,1)}：${count} 筆</title></rect>`;});
    for(let i=0;i<=4;i++){const v=top*i/4;s+=`<text class="tick" x="${x(v)}" y="247" text-anchor="middle">${fmt(v,0)}</text>`;}
    s+=`<text x="8" y="17">筆數</text><text x="610" y="274" text-anchor="end">${unit}</text>`;
    $('rent-histogram').innerHTML=s;
    $('histogram-rows').innerHTML=counts.map((count,i)=>`<tr><td>${fmt(i*width,1)} ≤ x ${i===bins-1?'≤':'<'} ${fmt((i+1)*width,1)}</td><td>${fmt(count,0)}</td></tr>`).join('');
  }
  function drawBox(a,domainMax,unit) {
    const x=v=>55+v/domainMax*554;
    let s=`<title>${unit}箱型圖</title><desc>Q1 ${fmt(a.q1)}，中位數 ${fmt(a.median)}，Q3 ${fmt(a.q3)}，鬚線從 ${fmt(a.whiskerLow)} 到 ${fmt(a.whiskerHigh)}。橘色點是 1.5 IQR 界線外的候選極端值。</desc>`;
    s+=`<line stroke="#5263a0" stroke-width="2" x1="${x(a.whiskerLow)}" x2="${x(a.whiskerHigh)}" y1="55" y2="55"/>`;
    [a.whiskerLow,a.whiskerHigh].forEach(v=>{s+=`<line stroke="#5263a0" stroke-width="2" x1="${x(v)}" x2="${x(v)}" y1="40" y2="70"/>`;});
    s+=`<rect x="${x(a.q1)}" y="30" width="${Math.max(x(a.q3)-x(a.q1),1)}" height="50" fill="#e0e5f6" stroke="#5263a0" stroke-width="2"/><line x1="${x(a.median)}" x2="${x(a.median)}" y1="30" y2="80" stroke="#303e78" stroke-width="3"/>`;
    a.flags.forEach((v,i)=>{s+=`<circle cx="${x(v)}" cy="${55+(i%5-2)*3}" r="2.5" fill="#b45d2e" opacity=".5"><title>候選值 ${fmt(v)}</title></circle>`;});
    for(let i=0;i<=4;i++)s+=`<text class="tick" x="${x(domainMax*i/4)}" y="108" text-anchor="middle">${fmt(domainMax*i/4,0)}</text>`;
    s+=`<text x="610" y="136" text-anchor="end">${unit}</text>`;
    $('rent-boxplot').innerHTML=s;
  }
  function updateRent() {
    const city=$('rent-city').value, col=Number($('rent-variable').value), bins=Number($('rent-bins').value), exclude=$('hide-flags').checked;
    const raw=window.LESSON_DATA.rentals.filter(r=>city==='all' || r[0]===city).map(r=>r[col]), base=describe(raw);
    const values=exclude ? raw.filter(v=>v>=base.low && v<=base.high) : raw, current=describe(values);
    const unit=col===1?'元／月':'元／坪／月';
    $('rent-stats').innerHTML=stat('目前顯示筆數',fmt(current.n,0),`原始 ${fmt(base.n,0)} 筆`)+stat('平均數',fmt(current.mean,0),`${unit} · 小數 2 位見表`)+stat('中位數',fmt(current.median,0),unit);
    const domainMax=Math.ceil(base.max/(base.max>10000?10000:1000))*(base.max>10000?10000:1000);
    drawHistogram(values,base.max,bins,unit);
    // The box plot always shows the unchanged source group so candidates remain visible.
    drawBox(base,domainMax,unit);
    $('rent-description').textContent=`${city==='all'?'雙北合併':city}，${col===1?'月租金':'每坪月租金'}。以此群組的原始四分位數計算：Q1=${fmt(base.q1)}、Q3=${fmt(base.q3)}、IQR=${fmt(base.q3-base.q1)}；下界=${fmt(base.low)}、上界=${fmt(base.high)} ${unit}。界線外共 ${fmt(base.flags.length,0)} 筆（${fmt(base.flags.length/base.n*100,2)}%）。${exclude?'上方數字及直方圖暫時排除這些候選值，只做敏感度比較；箱型圖仍保留原始資料。':'目前保留全部案件。'} 各情境沿用原始完整橫軸範圍。`;
    $('rent-summary').innerHTML=[['全部保留',base],['暫排 IQR 候選值',describe(raw.filter(v=>v>=base.low && v<=base.high))]].map(([label,a])=>`<tr><td>${label}</td><td>${fmt(a.n,0)}</td><td>${fmt(a.mean)}</td><td>${fmt(a.median)}</td><td>${fmt(a.sd)}</td></tr>`).join('');
    $('box-summary').textContent=`原始資料的下鬚 ${fmt(base.whiskerLow)} ｜ Q1 ${fmt(base.q1)} ｜ 中位數 ${fmt(base.median)} ｜ Q3 ${fmt(base.q3)} ｜ 上鬚 ${fmt(base.whiskerHigh)}（${unit}）。候選點有少量垂直錯位以減少重疊，垂直位置沒有統計意義。`;
    $('summary-unit').textContent=`目前單位：${unit}；樣本標準差使用 n−1。此表比較原始資料與暫排候選值，並非清理建議。`;
  }
  if ($('rent-lab')) {
    ['rent-city','rent-variable','rent-bins','hide-flags'].forEach(id=>$(id).addEventListener('change',updateRent));
    $('reset-rent').addEventListener('click',()=>{$('rent-city').value='all';$('rent-variable').value='1';$('rent-bins').value='24';$('hide-flags').checked=false;updateRent();});
    updateRent();
  }
  document.querySelectorAll('.copy-button').forEach(button=>button.addEventListener('click',async()=>{
    const text=$(button.dataset.copy).textContent;
    try {
      if(navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
      else {
        const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.append(area);area.select();
        const success=document.execCommand('copy');area.remove();if(!success)throw new Error('copy failed');
      }
      button.textContent='已複製 ✓';
    } catch { button.textContent='請選取複製';const range=document.createRange();range.selectNodeContents($(button.dataset.copy));const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range); }
    setTimeout(()=>{button.textContent='複製提示語';},2500);
  }));
  document.querySelectorAll('[data-quiz]').forEach(quiz=>{
    quiz.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>{
      quiz.querySelectorAll('button').forEach(b=>{b.classList.remove('selected');b.setAttribute('aria-pressed','false');});
      button.classList.add('selected');button.setAttribute('aria-pressed','true');
      quiz.querySelector('.quiz-feedback').textContent=button.dataset.feedback;
    }));
  });
  const checks=[...document.querySelectorAll('.check-row input')];
  const storageKey='utaipei-dm-'+document.body.dataset.week+'-checks-v1';
  try{const saved=JSON.parse(localStorage.getItem(storageKey)||'[]');if(Array.isArray(saved))checks.forEach((box,i)=>{box.checked=saved.includes(i);});}catch{}
  function updateChecks(){const checked=checks.map((b,i)=>b.checked?i:-1).filter(i=>i>=0);if($('check-progress'))$('check-progress').textContent=`已完成 ${checked.length} / ${checks.length} 項（僅在此瀏覽器記住勾選，不會提交作業）`;try{localStorage.setItem(storageKey,JSON.stringify(checked));}catch{}}
  checks.forEach(box=>box.addEventListener('change',updateChecks));updateChecks();
  document.querySelectorAll('[data-print]').forEach(button=>button.addEventListener('click',()=>window.print()));
  if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){document.querySelectorAll('.lesson-rail a').forEach(a=>a.classList.toggle('current',a.hash==='#'+entry.target.id));}});},{rootMargin:'-12% 0px -65% 0px'});document.querySelectorAll('.lesson-section').forEach(section=>observer.observe(section));}
})();
