package com.selfheal;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

public class GeminiService {

    // Pull the API key from the environment variables for security
    private static final String API_KEY = System.getenv("GEMINI_API_KEY");

    // Using Gemini 2.0 Flash Lite for maximum speed during the hackathon demo
    private static final String API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key="
            + API_KEY;

    public static String getHealingCode(String errorType, String badCodeChunk) throws Exception {
        if (API_KEY == null || API_KEY.isEmpty()) {
            throw new RuntimeException("CRITICAL: GEMINI_API_KEY environment variable is missing!");
        }

        // 1. Construct the exact prompt we designed
        String prompt = String.format(
                "You are an automated Java Repair Agent. Fix the following method that caused a %s. " +
                        "Return ONLY the raw Java code for the fixed method. Do not use Markdown backticks. " +
                        "Do not change the method signature.\n\n" +
                        "Code to fix:\n%s",
                errorType, badCodeChunk);

        // 2. Build the JSON payload (Escaping the prompt for valid JSON)
        // Note: For a production app, use Jackson or Gson. For a fast hackathon MVP,
        // string formatting works!
        String jsonPayload = """
                {
                  "contents": [{
                    "parts": [{"text": "%s"}]
                  }],
                  "generationConfig": {
                    "temperature": 0.2
                  }
                }
                """.formatted(prompt.replace("\"", "\\\"").replace("\n", "\\n"));

        // 3. Set up the HTTP Client
        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();

        // 4. Create the Request
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(API_URL))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
                .build();

        System.out.println("[AI] Sending failing chunk to Gemini...");

        // 5. Send Request and get Response
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new RuntimeException("AI API Call Failed: " + response.body());
        }

        // 6. Extract the code from the JSON response
        return extractCodeFromJson(response.body());
    }

    // A lightweight parser to grab the text out of the Gemini JSON response
    private static String extractCodeFromJson(String jsonResponse) {
        // Quick string manipulation to grab the "text" value.
        // (Again, use Gson/Jackson if you have time, but this keeps the MVP
        // dependency-free)
        try {
            String target = "\"text\": \"";
            int startIndex = jsonResponse.indexOf(target) + target.length();
            int endIndex = jsonResponse.indexOf("\"", startIndex);

            String rawCode = jsonResponse.substring(startIndex, endIndex);

            // Clean up JSON escaping and any accidental markdown the AI might slip in
            rawCode = rawCode.replace("\\n", "\n").replace("\\\"", "\"").replace("\\t", "\t");
            rawCode = rawCode.replaceAll("```java\n", "").replaceAll("```", "");

            System.out.println("[AI] Fix generated successfully.");
            return rawCode.trim();
        } catch (Exception e) {
            System.err.println("Failed to parse AI response: " + jsonResponse);
            return null;
        }
    }
}
