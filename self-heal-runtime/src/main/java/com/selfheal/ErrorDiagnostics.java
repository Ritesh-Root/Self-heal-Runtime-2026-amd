package com.selfheal;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class ErrorDiagnostics {

    public record CrashInfo(String errorType, String errorMsg, String filePath, int lineNumber) {}

    // Regex to capture: ErrorType: Message \n at Class.method(File.java:Line)
    // Example: Exception in thread "main" java.lang.NullPointerException: Cannot invoke ...
    //          at Demo.processInput(Demo.java:9)
    // We need to be careful. The "at ..." line gives us the file and line.
    
    // Pattern to find the stack trace element corresponding to the user's code.
    // We want the FIRST "at ..." that matches the file name we ran, or just the first one if we can't tell.
    // Actually, we can pass the filename we ran to filter.
    
    public static CrashInfo diagnose(String stderr, String targetFileName) {
        String[] lines = stderr.split("\n");
        String errorType = "UnknownError";
        String errorMsg = "";
        String filePath = targetFileName; // Default to target file
        int lineNumber = -1;

        // 1. Find the Exception line (usually the first line of the stack trace)
        // It typically looks like: "Exception in thread "main" java.lang.NullPointerException: ..."
        Pattern exceptionPattern = Pattern.compile("([^:\\s]+Exception[^:]*)(:.*)?");
        
        for (String line : lines) {
            if (line.contains("Exception")) { // Heuristic
                 Matcher m = exceptionPattern.matcher(line);
                 if (m.find()) {
                     errorType = m.group(1).trim();
                     if (errorType.startsWith("Exception in thread")) {
                         // Extract actual class name if possible, commonly matches: Exception in thread "main" java.lang.NPE
                         int lastSpace = errorType.lastIndexOf(' ');
                         if (lastSpace != -1) {
                             errorType = errorType.substring(lastSpace + 1);
                         }
                     }
                     if (m.group(2) != null) {
                         errorMsg = m.group(2).substring(1).trim(); // Remove colon
                     }
                     break;
                 }
            }
        }
        
        // 2. Find the Line Number in the stack trace
        // Match: at ClassName.MethodName(FileName.java:LineNumber)
        // We prioritize the targetFileName if possible.
        Pattern tracePattern = Pattern.compile("\\((.*?):(\\d+)\\)");
        
        for (String line : lines) {
            if (line.trim().startsWith("at ")) {
                Matcher m = tracePattern.matcher(line);
                if (m.find()) {
                    String file = m.group(1);
                    int lineNo = Integer.parseInt(m.group(2));
                    
                    // Simple heuristic: If the file name in the trace matches our target (or contains it), bingo.
                    if (targetFileName.contains(file) || file.equals(targetFileName)) {
                        filePath = targetFileName; // Update to exact file path provided by user
                        lineNumber = lineNo;
                        break;
                    } else if (lineNumber == -1) {
                        // Keep the first one as a backup if we don't match specifically
                        filePath = file;
                        lineNumber = lineNo;
                    }
                }
            }
        }
        
        if (lineNumber == -1) return null; // Couldn't parse location

        return new CrashInfo(errorType, errorMsg, filePath, lineNumber);
    }
}
