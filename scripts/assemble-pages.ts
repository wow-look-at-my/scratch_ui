// Assembles the buildhost site staging dir (_site/) from pages-manifest.json.
// Built by ts0 (ts0.scripts.json) and run as dist-scripts/assemble-pages.js —
// by .github/workflows/ci.yml and by `pnpm site` locally.
// It lives OUTSIDE .github/ on purpose: tsc's default include never descends
// into a dot-directory, so a build script under .github/ type-checks nothing
// while still reporting a green build.
//
// Each manifest entry {from, to} copies a repo file or directory (recursive)
// into the artifact at the site path `to`. The manifest is the single source
// of truth for what gets published; this script just executes it — plus one
// check it owns: every component under src/components/ must be published at
// its flat consumer URL, so adding a component and forgetting the manifest
// entry fails here instead of silently shipping a site without it.

import fs from 'node:fs';
import path from 'node:path';

interface Entry { from: string; to: string }
interface Manifest { entries: Entry[] }

const out = '_site';
const manifest: Manifest = JSON.parse(fs.readFileSync('pages-manifest.json', 'utf-8'));

function fail(msg: string): never {
	console.error(`assemble-pages: ${msg}`);
	process.exit(1);
}

// The library ships as one bundle, so there is no per-component entry to
// check for. What matters instead is that every component actually made it
// INTO the bundle: src/index.ts imports each one for its side effect
// (customElements.define), and a component missing from that list compiles
// fine while silently shipping a library without it.
const components = fs.readdirSync('src/components', { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => d.name)
	.sort();
const entrySrc = fs.readFileSync('src/index.ts', 'utf-8');
const unimported = components.filter((c) => !entrySrc.includes(`/components/${c}/${c}.ts'`));
if (unimported.length > 0) {
	fail(`src/index.ts does not import: ${unimported.join(', ')}.\n` +
		unimported.map((c) => `  add import './components/${c}/${c}.ts';`).join('\n'));
}

const outRoot = path.resolve(out);
fs.rmSync(outRoot, { recursive: true, force: true });
fs.mkdirSync(outRoot, { recursive: true });
const lines: string[] = [];
for (const entry of manifest.entries) {
	// '/x' site paths resolve INSIDE the artifact root, and never above it
	const dest = path.resolve(outRoot, '.' + path.posix.join('/', entry.to));
	if (dest !== outRoot && !dest.startsWith(outRoot + path.sep)) {
		fail(`pages-manifest.json: output path escapes the site root: ${entry.to}`);
	}
	if (!fs.existsSync(entry.from)) {
		fail(`pages-manifest.json: input path not found: ${entry.from}` +
			(entry.from.startsWith('dist/') ? ' (run the build first: ts0 build)' : ''));
	}
	fs.mkdirSync(path.dirname(dest), { recursive: true });
	fs.cpSync(entry.from, dest, { recursive: true });
	lines.push(`copy  ${entry.from}  ->  ${entry.to}`);
}
const files = fs.readdirSync(out, { recursive: true })
	.map(String)
	.filter((n) => fs.statSync(path.join(out, n)).isFile());
console.log(`pages-manifest.json -> ${out}/ (${files.length} files, ${components.length} components):`);
for (const l of lines) console.log(`  ${l}`);
