# Mini-C-Compiler
A six-stage compiler pipeline in a single HTML file. Demonstrates Lexical, Syntax, Semantic, and Intermediate Code Generation (ICG) phases for a C-like language. Includes full support for arithmetic and if/else control flow. Perfect for learning compiler design. 

Mini-C Compiler Pipeline: A Full Front-to-Back End Demonstration
This project implements a complete, six-phase compiler pipeline for a subset of the C language (Mini-C), written entirely in JavaScript. It serves as a hands-on, educational tool to visually track source code through every major theoretical stage of compilation.

The entire application runs from a single compiler.html file, demonstrating the principles of computer science fundamentals like recursive descent parsing and intermediate code generation.

💻 Compiler Architecture
The compiler follows the standard separation into a Front End (source code analysis) and a Back End (machine code preparation). The intermediate steps form the "Middle End" where optimizations occur.

Phase

Part

Role

Core Output

1

Lexical Analysis

Reads input and breaks it into Tokens.

(KEYWORD: int), (ID: x), (OP: =) 

2

Syntax Analysis

Checks grammar and builds a hierarchical Abstract Syntax Tree (AST).

Tree Structure

3

Semantic Analysis

Checks meaning, types, and declaration rules.

Symbol Table

4

ICG

Translates AST into linear Three-Address Code (TAC).

t1 = x + y

5

Optimization

Refines TAC for efficiency (e.g., Constant Folding).

Optimized TAC

6

Code Generation

Maps TAC to final instructions.

Virtual Assembly

🔍 Detailed Phase Explanations
Phase 1 & 2: Lexical Analysis and Syntax Analysis
Lexer (Scanner): Uses regular expressions to match and classify meaningful sequences of characters (like int or main) into tokens (e.g., KEYWORD, IDENTIFIER, OPERATOR).

Parser: Uses a Recursive Descent approach, which means each grammar rule (e.g., Statement, Expression, IfStatement) is handled by a dedicated function. It builds the Abstract Syntax Tree (AST)—the hierarchical representation of the program's structure.

Phase 3: Semantic Analysis (Symbol Table)
This phase ensures the code is meaningful and follows type rules.

Symbol Table: A dictionary (symbolTable in the JavaScript code) is built during parsing to track all declared variables (int x, double y). It stores the variable's name, type, and its allocated memory address (represented by a temporary variable like t10).

Error Checking: Before any identifier is used (e.g., in an assignment or expression), the compiler performs a Symbol Table lookup. If the variable is not found, the process halts, reporting a Semantic Error: Variable 'name' used before declaration.

Phase 4: Intermediate Code Generation (ICG) - The Core of Control Flow
This phase translates the structured AST into a simplified, sequential, three-address code (TAC). This is where the magic of control flow happens.

Principle: Complex statements are broken down into instructions with, at most, three operands (e.g., result = operand1 op operand2).

If/Else Translation: The structural if statement is flattened into linear instructions using labels and conditional jumps:

AST Node

TAC Instruction

if (condition)

t1 = condition



JUMP_IF_FALSE t1 L_ELSE

then { ... }

(Then block TAC)

else { ... }

GOTO L_END_IF



L_ELSE: (Else block TAC)



L_END_IF:

Phase 5 & 6: Optimization and Code Generation
These phases prepare the TAC for execution.

Code Optimization: This implementation includes Constant Folding. Any expression consisting only of constant values (e.g., x = 5 + 10 * 2;) is calculated immediately during compilation, resulting in a single instruction (x = 25) instead of three, leading to faster execution.

Code Generation: The final step maps the optimized TAC instructions to a simple Virtual Assembly Language (e.g., LOAD, STORE, ADD). This output represents the runnable instructions for a specific, abstract machine.

🛠 How to Extend the Compiler
To fully support a new C feature (e.g., while loops or arrays), logic must be added across all six phases of the pipeline:

Lexer: Add the new keyword (while).

Parser: Add a new function (parseWhileLoop()) and define the new AST node structure.

Semantic Analyzer: Define rules (e.g., array bounds checking).

ICG: Define the new TAC instructions (e.g., JUMP_IF_TRUE, new labels).

Optimizer: Add optimizations relevant to the new structure (e.g., loop unrolling).

Code Generator: Map the new TAC to assembly instructions.