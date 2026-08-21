// A CSS module script evaluates to a CSSStyleSheet, which a shadow root
// adopts directly. The import is never bundled (ts0's `external: ["*.css"]`),
// so the browser resolves and constructs the stylesheet at runtime and no
// stylesheet text is embedded in the JS -- this ambient declaration is what
// makes the import type-check.
declare module '*.css' {
	const sheet: CSSStyleSheet;
	export default sheet;
}
