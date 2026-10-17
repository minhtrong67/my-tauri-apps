import {parse,evaluate,XErr} from '../src/js/formula.js';
import {key,parseAddr} from '../src/js/refs.js';
// minimal fake workbook: sheets with Map(key->raw|formula string starting '=')
const mk=(name,obj)=>{const cells=new Map();for(const [a,v] of Object.entries(obj)){const p=parseAddr(a);cells.set(key(p.r,p.c),v);}return {name,cells};};
const S1=mk('Sheet1',{A1:1,A2:2,A3:3,A4:'x',B1:10,B2:20,B3:30,C1:'=A1+B1',D1:'apple',D2:'banana',D3:'apple',E1:5,E2:15,E3:25,F1:'k1',F2:'k2',F3:'k3',G1:100,G2:200,G3:300});
const S2=mk('My Sheet',{A1:42});
const sheets=[S1,S2];
const env={
  sheetByName:n=>sheets.find(s=>s.name.toLowerCase()===n.toLowerCase())||null,
  bounds:s=>{let R=-1,C=-1;for(const k of s.cells.keys()){R=Math.max(R,Math.floor(k/16384));C=Math.max(C,k%16384);}return {maxR:R,maxC:C};},
  eachInRange:(s,r1,c1,r2,c2,cb)=>{const b=env.bounds(s);for(let r=r1;r<=Math.min(r2,b.maxR);r++)for(let c=c1;c<=Math.min(c2,b.maxC);c++){const v=env.cellValue(s,r,c);if(v!==null)cb(v,r,c);}},
  cellValue:(s,r,c)=>{const v=s.cells.get(key(r,c));if(v===undefined)return null;if(typeof v==='string'&&v[0]==='=')return evaluate(parse(v.slice(1)),{env,sheet:s,r,c});return v;},
  now:()=>Date.UTC(2023,2,15,12,0,0),
};
let fail=0;
const t=(f,exp,sheet=S1,r=10,c=10)=>{let v=evaluate(parse(f),{env,sheet,r,c});if(v instanceof XErr)v=v.code;const ok=typeof exp==='number'&&typeof v==='number'?Math.abs(v-exp)<1e-9:v===exp;if(!ok){fail++;console.log('FAIL',f,'=>',JSON.stringify(v),'expected',JSON.stringify(exp));}};
const ap=(f,exp,tol=1e-6)=>{let v=evaluate(parse(f),{env,sheet:S1,r:10,c:10});if(v instanceof XErr)v=v.code;if(typeof v!=='number'||Math.abs(v-exp)>tol){fail++;console.log('FAIL',f,'=>',JSON.stringify(v),'expected',exp);}};
// financial (values from Microsoft documentation)
ap('PMT(0.08/12,10,10000)',-1037.032089,1e-5);ap('FV(0.06/12,10,-200,-500,1)',2581.403374,1e-5);ap('PV(0.08/12,240,500,0,0)',-59777.14585,1e-4);
ap('NPER(0.12/12,-100,-1000,10000,1)',59.6738657,1e-5);ap('IPMT(0.1/12,1,36,8000)',-66.6666667,1e-5);ap('PPMT(0.1/12,1,24,2000)',-75.6231860,1e-5);
ap('NPV(0.1,-10000,3000,4200,6800)',1188.443412,1e-5);t('IRR(G1:G3)','#NUM!');ap('RATE(48,-200,8000)',0.007701472,1e-8);ap('SLN(30000,7500,10)',2250);
ap('EFFECT(0.0525,4)',0.053542667,1e-8);ap('NOMINAL(0.053543,4)',0.052500319,1e-8);
// statistics
const S3=mk('Stat',{A1:3,A2:2,A3:4,A4:5,A5:6,B1:9,B2:7,B3:12,B4:15,B5:17,C1:2,C2:3,C3:9,C4:1,C5:8,C6:7,C7:5,D1:6,D2:5,D3:11,D4:7,D5:5,D6:4,D7:4});sheets.push(S3);
ap("CORREL(Stat!A1:A5,Stat!B1:B5)",0.997054486,1e-8);ap("SLOPE(Stat!C1:C7,Stat!D1:D7)",0.305555556,1e-8);ap("RSQ(Stat!C1:C7,Stat!D1:D7)",0.057950192,1e-8);
ap("INTERCEPT(Stat!C1:C5,Stat!D1:D5)",0.0483871,1e-7);ap("FORECAST(2,Stat!C1:C5,Stat!D1:D5)",0.0483871+2*0.6693548,1e-5);
ap('PERCENTILE(E1:E3,0.5)',15);ap('QUARTILE(E1:E3,1)',10);ap('GEOMEAN(A1:A3)',Math.cbrt(6),1e-9);ap('DEVSQ(A1:A3)',2);ap('AVEDEV(A1:A3)',2/3,1e-9);
ap('NORM.S.DIST(1.333333,TRUE)',0.908788726,1e-6);ap('NORM.DIST(42,40,1.5,TRUE)',0.908788780,1e-6);ap('NORM.S.INV(0.908789)',1.3333347,1e-5);ap('NORMSDIST(0)',0.5,1e-12);ap('NORM.S.DIST(0,FALSE)',0.3989422804,1e-9);ap('NORM.S.DIST(4,TRUE)',0.9999683287581669,1e-9);
// dates
t('WEEKNUM(DATE(2012,3,9))',10);t('ISOWEEKNUM(DATE(2012,3,9))',10);t('WEEKNUM(DATE(2023,1,1))',1);t('ISOWEEKNUM(DATE(2023,1,1))',52);t('WEEKNUM(DATE(2023,1,1),2)',1);
t('NETWORKDAYS(DATE(2012,10,1),DATE(2013,3,1))',110);t('NETWORKDAYS(DATE(2012,10,1),DATE(2012,10,7))',5);t('WORKDAY(DATE(2008,10,1),151)',39933);
t('DAYS360(DATE(2011,1,30),DATE(2011,2,1))',1);ap('YEARFRAC(DATE(2012,1,1),DATE(2012,7,30))',0.58055556,1e-8);ap('YEARFRAC(DATE(2012,1,1),DATE(2012,7,30),3)',211/365,1e-9);
// maths
t('GCD(24,36)',12);t('LCM(5,2)',10);t('COMBIN(8,2)',28);t('PERMUT(100,3)',970200);t('MROUND(10,3)',9);t('EVEN(1.5)',2);t('ODD(1.5)',3);t('QUOTIENT(5,2)',2);t('SUBTOTAL(9,A1:A3)',6);t('SUBTOTAL(1,A1:A3)',2);t('SUBTOTAL(103,A1:A4)',4);
// lookup / text
t('OFFSET(A1,1,1)',20);t('SUM(OFFSET(A1,0,0,3,1))',6);t('LOOKUP(2,A1:A3,B1:B3)',20);t('XMATCH(25,E1:E3,-1)',3);t('XMATCH(20,E1:E3,-1)',2);t('XMATCH(20,E1:E3,1)',3);
t('ADDRESS(2,3)','$C$2');t('ADDRESS(2,3,4)','C2');t('ADDRESS(2,3,2)','C$2');t('ADDRESS(2,3,1,FALSE)','R2C3');t('ADDRESS(1,1,1,TRUE,"My Sheet")',"'My Sheet'!$A$1");
t('TEXTBEFORE("Red riding hood","riding")','Red ');t('TEXTAFTER("Red riding hood","riding ")','hood');t('TEXTBEFORE("a-b-c","-",-1)','a-b');t('TEXTAFTER("a-b-c","-",2)','c');t('TEXTBEFORE("abc","x")','#N/A');
t('DEC2BIN(9)','1001');t('DEC2HEX(255)','FF');t('HEX2DEC("FF")',255);t('BIN2DEC("1111111111")',-1);t('DEC2BIN(9,8)','00001001');
t('NUMBERVALUE("2.500,27",",",".")',2500.27);t('DOLLAR(1234.567,2)','$1,234.57');t('FIXED(1234.567,1)','1,234.6');t('TYPE(A1)',1);t('TYPE("a")',2);t('TYPE(A1:A3)',64);t('ISREF(A1)',true);t('T("x")','x');t('T(5)','');t('UNICODE("A")',65);t('UNICHAR(66)','B');
console.log(fail?('FAILURES '+fail):'functions-ext: all passed');
