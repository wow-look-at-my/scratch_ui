// The library's single stylesheet, as one CSSStyleSheet shared by every
// component.
//
// This is a CSS module script: the browser fetches and constructs the
// stylesheet itself, and ts0's `external: ["*.css"]` keeps the import an
// external reference in the bundle, so no stylesheet text is embedded in the
// JS. Module evaluation happens once, so every shadow root that adopts
// SHEET adopts the SAME object -- the browser parses and stores it once,
// however many components use it.
//
// Components adopt it directly:
//
//   import { SHEET } from '../../styles.ts';
//   root.adoptedStyleSheets = [SHEET];
//
// Rules inside are host-scoped (`:host(scratch-toggle) [part="box"]`), because
// one sheet now serves every component -- an unscoped `.box` would match in
// every shadow root that adopts it.

import sheet from './scratch-ui.css' with { type: 'css' };

export const SHEET: CSSStyleSheet = sheet;
