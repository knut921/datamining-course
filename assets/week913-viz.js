// Gallery-style charts for weeks 9–13 (PCA hull map, radar small multiples, silhouette, alluvial,
// circular dendrogram, parallel coordinates, tree diagram, Sankey, waffle, ROC, lollipop, hexbin,
// dumbbell, treemap, bump chart). Colours come from the validated CSS tokens in week913.css.
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const fmt=(n,d=1)=>Number(n).toLocaleString('zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct=(p,d=0)=>fmt(100*p,d)+'%';
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const tipA=(v,l='')=>` data-tip="${esc(v)}|${esc(l)}"`;
  const SHORT=['網路','電視','報紙','雜誌','生活滿意','健康滿意','朋友滿意','快樂','自評健康'];

  /* ---------- shared tooltip: value leads, label follows; text inserted with textContent ---------- */
  let tipEl=null;
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
  const put=(id,svg,vb)=>{const el=$(id);if(!el)return null;if(vb)el.setAttribute('viewBox',vb);el.innerHTML=svg;bindTips(el);return el;};
  const legend=(id,items)=>{const el=$(id);if(el)el.innerHTML=items.map(([cls,label,line])=>`<span><i class="${line?'line ':''}${cls}"></i>${esc(label)}</span>`).join('');};
  // legend swatches reuse the series tokens
  const SW=['s1','s2','s3','s4','s5'];
  const style=document.createElement('style');style.textContent=SW.map((s,i)=>`.viz-legend i.c${i}{background:var(--${s})}`).join('')+'.viz-legend i.cx{background:var(--muted-mark)}.viz-legend i.good{background:var(--st-good)}.viz-legend i.warn{background:var(--st-warn)}.viz-legend i.crit{background:var(--st-crit)}.viz-legend i.neg{background:var(--div-neg)}.viz-legend i.pos{background:var(--div-pos)}'+[1,2,3,4,5,6,7].map(i=>`svg .q${i}{fill:var(--seq${i})}.viz-legend i.q${i}{background:var(--seq${i})}`).join('');document.head.append(style);

  // nudge labels apart vertically so none sit closer than `gap` px (keeps their order)
  function spread(items,gap){const a=items.slice().sort((p,q)=>p.y-q.y);for(let i=1;i<a.length;i++)if(a[i].y-a[i-1].y<gap)a[i].y=a[i-1].y+gap;return items;}
  function hull(pts){
    const p=pts.slice().sort((a,b)=>a[0]-b[0]||a[1]-b[1]);if(p.length<3)return p;
    const cr=(o,a,b)=>(a[0]-o[0])*(b[1]-o[1])-(a[1]-o[1])*(b[0]-o[0]),lo=[],up=[];
    for(const q of p){while(lo.length>=2&&cr(lo[lo.length-2],lo[lo.length-1],q)<=0)lo.pop();lo.push(q);}
    for(const q of p.reverse()){while(up.length>=2&&cr(up[up.length-2],up[up.length-1],q)<=0)up.pop();up.push(q);}
    return lo.slice(0,-1).concat(up.slice(0,-1));
  }
  // shape = secondary encoding for cluster identity (circle, square, triangle)
  const shape=(j,x,y,r,cls,t)=>j%3===0?`<circle class="${cls}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r}"${t}/>`:j%3===1?`<rect class="${cls}" x="${(x-r).toFixed(1)}" y="${(y-r).toFixed(1)}" width="${2*r}" height="${2*r}" rx="1.5"${t}/>`:`<path class="${cls}" d="M${x.toFixed(1)} ${(y-r*1.2).toFixed(1)}L${(x+r*1.1).toFixed(1)} ${(y+r*.8).toFixed(1)}L${(x-r*1.1).toFixed(1)} ${(y+r*.8).toFixed(1)}Z"${t}/>`;

  /* ======================= Week 12：分群 ======================= */
  function w12(){
    const d=window.WEEK12_DATA,mode=$('cl-scale').value,k=Number($('cl-k').value),key=mode+'-'+k,lab=d.clusters[key],n=lab.length,F=d.features.length;
    const all=d.features.map((_,j)=>{const v=d.rows.map(r=>r[j]),m=v.reduce((a,b)=>a+b,0)/n;return {m,sd:Math.sqrt(v.reduce((a,b)=>a+(b-m)**2,0)/(n-1))};});
    const z=d.rows.map(r=>r.map((v,j)=>(v-all[j].m)/all[j].sd));
    const groups=[...Array(k).keys()].map(c=>lab.map((l,i)=>l===c?i:-1).filter(i=>i>=0));
    const meanZ=groups.map(g=>d.features.map((_,j)=>g.reduce((s,i)=>s+z[i][j],0)/g.length));
    const desc=i=>`上網 ${d.rows[i][0]} 分、讀報 ${d.rows[i][2]} 分、生活滿意 ${d.rows[i][4]}、自評健康 ${d.rows[i][8]}`;
    legend('cl-legend',groups.map((g,c)=>[`c${c}`,`群 ${c+1}（${g.length} 人）`]));

    // --- PCA map with convex hulls (factoextra::fviz_cluster style); >3 clusters → small multiples ---
    {
      const X=d.pca.x,Y=d.pca.y,minX=Math.min(...X),maxX=Math.max(...X),minY=Math.min(...Y),maxY=Math.max(...Y),arrows=$('pca-arrows').checked;
      const panel=(ox,oy,w,h,focus)=>{let arrowLabels='';
        const sx=v=>ox+18+(v-minX)/(maxX-minX)*(w-36),sy=v=>oy+h-18-(v-minY)/(maxY-minY)*(h-40);let s='';
        s+=`<rect x="${ox+2}" y="${oy+2}" width="${w-4}" height="${h-4}" rx="8" fill="none" class="grid"/><line class="grid" x1="${sx(0)}" x2="${sx(0)}" y1="${oy+8}" y2="${oy+h-8}"/><line class="grid" x1="${ox+8}" x2="${ox+w-8}" y1="${sy(0)}" y2="${sy(0)}"/>`;
        if(arrows&&focus==null){const sc=Math.min(maxX-minX,maxY-minY)*.42,labs=[];d.pca.load.forEach((l,j)=>{const x2=sx(l[0]*sc),y2=sy(l[1]*sc);s+=`<line x1="${sx(0)}" y1="${sy(0)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" style="stroke:var(--ink-soft);stroke-width:1.4;opacity:.85" marker-end="url(#arr)"/>`;labs.push({x:x2+(l[0]>=0?5:-5),y:y2+(l[1]>=0?-5:13),side:l[0]>=0,t:SHORT[j]});});
          [true,false].forEach(side=>spread(labs.filter(e=>e.side===side),13));arrowLabels=labs.map(e=>`<text class="lbl" x="${e.x.toFixed(1)}" y="${e.y.toFixed(1)}" text-anchor="${e.side?'start':'end'}" paint-order="stroke" style="stroke:var(--surface);stroke-width:3px;font-size:11px">${e.t}</text>`).join('');}
        const order=focus==null?groups.map((_,c)=>c):[...groups.keys()].filter(c=>c!==focus).concat([focus]);
        order.forEach(c=>{const on=focus==null||c===focus;const h_=hull(groups[c].map(i=>[sx(X[i]),sy(Y[i])]));if(on)s+=`<path class="hull c${c} k${c}" d="M${h_.map(p=>p.map(v=>v.toFixed(1)).join(' ')).join('L')}Z"/>`;
          groups[c].forEach(i=>{s+=on?shape(focus==null?c:0,sx(X[i]),sy(Y[i]),focus==null?4.2:3.4,`c${c} ring hit`,tipA(`群 ${c+1}`,desc(i))):`<circle class="cx" cx="${sx(X[i]).toFixed(1)}" cy="${sy(Y[i]).toFixed(1)}" r="2.2"/>`;});
          if(on&&focus==null){const top=h_.reduce((a,b)=>b[1]<a[1]?b:a);s+=`<text class="strong" x="${top[0].toFixed(1)}" y="${Math.max(oy+16,top[1]-10).toFixed(1)}" text-anchor="middle" paint-order="stroke" style="stroke:var(--surface);stroke-width:4px;font-size:13px">群 ${c+1}（${groups[c].length} 人）</text>`;}});
        if(focus!=null)s+=`<text class="strong" x="${ox+12}" y="${oy+20}">群 ${focus+1}｜${groups[focus].length} 人</text>`;
        return s+arrowLabels;
      };
      let s=`<title>分群地圖：把 9 個特徵壓成 2 個方向後的位置</title><desc>每個點是一個人，同一群用同色與同形狀；外框是包住該群所有人的範圍。</desc><defs><marker id="arr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8Z" style="fill:var(--ink-soft)"/></marker></defs>`,vb;
      if(k<=3){s+=panel(0,0,660,440,null);vb='0 0 660 440';}
      else{const cols=3,rows=Math.ceil(k/cols);for(let c=0;c<k;c++)s+=panel((c%cols)*220,Math.floor(c/cols)*200,220,200,c);vb=`0 0 660 ${rows*200}`;}
      put('pca-map',s,vb);
      $('pca-note').textContent=`橫軸、縱軸是把 9 個特徵「濃縮」成的兩個方向，共保留約 ${pct(d.pca.var[0]+d.pca.var[1])} 的差異（${pct(d.pca.var[0])}＋${pct(d.pca.var[1])}），所以有些在圖上看起來很近的人，其實在其他方向上差很遠。`+(k>3?' 群數超過 3 時改成「一群一格」：每格只把一群上色，其他人是灰點，避免顏色太多分不清。':' 箭頭表示特徵往哪個方向變大：例如「報紙」箭頭指向的地方，就是讀報時間較長的人。');
    }

    // --- radar small multiples (fmsb::radarchart style), z-score of each cluster mean ---
    {
      const R=78,cols=Math.min(3,k),W=220,H=210;let s='<title>各群的雷達圖</title><desc>每個角是一個特徵；虛線圓是全體平均，往外代表比平均高。</desc>';
      const rad=v=>(Math.max(-1.5,Math.min(1.5,v))+1.5)/3*R;
      groups.forEach((g,c)=>{const ox=(c%cols)*W+W/2,oy=Math.floor(c/cols)*H+H/2+6,ang=j=>-Math.PI/2+j*2*Math.PI/F,pt=(j,r)=>[ox+r*Math.cos(ang(j)),oy+r*Math.sin(ang(j))];
        [-1,1].forEach(v=>s+=`<polygon class="grid" fill="none" points="${[...Array(F).keys()].map(j=>pt(j,rad(v)).map(x=>x.toFixed(1)).join(',')).join(' ')}"/>`);
        s+=`<polygon fill="none" style="stroke:var(--ink-soft);stroke-dasharray:4 3;stroke-width:1.2" points="${[...Array(F).keys()].map(j=>pt(j,rad(0)).map(x=>x.toFixed(1)).join(',')).join(' ')}"/>`;
        for(let j=0;j<F;j++){const [x,y]=pt(j,R),[lx,ly]=pt(j,R+13);s+=`<line class="grid" x1="${ox}" y1="${oy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}"/><text x="${lx.toFixed(1)}" y="${(ly+4).toFixed(1)}" text-anchor="middle" style="font-size:10px">${SHORT[j]}</text>`;}
        s+=`<polygon class="c${c} k${c}" style="fill-opacity:.28;stroke-width:2.2" points="${meanZ[c].map((v,j)=>pt(j,rad(v)).map(x=>x.toFixed(1)).join(',')).join(' ')}"/>`;
        meanZ[c].forEach((v,j)=>{const [x,y]=pt(j,rad(v));s+=`<circle class="c${c} ring hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4.5" tabindex="0"${tipA(`${v>=0?'+':'−'}${fmt(Math.abs(v),2)} 標準差`,`群 ${c+1}｜${SHORT[j]}${v>=0?'高於':'低於'}全體平均`)}/>`;});
        s+=`<text class="strong" x="${ox}" y="${oy-R-22}" text-anchor="middle">群 ${c+1}（${g.length} 人）</text>`;});
      put('radar',s,`0 0 ${cols*W} ${Math.ceil(k/cols)*H+12}`);
    }

    // --- silhouette plot (factoextra::fviz_silhouette style) ---
    {
      const sil=d.sil[key],order=groups.map(g=>g.slice().sort((a,b)=>sil[b]-sil[a])),gap=10,W=600,bw=(W-gap*(k-1))/n,lo=Math.min(-.3,...sil),hi=Math.max(.6,...sil),y=v=>20+(hi-v)/(hi-lo)*200,mean=sil.reduce((a,b)=>a+b,0)/n,neg=sil.filter(v=>v<0).length;
      let s=`<title>輪廓圖：每個人跟自己這群有多「合」</title><desc>長條往上越高代表越適合目前的群；往下（負值）代表其實更像另一群。整體平均 ${fmt(mean,2)}。</desc>`;
      for(let v=Math.ceil(lo*10)/10;v<=hi+1e-9;v+=.2)s+=`<line class="grid" x1="40" x2="${40+W}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="34" y="${y(v)+4}" text-anchor="end">${fmt(v,1)}</text>`;
      let x=40;order.forEach((g,c)=>{const m=g.reduce((a,i)=>a+sil[i],0)/g.length;g.forEach(i=>{const v=sil[i];s+=`<rect class="c${c}" x="${x.toFixed(2)}" y="${Math.min(y(v),y(0)).toFixed(1)}" width="${(bw+.3).toFixed(2)}" height="${Math.abs(y(v)-y(0)).toFixed(1)}"${tipA(fmt(v,2),`群 ${c+1}｜${desc(i)}`)}/>`;x+=bw;});
        s+=`<text class="lbl" x="${(x-g.length*bw/2).toFixed(1)}" y="244" text-anchor="middle">群 ${c+1}｜平均 ${fmt(m,2)}</text>`;x+=gap;});
      s+=`<line x1="40" x2="${40+W}" y1="${y(0)}" y2="${y(0)}" style="stroke:var(--ink-soft)"/><line x1="40" x2="${40+W}" y1="${y(mean)}" y2="${y(mean)}" style="stroke:var(--ink);stroke-dasharray:5 4;stroke-width:1.5"/><text class="strong" x="${42+W}" y="${y(mean)+4}">平均 ${fmt(mean,2)}</text>`;
      put('sil-plot',s,'0 0 700 256');
      $('sil-note').textContent=`${n} 人中有 ${neg} 人的分數小於 0（長條往下）：他們其實比較像另一群，只是被分到這群。整體平均 ${fmt(mean,2)}，${mean<.25?'低於 0.25，群和群之間的界線很模糊。':'看起來較清楚，但要回頭檢查是否被少數極端值撐起來。'}`;
    }

    // --- alluvial: how the same 212 people regroup from k=2 to k=5 (ggalluvial style) ---
    {
      const ks=[2,3,4,5],L=ks.map(kk=>d.clusters[mode+'-'+kk]),H=300,gap=10,colX=[60,240,420,600],nw=18;
      const nodes=ks.map((kk,ci)=>{const sizes=[...Array(kk).keys()].map(c=>L[ci].filter(v=>v===c).length),sc=(H-gap*(kk-1))/n;let y=20;return sizes.map((sz,c)=>{const o={y,h:sz*sc,sz,c,inY:y,outY:y};y+=sz*sc+gap;return o;});});
      let s='<title>換群數時，人怎麼移動？</title><desc>每一欄是一種群數；彩帶表示同一批人從左邊的群移到右邊的哪一群。</desc>';
      for(let ci=0;ci<ks.length-1;ci++){const sc=(H-gap*(ks[ci]-1))/n,sc2=(H-gap*(ks[ci+1]-1))/n;
        for(let a=0;a<ks[ci];a++)for(let b=0;b<ks[ci+1];b++){const cnt=L[ci].filter((v,i)=>v===a&&L[ci+1][i]===b).length;if(!cnt)continue;
          const A=nodes[ci][a],B=nodes[ci+1][b],y0=A.outY,y1=y0+cnt*sc,z0=B.inY,z1=z0+cnt*sc2;A.outY=y1;B.inY=z1;const x0=colX[ci]+nw,x1=colX[ci+1],mx=(x0+x1)/2;
          s+=`<path class="flow c${a}" d="M${x0} ${y0.toFixed(1)}C${mx} ${y0.toFixed(1)} ${mx} ${z0.toFixed(1)} ${x1} ${z0.toFixed(1)}L${x1} ${z1.toFixed(1)}C${mx} ${z1.toFixed(1)} ${mx} ${y1.toFixed(1)} ${x0} ${y1.toFixed(1)}Z"${tipA(`${cnt} 人`,`分 ${ks[ci]} 群時在群 ${a+1} → 分 ${ks[ci+1]} 群時在群 ${b+1}`)}/>`;}}
      nodes.forEach((col,ci)=>{col.forEach(o=>{s+=`<rect class="c${o.c} hit" x="${colX[ci]}" y="${o.y.toFixed(1)}" width="${nw}" height="${o.h.toFixed(1)}" rx="3" tabindex="0"${tipA(`${o.sz} 人`,`分 ${ks[ci]} 群｜群 ${o.c+1}`)}/>`;if(o.h>14)s+=`<text class="lbl" x="${colX[ci]+(ci===3?-6:nw+6)}" y="${(o.y+o.h/2+4).toFixed(1)}" text-anchor="${ci===3?'end':'start'}" paint-order="stroke" style="stroke:var(--surface);stroke-width:3px">群 ${o.c+1}</text>`;});
        s+=`<text class="${ks[ci]===k?'strong':''}" x="${colX[ci]+nw/2}" y="${H+44}" text-anchor="middle">分 ${ks[ci]} 群${ks[ci]===k?'（目前）':''}</text>`;});
      put('alluvial',s,`0 0 660 ${H+56}`);
    }

    // --- circular dendrogram (ggraph / circlize style): Ward tree inside, k-means ring outside ---
    {
      const w=d.ward,N=n,kids={},hgt={},cut=w.cuts[String(k)],kmLab=d.clusters['std-'+k];
      w.merge.forEach(([a,b,h],i)=>{kids[N+i]=[a,b];hgt[N+i]=h;});
      const root=N+w.merge.length-1,order=[];(function walk(v){if(v<N){order.push(v);return;}kids[v].forEach(walk);})(root);
      const ang={},R=190,cx=230,cy=230,hmax=hgt[root],r=v=>v<N?R:R*(1-Math.sqrt(hgt[v]/hmax)),col={};
      order.forEach((v,i)=>ang[v]=-Math.PI/2+(i+.5)/N*2*Math.PI);
      (function place(v){if(v<N){col[v]=cut[v];return;}kids[v].forEach(place);ang[v]=(ang[kids[v][0]]+ang[kids[v][1]])/2;const c0=col[kids[v][0]],c1=col[kids[v][1]];col[v]=c0===c1?c0:-1;})(root);
      const P=(a,rr)=>[cx+rr*Math.cos(a),cy+rr*Math.sin(a)];
      let s='<title>環狀樹狀圖：另一種分群方法（階層式分群）</title><desc>樹枝顏色是階層式分群切成的群；最外圈圓點是 k-means 的分群。兩者顏色越一致，代表兩種方法的看法越接近。</desc>';
      Object.keys(kids).forEach(vs=>{const v=+vs,rv=r(v);kids[v].forEach(ch=>{const [x1,y1]=P(ang[ch],r(ch)),[x2,y2]=P(ang[ch],rv),cl=col[ch]>=0?`k${col[ch]}`:'kx';s+=`<line class="${cl}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" style="stroke-width:1.3"/>`;});
        const a0=ang[kids[v][0]],a1=ang[kids[v][1]],[sx,sy]=P(a0,rv),[ex,ey]=P(a1,rv),cl=col[v]>=0?`k${col[v]}`:'kx';s+=`<path class="${cl}" fill="none" style="stroke-width:1.3" d="M${sx.toFixed(1)} ${sy.toFixed(1)}A${rv.toFixed(1)} ${rv.toFixed(1)} 0 ${Math.abs(a1-a0)>Math.PI?1:0} ${a1>a0?1:0} ${ex.toFixed(1)} ${ey.toFixed(1)}"/>`;});
      order.forEach(v=>{const [x,y]=P(ang[v],R+10);s+=`<circle class="c${kmLab[v]} hit" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2"${tipA(`k-means 群 ${kmLab[v]+1}`,`階層式群 ${cut[v]+1}｜${desc(v)}`)}/>`;});
      const agree=cut.filter((v,i)=>v===kmLab[i]).length;
      s+=`<text class="strong" x="${cx}" y="${cy-6}" text-anchor="middle">兩種方法</text><text class="strong" x="${cx}" y="${cy+12}" text-anchor="middle">${agree} / ${N} 人同群</text>`;
      put('dendro',s,'0 0 460 460');
      $('dendro-note').textContent=`分 ${k} 群時，階層式分群和 k-means 只有 ${agree} 人（${pct(agree/N)}）分在對應的同一群，相似度（ARI）${fmt(w.ari[String(k)],2)}。兩種合理的方法給出不太一樣的答案，代表這份資料裡「群」的界線本來就不明顯。`+(mode==='raw'?' （環狀樹一律使用統一尺度後的資料。）':'');
    }

    // --- parallel coordinates (GGally::ggparcoord style); hover a cluster mean to highlight its members ---
    {
      const x=j=>40+j*(580/(F-1)),y=v=>30+(2.5-Math.max(-2.5,Math.min(2.5,v)))/5*230;
      let s='<title>平行座標圖：每個人 9 個特徵的高低</title><desc>每條細線是一個人，粗線是各群平均；把滑鼠移到粗線上，可以看出這群人的線落在哪裡。</desc>';
      for(let j=0;j<F;j++)s+=`<line class="grid" x1="${x(j)}" x2="${x(j)}" y1="30" y2="260"/><text class="lbl" x="${x(j)}" y="280" text-anchor="middle">${SHORT[j]}</text>`;
      [-2,0,2].forEach(v=>s+=`<text class="tick" x="30" y="${y(v)+4}" text-anchor="end">${v>0?'+':''}${v}</text>`);
      s+='<g class="pc-lines">'+z.map((row,i)=>`<polyline data-c="${lab[i]}" fill="none" class="kx" style="stroke-width:.7;opacity:.45" points="${row.map((v,j)=>x(j).toFixed(1)+','+y(v).toFixed(1)).join(' ')}"/>`).join('')+'</g>';
      const ends=spread(meanZ.map((m,c)=>({c,y:y(m[F-1])+4})),13);
      meanZ.forEach((m,c)=>{s+=`<polyline class="k${c} hit pc-mean" data-c="${c}" fill="none" tabindex="0" style="stroke-width:4;stroke-linejoin:round" points="${m.map((v,j)=>x(j).toFixed(1)+','+y(v).toFixed(1)).join(' ')}"${tipA(`群 ${c+1}`,`${groups[c].length} 人；粗線是平均，移開滑鼠恢復`)}/><text class="strong" x="${x(F-1)+6}" y="${ends[c].y.toFixed(1)}">群 ${c+1}</text>`;});
      const el=put('parcoord',s,'0 0 680 292');
      if(el&&!el.dataset.hl){el.dataset.hl='1';const hl=c=>el.querySelectorAll('.pc-lines polyline').forEach(p=>{const on=c!=null&&p.dataset.c===c;p.setAttribute('class',on?'k'+c:'kx');p.style.opacity=c==null?.45:on?.6:.12;});
        el.addEventListener('pointerover',e=>{const m=e.target.closest('.pc-mean');if(m)hl(m.dataset.c);});el.addEventListener('pointerout',e=>{if(e.target.closest('.pc-mean'))hl(null);});
        el.addEventListener('focusin',e=>{const m=e.target.closest('.pc-mean');if(m)hl(m.dataset.c);});el.addEventListener('focusout',()=>hl(null));}
    }
    window.week12Viz={key,k,hulls:groups.length,silNeg:d.sil[key].filter(v=>v<0).length};
  }
  if($('pca-map')){['cl-k','cl-scale','pca-arrows'].forEach(id=>$(id).addEventListener('change',w12));$('reset-cl').addEventListener('click',()=>setTimeout(w12));w12();}

  /* ======================= Week 11：分類與決策樹 ======================= */
  const Q={'收入足夠日常開支':['收入夠用嗎？','不夠用','夠用'],'健康滿意度':['對健康滿意嗎？','不滿意','滿意'],'女性':['性別？','男性','女性'],'近期快樂程度':['最近快樂嗎？','不快樂','快樂'],'朋友關係滿意度':['朋友關係滿意嗎？','不滿意','滿意'],'覺得生活沒有希望':['常覺得沒希望嗎？','較少','較常']};
  const branch=(f,t,left)=>Q[f]?Q[f][left?1:2]:f==='每日使用網路分鐘'?(left?`上網 ≤${fmt(t,0)} 分`:`上網 ＞${fmt(t,0)} 分`):f==='年齡'?(left?`${Math.floor(t)} 歲以下`:`${Math.ceil(t)} 歲以上`):(left?'≤':'＞')+fmt(t,1);
  const question=f=>Q[f]?Q[f][0]:f==='每日使用網路分鐘'?'每天上網多久？':f==='年齡'?'幾歲？':f;
  const heat=rate=>`color-mix(in srgb,var(--s2) ${Math.round(8+Math.min(1,rate/.6)*72)}%,var(--surface))`;
  function treeViz(){
    const d=window.WEEK11_DATA,depth=$('tree-depth').value,th=Number($('tree-th').value),t=d.trees[depth],N=t.root.n;
    // node-link diagram (rpart.plot style): colour = share of low satisfaction, edge width = people
    const leaves=[];(function lay(v,dep){v.dep=dep;if(!v.feature){v.x=leaves.length;leaves.push(v);return;}lay(v.left,dep+1);lay(v.right,dep+1);v.x=(v.left.x+v.right.x)/2;})(t.root,0);
    const W=Math.max(660,leaves.length*124),colW=W/leaves.length,X=v=>colW*(v.x+.5),Y=v=>24+v.dep*118,bw=112,bh=70;let s='<title>決策樹</title><desc>每個方塊是一群人，顏色越橘代表其中對生活不滿意的比例越高；連線越粗代表走這條路的人越多。</desc>',e='';
    (function draw(v){if(v.feature){[[v.left,true],[v.right,false]].forEach(([ch,left])=>{const x1=X(v),y1=Y(v)+bh,x2=X(ch),y2=Y(ch),my=(y1+y2)/2;e+=`<path d="M${x1} ${y1}C${x1} ${my} ${x2} ${my} ${x2} ${y2}" fill="none" style="stroke:var(--muted-mark);stroke-width:${(1.5+12*ch.n/N).toFixed(1)}"/><text class="lbl" x="${((x1+x2)/2+(left?-6:6)).toFixed(1)}" y="${my+4}" text-anchor="${left?'end':'start'}" paint-order="stroke" style="stroke:var(--surface);stroke-width:4px">${esc(branch(v.feature,v.threshold,left))}</text>`;draw(ch);});}
      const rate=v.pos/v.n,flag=!v.feature&&rate>=th-1e-12,x=X(v)-bw/2,y=Y(v);
      s+=`<g class="${v.feature?'node':'leaf'} hit" tabindex="0"${tipA(`${pct(rate)} 對生活不滿意`,`${v.n} 人中 ${v.pos} 人｜占全部 ${pct(v.n/N)}${v.feature?'':flag?'｜會被標記':'｜不標記'}`)}><rect x="${x}" y="${y}" width="${bw}" height="${bh}" rx="9" style="fill:${heat(rate)};stroke:${flag?'var(--ink)':'var(--line)'};stroke-width:${flag?2.5:1}"/>`;
      s+=`<text class="strong" x="${X(v)}" y="${y+18}" text-anchor="middle">${esc(v.feature?question(v.feature):flag?'→ 標記要關心':'不標記')}</text><text class="lbl" x="${X(v)}" y="${y+36}" text-anchor="middle">不滿意 ${pct(rate)}</text><text x="${X(v)}" y="${y+51}" text-anchor="middle">${v.n} 人（${pct(v.n/N)}）</text>`;
      s+=`<rect x="${x+10}" y="${y+57}" width="${bw-20}" height="6" rx="3" class="cx"/><rect x="${x+10}" y="${y+57}" width="${Math.max(2,(bw-20)*rate).toFixed(1)}" height="6" rx="3" class="c1"/></g>`;})(t.root);
    put('tree-view-svg',e+s,`0 0 ${W} ${24+Math.max(...leaves.map(l=>l.dep))*118+bh+10}`);
    // Sankey: 212 people flowing through the questions, split by actual answer
    const cols=[];let level=[t.root];while(true){cols.push(level);if(!level.some(v=>v.feature))break;level=level.flatMap(v=>v.feature?[v.left,v.right]:[v]);}
    // Sankey: nodes are neutral bars; flows leave each node grouped by branch, then by actual answer (fewer crossings)
    (function tag(v,label){v.lab=label;if(v.feature){tag(v.left,branch(v.feature,v.threshold,true));tag(v.right,branch(v.feature,v.threshold,false));}})(t.root,'全部');
    const H=300,gap=22,top=40,cx=cols.map((_,i)=>20+i*(470/(cols.length-1))),nw=14;let sk='<title>人怎麼一路被分下去</title><desc>橘色彩帶是對生活不滿意的人，藍色是其他人；每一欄是多問一個問題後的分組。</desc>';
    const pos=cols.map(col=>{const sc=(H-gap*(col.length-1))/N;let y=top;return col.map(v=>{const o={v,y,h:v.n*sc,sc,out:y,inP:y,inN:y+v.pos*sc};y+=v.n*sc+gap;return o;});});
    for(let ci=0;ci<cols.length-1;ci++){pos[ci].forEach(A=>{const kids=A.v.feature?[A.v.left,A.v.right]:[A.v];kids.forEach(ch=>{const B=pos[ci+1].find(o=>o.v===ch);[['c1',ch.pos,'inP'],['c0',ch.n-ch.pos,'inN']].forEach(([cl,cnt,ik])=>{if(!cnt)return;const y0=A.out,y1=y0+cnt*A.sc,z0=B[ik],z1=z0+cnt*B.sc;A.out=y1;B[ik]=z1;const x0=cx[ci]+nw,x1=cx[ci+1],m=(x0+x1)/2;
      sk+=`<path class="flow ${cl}" d="M${x0} ${y0.toFixed(1)}C${m} ${y0.toFixed(1)} ${m} ${z0.toFixed(1)} ${x1} ${z0.toFixed(1)}L${x1} ${z1.toFixed(1)}C${m} ${z1.toFixed(1)} ${m} ${y1.toFixed(1)} ${x0} ${y1.toFixed(1)}Z"${tipA(`${cnt} 人`,`${cl==='c1'?'對生活不滿意':'其他人'}｜走向「${ch.lab}」`)}/>`;});});});}
    const heads=['全部 212 人'].concat(cols.slice(1).map((col,i)=>{const f=cols[i].find(v=>v.feature);return `第 ${i+1} 問：${f?question(f.feature):''}`;}));
    pos.forEach((col,ci)=>{sk+=`<text class="strong" x="${cx[ci]+(ci===cols.length-1?0:0)}" y="16">${esc(heads[ci])}</text>`;col.forEach(o=>{sk+=`<rect class="cx hit" x="${cx[ci]}" y="${o.y.toFixed(1)}" width="${nw}" height="${o.h.toFixed(1)}" rx="3" style="fill:var(--ink-soft)" tabindex="0"${tipA(`${o.v.n} 人`,`${o.v.lab}｜不滿意 ${pct(o.v.pos/o.v.n)}`)}/>`;if(ci===cols.length-1)sk+=`<text class="lbl" x="${cx[ci]+nw+6}" y="${(o.y+Math.min(o.h/2,14)+4).toFixed(1)}">${esc(o.v.lab)}｜${o.v.n} 人｜不滿意 ${pct(o.v.pos/o.v.n)}</text>`;else if(ci>0)sk+=`<text x="${cx[ci]}" y="${(o.y-5).toFixed(1)}" style="font-size:10.5px" paint-order="stroke" stroke="var(--surface)" stroke-width="3">${esc(o.v.lab)}・${o.v.n} 人</text>`;});});
    put('tree-sankey',sk,`0 0 760 ${H+top+10}`);legend('tree-legend',[['c1','對生活不滿意'],['c0','其他人']]);
    window.week11TreeViz={leaves:leaves.length,cols:cols.length};
  }
  function thresholdViz(){
    const d=window.WEEK11_DATA,th=Number($('th').value),rows=d.rows.slice().sort((a,b)=>a[2]-b[2]||b[3]-a[3]);
    // waffle: 212 squares, one per person
    const cat=r=>{const p=r[3]>=th-1e-12;return r[2]?(p?'tp':'fn'):(p?'fp':'tn');},order={tp:0,fn:1,fp:2,tn:3},cls={tp:'st-good',fn:'st-crit',fp:'st-warn',tn:'st-none'},name={tp:'找對了 ✓',fn:'漏掉了 ✗',fp:'誤會了 ✗',tn:'正確排除 ✓'};
    const cats=rows.map(cat).sort((a,b)=>order[a]-order[b]),cnt={tp:0,fn:0,fp:0,tn:0};cats.forEach(c=>cnt[c]++);
    let s='<title>212 人的對錯格子圖</title><desc>每一格是一個人。</desc>';cats.forEach((c,i)=>{const x=(i%27)*24,y=Math.floor(i/27)*24;s+=`<rect class="${cls[c]}" x="${x}" y="${y}" width="21" height="21" rx="4"${tipA(name[c],`這一類共 ${cnt[c]} 人`)}/>`;});
    put('waffle',s,`0 0 ${27*24} ${Math.ceil(212/27)*24}`);
    legend('waffle-legend',[['good',`找對了 ✓ ${cnt.tp} 人`],['crit',`漏掉了 ✗ ${cnt.fn} 人`],['warn',`誤會了 ✗ ${cnt.fp} 人`],['cx',`正確排除 ✓ ${cnt.tn} 人`]]);
    // ROC curve + recall/precision vs threshold (two panels, each its own axes)
    const P=d.rows.filter(r=>r[2]).length,Nn=d.rows.length-P,ths=[...new Set(d.rows.map(r=>r[3]))].sort((a,b)=>b-a);
    const roc=[[0,0]].concat(ths.map(t=>{let tp=0,fp=0;d.rows.forEach(r=>{if(r[3]>=t){r[2]?tp++:fp++;}});return [fp/Nn,tp/P];}));
    const at=t=>{let tp=0,fp=0;d.rows.forEach(r=>{if(r[3]>=t-1e-12){r[2]?tp++:fp++;}});return {rec:tp/P,prec:tp+fp?tp/(tp+fp):NaN,fpr:fp/Nn};},cur=at(th);
    const ox=40,sz=230,rx=v=>ox+v*sz,ry=v=>20+(1-v)*sz;let g=`<title>ROC 曲線與門檻曲線</title><desc>左：ROC 曲線，越貼近左上角越好；右：門檻改變時，召回率與精確率的變化。</desc>`;
    for(let i=0;i<=4;i++){const v=i/4;g+=`<line class="grid" x1="${rx(0)}" x2="${rx(1)}" y1="${ry(v)}" y2="${ry(v)}"/><line class="grid" x1="${rx(v)}" x2="${rx(v)}" y1="${ry(0)}" y2="${ry(1)}"/><text class="tick" x="${rx(0)-6}" y="${ry(v)+4}" text-anchor="end">${pct(v)}</text><text class="tick" x="${rx(v)}" y="${ry(0)+16}" text-anchor="middle">${pct(v)}</text>`;}
    g+=`<line x1="${rx(0)}" y1="${ry(0)}" x2="${rx(1)}" y2="${ry(1)}" style="stroke:var(--muted-mark);stroke-dasharray:5 4"/><path d="M${rx(0)} ${ry(0)}L${roc.map(p=>rx(p[0]).toFixed(1)+' '+ry(p[1]).toFixed(1)).join('L')}L${rx(1)} ${ry(0)}Z" class="c0" style="fill-opacity:.12"/><polyline fill="none" class="k0" style="stroke-width:2.5" points="${roc.map(p=>rx(p[0]).toFixed(1)+','+ry(p[1]).toFixed(1)).join(' ')}"/>`;
    g+=`<circle class="c1 ring hit" cx="${rx(cur.fpr)}" cy="${ry(cur.rec)}" r="7" tabindex="0"${tipA(`門檻 ${fmt(th,2)}`,`誤會比例 ${pct(cur.fpr)}｜找到 ${pct(cur.rec)}`)}/><text class="strong" x="${rx(cur.fpr)+10}" y="${ry(cur.rec)+16}">目前門檻</text>`;
    g+=`<text class="lbl" x="${rx(.5)}" y="${ry(0)+34}" text-anchor="middle">被誤會的比例（187 人中）</text><text class="lbl" x="${rx(.62)}" y="${ry(.18)}" text-anchor="middle">整體分數 AUC ${fmt(d.auc,2)}</text><text class="lbl" x="${ox}" y="12">找到的比例（25 人中）</text>`;
    const ox2=370,tx=v=>ox2+v/.6*250;
    for(let i=0;i<=4;i++){const v=i/4;g+=`<line class="grid" x1="${tx(0)}" x2="${tx(.6)}" y1="${ry(v)}" y2="${ry(v)}"/><text class="tick" x="${tx(0)-6}" y="${ry(v)+4}" text-anchor="end">${pct(v)}</text>`;}
    const grid=[];for(let t=.05;t<=.6001;t+=.05)grid.push([+t.toFixed(2),at(t)]);
    [0,.1,.2,.3,.4,.5,.6].forEach(v=>g+=`<text class="tick" x="${tx(v)}" y="${ry(0)+16}" text-anchor="middle">${fmt(v,1)}</text>`);
    g+=`<polyline fill="none" class="k0" style="stroke-width:2.5" points="${grid.map(([t,a])=>tx(t).toFixed(1)+','+ry(a.rec).toFixed(1)).join(' ')}"/><polyline fill="none" class="k1" style="stroke-width:2.5" points="${grid.map(([t,a])=>tx(t).toFixed(1)+','+ry(a.prec).toFixed(1)).join(' ')}"/>`;
    const last=grid[grid.length-1][1];g+=`<text class="strong" x="${tx(.6)+4}" y="${ry(last.rec)+4}">召回率</text><text class="strong" x="${tx(.6)+4}" y="${ry(last.prec)+4}">精確率</text>`;
    g+=`<line x1="${tx(th)}" x2="${tx(th)}" y1="${ry(1)}" y2="${ry(0)}" style="stroke:var(--ink);stroke-dasharray:5 4;stroke-width:1.5"/><circle class="c0 ring" cx="${tx(th)}" cy="${ry(cur.rec)}" r="6"/><circle class="c1 ring" cx="${tx(th)}" cy="${ry(cur.prec)}" r="6"/>`;
    g+=grid.map(([t,a])=>`<rect x="${(tx(t)-11).toFixed(1)}" y="${ry(1)}" width="22" height="${sz}" fill="transparent"${tipA(`門檻 ${fmt(t,2)}`,`召回率 ${pct(a.rec)}｜精確率 ${pct(a.prec)}`)}/>`).join('');
    g+=`<text class="lbl" x="${tx(.3)}" y="${ry(0)+34}" text-anchor="middle">標記門檻</text>`;
    put('roc-pr',g,'0 0 700 300');legend('roc-legend',[['c0','ROC 曲線／召回率',true],['c1','精確率',true]]);
    window.week11Viz={th,...cnt};
  }
  function coefViz(){
    const d=window.WEEK11_DATA,c=Object.entries(d.coef).sort((a,b)=>a[1]-b[1]),max=Math.max(...c.map(e=>Math.abs(e[1]))),x=v=>330+v/max*210;
    let s='<title>每個欄位的影響力</title><desc>往左（藍）代表數值越高越不像對生活不滿意，往右（紅）代表越像。</desc>';
    s+=`<line x1="${x(0)}" x2="${x(0)}" y1="8" y2="${c.length*32+12}" style="stroke:var(--ink-soft)"/>`;
    c.forEach(([k,v],i)=>{const y=26+i*32,cl=v<0?'neg':'pos';s+=`<text class="lbl" x="110" y="${y+4}" text-anchor="end">${esc(k)}</text><line x1="${x(0)}" x2="${x(v).toFixed(1)}" y1="${y}" y2="${y}" style="stroke:var(--div-${cl});stroke-width:2"/><circle cx="${x(v).toFixed(1)}" cy="${y}" r="7" class="ring hit" style="fill:var(--div-${cl})" tabindex="0"${tipA(`${v>0?'+':'−'}${fmt(Math.abs(v),2)}`,`${k}：${v<0?'越高越不像「不滿意」':'越高越像「不滿意」（數字小，別過度解讀）'}`)}/><text x="${x(v).toFixed(1)}" y="${y-11}" text-anchor="middle" style="font-size:10.5px">${v>0?'+':'−'}${fmt(Math.abs(v),2)}</text>`;});
    put('coef-lollipop',s,`0 0 660 ${c.length*32+20}`);legend('coef-legend',[['neg','越高越不像「不滿意」'],['pos','越高越像「不滿意」']]);
  }
  if($('tree-view-svg')){['tree-depth','tree-th'].forEach(id=>$(id).addEventListener('change',treeViz));treeViz();}
  if($('waffle')){$('th').addEventListener('input',thresholdViz);$('reset-th').addEventListener('click',()=>setTimeout(thresholdViz));thresholdViz();coefViz();}

  /* ======================= Week 10：迴歸 ======================= */
  function hexbin(){
    const d=window.WEEK10_DATA,box=$('reg-scatter');if(!box||$('scatter-mode').value!=='hex')return;
    const x=v=>50+v/160*570,y=v=>230-Math.min(v,400000)/400000*210,r=7,cnt=new Map(),sum=new Map();
    d.rows.forEach(row=>{const px=x(row[0]),py=y(row[8]),q=(Math.sqrt(3)/3*px-py/3)/r,rr=2/3*py/r;let rx=Math.round(q),rz=Math.round(rr),ry=Math.round(-q-rr);const dx=Math.abs(rx-q),dz=Math.abs(rz-rr),dy=Math.abs(ry-(-q-rr));if(dx>dy&&dx>dz)rx=-ry-rz;else if(dz>=dy)rz=-rx-ry;const k=rx+','+rz;cnt.set(k,(cnt.get(k)||0)+1);const s=sum.get(k)||[0,0];s[0]+=row[0];s[1]+=row[8];sum.set(k,s);});
    const steps=[1,3,10,30,100,300],cls=v=>'q'+(1+steps.filter(s=>v>=s).length);
    let s=box.innerHTML.replace(/<g class="dots">[\s\S]*?<\/g>/,'').replace(/<g class="hex">[\s\S]*?<\/g>/,'');
    let h='<g class="hex">';cnt.forEach((v,k)=>{const [q,z]=k.split(',').map(Number),cx=r*Math.sqrt(3)*(q+z/2),cy=r*1.5*z,pts=[...Array(6).keys()].map(i=>{const a=Math.PI/180*(60*i-30);return (cx+r*Math.cos(a)).toFixed(1)+','+(cy+r*Math.sin(a)).toFixed(1);}).join(' '),sm=sum.get(k);
      h+=`<polygon class="${cls(v)}" points="${pts}"${tipA(`${v} 間`,`平均約 ${fmt(sm[0]/v,0)} 坪、月租約 ${fmt(sm[1]/v/10000,1)} 萬元`)}/>`;});
    h+='</g>';s=s.replace(/(<line class="fit-line")/,h+'$1');box.innerHTML=s;bindTips(box);
    legend('hex-legend',[['q1','1–2 間'],['q2','3–9'],['q3','10–29'],['q4','30–99'],['q5','100–299'],['q6','300 間以上']]);
    window.week10Hex={bins:cnt.size,total:[...cnt.values()].reduce((a,b)=>a+b,0)};
  }
  function districtLollipop(){
    const d=window.WEEK10_DATA,m=window.W10fit({age:true,floor:true,region:'district',type:true,elev:false,rt:false}),base=d.districts[0];
    const list=d.districts.map((n,i)=>({n,city:i>=d.taipeiStart?1:0,v:i?m.beta[m.cols.findIndex(c=>c.name.startsWith(n+'（'))]:0})).sort((a,b)=>b.v-a.v),max=Math.max(...list.map(e=>e.v)),min=Math.min(...list.map(e=>e.v)),x=v=>150+(v-min)/(max-min)*440;
    let s='<title>各行政區的租金差距</title><desc>面積、屋齡、樓層、建物型態都相同時，各區比淡水區平均貴多少。</desc>';
    for(let v=Math.ceil(min/5000)*5000;v<=max;v+=5000)s+=`<line class="grid" x1="${x(v)}" x2="${x(v)}" y1="10" y2="${list.length*17+14}"/><text class="tick" x="${x(v)}" y="${list.length*17+28}" text-anchor="middle">${v>0?'+':v<0?'−':''}${fmt(Math.abs(v)/10000,1)} 萬</text>`;
    list.forEach((e,i)=>{const y=18+i*17;s+=`<text class="lbl" x="140" y="${y+4}" text-anchor="end">${e.n}</text><line x1="${x(0)}" x2="${x(e.v).toFixed(1)}" y1="${y}" y2="${y}" class="k${e.city}" style="stroke-width:2"/><circle cx="${x(e.v).toFixed(1)}" cy="${y}" r="5.5" class="c${e.city} ring hit"${tipA(`${e.v>=0?'+':'−'}${fmt(Math.abs(e.v),0)} 元`,`${e.city?'臺北市':'新北市'} ${e.n}｜跟淡水區比`)}/>`;if(i<3||i>=list.length-3)s+=`<text class="strong" x="${(Math.max(x(e.v),x(0))+10).toFixed(1)}" y="${y+4}">${e.v>=0?'+':'−'}${fmt(Math.abs(e.v),0)}</text>`;});
    put('dist-lollipop',s,`0 0 660 ${list.length*17+44}`);legend('dist-legend',[['c0','新北市'],['c1','臺北市']]);
    window.week10Dist={n:list.length,top:list[0].n,base};
  }
  if($('dist-lollipop')){const go=()=>{if(window.W10fit){districtLollipop();hexbin();}};$('scatter-mode').addEventListener('change',()=>{window.W10scatter&&window.W10scatter();hexbin();});go();}

  /* ======================= Week 9：啞鈴圖 ======================= */
  const PAIRS={sex:['女性','男性'],age:['19–21 歲','22–24 歲'],net:['上網 ≤240 分鐘','上網 ＞240 分鐘'],study:['仍在學','已畢業']};
  const OUTN={health:'對健康滿意',life:'對生活滿意',friends:'朋友關係滿意',happy:'最近快樂',goodhealth:'自評健康好',income:'收入夠用'};
  function dumbbell(){
    const g=$('f-group').value,w=$('f-weight').value==='weighted',[a,b]=PAIRS[g],x=v=>170+(v-.4)/.6*440;
    let s=`<title>六個指標的兩組比較</title><desc>每一列是一個指標，兩個點分別是${a}與${b}的比例，中間的線越長，差距越大。</desc>`;
    for(let v=.4;v<=1.0001;v+=.1)s+=`<line class="grid" x1="${x(v)}" x2="${x(v)}" y1="8" y2="${6*40+6}"/><text class="tick" x="${x(v)}" y="${6*40+22}" text-anchor="middle">${pct(v)}</text>`;
    Object.keys(OUTN).forEach((o,i)=>{const r=window.W9rates(o,g,w),A=r.find(e=>e.l===a),B=r.find(e=>e.l===b),y=24+i*40,big=Math.abs(A.p-B.p)>=.05;
      s+=`<text class="lbl" x="160" y="${y+4}" text-anchor="end">${OUTN[o]}</text><line x1="${x(A.p).toFixed(1)}" x2="${x(B.p).toFixed(1)}" y1="${y}" y2="${y}" style="stroke:var(--muted-mark);stroke-width:${big?5:3};stroke-linecap:round"/>`;
      [[A,0],[B,1]].forEach(([e,c])=>{s+=`<circle class="c${c} ring hit" cx="${x(e.p).toFixed(1)}" cy="${y}" r="8" tabindex="0"${tipA(pct(e.p,1),`${OUTN[o]}｜${e.l}（${e.n} 人）`)}/>`;});
      const left=A.p<B.p?A:B,right=A.p<B.p?B:A;s+=`<text x="${(x(left.p)-12).toFixed(1)}" y="${y+4}" text-anchor="end">${pct(left.p)}</text><text x="${(x(right.p)+12).toFixed(1)}" y="${y+4}">${pct(right.p)}</text>`;});
    put('dumbbell',s,'0 0 660 276');legend('dumbbell-legend',[['c0',a],['c1',b]]);
    $('dumbbell-note').textContent=(g==='study'?'學業狀態只比較「仍在學」和「已畢業」兩組（人數較多）。':'')+'灰線越粗，代表兩組相差 5 個百分點以上；有沒有「確定的差距」仍要看上方發現卡的可能範圍。';
  }
  if($('dumbbell')){['f-group','f-weight'].forEach(id=>$(id).addEventListener('change',dumbbell));$('reset-finding').addEventListener('click',()=>setTimeout(dumbbell));dumbbell();}

  /* ======================= Week 13：樹狀矩形圖、排名變化圖 ======================= */
  function squarify(items,x,y,w,h){
    const out=[],total=items.reduce((a,b)=>a+b.v,0);let rest=items.slice(),X=x,Y=y,W=w,H=h,sum=total;
    while(rest.length){const short=Math.min(W,H),scale=W*H/sum;let row=[],best=Infinity;
      for(const it of rest){const r=row.concat([it]),s=r.reduce((a,b)=>a+b.v,0)*scale,worst=Math.max(...r.map(e=>Math.max(short*short*e.v*scale/(s*s),s*s/(short*short*e.v*scale))));if(worst>best)break;best=worst;row=r;}
      const s=row.reduce((a,b)=>a+b.v,0)*scale,thick=s/short;let off=0;
      row.forEach(e=>{const len=e.v*scale/thick;out.push(W>=H?{...e,x:X,y:Y+off,w:thick,h:len}:{...e,x:X+off,y:Y,w:len,h:thick});off+=len;});
      if(W>=H){X+=thick;W-=thick;}else{Y+=thick;H-=thick;}sum-=row.reduce((a,b)=>a+b.v,0);rest=rest.slice(row.length);}
    return out;
  }
  function words(){
    const d=window.WEEK13_DATA,drop=new Set();if($('wf-stop').checked)d.stop.forEach(w=>drop.add(w));if($('wf-domain').checked)d.domain.forEach(w=>drop.add(w));
    $('wf-custom').value.split(/[,，、\s]+/).filter(Boolean).forEach(w=>drop.add(w.trim()));
    const by=$('wf-measure').value==='df'?2:1,dict=$('wf-dict').value,field=$('wf-field').value,year=$('wf-year').value;
    // treemap: area = chosen measure, colour = average repeats per proposal (sequential)
    const top=d.lists[`${dict}-${field}-${year}`].filter(r=>!drop.has(r[0])).sort((a,b)=>b[by]-a[by]).slice(0,30),rep=top.map(r=>r[1]/r[2]),steps=[1.1,1.3,1.6,2,3,5],cls=v=>'q'+(1+steps.filter(s=>v>=s).length);
    let s='<title>前 30 名詞的樹狀矩形圖</title><desc>方塊越大代表越常出現；顏色越深代表同一件提案裡重複寫越多次。</desc>';
    squarify(top.map((r,i)=>({t:r[0],v:r[by],tf:r[1],df:r[2],rep:rep[i]})),0,0,660,330).forEach(e=>{const fs=Math.max(10,Math.min(26,Math.min(e.w/(e.t.length+.6),e.h*.5)))+'px',dark=e.rep>=2;
      s+=`<g class="hit"${tipA(`${fmt(e.tf,0)} 次`,`「${e.t}」出現在 ${fmt(e.df,0)} 件提案｜平均每件 ${fmt(e.rep,1)} 次`)}><rect class="${cls(e.rep)}" x="${(e.x+1).toFixed(1)}" y="${(e.y+1).toFixed(1)}" width="${Math.max(0,e.w-2).toFixed(1)}" height="${Math.max(0,e.h-2).toFixed(1)}" rx="4"/>${e.w>28&&e.h>18?`<text x="${(e.x+6).toFixed(1)}" y="${(e.y+6+parseFloat(fs)).toFixed(1)}" style="font-size:${fs};font-weight:700;fill:${dark?'var(--surface)':'var(--ink)'}">${esc(e.t)}</text>`:''}</g>`;});
    put('wf-treemap',s,'0 0 660 330');legend('treemap-legend',[['q1','每件約 1 次'],['q3','1.3–1.6 次'],['q5','2–3 次'],['q7','5 次以上（少數提案一直重複）']]);
    // bump chart: rank of the leading words in each year (ggbump style), highlight on hover
    const years=['2020','2021','2022','2023','2024'],ranks=years.map(y=>{const l=d.lists[`${dict}-${field}-${y}`].filter(r=>!drop.has(r[0])).sort((a,b)=>b[by]-a[by]).slice(0,12);return new Map(l.map((r,i)=>[r[0],i+1]));});
    const cnt=new Map();ranks.forEach(m=>m.forEach((rk,w)=>{if(rk<=6)cnt.set(w,(cnt.get(w)||0)+1);}));
    const chosen=[...cnt.keys()].sort((a,b)=>cnt.get(b)-cnt.get(a)||(ranks[4].get(a)||99)-(ranks[4].get(b)||99)).slice(0,9),hiW=chosen.slice().sort((a,b)=>(ranks[4].get(a)||99)-(ranks[4].get(b)||99)).slice(0,3);
    const X=i=>70+i*130,Y=r=>20+(r-1)*24;let b='<title>每年前 12 名的排名變化</title><desc>每條線是一個詞，越上面排名越前；彩色的是 2024 年前三名。</desc>';
    for(let r=1;r<=12;r++)b+=`<text class="tick" x="50" y="${Y(r)+4}" text-anchor="end">第 ${r}</text>`;years.forEach((y,i)=>b+=`<line class="grid" x1="${X(i)}" x2="${X(i)}" y1="10" y2="${Y(12)+10}"/><text class="lbl" x="${X(i)}" y="${Y(12)+30}" text-anchor="middle">${y}</text>`);
    chosen.forEach(w=>{const h=hiW.indexOf(w),pts=years.map((_,i)=>[i,ranks[i].get(w)]).filter(p=>p[1]);if(!pts.length)return;const cls_=h>=0?`k${h}`:'kx';
      let path='';pts.forEach((p,j)=>{const x=X(p[0]),y=Y(p[1]);if(!j||pts[j-1][0]!==p[0]-1)path+=`M${x} ${y}`;else{const px=X(pts[j-1][0]),py=Y(pts[j-1][1]);path+=`C${px+60} ${py} ${x-60} ${y} ${x} ${y}`;}});
      b+=`<g class="bump hit" data-w="${esc(w)}" tabindex="0"${tipA(w,pts.map(p=>`${years[p[0]]} 第 ${p[1]}`).join('、'))}><path d="${path}" fill="none" class="${cls_}" style="stroke-width:${h>=0?4:2.5};stroke-linecap:round"/>${pts.map(p=>`<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="${h>=0?7:5}" class="${h>=0?'c'+h:'cx'} ring"/>`).join('')}`;
      const L=pts[pts.length-1],F=pts[0];b+=`<text class="${h>=0?'strong':''}" x="${X(L[0])+12}" y="${Y(L[1])+4}">${esc(w)}</text>${F[0]===0?`<text class="${h>=0?'strong':''}" x="${X(0)-12}" y="${Y(F[1])+4}" text-anchor="end" style="display:none">${esc(w)}</text>`:''}</g>`;});
    const el=put('wf-bump',b,`0 0 700 ${Y(12)+40}`);
    if(el&&!el.dataset.hl){el.dataset.hl='1';const hl=w=>el.querySelectorAll('.bump').forEach(g=>g.classList.toggle('dim',w!=null&&g.dataset.w!==w));el.addEventListener('pointerover',e=>{const g=e.target.closest('.bump');hl(g?g.dataset.w:null);});el.addEventListener('pointerleave',()=>hl(null));el.addEventListener('focusin',e=>{const g=e.target.closest('.bump');if(g)hl(g.dataset.w);});el.addEventListener('focusout',()=>hl(null));}
    $('bump-note').textContent=`依目前的欄位、詞典與停用詞設定，挑出常進入各年前 6 名的 ${chosen.length} 個詞；中斷的線表示那一年掉出前 12 名。把滑鼠移到線上可單獨顯示。`;
    window.week13Viz={tiles:top.length,bump:chosen.length};
  }
  if($('wf-treemap')){['wf-field','wf-year','wf-dict','wf-stop','wf-domain','wf-measure','wf-top'].forEach(id=>$(id).addEventListener('change',words));$('wf-custom').addEventListener('input',words);$('reset-wf').addEventListener('click',()=>setTimeout(words));words();}
})();
