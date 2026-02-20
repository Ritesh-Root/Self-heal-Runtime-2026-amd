package com.selfheal;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class CrashAnalyzer {

    // 1. Regex to catch the Exception Name
    // Looks for words ending in Exception or Error
    private static final Pattern EXCEPTION_PATTERN = Pattern.compile("([a-zA-Z0-9_.]+(?:Exception|Error))");

    // 2. Regex to catch the file and line number from the first "at ..." trace
    // Matches: at com.example.Demo.processInput(Demo.java:14)
    private static final Pattern TRACE_PATTERN = Pattern.compile("at .*\\((.*\\.java):(\\d+)\\)");

    // A simple record to hold our extracted data (Requires Java 14+)
    public record CrashData(String errorType, String fileName, int lineNumber) {
    }

    public static CrashData parseLog(String stderrOutput) {
        String errorType = null;
        String fileName = null;
        int lineNumber = -1;

        // Extract Exception Type
        Matcher exMatcher = EXCEPTION_PATTERN.matcher(stderrOutput);
        if (exMatcher.find()) {
            errorType = exMatcher.group(1);
        }

        // Extract File and Line Number (We only want the top-most trace, which is the
        // root cause)
        Matcher traceMatcher = TRACE_PATTERN.matcher(stderrOutput);
        if (traceMatcher.find()) {
            fileName = traceMatcher.group(1);
            lineNumber = Integer.parseInt(traceMatcher.group(2));
        }

        // If we found all three, we have a valid crash to heal!
        if (errorType != null && fileName != null && lineNumber != -1) {
            System.out.println("[DETECTED] Crash: " + errorType + " in " + fileName + " at line " + lineNumber);
            return new CrashData(errorType, fileName, lineNumber);
        }

        return null; // No parseable crash found
    }
}
