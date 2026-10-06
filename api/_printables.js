// Moneyland printable engine (generated from the page code so the website and the server make identical PDFs).
const window = {};
const PW=612, PH=792, M=40;
const PC={dark:"#1F2533", gray:"#626B7A", light:"#F1F3F7", line:"#CDD3DD", white:"#FFFFFF", trace:"#C2C8D2"};
const ACC={purple:"#7B4FD6", teal:"#0E9F9A", orange:"#F07F1C", pink:"#E0508F", blue:"#2F7DE1", green:"#2C9F55", yellow:"#F2B705", red:"#D83A3A", navy:"#23395B", sage:"#5F8C70"};
const CATS={kids:"Kids", planner:"Planners & trackers", party:"Party & events"};
const TPL_NAMES={chart:"Chart",reward:"Reward chart",math:"Math worksheet",tracing:"Tracing worksheet",table:"Tracker",planner:"Planner page",sign:"Sign",letter:"Letter",certificate:"Certificate",bingo:"Bingo",scramble:"Word scramble",labels:"Labels",bundle:"Bundle"};
const FOOT="For personal and classroom use. Print at home on US Letter paper.";
const mctx=(typeof document!=="undefined")?document.createElement("canvas").getContext("2d"):null;
let TW=null;
function clean(t){ return String(t==null?"":t).replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/[–—]/g,"-").replace(/…/g,"...").replace(/[^\x20-\x7E -ÿ]/g,""); }
function tw(txt,size,bold){ if(TW) return TW(txt,size,bold); mctx.font=(bold?"bold ":"")+size+"px Helvetica, Arial, sans-serif"; return mctx.measureText(txt).width; }
function wrapT(txt,size,bold,maxW){ const words=clean(txt).split(/\s+/).filter(Boolean), out=[]; let cur="";
  words.forEach(w=>{ const t=cur?cur+" "+w:w; if(tw(t,size,bold)>maxW && cur){ out.push(cur); cur=w; } else cur=t; }); if(cur) out.push(cur); return out.length?out:[""]; }
function tint(hex,t){ const n=parseInt(hex.slice(1),16), r=n>>16&255, g=n>>8&255, b=n&255, f=v=>Math.round(v+(255-v)*t).toString(16).padStart(2,"0"); return "#"+f(r)+f(g)+f(b); }
function rng(seedStr){ let h=1779033703^seedStr.length; for(let i=0;i<seedStr.length;i++){ h=Math.imul(h^seedStr.charCodeAt(i),3432918353); h=h<<13|h>>>19; }
  return ()=>{ h=Math.imul(h^h>>>16,2246822507); h=Math.imul(h^h>>>13,3266489909); h^=h>>>16; return (h>>>0)/4294967296; }; }
function shuffled(arr,r){ const a=arr.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }

