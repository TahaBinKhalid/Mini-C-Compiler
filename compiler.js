 // --- GLOBAL COMPILER CONSTANTS ---
        const KEYWORDS = ['int', 'print', 'include', 'double', 'main', 'return']; 
        const OPERATORS = ['+', '-', '*', '/', '='];
        const PUNCTUATIONS = [';', '(', ')', '{', '}', '<', '>', ',', '.', '&', '%', ':']; 
        const SPECIAL_SYMBOLS = ['#'];

        // --- UTILITY FUNCTIONS ---
        const isWhitespace = (c) => /\s/.test(c);
        const isLetter = (c) => /[a-zA-Z]/.test(c);
        const isDigit = (c) => /[0-9]/.test(c);
        const isOperator = (c) => OPERATORS.includes(c);
        const isPunctuation = (c) => PUNCTUATIONS.includes(c);
        const isSpecialSymbol = (c) => SPECIAL_SYMBOLS.includes(c); 

        // --- PHASE 1: LEXICAL ANALYSIS (SCANNER) ---
        function lex(input) {
            let cursor = 0;
            const tokens = [];
            // ... (Lexer logic remains the same)
            while (cursor < input.length) {
                let char = input[cursor];
                if (isWhitespace(char)) { cursor++; continue; }
                if (char === '/' && input[cursor + 1] === '/') {
                    while (cursor < input.length && input[cursor] !== '\n') { cursor++; }
                    continue; 
                }
                if (char === '"') {
                    cursor++; let value = '';
                    while (cursor < input.length && input[cursor] !== '"') {
                        if (input[cursor] === '\\' && ['n', 't', '"', '\\'].includes(input[cursor + 1])) {
                             value += input[cursor] + input[cursor + 1];
                             cursor += 2;
                        } else {
                            value += input[cursor];
                            cursor++;
                        }
                    }
                    if (input[cursor] !== '"') throw new Error("Lexical Error: Unclosed string literal.");
                    cursor++; 
                    tokens.push({ type: 'STRING', value });
                    continue;
                }
                if (isLetter(char)) {
                    let value = '';
                    while (isLetter(input[cursor]) || isDigit(input[cursor]) || input[cursor] === '_') { 
                        value += input[cursor];
                        cursor++;
                    }
                    const type = KEYWORDS.includes(value) ? 'KEYWORD' : 'ID';
                    tokens.push({ type, value });
                    continue;
                }
                if (isDigit(char)) {
                    let value = '';
                    while (isDigit(input[cursor])) {
                        value += input[cursor];
                        cursor++;
                    }
                    tokens.push({ type: 'INT', value: parseInt(value) });
                    continue;
                }
                if (isSpecialSymbol(char)) {
                    tokens.push({ type: 'HASH', value: char });
                    cursor++;
                    continue;
                }
                if (isOperator(char)) {
                    tokens.push({ type: 'OP', value: char });
                    cursor++;
                    continue;
                }
                if (isPunctuation(char)) {
                    tokens.push({ type: 'PUNC', value: char });
                    cursor++;
                    continue;
                }
                tokens.push({ type: 'ERROR', value: `Unknown character: ${char}` });
                cursor++;
            }
            return tokens;
        }

        // --- PHASE 2: SYNTAX ANALYSIS (PARSER) ---
        function parse(tokens) {
            let current = 0;
            const peek = () => tokens[current];
            const consume = (expectedType, expectedValue = null) => {
                const token = peek();
                if (!token) throw new Error(`Unexpected end of input. Expected: ${expectedType} (${expectedValue || 'any'}).`);
                if (token.type !== expectedType || (expectedValue && token.value !== expectedValue)) {
                    throw new Error(`Syntax Error: Expected ${expectedType} ('${expectedValue || 'any'}'), but found ${token.type} ('${token.value}') at index ${current}.`);
                }
                current++;
                return token;
            };

            const parseFactor = () => {
                const token = peek();
                if (token.type === 'PUNC' && token.value === '&') {
                    consume('PUNC', '&');
                    return { type: 'AddressOf', id: consume('ID').value };
                }
                if (token.type === 'ID' || token.type === 'INT' || token.type === 'STRING') {
                    current++;
                    return { type: token.type, value: token.value };
                }
                if (token.type === 'PUNC' && token.value === '(') {
                    consume('PUNC', '(');
                    const expression = parseExpression();
                    consume('PUNC', ')');
                    return expression;
                }
                throw new Error(`Syntax Error: Expected Factor, but found '${token.value}'.`);
            };

            const parseTerm = () => {
                let node = parseFactor();
                while (peek() && peek().type === 'OP' && (peek().value === '*' || peek().value === '/')) {
                    const operator = consume('OP');
                    node = { type: 'BinaryExpression', operator: operator.value, left: node, right: parseFactor() };
                }
                return node;
            };

            const parseExpression = () => {
                let node = parseTerm();
                while (peek() && peek().type === 'OP' && (peek().value === '+' || peek().value === '-')) {
                    const operator = consume('OP');
                    node = { type: 'BinaryExpression', operator: operator.value, left: node, right: parseTerm() };
                }
                return node;
            };
            
            const parseArgumentList = () => {
                const args = [];
                if (peek().type === 'PUNC' && peek().value === ')') return args; 
                args.push(parseExpression());
                while (peek() && peek().type === 'PUNC' && peek().value === ',') {
                    consume('PUNC', ',');
                    args.push(parseExpression());
                }
                return args;
            }

            const parseDeclaration = () => {
                const typeToken = consume('KEYWORD'); 
                const ids = [];
                ids.push(consume('ID').value);
                while (peek() && peek().type === 'PUNC' && peek().value === ',') {
                    consume('PUNC', ',');
                    ids.push(consume('ID').value);
                }
                consume('PUNC', ';');
                return { type: 'VariableDeclaration', dataType: typeToken.value, ids: ids };
            };

            const parseAssignment = () => {
                const id = consume('ID');
                consume('OP', '=');
                const expression = parseExpression();
                consume('PUNC', ';');
                return { type: 'AssignmentStatement', id: id.value, value: expression };
            };
            
            const parseFunctionCall = () => {
                const id = consume('ID');
                consume('PUNC', '(');
                const args = parseArgumentList();
                consume('PUNC', ')');
                consume('PUNC', ';');
                return { type: 'FunctionCall', name: id.value, arguments: args };
            }
            
            const parseReturn = () => {
                consume('KEYWORD', 'return');
                const value = parseExpression();
                consume('PUNC', ';');
                return { type: 'ReturnStatement', value: value };
            }
            
            const parseBlock = () => {
                consume('PUNC', '{');
                const statements = [];
                while (peek() && !(peek().type === 'PUNC' && peek().value === '}')) {
                    statements.push(parseStatement());
                }
                consume('PUNC', '}');
                return { type: 'BlockStatement', body: statements };
            }

            const parseInclude = () => {
                consume('HASH', '#');
                consume('KEYWORD', 'include');
                consume('PUNC', '<'); 
                const libraryName = consume('ID').value;
                consume('PUNC', '.'); 
                const extension = consume('ID').value;
                consume('PUNC', '>'); 
                return { type: 'IncludeDirective', library: `${libraryName}.${extension}` };
            };

            const parseMainFunction = () => {
                consume('KEYWORD', 'int');
                consume('KEYWORD', 'main');
                consume('PUNC', '(');
                consume('PUNC', ')');
                const body = parseBlock();
                return { type: 'FunctionDefinition', name: 'main', dataType: 'int', body: body };
            }

            const parseStatement = () => {
                const next = peek();

                if (next.type === 'HASH' && next.value === '#') return parseInclude();
                
                if (next.type === 'KEYWORD') {
                    if (next.value === 'int' && tokens[current + 1] && tokens[current + 1].value === 'main') return parseMainFunction();
                    if (next.value === 'int' || next.value === 'double') return parseDeclaration();
                    if (next.value === 'return') return parseReturn();
                }
                
                if (next.type === 'ID') {
                    const nextToken = tokens[current + 1];
                    if (nextToken && nextToken.type === 'OP' && nextToken.value === '=') return parseAssignment();
                    if (nextToken && nextToken.type === 'PUNC' && nextToken.value === '(') return parseFunctionCall(); 
                }
                
                if (next.type === 'PUNC' && next.value === '{') return parseBlock();

                throw new Error(`Syntax Error: Expected a statement, but found '${next.value}'.`);
            };

            const parseProgram = () => {
                const statements = [];
                while (current < tokens.length) {
                    statements.push(parseStatement());
                }
                return { type: 'Program', body: statements };
            };

            return parseProgram();
        }

        // --- PHASE 3: SEMANTIC ANALYSIS ---

        let symbolTable = new Map();

        function semanticAnalyze(ast) {
            symbolTable.clear();
            // ... (Semantic Analysis logic remains the same, included below for completeness)
            ast.body.forEach(node => analyzeNode(node));
            return 'Semantic analysis successful. Symbol Table built.';
        }

        function analyzeNode(node) {
            if (node.type === 'FunctionDefinition') {
                analyzeNode(node.body);
            } else if (node.type === 'BlockStatement') {
                node.body.forEach(stmt => analyzeNode(stmt));
            } else if (node.type === 'VariableDeclaration') {
                const dataType = node.dataType;
                node.ids.forEach(id => {
                    if (symbolTable.has(id)) {
                        throw new Error(`Semantic Error: Variable '${id}' re-declared.`);
                    }
                    symbolTable.set(id, { type: dataType, declared: true });
                });
            } else if (node.type === 'AssignmentStatement') {
                const id = node.id;
                if (!symbolTable.has(id)) {
                    throw new Error(`Semantic Error: Variable '${id}' used before declaration (Assignment target).`);
                }
                analyzeExpression(node.value);
            } else if (node.type === 'FunctionCall') {
                node.arguments.forEach(arg => analyzeExpression(arg));
            } else if (node.type === 'ReturnStatement') {
                 analyzeExpression(node.value);
            }
        }

        function analyzeExpression(node) {
            if (node.type === 'BinaryExpression') {
                analyzeExpression(node.left);
                analyzeExpression(node.right);
            } else if (node.type === 'ID') {
                if (!symbolTable.has(node.value)) {
                    throw new Error(`Semantic Error: Variable '${node.value}' used before declaration (Expression usage).`);
                }
            } else if (node.type === 'AddressOf') {
                if (!symbolTable.has(node.id)) {
                    throw new Error(`Semantic Error: Variable '${node.id}' used before declaration (Address-of operator).`);
                }
            }
        }
        
        // --- PHASE 4: INTERMEDIATE CODE GENERATION (ICG) ---
        let tempCount = 0;

        function generateTemp() { return `t${++tempCount}`; }

        // Main ICG function: returns an array of TAC objects
        function generateICG(ast) {
            tempCount = 0;
            const tac = [];
            
            function generateExpression(node) {
                if (node.type === 'INT' || node.type === 'STRING' || node.type === 'ID') {
                    return { type: node.type, value: node.value };
                }
                
                if (node.type === 'AddressOf') {
                    return { type: 'ADDRESS', value: `&${node.id}` };
                }

                if (node.type === 'BinaryExpression') {
                    const leftResult = generateExpression(node.left);
                    const rightResult = generateExpression(node.right);
                    const resultTemp = generateTemp();
                    
                    tac.push({
                        op: node.operator,
                        dest: resultTemp,
                        src1: leftResult,
                        src2: rightResult
                    });
                    return { type: 'ID', value: resultTemp };
                }
                return { type: 'UNKNOWN', value: '' };
            }

            function generateNode(node) {
                if (node.type === 'Program') {
                    node.body.forEach(stmt => generateNode(stmt));
                    return;
                }
                
                if (node.type === 'FunctionDefinition') {
                    tac.push({ op: 'LABEL', value: node.name.toUpperCase() });
                    generateNode(node.body);
                    return;
                }
                
                if (node.type === 'BlockStatement') {
                    node.body.forEach(stmt => generateNode(stmt));
                    return;
                }

                if (node.type === 'VariableDeclaration') {
                    node.ids.forEach(id => {
                         tac.push({ op: 'ALLOC', type: node.dataType, dest: id });
                    });
                    return;
                }
                
                if (node.type === 'AssignmentStatement') {
                    const expressionResult = generateExpression(node.value);
                    tac.push({ op: '=', dest: node.id, src1: expressionResult });
                    return;
                }
                
                if (node.type === 'FunctionCall') {
                    const args = node.arguments.map(arg => generateExpression(arg));
                    args.forEach(arg => {
                        tac.push({ op: 'PARAM', src1: arg });
                    });
                    tac.push({ op: 'CALL', name: node.name, argCount: node.arguments.length });
                    return;
                }
                
                if (node.type === 'ReturnStatement') {
                    const returnVal = generateExpression(node.value);
                    tac.push({ op: 'RETURN', src1: returnVal });
                    return;
                }
                
                if (node.type === 'IncludeDirective') {
                    tac.push({ op: 'COMMENT', value: `Preprocessor: Include ${node.library}` });
                    return;
                }
            }

            generateNode(ast);
            return tac;
        }

        // Helper to format TAC object array into display string
        function formatTAC(tacArray) {
            return tacArray.map(instruction => {
                let code = '';
                if (instruction.op === 'LABEL') {
                    code = `<span class="compiler-code label">${instruction.value}:</span>`;
                } else if (instruction.op === 'COMMENT') {
                    code = `<span class="compiler-code comment">// ${instruction.value}</span>`;
                } else if (instruction.op === 'ALLOC') {
                    code = `<span class="compiler-code">ALLOC ${instruction.type} ${instruction.dest}</span>`;
                } else if (instruction.op === '=') {
                    const src1 = instruction.src1.value;
                    code = `<span class="compiler-code">${instruction.dest} = ${src1}</span>`;
                } else if (OPERATORS.includes(instruction.op)) {
                    const src1 = instruction.src1.value;
                    const src2 = instruction.src2.value;
                    code = `<span class="compiler-code">${instruction.dest} = ${src1} ${instruction.op} ${src2}</span>`;
                } else if (instruction.op === 'PARAM') {
                    code = `<span class="compiler-code">PARAM ${instruction.src1.value}</span>`;
                } else if (instruction.op === 'CALL') {
                    code = `<span class="compiler-code">CALL ${instruction.name}, ${instruction.argCount}</span>`;
                } else if (instruction.op === 'RETURN') {
                    code = `<span class="compiler-code">RETURN ${instruction.src1.value}</span>`;
                }
                return code;
            }).join('<br>');
        }
        
        // --- PHASE 5: CODE OPTIMIZATION (CONSTANT FOLDING) ---

        function codeOptimize(tac) {
            const optimizedTac = [];
            let isOptimized = false;

            for (const instruction of tac) {
                if (OPERATORS.includes(instruction.op) && instruction.src1.type === 'INT' && instruction.src2.type === 'INT') {
                    // Perform Constant Folding
                    const v1 = instruction.src1.value;
                    const v2 = instruction.src2.value;
                    let result;

                    try {
                        switch (instruction.op) {
                            case '+': result = v1 + v2; break;
                            case '-': result = v1 - v2; break;
                            case '*': result = v1 * v2; break;
                            case '/': 
                                if (v2 === 0) throw new Error("Division by zero in constant folding.");
                                result = Math.floor(v1 / v2); // Integer division
                                break;
                            default: result = null;
                        }
                    } catch(e) {
                         console.error("Optimization failed:", e.message);
                         optimizedTac.push(instruction);
                         continue;
                    }
                    
                    if (result !== null) {
                        // Mark original instruction as optimized (visually)
                        instruction.optimized = true;
                        
                        // Create a new instruction with the folded constant
                        optimizedTac.push({
                            op: '=',
                            dest: instruction.dest,
                            src1: { type: 'INT', value: result },
                            optimized: false,
                            new: true
                        });
                        isOptimized = true;
                        continue; // Skip pushing the original instruction
                    }
                }
                
                // Push non-optimized instructions or instructions that were not constant expressions
                optimizedTac.push(instruction);
            }

            return { optimizedTac, isOptimized };
        }
        
        // Helper to format optimization result
        function formatOptimization(originalTac, optimizedTac) {
            let html = '<h4 class="text-gray-800 font-medium mb-1">Original TAC:</h4>';
            html += '<pre class="bg-gray-800 text-white p-2 rounded-md overflow-x-auto text-xs">';
            
            // Map the original TAC, showing where it was replaced
            let optimizedIndex = 0;
            originalTac.forEach((instruction, i) => {
                if (instruction.optimized) {
                    html += `<span class="compiler-code optimized">${formatTAC([instruction])}</span><br>`;
                    // Add the new line(s) that replaced it
                    while (optimizedIndex < optimizedTac.length && optimizedTac[optimizedIndex].new) {
                        html += `<span class="compiler-code new">${formatTAC([optimizedTac[optimizedIndex]])}</span><br>`;
                        optimizedIndex++;
                    }
                } else {
                    html += formatTAC([instruction]) + '<br>';
                    optimizedIndex++;
                }
            });
            
            html += '</pre>';
            return html;
        }


        // --- PHASE 6: CODE GENERATION (VIRTUAL ASSEMBLY) ---

        function codeGenerate(tac) {
            const assembly = [];
            
            // Simple Register Allocation/Tracker (Map temp variables to virtual registers R1, R2, etc.)
            let regMap = new Map();
            let nextReg = 1;
            
            function getReg(id) {
                if (id.startsWith('t') && !regMap.has(id)) {
                    // Assign a new virtual register for temp variables
                    regMap.set(id, `R${nextReg++}`);
                }
                // Use the variable name itself for declared variables, or the mapped register
                return regMap.get(id) || id; 
            }
            
            function getValue(item) {
                if (item.type === 'INT' || item.type === 'STRING' || item.type === 'ADDRESS') {
                    return item.value;
                }
                return getReg(item.value);
            }

            assembly.push('; --- VIRTUAL ASSEMBLY CODE START ---');
            
            for (const instruction of tac) {
                const op = instruction.op;
                
                if (op === 'LABEL') {
                    assembly.push(`\n<span class="compiler-code label">${instruction.value}:</span>`);
                } else if (op === 'COMMENT') {
                    assembly.push(`<span class="compiler-code comment">${instruction.value}</span>`);
                } else if (op === 'ALLOC') {
                    // Memory allocation instruction
                    assembly.push(`<span class="compiler-code">M_ALLOC ${instruction.dest}, SIZE(${instruction.type})</span>`);
                } else if (op === '=') {
                    const dest = getReg(instruction.dest);
                    const src1 = getValue(instruction.src1);
                    assembly.push(`<span class="compiler-code">LOAD ${src1}, ${dest}</span>`);
                    if (!instruction.dest.startsWith('t')) {
                         // Store result back to memory if it's a declared variable
                        assembly.push(`<span class="compiler-code">STORE ${dest}, ${instruction.dest}</span>`);
                    }
                } else if (['+', '-', '*', '/'].includes(op)) {
                    const dest = getReg(instruction.dest);
                    const src1 = getValue(instruction.src1);
                    const src2 = getValue(instruction.src2);
                    
                    // Complex arithmetic requires loading operands into registers
                    const regA = getReg(instruction.src1.value);
                    const regB = getReg(instruction.src2.value);
                    
                    // Load operands if they are variables or constants
                    assembly.push(`<span class="compiler-code">LOAD ${src1}, ${regA}</span>`);
                    assembly.push(`<span class="compiler-code">OP_${op} ${regA}, ${regB}</span>`); // regA = regA op regB
                    assembly.push(`<span class="compiler-code">MOV ${regA}, ${dest}</span>`);
                } else if (op === 'PARAM') {
                    const src1 = getValue(instruction.src1);
                    assembly.push(`<span class="compiler-code">PUSH_ARG ${src1}</span>`);
                } else if (op === 'CALL') {
                    assembly.push(`<span class="compiler-code">CALL ${instruction.name}, ${instruction.argCount}</span>`);
                } else if (op === 'RETURN') {
                    const src1 = getValue(instruction.src1);
                    assembly.push(`<span class="compiler-code">LOAD ${src1}, RET_REG</span>`);
                    assembly.push(`<span class="compiler-code">JUMP EXIT_MAIN</span>`);
                }
            }
            
            assembly.push('<span class="compiler-code label">EXIT_MAIN:</span>');
            assembly.push('; --- VIRTUAL ASSEMBLY CODE END ---');

            return assembly.join('<br>');
        }


        // --- DRIVER AND HELPERS ---

        document.getElementById('compileButton').addEventListener('click', () => {
            const input = document.getElementById('sourceCode').value;
            const outputDivs = {
                lexicalOutput: document.getElementById('lexicalOutput'),
                syntaxOutput: document.getElementById('syntaxOutput'),
                semanticOutput: document.getElementById('semanticOutput'),
                icgOutput: document.getElementById('icgOutput'),
                optimizationOutput: document.getElementById('optimizationOutput'),
                codeGenOutput: document.getElementById('codeGenOutput')
            };

            let tokens = [];
            let ast = null;
            let tac = [];
            let optimizedTac = [];

            // Reset outputs
            Object.values(outputDivs).forEach(div => div.innerHTML = "Processing...");

            // PHASE 1: Lexical Analysis
            try {
                tokens = lex(input);
                outputDivs.lexicalOutput.innerHTML = tokens.map(token => {
                    const className = `token-${token.type}`;
                    const displayValue = token.value !== undefined ? token.value : token.type;
                    return `<span class="token ${className}" title="${token.type}">${displayValue}</span>`;
                }).join('');
            } catch (e) {
                outputDivs.lexicalOutput.innerHTML = `<span class="error">${e.message}</span>`;
                return;
            }

            // PHASE 2: Syntax Analysis
            try {
                ast = parse(tokens);
                outputDivs.syntaxOutput.innerHTML = `<p class="success mb-2">✅ Success! Valid Abstract Syntax Tree (AST) Generated.</p>`;
                outputDivs.syntaxOutput.innerHTML += formatAST(ast);
            } catch (e) {
                outputDivs.syntaxOutput.innerHTML = `<p class="error">❌ Parsing Error:</p><p class="text-gray-900">${e.message}</p>`;
                return;
            }

            // PHASE 3: Semantic Analysis
            try {
                const semanticResult = semanticAnalyze(ast);
                outputDivs.semanticOutput.innerHTML = `<p class="success">✅ ${semanticResult}</p>`;
                outputDivs.semanticOutput.innerHTML += formatSymbolTable(symbolTable);
            } catch (e) {
                outputDivs.semanticOutput.innerHTML = `<p class="error">❌ Semantic Error:</p><p class="text-gray-900">${e.message}</p>`;
                return;
            }

            // PHASE 4: Intermediate Code Generation
            try {
                tac = generateICG(ast);
                outputDivs.icgOutput.innerHTML = `<p class="success mb-2">✅ Success! Three-Address Code (TAC) Generated.</p>`;
                outputDivs.icgOutput.innerHTML += `<pre class="bg-gray-800 text-white p-3 rounded-md overflow-x-auto">${formatTAC(tac)}</pre>`;
            } catch (e) {
                outputDivs.icgOutput.innerHTML = `<p class="error">❌ ICG Error:</p><p class="text-gray-900">${e.message}</p>`;
                return;
            }

            // PHASE 5: Code Optimization
            try {
                const { optimizedTac: resultTac, isOptimized } = codeOptimize(tac);
                optimizedTac = resultTac;
                
                if (isOptimized) {
                    outputDivs.optimizationOutput.innerHTML = `<p class="success mb-2">✅ Success! Code Optimized via Constant Folding.</p>`;
                    outputDivs.optimizationOutput.innerHTML += formatOptimization(tac, optimizedTac);
                } else {
                    outputDivs.optimizationOutput.innerHTML = `<p class="success mb-2">✅ Success! No Constant Folding optimizations found.</p>`;
                    outputDivs.optimizationOutput.innerHTML += `<pre class="bg-gray-800 text-white p-2 rounded-md overflow-x-auto">${formatTAC(optimizedTac)}</pre>`;
                }
            } catch (e) {
                outputDivs.optimizationOutput.innerHTML = `<p class="error">❌ Optimization Error:</p><p class="text-gray-900">${e.message}</p>`;
                return;
            }

            // PHASE 6: Code Generation
            try {
                const assemblyCode = codeGenerate(optimizedTac);
                outputDivs.codeGenOutput.innerHTML = `<p class="success mb-2">✅ Success! Virtual Assembly Generated.</p>`;
                outputDivs.codeGenOutput.innerHTML += `<pre class="bg-gray-800 text-white p-3 rounded-md overflow-x-auto text-xs">${assemblyCode}</pre>`;
            } catch (e) {
                outputDivs.codeGenOutput.innerHTML = `<p class="error">❌ Code Generation Error:</p><p class="text-gray-900">${e.message}</p>`;
                return;
            }
        });

        // Helper function to pretty print the AST
        function formatAST(node, indent = 0) {
            const space = '&nbsp;'.repeat(indent * 4);
            const lineBreak = '<br>';
            if (!node || typeof node !== 'object') return '';
            let result = '';
            
            if (node.type === 'Program') {
                result += `${space}<span class="text-blue-600 font-semibold">Program</span> {${lineBreak}`;
                node.body.forEach(stmt => { result += formatAST(stmt, indent + 1); });
                result += `${space}}`;
            } else if (node.type === 'FunctionDefinition') {
                result += `${space}<span class="text-purple-700 font-semibold">FunctionDef</span>: <span class="text-pink-600">${node.dataType}</span> <span class="text-blue-400">${node.name}</span>() {${lineBreak}`;
                result += formatAST(node.body, indent + 1);
                result += `${space}}<span class="text-gray-400">}</span>${lineBreak}`;
            } else if (node.type === 'BlockStatement') {
                result += `${space}<span class="text-yellow-700">Block</span> {${lineBreak}`;
                node.body.forEach(stmt => { result += formatAST(stmt, indent + 1); });
                result += `${space}}<span class="text-gray-400">}</span>${lineBreak}`;
            } else if (node.type === 'IncludeDirective') {
                result += `${space}<span class="text-indigo-600">Directive</span>: <span class="text-gray-700">#include</span> &lt;<span class="text-blue-400">${node.library}</span>&gt;${lineBreak}`;
            } else if (node.type === 'VariableDeclaration') {
                const ids = node.ids.join(', ');
                result += `${space}<span class="text-purple-600">Declaration</span>: <span class="text-pink-600">${node.dataType}</span> <span class="text-blue-400">${ids}</span>;${lineBreak}`;
            } else if (node.type === 'AssignmentStatement') {
                result += `${space}<span class="text-purple-600">Assignment</span>: <span class="text-blue-400">${node.id}</span> = ${lineBreak}`;
                result += formatAST(node.value, indent + 2);
                result += `${space}<span class="text-gray-400">;</span>${lineBreak}`;
            } else if (node.type === 'FunctionCall') {
                result += `${space}<span class="text-teal-600">Call</span>: <span class="text-blue-400">${node.name}</span> (${lineBreak}`;
                node.arguments.forEach(arg => { result += formatAST(arg, indent + 2); });
                result += `${space})${lineBreak}`;
            } else if (node.type === 'ReturnStatement') {
                result += `${space}<span class="text-red-500">Return</span> ${lineBreak}`;
                result += formatAST(node.value, indent + 2);
                result += `${space}<span class="text-gray-400">;</span>${lineBreak}`;
            } else if (node.type === 'BinaryExpression') {
                result += `${space}<span class="text-green-600">BinOp</span> (<span class="text-yellow-600">${node.operator}</span>) {${lineBreak}`;
                result += `${space}&nbsp;&nbsp;&nbsp;&nbsp;Left: ${lineBreak}`;
                result += formatAST(node.left, indent + 2);
                result += `${space}&nbsp;&nbsp;&nbsp;&nbsp;Right: ${lineBreak}`;
                result += formatAST(node.right, indent + 2);
                result += `${space}}${lineBreak}`;
            } else if (node.type === 'AddressOf') {
                result += `${space}<span class="text-yellow-600">AddressOf</span>: <span class="text-blue-400">&${node.id}</span>${lineBreak}`;
            } else if (node.type === 'ID') {
                result += `${space}<span class="text-blue-400">ID</span>: <span class="text-gray-700">${node.value}</span>${lineBreak}`;
            } else if (node.type === 'INT') {
                result += `${space}<span class="text-green-500">INT</span>: <span class="text-gray-700">${node.value}</span>${lineBreak}`;
            } else if (node.type === 'STRING') {
                result += `${space}<span class="text-yellow-900">STRING</span>: <span class="text-gray-700">"${node.value}"</span>${lineBreak}`;
            }
            return result;
        }
        
        // Helper function to display the Symbol Table
        function formatSymbolTable(table) {
            let html = '<h4 class="text-gray-800 mt-3 font-medium">Symbol Table Content:</h4>';
            html += '<ul class="list-disc ml-6 text-sm">';
            if (table.size === 0) {
                html += '<li>No variables declared.</li>';
            } else {
                table.forEach((details, name) => {
                    html += `<li><span class="font-mono text-blue-500">${name}</span>: Type=<span class="text-pink-600">${details.type}</span></li>`;
                });
            }
            html += '</ul>';
            return html;
        }

        // Initial setup for demonstration
        document.addEventListener('DOMContentLoaded', () => {
            document.getElementById('compileButton').click();
        });