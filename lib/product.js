// Public product contacts. Only server-verified whitelist membership grants developer controls; client labels never grant access.
const DEVELOPER_EMAILS=Object.freeze(['sergiv1609@gmail.com','sergiv160912@gmail.com','sergiv160912103@gmail.com','sergiv160912103123@gmail.com','pongy.support@gmail.com','notion.app.login@gmail.com']);
export const SUPPORT_EMAILS=Object.freeze(['support@pongy.ai','pongy.support@gmail.com',...DEVELOPER_EMAILS]);
export const DEVELOPER_ACCOUNTS=DEVELOPER_EMAILS;
export function isDeveloper(user){return !!user&&Number(user.email_verified)===1&&DEVELOPER_EMAILS.includes(String(user.email||'').trim().toLowerCase())}
export function creatorContext(user){return {creator:'Pongy AI Dev',developer:'Pongy AI Dev',country:'Россия',releaseYear:2026,currentUserIsDeveloper:isDeveloper(user)}}
