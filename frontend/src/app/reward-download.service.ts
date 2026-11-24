import { Injectable } from '@angular/core';
import { Api } from './api.service';
@Injectable({providedIn:'root'})
export class RewardDownloadService {
  constructor(private api:Api){}
  async download(id:string,format:'pdf'|'png',theme:string,phrase:string){
    const query=new URLSearchParams({theme,phrase}).toString();
    let blob:Blob;
    if(format==='png'){
      const data=await this.api.request('rewards/card?'+query);
      const canvas=document.createElement('canvas');canvas.width=960;canvas.height=840;
      const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Este navegador no permite generar la tarjeta PNG');
      const dark=data.theme==='navy';ctx.fillStyle=dark?'#102e4c':'#e4f7fc';ctx.fillRect(0,0,960,840);
      ctx.strokeStyle=dark?'#40728c':'#99dce9';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(32,32,896,776,30);ctx.stroke();
      ctx.fillStyle=dark?'#ffffff':'#102e4c';ctx.font='bold 40px Segoe UI, sans-serif';ctx.fillText('H³O PLUS SMART',64,105);
      ['#28b8d8','#62d0e8','#96e3ef'].forEach((color,i)=>{ctx.save();ctx.translate(735+i*48,63+i*7);ctx.scale(1.1,1.1);ctx.fillStyle=color;ctx.fill(new Path2D('M10 0 C8 5 1 12 1 18 C1 30 19 30 19 18 C19 12 12 5 10 0 Z'));ctx.restore();});
      ctx.save();ctx.translate(0,0);ctx.fillStyle='#d6a128';ctx.fill(new Path2D('M800 258 L788 328 L818 314 L838 332 L856 258 Z'));ctx.beginPath();ctx.arc(828,234,48,0,Math.PI*2);ctx.fillStyle='#e3b33d';ctx.fill();ctx.beginPath();ctx.arc(828,234,40,0,Math.PI*2);ctx.fillStyle='#ffe18b';ctx.fill();ctx.fillStyle='#a97916';ctx.beginPath();for(let i=0;i<10;i++){const a=-Math.PI/2+i*Math.PI/5,r=i%2===0?24:11;const x=828+Math.cos(a)*r,y=234+Math.sin(a)*r;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.closePath();ctx.fill();ctx.restore();
      ctx.fillStyle=dark?'#94dbea':'#287991';ctx.font='18px Segoe UI, sans-serif';ctx.fillText('MI TARJETA DE AUTOCUIDADO',64,187);
      ctx.fillStyle=dark?'#ffffff':'#102e4c';ctx.font=`bold ${data.name.length>42?30:50}px Segoe UI, sans-serif`;
      this.text(ctx,data.name,64,258,660,44);
      ctx.fillStyle=dark?'#d9f2f7':'#435d73';ctx.font='24px Segoe UI, sans-serif';this.text(ctx,data.phrase,64,398,800,34);
      ctx.font='22px Segoe UI, sans-serif';this.text(ctx,data.motivation,64,466,810,32);
      ctx.font='18px Segoe UI, sans-serif';ctx.fillText('Mi rutina comenzó el '+data.startedOn,64,752);
      blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('No se pudo crear la imagen')),'image/png'));
    }else{
      let response:Response;
      try{response=await fetch(`/api/rewards/${encodeURIComponent(id)}/pdf?${query}`,{headers:{Authorization:'Bearer '+this.api.token}});}catch{throw new Error('No se pudo conectar para descargar la recompensa');}
      if(!response.ok){const data=await response.json().catch(()=>({message:'No se pudo descargar la recompensa'}));throw new Error(Array.isArray(data.message)?data.message.join(' · '):data.message);}
      blob=await response.blob();
    }
    const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download=`H3O-${id}.${format}`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  private text(ctx:CanvasRenderingContext2D,value:string,x:number,y:number,width:number,lineHeight:number){
    let line='';
    for(const word of value.split(/\s+/)){const trial=line?line+' '+word:word;if(ctx.measureText(trial).width>width&&line){ctx.fillText(line,x,y,width);y+=lineHeight;line=word;}else line=trial;}
    ctx.fillText(line,x,y,width);
  }
}
