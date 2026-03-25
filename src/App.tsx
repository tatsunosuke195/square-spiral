
import React, { useEffect, useMemo, useRef, useState } from "react";

// ===== CONFIG =====
const COLS = 25;
const ROWS = 15;

const SPEED_OPTIONS = {
  slow: 115,
  normal: 95,
  fast: 78,
} as const;

const HIGHSCORE_KEY = "square-spiral-highscore-v2";

// ===== TYPES =====
type Cell = { x: number; y: number };
type Status = "idle" | "running" | "gameover";
type SpeedMode = keyof typeof SPEED_OPTIONS;

// ===== HELPERS =====
function getIsLandscape() {
  return (
    window.matchMedia("(orientation: landscape)").matches ||
    window.innerWidth > window.innerHeight
  );
}

function loadHighScores(): Record<SpeedMode, number> {
  try {
    const raw = localStorage.getItem(HIGHSCORE_KEY);
    if (!raw) return { slow: 0, normal: 0, fast: 0 };
    const parsed = JSON.parse(raw) as Partial<Record<SpeedMode, number>>;
    return {
      slow: parsed.slow ?? 0,
      normal: parsed.normal ?? 0,
      fast: parsed.fast ?? 0,
    };
  } catch {
    return { slow: 0, normal: 0, fast: 0 };
  }
}

function saveHighScores(value: Record<SpeedMode, number>) {
  try {
    localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(value));
  } catch {
    // ignore localStorage errors
  }
}

// ===== STYLES =====
const styles = {
  page: {
    minHeight: "100vh",
    background: "#0f172a",
    color: "#e2e8f0",
    padding: "12px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    boxSizing: "border-box",
  } as React.CSSProperties,

  container: {
    maxWidth: "980px",
    margin: "0 auto",
  } as React.CSSProperties,

  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "10px",
  } as React.CSSProperties,

  title: {
    margin: 0,
    fontSize: "28px",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  subtitle: {
    margin: "6px 0 0 0",
    fontSize: "13px",
    color: "#94a3b8",
  } as React.CSSProperties,

  iconBox: {
    width: "52px",
    height: "52px",
    borderRadius: "18px",
    background: "#111827",
    border: "1px solid #334155",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
  } as React.CSSProperties,

  hud: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "8px",
    marginBottom: "10px",
  } as React.CSSProperties,

  statCard: {
    background: "#111827",
    border: "1px solid #334155",
    borderRadius: "16px",
    padding: "10px 12px",
  } as React.CSSProperties,

  statLabel: {
    fontSize: "12px",
    color: "#94a3b8",
    marginBottom: "4px",
  } as React.CSSProperties,

  statValue: {
    fontSize: "22px",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  } as React.CSSProperties,

  actions: {
    display: "flex",
    gap: "8px",
    marginBottom: "10px",
    flexWrap: "wrap",
  } as React.CSSProperties,

  ghostButton: {
    border: "1px solid #475569",
    borderRadius: "14px",
    background: "#111827",
    color: "#e2e8f0",
    fontSize: "14px",
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
  } as React.CSSProperties,

  help: {
    fontSize: "12px",
    color: "#94a3b8",
    marginBottom: "8px",
    lineHeight: 1.5,
    textAlign: "center",
  } as React.CSSProperties,

  speedRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: "12px",
  } as React.CSSProperties,

  speedChip: {
    borderRadius: "999px",
    border: "1px solid #64748b",
    background: "#111827",
    color: "#cbd5e1",
    padding: "10px 16px",
    minWidth: "88px",
    fontSize: "14px",
    fontWeight: 800,
    letterSpacing: "0.01em",
    cursor: "pointer",
  } as React.CSSProperties,

  speedChipActive: {
    background: "#f8fafc",
    color: "#0f172a",
    border: "1px solid #f8fafc",
    boxShadow:
      "0 0 0 1px rgba(248,250,252,0.15), 0 6px 18px rgba(2,6,23,0.28)",
    transform: "translateY(-1px)",
  } as React.CSSProperties,

  portraitNotice: {
    fontSize: "12px",
    color: "#cbd5e1",
    textAlign: "center",
    marginBottom: "8px",
  } as React.CSSProperties,

  boardWrap: {
    position: "relative",
    width: "100%",
    maxWidth: "100%",
    margin: "0 auto",
    background: "#020617",
    border: "3px solid #e2e8f0",
    borderRadius: "0px",
    overflow: "hidden",
    touchAction: "none",
    userSelect: "none",
    WebkitUserSelect: "none",
  } as React.CSSProperties,

  boardAspect: {
    aspectRatio: `${COLS} / ${ROWS}`,
    width: "100%",
    maxWidth: "100%",
    margin: "0 auto",
  } as React.CSSProperties,

  boardGrid: {
    display: "grid",
    gridTemplateColumns: `repeat(${COLS}, 1fr)`,
    gridTemplateRows: `repeat(${ROWS}, 1fr)`,
    width: "100%",
    height: "100%",
    background: "#64748b",
    gap: "1px",
  } as React.CSSProperties,

  cell: {
    background: "#020617",
    boxSizing: "border-box",
  } as React.CSSProperties,

  occupied: {
    background: "#cbd5e1",
    boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.28)",
  } as React.CSSProperties,

  head: {
    background: "#f8fafc",
    boxShadow: "inset 0 0 0 1px rgba(15,23,42,0.4)",
  } as React.CSSProperties,

  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(2, 6, 23, 0.55)",
    padding: "12px",
  } as React.CSSProperties,

  overlayCard: {
    background: "rgba(15, 23, 42, 0.92)",
    border: "1px solid #475569",
    borderRadius: "18px",
    padding: "16px",
    textAlign: "center",
    maxWidth: "320px",
  } as React.CSSProperties,

  overlayTitle: {
    margin: 0,
    fontSize: "26px",
    fontWeight: 900,
    letterSpacing: "-0.03em",
  } as React.CSSProperties,

  overlayText: {
    marginTop: "8px",
    fontSize: "14px",
    color: "#cbd5e1",
    lineHeight: 1.5,
  } as React.CSSProperties,

  overlayButton: {
    marginTop: "14px",
    border: "none",
    borderRadius: "14px",
    background: "#e2e8f0",
    color: "#0f172a",
    fontSize: "15px",
    fontWeight: 800,
    padding: "10px 16px",
    cursor: "pointer",
  } as React.CSSProperties,
};

