(function(root){'use strict';
function read(){var value=null;try{value=localStorage.getItem('pongy_motion');try{value=JSON.parse(value);}catch(_){} }catch(_){}var explicit=['full','system','reduced'].includes(value);return {preference:explicit?value:'full',explicit:explicit};}
function apply(value=read()){var reduced=value.preference==='reduced'||(value.preference!=='full'||!value.explicit)&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;document.documentElement.dataset.motion=reduced?'reduced':value.preference;document.documentElement.dataset.motionExplicit=String(value.explicit);return value;}
var nav=root.navigator||{};var compact=(nav.deviceMemory&&nav.deviceMemory<=4)||(nav.hardwareConcurrency&&nav.hardwareConcurrency<=4);document.documentElement.dataset.renderBudget=compact?'compact':'normal';root.PongyMotion={read,apply};apply();
})(window);
