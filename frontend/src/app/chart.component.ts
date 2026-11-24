import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);
@Component({selector:'h3o-chart',standalone:true,template:`<div class="chart-wrap"><canvas #canvas role="img" aria-label="Gráfico de consumo diario en mililitros"></canvas></div><p class="small text-secondary mt-2">Total del período: {{total.toLocaleString('es')}} ml · Meta actual: {{goal}} ml/día</p>`})
export class ChartComponent implements AfterViewInit,OnChanges,OnDestroy{
  @ViewChild('canvas') canvas!:ElementRef<HTMLCanvasElement>;
  @Input() labels:string[]=[];@Input() values:number[]=[];@Input() goal=2000;chart?:Chart;
  get total(){return this.values.reduce((a,b)=>a+b,0);}
  ngAfterViewInit(){this.draw();}ngOnChanges(){if(this.canvas)this.draw();}ngOnDestroy(){this.chart?.destroy();}
  draw(){this.chart?.destroy();this.chart=new Chart(this.canvas.nativeElement,{type:'bar',data:{labels:this.labels,datasets:[{label:'Consumo (ml)',data:this.values,backgroundColor:'#38bce0',borderRadius:7},{type:'line',label:'Meta actual (ml)',data:this.labels.map(()=>this.goal),borderColor:'#153c5b',borderDash:[5,5],pointRadius:0,borderWidth:1.5}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,title:{display:true,text:'Mililitros'},grid:{color:'#edf2f6'}},x:{grid:{display:false},ticks:{maxTicksLimit:10}}}}});}
}
