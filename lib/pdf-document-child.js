import {PDFParse} from 'pdf-parse';
const chunks=[];
for await (const chunk of process.stdin) chunks.push(chunk);
const parser=new PDFParse({data:new Uint8Array(Buffer.concat(chunks))});
try {const result=await parser.getText({first:1,last:12});process.stdout.write(JSON.stringify({text:String(result.text||'').slice(0,50000)}));}
finally {await parser.destroy();}
