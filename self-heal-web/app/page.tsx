"use client";

import { useState } from "react";
import LogViewer from "@/components/LogViewer";

export default function Home() {
  const [filePath, setFilePath] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleRunTriage = async () => {
    if (!filePath.trim()) {
      setError("Please enter a file path");
      return;
    }

    setIsRunning(true);
    setError(null);
    setLogs([]);

    try {
      const response = await fetch("/api/triage", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filePath }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          setLogs((prevLogs) => [...prevLogs, ...lines]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLogs((prevLogs) => [
        ...prevLogs,
        `Error: ${err instanceof Error ? err.message : "An error occurred"}`,
      ]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-5xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Self-Heal Runtime
          </h1>
          <p className="text-gray-400 text-lg">
            Autonomous Code-Triage for Java
          </p>
        </header>

        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800 rounded-lg shadow-2xl p-6 mb-6">
            <h2 className="text-2xl font-semibold mb-4 text-blue-300">
              Run Triage
            </h2>

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="filePath"
                  className="block text-sm font-medium text-gray-300 mb-2"
                >
                  Java File Path (Absolute Path)
                </label>
                <input
                  id="filePath"
                  type="text"
                  value={filePath}
                  onChange={(e) => setFilePath(e.target.value)}
                  placeholder="e.g., /path/to/TransactionProcessor.java"
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-gray-400"
                  disabled={isRunning}
                />
              </div>

              {error && (
                <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-md">
                  {error}
                </div>
              )}

              <button
                onClick={handleRunTriage}
                disabled={isRunning}
                className={`w-full py-3 px-6 rounded-md font-semibold text-lg transition-all duration-200 ${
                  isRunning
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl"
                }`}
              >
                {isRunning ? "Running Triage..." : "Run Triage"}
              </button>
            </div>
          </div>

          <LogViewer logs={logs} isRunning={isRunning} />

          <div className="mt-8 bg-gray-800 rounded-lg shadow-xl p-6">
            <h3 className="text-xl font-semibold mb-3 text-purple-300">
              How It Works
            </h3>
            <ol className="list-decimal list-inside space-y-2 text-gray-300">
              <li>Enter the absolute path to a Java file</li>
              <li>Click Run Triage to start the process</li>
              <li>
                The system will:
                <ul className="list-disc list-inside ml-6 mt-1 space-y-1 text-gray-400">
                  <li>Run the code and detect crashes</li>
                  <li>Isolate the method and context using AST</li>
                  <li>Consult Gemini AI for a fix</li>
                  <li>Graft the fix back into the file</li>
                  <li>Re-run the code to verify success</li>
                </ul>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
