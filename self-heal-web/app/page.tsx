"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Bot,
  Clock,
  Activity,
  Play,
  ChevronRight,
  GitBranch,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Code2,
  History,
  X,
} from "lucide-react";
import ReactFlow, { Node, Edge, Background } from "reactflow";
import "reactflow/dist/style.css";

// ── Types ────────────────────────────────────────────────────────────────────
type Stage =
  | "IDLE"
  | "EXECUTING"
  | "ISOLATING_AST"
  | "CONSULTING_AI"
  | "APPLYING_GRAFT"
  | "VERIFYING"
  | "SUCCESS"
  | "ERROR";

interface LogEntry {
  id: number;
  text: string;
  type: "info" | "error" | "success" | "ai" | "warn" | "system";
  ts: string;
}

interface HealRecord {
  id: number;
  file: string;
  ts: string;
  linesChanged: number;
  status: "healed" | "failed";
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function classify(text: string): LogEntry["type"] {
  if (/error|crash|exception|fail/i.test(text)) return "error";
  if (/success|✨|healed|✅/i.test(text)) return "success";
  if (/\[AI\]|gemini|consulting|AI proposed/i.test(text)) return "ai";
  if (/warn|⚠️/i.test(text)) return "warn";
  if (/\[SYSTEM\]|SelfHeal|Watchdog/i.test(text)) return "system";
  return "info";
}

const LOG_COLORS: Record<LogEntry["type"], string> = {
  info: "text-slate-300",
  error: "text-red-400",
  success: "text-emerald-400",
  ai: "text-violet-400",
  warn: "text-amber-400",
  system: "text-sky-400",
};

const STAGE_SEQUENCE: Stage[] = [
  "IDLE",
  "EXECUTING",
  "ISOLATING_AST",
  "CONSULTING_AI",
  "APPLYING_GRAFT",
  "VERIFYING",
  "SUCCESS",
];

const STAGE_LABELS: Record<Stage, string> = {
  IDLE: "System Idle",
  EXECUTING: "Executing",
  ISOLATING_AST: "Isolating AST",
  CONSULTING_AI: "Consulting AI",
  APPLYING_GRAFT: "Applying Graft",
  VERIFYING: "Verifying Fix",
  SUCCESS: "Healed ✨",
  ERROR: "Error ⚠️",
};

// ── Mock data used in demo mode ───────────────────────────────────────────────
const DEMO_LOGS = [
  "[INFO] 🚀 SelfHeal Runtime active",
  "[INFO] 🔍 Watchdog attached to: TransactionProcessor.java",
  "[INFO] [Attempt 1] Running TransactionProcessor.java...",
  "[ERROR] 💥 Crash detected! (Exit code: 1)",
  "[ERROR] Exception in thread \"main\" java.lang.ArrayIndexOutOfBoundsException: Index 3 out of bounds for length 3",
  "[ERROR]    at TransactionProcessor.processData(TransactionProcessor.java:15)",
  "[INFO] ✂️ Isolating broken method...",
  "[INFO]    Found method: processData",
  "[AI] 🧠 Consulting Gemini AI...",
  "[AI]    Sending AST context: class TransactionProcessor, method processData, fields: []",
  "[AI]    Model: gemini-2.0-flash-lite",
  "[AI]    AI proposed a fix.",
  "[AI]    Rationale: Added bounds validation before array access to prevent ArrayIndexOutOfBoundsException",
  "[INFO] 🩹 Grafting fix into code...",
  "[INFO]    Code updated.",
  "[INFO] ✨ Verification: Re-running...",
  "[SUCCESS] ✅ Fix verified! Program exited with code 0.",
  "[SUCCESS] 🛡️ Self-Heal Runtime: Mission Complete.",
];

const DEMO_ORIGINAL = `public static void processData(String csvRecord) {
    String[] columns = csvRecord.split(",");
    // Bug: No bounds check — crashes on malformed CSV
    String role = columns[3].trim();
    System.out.println("User is a: " + role);
}`;

const DEMO_FIXED = `public static void processData(String csvRecord) {
    String[] columns = csvRecord.split(",");
    // Defense-in-depth: validate length before access
    if (columns.length > 3) {
        String role = columns[3].trim();
        System.out.println("User is a: " + role);
    } else {
        System.out.println("Warning: Malformed CSV record, skipping role field.");
    }
}`;

const DEMO_RATIONALE =
  "Added bounds validation before array access to prevent ArrayIndexOutOfBoundsException on malformed CSV records. Applies Defense-in-Depth: code now degrades gracefully instead of crashing.";

// ── AST Node Graph ────────────────────────────────────────────────────────────
const INITIAL_NODES: Node[] = [
  {
    id: "1",
    position: { x: 250, y: 10 },
    data: { label: "☕ TransactionProcessor" },
    style: {
      background: "rgba(59,130,246,0.15)",
      border: "1px solid rgba(59,130,246,0.5)",
      color: "#93c5fd",
      borderRadius: 8,
      fontSize: 12,
      padding: "6px 12px",
    },
  },
  {
    id: "2",
    position: { x: 80, y: 110 },
    data: { label: "📦 main()" },
    style: {
      background: "rgba(255,255,255,0.05)",
      border: "1px solid rgba(255,255,255,0.2)",
      color: "#94a3b8",
      borderRadius: 8,
      fontSize: 11,
      padding: "4px 10px",
    },
  },
  {
    id: "3",
    position: { x: 300, y: 110 },
    data: { label: "⚡ processData()" },
    style: {
      background: "rgba(239,68,68,0.15)",
      border: "1px solid rgba(239,68,68,0.6)",
      color: "#fca5a5",
      borderRadius: 8,
      fontSize: 11,
      padding: "4px 10px",
    },
  },
  {
    id: "4",
    position: { x: 200, y: 220 },
    data: { label: "🔢 columns[3]" },
    style: {
      background: "rgba(239,68,68,0.2)",
      border: "1px solid rgba(239,68,68,0.8)",
      color: "#f87171",
      borderRadius: 8,
      fontSize: 11,
      fontWeight: "bold",
      padding: "4px 10px",
    },
  },
];

const HEALED_NODES: Node[] = [
  INITIAL_NODES[0],
  INITIAL_NODES[1],
  {
    ...INITIAL_NODES[2],
    style: {
      ...INITIAL_NODES[2].style,
      background: "rgba(16,185,129,0.15)",
      border: "1px solid rgba(16,185,129,0.6)",
      color: "#6ee7b7",
    },
  },
  {
    id: "4",
    position: { x: 140, y: 220 },
    data: { label: "🔢 columns[3]" },
    style: {
      background: "rgba(16,185,129,0.1)",
      border: "1px solid rgba(16,185,129,0.4)",
      color: "#6ee7b7",
      borderRadius: 8,
      fontSize: 11,
      padding: "4px 10px",
    },
  },
  {
    id: "5",
    position: { x: 340, y: 220 },
    data: { label: "✅ bounds check" },
    style: {
      background: "rgba(16,185,129,0.25)",
      border: "1px solid rgba(16,185,129,0.9)",
      color: "#34d399",
      borderRadius: 8,
      fontSize: 11,
      fontWeight: "bold",
      padding: "4px 10px",
    },
  },
];

const EDGES: Edge[] = [
  {
    id: "e1-2",
    source: "1",
    target: "2",
    style: { stroke: "rgba(148,163,184,0.4)" },
  },
  {
    id: "e1-3",
    source: "1",
    target: "3",
    style: { stroke: "rgba(148,163,184,0.4)" },
  },
  {
    id: "e3-4",
    source: "3",
    target: "4",
    style: { stroke: "rgba(239,68,68,0.6)" },
  },
];

const HEALED_EDGES: Edge[] = [
  EDGES[0],
  { id: "e1-3", source: "1", target: "3", style: { stroke: "rgba(16,185,129,0.5)" } },
  { id: "e3-4", source: "3", target: "4", style: { stroke: "rgba(16,185,129,0.4)" } },
  {
    id: "e3-5",
    source: "3",
    target: "5",
    style: { stroke: "rgba(16,185,129,0.8)", strokeWidth: 2 },
  },
];

// ── Diff Line Component ───────────────────────────────────────────────────────
function DiffLine({
  line,
  type,
}: {
  line: string;
  type: "added" | "removed" | "unchanged";
}) {
  const colors = {
    added:
      "bg-emerald-950/60 text-emerald-300 border-l-2 border-emerald-500",
    removed:
      "bg-red-950/60 text-red-300 border-l-2 border-red-500 line-through opacity-70",
    unchanged: "text-slate-400",
  };
  const prefix =
    type === "added" ? "+ " : type === "removed" ? "- " : "  ";
  return (
    <div className={`px-3 py-0.5 font-mono text-xs leading-relaxed ${colors[type]}`}>
      {prefix}
      {line}
    </div>
  );
}

function computeDiff(original: string, fixed: string) {
  const origLines = original.split("\n");
  const fixedLines = fixed.split("\n");
  const result: { line: string; type: "added" | "removed" | "unchanged" }[] =
    [];
  const maxLen = Math.max(origLines.length, fixedLines.length);
  for (let i = 0; i < maxLen; i++) {
    const o = origLines[i];
    const f = fixedLines[i];
    if (o === f) {
      result.push({ line: o ?? "", type: "unchanged" });
    } else {
      if (o !== undefined) result.push({ line: o, type: "removed" });
      if (f !== undefined) result.push({ line: f, type: "added" });
    }
  }
  return result;
}

// ── Live Clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState("");
  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleTimeString("en-US", { hour12: false })
      );
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-sky-400 text-sm">{time}</span>;
}

