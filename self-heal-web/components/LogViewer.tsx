"use client";

import { useEffect, useRef } from "react";

interface LogViewerProps {
  logs: string[];
  isRunning: boolean;
}

export default function LogViewer({ logs, isRunning }: LogViewerProps) {
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  if (logs.length === 0 && !isRunning) {
    return null;
  }

  return (
    <div className="bg-gray-800 rounded-lg shadow-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-semibold text-green-300">
          Triage Logs
        </h2>
        {isRunning && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-400"></div>
            <span className="text-green-400 text-sm">Processing...</span>
          </div>
        )}
      </div>

      <div className="bg-black rounded-md p-4 max-h-96 overflow-y-auto font-mono text-sm">
        {logs.length === 0 ? (
          <div className="text-gray-500 italic">
            Waiting for output...
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => {
              const isError = log.toLowerCase().includes("error") || log.toLowerCase().includes("exception");
              const isSuccess = log.toLowerCase().includes("success") || log.toLowerCase().includes("fixed");
              const isWarning = log.toLowerCase().includes("warning");

              return (
                <div
                  key={index}
                  className={`${
                    isError
                      ? "text-red-400"
                      : isSuccess
                      ? "text-green-400"
                      : isWarning
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                >
                  {log}
                </div>
              );
            })}
            <div ref={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}
