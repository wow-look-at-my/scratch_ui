// Concatenates every stylesheet into the single published dist/scratch-ui.css.
// Built by ts0 (ts0.scripts.json) and run as dist-scripts/build-css.js.
//
// The library ships two files: this stylesheet and the JS bundle. The
// stylesheet is loaded TWICE, for two different jobs, and the browser fetches
// it once:
//
//   <link rel="stylesheet" href="scratch-ui.css">   puts the tokens on :root
//   import styles from './scratch-ui.css'           gets the component rules
//     with { type: 'css' }                          into each shadow root
//
// A linked stylesheet cannot reach inside a shadow root (only inherited
// properties cross the boundary), which is why the import exists. The import
// stays an external reference in the JS -- ts0's `external: ["*.css"]` -- so
// no stylesheet text is ever embedded in the bundle.
//
// Tokens come FIRST: component rules reference them, and a custom property
// must be declared before use within the same origin/specificity.

import fs from 'node:fs';
import path from 'node:path';

// Generated into src/ rather than dist/ so the specifier in src/styles.ts
// (`./scratch-ui.css`) resolves at BUILD time as well as at runtime: the
// import is external, but the bundler still has to find the file to leave the
// reference alone. It is a build artifact -- gitignored, and published to the
// site from here by pages-manifest.json.
const OUT = 'src/scratch-ui.css';

// Stylesheets whose selectors already name the hosts they apply to, so
// scoping them to their own filename would break them.
const UNSCOPED = new Set(['scratch-reveal']);
const TOKENS = 'src/css/scratch-tokens.css';
const COMPONENTS = 'src/components';

function fail(msg: string): never {
	console.error(`build-css: ${msg}`);
	process.exit(1);
}

if (!fs.existsSync(TOKENS)) fail(`missing ${TOKENS}`);

const parts: string[] = [];
const sources: string[] = [];

// One stylesheet is adopted by EVERY shadow root, so a component's rules must
// be scoped to that component or they apply everywhere. A bare `:host` is the
// worst case: 17 of them matched every component, and the last one won -- a
// badge came out 460px wide (from the modal) and 6px tall (from the LED).
//
// Sources stay written the natural way (`:host`, `.box`); the scoping is
// applied here, at concat time:
//
//   :host              -> :host(scratch-badge)
//   :host(...)         -> :host(scratch-badge...)      (merged, not nested)
//   :host-context(...) -> left alone (already contextual)
//   .box               -> :host(scratch-badge) .box
//   ::slotted(x)       -> :host(scratch-badge) ::slotted(x)
//
// Rules inside @media/@supports are scoped the same way; the at-rule prelude
// itself is untouched. Keyframe bodies (percentage/from/to selectors) must NOT
// be scoped, so @keyframes blocks are passed through verbatim.
function scopeSelector(sel: string, tag: string): string {
	return sel.split(',').map((oneRaw) => {
		const one = oneRaw.trim();
		if (one === '') return one;
		// already contextual on the host's ancestors: leave as authored
		if (one.startsWith(':host-context')) return one;
		if (one.startsWith(':host(')) {
			// :host(.a) -> :host(scratch-x.a): merge into a single compound so
			// the host must be BOTH this tag and whatever was asked for.
			const close = one.indexOf(')');
			const inner = one.slice(6, close);
			return `:host(${tag}${inner})${one.slice(close + 1)}`;
		}
		if (one === ':host') return `:host(${tag})`;
		if (one.startsWith(':host')) return `:host(${tag})${one.slice(5)}`;
		return `:host(${tag}) ${one}`;
	}).join(', ');
}

