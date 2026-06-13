---
title: ROC & AUC, animated
subtitle: Sweeping the criterion through two response distributions
summary: An interactive walk-through of the ROC curve and the area under it (AUC), built around Maneesh Sahani's signal-detection slides — two response distributions P(n|s₀) and P(n|s₁), a sliding criterion, and the hit-rate (TPR) / false-alarm-rate (FPR) trade-off it traces out. Drag the criterion on either plot, or hit play to sweep it; change the separation d′ to watch AUC = Φ(d′/√2) grow. Axes, confusion-matrix terminology and the no-discrimination diagonal follow the Wikipedia ROC article.
date: 2026-06-13
---

How well can you tell two stimuli apart from a noisy firing rate alone? Following
Maneesh Sahani's *Theoretical Neuroscience* slides on rate codes, suppose a neuron must
support a **binary choice** — present / absent, up / down, horizontal / vertical. Call the
two stimuli $\mathtt{s_0}$ and $\mathtt{s_1}$. On any trial the response (say a spike count) is $n$, drawn
from one of two distributions:

$$
P(n\mid \mathtt{s_0})\quad\text{and}\quad P(n\mid \mathtt{s_1}).
$$

A decision rule sets a **criterion** $c$ and reports "$\mathtt{s_1}$" whenever $n > c$. Two numbers
summarise it, exactly as on the slides — the **hit rate**, in Wikipedia's terms the
**true-positive rate** (TPR), and the **false-alarm rate**, the **false-positive rate**
(FPR):

$$
\begin{aligned}
\text{TPR}(c)\ \ (\text{hit rate}) &= P(n>c \mid \mathtt{s_1}) = \int_{c}^{\infty}\! P(n\mid \mathtt{s_1})\,dn,\\[3pt]
\text{FPR}(c)\ \ (\text{false-alarm rate}) &= P(n>c \mid \mathtt{s_0}) = \int_{c}^{\infty}\! P(n\mid \mathtt{s_0})\,dn.
\end{aligned}
$$

Both depend on the criterion $c$ — that is the whole point — so we carry the $(c)$ everywhere.

There is no single best $c$: lowering it catches more real $\mathtt{s_1}$ trials but also raises false
alarms. Sweep $c$ across the whole axis and plot $\big(\text{FPR}(c),\,\text{TPR}(c)\big)$ — the
**receiver operating characteristic**. Press play to sweep the criterion, drag the purple
criterion line, or grab the operating point on the ROC plot directly; change $d'$ — how far
apart the two distributions sit — to see the curve bow toward the perfect corner.

