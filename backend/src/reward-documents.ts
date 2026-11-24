import PDFDocument from 'pdfkit';
export const MOTIVATION="Cuidarte no siempre requiere grandes cambios; a veces empieza con un gesto tan simple como tomar un vaso de agua. Cada sorbo que das hoy es energía, claridad y salud que le regalas a tu cuerpo. Sigue adelante con este hábito, porque mereces sentirte bien todos los días.";
export const PHRASES={space:'Mi compromiso: hacer espacio para cuidarme.',step:'Pequeños pasos, grandes hábitos.',rhythm:'Me cuido a mi ritmo, un día a la vez.'};
export type Design={theme:'navy'|'sky';phrase:keyof typeof PHRASES};
export function cardData(user:any,design:Design){
  return {name:user.name,startedOn:new Intl.DateTimeFormat('es',{timeZone:user.timezone,dateStyle:'long'}).format(new Date(user.created_at)),phrase:PHRASES[design.phrase],motivation:MOTIVATION,theme:design.theme};
}
function drop(doc:PDFKit.PDFDocument,x:number,y:number,size:number,color:string){
  doc.save().translate(x,y).scale(size/20).path('M10 0 C8 5 1 12 1 18 C1 30 19 30 19 18 C19 12 12 5 10 0 Z').fill(color).restore();
}
function medal(doc:PDFKit.PDFDocument){
  doc.path('M400 129 L394 164 L409 157 L419 166 L428 129 Z').fill('#d6a128');
  doc.circle(414,117,24).fill('#e3b33d');doc.circle(414,117,20).fillAndStroke('#ffe18b','#fff0b7');
  const points=Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5;const r=i%2===0?12:5.5;return [414+Math.cos(a)*r,117+Math.sin(a)*r];});
  doc.polygon(...points as [number,number][]).fill('#a97916');
}
function header(doc:PDFKit.PDFDocument,label:string,page:number){
  const width=doc.page.width;
  doc.rect(0,0,width,100).fill('#102e4c');doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(23).text('H³O PLUS SMART',42,25);
  doc.font('Helvetica').fontSize(10).fillColor('#79d9ed').text(label.toUpperCase(),42,65);
  doc.fillColor('#63788b').fontSize(8).text('Tu hábito, gota a gota. | '+page,42,780,{width:width-84,align:'right',lineBreak:false});doc.y=132;
}
function title(doc:PDFKit.PDFDocument,text:string){doc.fillColor('#102e4c').font('Helvetica-Bold').fontSize(22).text(text,42,132,{width:511});doc.moveDown(.7);}
function body(doc:PDFKit.PDFDocument,text:string,y?:number){doc.fillColor('#435d73').font('Helvetica').fontSize(12).text(text,42,y??doc.y,{width:511,lineGap:6});doc.moveDown(.6);}
function section(doc:PDFKit.PDFDocument,text:string,y?:number){doc.fillColor('#1387a9').font('Helvetica-Bold').fontSize(15).text(text,42,y??doc.y,{width:511});doc.moveDown(.5);}
function week(doc:PDFKit.PDFDocument,number:number,name:string,page:number){
  doc.addPage();header(doc,'Mi agenda de bienestar',page);title(doc,`Mi semana ${number}`);
  doc.font('Helvetica').fontSize(12).fillColor('#435d73').text(name,42,175,{width:511,height:45});
  doc.text('Del: ____________________  al: ____________________',42,225);
  doc.roundedRect(42,263,511,43,7).fill('#e9f6fb');doc.fillColor('#102e4c').fontSize(10).font('Helvetica-Bold');
  const x=[50,120,244,325,406];const labels=['Día','Agua registrada','Pausa 1','Pausa 2','Cómo me sentí'];labels.forEach((s,i)=>doc.text(s,x[i],279,{width:i===1?120:80,lineBreak:false}));
  ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].forEach((day,i)=>{
    const y=306+i*48;doc.moveTo(42,y+48).lineTo(553,y+48).strokeColor('#dce8ef').lineWidth(.6).stroke();
    doc.fillColor('#435d73').font('Helvetica').fontSize(10).text(day,50,y+18,{width:65,lineBreak:false});
    doc.text('________ ml',125,y+18,{width:110,lineBreak:false});[270,350].forEach(px=>doc.rect(px,y+16,11,11).stroke('#8eb1c5'));
    doc.text('____________',408,y+18,{width:140,lineBreak:false});
  });
  section(doc,'Esta semana quiero hacer espacio para...',675);body(doc,'___________________________________________________________________',710);
}
const RECIPES=[
  {name:'Avena con banana y canela',time:'10 minutos | 1 porción',ingredients:'1/2 taza de avena, 1 taza de agua, 1 banana pequeña y canela al gusto.',steps:['Calienta el agua y añade la avena. Cocina a fuego suave, removiendo, hasta que esté tierna.','Sirve con la banana en rodajas y una pizca de canela. Ajusta la textura con un poco de agua.'],note:'Revisa el etiquetado de la avena si necesitas evitar gluten o trazas de otros ingredientes.'},
  {name:'Ensalada de garbanzos',time:'10 minutos | 1 porción',ingredients:'3/4 de taza de garbanzos ya cocidos, 1 tomate, 1/2 pepino, limón y 1 cucharadita de aceite de oliva.',steps:['Lava las verduras. Corta el tomate y el pepino en trozos pequeños.','Si usas garbanzos de conserva, escúrrelos y enjuágalos. Mezcla con las verduras, el limón y el aceite.'],note:'Usa garbanzos previamente cocidos. Puedes variar las verduras según disponibilidad.'},
  {name:'Tostada de aguacate y tomate',time:'5 minutos | 1 porción',ingredients:'1 rebanada de pan integral, 1/4 de aguacate, 1/2 tomate y unas gotas de limón.',steps:['Tuesta el pan. Machaca el aguacate con el limón y extiéndelo sobre la tostada.','Lava y corta el tomate; colócalo encima. Prepara justo antes de comer.'],note:'El pan puede contener trigo, gluten y otros alérgenos: revisa su etiqueta.'},
];