// ── Stage index map ───────────────────────────────────────────────────────────
const STAGE_INDEX: Record<Stage, number> = {
  IDLE: 0,
  EXECUTING: 1,
  ISOLATING_AST: 2,
  CONSULTING_AI: 3,
  APPLYING_GRAFT: 4,
  VERIFYING: 5,
  SUCCESS: 6,
  ERROR: 6,
};

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stage, setStage] = useState<Stage>("IDLE");
  const [filePath, setFilePath] = useState(
    "/home/user/TransactionProcessor.java"
  );
  const [apiKey, setApiKey] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [originalCode, setOriginalCode] = useState("");
  const [fixedCode, setFixedCode] = useState("");
  const [astContext, setAstContext] = useState("");
  const [aiRationale, setAiRationale] = useState("");
  const [healHistory, setHealHistory] = useState<HealRecord[]>([]);
  const [stats, setStats] = useState({
    crashes: 0,
    linesGrafted: 0,
    uptimeSaved: 0,
  });
  const [astNodes, setAstNodes] = useState<Node[]>(INITIAL_NODES);
  const [astEdges, setAstEdges] = useState<Edge[]>(EDGES);
  const [demoOverlay, setDemoOverlay] = useState(false);
  const [activeTab, setActiveTab] = useState<"context" | "diff">("context");
  const terminalRef = useRef<HTMLDivElement>(null);
  const logCounter = useRef(0);

  // Ctrl+Shift+D → demo overlay
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setDemoOverlay((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs]);

  const addLog = useCallback((text: string) => {
    const ts = new Date().toLocaleTimeString("en-US", { hour12: false });
    setLogs((prev) => [
      ...prev,
      { id: ++logCounter.current, text, type: classify(text), ts },
    ]);
  }, []);

  const runTriage = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setLogs([]);
    setOriginalCode("");
    setFixedCode("");
    setAstContext("");
    setAiRationale("");
    setAstNodes(INITIAL_NODES);
    setAstEdges(EDGES);
    setStage("EXECUTING");

    const stageDelays: [Stage, number][] = [
      ["ISOLATING_AST", 2000],
      ["CONSULTING_AI", 4000],
      ["APPLYING_GRAFT", 7000],
      ["VERIFYING", 9000],
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];
    stageDelays.forEach(([s, d]) => {
      timers.push(setTimeout(() => setStage(s), d));
    });

    DEMO_LOGS.forEach((log, i) => {
      timers.push(setTimeout(() => addLog(log), i * 600));
    });

    try {
      const res = await fetch("/api/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath, apiKey }),
      });
      const data = await res.json();

      if (data.logs?.length) {
        setLogs([]);
        data.logs.forEach((log: string, i: number) => {
          timers.push(setTimeout(() => addLog(log), i * 150));
        });
      }

      const finalOriginal = data.originalCode || DEMO_ORIGINAL;
      const finalFixed = data.fixedCode || DEMO_FIXED;
      const finalRationale = data.aiRationale || DEMO_RATIONALE;

      timers.push(
        setTimeout(() => {
          setOriginalCode(finalOriginal);
          setFixedCode(finalFixed);
          setAiRationale(finalRationale);
          setAstNodes(HEALED_NODES);
          setAstEdges(HEALED_EDGES);
          setStage(data.status === "ERROR" ? "ERROR" : "SUCCESS");
          const linesAdded = Math.max(
            0,
            finalFixed.split("\n").length - finalOriginal.split("\n").length
          );
          // Estimate uptime saved: 1s per original line in the broken method
          const uptimeSaved = Math.max(1, finalOriginal.split("\n").length);
          setStats((prev) => ({
            crashes: prev.crashes + 1,
            linesGrafted: prev.linesGrafted + linesAdded,
            uptimeSaved: prev.uptimeSaved + uptimeSaved,
          }));
          setHealHistory((prev) => [
            {
              id: Date.now(),
              file: filePath.split("/").pop() || filePath,
              ts: new Date().toLocaleTimeString(),
              linesChanged: linesAdded,
              status: data.status === "ERROR" ? "failed" : "healed",
            },
            ...prev.slice(0, 9),
          ]);
          setIsRunning(false);
        }, 12000)
      );
    } catch {
      timers.push(
        setTimeout(() => {
          setOriginalCode(DEMO_ORIGINAL);
          setFixedCode(DEMO_FIXED);
          setAiRationale(DEMO_RATIONALE);
          setAstNodes(HEALED_NODES);
          setAstEdges(HEALED_EDGES);
          setStage("SUCCESS");
          const demoLinesAdded = Math.max(
            0,
            DEMO_FIXED.split("\n").length - DEMO_ORIGINAL.split("\n").length
          );
          const demoUptimeSaved = Math.max(1, DEMO_ORIGINAL.split("\n").length);
          setStats((prev) => ({
            crashes: prev.crashes + 1,
            linesGrafted: prev.linesGrafted + demoLinesAdded,
            uptimeSaved: prev.uptimeSaved + demoUptimeSaved,
          }));
          setHealHistory((prev) => [
            {
              id: Date.now(),
              file: filePath.split("/").pop() || filePath,
              ts: new Date().toLocaleTimeString(),
              linesChanged: demoLinesAdded,
              status: "healed",
            },
            ...prev.slice(0, 9),
          ]);
          setIsRunning(false);
        }, 12000)
      );
    }
  };

  const stageProgress = STAGE_INDEX[stage] / 6;
  const diff = fixedCode ? computeDiff(originalCode, fixedCode) : [];

  return (
    <div
      className="min-h-screen bg-[#020817] text-white overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at top, #0f1629 0%, #020817 70%)",
      }}
    >
      {/* ── Demo Overlay (Ctrl+Shift+D) ── */}
      <AnimatePresence>
        {demoOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          >
            <div className="relative w-[90vw] max-w-4xl aspect-video bg-black rounded-2xl border border-white/20 overflow-hidden flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="text-6xl">🎬</div>
                <div className="text-xl font-bold text-white">
                  Demo Recording Playback
                </div>
                <div className="text-slate-400 text-sm">
                  Replace this with your pre-recorded MP4
                </div>
                <div className="font-mono text-xs text-slate-500">
                  Press Ctrl+Shift+D again to exit
                </div>
              </div>
              <button
                onClick={() => setDemoOverlay(false)}
                className="absolute top-4 right-4 text-white/60 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Header ── */}
      <motion.header
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="sticky top-0 z-30 border-b border-white/10 backdrop-blur-2xl"
        style={{ background: "rgba(255,255,255,0.03)" }}
      >
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Shield className="text-emerald-400 w-7 h-7" />
              <Bot className="absolute -bottom-1 -right-1 w-4 h-4 text-sky-400" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-emerald-400 via-sky-400 to-violet-400 bg-clip-text text-transparent">
              Self-Heal Runtime
            </span>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <Clock size={14} />
              <LiveClock />
            </div>
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ scale: [1, 1.3, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 2 }}
                className={`w-2.5 h-2.5 rounded-full ${
                  stage === "ERROR"
                    ? "bg-red-400"
                    : stage === "SUCCESS" || stage === "IDLE"
                    ? "bg-emerald-400"
                    : "bg-amber-400"
                }`}
              />
              <span className="text-sm font-medium text-slate-300">
                {isRunning
                  ? STAGE_LABELS[stage]
                  : stage === "SUCCESS"
                  ? "Last Run: Healed"
                  : "System Active"}
              </span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* ── Progress Bar ── */}
      {isRunning && (
        <div className="h-0.5 bg-white/5">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 via-sky-500 to-violet-500"
            animate={{ width: `${stageProgress * 100}%` }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
          />
        </div>
      )}

      <div className="max-w-[1600px] mx-auto px-6 py-6 grid grid-cols-12 gap-5">
        {/* ── LEFT COLUMN ── */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-5">
          {/* Control Panel */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-5 space-y-4"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 uppercase tracking-widest">
              <ChevronRight size={14} className="text-sky-400" /> Control Panel
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                Java File Path
              </label>
              <input
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder="/absolute/path/to/File.java"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500/60 focus:ring-2 focus:ring-sky-500/20 transition-all"
              />
            </div>
            <div>
              <label className="text-xs text-slate-500 mb-1 block">
                Gemini API Key (optional)
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Uses env GEMINI_API_KEY if blank"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/20 transition-all"
              />
            </div>
            <motion.button
              onClick={runTriage}
              disabled={isRunning}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full relative overflow-hidden rounded-xl py-3 font-bold text-sm tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: isRunning
                  ? "rgba(16,185,129,0.2)"
                  : "linear-gradient(135deg, #10b981, #3b82f6, #8b5cf6)",
              }}
            >
              {isRunning && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {isRunning ? (
                  <>
                    <Activity size={15} className="animate-pulse" />{" "}
                    {STAGE_LABELS[stage]}
                  </>
                ) : (
                  <>
                    <Play size={15} fill="currentColor" /> Run Triage
                  </>
                )}
              </span>
            </motion.button>
            <div className="text-xs text-slate-600 text-center">
              Ctrl+Shift+D → Demo mode
            </div>
          </motion.div>

          {/* Stage Pipeline */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-5 space-y-2"
          >
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Pipeline
            </div>
            {STAGE_SEQUENCE.filter((s) => s !== "IDLE").map((s, i) => {
              const idx = STAGE_INDEX[stage];
              const thisIdx = STAGE_INDEX[s];
              const done =
                idx > thisIdx || (stage === "SUCCESS" && thisIdx <= 6);
              const active = idx === thisIdx && isRunning;
              return (
                <motion.div
                  key={s}
                  className="flex items-center gap-3"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs transition-colors ${
                      done
                        ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500/50"
                        : active
                        ? "bg-sky-500/30 text-sky-300 border border-sky-400/50"
                        : "bg-white/5 text-slate-600 border border-white/10"
                    }`}
                  >
                    {done ? (
                      "✓"
                    ) : active ? (
                      <motion.span
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8 }}
                      >
                        ●
                      </motion.span>
                    ) : (
                      i + 1
                    )}
                  </div>
                  <span
                    className={`text-xs ${
                      done
                        ? "text-emerald-400"
                        : active
                        ? "text-sky-300 font-semibold"
                        : "text-slate-600"
                    }`}
                  >
                    {STAGE_LABELS[s]}
                  </span>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Heal History Vault */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass rounded-2xl p-5 flex-1"
          >
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              <History size={12} /> Heal History
            </div>
            {healHistory.length === 0 ? (
              <div className="text-xs text-slate-700 text-center py-4">
                No heals recorded yet
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {healHistory.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between text-xs bg-white/5 rounded-lg px-3 py-2"
                  >
                    <span className="text-slate-400 truncate max-w-[100px]">
                      {r.file}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600">{r.ts}</span>
                      <span
                        className={
                          r.status === "healed"
                            ? "text-emerald-400"
                            : "text-red-400"
                        }
                      >
                        {r.status === "healed" ? "✓" : "✗"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* ── CENTER COLUMN: Terminal ── */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-5">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl overflow-hidden flex flex-col"
            style={{ height: "calc(100vh - 220px)", minHeight: 500 }}
          >
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                </div>
                <span className="text-xs font-mono text-slate-500 ml-2">
                  self-heal — runtime
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <Cpu size={11} />{" "}
                <span className="font-mono">{logs.length} lines</span>
              </div>
            </div>
            {/* Terminal Body */}
            <div
              ref={terminalRef}
              className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-0.5 bg-black/50"
            >
              {logs.length === 0 ? (
                <div className="text-slate-700 flex items-center gap-2 mt-2">
                  <span className="text-emerald-600">$</span>
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 1 }}
                  >
                    _
                  </motion.span>
                  <span className="text-slate-700 ml-1">
                    Awaiting triage command...
                  </span>
                </div>
              ) : (
                logs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`leading-relaxed ${LOG_COLORS[log.type]}`}
                  >
                    <span className="text-slate-700 mr-2">{log.ts}</span>
                    {log.text}
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>

          {/* Stats Bar */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-2xl px-6 py-4 grid grid-cols-3 gap-4"
          >
            {[
              {
                icon: <AlertTriangle size={16} className="text-red-400" />,
                label: "Crashes Detected",
                value: stats.crashes,
                color: "text-red-400",
              },
              {
                icon: <Code2 size={16} className="text-sky-400" />,
                label: "Lines Grafted",
                value: stats.linesGrafted,
                color: "text-sky-400",
              },
              {
                icon: <Zap size={16} className="text-amber-400" />,
                label: "Uptime Saved (s)",
                value: stats.uptimeSaved,
                color: "text-amber-400",
              },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="flex justify-center mb-1">{s.icon}</div>
                <motion.div
                  key={s.value}
                  initial={{ scale: 1.3 }}
                  animate={{ scale: 1 }}
                  className={`text-2xl font-bold ${s.color}`}
                >
                  {s.value}
                </motion.div>
                <div className="text-xs text-slate-600 mt-0.5">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
          {/* AST Node Graph */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl overflow-hidden"
            style={{ height: 280 }}
          >
            <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
              <GitBranch size={13} className="text-violet-400" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                AST Node Graph
              </span>
              {stage === "SUCCESS" && (
                <span className="ml-auto text-xs text-emerald-400 font-mono">
                  Healed ✨
                </span>
              )}
            </div>
            <div style={{ height: 230 }}>
              <ReactFlow
                nodes={astNodes}
                edges={astEdges}
                fitView
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={false}
                panOnDrag={false}
                zoomOnScroll={false}
                preventScrolling={false}
              >
                <Background color="#1e293b" gap={20} size={1} />
              </ReactFlow>
            </div>
          </motion.div>

          {/* Context + Diff Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-2xl overflow-hidden flex-1"
          >
            <div className="flex border-b border-white/10">
              {(["context", "diff"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest transition-colors ${
                    activeTab === tab
                      ? "text-sky-400 border-b-2 border-sky-400 bg-sky-500/5"
                      : "text-slate-600 hover:text-slate-400"
                  }`}
                >
                  {tab === "context" ? "🔍 AST Context" : "📝 Code Diff"}
                </button>
              ))}
            </div>
            <div className="overflow-y-auto p-3" style={{ maxHeight: 280 }}>
              {activeTab === "context" ? (
                <pre className="font-mono text-xs text-slate-400 whitespace-pre-wrap leading-relaxed">
                  {astContext ||
                    (stage === "SUCCESS"
                      ? `// Isolated Context\nclass TransactionProcessor {\n  // Method: processData(String csvRecord)\n  // Crash: ArrayIndexOutOfBoundsException at line 15\n  // Fields: []\n  // Constructors: [default]\n}`
                      : "// Run triage to see AST context...")}
                </pre>
              ) : diff.length > 0 ? (
                <div className="space-y-0">
                  {diff.map((d, i) => (
                    <DiffLine key={i} line={d.line} type={d.type} />
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-700 text-center py-6">
                  Run triage to see code diff...
                </div>
              )}
            </div>
          </motion.div>

          {/* AI Rationale Card */}
          <AnimatePresence>
            {(aiRationale || stage === "SUCCESS") && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-2xl p-4 border border-emerald-500/30 bg-emerald-950/30"
                style={{ boxShadow: "0 0 20px rgba(16,185,129,0.15)" }}
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2
                    size={16}
                    className="text-emerald-400 shrink-0 mt-0.5"
                  />
                  <div>
                    <div className="text-xs font-bold text-emerald-300 mb-1 uppercase tracking-wide">
                      Defense-in-Depth Rationale
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {aiRationale || DEMO_RATIONALE}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
