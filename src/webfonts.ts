// The faces the tokens name, loaded onto the consuming document.
//
// scratch-tokens.css names Quantico, JetBrains Mono and Space Grotesk and
// declares no @font-face, so every consumer used to fall back to a system font
// until it wired the fonts up itself. This module does it once, for all of
// them. see docs/webfonts.md

const HREF =
	'https://fonts.googleapis.com/css2?family=Quantico:ital,wght@0,400;0,700;1,400;1,700&family=JetBrains+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Space+Grotesk:wght@400;500;600;700&display=swap';

// The families the tokens name, for the already-supplied check below.
const FAMILIES = ['Quantico', 'JetBrains Mono', 'Space Grotesk'];

// supplied reports whether this document already declares the faces, so a
// consumer that ships its own copy is never given a second, external one.
function supplied(): boolean {
	for (const sheet of Array.from(document.styleSheets)) {
		if (sheet.href?.includes('fonts.googleapis.com')) return true;
		// A cross-origin sheet refuses .cssRules; only our own copies matter here.
		let rules: CSSRuleList;
		try {
			rules = sheet.cssRules;
		} catch {
			continue;
		}
		for (const rule of Array.from(rules)) {
			if (!(rule instanceof CSSFontFaceRule)) continue;
			const named = rule.style.getPropertyValue('font-family').replace(/["']/g, '');
			if (FAMILIES.includes(named.trim())) return true;
		}
	}
	return false;
}

// loadWebFonts links the stylesheet, unless this document already has the faces.
//
// It is a LINK on the document, never an @import in scratch-ui.css: that file is
// a CSS module script, and a constructed stylesheet drops @import outright. A
// @font-face there would be dead too, since a face adopted into a shadow root
// registers with nothing. see docs/webfonts.md
export function loadWebFonts(): void {
	if (typeof document === 'undefined' || supplied()) return;

	const link = document.createElement('link');
	link.rel = 'stylesheet';
	link.href = HREF;
	// Anonymous: the request carries no cookie and no page URL.
	link.crossOrigin = 'anonymous';
	link.referrerPolicy = 'no-referrer';
	// A blocked link is silent, so say which policy has to allow what.
	link.addEventListener('error', () => {
		console.error(
			'scratch-ui: the webfonts its tokens name could not load. ' +
				"Allow https://fonts.googleapis.com in style-src and https://fonts.gstatic.com in font-src, or ship the faces yourself and they'll be left alone.",
		);
	});
	document.head.append(link);
}
