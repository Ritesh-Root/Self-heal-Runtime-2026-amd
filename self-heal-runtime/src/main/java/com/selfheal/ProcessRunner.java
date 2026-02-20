package com.selfheal;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

public class ProcessRunner {

    public record RunResult(int exitCode, String stderr) {}

    public static RunResult run(String targetFile) throws IOException, InterruptedException {
        // Compile first? The prompt implies we run the file.
        // Usually `java MyFile.java` (single-file source code programs in Java 11+) works.
        // Or `java -jar` if it's a jar.
        // For this demo, let's assume `java <filename>`.
        
        ProcessBuilder pb = new ProcessBuilder("java", targetFile);
        
        // Inherit stdout so user sees normal output
        pb.redirectOutput(ProcessBuilder.Redirect.INHERIT);
        // PIPE stderr so we can capture it
        pb.redirectError(ProcessBuilder.Redirect.PIPE);
        
        Process process = pb.start();
        
        // Capture stderr
        String stderr;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getErrorStream()))) {
            stderr = reader.lines().collect(Collectors.joining("\n"));
        }
        
        int exitCode = process.waitFor();
        
        // Also print stderr to console so user sees the crash if we don't fix it, or just to show what happened
        // But for "SelfHeal", maybe we consume it?
        // Let's print it to our own stderr so the user sees it, but we also keep a copy.
        if (!stderr.isEmpty()) {
            System.err.println(stderr); 
        }

        return new RunResult(exitCode, stderr);
    }
}
