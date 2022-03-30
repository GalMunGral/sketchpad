import { B, S, U } from "./CPU.js";

export const FUNCTION = Symbol("FUNCTION");
export const INIT = Symbol("INIT");
export const SET = Symbol("SET");
export const IF = Symbol("IF");
export const WHILE = Symbol("WHILE");

export function compile(program) {
  let tag_id = 0;
  let symbol_id = 0x80000000;
  const symbols = {};
  const global_vars = {};
  const functions = {};
  const data_section = [];
  const code_section = [];

  for (const expr of program) {
    switch (expr[0]) {
      case FUNCTION:
        if (expr.length != 4) throw new Error("Syntax Error [FUNC]");
        if (expr[1] in global_vars)
          throw new Error("function already declared");
        functions[expr[1]] = {
          n_params: expr[2].length,
        };
        break;
      case INIT:
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

  program.forEach((expr) => {
    if (expr[0] == FUNCTION) compile_func(expr);
  });

  return [
    [S.call, "main"],
    [S.jmp, -1],
    ...optimize(code_section),
    ...data_section,
  ];

  function optimize(code) {
    const res = [code[0]];
    for (let i = 1; i < code.length; ++i) {
      if (
        ((code[i - 1][0] == S.sls && code[i][0] == S.lls) ||
          (code[i - 1][0] == S.srs && code[i][0] == S.lrs) ||
          (code[i - 1][0] == S.slsi && code[i][0] == S.llsi) ||
          (code[i - 1][0] == S.srsi && code[i][0] == S.lrsi) ||
          (code[i - 1][0] == S.sld && code[i][0] == S.lld) ||
          (code[i - 1][0] == S.sld && code[i][0] == S.lrd) ||
          (code[i - 1][0] == S.sldi && code[i][0] == S.lldi) ||
          (code[i - 1][0] == S.srdi && code[i][0] == S.lrdi)) &&
        code[i - 1][1] == code[i][1]
      ) {
        continue;
      }
      res.push(code[i]);
    }
    return res;
  }

  function alloc_stack(defn) {
    const [, , params, body] = defn;

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
        case FUNCTION:
          throw new Error("FUNCTION cannot be nested");
        case INIT:
          if (expr.length < 2 || expr.length > 3) {
            throw new Error("Syntax error [INIT]");
          }
          local_vars[expr[1]] = i;
          ++i;
          ++j;
          if (expr.length == 3) check(expr[2]);
          break;
        case SET:
          if (expr.length != 3) {
            throw new Error("Syntax error [SET]");
          }
          check(expr[2]);
          break;
        case IF:
          if (expr.length != 4) {
            throw new Error("Syntax error [IF]");
          }
          check(expr[1]);
          expr[2].forEach(check);
          expr[3].forEach(check);
        case WHILE:
          if (expr.length != 3) {
            throw new Error("Syntax error [WHILE]");
          }
          check(expr[1]);
          expr[2].forEach(check);
        default:
          j = Math.max(j, i + expr.length - 1);
          expr.slice(1).forEach(check);
      }
    }
  }

  function compile_func(defn) {
    const [, name, params, body] = defn;
    const { local_vars, i, j } = alloc_stack(defn);

    code_section.push([j]); // stack size
    code_section.push([name]);
    body.forEach((expr) => compile_expression(expr, i + 1));
    code_section.push([S.sld, -2]);
    code_section.push([S.ret]);

    function compile_literal(num) {
      num |= 0;
      const name = "literal-" + String(num);
      if (!(name in global_vars)) {
        global_vars[name] = 1;
        data_section.push([name]);
        data_section.push([num]);
      }
      code_section.push([S.lls, name]);
    }

    function compile_reference(name) {
      let indirect = false;
      if (name[0] == "*") {
        indirect = true;
        name = name.slice(1);
      }
      if (name in local_vars) {
        code_section.push([indirect ? S.lldi : S.lld, local_vars[name]]);
      } else if (name in global_vars) {
        code_section.push([indirect ? S.llsi : S.lls, name]);
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
        code_section.push([indirect ? S.sldi : S.sld, local_vars[name]]);
      } else if (name in global_vars) {
        code_section.push([indirect ? S.slsi : S.sls, name]);
      } else {
        throw new Error(`Reference Error ${name}`);
      }
    }

    function compile_conditional(expr, k) {
      const [, condition, if_branch, else_branch] = expr;
      const IF_TAG = "IF-" + tag_id++;
      const IF_END_TAG = "IF-END-" + tag_id++;
      compile_expression(condition, k);
      code_section.push([S.brl, IF_TAG]);
      else_branch.forEach((e) => compile_expression(e, k));
      code_section.push([S.jmp, IF_END_TAG]);
      code_section.push([IF_TAG]);
      if_branch.forEach((e) => compile_expression(e, k));
      code_section.push([IF_END_TAG]);
    }

    function compile_loop(expr, k) {
      const [, condition, body] = expr;
      const LOOP_TAG = "LOOP-" + tag_id++;
      const LOOP_BEGIN_TAG = "LOOP-BEGIN-" + tag_id++;
      const LOOP_END_TAG = "LOOP-END-" + tag_id++;
      code_section.push([LOOP_TAG]);
      compile_expression(condition, k);
      code_section.push([S.brl, LOOP_BEGIN_TAG]);
      code_section.push([S.jmp, LOOP_END_TAG]);
      code_section.push([LOOP_BEGIN_TAG]);
      body.forEach((e) => compile_expression(e, k));
      code_section.push([S.jmp, LOOP_TAG]);
      code_section.push([LOOP_END_TAG]);
    }

    function compile_unary_op(expr, k) {
      if (expr.length != 2) throw new Error("unary");
      compile_expression(expr[1], k);
      code_section.push([S.unopl, expr[0]]);
    }

    function compile_binary_op(expr, k) {
      if (expr.length != 3) throw new Error("binary");
      compile_expression(expr[1], k);
      code_section.push([S.sld, k]);
      compile_expression(expr[2], k + 1);
      code_section.push([S.swp]);
      code_section.push([S.lld, k]);
      code_section.push([S.binopl, expr[0]]);
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
          code_section.push([S.sld, k + i]);
        });
        for (let i = 0; i < args.length; ++i) {
          code_section.push([S.lld, k + i]);
          code_section.push([S.sld, 1 + j + 3 + i]);
        }
        code_section.push([S.call, name]);
        code_section.push([S.lld, j + 1]);
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
            case INIT:
            case SET:
              compile_assignment(expr, k);
              break;
            case IF:
              compile_conditional(expr, k);
              break;
            case WHILE:
              compile_loop(expr, k);
              break;
            default:
              compile_application(expr, k);
          }
      }
    }
  }
}
