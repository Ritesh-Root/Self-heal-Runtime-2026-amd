package com.selfheal;

import java.io.IOException;

public class Verifier {

    public static boolean verify(String filePath) throws IOException, InterruptedException {
        System.out.println("Verifying fix...");
        
        // 1. Recompile
        ProcessBuilder pb = new ProcessBuilder("javac", filePath);
        pb.inheritIO(); 
        Process process = pb.start();
        int compileExit = process.waitFor();
        
        if (compileExit != 0) {
            System.err.println("❌ Fix failed to compile.");
            return false;
        }
        
        System.out.println("✅ Compilation successful.");
        return true;
    }
}
