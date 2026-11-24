import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import webpush from 'web-push';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { Database } from './database';
import { localTime, expectedConsumption, waterReminderDue, activeBreakDue, breakSuggestion } from './rules';
export interface PushMessage {title: string; body: string; tag: string;}
@Injectable()
export class PushService {
  private logger = new Logger('WebPush');
  constructor(private db: Database) {}
  get configured() { return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT); }
  async validateEndpoint(endpoint: string) {
    const url = new URL(endpoint);
    // Evitar que una suscripción manipulada convierta el servidor en un proxy SSRF.
    const allowed = ['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com','notify.windows.com'];
    if (url.protocol !== 'https:' || url.port || url.username || url.password || isIP(url.hostname) || !allowed.some(h => url.hostname === h || url.hostname.endsWith('.'+h))) throw new BadRequestException('Proveedor push no admitido');
    const ips = await lookup(url.hostname,{all:true});
    if (!ips.length || ips.some(i=> /^(127\.|10\.|192\.168\.|169\.254\.|0\.|::|fc|fd|fe80)/i.test(i.address) || /^172\.(1[6-9]|2\d|3[01])\./.test(i.address))) throw new BadRequestException('Dirección push no permitida');
  }
  async send(userId: number, test = false, message?: PushMessage) {
    if (!this.configured) throw new BadRequestException('Configura las claves VAPID en el servidor');
    webpush.setVapidDetails(process.env.VAPID_SUBJECT!,process.env.VAPID_PUBLIC_KEY!,process.env.VAPID_PRIVATE_KEY!);
    const subs = (await this.db.query('SELECT * FROM subscriptions WHERE user_id=$1',[userId])).rows;
    if (test && !subs.length) throw new BadRequestException('Activa las notificaciones en este dispositivo primero');
    let accepted = 0;
    for (const sub of subs) {
      try {
        await this.validateEndpoint(sub.endpoint);
        await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({title:'H³O PLUS SMART',body:test?'Prueba de notificación recibida.':'Un pequeño momento para tu próximo vaso de agua.',tag:test?'h3o-test':'h3o-reminder',...message,url:'/'}),{TTL:300,timeout:10000}); accepted++;
      } catch (e: any) {
        if ([404,410].includes(e.statusCode)) await this.db.query('DELETE FROM subscriptions WHERE id=$1',[sub.id]);
        else this.logger.warn(`No se envió push a suscripción ${sub.id}; código ${e.statusCode || 'red/validación'}`);
      }
    }
    return {accepted,total:subs.length, message:'Aceptación por el proveedor no confirma recepción en el dispositivo'};
  }
  @Cron('0 * * * * *', {waitForCompletion:true})
  async tick(now = new Date()) {
    if (!this.configured) return;
    const users = (await this.db.query('SELECT * FROM users WHERE reminders=true OR active_breaks=true')).rows;
    for (const user of users) {
      try {
        const time = localTime(now,user.timezone);
        const pause = activeBreakDue(now,user);
        // Las pausas tienen sus propias dos horas, aunque la meta de agua ya esté completa.
        const possibleWater = user.reminders && time.minute >= user.start_min && time.minute <= user.end_min && (time.minute-user.start_min)%user.frequency===0;
        if (!possibleWater && !pause) continue;
        const rows = (await this.db.query('SELECT ml,created_at FROM intakes WHERE user_id=$1',[user.id])).rows;
        const day = time.day;
        const total = rows.filter(x=>localTime(new Date(x.created_at),user.timezone).day===day).reduce((n,x)=>n+x.ml,0);
        const water = waterReminderDue(now,user,total);
        if (!water && !pause) continue;
        const slot = `${day}:${time.minute}`;
        const waterBody = `Llevas ${total} ml de tu meta de ${user.goal} ml; tu avance previsto a esta hora es ${expectedConsumption(now,user)} ml. Si bebiste agua, regístrala; si no, haz espacio para tu próximo vaso.`;
        const pauseBody = breakSuggestion(now,user);
        const message = {
          title: water && pause ? 'H³O · Agua y pausa activa' : pause ? 'H³O · Tu pausa activa de 5 min' : 'H³O · Tu meta de agua',
          body: [water ? waterBody : '', pause ? pauseBody : ''].filter(Boolean).join(' '),
          tag: water && pause ? 'h3o-combined' : pause ? 'h3o-active-break' : 'h3o-water',
        };
        // Clave única: una sola ejecución por usuario/intervalo aun con varias instancias.
        const claim = await this.db.query('INSERT INTO deliveries(user_id,slot) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING slot',[user.id,slot]);
        if (!claim.rows.length) continue;
        const result = await this.send(user.id,false,message);
        await this.db.query('UPDATE deliveries SET status=$1 WHERE user_id=$2 AND slot=$3',[result.accepted?'accepted':'failed',user.id,slot]);
      } catch { this.logger.error(`Recordatorio no completado para usuario ${user.id}`); }
    }
  }
}
