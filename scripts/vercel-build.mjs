// Build usado pela Vercel (buildCommand do vercel.json): escolhe a configuração do Angular.
//
// 1. ANGULAR_CONFIGURATION, que o deploy.yml define (develop ou production);
// 2. senão, VERCEL_ENV da Vercel (production → production; preview → develop).
import { spawnSync } from 'node:child_process';

const allowed = ['develop', 'production'];
const configuration =
    process.env.ANGULAR_CONFIGURATION || (process.env.VERCEL_ENV === 'production' ? 'production' : 'develop');

if (!allowed.includes(configuration)) {
    console.error(`ANGULAR_CONFIGURATION inválida: "${configuration}" (use ${allowed.join(' ou ')}).`);
    process.exit(1);
}

console.log(`Build do Angular com --configuration ${configuration}`);

const result = spawnSync('npx', ['ng', 'build', '--configuration', configuration], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
