import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Database} from '../dist/database.js';
import {RewardsService} from '../dist/rewards.js';
import {createRewardPdf,cardData} from '../dist/reward-documents.js';
async function setup(){process.env.DB_MEMORY='true';process.env.NODE_ENV='test';const db=new Database();await db.onModuleInit();const user=(await db.query('INSERT INTO users(email,password,name) VALUES($1,$2,$3) RETURNING *',['reward@example.com','hash','María de los Ángeles Quijije'])).rows[0];return{db,user,rewards:new RewardsService(db)};}
test('puntos: cada día suma como máximo 10 por agua y 5 por cada pausa',async()=>{
  const {db,user,rewards}=await setup();try{
    const date=new Date('2026-11-24T17:00:00Z');
    await db.query('INSERT INTO intakes(user_id,ml,created_at) VALUES($1,$2,$3)',[user.id,250,date]);
    await db.query('INSERT INTO intakes(user_id,ml,created_at) VALUES($1,$2,$3)',[user.id,5000,date]);
    await rewards.summary(user,date);
    await Promise.all(Array.from({length:8},()=>rewards.confirmBreak(user,1,date)));
    await rewards.confirmBreak(user,2,date);await rewards.confirmBreak(user,2,date);
    const summary=await rewards.summary(user,date);assert.equal(summary.points,20);assert.equal(summary.today.points,20);assert.equal(summary.participationDays,1);
    await db.query('DELETE FROM intakes WHERE user_id=$1',[user.id]);assert.equal((await rewards.summary(user,date)).points,20);
  }finally{await db.pool.end();}
});
test('desbloqueos: 20/180/360, sin descuentos y con descargas protegidas',async()=>{
  const {db,user,rewards}=await setup();try{
    await assert.rejects(()=>rewards.requireReward(user,'card'),/20 puntos/);
    for(let day=1;day<=18;day++){
      const d=`2026-10-${String(day).padStart(2,'0')}`;
      for(const action of ['water','break1','break2'])await rewards.credit(user.id,d,action);
      if([1,9,18].includes(day)){
        const s=await rewards.summary(user);assert.equal(s.points,day*20);assert.equal(s.items.filter(x=>x.unlocked).length,day===1?1:day===9?2:3);
      }
    }
    await rewards.requireReward(user,'card');await rewards.requireReward(user,'kit');await rewards.requireReward(user,'agenda');
    assert.equal((await rewards.summary(user)).points,360);assert.equal((await db.query('SELECT * FROM reward_unlocks')).rows.length,3);
    const other={...user,id:999};await assert.rejects(()=>rewards.requireReward(other,'card'),/20 puntos/);
    await assert.rejects(()=>rewards.requireReward(user,'invalid'),/no encontrada/);
  }finally{await db.pool.end();}
});
test('historial: se migra por día y cambiar de zona no duplica puntos antiguos',async()=>{
  const {db,user,rewards}=await setup();try{
    await db.query('INSERT INTO intakes(user_id,ml,created_at) VALUES($1,$2,$3)',[user.id,600,new Date('2026-11-23T23:00:00Z')]);
    assert.equal((await rewards.summary(user)).points,10);
    assert.equal((await rewards.summary({...user,timezone:'Asia/Tokyo'})).points,10);
    assert.equal((await db.query('SELECT reward_day FROM intakes')).rows[0].reward_day,'2026-11-23');
  }finally{await db.pool.end();}
});
test('racha: interrumpirla conserva los puntos, sin exigir días consecutivos para premios',async()=>{
  const {db,user,rewards}=await setup();try{
    for(const day of ['2026-11-20','2026-11-21'])await rewards.credit(user.id,day,'water');
    assert.equal((await rewards.summary(user,new Date('2026-11-22T17:00:00Z'))).streak,2);
    const gap=await rewards.summary(user,new Date('2026-11-24T17:00:00Z'));assert.equal(gap.streak,0);assert.equal(gap.points,20);
    await rewards.credit(user.id,'2026-11-24','water');assert.equal((await rewards.summary(user,new Date('2026-11-24T17:00:00Z'))).streak,1);
  }finally{await db.pool.end();}
});
test('PDFs: tarjeta de una página, kit con 3 recetas y agenda de cuatro semanas',async()=>{
  const user={name:'María de los Ángeles Quijije',created_at:'2026-11-01T17:00:00Z',timezone:'America/Guayaquil'};
  for(const [id,pages] of [['card',1],['kit',5],['agenda',6]]){
    const buffer=await createRewardPdf(id,user,{theme:'navy',phrase:'space'});
    assert.equal(buffer.subarray(0,5).toString(),'%PDF-');assert.equal((buffer.toString('latin1').match(/\/Type \/Page\b/g)||[]).length,pages);
  }
  assert.equal(cardData(user,{theme:'sky',phrase:'step'}).name,user.name);
});
