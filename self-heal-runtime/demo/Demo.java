package demo;

public class Demo {

    public static void main(String[] args) {
        System.out.println("Starting Demo Application...");
        processInput(null);
        System.out.println("Processing complete.");
    }

    public static void processInput(String s) {
        if (s == null) {
            System.err.println("Warning: s is null");
            return;
        }
        System.out.println("Processing: " + s.toUpperCase());
    }
}
