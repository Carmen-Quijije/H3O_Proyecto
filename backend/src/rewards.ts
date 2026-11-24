import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Database } from './database';
import { localTime } from './rules';

export const REWARDS = [
  {id:'card',name:'Tarjeta personalizada H³O',cost:20,days:1,description:'Tu nombre, tu frase y un diseño para guardar. Descárgala en PNG o PDF.'},
  {id:'kit',name:'Mi kit de autocuidado',cost:180,days:9,description:'Un folleto con 3 recetas, una pausa activa de 5 minutos y un organizador semanal.'},
  {id:'agenda',name:'Mi agenda de bienestar H³O',cost:360,days:18,description:'Agenda personalizada con cuatro semanas para tus hábitos, dos rutinas de pausas y tus logros.'},
] as const;
const POINTS:Record<string,number>={water:10,break1:5,break2:5};

@Injectable()
export class RewardsService {
  constructor(private db:Database){}
  async credit(userId:number,day:string,action:string){
    // La clave única limita cada acción a una vez por día, incluso con peticiones simultáneas.
    await this.db.query('INSERT INTO reward_actions(user_id,day,action) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[userId,day,action]);
  }
  async summary(user:any,now=new Date()){
    // Los registros anteriores reciben 10 puntos por día de participación, sin premiar volumen.
    // Se fija su fecha de puntos para que cambiar de zona no recalcule el historial.
    const intakes=(await this.db.query('SELECT id,created_at,reward_day FROM intakes WHERE user_id=$1',[user.id])).rows;
    const waterDays=new Set<string>();
    for(const intake of intakes){
      const day=intake.reward_day||localTime(new Date(intake.created_at),user.timezone).day;
      if(!intake.reward_day)await this.db.query('UPDATE intakes SET reward_day=$1 WHERE id=$2 AND user_id=$3 AND reward_day IS NULL',[day,intake.id,user.id]);
      waterDays.add(day);
    }
    for(const day of waterDays)await this.credit(user.id,day,'water');
    const rows=(await this.db.query('SELECT day,action FROM reward_actions WHERE user_id=$1',[user.id])).rows;
    const points=rows.reduce((sum,row)=>sum+(POINTS[row.action]||0),0);
    const day=localTime(now,user.timezone).day;
    const todayRows=rows.filter(row=>row.day===day);
    const today={day,points:todayRows.reduce((sum,row)=>sum+(POINTS[row.action]||0),0),max:20,water:todayRows.some(x=>x.action==='water'),break1:todayRows.some(x=>x.action==='break1'),break2:todayRows.some(x=>x.action==='break2')};
    for(const item of REWARDS)if(points>=item.cost)await this.db.query('INSERT INTO reward_unlocks(user_id,reward_id) VALUES($1,$2) ON CONFLICT DO NOTHING',[user.id,item.id]);
    const unlocked=(await this.db.query('SELECT reward_id,unlocked_at FROM reward_unlocks WHERE user_id=$1',[user.id])).rows;
    const days=new Set<string>(rows.map(x=>x.day));
    const date=new Date(day+'T12:00:00Z');
    if(!days.has(day))date.setUTCDate(date.getUTCDate()-1);
    let streak=0;
    while(days.has(date.toISOString().slice(0,10))){streak++;date.setUTCDate(date.getUTCDate()-1);}
    const items=REWARDS.map(item=>({...item,unlocked:unlocked.some(x=>x.reward_id===item.id),unlockedAt:unlocked.find(x=>x.reward_id===item.id)?.unlocked_at||null}));
    return {points,today,participationDays:days.size,streak,items,next:items.find(x=>!x.unlocked)||null};
  }
  async confirmBreak(user:any,slot:number,now=new Date()){
    await this.credit(user.id,localTime(now,user.timezone).day,slot===1?'break1':'break2');
    return this.summary(user,now);
  }
  async requireReward(user:any,id:string){
    const summary=await this.summary(user);
    const reward=summary.items.find(item=>item.id===id);
    if(!reward)throw new NotFoundException('Recompensa no encontrada');
    if(!reward.unlocked)throw new ForbiddenException(`Esta recompensa se desbloquea con ${reward.cost} puntos`);
    return reward;
  }
}
