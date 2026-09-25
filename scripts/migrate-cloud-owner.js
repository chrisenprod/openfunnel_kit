import { DatabaseSync, backup } from 'node:sqlite';
import { existsSync, mkdirSync, renameSync, rmSync, chmodSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { openDatabase } from '../backend/db.js';
import { encryptionKey, rebindConnections, invalidateConnections } from '../backend/provider-connections.js';
import { transaction } from '../backend/migrate.js';

export async function migrateCloudOwner({ sourcePath, cloudDirectory, env }) {
  const root = resolve(cloudDirectory);
  const source = resolve(sourcePath);
  const control = new DatabaseSync(join(root,'control.sqlite'),{readOnly:true});
  let owner;
  try {
    owner = control.prepare("SELECT c.workspace_id,u.email,u.emailVerified FROM cloud_accounts c JOIN auth_user u ON u.id=c.user_id WHERE c.role='superadmin'").get();
    if (!owner || !owner.emailVerified || owner.email.toLowerCase() !== env.CLOUD_OWNER_EMAIL?.trim().toLowerCase()) throw new Error('Primero registra y verifica al dueño configurado.');
  } finally { control.close(); }
  const destination = join(root,'workspaces',`${owner.workspace_id}.sqlite`);
  if (source === destination || !existsSync(source) || existsSync(destination)) throw new Error('La fuente debe existir y el destino debe estar vacío y no creado. No se sobrescriben bases.');
  mkdirSync(join(root,'workspaces'),{recursive:true});
  const temporary = `${destination}.migration`;
  if (existsSync(temporary)) throw new Error('Existe un ensayo incompleto. Revísalo antes de continuar.');
  const legacy = new DatabaseSync(source,{readOnly:true});
  try { await backup(legacy,temporary); } finally { legacy.close(); }
  let db;
  try {
    db = openDatabase(temporary);
    const key = encryptionKey(env);
    rebindConnections(db,key,key,'self-hosted',owner.workspace_id);
    transaction(db,()=>{
      db.exec('DELETE FROM auth_session; DELETE FROM auth_account; DELETE FROM auth_user; DELETE FROM auth_verification; DELETE FROM auth_settings; DELETE FROM cloud_mail_tokens; DELETE FROM cloud_limits; DELETE FROM cloud_audit;');
      invalidateConnections(db,'Instalación trasladada. Revisa conexiones y conversaciones antes de reactivar.');
      db.exec("UPDATE outbound_messages SET status='uncertain' WHERE status='sending'; UPDATE messages SET delivery_status='uncertain' WHERE id IN (SELECT message_id FROM outbound_messages WHERE status='uncertain'); DELETE FROM integration_settings WHERE key IN ('webhook_id','webhook_fingerprint');");
    });
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length) throw new Error('La copia no pasó la comprobación de integridad.');
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');db.close();db=null;
    chmodSync(temporary,0o600);renameSync(temporary,destination);
    return { workspaceId:owner.workspace_id, destination };
  } catch(error) { if(db)db.close(); for(const suffix of ['', '-wal','-shm'])rmSync(temporary+suffix,{force:true}); throw error; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const sourcePath=process.argv[2];
  if(!sourcePath || !process.argv.includes('--offline')) throw new Error('Uso: node --env-file=.env scripts/migrate-cloud-owner.js fuente.sqlite --offline. Detén primero ambas APIs y respalda los datos.');
  await migrateCloudOwner({sourcePath,cloudDirectory:process.env.CLOUD_DATA_DIR || 'backend/data/cloud',env:process.env});
  console.log('Copia migrada con integridad verificada. La fuente se conserva; revisa conexiones antes de reactivar.');
}