<style>
#rocauc{--card:#fffdf8;--ink:#2b2018;--muted:#6f6256;--line:rgba(31,24,18,.16);--grid:rgba(31,24,18,.08);--fa:#b4532a;--hit:#1f6765;--crit:#7c3aed;--dot:#7c3aed;--s0:#9c4a26;--s1:#1a5b59;margin:1.9rem 0;padding:1.05rem 1.1rem 1.15rem;background:var(--card);border:1px solid var(--line);border-radius:16px;box-shadow:0 14px 44px rgba(38,23,12,.10);font:13px/1.45 var(--font-sans,system-ui,sans-serif);color:var(--ink);max-width:none}
#rocauc .rc-top{display:flex;flex-wrap:wrap;align-items:baseline;gap:.5rem 1rem;margin-bottom:.65rem}
#rocauc .rc-ttl{font-weight:700;font-size:13.5px;letter-spacing:.01em}
#rocauc .rc-read{margin-left:auto;display:flex;flex-wrap:wrap;gap:.35rem .5rem;align-items:center}
#rocauc .chip{display:inline-flex;align-items:baseline;gap:.32em;border:1px solid var(--line);border-radius:999px;padding:.13rem .55rem;font-size:11.5px;background:rgba(255,255,255,.5);white-space:nowrap}
#rocauc .chip b{font-variant-numeric:tabular-nums;font-weight:700;font-size:12.5px}
#rocauc .chip.fa b{color:var(--fa)}#rocauc .chip.hit b{color:var(--hit)}#rocauc .chip.auc b{color:var(--ink)}
#rocauc .rc-grid{display:grid;grid-template-columns:1.18fr 1fr;gap:.6rem 1rem;align-items:stretch}
@media(max-width:620px){#rocauc .rc-grid{grid-template-columns:1fr}}
#rocauc svg{display:block;width:100%;height:auto;overflow:visible}
#rocauc #dist,#rocauc #roc{cursor:ew-resize;touch-action:none}
#rocauc #roc{cursor:crosshair}
#rocauc .hint{font-size:10.5px;color:var(--muted);font-style:italic;margin:.05rem 0 0 .15rem}
#rocauc .panel{border:1px solid var(--grid);border-radius:11px;background:linear-gradient(#fffefb,#fdfaf3);padding:.35rem .45rem .2rem}
#rocauc .panel-h{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.06em;margin:.1rem 0 .15rem .15rem}
#rocauc .rc-ctrl{display:flex;flex-wrap:wrap;align-items:center;gap:.55rem .9rem;margin-top:.85rem;padding-top:.75rem;border-top:1px solid var(--grid)}
#rocauc button{font:inherit;font-weight:650;color:#fff;background:var(--crit);border:none;border-radius:8px;padding:.4rem .85rem;cursor:pointer;display:inline-flex;gap:.4em;align-items:center}
#rocauc button:hover{filter:brightness(1.06)}
#rocauc button.ghost{color:var(--muted);background:transparent;border:1px solid var(--line);font-weight:550}
#rocauc .sl{display:flex;align-items:center;gap:.5rem;font-size:12px;color:var(--muted)}
#rocauc .sl input[type=range]{width:120px;accent-color:var(--crit);cursor:pointer}
#rocauc .sl input.dp{accent-color:var(--s1)}
#rocauc .sl b{color:var(--ink);font-variant-numeric:tabular-nums;min-width:2.4em;display:inline-block}
#rocauc .rc-leg{display:flex;flex-wrap:wrap;gap:.3rem .8rem;margin-top:.7rem;font-size:11px;color:var(--muted)}
#rocauc .rc-leg span{display:inline-flex;align-items:center;gap:.38em}
#rocauc .sw{width:11px;height:11px;border-radius:3px;display:inline-block;border:1px solid rgba(0,0,0,.12)}
#rocauc .note{margin-top:.6rem;font-size:11.5px;color:var(--muted);line-height:1.5}
#rocauc .lit{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.92em}
</style>
<div id="rocauc">
  <div class="rc-top">
    <span class="rc-ttl">Receiver operating characteristic — sweep the criterion</span>
    <span class="rc-read">
      <span class="chip">d′ <b id="r-dp">1.50</b></span>
      <span class="chip">c <b id="r-c">0.00</b></span>
      <span class="chip hit">TPR(c) · hit rate <b id="r-h">0.77</b></span>
      <span class="chip fa">FPR(c) · false-alarm <b id="r-f">0.23</b></span>
      <span class="chip auc">AUC <b id="r-auc">0.86</b></span>
    </span>
  </div>
  <div class="rc-grid">
    <div class="panel"><div class="panel-h">response distributions P(n | <span class="lit">s</span>) — drag to move criterion</div><svg id="dist" viewBox="0 0 440 292" role="img" aria-label="Two response distributions with a sliding criterion"><g id="dist-static"></g><path id="tnArea"/><path id="fnArea"/><path id="fpArea"/><path id="tpArea"/><path id="s0curve"/><path id="s1curve"/><g id="crit-g"><line id="critLine"/><polygon id="critTab"/><text id="critLabel">criterion c</text></g><g id="dist-lab"></g></svg></div>
    <div class="panel"><div class="panel-h">ROC space — drag the operating point</div><svg id="roc" viewBox="0 0 332 300" role="img" aria-label="ROC curve traced as the criterion sweeps"><g id="roc-grid"></g><path id="aucArea"/><polyline id="rocCurve"/><line id="diag"/><circle id="rocDot"/><g id="roc-lab"></g></svg></div>
  </div>
  <div class="rc-ctrl">
    <button id="play" aria-label="play or pause the sweep"><span id="playIco">▶</span><span id="playTxt">Sweep criterion</span></button>
    <button id="reset" class="ghost">Reset</button>
    <label class="sl">criterion&nbsp;c <input id="critSl" type="range" min="0" max="1000" value="500" aria-label="criterion"> <b id="r-c2">0.00</b></label>
    <label class="sl">separation&nbsp;d′ <input id="dpSl" class="dp" type="range" min="20" max="300" value="150" aria-label="separation d prime"> <b id="r-dp2">1.50</b></label>
  </div>
  <div class="rc-leg">
    <span><span class="sw" style="background:var(--hit);opacity:.85"></span>TP · hit — area under P(n|<span class="lit">s₁</span>), n &gt; c</span>
    <span><span class="sw" style="background:var(--fa);opacity:.85"></span>FP · false alarm — area under P(n|<span class="lit">s₀</span>), n &gt; c</span>
    <span><span class="sw" style="background:var(--s1);opacity:.18;border-color:var(--s1)"></span>FN · miss</span>
    <span><span class="sw" style="background:var(--s0);opacity:.18;border-color:var(--s0)"></span>TN · correct rejection</span>
    <span><span class="sw" style="background:var(--crit)"></span>criterion c (threshold)</span>
    <span><span class="sw" style="background:var(--dot);border-radius:50%"></span>operating point (FPR(c), TPR(c))</span>
  </div>
  <div class="note">Each criterion <em>c</em> gives one (false-alarm, hit) point; sweeping <em>c</em> from left (call everything "<span class="lit">s₁</span>": top-right corner) to right (call nothing "<span class="lit">s₁</span>": bottom-left) traces the whole curve. <strong>AUC</strong> — the shaded area — is the probability a random <span class="lit">s₁</span> response outranks a random <span class="lit">s₀</span> response; for equal-variance Gaussians it equals Φ(d′/√2). The dashed diagonal is the no-discrimination line (AUC = ½, chance).</div>
</div>
<script>
(function(){
  var R=document.getElementById('rocauc'); if(!R) return;
  var $=function(id){return R.querySelector('#'+id);};
  var SVGNS='http://www.w3.org/2000/svg';
  function el(t,a){var e=document.createElementNS(SVGNS,t);for(var k in a)e.setAttribute(k,a[k]);return e;}
  // ---- math ----
  function erf(x){var s=x<0?-1:1;x=Math.abs(x);var t=1/(1+0.3275911*x);
    var y=1-(((((1.061405429*t-1.453152027)*t)+1.421413741)*t-0.284496736)*t+0.254829592)*t*Math.exp(-x*x);return s*y;}
  function Phi(z){return 0.5*(1+erf(z/Math.SQRT2));}
  function pdf(n,mu){var d=n-mu;return Math.exp(-0.5*d*d)/Math.sqrt(2*Math.PI);}
  // ---- distribution panel geometry ----
  var DXL=-4.7,DXR=4.7,PMAX=0.43, dL=44,dR=14,dT=18,dB=34, dPW=440-dL-dR, dPH=292-dT-dB, dBY=dT+dPH;
  function dx(n){return dL+(n-DXL)/(DXR-DXL)*dPW;}
  function dy(p){return dBY-(Math.max(0,Math.min(p,PMAX))/PMAX)*dPH;}
  // ---- roc panel geometry ----
  var rL=46,rR=16,rT=14,rB=44, rPW=332-rL-rR, rPH=300-rT-rB, rBY=rT+rPH;
  function fx(F){return rL+F*rPW;}
  function fy(H){return rBY-H*rPH;}
  // ---- one-time static scaffolding ----
  (function(){
    var g=$('dist-static');
    g.appendChild(el('rect',{x:dL,y:dT,width:dPW,height:dPH,fill:'none',stroke:'var(--line)','stroke-width':1}));
    g.appendChild(el('line',{x1:dL,y1:dBY,x2:dL+dPW,y2:dBY,stroke:'var(--line)','stroke-width':1}));
    var xl=el('text',{x:dL+dPW/2,y:292-4,'text-anchor':'middle',fill:'var(--muted)','font-size':11});xl.textContent='response  n';g.appendChild(xl);
    var yl=el('text',{x:13,y:dT+dPH/2,'text-anchor':'middle',fill:'var(--muted)','font-size':10.5,transform:'rotate(-90 13 '+(dT+dPH/2)+')'});yl.textContent='probability density';g.appendChild(yl);
    var rg=$('roc-grid');
    for(var i=0;i<=5;i++){var v=i/5;
      rg.appendChild(el('line',{x1:fx(v),y1:rT,x2:fx(v),y2:rBY,stroke:'var(--grid)','stroke-width':1}));
      rg.appendChild(el('line',{x1:rL,y1:fy(v),x2:rL+rPW,y2:fy(v),stroke:'var(--grid)','stroke-width':1}));
      var tx=el('text',{x:fx(v),y:rBY+13,'text-anchor':'middle',fill:'var(--muted)','font-size':9.5});tx.textContent=v.toFixed(1);rg.appendChild(tx);
      var ty=el('text',{x:rL-6,y:fy(v)+3,'text-anchor':'end',fill:'var(--muted)','font-size':9.5});ty.textContent=v.toFixed(1);rg.appendChild(ty);}
    rg.appendChild(el('rect',{x:rL,y:rT,width:rPW,height:rPH,fill:'none',stroke:'var(--line)','stroke-width':1}));
    var rxl=el('text',{x:rL+rPW/2,y:300-4,'text-anchor':'middle',fill:'var(--fa)','font-size':11,'font-weight':600});rxl.textContent='false-alarm rate (FPR)';$('roc-lab').appendChild(rxl);
    var ryl=el('text',{x:14,y:rT+rPH/2,'text-anchor':'middle',fill:'var(--hit)','font-size':11,'font-weight':600,transform:'rotate(-90 14 '+(rT+rPH/2)+')'});ryl.textContent='hit rate (TPR)';$('roc-lab').appendChild(ryl);
    $('diag').setAttribute('x1',fx(0));$('diag').setAttribute('y1',fy(0));$('diag').setAttribute('x2',fx(1));$('diag').setAttribute('y2',fy(1));
    $('diag').setAttribute('stroke','var(--muted)');$('diag').setAttribute('stroke-dasharray','4 4');$('diag').setAttribute('stroke-width',1);$('diag').setAttribute('opacity','.7');
  })();
  // labels that move with d' (created once, repositioned on update)
  var MONO='ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
  function distLabel(t,sub){t.textContent='';
    var a=el('tspan',{});a.textContent='P(n|';t.appendChild(a);
    var b=el('tspan',{'font-family':MONO});b.textContent=sub;t.appendChild(b);
    var d=el('tspan',{});d.textContent=')';t.appendChild(d);}
  var lab0=el('text',{fill:'var(--s0)','font-size':11.5,'text-anchor':'middle','font-weight':600});distLabel(lab0,'s₀');
  var lab1=el('text',{fill:'var(--s1)','font-size':11.5,'text-anchor':'middle','font-weight':600});distLabel(lab1,'s₁');
  $('dist-lab').appendChild(lab0);$('dist-lab').appendChild(lab1);
  // ---- path builders ----
  function curve(mu){var s='',K=180;for(var i=0;i<=K;i++){var n=DXL+(DXR-DXL)*i/K;s+=(i?'L':'M')+dx(n).toFixed(2)+' '+dy(pdf(n,mu)).toFixed(2)+' ';}return s;}
  function tail(mu,c,right){var a=right?Math.max(c,DXL):DXL,b=right?DXR:Math.min(c,DXR);if(b<=a)return '';
    var s='M'+dx(a).toFixed(2)+' '+dBY.toFixed(2)+' ',K=90;for(var i=0;i<=K;i++){var n=a+(b-a)*i/K;s+='L'+dx(n).toFixed(2)+' '+dy(pdf(n,mu)).toFixed(2)+' ';}
    s+='L'+dx(b).toFixed(2)+' '+dBY.toFixed(2)+' Z';return s;}
  // ---- state ----
  var dprime=1.5, c=0.0, CMIN=-4.5, CMAX=4.5, playing=false, raf=null, t0=0, DUR=9000;
  function mu0(){return -dprime/2;} function mu1(){return dprime/2;}
  function Fc(x){return 1-Phi(x-mu0());} function Hc(x){return 1-Phi(x-mu1());}
  // ---- render ----
  function render(){
    var m0=mu0(),m1=mu1();
    $('s0curve').setAttribute('d',curve(m0));$('s0curve').setAttribute('fill','none');$('s0curve').setAttribute('stroke','var(--s0)');$('s0curve').setAttribute('stroke-width',1.7);
    $('s1curve').setAttribute('d',curve(m1));$('s1curve').setAttribute('fill','none');$('s1curve').setAttribute('stroke','var(--s1)');$('s1curve').setAttribute('stroke-width',1.7);
    $('tpArea').setAttribute('d',tail(m1,c,true));$('tpArea').setAttribute('fill','var(--hit)');$('tpArea').setAttribute('opacity','.40');
    $('fpArea').setAttribute('d',tail(m0,c,true));$('fpArea').setAttribute('fill','var(--fa)');$('fpArea').setAttribute('opacity','.42');
    $('fnArea').setAttribute('d',tail(m1,c,false));$('fnArea').setAttribute('fill','var(--s1)');$('fnArea').setAttribute('opacity','.10');
    $('tnArea').setAttribute('d',tail(m0,c,false));$('tnArea').setAttribute('fill','var(--s0)');$('tnArea').setAttribute('opacity','.09');
    var cx=dx(c);
    $('critLine').setAttribute('x1',cx);$('critLine').setAttribute('y1',dT-2);$('critLine').setAttribute('x2',cx);$('critLine').setAttribute('y2',dBY);
    $('critLine').setAttribute('stroke','var(--crit)');$('critLine').setAttribute('stroke-width',1.8);$('critLine').setAttribute('stroke-dasharray','5 3');
    $('critTab').setAttribute('points',(cx-4)+','+(dT-2)+' '+(cx+4)+','+(dT-2)+' '+cx+','+(dT+5));$('critTab').setAttribute('fill','var(--crit)');
    var lab=$('critLabel');lab.setAttribute('x',cx);lab.setAttribute('y',dT-5);lab.setAttribute('text-anchor', cx>dL+dPW-60?'end':(cx<dL+50?'start':'middle'));
    lab.setAttribute('fill','var(--crit)');lab.setAttribute('font-size',10.5);lab.setAttribute('font-weight',600);
    lab0.setAttribute('x',dx(m0-1.05));lab0.setAttribute('y',dy(0.41));
    lab1.setAttribute('x',dx(m1+1.05));lab1.setAttribute('y',dy(0.41));
    // ROC curve + AUC
    var pts=[],K=160;for(var i=0;i<=K;i++){var cc=CMIN+(CMAX-CMIN)*i/K;pts.push([Fc(cc),Hc(cc)]);}
    $('rocCurve').setAttribute('points',pts.map(function(p){return fx(p[0]).toFixed(1)+','+fy(p[1]).toFixed(1);}).join(' '));
    $('rocCurve').setAttribute('fill','none');$('rocCurve').setAttribute('stroke','var(--ink)');$('rocCurve').setAttribute('stroke-width',1.6);$('rocCurve').setAttribute('opacity','.85');
    var ap='M'+fx(0)+' '+rBY+' ';for(var j=0;j<pts.length;j++)ap+='L'+fx(pts[j][0]).toFixed(1)+' '+fy(pts[j][1]).toFixed(1)+' ';ap+='L'+fx(1)+' '+rBY+' Z';
    $('aucArea').setAttribute('d',ap);$('aucArea').setAttribute('fill','var(--hit)');$('aucArea').setAttribute('opacity','.13');
    var F=Fc(c),H=Hc(c);
    $('rocDot').setAttribute('cx',fx(F));$('rocDot').setAttribute('cy',fy(H));$('rocDot').setAttribute('r',5);
    $('rocDot').setAttribute('fill','var(--dot)');$('rocDot').setAttribute('stroke','#fff');$('rocDot').setAttribute('stroke-width',1.5);
    // readouts
    var auc=Phi(dprime/Math.SQRT2);
    $('r-dp').textContent=dprime.toFixed(2);$('r-dp2').textContent=dprime.toFixed(2);
    $('r-c').textContent=c.toFixed(2);$('r-c2').textContent=c.toFixed(2);
    $('r-h').textContent=H.toFixed(2);$('r-f').textContent=F.toFixed(2);$('r-auc').textContent=auc.toFixed(2);
    $('critSl').value=Math.round((c-CMIN)/(CMAX-CMIN)*1000);
  }
  // ---- animation ----
  function tick(ts){if(!playing)return;if(!t0)t0=ts;var p=((ts-t0)%DUR)/DUR;c=CMIN+(CMAX-CMIN)*p;render();raf=requestAnimationFrame(tick);}
  function play(){playing=true;t0=0;$('playIco').textContent='❚❚';$('playTxt').textContent='Pause';raf=requestAnimationFrame(tick);}
  function pause(){playing=false;if(raf)cancelAnimationFrame(raf);$('playIco').textContent='▶';$('playTxt').textContent='Sweep criterion';}
  $('play').addEventListener('click',function(){playing?pause():play();});
  $('reset').addEventListener('click',function(){pause();c=0;dprime=1.5;$('dpSl').value=150;render();});
  $('critSl').addEventListener('input',function(){pause();c=CMIN+(CMAX-CMIN)*(+this.value)/1000;render();});
  $('dpSl').addEventListener('input',function(){dprime=(+this.value)/100;render();});
  // ---- drag directly on the plots ----
  function cFromROC(F,H){var best=0,bd=1e9;for(var i=0;i<=240;i++){var cc=CMIN+(CMAX-CMIN)*i/240;var df=Fc(cc)-F,dh=Hc(cc)-H,d=df*df+dh*dh;if(d<bd){bd=d;best=cc;}}return best;}
  function locOf(svg,e){var r=svg.getBoundingClientRect(),vb=svg.viewBox.baseVal;if(!r.width||!r.height)return{x:dL,y:dBY};
    return{x:vb.x+(e.clientX-r.left)/r.width*vb.width,y:vb.y+(e.clientY-r.top)/r.height*vb.height};}
  var distSvg=$('dist'),rocSvg=$('roc'),dragging=null;
  function fromDist(e){var p=locOf(distSvg,e),n=DXL+(p.x-dL)/dPW*(DXR-DXL);c=Math.max(CMIN,Math.min(CMAX,n));render();}
  function fromRoc(e){var p=locOf(rocSvg,e),F=Math.max(0,Math.min(1,(p.x-rL)/rPW)),H=Math.max(0,Math.min(1,(rBY-p.y)/rPH));c=cFromROC(F,H);render();}
  function startDrag(svg,which,fn){
    svg.addEventListener('pointerdown',function(e){pause();dragging=which;try{svg.setPointerCapture(e.pointerId);}catch(_){}fn(e);e.preventDefault();});
    svg.addEventListener('pointermove',function(e){if(dragging===which)fn(e);});
    svg.addEventListener('pointerup',function(){dragging=null;});
    svg.addEventListener('pointercancel',function(){dragging=null;});
  }
  startDrag(distSvg,'dist',fromDist);
  startDrag(rocSvg,'roc',fromRoc);
  render();
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce)play();
})();
</script>

