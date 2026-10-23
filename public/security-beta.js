(function(root){'use strict';let panel,timer,interval,sequence=0,returnFocus;
const scenes={
 ru:[
  'СИМУЛЯЦИЯ: автономная демонстрация запущена.',
  'Подключение к реальным сервисам отключено.',
  'Загрузка вымышленного интерфейса P.O.N.G.Y…',
  'СИСТЕМА: проверка защитных модулей — постановочный сценарий.',
  'СИСТЕМА: внешние команды и сетевые действия недоступны.',
  'ВНИМАНИЕ: это локальная сцена, она ничего не меняет в аккаунте.',
  'ЭЛБЕР: Вы нашли секретный тестовый режим.',
  'СИСТЕМА: обнаружен фиктивный процесс R.R.E.B.L.E.',
  'R.R.E.B.L.E: визуальный канал перехвачен.',
  'ЭЛБЕР: Не волнуйтесь — это всего лишь декорация.',
  'СИСТЕМА: проверка паролей и личных данных не выполняется.',
  'R.R.E.B.L.E: рисую помехи на экране…',
  'СИСТЕМА: временная визуальная ошибка интерфейса.',
  'ЭЛБЕР: Пора вернуть Pongy в рабочее состояние.',
  'СИСТЕМА: восстановление демонстрационного интерфейса…',
  'СИСТЕМА: фиктивный процесс R.R.E.B.L.E остановлен.',
  'СИСТЕМА: проверка локальной сцены — завершена.',
  'СИМУЛЯЦИЯ: Pongy AI снова в строю. Никаких реальных изменений не было.'
 ],
 en:[
  'SIMULATION: standalone visual demo started.',
  'Connections to real services are disabled.',
  'Loading fictional P.O.N.G.Y interface…',
  'SYSTEM: protection checks are part of this scripted scene.',
  'SYSTEM: external commands and network actions are unavailable.',
  'NOTICE: this is local fiction; it does not change your account.',
  'ELBER: You found the secret test mode.',
  'SYSTEM: fictional process R.R.E.B.L.E detected.',
  'R.R.E.B.L.E: visual channel intercepted.',
  'ELBER: No worries — it is only a stage effect.',
  'SYSTEM: no passwords or personal data are being checked.',
  'R.R.E.B.L.E: drawing screen interference…',
  'SYSTEM: temporary visual interface fault.',
  'ELBER: Time to bring Pongy back online.',
  'SYSTEM: restoring the demo interface…',
  'SYSTEM: fictional R.R.E.B.L.E process stopped.',
  'SYSTEM: local scene checks complete.',
  'SIMULATION: Pongy AI is back. Nothing real was changed.'
 ]
};
function close(){clearTimeout(timer);clearInterval(interval);timer=interval=null;sequence=0;if(panel){panel.remove();panel=null;}if(returnFocus?.isConnected)returnFocus.focus();returnFocus=null;}
function start(lang){
 close();returnFocus=document.activeElement;const lines=scenes[lang==='ru'?'ru':'en'];panel=document.createElement('section');panel.className='security-beta-scene';panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','securityBetaTitle');panel.setAttribute('aria-describedby','securityBetaNotice');
 const header=document.createElement('header'),title=document.createElement('h2'),exit=document.createElement('button'),notice=document.createElement('p'),stage=document.createElement('div'),consoleBox=document.createElement('div'),image=document.createElement('img'),log=document.createElement('div');
 title.id='securityBetaTitle';title.textContent=lang==='ru'?'Секретная бета-сцена':'Secret beta scene';exit.type='button';exit.className='security-beta-exit';exit.setAttribute('aria-label',lang==='ru'?'Закрыть симуляцию':'Close simulation');exit.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m18 6-12 12M6 6l12 12"/></svg>';exit.onclick=close;header.append(title,exit);
 notice.id='securityBetaNotice';notice.className='security-beta-notice';notice.textContent=lang==='ru'?'Локальная вымышленная симуляция. Сеть, защита, учётная запись и данные не затрагиваются.':'Local fictional simulation. Network, security, account and data are not affected.';
 stage.className='security-beta-stage';image.src='/elber.png';image.alt=lang==='ru'?'Элбер — персонаж локальной симуляции':'Elber — character in the local simulation';image.className='security-beta-elber';consoleBox.className='security-beta-console';consoleBox.setAttribute('aria-label',lang==='ru'?'Журнал вымышленной сцены':'Fictional scene log');log.className='security-beta-log';consoleBox.append(log);panel.append(header,notice,stage,image,consoleBox);panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close();}});document.body.append(panel);
 const renderLine=()=>{if(!panel)return;const row=document.createElement('p');row.textContent='['+new Date().toLocaleTimeString()+'] '+lines[sequence++];log.append(row);consoleBox.scrollTop=consoleBox.scrollHeight;if(sequence===6||sequence===11)panel.classList.add('security-beta-glitch');else panel.classList.remove('security-beta-glitch');if(sequence===12)panel.classList.add('security-beta-blackout');if(sequence===14)panel.classList.remove('security-beta-blackout');if(sequence>=lines.length)clearInterval(interval);};
 renderLine();interval=setInterval(renderLine,1450);timer=setTimeout(close,30000);exit.focus();
}
root.PongySecurityBeta={start,close};
})(window);
