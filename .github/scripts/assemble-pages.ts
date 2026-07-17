// Assembles the GitHub Pages artifact (_site/) from pages-manifest.json.
// Executed by .github/workflows/pages.yml via wow-look-at-my/actions@typescript#latest
// (file: mode — same model as an inline script: the body runs inside an async
// function with `core`, `fs`, `path`, etc. already in scope; no imports).
//
// Manifest entries: {from, to} copies a file or directory (recursive) into the
// artifact at the site path `to`; {redirect, to} renders the meta-refresh stub
// template (pages-redirect.html, in this directory) at `to` — {{TARGET_URL}}
// gets the encodeURI'd target (attribute-safe), {{TARGET_TEXT}} the raw target
// (link text).

const out = '_site';
const manifest = JSON.parse(fs.readFileSync('pages-manifest.json', 'utf-8'));
const template = fs.readFileSync('.github/scripts/pages-redirect.html', 'utf-8');
for (const placeholder of ['{{TARGET_URL}}', '{{TARGET_TEXT}}']) {
  if (!template.includes(placeholder)) {
    core.setFailed(`pages-redirect.html: required placeholder ${placeholder} is missing`);
    return;
  }
}
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
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (entry.redirect != null) {
    fs.writeFileSync(dest, template
      .replaceAll('{{TARGET_URL}}', encodeURI(entry.redirect))
      .replaceAll('{{TARGET_TEXT}}', entry.redirect));
    lines.push(`redirect  ${entry.to}  ->  ${entry.redirect}`);
  } else {
    if (!fs.existsSync(entry.from)) {
      core.setFailed(`pages-manifest.json: input path not found: ${entry.from}`);
      return;
    }
    fs.cpSync(entry.from, dest, { recursive: true });
    lines.push(`copy      ${entry.from}  ->  ${entry.to}`);
  }
}
const files = fs.readdirSync(out, { recursive: true })
  .map(String)
  .filter((n) => fs.statSync(path.join(out, n)).isFile());
core.info(`pages-manifest.json -> ${out}/ (${files.length} files):`);
for (const l of lines) core.info(`  ${l}`);
