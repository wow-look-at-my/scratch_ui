/* Scratch Proto — Tweaks wiring.
   Every tweak writes a CSS custom property or toggle class on <html>,
   so the entire style guide reflows live. */

// Accent is LOCKED to amber (the brand identity) so green + red stay reserved
// for success / error / destructive semantics. Amber's hex lives in
// scratch-proto.css :root — not duplicated here.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "scanlineAlpha": 0.03,
  "gridSize": 24,
  "padControlY": 8,
  "padControlX": 12,
  "padCard": 18,
  "gapStack": 8
}/*EDITMODE-END*/;

function applyTweaks(t) {
  const root = document.documentElement;
  root.style.setProperty('--grid-size', t.gridSize + 'px');
  root.style.setProperty('--scanline-alpha', t.scanlineAlpha);
  root.style.setProperty('--pad-control-y', t.padControlY + 'px');
  root.style.setProperty('--pad-control-x', t.padControlX + 'px');
  root.style.setProperty('--pad-card', t.padCard + 'px');
  root.style.setProperty('--gap-stack', t.gapStack + 'px');
}

function ScratchProtoTweaks() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  React.useEffect(() => { applyTweaks(t); }, [t]);

  return (
    <TweaksPanel>
      <TweakSection label="Substrate" />
      <TweakSlider
        label="Scanline alpha"
        value={t.scanlineAlpha}
        min={0} max={1} step={0.01}
        onChange={(v) => setTweak('scanlineAlpha', v)}
      />
      <TweakSlider
        label="Grid pitch"
        value={t.gridSize}
        min={16} max={40} step={2} unit="px"
        onChange={(v) => setTweak('gridSize', v)}
      />

      <TweakSection label="Density" />
      <TweakSlider
        label="Control pad Y"
        value={t.padControlY}
        min={2} max={20} step={1} unit="px"
        onChange={(v) => setTweak('padControlY', v)}
      />
      <TweakSlider
        label="Control pad X"
        value={t.padControlX}
        min={4} max={28} step={1} unit="px"
        onChange={(v) => setTweak('padControlX', v)}
      />
      <TweakSlider
        label="Card padding"
        value={t.padCard}
        min={6} max={36} step={1} unit="px"
        onChange={(v) => setTweak('padCard', v)}
      />
      <TweakSlider
        label="Stack gap"
        value={t.gapStack}
        min={0} max={24} step={1} unit="px"
        onChange={(v) => setTweak('gapStack', v)}
      />
    </TweaksPanel>
  );
}

// Apply defaults immediately so first paint is correct (the host rewrites
// TWEAK_DEFAULTS on disk, so this reflects the latest saved values).
applyTweaks(TWEAK_DEFAULTS);

ReactDOM.createRoot(document.getElementById('tweaks-root')).render(<ScratchProtoTweaks />);
