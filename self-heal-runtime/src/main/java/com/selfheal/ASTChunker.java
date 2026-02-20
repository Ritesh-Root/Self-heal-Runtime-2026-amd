package com.selfheal;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.MethodDeclaration;
import java.io.File;
import java.io.FileNotFoundException;
import java.util.Optional;

public class ASTChunker {

    public record MethodChunk(MethodDeclaration method, String sourceCode, String context) {}

    public static MethodChunk isolate(String filePath, int crashLine) throws FileNotFoundException {
        System.out.println("   [Debug] ASTChunker parsing: " + filePath);
        CompilationUnit cu = null;
        try {
            File f = new File(filePath);
            System.out.println("   [Debug] Absolute path: " + f.getAbsolutePath());
            cu = StaticJavaParser.parse(f);
        } catch (Exception e) {
            System.err.println("   [Error] ASTChunker failed to parse file: " + filePath);
            e.printStackTrace();
            throw new RuntimeException("AST Parse Failed", e);
        }

        if (cu == null) {
            System.err.println("   [Debug] CompilationUnit is null!");
        } else {
             System.out.println("   [Debug] CompilationUnit parsed. Found methods: " + cu.findAll(MethodDeclaration.class).size());
        }

        Optional<MethodDeclaration> badMethod = cu.findAll(MethodDeclaration.class).stream()
            .filter(m -> {
                if (m.getBegin().isPresent() && m.getEnd().isPresent()) {
                    int begin = m.getBegin().get().line;
                    int end = m.getEnd().get().line;
                    return begin <= crashLine && end >= crashLine;
                }
                return false;
            })
            .findFirst();

        if (badMethod.isPresent()) {
            // Deep Context Extraction
            StringBuilder context = new StringBuilder();
            badMethod.get().getParentNode().ifPresent(parent -> {
                if (parent instanceof com.github.javaparser.ast.body.ClassOrInterfaceDeclaration) {
                    com.github.javaparser.ast.body.ClassOrInterfaceDeclaration clazz = 
                        (com.github.javaparser.ast.body.ClassOrInterfaceDeclaration) parent;
                    
                    context.append("// Class Fields (State)\n");
                    clazz.getFields().forEach(f -> context.append(f.toString()).append("\n"));
                    
                    context.append("\n// Constructors (Initialization)\n");
                    clazz.getConstructors().forEach(c -> context.append(c.toString()).append("\n"));
                }
            });

            return new MethodChunk(badMethod.get(), badMethod.get().toString(), context.toString());
        }

        throw new RuntimeException("Could not find method at line " + crashLine + " in " + filePath);
    }
}
