import { PathfindingVisualizer } from './PathfindingVisualizer/PathfindingVisualizer';

function App() {
  return (
    <div className="min-h-screen bg-[#060e1a] flex flex-col items-center text-slate-100" style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace" }}>

      {/* ── Google Font import via style tag ── */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;800&display=swap');`}</style>

      {/* ── Subtle grid background ── */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(14,165,233,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(14,165,233,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Header ── */}
      <header className="relative z-10 w-full max-w-[1340px] px-4 pt-10 pb-8 flex items-end justify-between">
        <div>
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#00ff88] shadow-[0_0_8px_#00ff88]" />
            <span className="text-[11px] font-mono tracking-[0.25em] text-[#00ff88] uppercase">
              C++ WASM Engine · v2.0
            </span>
          </div>

          {/* Title */}
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-none text-slate-50">
            PATH
            <span
              className="text-transparent"
              style={{
                WebkitTextStroke: '1px rgba(14,165,233,0.6)',
              }}
            >
              FINDER
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mt-2 text-sm font-mono text-slate-500">
            Visual exploration of graph traversal algorithms
          </p>
        </div>

        {/* Status badge */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#1e2d3d] bg-[#0a1628] text-[11px] font-mono text-slate-400 mb-1">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          WASM ready
        </div>
      </header>

      {/* ── Main ── */}
      <main className="relative z-10 w-full flex flex-col items-center pb-16">
        <PathfindingVisualizer />
      </main>
    </div>
  );
}

export default App;