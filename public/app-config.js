/* Public routing only: never place secrets in this file. */
(function(){
 'use strict';
 if(window.PONGY_CONFIG&&typeof window.PONGY_CONFIG.apiUrl==='string')return;
 window.PONGY_CONFIG={apiUrl:''};
})();
