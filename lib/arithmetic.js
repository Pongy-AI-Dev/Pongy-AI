// A deliberately small exact arithmetic calculator. Never evaluates JavaScript or code.
function gcd(a,b){a=a<0n?-a:a;while(b){const t=a%b;a=b;b=t<0n?-t:t}return a||1n}
function rational(n,d=1n){if(d===0n)throw Error('Division by zero');if(n.toString(2).length>1024||d.toString(2).length>1024)throw Error('Result too large');if(d<0n){n=-n;d=-d}const g=gcd(n,d);return {n:n/g,d:d/g}}
export function calculateArithmetic(input){
 if(typeof input!=='string'||input.length>256)return null;
 const text=input.replace(/−/g,'-').replace(/[×·]/g,'*').replace(/÷/g,'/').replace(/,/g,'.').replace(/\s/g,'');
 if(!/^[\d.+*/^()-]+$/.test(text)||!/[+*/^()-]/.test(text))return null;
 const tokens=text.match(/\d+(?:\.\d+)?|[()+*/^.-]/g);if(!tokens||tokens.join('')!==text||tokens.length>100)return null;
 let index=0;
 const add=(a,b,sign)=>rational(a.n*b.d+sign*b.n*a.d,a.d*b.d);
 function atom(){const t=tokens[index++];if(t==='('){const a=sum();if(tokens[index++]!==')')throw Error('Missing parenthesis');return a}if(!/^\d+(?:\.\d+)?$/.test(t||'')||t.replace('.','').length>16)throw Error('Invalid number');const [whole,fraction='']=t.split('.');return rational(BigInt(whole+fraction),10n**BigInt(fraction.length))}
 function power(){let a=atom();if(tokens[index]==='^'){index++;const b=unary();if(b.d!==1n||b.n>12n||b.n< -12n||a.n===0n&&b.n<=0n)throw Error('Unsupported power');a=b.n<0n?rational(a.d**(-b.n),a.n**(-b.n)):rational(a.n**b.n,a.d**b.n)}return a}
 function unary(){if(tokens[index]==='+'){index++;return unary()}if(tokens[index]==='-'){index++;const a=unary();return rational(-a.n,a.d)}return power()}
 function product(){let a=unary();while(['*','/'].includes(tokens[index])){const op=tokens[index++],b=unary();a=op==='*'?rational(a.n*b.n,a.d*b.d):rational(a.n*b.d,a.d*b.n)}return a}
 function sum(){let a=product();while(['+','-'].includes(tokens[index])){const op=tokens[index++];a=add(a,product(),op==='+'?1n:-1n)}return a}
 try{const result=sum();if(index!==tokens.length)return null;return {...result,expression:text}}catch{return null}
}
export function arithmeticAnswer(prompt,locale='en'){
 if(typeof prompt!=='string'||prompt.length>300)return null;
 const expression=prompt.trim().replace(/^(?:сколько(?: будет)?|посчитай(?: пожалуйста)?|вычисли|реши(?: пример)?|what is|calculate|compute)\s*[:—]?\s*/i,'').replace(/[?=!.]+\s*$/,'').trim();
 if(/^\d{4}-\d{2}-\d{2}$/.test(expression))return null;
 const result=calculateArithmetic(expression);if(!result)return null;
 const ru=/[а-яё]/i.test(prompt)||(!/[a-z]/i.test(prompt)&&locale==='ru');
 const exact=result.d===1n?String(result.n):'\\frac{'+result.n+'}{'+result.d+'}';
 const number=Number(result.n)/Number(result.d),approx=Number.isFinite(number)&&result.d!==1n?' \\approx '+Number(number.toPrecision(12)).toString().replace('.',ru?',':'.'):'';
 const shown=result.expression.replace(/\*/g,' \\times ').replace(/\//g,' \\div ');
 return (ru?'Ответ: ':'Answer: ')+'\\('+shown+' = '+exact+approx+'\\).';
}
