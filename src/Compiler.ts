import { assemble, AssemblyT, optimize } from "./Assembler.js";
import {
  BinaryOperatorT,
  BINARY_OPERATOR,
  UnaryOperatorT,
  UNARY_OPERATOR,
} from "./CPU.js";
import {
  ApplicationT,
  AssignmentT,
  BinaryOperationT,
  ConditionalT,
  DeclarationT,
  ExpressionT,
  FunctionMetadata,
  FunctionT,
  LEFT,
  LiteralT,
  LoopT,
  ProgramT,
  ReferenceT,
  RIGHT,
  SymbolT,
  TokenT,
  UnaryOperationT,
} from "./types.js";

export function compile(src: string): Array<number> {
  return new Compiler().compile(src);
}

class Compiler {
  private tagId = 0;
  private symbolId = 0;
  private global = new Set<string>();
  private functions = new Map<string, FunctionMetadata>();
  private DATA = Array<AssemblyT>();
  private CODE = Array<AssemblyT>();

  public compile(source: string): Array<number> {
    const ast = parse(source);
    this.compileGlobalDeclarations(ast);
    return assemble(
      optimize([
        { op: "CALL", arg: "main" },
        { op: "JMP", arg: -1 },
        ...this.CODE,
        ...this.DATA,
      ])
    );
  }

