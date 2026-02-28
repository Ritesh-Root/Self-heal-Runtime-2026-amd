import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import path from "path";

const TRIAGE_TIMEOUT_MS = 60_000;

// Only allow absolute paths to .java files; reject path traversal attempts.
function isValidJavaPath(filePath: string): boolean {
  if (typeof filePath !== "string") return false;
  if (!path.isAbsolute(filePath)) return false;
  if (!filePath.endsWith(".java")) return false;
  // Reject traversal sequences by comparing normalized form
  if (path.normalize(filePath) !== filePath) return false;
  return true;
}

export async function POST(req: NextRequest) {
  const { filePath, apiKey } = await req.json();

  if (!filePath) {
    return NextResponse.json({ error: "filePath is required" }, { status: 400 });
  }

  if (!isValidJavaPath(filePath)) {
    return NextResponse.json(
      { error: "filePath must be an absolute path to a .java file" },
      { status: 400 }
    );
  }

  const jarPath = path.join(
    process.cwd(),
    "..",
    "self-heal-runtime",
    "target",
    "self-heal-runtime-1.0-SNAPSHOT.jar"
  );

  const logs: string[] = [];
  let originalCode = "";
  let fixedCode = "";
  let astContext = "";
  let aiRationale = "";
  let status = "SUCCESS";

  await new Promise<void>((resolve) => {
    const child = spawn("java", ["-jar", jarPath, "run", filePath], {
      env: {
        ...process.env,
        GEMINI_API_KEY: apiKey || process.env.GEMINI_API_KEY || "",
      },
    });

    child.stdout.on("data", (d: Buffer) => {
      const text = d.toString();
      logs.push(...text.split("\n").filter(Boolean));
      if (text.includes("ORIGINAL_CODE:")) {
        originalCode =
          text.split("ORIGINAL_CODE:")[1]?.split("END_ORIGINAL")[0]?.trim() || "";
      }
      if (text.includes("FIXED_CODE:")) {
        fixedCode =
          text.split("FIXED_CODE:")[1]?.split("END_FIXED")[0]?.trim() || "";
      }
      if (text.includes("AST_CONTEXT:")) {
        astContext =
          text.split("AST_CONTEXT:")[1]?.split("END_AST")[0]?.trim() || "";
      }
      if (text.includes("AI_RATIONALE:")) {
        aiRationale =
          text.split("AI_RATIONALE:")[1]?.split("END_RATIONALE")[0]?.trim() || "";
      }
    });

    child.stderr.on("data", (d: Buffer) => {
      logs.push(
        ...d
          .toString()
          .split("\n")
          .filter(Boolean)
          .map((l: string) => `[STDERR] ${l}`)
      );
    });

    let resolved = false;
    const done = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    child.on("close", (code: number | null) => {
      if (code !== 0 && !logs.some((l) => l.includes("✨ Success"))) {
        status = "ERROR";
      }
      clearTimeout(timeoutId);
      done();
    });

    // Timeout after 60s — destroy streams and terminate child process
    const timeoutId = setTimeout(() => {
      child.stdout.destroy();
      child.stderr.destroy();
      child.kill("SIGTERM");
      done();
    }, TRIAGE_TIMEOUT_MS);
  });

  return NextResponse.json({ logs, originalCode, fixedCode, astContext, aiRationale, status });
}
