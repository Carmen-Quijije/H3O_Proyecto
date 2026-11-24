import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Database} from '../dist/database.js';
import {AppController} from '../dist/controllers.js';
test('panel administrativo permite consultar usuarios solamente con rol admin',async()=>{
  process.env.DB_MEMORY='true';process.env.NODE_ENV='test';
  const db=new Database();await db.onModuleInit();
  try{
    await db.query('INSERT INTO users(email,password,name,role) VALUES($1,$2,$3,$4)',['admin@example.com','hash','Admin','admin']);
    const controller=new AppController(db,{});
    await assert.rejects(()=>controller.admin({user:{role:'user'}}),/administrador/);
    const result=await controller.admin({user:{role:'admin'}});
    assert.equal(result.users.length,1);assert.ok(!('password'in result.users[0]));assert.equal(result.subscriptions,0);assert.equal(result.intakes,0);
  }finally{await db.pool.end();}
});
