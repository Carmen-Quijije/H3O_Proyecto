import { test } from 'node:test';
import assert from 'node:assert/strict';
import { localTime, reminderSlot, progressColor } from '../dist/rules.js';
test('los umbrales representan el progreso de consumo exacto',()=>{
  assert.deepEqual([0,24,25,49,50,74,75,99,100,140].map(progressColor),['#ef5350','#ef5350','#f39b38','#f39b38','#e2be28','#e2be28','#29ad82','#29ad82','#239de5','#239de5']);
});
test('horarios y frecuencia usan la zona del usuario, sin avisos fuera de ventana',()=>{
  const u={timezone:'America/Guayaquil',start_min:480,end_min:1200,frequency:60};
  assert.equal(reminderSlot(new Date('2026-11-23T13:00:00Z'),u),'2026-11-23:480');
  assert.equal(reminderSlot(new Date('2026-11-23T13:30:00Z'),u),null);
  assert.equal(reminderSlot(new Date('2026-11-23T12:00:00Z'),u),null);
  assert.equal(reminderSlot(new Date('2026-11-24T01:00:00Z'),u),'2026-11-23:1200');
  assert.equal(reminderSlot(new Date('2026-11-24T02:00:00Z'),u),null);
});
test('fecha local cambia correctamente respecto a UTC',()=>{
  assert.equal(localTime(new Date('2026-11-24T03:30:00Z'),'America/Guayaquil').day,'2026-11-23');
});