// Plantillas reutilizables: no requieren archivos públicos ni almacenamiento de datos personales.
export function createRewardPdf(id:string,user:any,design:Design):Promise<Buffer>{
  return new Promise((resolve,reject)=>{
    const doc=new PDFDocument({size:id==='card'?[480,420]:'A4',margin:42,info:{Title:id==='card'?'Mi tarjeta H3O':id==='kit'?'Mi kit de autocuidado H3O':'Mi agenda de bienestar H3O',Author:'H3O PLUS SMART'}});
    const chunks:Buffer[]=[];doc.on('data',chunk=>chunks.push(Buffer.from(chunk)));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);
    if(id==='card'){
      const data=cardData(user,design);const dark=design.theme==='navy';
      doc.rect(0,0,480,420).fill(dark?'#102e4c':'#e4f7fc');
      doc.roundedRect(16,16,448,388,15).lineWidth(.8).stroke(dark?'#40728c':'#99dce9');
      doc.font('Helvetica-Bold').fontSize(20).fillColor(dark?'#ffffff':'#102e4c').text('H³O PLUS SMART',32,33);
      medal(doc);
      [0,1,2].forEach(i=>drop(doc,362+i*25,34+i*4,12,['#28b8d8','#62d0e8','#96e3ef'][i]));
      doc.font('Helvetica').fontSize(9).fillColor(dark?'#94dbea':'#287991').text('MI TARJETA DE AUTOCUIDADO',32,84);
      doc.font('Helvetica-Bold').fontSize(user.name.length>42?15:25).fillColor(dark?'#ffffff':'#102e4c').text(data.name,32,111,{width:340,height:65});
      doc.font('Helvetica').fontSize(12).fillColor(dark?'#d9f2f7':'#435d73').text(data.phrase,32,188,{width:400,height:40});
      doc.fontSize(11).text(data.motivation,32,226,{width:410,height:112,lineGap:3});
      doc.fontSize(9).text('Mi rutina comenzó el '+data.startedOn,32,364,{width:410,lineBreak:false});
    }else if(id==='kit'){
      header(doc,'Mi kit de autocuidado',1);title(doc,'Pequeños momentos para ti');
      body(doc,'Preparado para '+user.name+'. Tres recetas sencillas, una pausa para moverte y una hoja para organizar tu semana.',190);
      section(doc,'Tu pausa activa de 5 minutos',300);
      body(doc,'2 min de caminata a tu ritmo.\n1 min moviendo suavemente los hombros.\n1 min estirando los brazos sin forzar.\n1 min movilizando manos y tobillos.');
      section(doc,'A tu ritmo',485);body(doc,'Adapta los movimientos a tu comodidad y detente si causan dolor. Las recetas son ideas generales, sin objetivos médicos ni un plan nutricional personalizado. Revisa ingredientes y alérgenos según tus necesidades.');
      body(doc,'Tus recompensas reconocen participación. No necesitas beber más para ganar más puntos.',650);
      RECIPES.forEach((recipe,i)=>{doc.addPage();header(doc,'3 recetas para tu día',i+2);title(doc,recipe.name);body(doc,recipe.time,195);section(doc,'Ingredientes',255);body(doc,recipe.ingredients);section(doc,'Preparación',365);recipe.steps.forEach((step,n)=>body(doc,`${n+1}. ${step}`));section(doc,'Ten en cuenta',600);body(doc,recipe.note);});
      week(doc,1,user.name,5);
    }else{
      header(doc,'Mi agenda de bienestar',1);title(doc,'Me cuido a mi ritmo');
      body(doc,'Una agenda personal para '+user.name+'. Cuatro semanas para observar tus hábitos, reservar pequeños momentos y reconocer tus avances.',190);
      section(doc,'Primera pausa: 5 minutos',300);body(doc,'Camina 2 min, mueve hombros y brazos suavemente 2 min y moviliza tobillos 1 min.');
      section(doc,'Segunda pausa: 5 minutos',425);body(doc,'Camina 2 min, estira los brazos sin forzar 1 min, mueve hombros 1 min y manos 1 min.');
      body(doc,'Elige horarios que encajen contigo. Adapta los movimientos a tu comodidad y detente si causan dolor. Esta agenda acompaña tu rutina y no evalúa tu estado de salud.',575);
      for(let i=1;i<=4;i++)week(doc,i,user.name,i+1);
      doc.addPage();header(doc,'Mis logros personales',6);title(doc,'Todo lo que estoy construyendo');
      ['Un hábito que disfruté','Un momento que reservé para mí','Algo que me ayudó a ser constante','Mi siguiente pequeño paso'].forEach((prompt,i)=>{section(doc,prompt,210+i*130);body(doc,'____________________________________________________________\n____________________________________________________________',244+i*130);});
    }
    doc.end();
  });
}
