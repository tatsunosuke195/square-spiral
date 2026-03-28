// 四角い渦 鬼版 App.tsx v7
// 2026-03-29
// 変更点:
// - 横向き専用レイアウトをさらに圧縮して、盤面を少し拡大
// - 横向きの左情報パネルを細く調整
// - 横向きのハイスコア表示を2行化して横幅を節約
// - 横向きの速度ボタンを少しコンパクト化
// - 縦向きでは v5 のレイアウトを維持

import React, { useEffect, useMemo, useRef, useState } from "react";

// ===== CONFIG =====
const COLS = 25;
const ROWS = 15;
const FAST_UNLOCK_SCORE = 250;
const ONI_CLEAR_SCORE = 300;
const FLASH_MS = 120;
const BOARD_RATIO = COLS / ROWS;

const SPEED_OPTIONS = {
  slow: 115,
  normal: 82,
  fast: 60,
  oni: 30,
} as const;

const SPEED_LABELS = {
  slow: "Slow",
  normal: "Normal",
  fast: "Fast",
  oni: "鬼",
} as const;

const HIGHSCORE_KEY = "square-spiral-highscore-v3";

// ===== TYPES =====
type Cell = { x: number; y: number };
type Status = "idle" | "running" | "gameover";
type SpeedMode = keyof typeof SPEED_OPTIONS;
type HighScoreMap = Record<SpeedMode, number>;
type ViewportSize = { width: number; height: number };

// ===== HELPERS =====
const DEFAULT_HIGHSCORES: HighScoreMap = {
  slow: 0,
  normal: 0,
  fast: 0,
  oni: 0,
};

function getViewportSize(): ViewportSize {
  if (typeof window === "undefined") {
    return { width: 390, height: 844 };
  }

  return {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function loadHighScores(): HighScoreMap {
  try {
    const raw = localStorage.getItem(HIGHSCORE_KEY);
    if (!raw) return DEFAULT_HIGHSCORES;
    const parsed = JSON.parse(raw) as Partial<Record<SpeedMode, number>>;
    return {
      slow: parsed.slow ?? 0,
      normal: parsed.normal ?? 0,
      fast: parsed.fast ?? 0,
      oni: parsed.oni ?? 0,
    };
  } catch {
    return DEFAULT_HIGHSCORES;
  }
}

function saveHighScores(value: HighScoreMap) {
  try {
    localStorage.setItem(HIGHSCORE_KEY, JSON.stringify(value));
  } catch {
    // ignore localStorage errors
  }
}

function vibrateIfSupported(duration: number) {
  if (typeof navigator === "undefined") return;
  if (typeof navigator.vibrate !== "function") return;

  try {
    navigator.vibrate(duration);
  } catch {
    // ignore vibration errors
  }
}

// ===== STYLES =====
const styles = {
  page: {
    padding: "12px",
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    boxSizing: "border-box",
  } as React.CSSProperties,

  container: {
    maxWidth: "480px",
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
  } as React.CSSProperties,

  iconBox: {
    width: "52px",
    height: "52px",
    borderRadius: "18px",
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
    borderRadius: "16px",
    padding: "10px 12px",
  } as React.CSSProperties,

  statLabel: {
    fontSize: "12px",
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
    borderRadius: "14px",
    fontSize: "14px",
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
  } as React.CSSProperties,

  help: {
    fontSize: "12px",
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
    padding: "10px 16px",
    minWidth: "88px",
    fontSize: "14px",
    fontWeight: 800,
    letterSpacing: "0.01em",
    cursor: "pointer",
  } as React.CSSProperties,

  speedChipDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  } as React.CSSProperties,

  boardWrap: {
    position: "relative",
    width: "100%",
    maxWidth: "100%",
    margin: "0 auto",
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
    gap: "1px",
  } as React.CSSProperties,

  cell: {
    boxSizing: "border-box",
  } as React.CSSProperties,

  overlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "12px",
  } as React.CSSProperties,

  overlayCard: {
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
    lineHeight: 1.5,
  } as React.CSSProperties,

  overlayButton: {
    marginTop: "14px",
    border: "none",
    borderRadius: "14px",
    fontSize: "15px",
    fontWeight: 800,
    padding: "10px 16px",
    cursor: "pointer",
  } as React.CSSProperties,

  overlayTitleHeavy: {
    textShadow: "0 2px 10px rgba(0,0,0,0.45)",
    letterSpacing: "-0.04em",
  } as React.CSSProperties,

  overlayCardHeavy: {
    boxShadow:
      "0 18px 50px rgba(0,0,0,0.58), inset 0 0 0 1px rgba(248,113,113,0.08)",
  } as React.CSSProperties,

  newBest: {
    marginTop: "8px",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.08em",
  } as React.CSSProperties,

  landscapeShell: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  } as React.CSSProperties,

  landscapeGrid: {
    display: "grid",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  } as React.CSSProperties,

  landscapeSide: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    alignSelf: "stretch",
    justifyContent: "flex-start",
  } as React.CSSProperties,

  landscapeBoardCenter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    minHeight: 0,
  } as React.CSSProperties,

  landscapeSpeedStack: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "stretch",
  } as React.CSSProperties,
};

