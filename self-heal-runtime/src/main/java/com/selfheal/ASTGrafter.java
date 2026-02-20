package com.selfheal;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.MethodDeclaration;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Optional;

public class ASTGrafter {

    public static void graft(String filePath, String oldChunk, String newChunk) throws IOException {
        // 1. Parse the file again (fresh state)
        CompilationUnit cu = StaticJavaParser.parse(new File(filePath));

        // 2. Locate the old method. 
        // Since we don't have the node object from previous step (stateless), 
        // we find the method that matches the *signature* and *body* of the old chunk.
        // OR, simpler: we find the method at the same location if we passed line number.
        // But wait, we stripped line numbers.
        // Let's rely on finding the method that *looks* like the old one.
        // Actually, better: ASTChunker returned the method. 
        // In this architecture, we are re-parsing. 
        // Let's assume we find it by exact string match of the method body? Risk of whitespace issues.
        // Better: We should have passed the method signature or location.
        // BUT, for simplicity in this hackathon-style script:
        // We will traverse and find the method that matches the string representation of oldChunk.
        
        Optional<MethodDeclaration> targetMethod = cu.findAll(MethodDeclaration.class).stream()
            .filter(m -> m.toString().equals(oldChunk)) // Exact match might be flaky if formatting differs
            .findFirst();

        if (targetMethod.isEmpty()) {
            // Fallback: Try to parse oldChunk to get signature, then find by signature?
            // For now, let's assume exact match works because we just read it from the same file.
             throw new RuntimeException("Could not find the original method to replace. Has file changed?");
        }

        // 3. Parse the new chunk
        MethodDeclaration newMethod = StaticJavaParser.parseBodyDeclaration(newChunk).asMethodDeclaration();

        // 4. Swap it
        targetMethod.get().replace(newMethod);

        // 5. Save
        Files.write(Paths.get(filePath), cu.toString().getBytes());
    }
    
    // Version that takes line number to be more robust
    public static void graft(String filePath, int lineNum, String newChunk) throws IOException {
         CompilationUnit cu = StaticJavaParser.parse(new File(filePath));
         
         Optional<MethodDeclaration> targetMethod = cu.findAll(MethodDeclaration.class).stream()
            .filter(m -> m.getBegin().isPresent() && m.getBegin().get().line <= lineNum && m.getEnd().get().line >= lineNum)
            .findFirst();
            
         if (targetMethod.isEmpty()) {
             throw new RuntimeException("Could not find method at line " + lineNum);
         }
         
         MethodDeclaration newMethod = StaticJavaParser.parseBodyDeclaration(newChunk).asMethodDeclaration();
         targetMethod.get().replace(newMethod);
         
         Files.write(Paths.get(filePath), cu.toString().getBytes());
    }
}
