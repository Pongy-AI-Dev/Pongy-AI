const toggle=document.getElementById('enabled'),status=document.getElementById('status');
function label(){status.textContent=toggle.checked?'Включено. Скажите «Понги» во время фонового слушания сайта.':'Выключено. Сайт не сможет переключать вкладку через это расширение.'}
chrome.storage.local.get('enabled').then(v=>{toggle.checked=v.enabled===true;label()}).catch(()=>{status.textContent='Не удалось загрузить настройку.'});
toggle.addEventListener('change',async()=>{toggle.disabled=true;try{await chrome.storage.local.set({enabled:toggle.checked});label()}catch{toggle.checked=!toggle.checked;status.textContent='Не удалось сохранить настройку.'}finally{toggle.disabled=false}});