### Reading the picture

The decision rule cuts the response axis at the criterion $c$: everything to the right is
predicted "$\mathtt{s_1}$" (positive), everything to the left "$\mathtt{s_0}$" (negative). That splits each
distribution into the four cells of the
[Wikipedia confusion matrix](https://en.wikipedia.org/wiki/Receiver_operating_characteristic) —
true/false × positive/negative:

| | predicted $\mathtt{s_1}$: $n>c$ | predicted $\mathtt{s_0}$: $n\le c$ |
|---|---|---|
| **condition $\mathtt{s_1}$** — positives (P) | true positive · **TP** (hit) | false negative · **FN** (miss) |
| **condition $\mathtt{s_0}$** — negatives (N) | false positive · **FP** (false alarm) | true negative · **TN** (correct rejection) |

Counting each cell as the area under the relevant distribution, and since the decision is
"positive when $n>c$", each ROC axis is a **tail probability** — written in Wikipedia's
canonical form:

$$
\begin{aligned}
\text{TPR}(c) &= P(n>c \mid \mathtt{s_1})
= \frac{\mathrm{TP}}{\mathrm{TP}+\mathrm{FN}}
= \int_{c}^{\infty}\! P(n\mid \mathtt{s_1})\,dn,\\[4pt]
\text{FPR}(c) &= P(n>c \mid \mathtt{s_0})
= \frac{\mathrm{FP}}{\mathrm{FP}+\mathrm{TN}}
= \int_{c}^{\infty}\! P(n\mid \mathtt{s_0})\,dn.
\end{aligned}
$$

(TPR is also called sensitivity or recall; FPR is fall-out, $1-\text{specificity}$.) So the
teal tail under $P(n\mid \mathtt{s_1})$ is $\text{TPR}(c)$ and the terracotta tail under
$P(n\mid \mathtt{s_0})$ is $\text{FPR}(c)$; drop both onto the ROC axes and you get one point.

### The operating point *is* the criterion

Each value of $c$ produces exactly one pair $\big(\mathrm{FPR}(c),\,\mathrm{TPR}(c)\big)$ — a
single dot in ROC space, the **operating point**, drawn here in the same purple as the
criterion line because it is the same thing seen twice. The ROC curve is nothing more than
the image of the whole criterion axis under that map,

$$
c\ \longmapsto\ \big(\mathrm{FPR}(c),\,\mathrm{TPR}(c)\big),
\qquad c:\ +\infty\to-\infty \ \Longrightarrow\ (0,0)\to(1,1),
$$

so the two panels share a single degree of freedom: sliding the purple line and dragging the
purple dot are the *same knob*. Raise the threshold (push $c$ right) and the point slides
**down** the curve toward the origin — few hits but few false alarms, a conservative
"rarely say $\mathtt{s_1}$". Lower it (pull $c$ left) and the point climbs toward $(1,1)$ — a liberal
"almost always say $\mathtt{s_1}$". The map is monotone, so the operating point can only travel
*along* the curve, never off it: the criterion chooses **where on the curve** you sit, while
the separation $d'$ below sets **which curve** you are on.

### What AUC measures

The **area under the ROC curve** is a single, threshold-free summary of how separable the
two distributions are. Equivalently, it is the probability that a randomly drawn $\mathtt{s_1}$
response outranks a randomly drawn $\mathtt{s_0}$ response,

$$
\mathrm{AUC}=P\!\big(n_1 > n_0\big),\qquad n_1\sim P(n\mid \mathtt{s_1}),\; n_0\sim P(n\mid \mathtt{s_0}).
$$

<details style="margin:1.2rem 0;border:1px solid rgba(31,24,18,.16);border-radius:12px;background:rgba(255,252,246,.6);padding:.1rem 1rem">
<summary style="cursor:pointer;font-weight:600;color:#7c3aed;padding:.6rem 0">Show the derivation — why AUC = P(n₁ &gt; n₀)</summary>

Write the ROC curve parametrically in the criterion $c$, keeping the rule "report $\mathtt{s_1}$ when
$n>c$". With $F_0,F_1$ the cumulative distribution functions of the two responses and
$f_0=P(\,\cdot\mid \mathtt{s_0})$ the $\mathtt{s_0}$ density,

$$
\mathrm{FPR}(c)=P(n_0>c)=1-F_0(c),\qquad
\mathrm{TPR}(c)=P(n_1>c)=1-F_1(c).
$$

The AUC is the area under the curve — $\mathrm{TPR}(c)$ integrated against $\mathrm{FPR}(c)$ as
$c$ sweeps the axis. Substituting $d\,\mathrm{FPR}=-f_0(c)\,dc$ and noting that $c:+\infty\to-\infty$
drives $\mathrm{FPR}:0\to1$, the two sign flips cancel:

$$
\mathrm{AUC}=\int_0^1 \mathrm{TPR}\;d\,\mathrm{FPR}
=\int_{+\infty}^{-\infty}\!\big(1-F_1(c)\big)\big(-f_0(c)\big)\,dc
=\int_{-\infty}^{\infty}P(n_1>c)\,f_0(c)\,dc.
$$

Now read $f_0(c)\,dc$ as the chance the $\mathtt{s_0}$ draw lands at $n_0=c$. The integrand is then
$P(n_1>c\mid n_0=c)\,P(n_0=c)$, and integrating over $c$ is exactly the law of total
probability (using that $n_0,n_1$ are independent):

$$
\mathrm{AUC}=\int_{-\infty}^{\infty}P\!\big(n_1>n_0\mid n_0=c\big)\,P(n_0=c)\,dc
=P\!\big(n_1>n_0\big).
$$

So the area under the ROC curve is the probability that a random response to $\mathtt{s_1}$ outranks a
random response to $\mathtt{s_0}$ — a single, threshold-free measure of separability. (Ties split
evenly, contributing $\tfrac12$; for continuous distributions they have probability zero.)

</details>

For two unit-variance Gaussians a distance $d'=\mu_1-\mu_0$ apart — the equal-variance case
drawn here — this has a closed form,

$$
\mathrm{AUC}=\Phi\!\left(\frac{d'}{\sqrt2}\right),
$$

so $d'=0$ gives AUC $=\tfrac12$ (the dashed no-discrimination diagonal, pure chance) and
larger $d'$ pushes the curve toward the perfect corner $(0,1)$ with AUC $\to 1$. Pull the
$d'$ slider to watch the distributions separate and the area fill in.

---

*Notation and the criterion-sweep construction after Maneesh Sahani, *Theoretical
Neuroscience* (rate codes / signal detection, p. 301 ff). The FPR–TPR axes, the
confusion-matrix terminology (TP/FP/FN/TN, sensitivity / fall-out) and the
no-discrimination diagonal follow
[Wikipedia: Receiver operating characteristic](https://en.wikipedia.org/wiki/Receiver_operating_characteristic);
the criterion and its operating point share one colour to mark them as the same object.*
