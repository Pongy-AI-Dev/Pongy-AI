// Public product contacts. Only server-verified whitelist membership grants developer controls; client labels never grant access.
export const SUPPORT_EMAILS=Object.freeze(['support@pongy.ai','sergiv1609@gmail.com','sergiv160912@gmail.com','sergiv160912103@gmail.com','sergiv160912103123@gmail.com']);
export function isDeveloper(user){return !!user&&Number(user.email_verified)===1&&SUPPORT_EMAILS.slice(1).includes(String(user.email||'').trim().toLowerCase())}
export function creatorContext(user){return {name:'Иван Сергеев',publicAccount:'sergiv1609@gmail.com',currentUserIsDeveloper:isDeveloper(user)}}
