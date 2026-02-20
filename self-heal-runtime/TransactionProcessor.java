public class TransactionProcessor {
    public static void main(String[] args) {
        System.out.println("Processing user data...");
        // Simulating a CSV record: "ID,Name,Email,Role"
        // Missing "Role" column in this specific record
        String csvRecord = "101,John Doe,john@example.com";
        processData(csvRecord);
        System.out.println("Data processed successfully!");
    }

    public static void processData(String csvRecord) {
        String[] columns = csvRecord.split(",");
        // Bug: Accessing the 4th column (index 3) unconditionally,
        // leading to ArrayIndexOutOfBoundsException if the CSV is malformed.
        String role = columns[3].trim();
        System.out.println("User is a: " + role);
    }
}
