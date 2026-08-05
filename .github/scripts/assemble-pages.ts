// Assembles the buildhost site staging dir (_site/) from pages-manifest.json.
// Executed by .github/workflows/preview.yml via wow-look-at-my/actions@typescript#latest
// (file: mode — same model as an inline script: the body runs inside an async
// function with `core`, `fs`, `path`, etc. already in scope; no imports).
//
// Each manifest entry {from, to} copies a repo file or directory (recursive)
// into the artifact at the site path `to`. The manifest is the single source
// of truth for what gets published; this script just executes it.

const out = '_site';
const manifest = JSON.parse(fs.readFileSync('pages-manifest.json', 'utf-8'));
const outRoot = path.resolve(out);
fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outRoot, { recursive: true });
const lines: string[] = [];
for (const entry of manifest.entries) {
  // '/x' site paths resolve INSIDE the artifact root, and never above it
  const dest = path.resolve(outRoot, '.' + path.posix.join('/', entry.to));
  if (dest !== outRoot && !dest.startsWith(outRoot + path.sep)) {
    core.setFailed(`pages-manifest.json: output path escapes the site root: ${entry.to}`);
    return;
  }
  if (!fs.existsSync(entry.from)) {
    core.setFailed(`pages-manifest.json: input path not found: ${entry.from}`);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(entry.from, dest, { recursive: true });
  lines.push(`copy  ${entry.from}  ->  ${entry.to}`);
}
const files = fs.readdirSync(out, { recursive: true })
  .map(String)
  .filter((n) => fs.statSync(path.join(out, n)).isFile());
core.info(`pages-manifest.json -> ${out}/ (${files.length} files):`);
for (const l of lines) core.info(`  ${l}`);
