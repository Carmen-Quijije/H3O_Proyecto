import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Database} from '../dist/database.js';
import {PushService} from '../dist/push.js';
import {localTime} from '../dist/rules.js';
import webpush from 'web-push';
test('planificador: guarda un envío único y omite usuarios con meta completada',async()=>{
  process.env.DB_MEMORY='true';process.env.NODE_ENV='test';
  process.env.VAPID_PUBLIC_KEY='public-test';process.env.VAPID_PRIVATE_KEY='private-test';process.env.VAPID_SUBJECT='mailto:test@example.com';
  const db=new Database();await db.onModuleInit();const now=new Date();const local=localTime(now,'America/Guayaquil');
  try{
    const user=(await db.query('INSERT INTO users(email,password,name,start_min,end_min,frequency,reminders) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',['schedule@example.com','hash','Prueba',local.minute,1439,15,true])).rows[0];
    const push=new PushService(db);let sends=0;push.send=async()=>{sends++;return {accepted:1,total:1};};
    await push.tick();await push.tick();assert.equal(sends,1);
    assert.equal((await db.query('SELECT status FROM deliveries')).rows[0].status,'accepted');
    await db.query('DELETE FROM deliveries');
    await db.query('INSERT INTO intakes(user_id,ml) VALUES($1,$2)',[user.id,2000]);
    await push.tick();assert.equal(sends,1);
  }finally{await db.pool.end();}
});
test('push: limpia suscripciones caducadas y distingue aceptación de recepción',async()=>{
  process.env.DB_MEMORY='true';process.env.NODE_ENV='test';
  const db=new Database();await db.onModuleInit();
  const originalSet=webpush.setVapidDetails;const originalSend=webpush.sendNotification;
  try{
    const user=(await db.query('INSERT INTO users(email,password,name) VALUES($1,$2,$3) RETURNING *',['push@example.com','hash','Prueba'])).rows[0];
    await db.query('INSERT INTO subscriptions(user_id,endpoint,p256dh,auth) VALUES($1,$2,$3,$4)',[user.id,'https://fcm.googleapis.com/expired','key','auth']);
    const push=new PushService(db);push.validateEndpoint=async()=>{};webpush.setVapidDetails=()=>{};
    webpush.sendNotification=async()=>{throw {statusCode:410};};
    assert.equal((await push.send(user.id)).accepted,0);assert.equal((await db.query('SELECT * FROM subscriptions')).rows.length,0);
    await assert.rejects(()=>push.send(user.id,true),/Activa/);
    await db.query('INSERT INTO subscriptions(user_id,endpoint,p256dh,auth) VALUES($1,$2,$3,$4)',[user.id,'https://fcm.googleapis.com/current','key','auth']);
    webpush.sendNotification=async()=>({statusCode:201});
    const result=await push.send(user.id,true);assert.equal(result.accepted,1);assert.match(result.message,/no confirma/);
  }finally{webpush.setVapidDetails=originalSet;webpush.sendNotification=originalSend;await db.pool.end();}
});
test('rechaza destinos push locales o ajenos a proveedores permitidos',async()=>{
  const push=new PushService({});
  for(const endpoint of ['https://localhost/test','https://127.0.0.1/test','https://example.com/test','https://fcm.googleapis.com.evil.test/a'])await assert.rejects(()=>push.validateEndpoint(endpoint),/no admitido/);
});
