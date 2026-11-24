import { Component, Input } from '@angular/core';
@Component({selector:'h3o-bottle',standalone:true,template:`<div class="bottle-scene" role="img" [attr.aria-label]="'Progreso de consumo: '+percent+' por ciento de tu meta'"><div class="bottle-cap"></div><div class="bottle-neck"></div><div class="bottle"><div class="water" [style.height.%]="Math.min(100,percent)" [style.background]="color"><div class="wave"></div></div><div class="bottle-shine"></div><div class="bottle-brand">H³O<span>PLUS</span></div><div class="bottle-lines">—<br>—<br>—<br>—</div></div><div class="bottle-shadow"></div></div>`})
export class BottleComponent{
  @Input() percent=0;Math=Math;
  get color(){return this.percent<25?'#ef5350':this.percent<50?'#f39b38':this.percent<75?'#e2be28':this.percent<100?'#29ad82':'#239de5';}
}