// ===== COMPONENT =====
export default function App() {
  // ===== STATE =====
  const [status, setStatus] = useState<Status>("idle");
  const [path, setPath] = useState<Cell[]>([{ x: 0, y: 0 }]);
  const [directionIndex, setDirectionIndex] = useState(0); // 0:right 1:down 2:left 3:up
  const [score, setScore] = useState(1);
  const [speedMode, setSpeedMode] = useState<SpeedMode>("normal");
  const [highScores, setHighScores] = useState<Record<SpeedMode, number>>({
    slow: 0,
    normal: 0,
    fast: 0,
  });
  const [isLandscape, setIsLandscape] = useState<boolean>(() =>
    getIsLandscape()
  );

  // ===== REFS =====
  const lastStepRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // ===== INITIAL LOAD =====
  useEffect(() => {
    setHighScores(loadHighScores());
  }, []);

  // ===== ORIENTATION / RESIZE =====
  useEffect(() => {
    const media = window.matchMedia("(orientation: landscape)");
    const updateOrientation = () => setIsLandscape(getIsLandscape());

    updateOrientation();
    window.addEventListener("resize", updateOrientation);

    if (media.addEventListener) {
      media.addEventListener("change", updateOrientation);
    }

    return () => {
      window.removeEventListener("resize", updateOrientation);
      if (media.removeEventListener) {
        media.removeEventListener("change", updateOrientation);
      }
    };
  }, []);

  // ===== DERIVED DATA =====
  const occupiedSet = useMemo(() => {
    return new Set(path.map((cell) => `${cell.x},${cell.y}`));
  }, [path]);

  const headKey = `${path[path.length - 1].x},${path[path.length - 1].y}`;

  // ===== ACTIONS =====
  function resetGame(nextStatus: Status = "idle") {
    setStatus(nextStatus);
    setPath([{ x: 0, y: 0 }]);
    setDirectionIndex(0);
    setScore(1);
    lastStepRef.current = null;
  }

  function startGame() {
    resetGame("running");
  }

  function endGame(finalScore: number) {
    setStatus("gameover");
    const currentHigh = highScores[speedMode] ?? 0;

    if (finalScore > currentHigh) {
      const next = {
        ...highScores,
        [speedMode]: finalScore,
      };
      setHighScores(next);
      saveHighScores(next);
    }
  }

  function rotateDirection() {
    if (status !== "running") return;
    setDirectionIndex((prev) => (prev + 1) % 4);
  }

  // ===== GAME LOOP =====
  useEffect(() => {
    if (status !== "running") {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }

    const loop = (time: number) => {
      if (lastStepRef.current === null) {
        lastStepRef.current = time;
      }

      if (time - lastStepRef.current >= SPEED_OPTIONS[speedMode]) {
        lastStepRef.current = time;

        setPath((prevPath) => {
          const head = prevPath[prevPath.length - 1];
          const dirs = [
            { x: 1, y: 0 },
            { x: 0, y: 1 },
            { x: -1, y: 0 },
            { x: 0, y: -1 },
          ];

          const dir = dirs[directionIndex];
          const next = { x: head.x + dir.x, y: head.y + dir.y };

          const outOfBounds =
            next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS;

          const hitsPath = prevPath.some(
            (cell) => cell.x === next.x && cell.y === next.y
          );

          if (outOfBounds || hitsPath) {
            const finalScore = prevPath.length;
            setScore(finalScore);
            endGame(finalScore);
            return prevPath;
          }

          const nextPath = [...prevPath, next];
          setScore(nextPath.length);
          return nextPath;
        });
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [status, directionIndex, speedMode, highScores]);

  // ===== BOARD CELLS =====
  const cells: React.ReactNode[] = [];
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const key = `${x},${y}`;
      const isOccupied = occupiedSet.has(key);
      const isHead = key === headKey;

      cells.push(
        <div
          key={key}
          style={{
            ...styles.cell,
            ...(isOccupied ? styles.occupied : {}),
            ...(isHead ? styles.head : {}),
          }}
        />
      );
    }
  }

  // ===== RENDER =====
  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* ===== HEADER ===== */}
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>四角い渦</h1>
            <p style={styles.subtitle}>タップで90度、時計回りに曲がる。</p>
          </div>
          <div style={styles.iconBox}>🌀</div>
        </div>

        {/* ===== HUD ===== */}
        <div style={styles.hud}>
          <div style={styles.statCard}>
            <div style={styles.statLabel}>現在スコア</div>
            <div style={styles.statValue}>{score}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>
              {speedMode === "slow"
                ? "Slow ハイスコア"
                : speedMode === "normal"
                  ? "Normal ハイスコア"
                  : "Fast ハイスコア"}
            </div>
            <div style={styles.statValue}>{highScores[speedMode]}</div>
          </div>

          <div style={styles.statCard}>
            <div style={styles.statLabel}>フィールド</div>
            <div style={styles.statValue}>
              {COLS}×{ROWS}
            </div>
          </div>
        </div>

        {/* ===== ACTIONS ===== */}
        {status === "running" && (
          <div style={styles.actions}>
            <button onClick={() => resetGame()} style={styles.ghostButton}>
              リセット
            </button>
          </div>
        )}

        {/* ===== HELP ===== */}
        {!isLandscape && (
          <div style={styles.help}>
            画面タップ1回で、進行方向が <strong>右 → 下 → 左 → 上</strong> の順に変わります。押しっぱなしでは連続反応しない作りです。
          </div>
        )}

        {/* ===== SPEED SELECTOR ===== */}
        <div style={styles.speedRow}>
          {(["slow", "normal", "fast"] as SpeedMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setSpeedMode(mode)}
              style={{
                ...styles.speedChip,
                ...(speedMode === mode ? styles.speedChipActive : {}),
              }}
            >
              {mode === "slow"
                ? "Slow"
                : mode === "normal"
                  ? "Normal"
                  : "Fast"}
            </button>
          ))}
        </div>

        {/* ===== PORTRAIT NOTICE ===== */}
        {!isLandscape && (
          <div style={styles.portraitNotice}>
            横向きにすると、フィールド全体が見やすくなります。
          </div>
        )}

        {/* ===== BOARD ===== */}
        <div
          style={{
            ...styles.boardWrap,
            width: isLandscape
              ? "min(100%, calc((100dvh - 190px) * 25 / 15))"
              : "100%",
          }}
          onPointerDown={rotateDirection}
        >
          <div style={styles.boardAspect}>
            <div style={styles.boardGrid}>{cells}</div>
          </div>

          {/* ===== IDLE OVERLAY ===== */}
          {status === "idle" && (
            <div style={styles.overlay}>
              <div style={styles.overlayCard}>
                <p style={styles.overlayTitle}>スタート前</p>
                <div style={styles.overlayText}>
                  左上から右へ進みます。外壁か自分の足跡にぶつかったら終了です。
                </div>
                <button onClick={() => startGame()} style={styles.overlayButton}>
                  スタート
                </button>
              </div>
            </div>
          )}

          {/* ===== GAMEOVER OVERLAY ===== */}
          {status === "gameover" && (
            <div style={styles.overlay}>
              <div style={styles.overlayCard}>
                <p style={styles.overlayTitle}>Game Over</p>
                <div style={styles.overlayText}>
                  並んだ四角の数は <strong>{score}</strong> 個でした。
                </div>
                <button onClick={() => startGame()} style={styles.overlayButton}>
                  もう一度
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}