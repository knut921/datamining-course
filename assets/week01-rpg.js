(()=>{'use strict';
const root=document.querySelector('#data-rpg');if(!root)return;
const $=s=>root.querySelector(s),canvas=$('canvas'),ctx=canvas.getContext('2d');
const quests=[
{name:'資料村長',badge:'結構之石',x:3,y:3,color:'#dbb46c',questions:[
['資料村收藏了 212 筆、24 欄的青年調查。一列代表什麼？',['一位受訪者（觀察值）','一個問題（變項）','全部受訪者的平均數'],0,'一列是一位受訪者，一欄是一項特徵。212 筆代表 212 位受訪者；24 欄代表 24 個變項。'],
['「每日使用網路分鐘」這整欄，在資料表中稱為？',['觀察值','變項','一個儲存格'],1,'變項是對每個對象記錄的特徵；某位受訪者的網路分鐘數才是單一儲存格的值。']]},
{name:'型態鐵匠',badge:'型態之石',x:11,y:3,color:'#9ac5d8',questions:[
['地區代碼寫成 1、2、3。鐵匠想熔煉出平均 2.4，合理嗎？',['合理，數字都可以平均','不合理，這是類別標籤','先把代碼乘以 100'],1,'數字外觀不等於數值型態。地區代碼是類別，用次數或百分比描述才有意義。'],
['哪一欄適合計算中位數？',['樣本編號','地區代碼','每日使用網路分鐘'],2,'網路分鐘是具有數量意義的數值；識別碼與地區標籤不適合拿來計算中位數。']]},
{name:'健檢藥師',badge:'驗證之石',x:19,y:3,color:'#c7a0d1',questions:[
['藥師發現收入欄有「Don’t know」。該怎麼處理？',['全部換成 0 元','另外標記並統計，不當成 0','和 Not applicable 混成同一種回答'],1,'不知道不代表沒有收入。NA、Don’t know、Not applicable 要分別盤點，避免掩蓋不同的缺失原因。'],
['AI 發現某人每天上網 900 分鐘，應該立刻刪掉嗎？',['直接刪掉，極端值一定錯','改成全班平均值','先覆核單位與原值，標記並說明處理'],2,'900 分鐘是 15 小時，值得查核，但不等於一定錯誤。先檢查，再決定保留或排除並記錄理由。']]},
{name:'提問遊俠',badge:'問題之石',x:6,y:9,color:'#eca178',questions:[
['選一張能用現有資料回答的研究問題卡。',['上網是否導致所有青年不快樂？','這 212 位受訪者的近期快樂程度，各選項占多少？','明年臺灣青年會更幸福嗎？'],1,'好問題點名欄位、界定對象、選對方法，也不預設因果；這裡可以計算類別的次數與百分比。'],
['AI 說「上網時間與滿意度有關，所以是上網造成不滿意」。你怎麼辦？',['接受，AI 已經分析了','要求改成關聯描述並檢查證據','把「造成」改成「必然導致」'],1,'關聯不代表因果。AI 的結論仍需人工覆核，不能把觀察資料的關聯直接當作因果證明。']]},
{name:'時光守衛',badge:'限制之石',x:17,y:9,color:'#a9ca7a',questions:[
['這是 2015 年、18–24 歲青年子集。哪個限制敘述最恰當？',['因為有 212 筆，所以代表現在所有人','因為資料較舊且對象有限，所以不能直接代表今日所有年齡者','因為使用 AI，所以不用交代年份'],1,'資料的年份與涵蓋對象會限制推論範圍。寫出「因為……所以不能宣稱……」，讓讀者理解界線。'],
['最後的任務背包，應該裝進哪一組成果？',['漂亮圖片就好','AI 的答案，不用覆核','資料健檢表、研究問題卡、一項資料限制與提示語紀錄'],2,'完成第一週的核心任務：先盤點、再驗證、提出可回答的問題，並留下來源、限制與可重現的提示語。']]}
];
let player={x:12,y:7},progress=quests.map(()=>0),active=-1,awaitNext=false,started=false;
const T=32;function rect(x,y,w,h,c){ctx.fillStyle=c;ctx.fillRect(x,y,w,h);}function text(s,x,y,color='#f9f4cf',size=12){ctx.font=`bold ${size}px monospace`;ctx.textAlign='center';ctx.fillStyle='#102a1d';ctx.fillText(s,x+1,y+2);ctx.fillStyle=color;ctx.fillText(s,x,y);}
function person(x,y,color,hero=false){const px=x*T,py=y*T;rect(px+6,py+27,22,5,'#3f5d36');rect(px+9,py+4,14,12,hero?'#dbaf84':'#e1bf8c');rect(px+8,py+1,16,6,hero?'#533c30':'#635444');rect(px+10,py+9,3,3,'#202d29');rect(px+19,py+9,3,3,'#202d29');rect(px+8,py+16,17,11,color);rect(px+4,py+17,4,10,'#d4ad7a');rect(px+25,py+17,4,10,'#d4ad7a');rect(px+9,py+27,6,5,'#303747');rect(px+19,py+27,6,5,'#303747');}
function draw(){ctx.imageSmoothingEnabled=false;for(let y=0;y<13.5;y++)for(let x=0;x<24;x++){rect(x*T,y*T,T,T,(x+y)%3===0?'#699548':'#729d4e');if((x*7+y*13)%5===0){rect(x*T+7,y*T+12,3,5,'#86ac59');rect(x*T+10,y*T+10,3,5,'#86ac59');}}
for(let x=1;x<23;x++){rect(x*T,6*T,32,32,'#c1aa70');rect(x*T,7*T,32,32,'#b49a60');if(x%2===0)rect(x*T+4,7*T+13,9,4,'#a99057');}for(const q of quests){const sy=q.y<6?q.y+1:8;for(let y=sy;y< (q.y<6?6:q.y);y++)rect(q.x*T,y*T,32,32,'#c1aa70');}
for(let x=0;x<24;x++){rect(x*T,0,32,14,'#3e6b38');rect(x*T,13*T,32,16,'#3e6b38');}[[1,2],[7,2],[15,2],[22,2],[2,10],[11,10],[22,10]].forEach(([x,y])=>{rect(x*T+12,y*T+17,9,30,'#735232');rect(x*T-4,y*T-10,40,31,'#345f35');rect(x*T+3,y*T-19,27,16,'#456f37');rect(x*T+2,y*T-9,10,8,'#609148');});
rect(10*T,10*T,4*T,2*T,'#6d735c');rect(10*T+6,10*T+6,4*T-12,2*T-12,'#384b40');rect(11*T,10*T+8,2*T,39,progress.every(p=>p===2)?'#c8b767':'#708279');text(progress.every(p=>p===2)?'任務完成':'資料傳送門',12*T,12*T+15,'#fff0ae',13);
quests.forEach((q,i)=>{person(q.x,q.y,q.color);text(progress[i]===2?'✓':active===i?'…':'!',q.x*T+16,q.y*T-8,progress[i]===2?'#fff095':'#fff9c4',22);text(q.name,q.x*T+16,q.y*T+48,'#fff3ca',12);});person(player.x,player.y,'#60cacc',true);text('你',player.x*T+16,player.y*T-5,'#fff',12);}
function update(){const done=progress.filter(p=>p===2).length;$('.rpg-count').textContent=`${done} / 5 知識寶石`;$('.rpg-xp').textContent=progress.reduce((a,b)=>a+b,0)*10+' XP';root.querySelectorAll('[data-quest]').forEach((b,i)=>{b.classList.toggle('complete',progress[i]===2);b.textContent=(progress[i]===2?'◆ ':'◇ ')+quests[i].badge;b.setAttribute('aria-label',quests[i].name+'，'+(progress[i]===2?'已完成':'進度 '+progress[i]+'/2'));});$('.rpg-win').hidden=done!==5;draw();}
function select(i){active=i;awaitNext=false;player={x:quests[i].x,y:quests[i].y+1};if(progress[i]===2){$('.rpg-speaker').textContent=quests[i].name+' / 任務完成';$('.rpg-question').textContent='你已取得「'+quests[i].badge+'」！';$('.rpg-options').replaceChildren();$('.rpg-feedback').textContent=quests[i].questions[1][3];$('.rpg-next').hidden=true;}else showQuestion();draw();}
function showQuestion(){const q=quests[active],item=q.questions[progress[active]];$('.rpg-speaker').textContent=q.name+' / 任務 '+(progress[active]+1)+' OF 2';$('.rpg-question').textContent=item[0];$('.rpg-feedback').textContent='';$('.rpg-next').hidden=true;$('.rpg-options').replaceChildren();item[1].forEach((label,i)=>{const b=document.createElement('button');b.type='button';b.textContent=String.fromCharCode(65+i)+' · '+label;b.addEventListener('click',()=>answer(i,b));$('.rpg-options').append(b);});}
function answer(i,b){if(awaitNext)return;const item=quests[active].questions[progress[active]];if(i!==item[2]){b.classList.add('wrong');b.disabled=true;$('.rpg-feedback').textContent='再試一次！'+item[3];return;}progress[active]++;awaitNext=true;root.querySelectorAll('.rpg-options button').forEach(b=>b.disabled=true);$('.rpg-feedback').textContent='✦ 答對了，+10 XP！'+item[3];$('.rpg-next').hidden=false;$('.rpg-next').textContent=progress[active]===2?'收下寶石，繼續探索 →':'下一個任務 →';update();$('.rpg-next').focus({preventScroll:true});}
function welcome(){active=-1;awaitNext=false;$('.rpg-speaker').textContent='任務日誌 / DATA CRAFT';$('.rpg-question').textContent=progress.every(p=>p===2)?'恭喜！你已解鎖「資料探索者」稱號。':'歡迎來到資料村，冒險者！';$('.rpg-feedback').textContent=progress.every(p=>p===2)?'帶著五顆知識寶石回到課堂，完成你自己的資料健檢表、研究問題卡與資料限制。':'走訪五位村民，解開 10 道第一週的資料謎題。點擊地圖中的村民，或下方寶石按鈕即可開始；答錯可以繼續嘗試。';$('.rpg-options').replaceChildren();$('.rpg-next').hidden=true;draw();}
$('.rpg-next').addEventListener('click',()=>{awaitNext=false;if(progress[active]<2){showQuestion();$('.rpg-options button').focus({preventScroll:true});}else{welcome();canvas.focus({preventScroll:true});}});
function move(dx,dy){player.x=Math.max(1,Math.min(22,player.x+dx));player.y=Math.max(1,Math.min(12,player.y+dy));draw();}
function interact(){let near=-1,dist=Infinity;quests.forEach((q,i)=>{const d=Math.abs(player.x-q.x)+Math.abs(player.y-q.y);if(d<dist){near=i;dist=d;}});if(dist<=3)select(near);else $('.rpg-location').textContent='附近沒有村民，再靠近一點；也可以直接點擊村民或寶石按鈕。';}
canvas.addEventListener('keydown',e=>{const k=e.key.toLowerCase(),moves={arrowup:[0,-1],w:[0,-1],arrowdown:[0,1],s:[0,1],arrowleft:[-1,0],a:[-1,0],arrowright:[1,0],d:[1,0]};if(moves[k]){e.preventDefault();move(...moves[k]);}else if(k==='e'||k==='enter'||k===' '){e.preventDefault();interact();}});
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)*768/r.width,y=(e.clientY-r.top)*432/r.height;const i=quests.findIndex(q=>Math.abs(x-(q.x*T+16))<42&&Math.abs(y-(q.y*T+16))<44);if(i>=0)select(i);else{player={x:Math.max(1,Math.min(22,Math.floor(x/T))),y:Math.max(1,Math.min(12,Math.floor(y/T)))};draw();}canvas.focus({preventScroll:true});});
root.querySelectorAll('[data-move]').forEach(b=>b.addEventListener('click',()=>move(...b.dataset.move.split(',').map(Number))));$('.rpg-interact').addEventListener('click',interact);root.querySelectorAll('[data-quest]').forEach((b,i)=>b.addEventListener('click',()=>select(i)));
$('.rpg-reset').addEventListener('click',()=>{progress=quests.map(()=>0);player={x:12,y:7};$('.rpg-location').textContent='';welcome();update();});$('details').addEventListener('toggle',()=>{if($('details').open&&!started){started=true;welcome();update();}});
})();
