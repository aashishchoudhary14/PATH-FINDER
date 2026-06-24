import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const START_NODE_ROW = 12; 
const START_NODE_COL = 10;
const FINISH_NODE_ROW = 12;
const FINISH_NODE_COL = 40;
const GRID_ROWS = 25; 
const GRID_COLS = 50; 

// ─── Node visual classes ───────────────────────────────────────────────────
const BASE_NODE_CLASS =
  "w-[25px] h-[25px] border-[0.5px] border-[#1e2d3d] bg-[#0a1628] inline-block transition-colors duration-100";

const WALL_CLASS =
  "w-[25px] h-[25px] border-[0.5px] border-[#4a5568] bg-[#e2e8f0] inline-block animate-wall";

const START_CLASS =
  "w-[25px] h-[25px] border-[0.5px] inline-block bg-[#00ff88] border-[#00ff88] shadow-[0_0_12px_#00ff8880] z-20";

const FINISH_CLASS =
  "w-[25px] h-[25px] border-[0.5px] inline-block bg-[#ff4466] border-[#ff4466] shadow-[0_0_12px_#ff446680] z-20";

const VISITED_CLASS =
  "w-[25px] h-[25px] border-none inline-block bg-[#0ea5e9] animate-visited";

const PATH_CLASS =
  "w-[25px] h-[25px] border-none inline-block bg-[#00ff88] animate-path z-30 shadow-[0_0_6px_#00ff8860]";

declare global {
  interface Window {
    createPathfindingModule: any;
  }
}

export interface NodeType {
  col: number;
  row: number;
  isStart: boolean;
  isFinish: boolean;
  isVisited: boolean;
  isWall: boolean;
  id: number;
}

const ALGO_META: Record<string, { label: string; tag: string; color: string }> = {
  dijkstra:      { label: "Dijkstra's",        tag: "Weighted · Optimal",      color: "#818cf8" },
  astar:         { label: "A* Search",         tag: "Weighted · Optimal",      color: "#34d399" },
  greedy:        { label: "Greedy Best-First", tag: "Weighted · Heuristic",    color: "#fbbf24" },
  bidirectional: { label: "Bidirectional BFS", tag: "Unweighted · Optimal",    color: "#f472b6" },
  bfs:           { label: "BFS",               tag: "Unweighted · Optimal",    color: "#60a5fa" },
  dfs:           { label: "DFS",               tag: "Unweighted · Suboptimal", color: "#fb923c" },
};

