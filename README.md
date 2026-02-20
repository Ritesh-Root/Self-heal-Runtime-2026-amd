# Self-Heal Runtime 🛡️🤖

**Autonomous Code-Triage for Java**

This project implements an intelligent runtime that automatically detects, diagnoses, and repairs Java application crashes on the fly using Generative AI (Gemini) and detailed AST analysis.

## 🚀 Features

- **Automatic Crash Detection**: Wraps Java processes and captures `stderr` to identify runtime exceptions.
- **Deep Context Isolation**: Uses `JavaParser` to extract not just the crashing method, but also **class fields** and **constructors**, giving the AI full context of the object's state.
- **Systematic AI Repair**: Leveraging **Gemini 2.0 Flash Lite**, the system follows a "Systematic Debugging" protocol to trace root causes and apply **Defense-in-Depth** fixes (not just symptom patching).
- **Resilient Fallback**: Includes a heuristic engine to apply safety guards (e.g., null checks, try-catch blocks) if the AI API is rate-limited or unavailable.
- **Web Dashboard**: A modern Next.js interface to visualize the diagnosis, repair, and verification steps in real-time.

## 📂 Project Structure

- **`self-heal-runtime/`**: Core Java application (Maven project). Contains the logic for parsing, AI interaction, and code grafting.
- **`self-heal-web/`**: Web Dashboard (Next.js 14, React, Tailwind CSS). Provides a UI to trigger and monitor the triage process.

## 🛠️ Getting Started

### Prerequisites

- Java JDK 17+
- Maven
- Node.js 18+ and npm
- **Gemini API Key** (Set as `GEMINI_API_KEY` environment variable)

### 1. Build the Runtime (Java)

```bash
cd self-heal-runtime
# Build the JAR (skipping tests for speed)
./maven/bin/mvn package -DskipTests
```

This creates `target/self-heal-runtime-1.0-SNAPSHOT.jar`.

### 2. Run the Dashboard (Web UI)

```bash
cd self-heal-web
npm install
npm run dev
```

Access the dashboard at [http://localhost:3000](http://localhost:3000).

## 🎮 Usage

1.  **Start the Dashboard** (`npm run dev`).
2.  Open [localhost:3000](http://localhost:3000) in your browser.
3.  Enter the **absolute path** to a buggy Java file (e.g., `TransactionProcessor.java`).
4.  Click **Run Triage**.
5.  Watch the logs as the system:
    -   Runs the code and detects the crash.
    -   Isolates the method and context.
    -   Consults the AI for a fix.
    -   Grafts the fix back into the file.
    -   Re-runs the code to verify success.

## 🧪 Demo: The "Golden Path"
 
The project includes a `TransactionProcessor.java` file that acts as our "golden path" demonstration. It simulates a real-world enterprise bug by throwing an `ArrayIndexOutOfBoundsException` inside a data-processing loop that parses mock CSV user data.
 
When the Watchdog observes the crash, the AI will not only fix the immediate index out-of-bounds error, but demonstrate true logic comprehension by dynamically validating the array length before access.
 
### 🛡️ The Fallback Plan (Murphy's Law)
Live demos are risky. If the API times out during the presentation:
Have a pristine screen recording of the UI executing the perfect run queued up in a hidden tab. If the live terminal hangs for more than 10 seconds, seamlessly switch to the video: *"To save time on the live API call, here is the exact process running..."*
 
## 🎤 The Pitch: Structure vs. Text Paradigm

Most AI coding tools treat code as a flat string of tokens—they just guess what text comes next. **Self-Heal Runtime is fundamentally different.** 

We treat code as a **formal, traversable structure** representing the abstract syntax tree (AST). 
By isolating the exact broken methods using `JavaParser` rather than regex guessing, the AI is constrained by the strict syntax rules of the language *before* the surgical patch is ever applied. This guarantees the patch will structurally fit back into the codebase, preventing the common "hallucinated syntax" errors seen in pure LLM tools.

## 🦸‍♂️ Superpowers Integrated

This project demonstrates **Agentic Superpowers**:
-   **Deep Context**: The AI receives a holistic view of the code (State + Behavior).
-   **Systematic Debugging**: Prompts enforce a rigorous engineering standard (Root Cause Analysis -> Proactive Validation).
-   **Verification Loops**: No fix is accepted until it compiles and runs.

---
*Developed by Ritesh Mahato.*
