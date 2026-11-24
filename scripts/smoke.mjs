// Prueba de integración contra una instancia local de prueba, nunca contra producción.
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://localhost:4317';
if(!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(base))throw Error('Solo se permiten pruebas locales');
const suffix=Date.now();let checks=0;
async function request(path,method='GET',body,token,status=200){const r=await fetch(base+'/api/'+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body)});const data=await r.json();assert.equal(r.status,status,`${method} ${path}: ${JSON.stringify(data)}`);checks++;return data;}
const health=await request('health');assert.equal(health.storage,'temporary','Ejecuta contra DB_MEMORY=true');
await request('me','GET',undefined,undefined,401);
const credentials={name:'Prueba automatizada',email:`test-${suffix}@example.com`,password:'PruebaTemporal2026!'};
const a=await request('auth/register','POST',credentials,undefined,201);assert.ok(a.token);assert.ok(!('password'in a.user));
await request('auth/register','POST',credentials,undefined,409);
await request('auth/login','POST',{email:credentials.email,password:'incorrecta'},undefined,401);
const login=await request('auth/login','POST',{email:credentials.email,password:credentials.password},undefined,201);assert.ok(login.token);
const b=await request('auth/register','POST',{...credentials,email:`other-${suffix}@example.com`},undefined,201);
await request('intakes','POST',{ml:0},a.token,400);
await request('intakes','POST',{ml:250,role:'admin'},a.token,400);
const item=await request('intakes','POST',{ml:250},a.token,201);
for(const ml of [500,600,375])await request('intakes','POST',{ml},a.token,201);
assert.equal((await request('intakes','GET',undefined,a.token)).length,4);
assert.equal((await request('intakes','GET',undefined,b.token)).length,0);
await request('intakes/'+item.id,'DELETE',undefined,b.token);
assert.equal((await request('intakes','GET',undefined,a.token)).length,4);
const settings={name:'Nombre actualizado',goal:1800,timezone:'America/Guayaquil',frequency:30,start_min:480,end_min:1200,reminders:true};
const saved=await request('me','PUT',settings,a.token);assert.equal(saved.goal,1800);assert.equal(saved.reminders,true);
await request('me','PUT',{...settings,timezone:'INVALID'},a.token,400);
await request('me','PUT',{...settings,end_min:400},a.token,400);
await request('me','PUT',{...settings,role:'admin'},a.token,400);
await request('admin','GET',undefined,a.token,403);
assert.equal((await request('rewards','GET',undefined,a.token)).points,60);
await request('push/test','POST',{},a.token,400);
await request('intakes/'+item.id,'DELETE',undefined,a.token);
assert.equal((await request('intakes','GET',undefined,a.token)).length,3);
for(const path of ['/','/manifest.webmanifest','/sw.js','/icon-192.png','/icon-512.png']){const r=await fetch(base+path);assert.equal(r.status,200,path);checks++;}
console.log(`OK: ${checks} comprobaciones HTTP; autenticación, validación, aislamiento, metas, permisos y archivos PWA.`);
