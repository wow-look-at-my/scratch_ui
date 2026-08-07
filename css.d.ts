// A component's `.css` file is imported as a string (ts0's `.css: text`
// loader) and handed to CSSStyleSheet.replaceSync — the stylesheet text is
// inlined into the built module, so a component stays one classic script.
declare module '*.css' {
	const source: string;
	export default source;
}
