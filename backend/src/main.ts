import 'reflect-metadata';
import { config } from 'dotenv';
import path from 'node:path';
config({path:path.resolve(__dirname,'../../.env')});
import { Module, ValidationPipe } from '@nestjs/common';
import { NestFactory, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import helmet from 'helmet';
import express from 'express';
import { AuthModule, HabitsModule } from './modules';
@Module({imports:[ScheduleModule.forRoot(),ThrottlerModule.forRoot([{ttl:60000,limit:90}]),AuthModule,HabitsModule],providers:[{provide:APP_GUARD,useClass:ThrottlerGuard}]})
class AppModule {}
async function bootstrap() {
  if(!process.env.JWT_SECRET || process.env.JWT_SECRET.length<32 || process.env.JWT_SECRET.startsWith('REPLACE')) throw new Error('Configura un JWT_SECRET aleatorio de al menos 32 caracteres');
  const app=await NestFactory.create(AppModule,{bodyParser:false});
  app.use(express.json({limit:'16kb'}));
  app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'"],styleSrc:["'self'","'unsafe-inline'"],imgSrc:["'self'",'data:'],connectSrc:["'self'"],workerSrc:["'self'"],objectSrc:["'none'"],frameAncestors:["'none'"]}}}));
  app.useGlobalPipes(new ValidationPipe({whitelist:true,forbidNonWhitelisted:true,transform:true}));
  const server=app.getHttpAdapter().getInstance();
  const frontend=path.resolve(__dirname,'../../frontend/dist/browser');
  server.use(express.static(frontend,{setHeaders:(res:any,file:string)=>{if(file.endsWith('sw.js'))res.setHeader('Cache-Control','no-cache');}}));
  // Inicializar las rutas Nest antes de la ruta comodín de la SPA.
  // El fallback se limita a las rutas públicas del frontend y nunca intercepta /api.
  server.get(['/', '/dashboard', '/history', '/profile', '/reminders'],(req:any,res:any)=>res.sendFile(path.join(frontend,'index.html')));
  await app.listen(Number(process.env.PORT||3000),'0.0.0.0');
  console.log(`H³O PLUS SMART: http://localhost:${process.env.PORT||3000}`);
}
bootstrap().catch(e=>{console.error(e.message);process.exitCode=1;});
