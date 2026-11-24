import { Body, Controller, Post, Get, Put, Delete, Param, Req, UseGuards, BadRequestException, ForbiddenException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { hash, compare } from 'bcryptjs';
import { Database } from './database';
import { AuthGuard, token } from './auth';
import { RegisterDto, LoginDto, IntakeDto, SettingsDto, SubscriptionDto, EndpointDto } from './dto';
import { PushService } from './push';
import { localTime } from './rules';
function safe(user: any) { const {password,...rest} = user; return rest; }
@Controller('api')
export class AuthController {
  constructor(private db: Database) {}
  @Get('health') health() { return {status:'ok',storage:process.env.DB_MEMORY==='true'?'temporary':'postgresql'}; }
  @Post('auth/register') async register(@Body() data: RegisterDto) {
    try {
      const user = (await this.db.query('INSERT INTO users(email,password,name) VALUES($1,$2,$3) RETURNING *',[data.email.toLowerCase().trim(),await hash(data.password,12),data.name.trim()])).rows[0];
      return {token:token(user.id),user:safe(user)};
    } catch(e: any) { if(e.code==='23505') throw new ConflictException('Este correo ya está registrado'); throw e; }
  }
  @Post('auth/login') async login(@Body() data: LoginDto) {
    const user = (await this.db.query('SELECT * FROM users WHERE email=$1',[data.email.toLowerCase().trim()])).rows[0];
    if (!user || !await compare(data.password,user.password)) throw new UnauthorizedException('Correo o contraseña incorrectos');
    return {token:token(user.id),user:safe(user)};
  }
}
@Controller('api') @UseGuards(AuthGuard)
export class AppController {
  constructor(private db: Database, private push: PushService) {}
  @Get('me') me(@Req() req: any) { return safe(req.user); }
  @Put('me') async settings(@Req() req: any,@Body() body: SettingsDto) {
    try { new Intl.DateTimeFormat('es',{timeZone:body.timezone}).format(); } catch { throw new BadRequestException('Zona horaria no válida'); }
    if(body.start_min>=body.end_min) throw new BadRequestException('La hora final debe ser posterior a la inicial');
    const first = body.break_first_min ?? req.user.break_first_min;
    const second = body.break_second_min ?? req.user.break_second_min;
    if(first >= second) throw new BadRequestException('Elige dos horas distintas para las pausas, en orden de mañana a tarde');
    return safe((await this.db.query('UPDATE users SET name=$1,goal=$2,timezone=$3,frequency=$4,start_min=$5,end_min=$6,reminders=$7,active_breaks=$8,break_first_min=$9,break_second_min=$10 WHERE id=$11 RETURNING *',[body.name.trim(),body.goal,body.timezone,body.frequency,body.start_min,body.end_min,body.reminders,body.active_breaks ?? req.user.active_breaks,first,second,req.user.id])).rows[0]);
  }
  @Get('intakes') async intakes(@Req() req: any) {
    return (await this.db.query('SELECT id,ml,created_at FROM intakes WHERE user_id=$1 ORDER BY created_at DESC LIMIT 10000',[req.user.id])).rows;
  }
  @Post('intakes') async add(@Req() req: any,@Body() body: IntakeDto) {
    return (await this.db.query('INSERT INTO intakes(user_id,ml) VALUES($1,$2) RETURNING id,ml,created_at',[req.user.id,body.ml])).rows[0];
  }
  @Delete('intakes/:id') async remove(@Req() req: any,@Param('id') id: string) {
    if(!/^\d+$/.test(id)) throw new BadRequestException();
    await this.db.query('DELETE FROM intakes WHERE id=$1 AND user_id=$2',[Number(id),req.user.id]);return {ok:true};
  }
  @Get('rewards') async rewards(@Req() req: any) {
    const rows=(await this.db.query('SELECT ml,created_at FROM intakes WHERE user_id=$1',[req.user.id])).rows;
    const days: Record<string,number>={};
    for(const row of rows) {const d=localTime(new Date(row.created_at),req.user.timezone).day;days[d]=(days[d]||0)+row.ml;}
    const points=Object.values(days).reduce((sum,ml)=>sum+Math.min(100,Math.floor(ml/250)*10),0);
    return {points,demo:true,items:[{name:'Insignia Primeras gotas',cost:10},{name:'10% en tu próxima botella',cost:250},{name:'Botella edición océano',cost:1000}]};
  }
  @Get('push/key') key() { return {publicKey:this.push.configured?process.env.VAPID_PUBLIC_KEY:null}; }
  @Post('push/subscribe') async subscribe(@Req() req:any,@Body() data:SubscriptionDto) {
    if(!this.push.configured) throw new BadRequestException('Configura VAPID');
    await this.push.validateEndpoint(data.endpoint);
    const previous=(await this.db.query('SELECT user_id FROM subscriptions WHERE endpoint=$1',[data.endpoint])).rows[0];
    if(previous && previous.user_id!==req.user.id) throw new ConflictException('Desactiva las notificaciones de la cuenta anterior en este navegador');
    await this.db.query('INSERT INTO subscriptions(user_id,endpoint,p256dh,auth) VALUES($1,$2,$3,$4) ON CONFLICT(endpoint) DO UPDATE SET p256dh=$3,auth=$4',[req.user.id,data.endpoint,data.p256dh,data.auth]);return {ok:true};
  }
  @Post('push/unsubscribe') async unsubscribe(@Req() req:any,@Body() data:EndpointDto) {
    await this.db.query('DELETE FROM subscriptions WHERE endpoint=$1 AND user_id=$2',[data.endpoint,req.user.id]);return {ok:true};
  }
  @Post('push/test') test(@Req() req:any) { return this.push.send(req.user.id,true); }
  @Get('admin') async admin(@Req() req:any) {
    if(req.user.role!=='admin') throw new ForbiddenException('Se requiere rol administrador');
    const users=(await this.db.query('SELECT id,name,email,role,goal,reminders,created_at FROM users ORDER BY id DESC')).rows;
    const intakes=(await this.db.query('SELECT COUNT(*) AS count FROM intakes')).rows[0];
    const subscriptions=(await this.db.query('SELECT COUNT(*) AS count FROM subscriptions')).rows[0];
    const deliveries=(await this.db.query('SELECT status,COUNT(*) AS count FROM deliveries GROUP BY status')).rows;
    return {users,intakes:Number(intakes.count),subscriptions:Number(subscriptions.count),deliveries};
  }
}
