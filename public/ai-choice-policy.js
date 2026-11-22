(function(root){
'use strict';
function requiresPaid(agent,thinking){return agent==='extra'||thinking==='extra';}
function normalize(agent,thinking,paid){
 var nextAgent=['low','standard','flash','extra'].includes(agent)?agent:'standard';
 var nextThinking=['low','middle','high','extra'].includes(thinking)?thinking:'middle';
 if(!paid){if(nextAgent==='extra')nextAgent='standard';if(nextThinking==='extra')nextThinking='high';}
 return Object.freeze({agent:nextAgent,thinking:nextThinking,changed:nextAgent!==agent||nextThinking!==thinking});
}
root.PongyAIChoicePolicy=Object.freeze({requiresPaid:requiresPaid,normalize:normalize});
})(window);
