import crypto from 'node:crypto';
import PptxGenJS from 'pptxgenjs';
import {Document,Packer,Paragraph,TextRun,HeadingLevel} from 'docx';
import sharp from 'sharp';
import {findImages,imageUrl} from './research.js';
const fail=message=>Object.assign(Error(message),{status:400,publicMessage:true});
const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function illustration(query,fetchImpl,signal){
 const found=await findImages(query,fetchImpl,signal);
 for(const candidate of found.slice(0,2))try{
  const url=imageUrl(candidate.url);if(!url)continue;
  const r=await fetchImpl(url,{redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(5000)]):AbortSignal.timeout(5000)});
  if(!r.ok||!r.body||Number(r.headers.get('content-length'))>3*1024*1024)continue;
  const reader=r.body.getReader(),chunks=[];let bytes=0;
  try{while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.length;if(bytes>3*1024*1024)throw Error('Image too large');chunks.push(Buffer.from(part.value));}}finally{await reader.cancel().catch(()=>{});}
  const data=await sharp(Buffer.concat(chunks),{limitInputPixels:16000000}).rotate().resize(900,550,{fit:'inside',withoutEnlargement:true}).flatten({background:'#ffffff'}).jpeg({quality:72}).toBuffer();
  if(data.length>130000)continue;
  const meta=await sharp(data).metadata();return {...candidate,data,width:meta.width,height:meta.height};
 }catch(error){if(signal?.aborted)throw error;}
 return null;
}
export async function createDocument(args,{fetchImpl=fetch,signal}={}){
 if(!args||!['pptx','docx','html'].includes(args.format)||typeof args.title!=='string'||!args.title.trim()||args.title.length>150||!Array.isArray(args.sections)||!args.sections.length||args.sections.length>12)throw fail('Укажите формат PPTX, DOCX или HTML, название и 1–12 разделов.');
 let total=0;const sections=args.sections.map(s=>{if(!s||typeof s.title!=='string'||s.title.length>120||typeof s.text!=='string'||s.text.length>1800||s.imageQuery!=null&&(typeof s.imageQuery!=='string'||s.imageQuery.length>150))throw fail('Некорректный раздел документа.');total+=s.title.length+s.text.length;return {title:s.title,text:s.text,imageQuery:s.imageQuery};});if(total>16000)throw fail('Слишком большой документ.');
 const accent=/^[a-f0-9]{6}$/i.test(args.accent||'')?args.accent:'685DFA',credits=[],warnings=[];
 const deadline=AbortSignal.timeout(22000),bounded=signal?AbortSignal.any([signal,deadline]):deadline;
 if(args.format!=='docx'){
  const requested=sections.filter(s=>s.imageQuery).slice(0,10);let cursor=0;
  // Two independent bounded lookups at a time, instead of a long serial chain.
  await Promise.all(Array.from({length:Math.min(2,requested.length)},async()=>{while(cursor<requested.length&&!bounded.aborted){const s=requested[cursor++];try{s.picture=await illustration(s.imageQuery,fetchImpl,bounded);if(!s.picture)warnings.push('Image not available: '+s.imageQuery);}catch(error){if(signal?.aborted)throw error;warnings.push('Image lookup timed out.');}}}));
  for(const s of sections)if(s.picture)credits.push(s.picture);
 }
 let buffer,mime;const text=[args.title,...sections.map(s=>s.title+'\n'+s.text)].join('\n\n');
 if(args.format==='pptx'){
  const deck=new PptxGenJS();deck.layout='LAYOUT_WIDE';deck.author='Pongy AI';deck.subject=args.title;deck.title=args.title;deck.lang=/[а-яё]/i.test(text)?'ru-RU':'en-US';deck.theme={headFontFace:'Arial',bodyFontFace:'Arial',lang:deck.lang};
  for(const [index,s] of sections.entries()){
   const slide=deck.addSlide(),dark=index%3===0;slide.background={color:dark?'171B2B':'F7F8FC'};
   const foreground=dark?'FFFFFF':'202332',secondary=dark?'D8DCED':'35394B';
   slide.addShape(deck.ShapeType.rect,{x:0,y:0,w:0.12,h:7.5,fill:{color:accent},line:{color:accent}});
   slide.addShape(deck.ShapeType.rect,{x:0.6,y:0.5,w:0.6,h:0.07,fill:{color:accent},line:{color:accent}});
   slide.addText(String(index+1).padStart(2,'0'),{x:11.6,y:0.35,w:1,h:0.5,fontSize:18,bold:true,color:accent,align:'right'});
   slide.addText(s.title||args.title,{x:0.6,y:0.85,w:12.1,h:0.85,fontFace:'Arial',fontSize:30,bold:true,color:foreground,fit:'shrink'});
   slide.addShape(deck.ShapeType.roundRect,{x:0.5,y:1.95,w:s.picture?6.2:12.2,h:4.6,radius:0.15,fill:{color:dark?'232940':'FFFFFF'},line:{color:dark?'303952':'E4E7F1',width:1}});
   slide.addText(s.text,{x:0.78,y:2.18,w:s.picture?5.65:11.6,h:4.1,fontSize:19,color:secondary,fit:'shrink',valign:'top',paraSpaceAfterPt:12,margin:0,breakLine:false});
   if(s.picture){const ratio=s.picture.width/s.picture.height,w=Math.min(5.6,3.8*ratio),h=w/ratio;slide.addImage({data:'image/jpeg;base64,'+s.picture.data.toString('base64'),x:7+(5.6-w)/2,y:1.9+(3.8-h)/2,w,h});slide.addText(s.picture.title.slice(0,130),{x:7,y:5.85,w:5.6,h:0.55,fontSize:10,color:dark?'BBC3DE':'666879'});slide.addNotes('Image source: '+s.picture.page+'\n'+s.picture.author+'\n'+s.picture.license);}
   slide.addText(args.title+' · '+(index+1),{x:0.6,y:7,w:12,h:0.25,fontSize:10,color:'797B8C'});
  }
  if(credits.length){const slide=deck.addSlide();slide.addText('Image sources / Источники изображений',{x:0.6,y:0.6,w:12,h:0.8,fontSize:26,bold:true});slide.addText(credits.map(c=>c.title+'\n'+c.page+'\n'+c.author+' · '+c.license).join('\n\n'),{x:0.6,y:1.6,w:12,h:5.5,fontSize:12,fit:'shrink'});}
  buffer=await deck.write({outputType:'nodebuffer',compression:true});mime='application/vnd.openxmlformats-officedocument.presentationml.presentation';
 }else if(args.format==='docx'){
  const children=[new Paragraph({text:args.title,heading:HeadingLevel.TITLE})];for(const s of sections){children.push(new Paragraph({text:s.title,heading:HeadingLevel.HEADING_1}));for(const line of s.text.split('\n'))children.push(new Paragraph({children:[new TextRun(line)]}));}
  buffer=await Packer.toBuffer(new Document({creator:'Pongy AI',title:args.title,sections:[{children}]}));mime='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
 }else{
  const html='<!doctype html><html lang="'+(/[а-яё]/i.test(text)?'ru':'en')+'"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+escape(args.title)+'</title><style>body{margin:0;background:#eeeef6;color:#202332;font:18px/1.6 Arial}section{box-sizing:border-box;max-width:1100px;min-height:85vh;margin:24px auto;background:white;padding:48px;border-radius:24px;border-top:8px solid #'+accent+'}h1{font-size:38px}p{white-space:pre-wrap}img{max-width:100%;max-height:450px;object-fit:contain}small{display:block;color:#666}a{overflow-wrap:anywhere}@media(max-width:600px){section{margin:12px;padding:24px}h1{font-size:28px}}@media print{section{break-after:page;margin:0}}</style>'+sections.map(s=>'<section><h1>'+escape(s.title||args.title)+'</h1><p>'+escape(s.text)+'</p>'+(s.picture?'<img alt="'+escape(s.picture.title)+'" src="data:image/jpeg;base64,'+s.picture.data.toString('base64')+'"><small>'+escape(s.picture.author+' · '+s.picture.license)+' <a href="'+escape(s.picture.page)+'">Source</a></small>':'')+'</section>').join('')+'</html>';
  buffer=Buffer.from(html);mime='text/html';
 }
 if(!buffer?.length||buffer.length>2*1024*1024)throw fail('Документ слишком большой для текущего хранилища. Уменьшите число изображений или разделите его.');
 const filename=(args.title.replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,85).trim()||'document')+'.'+args.format;
 return {file:{id:crypto.randomUUID(),name:filename,downloadName:filename,mime,bytes:buffer.length,text:text.slice(0,50000),base64:buffer.toString('base64'),image:false,generated:true,updated_at:Date.now()},warnings,sources:credits.map(({title,page,author,license})=>({title,url:page,author,license})),note:'Real downloadable file created. PPTX/DOCX open in compatible PowerPoint/WPS/Word apps; HTML opens in browser. Not executed or visually checked in those apps.'};
}
export const DOCUMENT_TOOL={type:'function',function:{name:'create_document',description:'Create and attach a real styled presentation (PPTX for PowerPoint/WPS or HTML for browser) or DOCX text document. Use when user asks for a presentation/document, not executable code. Ask preferred format if needed; PPTX is compatible with WPS. Supply complete factual sections, normally 6–10 slides with specific useful content, not three generic sentences for the whole topic. Include a relevant imageQuery on visual slides unless the user explicitly wants text only. The title and query must match the actual subject; preserve abbreviations. Images are searched, not fabricated. imageQuery searches actual attributed Wikimedia photos (up to 6), not AI image generation. Do not claim perfect rendering or fabricated images.',parameters:{type:'object',properties:{format:{type:'string',enum:['pptx','docx','html']},title:{type:'string'},accent:{type:'string'},sections:{type:'array',maxItems:12,items:{type:'object',properties:{title:{type:'string'},text:{type:'string'},imageQuery:{type:'string'}},required:['title','text'],additionalProperties:false}}},required:['format','title','sections'],additionalProperties:false}}};
