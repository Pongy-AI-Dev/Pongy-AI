import nodemailer from 'nodemailer';
// Only operator-controlled configuration determines the transport. No credentials in public status.
const mailbox = value => typeof value === 'string' && !/[\r\n]/.test(value) && /^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);
function fromOK(value) {
 if(typeof value !== 'string' || value.length > 320 || /[\r\n]/.test(value))return false;
 const match=value.match(/^[^<>]*<([^<>]+)>$/);
 return mailbox(match?match[1]:value);
}
export function mailSettings(config) {
 const mode=String(config.mailProvider||'auto').toLowerCase();
 if(!['auto','smtp','resend'].includes(mode))return {provider:'none',configured:false};
 const hasSMTP=!!(config.smtpHost||config.smtpUser||config.smtpPass);
 const provider=mode==='auto'?(hasSMTP?'smtp':'resend'):mode;
 if(!fromOK(config.mailFrom))return {provider,configured:false};
 if(provider==='resend')return {provider,configured:!!config.resendKey};
 const host=String(config.smtpHost||'').trim(),port=Number(config.smtpPort||465);
 const secure=config.smtpSecure===''||config.smtpSecure==null?port===465:String(config.smtpSecure)==='true';
 if(!host || !/^[a-z0-9.-]+$/i.test(host) || ![465,587,2525].includes(port) || (port===465&&!secure) || !mailbox(config.smtpUser) || !config.smtpPass || !['','true','false'].includes(String(config.smtpSecure??'')))return {provider,configured:false};
 // Google displays its app passwords grouped with spaces. Keep other providers' passwords intact.
 const pass=/(^|\.)gmail\.com$/i.test(host)?String(config.smtpPass).replace(/\s/g,''):String(config.smtpPass);
 return {provider,configured:true,options:{host,port,secure,requireTLS:true,auth:{user:config.smtpUser,pass},tls:{rejectUnauthorized:true,minVersion:'TLSv1.2'},connectionTimeout:10000,greetingTimeout:10000,socketTimeout:20000,pool:true,maxConnections:2,maxMessages:50,disableFileAccess:true,disableUrlAccess:true,logger:false,debug:false}};
}
export function createMailer({config,fetchImpl=fetch,transportFactory=nodemailer.createTransport}) {
 const settings=mailSettings(config);let transport;
 return {
  configured:settings.configured,provider:settings.provider,
  async send({to,subject,text,id}) {
   if(!settings.configured)throw Error('Mail is not configured');
   if(!mailbox(to)||typeof subject!=='string'||/[\r\n]/.test(subject)||typeof text!=='string')throw Error('Invalid mail payload');
   if(settings.provider==='smtp') {
    transport ||= transportFactory(settings.options);
    const result=await transport.sendMail({from:config.mailFrom,to,subject,text,messageId:'<'+String(id).replace(/[^a-zA-Z0-9_-]/g,'').slice(0,120)+'@pongy.local>',disableFileAccess:true,disableUrlAccess:true});
    if(!result?.accepted?.length || result.rejected?.length)throw Error('Mail recipient rejected');
   } else {
    const response=await fetchImpl('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(10000),headers:{'Content-Type':'application/json',Authorization:'Bearer '+config.resendKey,'Idempotency-Key':id},body:JSON.stringify({from:config.mailFrom,to:[to],subject,text})});
    if(!response.ok){let detail={};try{detail=await response.json();}catch{}const error=Error('Mail rejected');error.mailStatus=response.status;error.mailName=String(detail.name||'').slice(0,80);throw error;}
   }
  },
  close(){transport?.close?.();}
 };
}

// Classify provider failures without exposing addresses, credentials or raw responses.
export function mailFailure(error) {
 const code=String(error?.code||''),status=Number(error?.mailStatus||0),name=String(error?.mailName||'');
 if(code==='EAUTH'||status===401)return {code:'MAIL_AUTH_FAILED',error:'Почтовая авторизация отклонена. Проверьте ключ Resend или пароль приложения SMTP в Render.'};
 if(status===403||name==='validation_error')return {code:'MAIL_SENDER_REJECTED',error:'Провайдер запретил отправку. Подтвердите домен MAIL_FROM и права отправителя; тестовый отправитель Resend может писать только разрешённому адресу.'};
 if(status===429)return {code:'MAIL_RATE_LIMIT',error:'Лимит почтового провайдера исчерпан. Повторите отправку позже.'};
 if(['ETIMEDOUT','ECONNECTION','ECONNREFUSED','ESOCKET','EDNS'].includes(code)||error?.name==='TimeoutError')return {code:'MAIL_CONNECTION_FAILED',error:'Сервер не может подключиться к почте. Проверьте ограничения SMTP вашего тарифа Render; можно использовать Resend по HTTPS с MAIL_PROVIDER=resend.'};
 return {code:'MAIL_SEND_FAILED',error:'Письмо не принято провайдером. Проверьте отправителя MAIL_FROM и настройки SMTP/Resend. Напоминания и уведомления работают независимо от почты.'};
}