const normalTheme = {
  pageBg: "#0f172a",
  pageText: "#e2e8f0",
  subText: "#94a3b8",
  cardBg: "#111827",
  cardBorder: "#334155",
  ghostBg: "#111827",
  ghostBorder: "#475569",
  ghostText: "#e2e8f0",
  speedBg: "#111827",
  speedBorder: "#64748b",
  speedText: "#cbd5e1",
  speedActiveBg: "#f8fafc",
  speedActiveBorder: "#f8fafc",
  speedActiveText: "#0f172a",
  iconBg: "#111827",
  iconBorder: "#334155",
  boardBg: "#020617",
  boardBorder: "#e2e8f0",
  boardGridBg: "#64748b",
  emptyCell: "#020617",
  occupiedCell: "#cbd5e1",
  occupiedInset: "inset 0 0 0 1px rgba(15,23,42,0.28)",
  headCell: "#f8fafc",
  headInset: "inset 0 0 0 1px rgba(15,23,42,0.4)",
  headFlashCell: "#ffffff",
  headFlashInset:
    "0 0 0 1px rgba(255,255,255,1), 0 0 24px rgba(255,255,255,0.95), 0 0 40px rgba(255,255,255,0.55)",
  overlayBg: "rgba(2, 6, 23, 0.55)",
  overlayCardBg: "rgba(15, 23, 42, 0.92)",
  overlayCardBorder: "#475569",
  overlayText: "#cbd5e1",
  overlayButtonBg: "#e2e8f0",
  overlayButtonText: "#0f172a",
  newBest: "#facc15",
  icon: "🌀",
};

const oniTheme = {
  pageBg: "#1f0a0a",
  pageText: "#ffe4e6",
  subText: "#fecdd3",
  cardBg: "#2b1114",
  cardBorder: "#7f1d1d",
  ghostBg: "#2b1114",
  ghostBorder: "#b91c1c",
  ghostText: "#ffe4e6",
  speedBg: "#2b1114",
  speedBorder: "#991b1b",
  speedText: "#fecdd3",
  speedActiveBg: "#ef4444",
  speedActiveBorder: "#f87171",
  speedActiveText: "#fff1f2",
  iconBg: "#450a0a",
  iconBorder: "#7f1d1d",
  boardBg: "#140608",
  boardBorder: "#fecaca",
  boardGridBg: "#991b1b",
  emptyCell: "#140608",
  occupiedCell: "#f87171",
  occupiedInset: "inset 0 0 0 1px rgba(69,10,10,0.4)",
  headCell: "#fff1f2",
  headInset: "inset 0 0 0 1px rgba(127,29,29,0.45)",
  headFlashCell: "#fff1f2",
  headFlashInset:
    "0 0 0 1px rgba(255,241,242,1), 0 0 24px rgba(255,241,242,0.85), 0 0 42px rgba(248,113,113,0.9)",
  overlayBg: "rgba(69, 10, 10, 0.58)",
  overlayCardBg: "rgba(69, 10, 10, 0.92)",
  overlayCardBorder: "#f87171",
  overlayText: "#fecdd3",
  overlayButtonBg: "#fecaca",
  overlayButtonText: "#450a0a",
  newBest: "#fecdd3",
  icon: "👹",
};

