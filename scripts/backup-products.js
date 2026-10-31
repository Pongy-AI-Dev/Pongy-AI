// Run on a trusted host with the original SQLite copy and server-only Firestore credentials.
import Database from 'better-sqlite3';
import {loadConfig} from '../lib/config.js';
import {createSubscriptions} from '../lib/subscriptions.js';
import {createDurableProducts} from '../lib/durable-products.js';
import 'dotenv/config';
const config=loadConfig();
if(!config.productServiceAccount){console.error('Set PONGY_PRODUCT_SERVICE_ACCOUNT_JSON in the server environment first');process.exit(1);}
const db=new Database(config.databasePath,{fileMustExist:true});db.pragma('busy_timeout = 5000');
try{const subscriptions=createSubscriptions({db}),durable=createDurableProducts({db,subscriptions,config});let ok=0,failed=0;const users=db.prepare('SELECT DISTINCT u.* FROM users u LEFT JOIN product_events p ON p.user_id=u.id WHERE u.email_verified=1 AND (u.subscription_until>0 OR u.smart_pc_until>0 OR p.id IS NOT NULL)').all();for(const u of users){try{await durable.ensure(u,{force:true});ok++;}catch{failed++;}if((ok+failed)%100===0)console.log('Processed:',ok+failed);}console.log('Cloud confirmed:',ok,'Failed:',failed);if(failed)process.exitCode=1;}finally{db.close();}
