// Merged line coverage: unit tests (node) + end-to-end run (Chrome), reported by c8.
import { spawnSync } from 'node:child_process';
import { rmSync, readdirSync } from 'node:fs';

const tmp = 'coverage/tmp';
rmSync('coverage', { recursive: true, force: true });
const run = (cmd, args, env = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run('node', ['--test', ...readdirSync('tests').filter((f) => f.endsWith('.test.mjs')).map((f) => 'tests/' + f)], { NODE_V8_COVERAGE: tmp });
run('node', ['tests/inkpad.cdp.mjs'], { COVERAGE_DIR: tmp });
run('npx', ['c8', 'report', '--temp-directory', tmp, '--reports-dir', 'coverage', '--all', '--src', 'app',
  '--include', 'app/js/**', '--include', 'app/data/**', '--check-coverage', '--lines', '95', '--functions', '90',
  '--reporter', 'text', '--reporter', 'html', '--reporter', 'text-summary']);