// ===== COMPONENT =====
export default function App() {
  const [status, setStatus] = useState<Status>("idle");
  const [path, setPath] = useState<Cell[]>([{ x: 0, y: 0 }]);
  const [directionIndex, setDirectionIndex] = useState(0);
  const [score, setScore] = useState(1);
  const [speedMode, setSpeedMode] = useState<SpeedMode>("normal");
  const [highScores, setHighScores] = useState<HighScoreMap>(DEFAULT_HIGHSCORES);
  const [wasNewBest, setWasNewBest] = useState(false);
  const [isHeadFlashing, setIsHeadFlashing] = useState(false);
  const [viewport, setViewport] = useState<ViewportSize>(getViewportSize);

  const lastStepRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const highScoresRef = useRef<HighScoreMap>(DEFAULT_HIGHSCORES);
  const flashTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const loaded = loadHighScores();
    setHighScores(loaded);
    highScoresRef.current = loaded;
  }, []);

  useEffect(() => {
    const handleResize = () => setViewport(getViewportSize());
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const occupiedSet = useMemo(() => {
    return new Set(path.map((cell) => `${cell.x},${cell.y}`));
  }, [path]);

  const headKey = `${path[path.length - 1].x},${path[path.length - 1].y}`;
  const oniUnlocked = highScores.fast >= FAST_UNLOCK_SCORE;
  const oniCleared = highScores.oni >= ONI_CLEAR_SCORE;
  const isOni = speedMode === "oni";
  const theme = isOni ? oniTheme : normalTheme;
  const headerIcon = isOni ? oniTheme.icon : oniCleared ? "🍡" : normalTheme.icon;
  const isLandscape = viewport.width > viewport.height;

  const selectableModes: SpeedMode[] = oniUnlocked
    ? ["slow", "normal", "fast", "oni"]
    : ["slow", "normal", "fast"];

  const landscapeMetrics = useMemo(() => {
    const outerPadding = 10;
    const gap = 8;
    const sideWidth = Math.max(92, Math.min(112, viewport.width * 0.14));
    const availableWidth = Math.max(
      180,
      viewport.width - outerPadding * 2 - gap * 2 - sideWidth * 2
    );
    const availableHeight = Math.max(120, viewport.height - outerPadding * 2);
    const boardWidth = Math.min(availableWidth, availableHeight * BOARD_RATIO);
    const boardHeight = boardWidth / BOARD_RATIO;

    return {
      outerPadding,
      gap,
      sideWidth,
      boardWidth,
      boardHeight,
    };
  }, [viewport]);

  function triggerHeadFlash() {
    setIsHeadFlashing(true);

    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
    }

    flashTimeoutRef.current = window.setTimeout(() => {
      setIsHeadFlashing(false);
      flashTimeoutRef.current = null;
    }, FLASH_MS);
  }

  function resetGame(nextStatus: Status = "idle") {
    setStatus(nextStatus);
    setPath([{ x: 0, y: 0 }]);
    setDirectionIndex(0);
    setScore(1);
    setWasNewBest(false);
    setIsHeadFlashing(false);
    if (flashTimeoutRef.current !== null) {
      window.clearTimeout(flashTimeoutRef.current);
      flashTimeoutRef.current = null;
    }
    lastStepRef.current = null;
  }

  function startGame() {
    resetGame("running");
  }

  function endGame(finalScore: number) {
    setStatus("gameover");

    const currentHigh = highScoresRef.current[speedMode] ?? 0;
    const isNewBest = finalScore > currentHigh;
    setWasNewBest(isNewBest);

    if (!isNewBest) return;

    const next = {
      ...highScoresRef.current,
      [speedMode]: finalScore,
    };

    highScoresRef.current = next;
    setHighScores(next);
    saveHighScores(next);
  }

  function rotateDirection() {
    if (status !== "running") return;
    vibrateIfSupported(speedMode === "oni" ? 14 : 10);
    triggerHeadFlash();
    setDirectionIndex((prev) => (prev + 1) % 4);
  }

  useEffect(() => {
    if (speedMode === "oni" && !oniUnlocked) {
      setSpeedMode("fast");
    }
  }, [oniUnlocked, speedMode]);

  useEffect(() => {
    return () => {
      if (flashTimeoutRef.current !== null) {
        window.clearTimeout(flashTimeoutRef.current);
      }
    };
  }, []);

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
  }, [status, directionIndex, speedMode]);

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
            background: theme.emptyCell,
            ...(isOccupied
              ? {
                  background: theme.occupiedCell,
                  boxShadow: theme.occupiedInset,
                }
              : {}),
            ...(isHead
              ? {
                  background: isHeadFlashing ? theme.headFlashCell : theme.headCell,
                  boxShadow: isHeadFlashing ? theme.headFlashInset : theme.headInset,
                }
              : {}),
          }}
        />
      );
    }
  }

  function renderBoard(boardSize?: { width: number; height: number }) {
    return (
      <div
        style={{
          ...styles.boardWrap,
          background: theme.boardBg,
          border: `3px solid ${theme.boardBorder}`,
          width: boardSize ? `${boardSize.width}px` : undefined,
          height: boardSize ? `${boardSize.height}px` : undefined,
        }}
        onPointerDown={rotateDirection}
      >
        <div style={boardSize ? { width: "100%", height: "100%" } : styles.boardAspect}>
          <div style={{ ...styles.boardGrid, background: theme.boardGridBg }}>{cells}</div>
        </div>

        {status === "idle" && (
          <div style={{ ...styles.overlay, background: theme.overlayBg }}>
            <div
              style={{
                ...styles.overlayCard,
                background: theme.overlayCardBg,
                border: `1px solid ${theme.overlayCardBorder}`,
              }}
            >
              <p style={styles.overlayTitle}>スタート前</p>
              <div style={{ ...styles.overlayText, color: theme.overlayText }}>
                左上から右へ進みます。外壁か自分の足跡にぶつかったら終了です。
              </div>
              <button
                onClick={() => startGame()}
                style={{
                  ...styles.overlayButton,
                  background: theme.overlayButtonBg,
                  color: theme.overlayButtonText,
                }}
              >
                スタート
              </button>
            </div>
          </div>
        )}

        {status === "gameover" && (
          <div style={{ ...styles.overlay, background: "transparent" }}>
            <div
              style={{
                ...styles.overlayCard,
                background: theme.overlayCardBg,
                border: `1px solid ${theme.overlayCardBorder}`,
                ...(isOni ? styles.overlayCardHeavy : {}),
              }}
            >
              <p
                style={{
                  ...styles.overlayTitle,
                  ...(isOni ? styles.overlayTitleHeavy : {}),
                }}
              >
                Game Over
              </p>
              <div style={{ ...styles.overlayText, color: theme.overlayText }}>
                並んだ四角の数は <strong>{score}</strong> 個でした。
              </div>
              {wasNewBest && (
                <div style={{ ...styles.newBest, color: theme.newBest }}>NEW BEST</div>
              )}
              <button
                onClick={() => startGame()}
                style={{
                  ...styles.overlayButton,
                  background: theme.overlayButtonBg,
                  color: theme.overlayButtonText,
                }}
              >
                もう一度
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderLandscape() {
    return (
      <div style={styles.landscapeShell}>
        <div
          style={{
            ...styles.landscapeGrid,
            gridTemplateColumns: `${landscapeMetrics.sideWidth}px ${landscapeMetrics.boardWidth}px ${landscapeMetrics.sideWidth}px`,
            gap: `${landscapeMetrics.gap}px`,
          }}
        >
          <div style={styles.landscapeSide}>
            <div
              style={{
                ...styles.statCard,
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                padding: "9px 10px",
              }}
            >
              <div style={{ ...styles.statLabel, color: theme.subText, lineHeight: 1.15 }}>
                現在スコア
              </div>
              <div style={{ ...styles.statValue, fontSize: "26px" }}>{score}</div>
            </div>

            <div
              style={{
                ...styles.statCard,
                background: theme.cardBg,
                border: `1px solid ${theme.cardBorder}`,
                padding: "9px 10px",
              }}
            >
              <div
                style={{
                  ...styles.statLabel,
                  color: theme.subText,
                  lineHeight: 1.1,
                  marginBottom: "6px",
                }}
              >
                <div>ハイスコア</div>
                <div style={{ fontSize: "11px", marginTop: "2px" }}>
                  - {SPEED_LABELS[speedMode]} -
                </div>
              </div>
              <div style={{ ...styles.statValue, fontSize: "26px" }}>{highScores[speedMode]}</div>
            </div>

            <div style={{ flex: 1 }} />

            {status === "running" && (
              <button
                onClick={() => resetGame()}
                style={{
                  ...styles.ghostButton,
                  background: theme.ghostBg,
                  border: `1px solid ${theme.ghostBorder}`,
                  color: theme.ghostText,
                  padding: "10px 10px",
                }}
              >
                リセット
              </button>
            )}
          </div>

          <div style={styles.landscapeBoardCenter}>
            {renderBoard({
              width: landscapeMetrics.boardWidth,
              height: landscapeMetrics.boardHeight,
            })}
          </div>

          <div style={styles.landscapeSide}>
            <div style={styles.landscapeSpeedStack}>
              {selectableModes.map((mode) => {
                const disabled = status === "running";
                const active = speedMode === mode;

                return (
                  <button
                    key={mode}
                    onClick={() => {
                      if (disabled) return;
                      setSpeedMode(mode);
                    }}
                    style={{
                      ...styles.speedChip,
                      minWidth: "100%",
                      padding: "10px 10px",
                      fontSize: "13px",
                      background: active ? theme.speedActiveBg : theme.speedBg,
                      border: `1px solid ${active ? theme.speedActiveBorder : theme.speedBorder}`,
                      color: active ? theme.speedActiveText : theme.speedText,
                      boxShadow: active
                        ? "0 0 0 1px rgba(255,255,255,0.08), 0 6px 18px rgba(2,6,23,0.28)"
                        : "none",
                      transform: active ? "translateY(-1px)" : "translateY(0)",
                      ...(disabled ? styles.speedChipDisabled : {}),
                    }}
                    disabled={disabled}
                  >
                    {SPEED_LABELS[mode]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderPortrait() {
    return (
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>四角い渦</h1>
            <p style={{ ...styles.subtitle, color: theme.subText }}>
              タップで90度、時計回りに曲がる。
            </p>
          </div>
          <div
            style={{
              ...styles.iconBox,
              background: theme.iconBg,
              border: `1px solid ${theme.iconBorder}`,
            }}
          >
            {headerIcon}
          </div>
        </div>

        <div style={styles.hud}>
          <div
            style={{
              ...styles.statCard,
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
            }}
          >
            <div style={{ ...styles.statLabel, color: theme.subText }}>現在スコア</div>
            <div style={styles.statValue}>{score}</div>
          </div>

          <div
            style={{
              ...styles.statCard,
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
            }}
          >
            <div style={{ ...styles.statLabel, color: theme.subText }}>
              {SPEED_LABELS[speedMode]} ハイスコア
            </div>
            <div style={styles.statValue}>{highScores[speedMode]}</div>
          </div>

          <div
            style={{
              ...styles.statCard,
              background: theme.cardBg,
              border: `1px solid ${theme.cardBorder}`,
            }}
          >
            <div style={{ ...styles.statLabel, color: theme.subText }}>フィールド</div>
            <div style={styles.statValue}>
              {COLS}×{ROWS}
            </div>
          </div>
        </div>

        {status === "running" && (
          <div style={styles.actions}>
            <button
              onClick={() => resetGame()}
              style={{
                ...styles.ghostButton,
                background: theme.ghostBg,
                border: `1px solid ${theme.ghostBorder}`,
                color: theme.ghostText,
              }}
            >
              リセット
            </button>
          </div>
        )}

        <div style={{ ...styles.help, color: theme.subText }}>
          画面タップ1回で、進行方向が <strong>右 → 下 → 左 → 上</strong> の順に変わります。押しっぱなしでは連続反応しない作りです。
        </div>

        <div style={styles.speedRow}>
          {selectableModes.map((mode) => {
            const disabled = status === "running";
            const active = speedMode === mode;

            return (
              <button
                key={mode}
                onClick={() => {
                  if (disabled) return;
                  setSpeedMode(mode);
                }}
                style={{
                  ...styles.speedChip,
                  background: active ? theme.speedActiveBg : theme.speedBg,
                  border: `1px solid ${active ? theme.speedActiveBorder : theme.speedBorder}`,
                  color: active ? theme.speedActiveText : theme.speedText,
                  boxShadow: active
                    ? "0 0 0 1px rgba(255,255,255,0.08), 0 6px 18px rgba(2,6,23,0.28)"
                    : "none",
                  transform: active ? "translateY(-1px)" : "translateY(0)",
                  ...(disabled ? styles.speedChipDisabled : {}),
                }}
                disabled={disabled}
              >
                {SPEED_LABELS[mode]}
              </button>
            );
          })}
        </div>

        {renderBoard()}
      </div>
    );
  }

  return (
    <div
      style={{
        ...styles.page,
        background: theme.pageBg,
        color: theme.pageText,
        minHeight: isLandscape ? "100dvh" : "100vh",
        height: isLandscape ? "100dvh" : undefined,
        overflow: isLandscape ? "hidden" : undefined,
      }}
    >
      {isLandscape ? renderLandscape() : renderPortrait()}
    </div>
  );
}


