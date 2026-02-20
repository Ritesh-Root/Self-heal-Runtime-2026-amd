package com.selfheal;

import com.github.javaparser.StaticJavaParser;
import com.github.javaparser.ast.CompilationUnit;
import com.github.javaparser.ast.body.MethodDeclaration;

import java.io.File;
import java.util.Optional;

public class ASTSurgeon {

    public static String isolateFailingChunk(String absoluteFilePath, int crashLine) throws Exception {
        System.out.println("[AST] Loading file into Syntax Tree: " + absoluteFilePath);

        // 1. Parse the entire Java file into an AST
        CompilationUnit cu = StaticJavaParser.parse(new File(absoluteFilePath));

        // 2. Traverse the tree to find the method encompassing the crash line
        Optional<MethodDeclaration> badMethod = cu.findAll(MethodDeclaration.class).stream()
                .filter(method -> {
                    if (method.getBegin().isPresent() && method.getEnd().isPresent()) {
                        int startLine = method.getBegin().get().line;
                        int endLine = method.getEnd().get().line;
                        // Check if the crash happened inside this method's boundaries
                        return crashLine >= startLine && crashLine <= endLine;
                    }
                    return false;
                })
                .findFirst(); // Grab the first match

        // 3. Extract and return the isolated chunk
        if (badMethod.isPresent()) {
            System.out.println("[AST] Successfully isolated method: " + badMethod.get().getNameAsString());
            return badMethod.get().toString(); // Returns the raw Java code of JUST this method
        } else {
            throw new RuntimeException("Could not locate a method containing line " + crashLine);
        }
    }
}
