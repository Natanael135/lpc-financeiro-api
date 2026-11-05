// Gera o GOOGLE_REFRESH_TOKEN (acesso ao Drive) e grava no .env.
// Uso: node scripts/google-auth.js  → abre/mostra a URL de consentimento;
// após "Permitir", o Google redireciona para http://127.0.0.1:53682 e o token
// é salvo automaticamente no .env.
require('dotenv/config');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { OAuth2Client } = require('google-auth-library');

const PORT = 53682;
const REDIRECT = `http://127.0.0.1:${PORT}`;
const ENV_PATH = path.join(__dirname, '..', '.env');
const URL_FILE = path.join(__dirname, '..', 'google-auth-url.txt');

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  REDIRECT,
);

const authUrl = client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/drive.file'],
  login_hint: 'natanaelmelo.dev@gmail.com',
});
fs.writeFileSync(URL_FILE, authUrl);
console.log('Abra esta URL para autorizar:\n' + authUrl);

function saveEnv(key, value) {
  let env = fs.readFileSync(ENV_PATH, 'utf8');
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  env = re.test(env) ? env.replace(re, line) : env.replace(/\s*$/, '') + `\r\n${line}\r\n`;
  fs.writeFileSync(ENV_PATH, env);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, REDIRECT);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`Sem código de autorização${error ? `: ${error}` : ''}.`);
    if (error) shutdown(1);
    return;
  }
  try {
    const { tokens } = await client.getToken(code);
    if (!tokens.refresh_token) throw new Error('Google não devolveu refresh_token.');
    saveEnv('GOOGLE_REFRESH_TOKEN', tokens.refresh_token);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h2>Pronto! Acesso ao Google Drive autorizado.</h2><p>Pode fechar esta aba.</p>');
    console.log('OK: GOOGLE_REFRESH_TOKEN salvo no .env (escopo: ' + tokens.scope + ')');
    shutdown(0);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Falhou: ' + e.message);
    console.error(e);
    shutdown(1);
  }
});

function shutdown(code) {
  try { fs.unlinkSync(URL_FILE); } catch {}
  setTimeout(() => process.exit(code), 500);
}

server.listen(PORT, '127.0.0.1');
// Desiste após 15 minutos.
setTimeout(() => { console.error('Tempo esgotado.'); shutdown(1); }, 15 * 60 * 1000);
