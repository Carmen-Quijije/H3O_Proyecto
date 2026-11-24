import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool } from 'pg';
import { newDb } from 'pg-mem';

@Injectable()
export class Database implements OnModuleInit {
  pool!: Pool;
  async onModuleInit() {
    // El adaptador en memoria permite verificar la API sin un servidor PostgreSQL local.
    if (process.env.DB_MEMORY === 'true') {
      if (process.env.NODE_ENV === 'production') throw new Error('DB_MEMORY prohibido en producción');
      const adapter = newDb().adapters.createPg(); this.pool = new adapter.Pool();
      console.warn('PRUEBA LOCAL: base de datos temporal, se pierde al reiniciar.');
    } else {
      // La conexión persistente debe ser explícita para no usar una base local por accidente.
      if (!process.env.DATABASE_URL?.trim()) throw new Error('Falta DATABASE_URL en .env. Configura la URL de PostgreSQL de Render.');
      this.pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, idleTimeoutMillis: 30000 });
    }
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL,
        name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', goal INTEGER NOT NULL DEFAULT 2000,
        timezone TEXT NOT NULL DEFAULT 'America/Guayaquil', frequency INTEGER NOT NULL DEFAULT 60,
        start_min INTEGER NOT NULL DEFAULT 480, end_min INTEGER NOT NULL DEFAULT 1200,
        reminders BOOLEAN NOT NULL DEFAULT false, created_at TIMESTAMPTZ DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS intakes (
        id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        ml INTEGER NOT NULL CHECK (ml BETWEEN 1 AND 5000), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS intake_user_time ON intakes(user_id,created_at);
      CREATE TABLE IF NOT EXISTS subscriptions (
        id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint TEXT UNIQUE NOT NULL, p256dh TEXT NOT NULL, auth TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS deliveries (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        slot TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'claimed', PRIMARY KEY(user_id,slot)
      );
    `);
    // Migración aditiva e idempotente: conserva perfiles, consumos y suscripciones existentes.
    await this.pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS active_breaks BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS break_first_min INTEGER NOT NULL DEFAULT 600;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS break_second_min INTEGER NOT NULL DEFAULT 960;
      ALTER TABLE intakes ADD COLUMN IF NOT EXISTS reward_day TEXT;
      CREATE TABLE IF NOT EXISTS reward_actions (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        day TEXT NOT NULL,
        action TEXT NOT NULL CHECK (action IN ('water','break1','break2')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY(user_id,day,action)
      );
      CREATE TABLE IF NOT EXISTS reward_unlocks (
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reward_id TEXT NOT NULL,
        unlocked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY(user_id,reward_id)
      );
    `);
  }
  async query(sql: string, args: any[] = []) { return this.pool.query(sql, args); }
}
