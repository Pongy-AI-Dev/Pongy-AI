(function(root){'use strict';
function read(){var value=null;try{value=localStorage.getItem('pongy_motion');try{value=JSON.parse(value);}catch(_){} }catch(_){}var explicit=['full','system','reduced'].includes(value);return {preference:explicit?value:'full',explicit:explicit};}
function apply(value=read()){var reduced=value.preference==='reduced'||(value.preference!=='full'||!value.explicit)&&root.matchMedia('(prefers-reduced-motion: reduce)').matches;document.documentElement.dataset.motion=reduced?'reduced':value.preference;document.documentElement.dataset.motionExplicit=String(value.explicit);return value;}
root.PongyMotion={read,apply};apply();
})(window);
