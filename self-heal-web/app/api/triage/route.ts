import { NextRequest } from "next/server";
import { spawn } from "child_process";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const { filePath } = await req.json();

    if (!filePath || typeof filePath !== "string") {
      return new Response("Invalid file path", { status: 400 });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const jarPath = path.join(
          process.cwd(),
          "..",
          "self-heal-runtime",
          "target",
          "self-heal-runtime-1.0-SNAPSHOT.jar"
        );

        const javaProcess = spawn("java", [
          "-jar",
          jarPath,
          "run",
          filePath,
        ]);

        javaProcess.stdout.on("data", (data) => {
          const lines = data.toString().split("\n").filter((line: string) => line.trim());
          for (const line of lines) {
            controller.enqueue(encoder.encode(line + "\n"));
          }
        });

        javaProcess.stderr.on("data", (data) => {
          const lines = data.toString().split("\n").filter((line: string) => line.trim());
          for (const line of lines) {
            controller.enqueue(encoder.encode(`[ERROR] ${line}\n`));
          }
        });

        javaProcess.on("close", (code) => {
          if (code === 0) {
            controller.enqueue(encoder.encode("\n✓ Triage completed successfully\n"));
          } else {
            controller.enqueue(encoder.encode(`\n✗ Process exited with code ${code}\n`));
          }
          controller.close();
        });

        javaProcess.on("error", (error) => {
          controller.enqueue(encoder.encode(`\n✗ Failed to start process: ${error.message}\n`));
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("API error:", error);
    return new Response(
      `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
      { status: 500 }
    );
  }
}