function layout(spec){
  if(spec.template==="bundle") return layoutBundle(spec);
  const ops=[]; const acc=ACC[spec.accent]||ACC.purple, soft=tint(acc,.85), mid=tint(acc,.55);
  const R=(x,y,w,h,o)=>ops.push(Object.assign({t:"rect",x,y,w,h},o)); const T=(txt,x,y,s,o)=>ops.push(Object.assign({t:"text",txt:clean(txt),x,y,s},o));
  const L=(x1,y1,x2,y2,c,w,dash)=>ops.push({t:"line",x1,y1,x2,y2,c:c||PC.line,w:w||1,dash}); const Cc=(x,y,r,o)=>ops.push(Object.assign({t:"circle",x,y,r},o));
  const para=(txt,x,y,size,bold,maxW,color,lh,a)=>{ const ls=wrapT(txt,size,bold,maxW); ls.forEach((l,i)=>T(l,x,y+i*size*(lh||1.3),size,{b:bold,c:color,a})); return ls.length*size*(lh||1.3); };
  const kids=spec.category!=="planner";
  function header(){
    if(kids){
      R(M,34,PW-2*M,92,{f:acc,r:18});
      [[PW-M-26,52,9],[PW-M-56,104,6],[PW-M-90,60,4],[PW-M-110,112,5],[PW-M-130,80,3]].forEach(([x,y,r])=>Cc(x,y,r,{f:mid}));
      let ts=30, tl=wrapT(spec.title,ts,true,PW-2*M-150); while(tl.length>1&&ts>24){ ts-=2; tl=wrapT(spec.title,ts,true,PW-2*M-150); } while(tl.length>2&&ts>16){ ts-=2; tl=wrapT(spec.title,ts,true,PW-2*M-150); }
      const sub=spec.subtitle?1:0, capH=ts*0.72, blockH=capH+(tl.length-1)*ts*1.05+(sub?20:0); const y=34+(92-blockH)/2+capH;
      tl.forEach((l,i)=>T(l,M+22,y+i*ts*1.05,ts,{b:true,c:PC.white})); if(sub) T(wrapT(spec.subtitle,11.5,false,PW-2*M-160)[0],M+22,y+(tl.length-1)*ts*1.05+20,11.5,{c:PC.white});
      return 150;
    }
    let ts=26, tl=wrapT(spec.title,ts,true,PW-2*M); while(tl.length>2&&ts>18){ ts-=2; tl=wrapT(spec.title,ts,true,PW-2*M); }
    let y=66; tl.forEach(l=>{ T(l,M,y,ts,{b:true,c:PC.dark}); y+=ts*1.1; });
    if(spec.subtitle) y+=para(spec.subtitle,M,y,10.5,false,PW-2*M,PC.gray)-4;
    R(M,y,90,4,{f:acc,r:2}); return y+24;
  }
  const foot=()=>T(FOOT,PW/2,770,7.5,{c:PC.gray,a:"center"});
  const fields=(y,txt)=>{ if(!txt) return y; T(txt,M,y,10.5,{c:PC.dark}); return y+22; };
  const tpl=spec.template;
  if(tpl==="sign") return signOps(spec,ops,R,T,Cc,acc,mid);
  if(tpl==="certificate") return certOps(spec,ops,R,T,L,Cc,para,acc,mid,soft);
  let y=header();

  if(tpl==="chart"){
    y=fields(y,spec.fields||(kids?"Name: ______________________     Week of: ______________":""));
    const cols=(spec.columns&&spec.columns.length?spec.columns:["Mon","Tue","Wed","Thu","Fri","Sat","Sun"]).map(clean).slice(0,8), rows=(spec.rows||[]).map(clean).slice(0,12);
    const first=cols.length>5?190:230, cw=(PW-2*M-first)/cols.length, hh=30, bottom=spec.footer?700:735, rh=Math.min(50,(bottom-y-hh)/Math.max(1,rows.length));
    R(M,y,PW-2*M,hh,{f:acc,r:8}); T(spec.rowHead||"Task",M+12,y+19,11,{b:true,c:PC.white});
    cols.forEach((c,i)=>T(c,M+first+cw*i+cw/2,y+19,10.5,{b:true,c:PC.white,a:"center"})); y+=hh+4;
    rows.forEach((r,i)=>{ if(i%2===0) R(M,y,PW-2*M,rh-4,{f:soft,r:8});
      const ls=wrapT(r,11.5,true,first-20).slice(0,2); ls.forEach((l,j)=>T(l,M+12,y+(rh-4)/2+4-(ls.length-1)*7+j*14,11.5,{b:true,c:PC.dark}));
      if(!r) L(M+12,y+(rh-4)/2+6,M+first-14,y+(rh-4)/2+6,PC.line,0.8);
      const bs=Math.min(22,rh-14); cols.forEach((c,k)=>R(M+first+cw*k+cw/2-bs/2,y+(rh-4)/2-bs/2,bs,bs,{s:acc,lw:1.4,r:5,f:PC.white})); y+=rh; });
    if(spec.footer){ R(M,712,PW-2*M,34,{f:soft,r:10}); T(spec.footer,PW/2,733,12,{b:true,c:PC.dark,a:"center"}); }
  }
  else if(tpl==="reward"){
    y=fields(y,spec.fields||"Name: ______________________     Started: ______________");
    if(spec.goal){ y+=6; T("My goal:",M,y,12,{b:true,c:acc}); y+=para(spec.goal,M+62,y,13,true,PW-2*M-62,PC.dark)+10; }
    const n=[10,15,20,25,30].includes(+spec.spots)?+spec.spots:20, per=5, rowsN=Math.ceil(n/per);
    const area=650-y, cell=Math.min((PW-2*M)/per, area/rowsN), r=cell*0.38, gx=(PW-2*M-cell*per)/2;
    for(let i=0;i<n;i++){ const cx=M+gx+cell*(i%per)+cell/2, cy=y+cell*Math.floor(i/per)+cell/2;
      Cc(cx,cy,r,{f:i%2?PC.white:soft,s:acc,lw:2}); T(String(i+1),cx,cy+5,13,{b:true,c:mid,a:"center"}); }
    R(M,670,PW-2*M,64,{s:acc,lw:2,r:14}); T(spec.prizeLabel||"When I fill every circle, I earn:",M+18,692,12,{b:true,c:acc}); L(M+18,722,PW-M-18,722,PC.line,1);
  }
  else if(tpl==="math"){
    const count=[12,16,20,24,25,30].includes(+spec.count)?+spec.count:20;
    y=fields(y,"Name: ______________________     Date: ______________     Score: _____ / "+count);
    const op=["+","-","x"].includes(spec.op)?spec.op:"+", lo=Math.max(0,parseInt(spec.min)||0), hi=Math.max(lo+1,Math.min(999,parseInt(spec.max)||10));
    const r=rng(clean(spec.title)+op+lo+hi+count), probs=[]; const ri=()=>lo+Math.floor(r()*(hi-lo+1));
    for(let i=0;i<count;i++){ let a=ri(), b=ri(); if(op==="-"&&b>a){ const t=a; a=b; b=t; } probs.push([a,b,op==="+"?a+b:op==="-"?a-b:a*b]); }
    const per=count%5===0?5:4, rows=Math.ceil(count/per), cw=(PW-2*M)/per;
    const grid=(top,ch,showAns,size)=>probs.forEach(([a,b,ans],i)=>{ const cx=M+cw*(i%per)+cw/2+18, yy=top+ch*Math.floor(i/per);
      T("("+(i+1)+")",cx-cw/2+4,yy+size*0.2,8.5,{c:PC.gray});
      T(String(a),cx,yy+size,size,{b:true,c:PC.dark,a:"right"}); T(op+"  "+b,cx,yy+size*2.2,size,{b:true,c:PC.dark,a:"right"});
      L(cx-size*2.6,yy+size*2.6,cx+2,yy+size*2.6,PC.dark,1.6); if(showAns) T(String(ans),cx,yy+size*3.8,size,{b:true,c:acc,a:"right"}); });
    const ch=Math.min(130,(735-y)/rows); grid(y+6,ch,false,Math.min(22,ch/4.8));
    foot(); ops.push({t:"page"});
    T("Answer key: "+clean(spec.title),M,60,16,{b:true,c:PC.dark}); R(M,72,90,4,{f:acc,r:2});
    grid(96,Math.min(110,630/rows),true,Math.min(18,(630/rows)/4.6));
  }
  else if(tpl==="tracing"){
    y=fields(y,"Name: ______________________     Date: ______________");
    const words=(spec.words||[]).map(clean).filter(Boolean).slice(0,6), blocks=Math.max(1,words.length), bh=(745-y)/blocks, gh=Math.min(44,(bh-14)/2-6);
    words.forEach((w,i)=>{ const by=y+i*bh;
      for(let k=0;k<2;k++){ const top=by+4+k*(gh+12), base=top+gh;
        L(M,top,PW-M,top,mid,1); L(M,top+gh/2,PW-M,top+gh/2,mid,0.8,[4,4]); L(M,base,PW-M,base,PC.dark,1.2);
        if(k===0){ const size=gh/0.72; let x=M+6; const ww=tw(w,size,false)+size*0.8; let n=0; while(x+tw(w,size,false)<PW-M && n<6){ T(w,x,base-1,size,{c:PC.trace}); x+=ww; n++; } } } });
  }
  else if(tpl==="table"){
    y=fields(y,spec.fields||"");
    let cols=(spec.columns||[]).map(clean).filter(Boolean).slice(0,7); if(!cols.length) cols=["Date","Item","Amount"];
    const wts=cols.map(c=>/note|description|item|detail|book|title|exercise|meal|activity|idea|dream|address|name|task|category|workout|why|helped/i.test(c)?2:1), sum=wts.reduce((a,b)=>a+b,0), widths=wts.map(w=>w/sum*(PW-2*M));
    const labels=(spec.rowLabels||[]).map(clean);
    const hh=30, notes=(spec.notes||[]).slice(0,3), rows=Math.max(labels.length,Math.max(7,Math.min(24,spec.rows||16))), bottom=740-notes.length*20, rh=Math.min(36,(bottom-y-hh)/rows);
    R(M,y,PW-2*M,hh,{f:acc,r:8}); let x=M; cols.forEach((c,i)=>{ T(wrapT(c,9.5,true,widths[i]-8)[0],x+widths[i]/2,y+19,9.5,{b:true,c:PC.white,a:"center"}); x+=widths[i]; });
    y+=hh; const top=y;
    for(let r2=0;r2<rows;r2++){ if(r2%2) R(M,y,PW-2*M,rh,{f:soft}); L(M,y+rh,PW-M,y+rh,PC.line,0.6);
      if(labels[r2]) T(wrapT(labels[r2],9.5,true,widths[0]-12)[0],M+8,y+rh/2+4,9.5,{b:true,c:PC.dark});
      if(spec.totalRow && r2===rows-1) T("Total",M+8,y+rh/2+4,10,{b:true,c:PC.dark}); y+=rh; }
    x=M; widths.slice(0,-1).forEach(w=>{ x+=w; L(x,top,x,y,PC.line,0.6); });
    y+=18; notes.forEach(n=>{ T("-",M,y,9.5,{b:true,c:acc}); y+=para(n,M+10,y,9.5,false,PW-2*M-10,PC.dark)+5; });
  }
  else if(tpl==="planner"){
    y=fields(y,spec.fields||"Date: ______________________");
    const secs=(spec.sections||[]).slice(0,8).map(s=>({head:clean(s.head),kind:["lines","checks","hours"].includes(s.kind)?s.kind:"lines",count:Math.max(2,Math.min(16,parseInt(s.count)||5)),wide:!!s.wide}));
    const rowsL=[]; for(let i=0;i<secs.length;i++){ const s=secs[i]; if(s.wide||i===secs.length-1||secs[i+1].wide) rowsL.push([s]); else { rowsL.push([s,secs[i+1]]); i++; } }
    const units=rowsL.reduce((a,r)=>a+Math.max(...r.map(s=>s.count)),0), lh=Math.max(13,Math.min(26,(740-y-rowsL.length*44)/units));
    const hour0=Math.max(5,Math.min(9,parseInt(spec.startHour)||6));
    rowsL.forEach(row=>{ const n=Math.max(...row.map(s=>s.count)), bh=34+n*lh, w=row.length===2?(PW-2*M-12)/2:PW-2*M;
      row.forEach((s,j)=>{ const bx=M+j*(w+12); R(bx,y,w,bh,{s:mid,lw:1.2,r:12}); R(bx,y,w,26,{f:soft,r:12}); R(bx,y+14,w,12,{f:soft}); T(s.head,bx+12,y+17,11,{b:true,c:acc});
        for(let k=0;k<s.count;k++){ const ly=y+30+(k+1)*lh;
          if(s.kind==="checks"){ R(bx+12,ly-10,10,10,{s:acc,lw:1.1,r:2}); L(bx+28,ly,bx+w-12,ly,PC.line,0.7); }
          else if(s.kind==="hours"){ const h=hour0+k, lab=(h%12||12)+(h<12?" AM":" PM"); T(lab,bx+12,ly-4,8.5,{b:true,c:PC.gray}); L(bx+52,ly,bx+w-12,ly,PC.line,0.7); }
          else L(bx+12,ly,bx+w-12,ly,PC.line,0.7); } });
      y+=bh+10; });
  }
  else if(tpl==="letter"){
    y=fields(y,spec.fields||"Date: ______________________")+6;
    const n=Math.max(6,Math.min(16,parseInt(spec.lines)||12)), lh=(735-y)/n, prompts=(spec.prompts||[]).map(clean);
    R(M-6,y-6,PW-2*M+12,735-y+16,{s:mid,lw:1.5,r:16});
    for(let i=0;i<n;i++){ const ly=y+(i+1)*lh; L(M+10,ly,PW-M-10,ly,PC.line,0.8); if(prompts[i]) T(prompts[i],M+12,ly-6,13,{b:i===0,c:PC.dark}); }
  }
  else if(tpl==="bingo"){
    const words=(spec.words||[]).map(clean).filter(Boolean), cards=Math.max(1,Math.min(6,parseInt(spec.cards)||1));
    for(let c=0;c<cards;c++){
      if(c){ foot(); ops.push({t:"page"}); y=header(); }
      y=fields(y,"Name: ______________________"+(cards>1?"          Card "+(c+1):""));
      const pick=shuffled(words,rng(clean(spec.title)+c)).slice(0,24); while(pick.length<24) pick.push("");
      const size=Math.min((PW-2*M)/5,(735-y-40)/5), gx=(PW-5*size)/2;
      "BINGO".split("").forEach((ch,i)=>{ R(gx+i*size+2,y,size-4,36,{f:acc,r:8}); T(ch,gx+i*size+size/2,y+26,24,{b:true,c:PC.white,a:"center"}); });
      const top=y+42; let k=0;
      for(let rr=0;rr<5;rr++) for(let cc=0;cc<5;cc++){ const x0=gx+cc*size, y0=top+rr*size, free=rr===2&&cc===2;
        R(x0+2,y0+2,size-4,size-4,{s:mid,lw:1.5,r:8,f:free?soft:PC.white});
        const word=free?"FREE":pick[k++]; const ls=wrapT(word,13,true,size-16).slice(0,3);
        ls.forEach((l,j)=>T(l,x0+size/2,y0+size/2+5-(ls.length-1)*8+j*16,13,{b:true,c:free?acc:PC.dark,a:"center"})); }
    }
  }
  else if(tpl==="scramble"){
    y=fields(y,"Name: ______________________     Date: ______________");
    const words=(spec.words||[]).map(w=>clean(w).replace(/\s+/g,"")).filter(Boolean).slice(0,15), r=rng(clean(spec.title));
    const scr=words.map(w=>{ let s=w; for(let t=0;t<8&&s.toLowerCase()===w.toLowerCase();t++) s=shuffled(w.split(""),r).join(""); return s.toUpperCase(); });
    const rh=Math.min(46,(735-y)/Math.max(1,words.length));
    scr.forEach((s,i)=>{ const yy=y+i*rh+rh*0.6; Cc(M+12,yy-5,11,{f:soft}); T(String(i+1),M+12,yy-1,10,{b:true,c:acc,a:"center"});
      T(s.split("").join(" "),M+34,yy,16,{b:true,c:PC.dark}); L(PW/2+20,yy+2,PW-M,yy+2,PC.dark,1); });
    foot(); ops.push({t:"page"});
    T("Answer key: "+clean(spec.title),M,60,16,{b:true,c:PC.dark}); R(M,72,90,4,{f:acc,r:2});
    words.forEach((w,i)=>T((i+1)+".  "+scr[i]+"  =  "+w.toUpperCase(),M,104+i*26,12,{c:PC.dark}));
  }
  else if(tpl==="labels"){
    const labels=(spec.labels||[]).map(clean).slice(0,8), n=Math.max(1,labels.length), rows=Math.ceil(n/2), gw=(PW-2*M-16)/2, gh=Math.min(140,(740-y-(rows-1)*14)/rows);
    labels.forEach((t,i)=>{ const x0=M+(i%2)*(gw+16), y0=y+Math.floor(i/2)*(gh+14);
      [[x0,y0,x0+gw,y0],[x0,y0+gh,x0+gw,y0+gh],[x0,y0,x0,y0+gh],[x0+gw,y0,x0+gw,y0+gh]].forEach(l=>L(l[0],l[1],l[2],l[3],PC.gray,0.8,[5,4]));
      R(x0+10,y0+10,gw-20,gh-20,{f:soft,r:12}); R(x0+10,y0+10,gw-20,14,{f:acc,r:7});
      const ls=wrapT(t,18,true,gw-50).slice(0,2); const ty=y0+gh/2+(spec.blankLine?-6:6)-(ls.length-1)*11;
      ls.forEach((l,j)=>T(l,x0+gw/2,ty+j*22,18,{b:true,c:PC.dark,a:"center"}));
      if(spec.blankLine) L(x0+34,y0+gh-30,x0+gw-34,y0+gh-30,PC.dark,1); });
  }
  foot(); return ops;
}
function signOps(spec,ops,R,T,Cc,acc,mid){
  const onAcc=spec.accent==="yellow"?PC.dark:PC.white;
  R(20,20,PW-40,PH-40,{s:acc,lw:8,r:24}); R(20,20,PW-40,320,{f:acc,r:24}); R(20,300,PW-40,40,{f:acc});
  [[70,70,14],[540,90,10],[110,290,8],[500,280,16],[300,60,6],[440,60,5],[170,90,5]].forEach(([x,yy,r])=>Cc(x,yy,r,{f:mid}));
  let ts=86, tl=wrapT(spec.title,ts,true,PW-110); while((tl.length>3||tl.some(l=>tw(l,ts,true)>PW-110))&&ts>30){ ts-=4; tl=wrapT(spec.title,ts,true,PW-110); }
  const bH=tl.length*ts*1.02; tl.forEach((l,i)=>T(l,PW/2,180-bH/2+ts*0.78+i*ts*1.02,ts,{b:true,c:onAcc,a:"center"}));
  let ss=30; while(tw(clean(spec.subtitle||""),ss,true)>PW-120 && ss>18) ss-=2;
  const sub=wrapT(spec.subtitle||"",ss,true,PW-120), lns=(spec.lines||[]).slice(0,4).map(ln=>wrapT(ln,20,false,PW-130));
  const bh=sub.length*40+30+lns.reduce((a,l)=>a+l.length*28+16,0); let yy=340+(390-bh)/2+30;
  sub.forEach(l=>{ T(l,PW/2,yy,ss,{b:true,c:PC.dark,a:"center"}); yy+=40; }); R(PW/2-40,yy-14,80,5,{f:acc,r:2}); yy+=30;
  lns.forEach(ls=>{ ls.forEach(l=>{ T(l,PW/2,yy,20,{c:PC.dark,a:"center"}); yy+=28; }); yy+=16; });
  return ops;
}
function certOps(spec,ops,R,T,L,Cc,para,acc,mid,soft){
  R(24,24,PW-48,PH-48,{s:acc,lw:6,r:18}); R(38,38,PW-76,PH-76,{s:mid,lw:1.5,r:12});
  [[70,70],[PW-70,70],[70,PH-70],[PW-70,PH-70]].forEach(([x,y])=>Cc(x,y,10,{f:soft,s:acc,lw:1.5}));
  T("CERTIFICATE",PW/2,140,14,{b:true,c:mid,a:"center"});
  let ts=40, tl=wrapT(spec.title,ts,true,PW-140); while(tl.length>2&&ts>24){ ts-=2; tl=wrapT(spec.title,ts,true,PW-140); }
  let y=200; tl.forEach(l=>{ T(l,PW/2,y,ts,{b:true,c:acc,a:"center"}); y+=ts*1.1; });
  y+=20; T(spec.subtitle||"This certifies that",PW/2,y,16,{c:PC.gray,a:"center"}); y+=80;
  L(120,y,PW-120,y,PC.dark,1.2); T("Name",PW/2,y+18,10,{c:PC.gray,a:"center"}); y+=70;
  wrapT(spec.body||"",16,false,PW-160).forEach(l=>{ T(l,PW/2,y,16,{c:PC.dark,a:"center"}); y+=24; });
  Cc(PW/2,600,46,{f:acc}); Cc(PW/2,600,38,{s:PC.white,lw:1.5}); T("OFFICIAL",PW/2,605,13,{b:true,c:PC.white,a:"center"});
  L(90,690,250,690,PC.dark,1); T("Date",170,708,10,{c:PC.gray,a:"center"});
  L(PW-250,690,PW-90,690,PC.dark,1); T(spec.signLabel||"Signed",PW-170,708,10,{c:PC.gray,a:"center"});
  return ops;
}
function layoutBundle(spec){
  const pages=(spec.pages||[]).filter(p=>p&&p.template&&p.template!=="bundle").slice(0,12);
  let body=[]; pages.forEach(p=>{ body.push({t:"page"}); body=body.concat(layout(Object.assign({category:spec.category,accent:spec.accent},p))); });
  const total=pagesOf(body).length; // includes the cover slot
  const ops=[]; const acc=ACC[spec.accent]||ACC.purple, soft=tint(acc,.85), mid=tint(acc,.55);
  const R=(x,y,w,h,o)=>ops.push(Object.assign({t:"rect",x,y,w,h},o)); const T=(txt,x,y,s,o)=>ops.push(Object.assign({t:"text",txt:clean(txt),x,y,s},o)); const Cc=(x,y,r,o)=>ops.push(Object.assign({t:"circle",x,y,r},o));
  R(0,0,PW,340,{f:acc}); [[60,60,14],[550,80,10],[90,300,7],[520,290,16],[320,50,6],[460,40,5]].forEach(([x,y,r])=>Cc(x,y,r,{f:mid}));
  let ts=46, tl=wrapT(spec.title,ts,true,PW-100); while(tl.length>3&&ts>26){ ts-=2; tl=wrapT(spec.title,ts,true,PW-100); }
  let y=170-tl.length*ts*0.55+ts*0.7; tl.forEach(l=>{ T(l,PW/2,y,ts,{b:true,c:PC.white,a:"center"}); y+=ts*1.08; });
  wrapT(spec.subtitle||"",13,false,PW-120).slice(0,2).forEach(l=>{ T(l,PW/2,y+4,13,{c:PC.white,a:"center"}); y+=18; });
  R(PW/2-100,296,200,32,{f:PC.white,r:16}); T(total+" PRINTABLE PAGES",PW/2,317,12,{b:true,c:acc,a:"center"});
  T("What's inside",M,392,18,{b:true,c:PC.dark}); R(M,402,70,4,{f:acc,r:2});
  const names=[]; pages.forEach(p=>{ const n=clean(p.title); if(!names.includes(n)) names.push(n); if(p.template==="math"||p.template==="scramble") { const k="Answer key: "+n; if(names.length<24) names.push(k); } });
  const show=names.filter(n=>!n.startsWith("Answer key")).slice(0,20), keys=names.length-show.length;
  show.forEach((n,i)=>{ const col=i%2, row=Math.floor(i/2), x=M+col*(PW-2*M)/2, yy=436+row*30;
    R(x,yy-11,12,12,{f:soft,s:acc,lw:1,r:3}); T(wrapT(n,12,false,(PW-2*M)/2-30)[0],x+22,yy,12,{c:PC.dark}); });
  if(keys>0) T("Plus answer keys for the worksheets and word games.",M,436+Math.ceil(show.length/2)*30+14,11,{c:PC.gray});
  R(M,700,PW-2*M,44,{f:soft,r:12}); T("Instant download  |  Print at home  |  US Letter 8.5 x 11 in",PW/2,727,12,{b:true,c:PC.dark,a:"center"});
  T(FOOT,PW/2,770,7.5,{c:PC.gray,a:"center"});
  return ops.concat(body);
}
function pagesOf(ops){ const pages=[[]]; ops.forEach(o=>{ if(o.t==="page") pages.push([]); else pages[pages.length-1].push(o); }); return pages; }
function toSVG(ops,pageIndex,fixed){
  const esc2=s=>s.replace(/&/g,"&amp;").replace(/</g,"&lt;");
  let o='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+PW+' '+PH+'" '+(fixed?'width="'+PW+'" height="'+PH+'"':'style="background:#fff;display:block;width:100%;height:auto"')+'><rect width="'+PW+'" height="'+PH+'" fill="#fff"/>';
  (pagesOf(ops)[pageIndex||0]||[]).forEach(p=>{
    if(p.t==="rect") o+='<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" rx="'+(p.r||0)+'" fill="'+(p.f||"none")+'" stroke="'+(p.s||"none")+'" stroke-width="'+(p.lw||0)+'"/>';
    if(p.t==="circle") o+='<circle cx="'+p.x+'" cy="'+p.y+'" r="'+p.r+'" fill="'+(p.f||"none")+'" stroke="'+(p.s||"none")+'" stroke-width="'+(p.lw||0)+'"/>';
    if(p.t==="line") o+='<line x1="'+p.x1+'" y1="'+p.y1+'" x2="'+p.x2+'" y2="'+p.y2+'" stroke="'+p.c+'" stroke-width="'+p.w+'"'+(p.dash?' stroke-dasharray="'+p.dash.join(" ")+'"':'')+'/>';
    if(p.t==="text") o+='<text x="'+p.x+'" y="'+p.y+'" font-family="Helvetica, Arial, sans-serif" font-size="'+p.s+'" font-weight="'+(p.b?"bold":"normal")+'" fill="'+(p.c||"#000")+'" text-anchor="'+(p.a==="center"?"middle":p.a==="right"?"end":"start")+'">'+esc2(p.txt)+'</text>';
  });
  return o+'</svg>';
}
function toPDF(ops){
  const J=window.jspdf && window.jspdf.jsPDF; if(!J) throw new Error("PDF library did not load");
  const d=new J({unit:"pt",format:"letter"});
  pagesOf(ops).forEach((page,pi)=>{ if(pi) d.addPage("letter");
    page.forEach(p=>{
      if(p.t==="rect"){ const st=(p.f?"F":"")+(p.s?"D":""); if(!st) return; if(p.f) d.setFillColor(p.f); if(p.s){ d.setDrawColor(p.s); d.setLineWidth(p.lw||1); }
        if(p.r) d.roundedRect(p.x,p.y,p.w,p.h,Math.min(p.r,p.w/2,p.h/2),Math.min(p.r,p.w/2,p.h/2),st); else d.rect(p.x,p.y,p.w,p.h,st); }
      if(p.t==="circle"){ const st=(p.f?"F":"")+(p.s?"D":""); if(p.f) d.setFillColor(p.f); if(p.s){ d.setDrawColor(p.s); d.setLineWidth(p.lw||1); } d.circle(p.x,p.y,p.r,st); }
      if(p.t==="line"){ d.setDrawColor(p.c); d.setLineWidth(p.w); d.setLineDashPattern(p.dash||[],0); d.line(p.x1,p.y1,p.x2,p.y2); d.setLineDashPattern([],0); }
      if(p.t==="text"){ d.setFont("helvetica",p.b?"bold":"normal"); d.setFontSize(p.s); d.setTextColor(p.c||"#000000"); d.text(p.txt,p.x,p.y,{align:p.a||"left"}); }
    }); });
  return (typeof document!=="undefined") ? d.output("blob") : Buffer.from(d.output("arraybuffer"));
}

