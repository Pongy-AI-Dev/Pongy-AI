import { spawn } from 'node:child_process';
const child = spawn(process.execPath, ['server.js'], { stdio: 'inherit', env: { ...process.env, PONGY_LOCAL_DEV_AUTH: 'true' } });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
process.on('SIGINT', () => child.kill('SIGINT'));
process.on('SIGTERM', () => child.kill('SIGTERM'));