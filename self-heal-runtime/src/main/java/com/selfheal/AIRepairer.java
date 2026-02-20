package com.selfheal;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import com.google.gson.JsonArray;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class AIRepairer {

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=";
    private static final Gson gson = new Gson();

    public static String repair(String badChunk, String errorType, String errorMsg, String apiKey, String context) throws IOException, InterruptedException {
        String prompt = buildPrompt(badChunk, errorType, errorMsg, context);
        
        // Construct JSON payload for Gemini
        JsonObject content = new JsonObject();
        JsonArray parts = new JsonArray();
        JsonObject part = new JsonObject();
        part.addProperty("text", prompt);
        parts.add(part);
        content.add("parts", parts);
        content.addProperty("role", "user");

        JsonArray contents = new JsonArray();
        contents.add(content);

        JsonObject payload = new JsonObject();
        payload.add("contents", contents);

        int maxRetries = 2;
        int attempt = 0;
        
        while (attempt < maxRetries) {
            attempt++;
            
            HttpClient client = HttpClient.newHttpClient();
            HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(GEMINI_API_URL + apiKey))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(gson.toJson(payload)))
                .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() == 200) {
                return parseResponse(response.body());
            } else if (response.statusCode() == 429) {
                System.out.println("   ⏳ Gemini API Rate Limited (429). Retrying in " + (3 * attempt) + "s...");
                Thread.sleep(3000 * attempt);
            } else {
                System.out.println("   ⚠️ Gemini API Error (" + response.statusCode() + "). Falling back to local repair...");
                break; // Skip remaining retries, go straight to fallback
            }
        }
        System.out.println("   ⚠️ API unavailable. Falling back to local repair heuristic...");
        return localFallbackRepair(badChunk, errorType);
    }

    private static String buildPrompt(String badChunk, String errorType, String errorMsg, String context) {
        return "System Context:\n" +
               "You are an automated Senior Java Reliability Engineer. Your goal is to fix runtime errors by applying Systematic Debugging principles.\n" +
               "Protocol:\n" +
               "1. ROOT CAUSE ANALYSIS: Trace the error backwards. Look at the provided Class Fields and Constructors to understand the state.\n" +
               "2. DEFENSE IN DEPTH: Do not just fix the immediate crash. Add guards/validation at the method entry to prevent invalid state from causing damage.\n" +
               "3. LEAST SURPRISE: Maintain original logic intent. Do not rewrite the whole method unless necessary.\n" +
               "Input:\n" +
               "You will receive:\n" +
               "A. The Broken Method (The Chunk)\n" +
               "B. The Error Message\n" +
               "C. Deep Context (Class Fields & Constructors)\n" +
               "Output:\n" +
               "Return ONLY the raw Java code for the fixed method. Do not use Markdown backticks. Do not use explanations.\n" +
               "Do not change the method signature.\n\n" +
               "User Request:\n" +
               "The Error: " + errorType + "\n" +
               "Message: " + errorMsg + "\n\n" +
               "Deep Context (State & Init):\n" +
               context + "\n\n" +
               "The Broken Method:\n" +
               badChunk + "\n\n" +
               "Task:\n" +
               "Apply Systematic Debugging to fix this method.";
    }

    private static String parseResponse(String jsonResponse) {
        JsonObject root = gson.fromJson(jsonResponse, JsonObject.class);
        try {
            String text = root.getAsJsonArray("candidates")
                .get(0).getAsJsonObject()
                .getAsJsonObject("content")
                .getAsJsonArray("parts")
                .get(0).getAsJsonObject()
                .get("text").getAsString();
                
            // Clean up Markdown code blocks if the LLM ignores instructions
            text = text.replaceAll("```java", "").replaceAll("```", "").trim();
            return text;
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse AI response: " + jsonResponse);
        }
    }

    /**
     * Local heuristic repair when the AI API is unavailable.
     * For NullPointerException: wraps each parameter usage with null checks.
     * For other exceptions: wraps the method body in try-catch.
     */
    private static String localFallbackRepair(String badChunk, String errorType) {
        // Parse the method to get its structure
        try {
            com.github.javaparser.ast.body.MethodDeclaration method = 
                com.github.javaparser.StaticJavaParser.parseMethodDeclaration(badChunk);
            
            if (errorType.contains("NullPointerException")) {
                // Strategy: wrap each parameter with a null guard
                java.util.List<com.github.javaparser.ast.body.Parameter> params = method.getParameters();
                if (!params.isEmpty() && method.getBody().isPresent()) {
                    String originalBody = method.getBody().get().toString();
                    // Remove outer braces
                    String inner = originalBody.substring(1, originalBody.length() - 1).trim();
                    
                    StringBuilder guardedBody = new StringBuilder("{\n");
                    for (com.github.javaparser.ast.body.Parameter p : params) {
                        if (p.getType().asString().equals("String") || !p.getType().isPrimitiveType()) {
                            guardedBody.append("    if (").append(p.getNameAsString()).append(" == null) {\n");
                            guardedBody.append("        System.err.println(\"Warning: ").append(p.getNameAsString()).append(" is null\");\n");
                            guardedBody.append("        return");
                            // Add default return value based on the method's return type
                            if (!method.getType().isVoidType()) {
                                if (method.getType().asString().equals("String")) {
                                    guardedBody.append(" \"\"");
                                } else if (method.getType().isPrimitiveType()) {
                                    guardedBody.append(" 0");
                                } else {
                                    guardedBody.append(" null");
                                }
                            }
                            guardedBody.append(";\n");
                            guardedBody.append("    }\n");
                        }
                    }
                    guardedBody.append("    ").append(inner).append("\n}");
                    
                    // Rebuild the method with guarded body
                    String signature = badChunk.substring(0, badChunk.indexOf('{')).trim();
                    return signature + " " + guardedBody.toString();
                }
            }
            
            // Generic fallback: wrap in try-catch
            if (method.getBody().isPresent()) {
                String originalBody = method.getBody().get().toString();
                String inner = originalBody.substring(1, originalBody.length() - 1).trim();
                
                StringBuilder tryCatchBody = new StringBuilder("{\n");
                tryCatchBody.append("    try {\n");
                tryCatchBody.append("        ").append(inner).append("\n");
                tryCatchBody.append("    } catch (Exception e) {\n");
                tryCatchBody.append("        System.err.println(\"Caught \" + e.getClass().getSimpleName() + \": \" + e.getMessage());\n");
                tryCatchBody.append("    }\n}");
                
                String signature = badChunk.substring(0, badChunk.indexOf('{')).trim();
                return signature + " " + tryCatchBody.toString();
            }
        } catch (Exception e) {
            System.err.println("   [Fallback] Parse failed: " + e.getMessage());
        }
        
        // Last resort: return the original code unchanged  
        return badChunk;
    }
}
