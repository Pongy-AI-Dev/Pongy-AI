/* Optional Chrome/Edge companion. No extension => normal site/notification fallback. */
(function(root){'use strict';var ID='nbilfglhlfmpfoiiddoedeeojpbjaenk';
function requestFocus(){if(location.origin!=='https://pongy-ai.devs.surf'||!root.chrome?.runtime?.sendMessage)return Promise.resolve(false);return new Promise(function(resolve){var done=false,timer=setTimeout(function(){finish(false)},1500);function finish(value){if(done)return;done=true;clearTimeout(timer);resolve(value)}try{root.chrome.runtime.sendMessage(ID,{type:'PONGY_WAKE_FOCUS'},function(reply){var failed=!!root.chrome.runtime.lastError;finish(!failed&&reply?.ok===true&&reply?.focused===true)})}catch(e){finish(false)}})}
root.PongyFocusBridge={requestFocus:requestFocus};
})(window);
