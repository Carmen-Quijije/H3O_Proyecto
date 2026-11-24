// Promoción explícita desde la computadora administradora; no existe registro público de administradores.
import {config} from 'dotenv';
import pg from 'pg';
config();
const email=process.argv[2];if(!email||!email.includes('@'))throw Error('Uso: node scripts/make-admin.mjs correo@ejemplo.com');
if(process.env.DB_MEMORY==='true')throw Error('Usa PostgreSQL persistente para crear administradores');
const pool=new pg.Pool({connectionString:process.env.DATABASE_URL});
try{const result=await pool.query("UPDATE users SET role='admin' WHERE email=$1 RETURNING id,email",[email.toLowerCase().trim()]);if(!result.rows.length)throw Error('Primero registra esa cuenta desde la web');console.log('Administrador configurado:',result.rows[0].email);}finally{await pool.end();}
