'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const excluded = new Set(['.git', 'node_modules', 'data', '.ci-logs', 'artifacts', 'playwright-report', 'test-results', 'downloads']);
const sourcePattern = /\.(?:[cm]?js|jsx|tsx?|json|html|css|py|ya?ml|toml|xml|sql|sh|ps1|go|rs|java|kt|swift|php|rb|cs|cpp?|h)$/i;
function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.isSymbolicLink()) continue;
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(absolute));
    else if (entry.isFile()) {
      const relative = path.relative(root, absolute).split(path.sep).join('/');
      if ((sourcePattern.test(relative) || /(?:^|\/)\.env(?:\..*)?$/i.test(relative)) && !relative.startsWith('public/vendor/')) out.push(relative);
    }
  }
  return out;
}
(async () => {
  const { auditSourceFiles } = await import('../lib/code-auditor.js');
  const inventory = walk(root);
  const names = inventory.slice(0, 1000);
  const files = names.map(name => ({ name, content: fs.readFileSync(path.join(root, name), 'utf8') }));
  const report = auditSourceFiles(files, { completeProject: names.length === inventory.length });
  const summary = { filesScanned: report.filesScanned, bytesScanned: report.bytesScanned, completeProject: report.completeProject, counts: report.counts, findings: report.findings, executed: false, limitations: report.limitations };
  if (process.argv.includes('--json')) process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
  else {
    console.log('Pongy AI static source audit');
    console.log('Files scanned: ' + summary.filesScanned + (summary.completeProject ? ' (complete source inventory)' : ' (inventory capped)'));
    console.log('Findings: ' + JSON.stringify(summary.counts));
    for (const finding of summary.findings.slice(0, 40)) console.log('[' + finding.severity.toUpperCase() + '] ' + finding.file + (finding.line ? ':' + finding.line : '') + ' — ' + finding.code + ': ' + finding.message);
    if (summary.findings.length > 40) console.log('... ' + (summary.findings.length - 40) + ' additional finding(s) omitted from console output; use --json for the complete bounded report.');
    console.log('No source code was executed. Static findings require contextual review.');
  }
  if ((summary.counts.error || 0) + (summary.counts.high || 0) > 0) process.exitCode = 1;
})().catch(error => { console.error('Audit failed: ' + error.message); process.exitCode = 1; });