// Walk the stylesheet text and rewrite the selector of every style rule.
// Deliberately a small scanner rather than a regex: selectors can contain
// braces-free commas, at-rules nest, and @keyframes must be skipped whole.
function scopeCss(css: string, tag: string): string {
	let out = '';
	let i = 0;
	while (i < css.length) {
		const brace = css.indexOf('{', i);
		if (brace === -1) { out += css.slice(i); break; }

		const prelude = css.slice(i, brace);
		// A prelude may carry comments and blank lines ahead of the selector or
		// at-rule. Split them off first: without this an `@keyframes` behind a
		// comment reads as a selector and its offsets get scoped as if they
		// were elements.
		const lastComment = prelude.lastIndexOf('*/');
		const lead = lastComment === -1 ? '' : prelude.slice(0, lastComment + 2);
		const decl = prelude.slice(lead.length);
		const trimmed = decl.trim();

		if (trimmed.startsWith('@')) {
			const name = trimmed.split(/[\s(]/)[0];
			if (name === '@keyframes' || name === '@-webkit-keyframes' || name === '@font-face') {
				// copy the whole block verbatim: its inner "selectors" are
				// keyframe offsets or descriptors, not element selectors
				let depth = 0, j = brace;
				for (; j < css.length; j++) {
					if (css[j] === '{') depth++;
					else if (css[j] === '}') { depth--; if (depth === 0) { j++; break; } }
				}
				out += css.slice(i, j);
				i = j;
				continue;
			}
			// conditional group (@media, @supports, @layer): keep the prelude,
			// recurse into the body so the rules inside get scoped
			let depth = 0, j = brace;
			for (; j < css.length; j++) {
				if (css[j] === '{') depth++;
				else if (css[j] === '}') { depth--; if (depth === 0) break; }
			}
			out += prelude + '{' + scopeCss(css.slice(brace + 1, j), tag) + '}';
			i = j + 1;
			continue;
		}

		// ordinary style rule: scope its selector, copy its body. The leading
		// comments are emitted untouched; only `decl` is a selector.
		const end = css.indexOf('}', brace);
		const body = css.slice(brace + 1, end === -1 ? css.length : end);
		out += lead + scopeSelector(decl, tag) + ' {' + body + '}';
		i = (end === -1 ? css.length : end + 1);
	}
	return out;
}

function add(file: string, tag?: string): void {
	let css = fs.readFileSync(file, 'utf-8').trim();
	if (tag) css = scopeCss(css, tag);
	parts.push(`/* === ${file}${tag ? ` (scoped to ${tag})` : ''} === */\n${css}\n`);
	sources.push(file);
}

// Tokens are page-level :root custom properties -- never scoped.
add(TOKENS);

// Every .css under a component directory, sorted for a stable output. Some
// components own more than one (scratch-nav has nav + nav-item).
const dirs = fs.readdirSync(COMPONENTS, { withFileTypes: true })
	.filter((d) => d.isDirectory())
	.map((d) => d.name)
	.sort();

for (const dir of dirs) {
	const css = fs.readdirSync(path.join(COMPONENTS, dir))
		.filter((f) => f.endsWith('.css'))
		.sort();
	if (css.length === 0) fail(`component ${dir} has no .css file`);
	for (const f of css) {
		const tag = path.basename(f, '.css');
		// scratch-reveal is not an element -- it decorates OTHER components,
		// and its selectors already name the hosts they target
		// (`:host(:not(scratch-toggle))`). Scoping it to `scratch-reveal`
		// would produce `:host(scratch-reveal:not(scratch-toggle))`, which
		// matches nothing.
		const scoped = UNSCOPED.has(tag) ? undefined : tag;
		// Otherwise the stylesheet's basename IS the element it styles, which
		// is what makes scratch-nav/ work: scratch-nav.css scopes to
		// <scratch-nav> and scratch-nav-item.css to <scratch-nav-item>.
		add(path.join(COMPONENTS, dir, f), scoped);
	}
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, parts.join('\n'));

const bytes = fs.statSync(OUT).size;
console.log(`${sources.length} stylesheets -> ${OUT} (${bytes} bytes):`);
for (const s of sources) console.log(`  ${s}`);