export const PathfindingVisualizer = () => {
  const [grid, setGrid] = useState<NodeType[][]>([]);
  const [mouseIsPressed, setMouseIsPressed] = useState(false);
  const [selectedAlgo, setSelectedAlgo] = useState<
    'dijkstra' | 'bfs' | 'dfs' | 'astar' | 'greedy' | 'bidirectional'
  >('dijkstra');
  const [isRunning, setIsRunning] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const wasmModule = useRef<any>(null);
  const dropdownBtnRef = useRef<HTMLButtonElement>(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    setGrid(getInitialGrid());

    const script = document.createElement('script');
    script.src = "/pathfinding.js";
    script.async = true;
    script.onload = () => {
      if (window.createPathfindingModule) {
        window.createPathfindingModule().then((module: any) => {
          wasmModule.current = module;
          console.log("C++ Module Loaded");
        });
      }
    };
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const handleMouseDown = (row: number, col: number) => {
    if (isRunning) return;
    const newGrid = getNewGridWithWallToggled(grid, row, col);
    setGrid(newGrid);
    setMouseIsPressed(true);
  };

  const handleMouseEnter = (row: number, col: number) => {
    if (!mouseIsPressed || isRunning) return;
    const newGrid = getNewGridWithWallToggled(grid, row, col);
    setGrid(newGrid);
  };

  const handleMouseUp = () => setMouseIsPressed(false);

  const visualizeAlgorithm = () => {
    if (isRunning || !wasmModule.current) return;
    setIsRunning(true);
    setLatency(null); // Reset latency before run
    resetVisuals();

    const flatGrid = new wasmModule.current.VectorInt();
    for (let r = 0; r < GRID_ROWS; r++)
      for (let c = 0; c < GRID_COLS; c++)
        flatGrid.push_back(grid[r][c].isWall ? 1 : 0);

    const startIdx = START_NODE_ROW * GRID_COLS + START_NODE_COL;
    const finishIdx = FINISH_NODE_ROW * GRID_COLS + FINISH_NODE_COL;

    // --- BENCHMARK STRESS TEST ---
    const NUM_RUNS = 50;
    const t0 = performance.now();
    for (let i = 0; i < NUM_RUNS; i++) {
      wasmModule.current.solveGraph(
        flatGrid, GRID_ROWS, GRID_COLS, startIdx, finishIdx, selectedAlgo
      );
    }
    const t1 = performance.now();
    
    // Average time per run
    setLatency((t1 - t0) / NUM_RUNS);
    // -----------------------------

    // Actual run to get the path data for the visualizer
    const result = wasmModule.current.solveGraph(
      flatGrid, GRID_ROWS, GRID_COLS, startIdx, finishIdx, selectedAlgo
    );

    const visitedOrderIndices: number[] = [];
    const shortestPathIndices: number[] = [];

    const visitedSize = result.visitedOrder.size();
    for (let i = 0; i < visitedSize; i++) visitedOrderIndices.push(result.visitedOrder.get(i));

    const pathSize = result.shortestPath.size();
    for (let i = 0; i < pathSize; i++) shortestPathIndices.push(result.shortestPath.get(i));

    flatGrid.delete();
    animateAlgorithm(visitedOrderIndices, shortestPathIndices);
  };

  const animateAlgorithm = (visitedIndices: number[], pathIndices: number[]) => {
    const totalTime = visitedIndices.length * 10 + pathIndices.length * 40;

    for (let i = 0; i < visitedIndices.length; i++) {
      setTimeout(() => {
        const idx = visitedIndices[i];
        const r = Math.floor(idx / GRID_COLS);
        const c = idx % GRID_COLS;
        const nodeEl = document.getElementById(`node-${r}-${c}`);
        const isStart = r === START_NODE_ROW && c === START_NODE_COL;
        const isFinish = r === FINISH_NODE_ROW && c === FINISH_NODE_COL;
        if (nodeEl && !isStart && !isFinish && !grid[r][c].isWall)
          nodeEl.className = VISITED_CLASS;
      }, 10 * i);
    }

    setTimeout(() => {
      for (let i = 0; i < pathIndices.length; i++) {
        setTimeout(() => {
          const idx = pathIndices[i];
          const r = Math.floor(idx / GRID_COLS);
          const c = idx % GRID_COLS;
          const nodeEl = document.getElementById(`node-${r}-${c}`);
          const isStart = r === START_NODE_ROW && c === START_NODE_COL;
          const isFinish = r === FINISH_NODE_ROW && c === FINISH_NODE_COL;
          if (nodeEl && !isStart && !isFinish) nodeEl.className = PATH_CLASS;
        }, 40 * i);
      }
    }, 10 * visitedIndices.length);

    setTimeout(() => setIsRunning(false), totalTime);
  };

  const generateRandomMaze = () => {
    if (isRunning) return;
    setLatency(null); // Reset latency
    const newGrid = getInitialGrid();
    for (let r = 0; r < GRID_ROWS; r++)
      for (let c = 0; c < GRID_COLS; c++) {
        const node = newGrid[r][c];
        if (!node.isStart && !node.isFinish) node.isWall = Math.random() < 0.25;
      }
    setGrid(newGrid);
    setTimeout(() => {
      for (let r = 0; r < GRID_ROWS; r++)
        for (let c = 0; c < GRID_COLS; c++) {
          const nodeEl = document.getElementById(`node-${r}-${c}`);
          if (!nodeEl) continue;
          if (newGrid[r][c].isWall) nodeEl.className = WALL_CLASS;
          else if (!newGrid[r][c].isStart && !newGrid[r][c].isFinish) nodeEl.className = BASE_NODE_CLASS;
        }
    }, 0);
  };

  const clearBoard = () => {
    if (isRunning) return;
    setLatency(null); // Reset latency
    setGrid(getInitialGrid());
    for (let row = 0; row < GRID_ROWS; row++)
      for (let col = 0; col < GRID_COLS; col++) {
        const nodeEl = document.getElementById(`node-${row}-${col}`);
        if (!nodeEl) continue;
        const isStart = row === START_NODE_ROW && col === START_NODE_COL;
        const isFinish = row === FINISH_NODE_ROW && col === FINISH_NODE_COL;
        nodeEl.className = isStart ? START_CLASS : isFinish ? FINISH_CLASS : BASE_NODE_CLASS;
      }
  };

  const resetVisuals = () => {
    for (let row = 0; row < GRID_ROWS; row++)
      for (let col = 0; col < GRID_COLS; col++) {
        const nodeEl = document.getElementById(`node-${row}-${col}`);
        if (!nodeEl) continue;
        const isStart = row === START_NODE_ROW && col === START_NODE_COL;
        const isFinish = row === FINISH_NODE_ROW && col === FINISH_NODE_COL;
        const isWall = grid[row][col].isWall;
        nodeEl.className = isStart ? START_CLASS : isFinish ? FINISH_CLASS : isWall ? WALL_CLASS : BASE_NODE_CLASS;
      }
  };

  const currentAlgo = ALGO_META[selectedAlgo];

  return (
    <div className="flex flex-col items-center w-full max-w-[1340px] px-4 gap-6">

      {/* ── Toolbar ─────────────────────────────────────────────── */}
      <div className="w-full flex flex-wrap items-center gap-3 px-5 py-4 rounded-xl border border-[#1e2d3d] bg-[#0d1f35]/80 backdrop-blur-sm">

        {/* Algorithm Picker */}
        <div className="relative">
        <button
            ref={dropdownBtnRef}
            onClick={() => {
              if (dropdownBtnRef.current) {
                const rect = dropdownBtnRef.current.getBoundingClientRect();
                setDropdownPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
              }
              setDropdownOpen(o => !o);
            }}
            disabled={isRunning}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-[#1e2d3d] bg-[#0a1628] hover:border-[#2d4a6a] transition-all disabled:opacity-40 min-w-[220px]"
          >
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: currentAlgo.color, boxShadow: `0 0 6px ${currentAlgo.color}` }}
            />
            <span className="font-mono text-sm text-slate-100 flex-1 text-left">{currentAlgo.label}</span>
            <span className="text-[10px] font-mono text-slate-500 ml-auto">{dropdownOpen ? '▲' : '▼'}</span>
          </button>

          {dropdownOpen && !isRunning && createPortal(
            <div
              style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
              className="rounded-lg border border-[#1e2d3d] bg-[#0a1628] overflow-hidden shadow-2xl shadow-black/80"
            >
              {Object.entries(ALGO_META).map(([key, meta]) => (
                <button
                  key={key}
                  onClick={() => { setSelectedAlgo(key as any); setDropdownOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#1e2d3d] transition-colors text-left ${selectedAlgo === key ? 'bg-[#1a2a3a]' : ''}`}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: meta.color, boxShadow: `0 0 5px ${meta.color}` }}
                  />
                  <span className="font-mono text-sm text-slate-200">{meta.label}</span>
                  <span className="font-mono text-[10px] text-slate-500 ml-auto">{meta.tag}</span>
                </button>
              ))}
            </div>,
            document.body
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-8 bg-[#1e2d3d] hidden sm:block" />

        {/* Run */}
        <button
          onClick={visualizeAlgorithm}
          disabled={isRunning}
          className="relative flex items-center gap-2 px-6 py-2.5 rounded-lg font-mono text-sm font-bold text-[#0a1628] bg-[#00ff88] hover:bg-[#22ffaa] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_#00ff8840]"
        >
          {isRunning ? (
            <>
              <span className="inline-block w-3 h-3 rounded-full border-2 border-[#0a1628] border-t-transparent animate-spin" />
              RUNNING...
            </>
          ) : (
            <>
              <span>▶</span>
              RUN
            </>
          )}
        </button>

        {/* Maze */}
        <button
          onClick={generateRandomMaze}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm text-slate-300 border border-[#1e2d3d] bg-[#0a1628] hover:border-[#2d4a6a] hover:text-slate-100 transition-all disabled:opacity-40"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <path d="M9 3v18"></path>
            <path d="M15 3v18"></path>
            <path d="M3 9h18"></path>
            <path d="M3 15h18"></path>
          </svg>
          MAZE
        </button>

        {/* Clear */}
        <button
          onClick={clearBoard}
          disabled={isRunning}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-mono text-sm text-[#ff4466] border border-[#ff4466]/20 bg-[#ff4466]/5 hover:bg-[#ff4466]/10 hover:border-[#ff4466]/40 transition-all disabled:opacity-40"
        >
          <span>✕</span>
          CLEAR
        </button>

        {/* Latency Benchmark Display */}
        {latency !== null && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-mono text-sm text-[#00ff88] border border-[#00ff88]/30 bg-[#00ff88]/10 ml-2">
            ⏱ {latency.toFixed(3)} ms
          </div>
        )}

        {/* Legend — pushed right */}
        <div className="ml-auto hidden lg:flex items-center gap-5 font-mono text-[11px] text-slate-500">
          <LegendItem color="#00ff88" label="Start" glow />
          <LegendItem color="#ff4466" label="End" glow />
          <LegendItem color="#e2e8f0" label="Wall" />
          <LegendItem color="#0ea5e9" label="Visited" />
          <LegendItem color="#00ff88" label="Path" glow />
        </div>
      </div>

      {/* ── Grid ─────────────────────────────────────────────────── */}
      <div
        className="relative flex flex-col items-center bg-[#07111e] rounded-xl border border-[#1e2d3d] shadow-[0_0_60px_rgba(0,0,0,0.8)] overflow-auto max-w-full p-3"
        onMouseLeave={handleMouseUp}
        onClick={() => setDropdownOpen(false)}
      >
        {/* scanline overlay for atmosphere */}
        <div
          className="pointer-events-none absolute inset-0 rounded-xl opacity-[0.03] z-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 24px, #ffffff 24px, #ffffff 25px)',
          }}
        />

        {grid.map((row, rowIdx) => (
          <div key={rowIdx} className="flex h-[25px]">
            {row.map((node, nodeIdx) => {
              const { isFinish, isStart, isWall, row: r, col: c } = node;
              let cls = BASE_NODE_CLASS;
              if (isStart) cls = START_CLASS;
              else if (isFinish) cls = FINISH_CLASS;
              else if (isWall) cls = WALL_CLASS;

              return (
                <div
                  id={`node-${r}-${c}`}
                  key={nodeIdx}
                  className={cls}
                  onMouseDown={() => handleMouseDown(r, c)}
                  onMouseEnter={() => handleMouseEnter(r, c)}
                  onMouseUp={handleMouseUp}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* ── Footer hint ──────────────────────────────────────────── */}
      <p className="font-mono text-[11px] text-slate-600 tracking-wider">
        CLICK &amp; DRAG ON GRID TO DRAW WALLS
      </p>
    </div>
  );
};

// ─── Legend item ──────────────────────────────────────────────────────────────
const LegendItem = ({ color, label, glow }: { color: string; label: string; glow?: boolean }) => (
  <div className="flex items-center gap-1.5">
    <span
      className="w-3 h-3 rounded-sm flex-shrink-0"
      style={{
        backgroundColor: color,
        boxShadow: glow ? `0 0 5px ${color}` : 'none',
      }}
    />
    <span>{label}</span>
  </div>
);

// ─── Grid helpers (unchanged logic) ───────────────────────────────────────────
const getInitialGrid = (): NodeType[][] => {
  const g = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    const r = [];
    for (let col = 0; col < GRID_COLS; col++) r.push(createNode(col, row));
    g.push(r);
  }
  return g;
};

const createNode = (col: number, row: number): NodeType => ({
  col, row,
  isStart: row === START_NODE_ROW && col === START_NODE_COL,
  isFinish: row === FINISH_NODE_ROW && col === FINISH_NODE_COL,
  isVisited: false,
  isWall: false,
  id: row * GRID_COLS + col,
});

const getNewGridWithWallToggled = (grid: NodeType[][], row: number, col: number) => {
  const newGrid = grid.slice().map(r => r.slice());
  const node = newGrid[row][col];
  if (!node.isStart && !node.isFinish) node.isWall = !node.isWall;
  return newGrid;
};