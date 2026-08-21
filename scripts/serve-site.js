// Static file server for the local preview of the assembled _site/.
// Not part of the deploy: CI publishes _site/ via buildhost-publish-site, and
// nothing here runs in CI. `pnpm preview` reassembles _site/ first (see the
// "preview" script), so this only ever serves current output.
//
// Plain .js on purpose: ts0.scripts.json builds the single entry
// assemble-pages.ts, so a .js here is left alone and runs directly under node.

import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { join, normalize, extname, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..', '_site');
const port = Number(process.env.PORT || 4173);

const TYPES = {
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript; charset=utf-8',
	'.css': 'text/css; charset=utf-8',
	'.json': 'application/json; charset=utf-8',
	'.svg': 'image/svg+xml',
	'.png': 'image/png',
	'.jpg': 'image/jpeg',
	'.webp': 'image/webp',
	'.woff2': 'font/woff2',
};

// Resolve a URL path to a file inside root, or null if it escapes / is missing.
// Demo filenames contain spaces ("Scratch Proto.html"), so the path must be
// percent-decoded before it touches the filesystem.
async function resolveFile(urlPath) {
	let decoded;
	try {
		decoded = decodeURIComponent(urlPath);
	} catch {
		return null; // malformed percent-encoding
	}

	// normalize() collapses ".." so a crafted URL cannot climb out of _site/.
	const candidate = join(root, normalize(decoded));
	if (candidate !== root && !candidate.startsWith(root + '/'))
		return null; // escaped the served root

	const info = await stat(candidate).catch(() => null);
	if (!info)
		return null; // no such file

	if (!info.isDirectory())
		return candidate;

	// Directory URLs serve index.html ("/" and "/demo/").
	const index = join(candidate, 'index.html');
	const indexInfo = await stat(index).catch(() => null);
	return indexInfo?.isFile() ? index : null;
}

const server = createServer(async (req, res) => {
	const urlPath = new URL(req.url, 'http://localhost').pathname;
	const file = await resolveFile(urlPath);

	if (!file) {
		res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
		res.end(`404 Not Found: ${urlPath}\n`);
		console.log(`404 ${urlPath}`);
		return;
	}

	res.writeHead(200, {
		'content-type': TYPES[extname(file)] || 'application/octet-stream',
		// The preview must never show stale components after a rebuild.
		'cache-control': 'no-store',
	});
	createReadStream(file).pipe(res);
	console.log(`200 ${urlPath}`);
});

server.listen(port, () => {
	console.log(`Serving ${root} at http://localhost:${port}/`);
});
