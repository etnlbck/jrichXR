/**
 * Local Next dev server plus a Cloudflare quick tunnel.
 * The phone opens the printed https://….trycloudflare.com URL (real certificate).
 * localhost HTTP is only for the tunnel and for /?stage=1 on this machine.
 */
import { spawn, spawnSync } from 'node:child_process';

const port = process.env.PORT || '3000';
const origin = `http://127.0.0.1:${port}`;

const cloudflared = spawnSync('cloudflared', ['--version'], { stdio: 'ignore' });
if (cloudflared.error || cloudflared.status !== 0) {
  console.error(
    '\ncloudflared is not installed. Run: brew install cloudflared\n'
  );
  process.exit(1);
}

const next = spawn('npm', ['run', 'dev:phone', '-w', '@jrichforms/web'], {
  stdio: 'inherit',
  detached: true,
});

const tunnel = spawn('cloudflared', ['tunnel', '--url', origin], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

const urlRe = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
let pending = '';
let printed = false;
let exiting = false;

function onTunnelData(chunk) {
  const text = chunk.toString();
  process.stderr.write(text);
  if (printed) return;
  pending += text;
  const match = pending.match(urlRe);
  if (!match) {
    if (pending.length > 8000) pending = pending.slice(-2000);
    return;
  }
  printed = true;
  console.log(`\nPhone: ${match[0]}`);
  console.log('Open that URL, tap Begin, and point at the marker from /marker.');
  console.log(
    'This address changes every run. The dev server is public until you stop this command.'
  );
  console.log(`Desktop stand-in (no camera): http://localhost:${port}/?stage=1\n`);
}

tunnel.stdout?.on('data', onTunnelData);
tunnel.stderr?.on('data', onTunnelData);

function stop(child) {
  if (!child.pid || child.killed) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {
    child.kill('SIGTERM');
  }
}

function shutdown(code = 0) {
  if (exiting) return;
  exiting = true;
  stop(next);
  stop(tunnel);
  setTimeout(() => process.exit(code), 300);
}

tunnel.on('error', (err) => {
  console.error(err);
  shutdown(1);
});

next.on('exit', (code) => shutdown(code ?? 0));
tunnel.on('exit', (code) => {
  if (!exiting) shutdown(code ?? 1);
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
