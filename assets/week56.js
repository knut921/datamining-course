(() => {
  'use strict';
  const $=id=>document.getElementById(id), data=window.WEEK56_DATA;
  const fmt=(n,d=2)=>n.toLocaleString('zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d});
  const positive=new Set(['Very satisfied','Pretty satisfied','Fairly satisfied']);
  const negative=new Set(['Very dissatisfied','Pretty dissatisfied','Fairly dissatisfied']);
  const table=(headers,rows)=>'<div class="table-wrap" tabindex="0" role="region" aria-label="交叉分析結果"><table><thead><tr>'+headers.map(h=>`<th scope="col">${h}</th>`).join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+row.map(v=>`<td>${v}</td>`).join('')+'</tr>').join('')+'</tbody></table></div>';
  function updateGroup(){
    const field=$('group').value,q=$('question').value,weighted=$('weight').value==='weighted',column=$('denominator').value==='column';
    const groups=[...new Set(data.youth.map(r=>r[field]))].sort();
    const sums=groups.map(g=>{
      const raw=data.youth.filter(r=>r[field]===g),valid=raw.filter(r=>positive.has(r[q])||negative.has(r[q]));
      const yes=valid.filter(r=>positive.has(r[q])),no=valid.filter(r=>negative.has(r[q]));
      const total=a=>a.reduce((s,r)=>s+(weighted?Number(r['抽樣權數']):1),0);
      return {g,label:g==='Female'?'女性':g==='Male'?'男性':g+' 歲',raw:raw.length,n:valid.length,yes:yes.length,no:no.length,a:total(yes),b:total(no)};
    });
    const sumYes=sums.reduce((s,r)=>s+r.a,0),sumNo=sums.reduce((s,r)=>s+r.b,0);
    const pct=(a,b)=>b?fmt(100*a/b)+'%':'無有效分母';
    $('group-table').innerHTML=table(['群組','原始 n','有效 n','無效 n','滿意 n','不滿意 n','滿意 %','不滿意 %','提醒'],sums.map(r=>[r.label,r.raw,r.n,r.raw-r.n,r.yes,r.no,pct(r.a,column?sumYes:r.a+r.b),pct(r.b,column?sumNo:r.a+r.b),r.n<30?'小樣本':'—']));
    $('group-note').textContent=`${q}｜${weighted?'加權':'未加權'}${column?'欄':'列'}百分比。${column?'滿意欄與不滿意欄各自合計 100%；回答「這類回答者由誰組成」。':'每列合計 100%；回答「各群組內有多少人滿意」。'} 原始共 ${data.youth.length} 筆，有效 ${sums.reduce((s,r)=>s+r.n,0)} 筆。百分比計算前不四捨五入。`;
    $('group-bars').innerHTML='<h3>'+ (column?'滿意者的群組組成':'各群組內滿意率')+'</h3>'+sums.map(r=>{
      const den=column?sumYes:r.a+r.b,p=den?100*r.a/den:0;
      return `<div class="comparison-row"><span>${r.label}：${pct(r.a,den)}</span><div class="comparison-track"><div style="width:${p}%"></div></div></div>`;
    }).join('');
  }
  function updateCorrelation(){
    const city=$('city').value,col=Number($('xvar').value),raw=data.rent.filter(r=>city==='all'||r[0]===city);
    const rows=raw.filter(r=>r[col]!==null&&Number.isFinite(r[col])&&r[1]>0&&r[2]>0),n=rows.length;
    const mx=rows.reduce((s,r)=>s+r[col],0)/n,my=rows.reduce((s,r)=>s+r[2],0)/n;
    let xx=0,yy=0,xy=0;rows.forEach(r=>{xx+=(r[col]-mx)**2;yy+=(r[2]-my)**2;xy+=(r[col]-mx)*(r[2]-my);});
    const corr=xx&&yy?xy/Math.sqrt(xx*yy):null;
    $('correlation-summary').textContent=`${city==='all'?'雙北合併':city}｜成對有效 n=${fmt(n,0)}；排除 ${fmt(raw.length-n,0)} 筆；Pearson r=${corr===null?'未定義':fmt(corr,4)}。保留極端值，未控制第三變項。`;
    const maxX=Math.max(...rows.map(r=>r[col]))*1.05,maxY=Math.max(...rows.map(r=>r[2]))*1.05;
    const x=v=>80+v/maxX*550,y=v=>300-v/maxY*255,label=col===1?'建物面積（m²）':'租賃時屋齡（年）';
    let svg=`<title>${label}與月租金散布圖</title><desc>${$('correlation-summary').textContent}。完整繪出 ${n} 筆，圖軸依目前篩選縮放。</desc><text x="80" y="22">月租金（元／月）</text>`;
    for(let i=0;i<=4;i++){
      svg+=`<line class="gridline" x1="80" x2="630" y1="${y(maxY*i/4)}" y2="${y(maxY*i/4)}"/><text class="tick" x="72" y="${y(maxY*i/4)+4}" text-anchor="end">${fmt(maxY*i/4,0)}</text><text class="tick" x="${x(maxX*i/4)}" y="322" text-anchor="middle">${fmt(maxX*i/4,1)}</text>`;
    }
    svg+=rows.map(r=>`<circle cx="${x(r[col]).toFixed(2)}" cy="${y(r[2]).toFixed(2)}" r="2.2" fill="currentColor" opacity=".28"/>`).join('');
    svg+=`<text x="630" y="349" text-anchor="end">${label}</text>`;$('scatter').innerHTML=svg;
    window.week56Result={n,r:corr,excluded:raw.length-n};
  }
  if($('group')){['group','question','denominator','weight'].forEach(id=>$(id).addEventListener('change',updateGroup));$('reset-group').addEventListener('click',()=>{['group','question','denominator','weight'].forEach(id=>$(id).selectedIndex=0);updateGroup();});updateGroup();}
  if($('city')){['city','xvar'].forEach(id=>$(id).addEventListener('change',updateCorrelation));$('reset-correlation').addEventListener('click',()=>{$('city').selectedIndex=0;$('xvar').selectedIndex=0;updateCorrelation();});updateCorrelation();}
})();
