// Comprobación de solo lectura: no muestra la URL ni las credenciales.
import {config} from 'dotenv';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
config({path:fileURLToPath(new URL('../.env',import.meta.url)),quiet:true});
let pool;
try {
  if(process.env.DB_MEMORY==='true')throw new Error('Desactiva DB_MEMORY para probar PostgreSQL de Render.');
  const raw=process.env.DATABASE_URL?.trim();
  if(!raw)throw new Error('Falta DATABASE_URL en el archivo .env.');
  let url;
  try{url=new URL(raw);}catch{throw new Error('DATABASE_URL no tiene un formato válido.');}
  if(!['postgres:','postgresql:'].includes(url.protocol))throw new Error('La URL debe comenzar con postgresql:// o postgres://.');
  if(url.hostname.endsWith('.render.com')&&!url.searchParams.has('sslmode'))throw new Error('Añade sslmode=verify-full a la URL externa para exigir TLS con validación de certificado.');
  pool=new pg.Pool({connectionString:raw,connectionTimeoutMillis:10000,max:1});
  await pool.query('SELECT 1 AS connection_ok');
  console.log('Conexión PostgreSQL correcta. Credenciales no mostradas.');
}catch(error){
  if(!pool)console.error(error.message);
  else console.error(`No se pudo conectar a PostgreSQL (${error.code||'error de conexión'}). Revisa URL, contraseña, TLS y acceso de red en Render.`);
  process.exitCode=1;
}finally{if(pool)await pool.end();}
