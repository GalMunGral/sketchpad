import { assemble } from "./Assembler.js";
import { B, U } from "./CPU.js";
import { $ } from "./Symbols.js";

export function compile(source) {
  let tag_id = 0;
  let symbol_id = 0x80000000;
  const symbols = {};
  const global_vars = {};
  const functions = {};
  const data_section = [];
  const code_section = [];

  const ast = parse(source);

  for (const expr of ast) {
    switch (expr[0]) {
      case $.FUNC:
        if (expr.length < 4) throw new Error("Syntax Error [FUNC]");
        if (expr[1] in global_vars)
          throw new Error("function already declared");
        functions[expr[1]] = {
          n_params: expr[2].length,
        };
        break;
      case $.INIT:
        if (expr.length < 2 || expr.length > 3)
          throw new Error("Syntax Error [VAR]");
        if (expr[1] in global_vars)
          throw new Error("variable already declared");
        const initializer = expr.length == 3 ? expr[2] : 0;
        if (typeof initializer != "number")
          throw new Error("Must be constant literal");
        global_vars[expr[1]] = 1;
        data_section.push([expr[1]]);
        data_section.push([initializer]);
        break;
      default:
        throw new Error("declaration expected");
    }
  }

  ast.forEach((expr) => {
    if (expr[0] == $.FUNC) compile_func(expr);
  });

  const asm = [
    [$.call, "main"],
    [$.jmp, -1],
    ...optimize(code_section),
    ...data_section,
  ];

  const bin = assemble(asm);

  return {
    ast,
    asm,
    bin,
  };

  function parse(s) {
    let i = 0;
    const res = [];

    let expr;
    consume_whitespace();
    while ((expr = parse_expression())) {
      res.push(expr);
    }
    return res;

    function consume_whitespace() {
      while (i < s.length && /\s/.test(s[i])) ++i;
    }

    function parse_word() {
      let j = i;
      while (i < s.length && /\S/.test(s[i]) && s[i] != ")") ++i;
      const w = s.slice(j, i);
      consume_whitespace();
      return /\d/.test(w[0]) ? Number(w) : w in $ ? $[w] : w;
    }

    function parse_list() {
      if (s[i] != "(") return null;
      ++i;
      consume_whitespace();
      const res = [];
      while (s[i] != ")") {
        res.push(parse_expression());
        consume_whitespace();
      }
      ++i;
      consume_whitespace();
      return res;
    }

    function parse_expression() {
      return parse_list() || parse_word();
    }
  }

  function optimize(code) {
    const res = [code[0]];
    for (let i = 1; i < code.length; ++i) {
      if (
        ((code[i - 1][0] == $.sls && code[i][0] == $.lls) ||
          (code[i - 1][0] == $.srs && code[i][0] == $.lrs) ||
          (code[i - 1][0] == $.slsi && code[i][0] == $.llsi) ||
          (code[i - 1][0] == $.srsi && code[i][0] == $.lrsi) ||
          (code[i - 1][0] == $.sld && code[i][0] == $.lld) ||
          (code[i - 1][0] == $.sld && code[i][0] == $.lrd) ||
          (code[i - 1][0] == $.sldi && code[i][0] == $.lldi) ||
          (code[i - 1][0] == $.srdi && code[i][0] == $.lrdi)) &&
        code[i - 1][1] == code[i][1]
      ) {
        continue;
      }
      res.push(code[i]);
    }
    return res;
  }

  function alloc_stack(defn) {
    const [, , params, ...body] = defn;

    let i = 1 + params.length;
    let j = 1 + params.length;

    const local_vars = {};
    for (const [i, name] of params.entries()) {
      local_vars[name] = i + 1; // starts from 1
    }

    body.forEach(check);

    return { local_vars, i, j };

    function check(expr) {
      if (!Array.isArray(expr)) return;
      if (!expr.length) throw new Error("empty list");
      switch (expr[0]) {
        case $.FUNC:
          throw new Error("FUNCTION cannot be nested");
        case $.INIT:
          if (expr.length < 2 || expr.length > 3) {
            throw new Error("Syntax error [INIT]");
          }
          local_vars[expr[1]] = i;
          ++i;
          ++j;
          if (expr.length == 3) check(expr[2]);
          break;
        case $.SET:
          if (expr.length != 3) {
            throw new Error("Syntax error [SET]");
          }
          check(expr[2]);
          break;
        case $.IF:
          if (expr.length != 4) {
            throw new Error("Syntax error [IF]");
          }
          check(expr[1]);
          expr[2].forEach(check);
          expr[3].forEach(check);
          break;
        case $.WHILE:
          if (expr.length < 3) {
            throw new Error("Syntax error [WHILE]");
          }
          expr.slice(1).forEach(check);
          break;
        default:
          j = Math.max(j, i + expr.length - 1);
          expr.slice(1).forEach(check);
      }
    }
  }

  function compile_func(defn) {
    const [, name, , ...body] = defn;
    const { local_vars, i, j } = alloc_stack(defn);

    code_section.push([j]); // stack size
    code_section.push([name]);
    body.forEach((expr) => compile_expression(expr, i + 1));
    code_section.push([$.sld, -2]);
    code_section.push([$.ret]);

    function compile_literal(num) {
      num |= 0;
      const name = "literal-" + String(num);
      if (!(name in global_vars)) {
        global_vars[name] = 1;
        data_section.push([name]);
        data_section.push([num]);
      }
      code_section.push([$.lls, name]);
    }

    function compile_reference(name) {
      let indirect = false;
      if (name[0] == "*") {
        indirect = true;
        name = name.slice(1);
      }
      if (name in local_vars) {
        code_section.push([indirect ? $.lldi : $.lld, local_vars[name]]);
      } else if (name in global_vars) {
        code_section.push([indirect ? $.llsi : $.lls, name]);
      } else {
        throw new Error(`Reference Error ${name}`);
      }
    }

    function compile_assignment(expr, k) {
      let [_, name, value] = expr;
      let indirect = false;
      if (name[0] == "*") {
        indirect = true;
        name = name.slice(1);
      }
      compile_expression(value, k);
      if (name in local_vars) {
        code_section.push([indirect ? $.sldi : $.sld, local_vars[name]]);
      } else if (name in global_vars) {
        code_section.push([indirect ? $.slsi : $.sls, name]);
      } else {
        throw new Error(`Reference Error ${name}`);
      }
    }

    function compile_conditional(expr, k) {
      const [, condition, if_branch, else_branch] = expr;
      const IF_TAG = "IF-" + tag_id++;
      const IF_END_TAG = "IF-END-" + tag_id++;
      compile_expression(condition, k);
      code_section.push([$.brl, IF_TAG]);
      else_branch.forEach((e) => compile_expression(e, k));
      code_section.push([$.jmp, IF_END_TAG]);
      code_section.push([IF_TAG]);
      if_branch.forEach((e) => compile_expression(e, k));
      code_section.push([IF_END_TAG]);
    }

    function compile_loop(expr, k) {
      const [, condition, ...body] = expr;
      const LOOP_TAG = "LOOP-" + tag_id++;
      const LOOP_BEGIN_TAG = "LOOP-BEGIN-" + tag_id++;
      const LOOP_END_TAG = "LOOP-END-" + tag_id++;
      code_section.push([LOOP_TAG]);
      compile_expression(condition, k);
      code_section.push([$.brl, LOOP_BEGIN_TAG]);
      code_section.push([$.jmp, LOOP_END_TAG]);
      code_section.push([LOOP_BEGIN_TAG]);
      body.forEach((e) => compile_expression(e, k));
      code_section.push([$.jmp, LOOP_TAG]);
      code_section.push([LOOP_END_TAG]);
    }

    function compile_unary_op(expr, k) {
      if (expr.length != 2) throw new Error("unary");
      compile_expression(expr[1], k);
      code_section.push([$.unopl, expr[0]]);
    }

    function compile_binary_op(expr, k) {
      if (expr.length != 3) throw new Error("binary");
      compile_expression(expr[1], k);
      code_section.push([$.sld, k]);
      compile_expression(expr[2], k + 1);
      code_section.push([$.swp]);
      code_section.push([$.lld, k]);
      code_section.push([$.binopl, expr[0]]);
    }

    function compile_application(expr, k) {
      const [name, ...args] = expr;
      if (name in U) {
        compile_unary_op(expr, k);
      } else if (name in B) {
        compile_binary_op(expr, k);
      } else {
        args.forEach((arg, i) => {
          compile_expression(arg, k + i);
          code_section.push([$.sld, k + i]);
        });
        for (let i = 0; i < args.length; ++i) {
          code_section.push([$.lld, k + i]);
          code_section.push([$.sld, 1 + j + 3 + i]);
        }
        if (!(name in functions)) {
          throw new Error(`Reference Error: function ${name} not found`);
        }
        code_section.push([$.call, name]);
        code_section.push([$.lld, j + 1]);
      }
    }

    function compile_expression(expr, k) {
      switch (typeof expr) {
        case "number":
          return compile_literal(expr);
        case "string":
          if (expr[0] == "@") {
            if (!(expr in symbols)) symbols[expr] = symbol_id++;
            return compile_literal(symbols[expr]);
          }
          return compile_reference(expr);
        default:
          switch (expr[0]) {
            case $.INIT:
            case $.SET:
              compile_assignment(expr, k);
              break;
            case $.IF:
              compile_conditional(expr, k);
              break;
            case $.WHILE:
              compile_loop(expr, k);
              break;
            default:
              compile_application(expr, k);
          }
      }
    }
  }
}
