package com.selfheal;

import com.selfheal.ProcessRunner.RunResult;
import com.selfheal.ErrorDiagnostics.CrashInfo;
import com.selfheal.ASTChunker.MethodChunk;

import java.io.File;
import java.util.Scanner;

public class SelfHeal {

    public static void main(String[] args) {
        if (args.length < 2 || !args[0].equals("run")) {
            System.out.println("Usage: java -jar SelfHeal.jar run <SourceFile.java>");
            return;
        }

        String targetFile = args[1];
        String apiKey = System.getenv("GEMINI_API_KEY");

        if (apiKey == null || apiKey.isEmpty()) {
            System.err.println("❌ Error: GEMINI_API_KEY environment variable not set.");
            return;
        }

        System.out.println("🚀 SelfHeal Runtime active for: " + targetFile);

        int maxRetries = 3;
        int attempts = 0;

        while (attempts < maxRetries) {
            attempts++;
            System.out.println("\n[Attempt " + attempts + "] Running " + targetFile + "...");

            try {
                // 1. Run
                RunResult result = ProcessRunner.run(targetFile);

                if (result.exitCode() == 0) {
                    System.out.println("✨ Success! Program exited with code 0.");
                    break;
                }

                System.out.println("💥 Crash detected! (Exit code: " + result.exitCode() + ")");

                // 2. Diagnose
                CrashInfo crash = ErrorDiagnostics.diagnose(result.stderr(), targetFile);
                if (crash == null) {
                    System.err.println("❌ Could not parse crash log. Aborting.");
                    break;
                }
                
                System.out.println("   🔍 Analysis: " + crash.errorType() + " at " + crash.filePath() + ":" + crash.lineNumber());
                System.out.println("   [Debug] Passing " + crash.filePath() + " line " + crash.lineNumber() + " to ASTChunker.");

                // 3. Isolate
                System.out.println("   ✂️ Isolating broken method...");
                System.out.flush();
                MethodChunk chunk = ASTChunker.isolate(crash.filePath(), crash.lineNumber());
                System.out.println("      Found method: " + chunk.method().getNameAsString());

                // 4. Treat (AI)
                System.out.println("   🧠 Consulting Gemini AI...");
                String fixedCode = AIRepairer.repair(chunk.sourceCode(), crash.errorType(), crash.errorMsg(), apiKey, chunk.context());
                System.out.println("      AI proposed a fix.");

                // 5. Graft
                System.out.println("   🩹 Grafting fix into code...");
                // Use the version that takes line number for safety
                ASTGrafter.graft(crash.filePath(), crash.lineNumber(), fixedCode);
                System.out.println("      Code updated.");

                // 6. Verify (Recompile)
                boolean compiled = Verifier.verify(crash.filePath());
                if (!compiled) {
                    System.out.println("   ❌ Fix failed to compile. Retrying loop might solve it if AI gets it right next time...");
                    // We continue the loop, hoping the next run (which fails to run) might trigger a different path? 
                    // Actually if it fails to compile, we can't run it.
                    // Ideally we should ask AI to fix the compilation error, but for this MVP, let's just try running it (it will fail) 
                    // or maybe we should just stop?
                    // Let's stop if compilation fails to avoid infinite loops of bad code.
                     System.err.println("Aborting due to compilation failure.");
                     break;
                }

                System.out.println("   ✨ Verification: Re-running...");

            } catch (Exception e) {
                e.printStackTrace();
                break;
            }
        }
    }
}
