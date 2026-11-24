import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import QRCode from 'qrcode';
import { Api, User, Intake } from './api.service';
import { BottleComponent } from './bottle.component';
import { ChartComponent } from './chart.component';
type View='dashboard'|'history'|'reminders'|'rewards'|'profile'|'admin';
@Component({selector:'app-root',standalone:true,imports:[CommonModule,FormsModule,BottleComponent,ChartComponent],templateUrl:'./app.component.html'})
export class AppComponent implements OnInit{
  user=signal<User|null>(null);entries=signal<Intake[]>([]);view=signal<View>('dashboard');message=signal('');error=signal('');busy=signal(false);loading=signal(true);storage=signal('');
  authOpen=signal(false);register=signal(false);email='';password='';name='';custom=300;period=signal(7);rewards=signal<any>({points:0,items:[]});admin=signal<any>(null);qr=signal('');subscribed=signal(false);
  profile:Partial<User>={};start='08:00';end='20:00';qrUrl=location.origin;readonly Math=Math;
  nav:{key:View;icon:string;label:string}[]=[{key:'dashboard',icon:'◫',label:'Mi día'},{key:'history',icon:'▥',label:'Historial'},{key:'reminders',icon:'♧',label:'Recordatorios'},{key:'rewards',icon:'◇',label:'Recompensas'},{key:'profile',icon:'◎',label:'Mi perfil'}];
  constructor(public api:Api){}
  async ngOnInit(){
    try{const health=await this.api.request('health');this.storage.set(health.storage);if(this.api.token){this.user.set(await this.api.request('me'));await this.load();}await this.makeQr();if('serviceWorker'in navigator&&window.isSecureContext){await navigator.serviceWorker.register('/sw.js');await this.syncPush();}}catch(e){this.showError(e);}finally{this.loading.set(false);}
  }
  showError(e:unknown){this.error.set(e instanceof Error?e.message:String(e));}
  async action(fn:()=>Promise<void>){if(this.busy())return;this.busy.set(true);this.error.set('');this.message.set('');try{await fn();}catch(e){this.showError(e);}finally{this.busy.set(false);}}
  async authenticate(){await this.action(async()=>{const data=await this.api.request('auth/'+(this.register()?'register':'login'),'POST',{email:this.email,password:this.password,...(this.register()?{name:this.name}:{})});this.api.saveToken(data.token);this.user.set(data.user);this.password='';this.authOpen.set(false);await this.load();});}
  async load(){const [entries,rewards]=await Promise.all([this.api.request<Intake[]>('intakes'),this.api.request('rewards')]);this.entries.set(entries);this.rewards.set(rewards);this.copyProfile();}
  copyProfile(){this.profile={...this.user()!};this.start=this.time(this.user()!.start_min);this.end=this.time(this.user()!.end_min);}
  time(n:number){return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
  minutes(t:string){const [h,m]=t.split(':').map(Number);return h*60+m;}
  day(date:string|Date){const parts=new Intl.DateTimeFormat('en-CA',{timeZone:this.user()?.timezone||'America/Guayaquil',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(date));return ['year','month','day'].map(k=>parts.find(x=>x.type===k)!.value).join('-');}
  get today(){return this.entries().filter(x=>this.day(x.created_at)===this.day(new Date()));}
  get total(){return this.today.reduce((n,x)=>n+x.ml,0);}get percent(){return Math.floor(this.total/(this.user()?.goal||2000)*100);}
  get remaining(){return Math.max(0,(this.user()?.goal||2000)-this.total);}
  get dailyText(){return this.percent>=100?'¡Meta alcanzada!':this.percent>=75?'Ya casi llegas':this.percent>=50?'Vas por buen camino':this.percent>=25?'Cada vaso cuenta':'Tu próxima gota cuenta';}
  get dateLabel(){return new Intl.DateTimeFormat('es',{dateStyle:'full',timeZone:this.user()?.timezone||'America/Guayaquil'}).format(new Date());}
  get chartData(){const dates:string[]=[];const now=new Date();const today=this.day(now);const anchor=new Date(today+'T12:00:00Z');for(let i=this.period()-1;i>=0;i--){const d=new Date(anchor);d.setUTCDate(d.getUTCDate()-i);dates.push(d.toISOString().slice(0,10));}return {labels:dates.map(d=>`${d.slice(8)}/${d.slice(5,7)}`),values:dates.map(d=>this.entries().filter(e=>this.day(e.created_at)===d).reduce((n,e)=>n+e.ml,0))};}
  async add(ml:number){await this.action(async()=>{if(!Number.isInteger(ml)||ml<1||ml>5000)throw new Error('Ingresa una cantidad entera entre 1 y 5000 ml');await this.api.request('intakes','POST',{ml});await this.load();this.message.set(`${ml} ml registrados. ¡Un paso más en tu hábito!`);});}
  async remove(id:number){await this.action(async()=>{await this.api.request('intakes/'+id,'DELETE');await this.load();this.message.set('Registro eliminado');});}
  async save(){await this.action(async()=>{const p=this.profile;const payload={name:p.name,goal:Number(p.goal),timezone:p.timezone,frequency:Number(p.frequency),start_min:this.minutes(this.start),end_min:this.minutes(this.end),reminders:p.reminders};this.user.set(await this.api.request('me','PUT',payload));this.copyProfile();this.message.set('Preferencias guardadas');});}
  async navigate(view:View){this.view.set(view);window.scrollTo({top:0,behavior:'auto'});if(view==='dashboard')this.period.set(7);this.error.set('');this.message.set('');if(view==='admin')await this.action(async()=>{this.admin.set(await this.api.request('admin'));});if(view==='reminders')await this.syncPush();}
  async logout(){await this.action(async()=>{if(this.subscribed()){await this.disablePush();}this.api.saveToken('');this.user.set(null);this.entries.set([]);this.view.set('dashboard');});}
  async syncPush(){if(!('serviceWorker'in navigator))return;const reg=await navigator.serviceWorker.getRegistration();this.subscribed.set(!!(await reg?.pushManager?.getSubscription()));}
  async enablePush(){await this.action(async()=>{
    if(!window.isSecureContext)throw new Error('Las notificaciones requieren HTTPS (o localhost en la computadora).');
    if(!('serviceWorker'in navigator)||!('PushManager'in window)||!('Notification'in window))throw new Error('Este navegador no admite Web Push. En iPhone instala la web en la pantalla de inicio y ábrela desde su icono.');
    // Solicitud directamente desde el gesto del usuario para compatibilidad con iOS.
    const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('Permiso no concedido. Revisa los permisos del sitio en el navegador.');
    const key=await this.api.request('push/key');if(!key.publicKey)throw new Error('Faltan las claves VAPID en el servidor. Consulta el README.');
    const reg=await navigator.serviceWorker.ready;const existing=await reg.pushManager.getSubscription();
    const raw=atob(key.publicKey.replace(/-/g,'+').replace(/_/g,'/'));const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));
    const sub=existing||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:bytes});const json=sub.toJSON();
    try{await this.api.request('push/subscribe','POST',{endpoint:sub.endpoint,p256dh:json.keys!['p256dh'],auth:json.keys!['auth']});}catch(e){if(!existing)await sub.unsubscribe();throw e;}
    this.subscribed.set(true);this.message.set('Dispositivo suscrito. Guarda los horarios y usa Probar para verificar la recepción.');
  });}
  async disablePush(){const reg=await navigator.serviceWorker.getRegistration();const sub=await reg?.pushManager.getSubscription();if(sub){await this.api.request('push/unsubscribe','POST',{endpoint:sub.endpoint});await sub.unsubscribe();}this.subscribed.set(false);}
  async disable(){await this.action(async()=>{await this.disablePush();this.message.set('Notificaciones desactivadas en este dispositivo.');});}
  async testPush(){await this.action(async()=>{const r=await this.api.request('push/test','POST',{});this.message.set(`${r.accepted} de ${r.total} envíos aceptados por el proveedor. Comprueba la recepción en tu dispositivo.`);});}
  async makeQr(){try{const url=new URL(this.qrUrl);if(!['http:','https:'].includes(url.protocol))throw new Error('Utiliza una URL HTTP o HTTPS');this.qr.set(await QRCode.toDataURL(url.href,{width:280,margin:2,color:{dark:'#102e4c',light:'#ffffff'}}));}catch(e){this.showError(e);}}
}
