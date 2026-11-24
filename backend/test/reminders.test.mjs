import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Database} from '../dist/database.js';
import {PushService} from '../dist/push.js';
import {AppController} from '../dist/controllers.js';
import {expectedConsumption,waterReminderDue,activeBreakDue,breakSuggestion} from '../dist/rules.js';
const schedule={goal:2000,timezone:'America/Guayaquil',start_min:480,end_min:1200,frequency:60,reminders:true,active_breaks:true,break_first_min:600,break_second_min:960};
const at=hour=>new Date(`2026-11-23T${String(hour+5).padStart(2,'0')}:00:00Z`);
async function setup(){
  process.env.DB_MEMORY='true';process.env.NODE_ENV='test';process.env.VAPID_PUBLIC_KEY='test';process.env.VAPID_PRIVATE_KEY='test';process.env.VAPID_SUBJECT='mailto:test@example.com';
  const db=new Database();await db.onModuleInit();return db;
}
test('meta proporcional: solo avisa por debajo del avance previsto y dentro del horario',()=>{
  assert.equal(expectedConsumption(at(7),schedule),0);assert.equal(expectedConsumption(at(8),schedule),0);
  assert.equal(expectedConsumption(at(14),schedule),1000);
  assert.equal(waterReminderDue(at(14),schedule,999),true);
  assert.equal(waterReminderDue(at(14),schedule,1000),false);
  assert.equal(waterReminderDue(at(14),schedule,1500),false);
  assert.equal(waterReminderDue(at(8),schedule,0),false);
  assert.equal(waterReminderDue(at(7),schedule,0),false);
  const end=new Date('2026-11-24T01:00:00Z');assert.equal(expectedConsumption(end,schedule),2000);
  assert.equal(waterReminderDue(end,schedule,2000),false);
  assert.equal(waterReminderDue(new Date('2026-11-23T19:30:00Z'),schedule,0),false);
});
test('pausas: dos horarios exactos en zona del usuario, con propuesta de 5 minutos',()=>{
  assert.equal(activeBreakDue(at(10),schedule),true);assert.equal(activeBreakDue(at(16),schedule),true);
  assert.equal(activeBreakDue(at(11),schedule),false);
  assert.equal(activeBreakDue(at(10),{...schedule,active_breaks:false}),false);
  assert.match(breakSuggestion(at(10),schedule),/5 min/);
  assert.notEqual(breakSuggestion(at(10),schedule),breakSuggestion(at(16),schedule));
});
test('planificador: no envía agua cuando el usuario ya va al ritmo de su meta',async()=>{
  const db=await setup();try{
    const u=(await db.query('INSERT INTO users(email,password,name,reminders) VALUES($1,$2,$3,$4) RETURNING *',['pace@example.com','hash','Ritmo',true])).rows[0];
    await db.query('INSERT INTO intakes(user_id,ml,created_at) VALUES($1,$2,$3)',[u.id,1000,at(14)]);
    const push=new PushService(db);let sends=0;push.send=async()=>{sends++;return{accepted:1,total:1};};
    await push.tick(at(14));assert.equal(sends,0);assert.equal((await db.query('SELECT * FROM deliveries')).rows.length,0);
  }finally{await db.pool.end();}
});
test('planificador: dos pausas al día aunque la meta ya esté completa, sin duplicados',async()=>{
  const db=await setup();try{
    const u=(await db.query('INSERT INTO users(email,password,name,active_breaks) VALUES($1,$2,$3,$4) RETURNING *',['breaks@example.com','hash','Pausas',true])).rows[0];
    await db.query('INSERT INTO intakes(user_id,ml,created_at) VALUES($1,$2,$3)',[u.id,2000,at(8)]);
    const push=new PushService(db);const messages=[];push.send=async(id,test,message)=>{messages.push(message);return{accepted:1,total:1};};
    for(const hour of [8,10,10,11,14,16,16,17])await push.tick(at(hour));
    assert.equal(messages.length,2);assert.ok(messages.every(m=>m.tag==='h3o-active-break'));assert.notEqual(messages[0].body,messages[1].body);
    await push.tick(new Date('2026-11-24T15:00:00Z'));assert.equal(messages.length,3);
  }finally{await db.pool.end();}
});
test('coincidencia de agua y pausa produce un solo envío combinado',async()=>{
  const db=await setup();try{
    await db.query('INSERT INTO users(email,password,name,reminders,active_breaks) VALUES($1,$2,$3,$4,$5)',['combined@example.com','hash','Ambos',true,true]);
    const push=new PushService(db);const messages=[];push.send=async(id,test,message)=>{messages.push(message);return{accepted:1,total:1};};
    await push.tick(at(10));await push.tick(at(10));assert.equal(messages.length,1);assert.equal(messages[0].tag,'h3o-combined');
    assert.match(messages[0].body,/333 ml/);assert.match(messages[0].body,/5 min/);
  }finally{await db.pool.end();}
});
test('preferencias: conserva horarios para clientes antiguos y valida orden de las dos pausas',async()=>{
  const db=await setup();try{
    const u=(await db.query('INSERT INTO users(email,password,name,active_breaks) VALUES($1,$2,$3,$4) RETURNING *',['settings@example.com','hash','Perfil',true])).rows[0];
    const controller=new AppController(db,{});
    const body={name:'Perfil',goal:1800,timezone:'America/Guayaquil',start_min:480,end_min:1200,frequency:60,reminders:true};
    const legacy=await controller.settings({user:u},body);assert.equal(legacy.active_breaks,true);assert.equal(legacy.break_first_min,600);assert.equal(legacy.break_second_min,960);
    const saved=await controller.settings({user:legacy},{...body,active_breaks:true,break_first_min:660,break_second_min:1020});
    assert.equal(saved.break_first_min,660);assert.equal(saved.break_second_min,1020);
    for(const second of [660,600])await assert.rejects(()=>controller.settings({user:saved},{...body,break_first_min:660,break_second_min:second}),/dos horas distintas/);
  }finally{await db.pool.end();}
});
