// Developer privileges are granted only to server-verified email addresses.
const DEFAULT_DEVELOPER_EMAILS=['sergiv1609@gmail.com','sergiv160912@gmail.com','sergiv160912103@gmail.com','sergiv160912103123@gmail.com','pongy.support@gmail.com','notion.app.login@gmail.com'];
const ENV_DEVELOPER_EMAILS=String(process.env.PONGY_DEVELOPER_EMAILS||'').split(/[;,\s]+/).map(value=>value.trim().toLowerCase()).filter(value=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value));
const DEVELOPER_EMAILS=Object.freeze([...new Set([...DEFAULT_DEVELOPER_EMAILS,...ENV_DEVELOPER_EMAILS])]);
export const PUBLIC_SUPPORT_EMAILS=Object.freeze(['support@pongy.ai','pongy.support@gmail.com']);
export const SUPPORT_EMAILS=Object.freeze([...PUBLIC_SUPPORT_EMAILS,...DEVELOPER_EMAILS]);
export const DEVELOPER_ACCOUNTS=DEVELOPER_EMAILS;
export function isDeveloper(user){return !!user&&Number(user.email_verified)===1&&DEVELOPER_EMAILS.includes(String(user.email||'').trim().toLowerCase())}
export function creatorContext(user){return {creator:'Pongy AI Dev',developer:'Pongy AI Dev',country:'Россия',releaseYear:2026,currentUserIsDeveloper:isDeveloper(user)}}
