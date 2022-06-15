import { assemble, optimize } from "./Assembler.js";
import { BINARY_OPERATOR, UNARY_OPERATOR, } from "./CPU.js";
import { LEFT, RIGHT, } from "./types.js";
export function compile(src) {
    return new Compiler().compile(src);
}
class Compiler {
    constructor() {
        this.tagId = 0;
        this.symbolId = 0;
        this.global = new Set();
        this.functions = new Map();
        this.DATA = Array();
        this.CODE = Array();
    }
    compile(source) {
        const ast = parse(source);
        this.compileGlobalDeclarations(ast);
        return assemble(optimize([
            { op: "CALL", arg: "main" },
            { op: "JMP", arg: -1 },
            ...this.CODE,
            ...this.DATA,
        ]));
    }
    compileGlobalDeclarations(program) {
        for (const expr of program) {
            switch (expr.type) {
                case "DECLARATION":
                    if (this.global.has(expr.name))
                        throw new Error("variable already declared");
                    if (expr.value.type != "LITERAL")
                        throw new Error("only literal values are allowed on top level");
                    this.global.add(expr.name);
                    this.DATA.push({ op: "__TAG__", arg: expr.name });
                    this.DATA.push({ op: "__VAL__", arg: expr.value.value });
                    break;
                case "FUNCTION":
                    if (this.global.has(expr.name))
                        throw new Error("function already declared");
                    this.functions.set(expr.name, { length: expr.params.length });
            }
        }
        for (const expr of program) {
            if (expr.type == "FUNCTION") {
                this.compileFunction(expr);
            }
        }
    }
    compileFunction(expr) {
        const ctx = this.allocateFrame(expr);
        this.CODE.push({ op: "__VAL__", arg: ctx.tmpStart + ctx.tmpSize + 2 }); // stack size
        this.CODE.push({ op: "__TAG__", arg: expr.name });
        expr.body.forEach((expr) => {
            this.compileExpression(expr, ctx, ctx.tmpStart);
        });
        this.CODE.push({ op: "SLD", arg: -2 });
        this.CODE.push({ op: "RET" });
    }
    compileExpression(expr, ctx, offset) {
        switch (expr.type) {
            case "LITERAL":
                return this.compileLiteral(expr);
            case "SYMBOL":
                return this.compileSymbol(expr);
            case "REFERENCE":
                return this.compileReference(expr, ctx);
            case "DECLARATION":
                return this.compileLocalDeclaration(expr, ctx, offset);
            case "ASSIGNMENT":
                return this.compileAssignment(expr, ctx, offset);
            case "CONDITIONAL":
                return this.compileConditional(expr, ctx, offset);
            case "LOOP":
                return this.compileLoop(expr, ctx, offset);
            case "UNARY_OPERATION":
                return this.compileUnaryOperation(expr, ctx, offset);
            case "BINARY_OPERATION":
                return this.compileBinaryOperation(expr, ctx, offset);
            case "APPLICATION":
                return this.compileApplication(expr, ctx, offset);
        }
    }
    compileLiteral(expr) {
        const name = "__LITERAL__" + expr.value;
        if (!this.global.has(name)) {
            this.global.add(name);
            this.DATA.push({ op: "__TAG__", arg: name });
            this.DATA.push({ op: "__VAL__", arg: expr.value });
        }
        this.CODE.push({ op: "LLS", arg: name });
    }
    compileSymbol(expr) {
        const name = "__SYMBOL__" + expr.name;
        if (!this.global.has(name)) {
            this.global.add(name);
            this.DATA.push({ op: "__TAG__", arg: name });
            this.DATA.push({ op: "__VAL__", arg: this.symbolId++ });
        }
        this.CODE.push({ op: "LLS", arg: name });
    }
    compileReference(expr, ctx) {
        if (ctx.local.has(expr.name)) {
            this.CODE.push({
                op: expr.indirect ? "LLDI" : "LLD",
                arg: ctx.local.get(expr.name),
            });
        }
        else if (this.global.has(expr.name)) {
            this.CODE.push({
                op: expr.indirect ? "LLSI" : "LLS",
                arg: expr.name,
            });
        }
        else {
            throw new Error(`Reference Error ${expr.name}`);
        }
    }
    compileLocalDeclaration(expr, ctx, offset) {
        this.compileExpression(expr.value, ctx, offset);
        this.CODE.push({ op: "SLD", arg: ctx.local.get(expr.name) });
    }
    compileAssignment(expr, ctx, offset) {
        this.compileExpression(expr.value, ctx, offset);
        if (ctx.local.has(expr.name)) {
            this.CODE.push({
                op: expr.indirect ? "SLDI" : "SLD",
                arg: ctx.local.get(expr.name),
            });
        }
        else if (this.global.has(expr.name)) {
            this.CODE.push({
                op: expr.indirect ? "SLSI" : "SLS",
                arg: expr.name,
            });
        }
        else {
            throw new Error(`Reference Error ${expr.name}`);
        }
    }
    compileConditional(expr, ctx, offset) {
        const IF_TAG = "__IF__" + this.tagId;
        const IF_END_TAG = "__IF_END__" + this.tagId++;
        this.compileExpression(expr.condition, ctx, offset);
        this.CODE.push({ op: "BRL", arg: IF_TAG });
        expr.elseBranch.forEach((e) => this.compileExpression(e, ctx, offset));
        this.CODE.push({ op: "JMP", arg: IF_END_TAG });
        this.CODE.push({ op: "__TAG__", arg: IF_TAG });
        expr.ifBranch.forEach((e) => this.compileExpression(e, ctx, offset));
        this.CODE.push({ op: "__TAG__", arg: IF_END_TAG });
    }
    compileLoop(expr, ctx, offset) {
        const LOOP_TAG = "__LOOP__" + this.tagId;
        const LOOP_BEGIN_TAG = "__LOOP_BEGIN__" + this.tagId;
        const LOOP_END_TAG = "__LOOP_END__" + this.tagId++;
        this.CODE.push({ op: "__TAG__", arg: LOOP_TAG });
        this.compileExpression(expr.condition, ctx, offset);
        this.CODE.push({ op: "BRL", arg: LOOP_BEGIN_TAG });
        this.CODE.push({ op: "JMP", arg: LOOP_END_TAG });
        this.CODE.push({ op: "__TAG__", arg: LOOP_BEGIN_TAG });
        expr.body.forEach((e) => this.compileExpression(e, ctx, offset));
        this.CODE.push({ op: "JMP", arg: LOOP_TAG });
        this.CODE.push({ op: "__TAG__", arg: LOOP_END_TAG });
    }
    compileUnaryOperation(expr, ctx, offset) {
        this.compileExpression(expr.operand, ctx, offset);
        this.CODE.push({ op: "UOPL", arg: expr.operator });
    }
    compileBinaryOperation(expr, ctx, offset) {
        this.compileExpression(expr.left, ctx, offset);
        this.CODE.push({ op: "SLD", arg: offset });
        this.compileExpression(expr.right, ctx, offset + 1);
        this.CODE.push({ op: "SWP" });
        this.CODE.push({ op: "LLD", arg: offset });
        this.CODE.push({ op: "BOPL", arg: expr.operator });
    }
    compileApplication(expr, ctx, offset) {
        if (!this.functions.has(expr.name))
            throw new Error(`Reference Error: function ${expr.name} not found`);
        const length = this.functions.get(expr.name).length;
        if (expr.args.length != length)
            throw new Error(`${length} args expected, ${expr.args.length} given`);
        expr.args.forEach((arg, i) => {
            this.compileExpression(arg, ctx, offset + i);
            this.CODE.push({ op: "SLD", arg: offset + i });
        });
        for (let i of expr.args.keys()) {
            this.CODE.push({ op: "LLD", arg: offset + i });
            this.CODE.push({ op: "SLD", arg: ctx.tmpStart + ctx.tmpSize + 3 + i });
        }
        this.CODE.push({ op: "CALL", arg: expr.name });
        this.CODE.push({ op: "LLD", arg: ctx.tmpStart + ctx.tmpSize });
    }
    allocateFrame(fn) {
        const ctx = new Context();
        for (const name of fn.params) {
            ctx.local.set(name, ctx.tmpStart++);
        }
        function allocate(expr) {
            switch (expr.type) {
                case "DECLARATION":
                    ctx.local.set(expr.name, ctx.tmpStart++);
                    return allocate(expr.value);
                case "ASSIGNMENT":
                    return allocate(expr.value);
                case "CONDITIONAL":
                    return Math.max(allocate(expr.condition), ...expr.ifBranch.map(allocate), ...expr.elseBranch.map(allocate));
                case "LOOP":
                    return Math.max(allocate(expr.condition), ...expr.body.map(allocate));
                case "UNARY_OPERATION":
                    return allocate(expr.operand);
                case "BINARY_OPERATION":
                    return Math.max(allocate(expr.left), 1 + allocate(expr.right));
                case "APPLICATION":
                    return Math.max(...expr.args.map((e, i) => allocate(e) + i));
                default:
                    return 0;
            }
        }
        ctx.tmpSize = Math.max(...fn.body.map(allocate));
        return ctx;
    }
}
class Context {
    constructor() {
        this.local = new Map();
        this.tmpStart = 1;
        this.tmpSize = 0;
    }
}
function parse(s) {
    const tokens = new Tokenizer(s);
    const res = [];
    let expr = null;
    while ((expr = parseFunction() || parseDeclaration())) {
        res.push(expr);
    }
    if (!tokens.finished)
        throw `failed to parse @ ${tokens.i}-th token`;
    return res;
    function parseExpression() {
        return (parseLiteral() ||
            parseSymbol() ||
            parseReference() ||
            parseUnaryOperation() ||
            parseBinaryOperation() ||
            parseDeclaration() ||
            parseAssignment() ||
            parseConditional() ||
            parseLoop() ||
            parseApplication());
    }
    function parseLiteral() {
        const j = tokens.i;
        try {
            const value = tokens.next();
            if (typeof value != "number")
                throw 0;
            return {
                type: "LITERAL",
                value,
            };
        }
        catch (_a) {
            tokens.i = j;
            return null;
        }
    }
    function parseSymbol() {
        const j = tokens.i;
        try {
            const name = tokens.next();
            if (typeof name != "string")
                throw 0;
            if (!name.startsWith("@"))
                throw 0;
            return {
                type: "SYMBOL",
                name: name.slice(1),
            };
        }
        catch (_a) {
            tokens.i = j;
            return null;
        }
    }
    function parseDeclaration() {
        const j = tokens.i;
        try {
            if (tokens.next() != LEFT)
                throw 0;
            if (tokens.next() != "INIT")
                throw 0;
            const name = tokens.next();
            if (typeof name != "string")
                throw 0;
            if (name.startsWith("@") || name.startsWith("*"))
                throw 0;
            const value = parseExpression();
            if (!value)
                throw 0;
            if (tokens.next() != RIGHT)
                throw 0;
            return {
                type: "DECLARATION",
                name,
                value,
            };
        }
        catch (_a) {
            tokens.i = j;
            return null;
        }
    }
    function parseReference() {
        const j = tokens.i;
        try {
            const name = tokens.next();
            if (typeof name != "string")
                throw 0;
            if (name.startsWith("@"))
                throw 0;
            return {
                type: "REFERENCE",
                indirect: name.startsWith("*"),
                name: name.startsWith("*") ? name.slice(1) : name,
            };
        }
        catch (_a) {
            tokens.i = j;
            return null;
        }
    }
    function parseAssignment() {
        const j = tokens.i;
        try {
            if (tokens.next() != LEFT)
                throw 0;
            if (tokens.next() != "SET")
                throw 0;
            const name = tokens.next();
            if (typeof name != "string")
                throw 0;
            if (name.startsWith("@"))
                throw 0;
            const value = parseExpression();
            if (!value)
                throw 0;
            if (tokens.next() != RIGHT)
                throw 0;
            return {
                type: "ASSIGNMENT",
                indirect: name.startsWith("*"),
                name: name.startsWith("*") ? name.slice(1) : name,
                value,
            };
        }
        catch (_a) {
            tokens.i = j;
            return null;
        }
    }
    function parseSequence() {
        const res = [];
        let expr = null;
        while ((expr = parseExpression()))
            res.push(expr);
        return res;
    }
    function parseBlock() {
        const j = tokens.i;
        try {
            if (tokens.next() != LEFT)
                throw 0;
            const res = parseSequence();
            if (tokens.next() != RIGHT)
                throw 0;
            return res;
        }
        catch (_a) {
            tokens.i = j;
            return null;
        }
    }
    function parseConditional() {
        const j = tokens.i;
        try {
            if (tokens.next() != LEFT)
                throw 0;
            if (tokens.next() != "IF")
                throw 0;
            const condition = parseExpression();
            if (!condition)
                throw 0;
            const ifBranch = parseBlock();
            if (!ifBranch)
                throw 0;
            const elseBranch = parseBlock();
            if (!elseBranch)
                throw 0;
            if (tokens.next() != RIGHT)
                throw 0;
            return {
                type: "CONDITIONAL",
                condition,
                ifBranch,
                elseBranch,
            };
        }
        catch (_a) {
            tokens.i = j;
            return null;
        }
    }
    function parseLoop() {
        const j = tokens.i;
        try {
            if (tokens.next() != LEFT)
                throw 0;
            if (tokens.next() != "WHILE")
                throw 0;
            const condition = parseExpression();
            if (!condition)
                throw 0;
            const body = parseSequence();
            if (!body)
                throw 0;
            if (tokens.next() != RIGHT)
                throw 0;
            return {
                type: "LOOP",
                condition,
                body,
            };
        }
        catch (_a) {
            tokens.i = j;
            return null;
        }
    }
    function parseUnaryOperation() {
        const j = tokens.i;
        try {
            if (tokens.next() != LEFT)
                throw 0;
            const operator = tokens.next();
            if (typeof operator != "string")
                throw 0;
            if (!(operator in UNARY_OPERATOR))
                throw 0;
            const operand = parseExpression();
            if (!operand)
                throw 0;
            if (tokens.next() != RIGHT)
                throw 0;
            return {
                type: "UNARY_OPERATION",
                operator: operator,
                operand,
            };
        }
        catch (_a) {
            tokens.i = j;
            return null;
        }
    }
    function parseBinaryOperation() {
        const j = tokens.i;
        try {
            if (tokens.next() != LEFT)
                throw 0;
            const operator = tokens.next();
            if (typeof operator != "string")
                throw 0;
            if (!(operator in BINARY_OPERATOR))
                throw 0;
            const left = parseExpression();
            if (!left)
                throw 0;
            const right = parseExpression();
            if (!right)
                throw 0;
            if (tokens.next() != RIGHT)
                throw 0;
            return {
                type: "BINARY_OPERATION",
                operator: operator,
                left,
                right,
            };
        }
        catch (_a) {
            tokens.i = j;
            return null;
        }
    }
    function parseFunction() {
        const j = tokens.i;
        try {
            if (tokens.next() != LEFT)
                throw 0;
            if (tokens.next() != "FUNC")
                throw 0;
            const name = tokens.next();
            if (typeof name != "string")
                throw 0;
            if (tokens.next() != LEFT)
                throw 0;
            const params = [];
            let t;
            while ((t = parseReference())) {
                if (t.indirect)
                    throw 0;
                params.push(t.name);
            }
            if (tokens.next() != RIGHT)
                throw 0;
            const body = parseSequence();
            if (tokens.next() != RIGHT)
                throw 0;
            return {
                type: "FUNCTION",
                name,
                params,
                body,
            };
        }
        catch (_a) {
            tokens.i = j;
            return null;
        }
    }
    function parseApplication() {
        const j = tokens.i;
        try {
            if (tokens.next() != LEFT)
                throw 0;
            const name = tokens.next();
            if (typeof name != "string")
                throw 0;
            if (name.startsWith("*") || name.startsWith("@"))
                throw 0;
            if (name in UNARY_OPERATOR || name in BINARY_OPERATOR)
                throw 0;
            const args = [];
            let expr = null;
            while ((expr = parseExpression()))
                args.push(expr);
            if (tokens.next() != RIGHT)
                throw 0;
            return {
                type: "APPLICATION",
                name,
                args,
            };
        }
        catch (_a) {
            tokens.i = j;
            return null;
        }
    }
}
class Tokenizer {
    constructor(s) {
        this.tokens = [];
        this.i = 0;
        let i = 0;
        const whitespace = () => {
            const reg = /\s*/y;
            reg.lastIndex = i;
            reg.exec(s);
            i = reg.lastIndex;
        };
        const addToken = () => {
            const reg = /[^\s)]*/y;
            reg.lastIndex = i;
            const match = reg.exec(s);
            const n = Number(match[0]);
            this.tokens.push(Number.isNaN(n) ? match[0] : n);
            i = reg.lastIndex;
        };
        while (1) {
            whitespace();
            if (i == s.length)
                break;
            if (s[i] == "(") {
                this.tokens.push(LEFT);
                ++i;
            }
            else if (s[i] == ")") {
                this.tokens.push(RIGHT);
                ++i;
            }
            else {
                addToken();
            }
        }
    }
    get finished() {
        return this.i == this.tokens.length;
    }
    next() {
        if (this.i == this.tokens.length)
            return null;
        return this.tokens[this.i++];
    }
}
