import path from 'node:path';

const SOURCE_EXT = /\.(?:[cm]?js|jsx|tsx?|json|html|css|py|ya?ml|toml|xml|sql|sh|ps1|go|rs|java|kt|swift|php|rb|cs|cpp?|h)$/i;
const SECRET_PATTERNS = [
  ['private_key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['google_api_key', /\bAIza[A-Za-z0-9_-]{35}\b/],
  ['github_token', /\bgh[pousr]_[A-Za-z0-9]{36,}\b|\bgithub_pat_[A-Za-z0-9_]{40,}\b/],
  ['generic_api_key', /\b(?:sk-[A-Za-z0-9_-]{24,}|sk-or-v1-[a-f0-9]{32,})\b/i],
  ['credential_assignment', /\b(?:api[_-]?key|client[_-]?secret|access[_-]?token|password)\s*[:=]\s*['"][^'"]{12,}['"]/i]
];
const RISK_PATTERNS = [
  ['dynamic_code', /\beval\s*\(|\bnew\s+Function\s*\(/g, 'Dynamic code execution requires a clear trust boundary.'],
  // Prefer high-confidence process-launch signatures; a generic `.exec()` match
  // creates noise for unrelated application methods and database APIs.
  ['shell_execution', /\b(?:execFile|execFileSync|spawn|spawnSync|fork)\s*\(|\bchild_process\.(?:exec|execSync)\s*\(/g, 'Process execution should use fixed commands and validated arguments.'],
  ['unsafe_html', /\b(?:innerHTML|outerHTML)\s*=/g, 'Review HTML injection and sanitization at this assignment.'],
  ['document_write', /\bdocument\.write\s*\(/g, 'document.write can create injection and lifecycle risks.']
];

function safeName(value) {
  const name = String(value || '').replaceAll('\\', '/');
  if (!name || name.length > 240 || name.startsWith('/') || /^[a-z]:/i.test(name) ||
      name.split('/').some(part => !part || part === '.' || part === '..')) return null;
  return name;
}

function add(findings, finding) {
  if (findings.length < 200) findings.push(finding);
}

/**
 * Static, non-executing source audit. Findings are signals for human/model review,
 * not proof of exploitability or absence of defects.
 */
export function auditSourceFiles(files, { completeProject = false } = {}) {
  if (!Array.isArray(files) || files.length > 1000) throw new Error('Audit accepts up to 1000 source files');
  const findings = [], byName = new Map(), normalized = new Map();
  let bytes = 0;
  for (const item of files) {
    const name = safeName(item?.name);
    if (!name || typeof item?.content !== 'string') {
      add(findings, { severity: 'error', code: 'invalid_file', file: String(item?.name || '').slice(0, 160), line: 0, message: 'Invalid or unsafe source path/content.' });
      continue;
    }
    bytes += Buffer.byteLength(item.content);
    if (bytes > 8_000_000) throw new Error('Audit source limit exceeded (8 MB)');
    const key = name.toLowerCase();
    if (normalized.has(key)) add(findings, { severity: 'error', code: 'duplicate_path', file: name, line: 0, message: 'Duplicate path differs only by letter case.' });
    normalized.set(key, name);
    byName.set(name, item.content);
  }
  for (const [name, source] of byName) {
    const lines = source.split(/\r?\n/);
    if (/(?:^|\/)\.env(?:\..*)?$/i.test(name) && !/(?:^|\/)\.env\.example$/i.test(name)) {
      add(findings, { severity: 'high', code: 'private_env_file', file: name, line: 0, message: 'Private environment files should not be included in project attachments.' });
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      for (const [code, pattern] of SECRET_PATTERNS) {
        if (pattern.test(line)) add(findings, { severity: code === 'credential_assignment' && (name.toLowerCase().startsWith('tests/') || name.toLowerCase().includes('/tests/')) ? 'review' : 'high', code: 'possible_' + code, file: name, line: i + 1, message: 'Possible credential detected; value intentionally withheld. Rotate it if it is real.' });
      }
      for (const [code, pattern, message] of RISK_PATTERNS) {
        pattern.lastIndex = 0;
        if (pattern.test(line)) add(findings, { severity: 'review', code, file: name, line: i + 1, message });
      }
    }
    if (/\.(?:js|mjs|cjs)$/i.test(name)) {
      const imports = [
        ...source.matchAll(/\bfrom\s*['"]([^'"]+)['"]|\bimport\s*['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)|\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g)
      ];
      for (const match of imports) {
        const rawSpecifier = match[1] || match[2] || match[3] || match[4];
        const specifier = typeof rawSpecifier === 'string' ? rawSpecifier.replace(/[?#].*$/, '') : '';
        if (!specifier.startsWith('.')) continue;
        const target = path.posix.normalize(path.posix.join(path.posix.dirname(name), specifier));
        const candidates = [target, ...['.js', '.mjs', '.cjs', '.json', '/index.js'].map(suffix => target + suffix)];
        if (!candidates.some(candidate => byName.has(candidate) || normalized.has(candidate.toLowerCase()))) {
          add(findings, { severity: 'info', code: 'unresolved_local_import', file: name, line: source.slice(0, match.index).split(/\r?\n/).length, message: completeProject ? 'Relative import target is not present in the supplied project files.' : 'Relative import target was not supplied; project completeness is unknown.' });
        }
      }
    }
    if (/\.json$/i.test(name)) {
      try { JSON.parse(source); }
      catch { add(findings, { severity: 'error', code: 'invalid_json', file: name, line: 0, message: 'JSON parsing failed.' }); }
    }
  }
  const counts = findings.reduce((out, item) => { out[item.severity] = (out[item.severity] || 0) + 1; return out; }, {});
  return {
    filesScanned: byName.size,
    bytesScanned: bytes,
    completeProject: !!completeProject,
    findings,
    counts,
    executed: false,
    limitations: ['Static heuristic audit only; no source code was executed.', 'Risk-pattern matches require context and are not proof of a vulnerability.', 'No audit can guarantee the absence of bugs, secrets or security issues.']
  };
}
