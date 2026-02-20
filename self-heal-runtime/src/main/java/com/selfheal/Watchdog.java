package com.selfheal;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.File;

public class Watchdog {

    public static void main(String[] args) {
        // For testing, hardcode the path to a buggy file you create.
        // In the real CLI, this would be args[0].
        String targetFile = "TransactionProcessor.java";

        System.out.println("🛡️ Starting Self-Heal Watchdog on: " + targetFile);

        boolean success = runAndMonitor(targetFile);

        if (!success) {
            System.out.println("⚠️ Application crashed. Initiating Triage Protocol...");
            healApplication(targetFile);
        } else {
            System.out.println("✅ Application ran successfully. No healing required.");
        }
    }

    private static boolean runAndMonitor(String filePath) {
        try {
            // 1. Compile the Java file
            System.out.println("[WATCHDOG] Compiling " + filePath + "...");
            Process compileProcess = new ProcessBuilder("javac", filePath).start();
            compileProcess.waitFor();

            // 2. Run the compiled class (assuming filename matches class name)
            String className = filePath.replace(".java", "");
            System.out.println("[WATCHDOG] Executing " + className + "...\n");

            Process runProcess = new ProcessBuilder("java", className).start();

            // 3. Capture Standard Error (Where crashes get printed)
            BufferedReader errorReader = new BufferedReader(new InputStreamReader(runProcess.getErrorStream()));
            StringBuilder errorLog = new StringBuilder();
            String line;
            while ((line = errorReader.readLine()) != null) {
                errorLog.append(line).append("\n");
            }

            runProcess.waitFor();

            // 4. Check if it crashed
            if (errorLog.length() > 0) {
                System.err.println(errorLog.toString()); // Print the crash for the user to see

                // Store the error log in a static variable or pass it directly to the healer
                CrashAnalyzer.CrashData data = CrashAnalyzer.parseLog(errorLog.toString());
                if (data != null) {
                    GlobalState.lastCrashData = data; // Simple way to pass data for this MVP
                    return false; // It crashed!
                }
            }
            return true; // No errors

        } catch (Exception e) {
            e.printStackTrace();
            return false;
        }
    }

    private static void healApplication(String filePath) {
        try {
            CrashAnalyzer.CrashData data = GlobalState.lastCrashData;

            if (data == null) {
                System.out.println("[TRIAGE] Could not parse the crash log. Manual intervention required.");
                return;
            }

            // Step 1: Isolate
            System.out.println(
                    "\n[TRIAGE] Isolating target method in " + data.fileName() + " at line " + data.lineNumber());
            // Note: Adjust the path logic based on your folder structure
            String badChunk = ASTSurgeon.isolateFailingChunk(filePath, data.lineNumber());

            // Step 2: Consult AI
            System.out.println("[TRIAGE] Requesting fix from Gemini API...");
            String fixedCode = GeminiService.getHealingCode(data.errorType(), badChunk);

            // Step 3: Graft
            if (fixedCode != null && !fixedCode.isEmpty()) {
                System.out.println("[TRIAGE] Applying surgical patch...");
                ASTGrafter.graft(filePath, data.lineNumber(), fixedCode);

                System.out.println("\n🔄 [SYSTEM] Rebooting application to verify fix...\n");
                runAndMonitor(filePath); // Recursive check to see if it works now!
            }

        } catch (Exception e) {
            System.err.println("[TRIAGE] Fatal error during healing process: " + e.getMessage());
        }
    }
}

// A tiny helper class to hold state between methods for this simple CLI
class GlobalState {
    public static CrashAnalyzer.CrashData lastCrashData = null;
}
