import {parentPort,workerData} from 'node:worker_threads';
import {extractDocument} from './files.js';
try{const text=await extractDocument(Buffer.from(workerData.buffer),workerData.ext);parentPort.postMessage({text});}catch(error){parentPort.postMessage({code:error.code,error:error.status===400?error.message:'Не удалось прочитать документ: он повреждён, защищён или слишком сложный.'});}
