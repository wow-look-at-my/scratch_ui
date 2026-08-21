// Minimal ambient Node types for scripts/*.ts, standing in for @types/node
// until wow-look-at-my/ts0#41 (ts0 ships its own copy via typeRoots) lands
// on ts0's master branch and is live through the wow-look-at-my/ts0 action.
// Covers only the exact surface these two build scripts use. Delete this
// file once ts0#41 is live -- it type-checks scripts/ the same way either way.

declare const console: {
	log(...args: unknown[]): void;
	error(...args: unknown[]): void;
};

declare const process: {
	exit(code?: number): never;
};

declare module "node:fs" {
	interface Stats {
		isFile(): boolean;
		isDirectory(): boolean;
		size: number;
	}
	interface Dirent {
		name: string;
		isDirectory(): boolean;
		isFile(): boolean;
	}
	interface ReaddirOptions {
		withFileTypes?: boolean;
		recursive?: boolean;
	}
	function readFileSync(path: string, encoding: string): string;
	function writeFileSync(path: string, data: string): void;
	function existsSync(path: string): boolean;
	function mkdirSync(path: string, options?: { recursive?: boolean }): void;
	function statSync(path: string): Stats;
	function cpSync(src: string, dest: string, options?: { recursive?: boolean }): void;
	function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
	function readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
	function readdirSync(path: string, options?: { recursive?: boolean }): string[];
	const fs: {
		readFileSync: typeof readFileSync;
		writeFileSync: typeof writeFileSync;
		existsSync: typeof existsSync;
		mkdirSync: typeof mkdirSync;
		statSync: typeof statSync;
		cpSync: typeof cpSync;
		rmSync: typeof rmSync;
		readdirSync: typeof readdirSync;
	};
	export default fs;
}

declare module "node:path" {
	function join(...parts: string[]): string;
	function basename(path: string, ext?: string): string;
	function dirname(path: string): string;
	function resolve(...parts: string[]): string;
	const posix: { join(...parts: string[]): string };
	const sep: string;
	const path: {
		join: typeof join;
		basename: typeof basename;
		dirname: typeof dirname;
		resolve: typeof resolve;
		posix: typeof posix;
		sep: typeof sep;
	};
	export default path;
}
