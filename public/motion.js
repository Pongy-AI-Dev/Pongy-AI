(function(root){'use strict';
function read(){var value=null;try{value=localStorage.getItem('pongy_motion');try{value=JSON.parse(value);}catch(_){} }catch(_){}var explicit=['full','system','reduced'].includes(value);return {preference:explicit?value:'full',explicit:explicit};}
function apply(value=read()){var reduced=value.preference==='reduced'||(value.preference!=='full'||!value.explicit)&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;document.documentElement.dataset.motion=reduced?'reduced':value.preference;document.documentElement.dataset.motionExplicit=String(value.explicit);return value;}
var nav=root.navigator||{};var compact=(nav.deviceMemory&&nav.deviceMemory<=4)||(nav.hardwareConcurrency&&nav.hardwareConcurrency<=4);document.documentElement.dataset.renderBudget=compact?'compact':'normal';root.PongyMotion={read,apply};apply();
})(window);
// Delegated feedback also covers icons added later by chat/note renderers.
(function(){'use strict';if(typeof document.addEventListener!=='function')return;var running=new Map();
function allowed(){var d=document.documentElement.dataset;return d.motion!=='reduced'&&!(window.matchMedia('(prefers-reduced-motion: reduce)').matches&&d.motionExplicit!=='true');}
function stop(){running.forEach(function(a){a.cancel()});running.clear()}
function press(e){if(!allowed()||(e.type==='pointerdown'&&e.button!==0)||(e.type==='keydown'&&!['Enter',' '].includes(e.key))||e.repeat)return;var button=e.target.closest?.('button,a,[role="button"]');if(!button||button.disabled||button.getAttribute('aria-disabled')==='true'||button.closest('[inert]')||button.dataset.action==='like')return;var svg=button.querySelector('svg');if(!svg||!svg.animate)return;running.get(svg)?.cancel();var animation=svg.animate([{transform:'scale(1)'},{transform:'scale(.84) rotate(-4deg)',offset:.3},{transform:'scale(1.07)',offset:.72},{transform:'scale(1)'}],{duration:280,easing:'cubic-bezier(.2,.8,.3,1)'});running.set(svg,animation);function done(){if(running.get(svg)===animation)running.delete(svg)}animation.onfinish=done;animation.oncancel=done;}
document.addEventListener('pointerdown',press,{passive:true});document.addEventListener('keydown',press);
new MutationObserver(function(){if(!allowed())stop()}).observe(document.documentElement,{attributes:true,attributeFilter:['data-motion','data-motion-explicit']});
window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener?.('change',function(){if(!allowed())stop()});
})();