function pageCount(spec){ return pagesOf(layout(spec)).length; }
function listingDesc(spec){
  const who={kids:"Made for kids at home or in the classroom.",planner:"A simple way to stay organized and on track.",party:"Perfect for birthdays, showers and celebrations."}[spec.category]||"";
  const n=pageCount(spec), inside=spec.template==="bundle"?"\n\nWHAT'S INSIDE\n"+(spec.pages||[]).map(p=>"- "+clean(p.title)).join("\n"):"";
  const keys=/"template":"(math|scramble)"/.test(JSON.stringify(spec))?"\n- Answer keys included":"";
  return clean(spec.title)+"\n\n"+who+" "+clean(spec.subtitle||"")+inside+"\n\nWHAT YOU GET\n- 1 PDF file with "+n+" printable page"+(n>1?"s":"")+", US Letter size (8.5 x 11 in)"+keys+"\n- Instant digital download. Nothing is shipped.\n- Print as many copies as you need for personal or classroom use.\n\nHOW IT WORKS\n1. Buy and download the PDF from your Etsy purchases page.\n2. Print at home or at any print shop.\n\nThis design was created with the help of AI tools.";
}

module.exports = { PW, PH, ACC, CATS, TPL_NAMES, clean, tint, wrapT, layout, pagesOf, toSVG, toPDF, pageCount, listingDesc, setMeasure: f => { TW = f; }, setJsPDF: J => { window.jspdf = { jsPDF: J }; } };
