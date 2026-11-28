(function(){
  'use strict';
  var canvas,ctx,raf=0,enabled=false,intensity=55,theme='light',flakes=[],targets=[],last=0,lastTargets=0;
  var pointer={x:-9999,y:-9999,vx:0,vy:0},piles=new WeakMap(),reduced=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var SURFACES='#sidebar,#topbar,#chatModelBar,#inputArea,.welcome-inner,.bubble,.modal-box,.workspace-box,.settings-section,.chat-item,.sb-section,.site-proposal,.holiday-effects-controls,.sb-bottom,#chatLimitNotice,#slowdownNotice,.note-scroll,#notesEditor';
  function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
  function size(){if(!canvas)return;var dpr=Math.min(window.devicePixelRatio||1,1.5),w=innerWidth,h=innerHeight;canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);canvas.style.width=w+'px';canvas.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);lastTargets=0;}
  function makeCanvas(){
    if(canvas)return;
    canvas=document.createElement('canvas');canvas.id='holidaySnowCanvas';canvas.setAttribute('aria-hidden','true');
    canvas.style.cssText='position:fixed;inset:0;width:100%;height:100%;z-index:18;pointer-events:none;contain:strict';
    document.body.appendChild(canvas);ctx=canvas.getContext('2d',{alpha:true});size();
    window.addEventListener('resize',size,{passive:true});
    window.addEventListener('scroll',function(){lastTargets=0;},{passive:true,capture:true});
    window.addEventListener('pointermove',function(e){
      var dx=pointer.x<-1000?0:e.clientX-pointer.x,dy=pointer.y<-1000?0:e.clientY-pointer.y;
      pointer.vx=clamp(dx,-90,90);pointer.vy=clamp(dy,-90,90);pointer.x=e.clientX;pointer.y=e.clientY;
    },{passive:true});
  }
  function refreshTargets(){
    targets=[];
    document.querySelectorAll(SURFACES).forEach(function(el){
      if(!el.isConnected||el.closest('#holidaySnowCanvas,[hidden],button,a,svg,img,input,textarea,select,.logo,#logoTop,.brand-mark'))return;
      var r=el.getBoundingClientRect();
      if(r.width<80||r.height<24||r.bottom<0||r.top>innerHeight||r.right<0||r.left>innerWidth)return;
      targets.push({el:el,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height});
    });
    lastTargets=performance.now();
  }
  function spawn(x,y){
    return {x:x==null?Math.random()*innerWidth:x,y:y==null?-10:y,vx:(Math.random()-.5)*.42,vy:reduced?0:.65+Math.random()*1.25,r:.8+Math.random()*1.9,phase:Math.random()*6.28,life:0};
  }
  function fill(){var count=Math.round(85+intensity*2.05);while(flakes.length<count)flakes.push(spawn());if(flakes.length>count)flakes.length=count;}
  function pileFor(el){var pile=piles.get(el);if(!pile){pile=[];piles.set(el,pile);}return pile;}
  function pileDepth(pile,x,r){
    var depth=0;
    for(var i=0;i<pile.length;i++){var q=pile[i];if(Math.abs(q.x-x)<(q.r+r)*.9)depth=Math.max(depth,q.depth+q.r*.58);}
    return depth;
  }
  function drawPiles(){
    targets.forEach(function(t){
      var pile=pileFor(t.el);if(!pile.length)return;
      ctx.save();ctx.shadowColor='rgba(87,112,142,.17)';ctx.shadowBlur=3;ctx.fillStyle='rgba(255,255,255,.94)';
      pile.forEach(function(q){var x=t.left+q.x,y=t.top-q.depth-q.r*.55;ctx.beginPath();ctx.arc(x,y,q.r,0,Math.PI*2);ctx.fill();});
      ctx.restore();
    });
  }
  function sweep(p,dt){
    var dx=p.x-pointer.x,dy=p.y-pointer.y,dist=Math.hypot(dx,dy),radius=54;
    if(dist>=radius||dist<.1)return;
    var weight=(radius-dist)/radius,force=(.09+Math.min(1.8,Math.hypot(pointer.vx,pointer.vy)*.018))*weight*dt;
    p.vx+=(dx/dist)*force+pointer.vx*.012*weight*dt;
    p.vy+=(dy/dist)*force+pointer.vy*.009*weight*dt-.025*weight*dt;
  }
  function frame(now){
    raf=0;if(!enabled||theme!=='holiday'||!canvas)return;
    if(!last)last=now;var dt=clamp((now-last)/16.67,.35,2.1);last=now;
    if(now-lastTargets>650)refreshTargets();fill();ctx.clearRect(0,0,innerWidth,innerHeight);
    drawPiles();
    flakes.forEach(function(p){
      p.life+=dt;
      if(!reduced){p.vx+=Math.sin(now*.00045+p.phase)*.008*dt;p.vy=Math.min(3.2,p.vy+.022*dt);}
      sweep(p,dt);p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.994;p.vy*=.999;
      var hit=null;
      for(var i=0;i<targets.length;i++){
        var t=targets[i];if(p.x<t.left+p.r||p.x>t.right-p.r||p.vy<=0)continue;
        var localX=p.x-t.left,pile=pileFor(t.el),depth=pileDepth(pile,localX,p.r),surface=t.top-depth-p.r*.6;
        if(p.y+p.r>=surface&&p.y<t.top+4){hit={target:t,pile:pile,x:clamp(localX,p.r,t.width-p.r),depth:depth};break;}
      }
      if(hit){
        hit.pile.push({x:hit.x,depth:hit.depth,r:p.r});
        if(hit.pile.length>190)hit.pile.splice(0,hit.pile.length-160);
        p.x=Math.random()*innerWidth;p.y=-8-Math.random()*innerHeight*.18;p.vx=(Math.random()-.5)*.5;p.vy=.55+Math.random()*.85;
      }
      if(p.y>innerHeight+12||p.x<-14||p.x>innerWidth+14){p.x=Math.random()*innerWidth;p.y=-8-Math.random()*30;p.vx=(Math.random()-.5)*.4;p.vy=.65+Math.random()*1.2;}
      ctx.beginPath();ctx.fillStyle='rgba(255,255,255,'+(.55+Math.min(.38,p.r/5))+')';ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();
    });
    pointer.vx*=.78;pointer.vy*=.78;raf=requestAnimationFrame(frame);
  }
  function configure(opts){
    opts=opts||{};theme=opts.theme||'light';enabled=theme==='holiday'&&opts.enabled!==false&&!reduced;intensity=clamp(Number(opts.intensity)||55,10,100);
    if(enabled){makeCanvas();canvas.hidden=false;refreshTargets();fill();if(!raf)raf=requestAnimationFrame(frame);}
    else{if(raf)cancelAnimationFrame(raf);raf=0;last=0;if(canvas){canvas.hidden=true;ctx.clearRect(0,0,innerWidth,innerHeight);}flakes=[];targets=[];piles=new WeakMap();}
  }
  function installDismissButtons(){
    var selectors=['#chatLimitNotice','#nativeUpdateNotice','#serviceWarning','#pinnedMessages','[data-dismissible]'];
    function add(el){
      if(!el||el.hidden||el.querySelector(':scope > .pongy-dismiss'))return;
      var b=document.createElement('button');b.type='button';b.className='pongy-dismiss';b.setAttribute('aria-label','Close notice');b.title='Close';
      b.innerHTML='<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m18 6-12 12M6 6l12 12"/></svg>';
      function dismiss(e){if(e){e.preventDefault();e.stopPropagation();}el.hidden=true;el.style.display='none';el.setAttribute('data-user-dismissed','true');}
      b.addEventListener('pointerdown',dismiss,true);b.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){dismiss(e);}});b.onclick=dismiss;el.appendChild(b);
    }
    function scan(){selectors.forEach(function(sel){document.querySelectorAll(sel).forEach(add);});}
    scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installDismissButtons,{once:true});else installDismissButtons();
  window.PongyHolidayEffects={configure:configure};
})();