  private compileGlobalDeclarations(program: ProgramT) {
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

  private compileFunction(expr: FunctionT): void {
    const ctx = this.allocateFrame(expr);
    this.CODE.push({ op: "__VAL__", arg: ctx.tmpStart + ctx.tmpSize + 2 }); // stack size
    this.CODE.push({ op: "__TAG__", arg: expr.name });
    expr.body.forEach((expr) => {
      this.compileExpression(expr, ctx, ctx.tmpStart);
    });
    this.CODE.push({ op: "SLD", arg: -2 });
    this.CODE.push({ op: "RET" });
  }

  private compileExpression(
    expr: ExpressionT,
    ctx: Context,
    offset: number
  ): void {
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

  private compileLiteral(expr: LiteralT): void {
    const name = "__LITERAL__" + expr.value;
    if (!this.global.has(name)) {
      this.global.add(name);
      this.DATA.push({ op: "__TAG__", arg: name });
      this.DATA.push({ op: "__VAL__", arg: expr.value });
    }
    this.CODE.push({ op: "LLS", arg: name });
  }

  private compileSymbol(expr: SymbolT): void {
    const name = "__SYMBOL__" + expr.name;
    if (!this.global.has(name)) {
      this.global.add(name);
      this.DATA.push({ op: "__TAG__", arg: name });
      this.DATA.push({ op: "__VAL__", arg: this.symbolId++ });
    }
    this.CODE.push({ op: "LLS", arg: name });
  }

  private compileReference(expr: ReferenceT, ctx: Context): void {
    if (ctx.local.has(expr.name)) {
      this.CODE.push({
        op: expr.indirect ? "LLDI" : "LLD",
        arg: ctx.local.get(expr.name)!,
      });
    } else if (this.global.has(expr.name)) {
      this.CODE.push({
        op: expr.indirect ? "LLSI" : "LLS",
        arg: expr.name,
      });
    } else {
      throw new Error(`Reference Error ${expr.name}`);
    }
  }

  private compileLocalDeclaration(
    expr: DeclarationT,
    ctx: Context,
    offset: number
  ): void {
    this.compileExpression(expr.value, ctx, offset);
    this.CODE.push({ op: "SLD", arg: ctx.local.get(expr.name)! });
  }

  private compileAssignment(
    expr: AssignmentT,
    ctx: Context,
    offset: number
  ): void {
    this.compileExpression(expr.value, ctx, offset);
    if (ctx.local.has(expr.name)) {
      this.CODE.push({
        op: expr.indirect ? "SLDI" : "SLD",
        arg: ctx.local.get(expr.name)!,
      });
    } else if (this.global.has(expr.name)) {
      this.CODE.push({
        op: expr.indirect ? "SLSI" : "SLS",
        arg: expr.name,
      });
    } else {
      throw new Error(`Reference Error ${expr.name}`);
    }
  }

  private compileConditional(
    expr: ConditionalT,
    ctx: Context,
    offset: number
  ): void {
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

  private compileLoop(expr: LoopT, ctx: Context, offset: number): void {
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

  private compileUnaryOperation(
    expr: UnaryOperationT,
    ctx: Context,
    offset: number
  ): void {
    this.compileExpression(expr.operand, ctx, offset);
    this.CODE.push({ op: "UOPL", arg: expr.operator });
  }

  private compileBinaryOperation(
    expr: BinaryOperationT,
    ctx: Context,
    offset: number
  ): void {
    this.compileExpression(expr.left, ctx, offset);
    this.CODE.push({ op: "SLD", arg: offset });
    this.compileExpression(expr.right, ctx, offset + 1);
    this.CODE.push({ op: "SWP" });
    this.CODE.push({ op: "LLD", arg: offset });
    this.CODE.push({ op: "BOPL", arg: expr.operator });
  }

  private compileApplication(
    expr: ApplicationT,
    ctx: Context,
    offset: number
  ): void {
    if (!this.functions.has(expr.name))
      throw new Error(`Reference Error: function ${expr.name} not found`);
    const length = this.functions.get(expr.name)!.length;
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

  private allocateFrame(fn: FunctionT): Context {
    const ctx = new Context();
    for (const name of fn.params) {
      ctx.local.set(name, ctx.tmpStart++);
    }
    function allocate(expr: ExpressionT): number {
      switch (expr.type) {
        case "DECLARATION":
          ctx.local.set(expr.name, ctx.tmpStart++);
          return allocate(expr.value);
        case "ASSIGNMENT":
          return allocate(expr.value);
        case "CONDITIONAL":
          return Math.max(
            allocate(expr.condition),
            ...expr.ifBranch.map(allocate),
            ...expr.elseBranch.map(allocate)
          );
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
  public local = new Map<string, number>();
  public tmpStart: number = 1;
  public tmpSize: number = 0;
}

function parse(s: string): ProgramT {
  const tokens = new Tokenizer(s);

  const res: ProgramT = [];
  let expr: FunctionT | DeclarationT | null = null;
  while ((expr = parseFunction() || parseDeclaration())) {
    res.push(expr);
  }
  if (!tokens.finished) throw `failed to parse @ ${tokens.i}-th token`;
  return res;

  function parseExpression(): ExpressionT | null {
    return (
      parseLiteral() ||
      parseSymbol() ||
      parseReference() ||
      parseUnaryOperation() ||
      parseBinaryOperation() ||
      parseDeclaration() ||
      parseAssignment() ||
      parseConditional() ||
      parseLoop() ||
      parseApplication()
    );
  }

  function parseLiteral(): LiteralT | null {
    const j = tokens.i;
    try {
      const value = tokens.next();
      if (typeof value != "number") throw 0;
      return {
        type: "LITERAL",
        value,
      };
    } catch {
      tokens.i = j;
      return null;
    }
  }

  function parseSymbol(): SymbolT | null {
    const j = tokens.i;
    try {
      const name = tokens.next();
      if (typeof name != "string") throw 0;
      if (!name.startsWith("@")) throw 0;
      return {
        type: "SYMBOL",
        name: name.slice(1),
      };
    } catch {
      tokens.i = j;
      return null;
    }
  }

  function parseDeclaration(): DeclarationT | null {
    const j = tokens.i;
    try {
      if (tokens.next() != LEFT) throw 0;
      if (tokens.next() != "INIT") throw 0;
      const name = tokens.next();
      if (typeof name != "string") throw 0;
      if (name.startsWith("@") || name.startsWith("*")) throw 0;
      const value = parseExpression();
      if (!value) throw 0;
      if (tokens.next() != RIGHT) throw 0;
      return {
        type: "DECLARATION",
        name,
        value,
      };
    } catch {
      tokens.i = j;
      return null;
    }
  }

  function parseReference(): ReferenceT | null {
    const j = tokens.i;
    try {
      const name = tokens.next();
      if (typeof name != "string") throw 0;
      if (name.startsWith("@")) throw 0;
      return {
        type: "REFERENCE",
        indirect: name.startsWith("*"),
        name: name.startsWith("*") ? name.slice(1) : name,
      };
    } catch {
      tokens.i = j;
      return null;
    }
  }

  function parseAssignment(): AssignmentT | null {
    const j = tokens.i;
    try {
      if (tokens.next() != LEFT) throw 0;
      if (tokens.next() != "SET") throw 0;
      const name = tokens.next();
      if (typeof name != "string") throw 0;
      if (name.startsWith("@")) throw 0;
      const value = parseExpression();
      if (!value) throw 0;
      if (tokens.next() != RIGHT) throw 0;
      return {
        type: "ASSIGNMENT",
        indirect: name.startsWith("*"),
        name: name.startsWith("*") ? name.slice(1) : name,
        value,
      };
    } catch {
      tokens.i = j;
      return null;
    }
  }

  function parseSequence(): Array<ExpressionT> {
    const res: Array<ExpressionT> = [];
    let expr: ExpressionT | null = null;
    while ((expr = parseExpression())) res.push(expr);
    return res;
  }

  function parseBlock(): Array<ExpressionT> | null {
    const j = tokens.i;
    try {
      if (tokens.next() != LEFT) throw 0;
      const res = parseSequence();
      if (tokens.next() != RIGHT) throw 0;
      return res;
    } catch {
      tokens.i = j;
      return null;
    }
  }

  function parseConditional(): ConditionalT | null {
    const j = tokens.i;
    try {
      if (tokens.next() != LEFT) throw 0;
      if (tokens.next() != "IF") throw 0;
      const condition = parseExpression();
      if (!condition) throw 0;
      const ifBranch = parseBlock();
      if (!ifBranch) throw 0;
      const elseBranch = parseBlock();
      if (!elseBranch) throw 0;
      if (tokens.next() != RIGHT) throw 0;
      return {
        type: "CONDITIONAL",
        condition,
        ifBranch,
        elseBranch,
      };
    } catch {
      tokens.i = j;
      return null;
    }
  }

  function parseLoop(): LoopT | null {
    const j = tokens.i;
    try {
      if (tokens.next() != LEFT) throw 0;
      if (tokens.next() != "WHILE") throw 0;
      const condition = parseExpression();
      if (!condition) throw 0;
      const body = parseSequence();
      if (!body) throw 0;
      if (tokens.next() != RIGHT) throw 0;
      return {
        type: "LOOP",
        condition,
        body,
      };
    } catch {
      tokens.i = j;
      return null;
    }
  }

  function parseUnaryOperation(): UnaryOperationT | null {
    const j = tokens.i;
    try {
      if (tokens.next() != LEFT) throw 0;
      const operator = tokens.next();
      if (typeof operator != "string") throw 0;
      if (!(operator in UNARY_OPERATOR)) throw 0;
      const operand = parseExpression();
      if (!operand) throw 0;
      if (tokens.next() != RIGHT) throw 0;
      return {
        type: "UNARY_OPERATION",
        operator: operator as keyof UnaryOperatorT,
        operand,
      };
    } catch {
      tokens.i = j;
      return null;
    }
  }

  function parseBinaryOperation(): BinaryOperationT | null {
    const j = tokens.i;
    try {
      if (tokens.next() != LEFT) throw 0;
      const operator = tokens.next();
      if (typeof operator != "string") throw 0;
      if (!(operator in BINARY_OPERATOR)) throw 0;
      const left = parseExpression();
      if (!left) throw 0;
      const right = parseExpression();
      if (!right) throw 0;
      if (tokens.next() != RIGHT) throw 0;
      return {
        type: "BINARY_OPERATION",
        operator: operator as keyof BinaryOperatorT,
        left,
        right,
      };
    } catch {
      tokens.i = j;
      return null;
    }
  }

  function parseFunction(): FunctionT | null {
    const j = tokens.i;
    try {
      if (tokens.next() != LEFT) throw 0;
      if (tokens.next() != "FUNC") throw 0;
      const name = tokens.next();
      if (typeof name != "string") throw 0;
      if (tokens.next() != LEFT) throw 0;
      const params: Array<string> = [];
      let t: ExpressionT | null;
      while ((t = parseReference())) {
        if (t.indirect) throw 0;
        params.push(t.name);
      }
      if (tokens.next() != RIGHT) throw 0;
      const body = parseSequence();
      if (tokens.next() != RIGHT) throw 0;
      return {
        type: "FUNCTION",
        name,
        params,
        body,
      };
    } catch {
      tokens.i = j;
      return null;
    }
  }

  function parseApplication(): ApplicationT | null {
    const j = tokens.i;
    try {
      if (tokens.next() != LEFT) throw 0;
      const name = tokens.next();
      if (typeof name != "string") throw 0;
      if (name.startsWith("*") || name.startsWith("@")) throw 0;
      if (name in UNARY_OPERATOR || name in BINARY_OPERATOR) throw 0;
      const args: Array<ExpressionT> = [];
      let expr: ExpressionT | null = null;
      while ((expr = parseExpression())) args.push(expr);
      if (tokens.next() != RIGHT) throw 0;
      return {
        type: "APPLICATION",
        name,
        args,
      };
    } catch {
      tokens.i = j;
      return null;
    }
  }
}

class Tokenizer {
  private tokens: Array<TokenT> = [];
  public i = 0;

  public constructor(s: string) {
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
      const match = reg.exec(s)!;
      const n = Number(match[0]);
      this.tokens.push(Number.isNaN(n) ? match[0] : n);
      i = reg.lastIndex;
    };
    while (1) {
      whitespace();
      if (i == s.length) break;
      if (s[i] == "(") {
        this.tokens.push(LEFT);
        ++i;
      } else if (s[i] == ")") {
        this.tokens.push(RIGHT);
        ++i;
      } else {
        addToken();
      }
    }
  }

  public get finished(): boolean {
    return this.i == this.tokens.length;
  }

  public next(): TokenT | null {
    if (this.i == this.tokens.length) return null;
    return this.tokens[this.i++];
  }
}
