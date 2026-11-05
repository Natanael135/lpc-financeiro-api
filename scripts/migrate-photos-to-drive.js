// Copia as fotos antigas (Supabase) para o Google Drive, já organizadas
// (Tipo › Loja › Mês › Dia), e troca a URL no banco para /uploads/drive/<id>.
// Nada é apagado do Supabase. Cada troca fica registrada em
// scripts/backup/migracao-fotos-<data>.jsonl (url antiga → nova) para desfazer.
// Pode ser rodado de novo: só processa o que ainda aponta para o Supabase.
//
// Uso (após `npm run build`):
//   node scripts/migrate-photos-to-drive.js --dry-run     # só lista
//   node scripts/migrate-photos-to-drive.js --copy-only   # copia p/ o Drive, NÃO mexe no banco
//   node scripts/migrate-photos-to-drive.js --reuse scripts/backup/<log>.jsonl
//        # troca as URLs no banco reaproveitando o que já foi copiado (sem subir de novo)
//   Opções: --limit 10  --concurrency 4
require('dotenv/config');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { DriveStorage } = require('../dist/uploads/drive-storage');
const {
  folderSegments,
  namePrefix,
  fileExtension,
  driveUrl,
} = require('../dist/uploads/photo-path');

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const argNum = (name, def) => {
  const i = args.indexOf(name);
  return i >= 0 ? Number(args[i + 1]) : def;
};
const LIMIT = argNum('--limit', Infinity);
const CONCURRENCY = argNum('--concurrency', 4);
const COPY_ONLY = args.includes('--copy-only');
const REUSE = args.includes('--reuse') ? args[args.indexOf('--reuse') + 1] : null;

const isLegacy = (url) => typeof url === 'string' && url.includes('.supabase.co/');

async function download(url, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return {
        buffer: Buffer.from(await res.arrayBuffer()),
        mimeType: res.headers.get('content-type') || 'image/jpeg',
      };
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

async function collectTasks(db) {
  const employees = new Map(
    (await db.collection('employees').find({}, { projection: { name: 1 } }).toArray()).map(
      (e) => [String(e._id), e.name],
    ),
  );
  const sources = [
    { col: 'revenues', ctx: (d) => ({ category: 'faturamento', unit: d.unit, date: d.date }) },
    {
      col: 'cashmovements',
      ctx: (d) => ({
        category: d.type,
        unit: d.unit,
        date: d.date,
        label: d.type === 'sangria' ? d.category || 'Outros' : undefined,
      }),
    },
    { col: 'cofredeposits', ctx: (d) => ({ category: 'cofre', unit: d.unit, date: d.date }) },
    {
      col: 'scheduleentries',
      ctx: (d) => ({
        category: 'atestado',
        unit: d.unit,
        date: d.date,
        label: employees.get(String(d.employeeId)),
      }),
    },
  ];

  const tasks = [];
  for (const src of sources) {
    const docs = await db
      .collection(src.col)
      .find({ 'attachments.url': { $regex: '\\.supabase\\.co/' } })
      .sort({ date: 1, createdAt: 1 })
      .toArray();
    for (const d of docs) {
      const ctx = src.ctx(d);
      d.attachments.forEach((a, i) => {
        if (isLegacy(a.url)) tasks.push({ col: src.col, id: d._id, index: i, oldUrl: a.url, ctx });
      });
    }
  }
  return tasks;
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const storage = new DriveStorage({
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    rootFolderId: process.env.GOOGLE_DRIVE_ROOT_ID,
  });

  let tasks = await collectTasks(db);
  const byCol = tasks.reduce((m, t) => ((m[t.col] = (m[t.col] || 0) + 1), m), {});
  console.log(`Fotos no Supabase: ${tasks.length}`, byCol);
  tasks = tasks.slice(0, LIMIT);

  if (DRY) {
    for (const t of tasks.slice(0, 15)) {
      console.log(`  ${[...folderSegments(t.ctx)].join(' / ')} / ${namePrefix(t.ctx)} N`);
    }
    await mongoose.disconnect();
    return;
  }

  const backupDir = path.join(__dirname, 'backup');
  fs.mkdirSync(backupDir, { recursive: true });
  const logPath = path.join(
    backupDir,
    `migracao-fotos-${new Date().toISOString().replace(/[:.]/g, '-')}.jsonl`,
  );
  const log = fs.createWriteStream(logPath, { flags: 'a' });

  // Agrupa por pasta de destino: dentro de um dia a numeração segue a ordem
  // dos lançamentos; dias diferentes rodam em paralelo.
  const groups = new Map();
  for (const t of tasks) {
    const key = folderSegments(t.ctx).join('/');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }
  const queue = [...groups.values()];
  const done = new Map(); // url antiga → nova (mesma foto em 2 lançamentos)
  if (REUSE) {
    for (const line of fs.readFileSync(REUSE, 'utf8').split('\n')) {
      if (!line.trim()) continue;
      const r = JSON.parse(line);
      if (r.oldUrl && r.newUrl) done.set(r.oldUrl, r.newUrl);
    }
    console.log(`Reaproveitando ${done.size} fotos já copiadas de ${REUSE}`);
  }
  console.log(COPY_ONLY ? 'Modo --copy-only: o banco NÃO será alterado.' : 'O banco será atualizado.');
  let ok = 0;
  let fail = 0;

  async function migrate(t) {
    let newUrl = done.get(t.oldUrl);
    if (!newUrl) {
      const { buffer, mimeType } = await download(t.oldUrl);
      const ext = fileExtension(t.oldUrl.split('?')[0], mimeType);
      const id = await storage.uploadPhoto(buffer, mimeType, ext, t.ctx);
      newUrl = driveUrl(id);
      done.set(t.oldUrl, newUrl);
    }
    if (!COPY_ONLY) {
      await db
        .collection(t.col)
        .updateOne(
          { _id: t.id },
          { $set: { 'attachments.$[a].url': newUrl } },
          { arrayFilters: [{ 'a.url': t.oldUrl }] },
        );
    }
    log.write(
      JSON.stringify({ col: t.col, id: String(t.id), oldUrl: t.oldUrl, newUrl, folder: folderSegments(t.ctx).join('/'), db: !COPY_ONLY }) + '\n',
    );
  }

  async function worker() {
    for (let group = queue.shift(); group; group = queue.shift()) {
      for (const t of group) {
        try {
          await migrate(t);
          ok++;
        } catch (e) {
          fail++;
          console.error(`FALHA ${t.col} ${t.id} ${t.oldUrl}: ${e.message}`);
        }
        if ((ok + fail) % 25 === 0) console.log(`  ${ok + fail}/${tasks.length} (falhas: ${fail})`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  log.end();
  console.log(`Concluído: ${ok} copiadas, ${fail} falhas. Log: ${logPath}`);
  await mongoose.disconnect();
  process.exit(fail ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
