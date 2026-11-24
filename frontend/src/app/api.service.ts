import { Injectable } from '@angular/core';
export interface User {id:number;name:string;email:string;role:string;goal:number;timezone:string;frequency:number;start_min:number;end_min:number;reminders:boolean;}
export interface Intake {id:number;ml:number;created_at:string;}
@Injectable({providedIn:'root'})
export class Api {
  // sessionStorage limita la persistencia del token a esta pestaña; nunca se almacena la contraseña.
  token=sessionStorage.getItem('h3o-token')||'';
  async request<T=any>(path:string,method='GET',body?:unknown):Promise<T>{
    let response:Response;
    try {response=await fetch('/api/'+path,{method,headers:{'Content-Type':'application/json',...(this.token?{Authorization:'Bearer '+this.token}:{})},body:body===undefined?undefined:JSON.stringify(body)});}catch{throw new Error('No se pudo conectar con el servidor. Revisa tu conexión.');}
    const data=await response.json().catch(()=>({message:'Respuesta del servidor no válida'}));
    if(!response.ok)throw new Error(Array.isArray(data.message)?data.message.join(' · '):data.message||'No se pudo completar la operación');return data;
  }
  saveToken(value:string){this.token=value;value?sessionStorage.setItem('h3o-token',value):sessionStorage.removeItem('h3o-token');}
}
