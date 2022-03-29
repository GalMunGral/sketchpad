import { B, op, U } from "./CPU.js";

export function compile(program) {
  const global_vars = {};
  const functions = {};
  const data_section = [];
  const code_section = [];
  let tag_id = 0;

  for (const expr of program) {
    switch (expr[0]) {
      case "FUNC":
        if (expr.length != 4) throw new Error("Syntax Error [FUNC]");
        if (expr[1] in global_vars)
          throw new Error("function already declared");
        functions[expr[1]] = {
          n_params: expr[2].length,
        };
        break;
      case "VAR":
        if (expr.length != 2) throw new Error("Syntax Error [VAR]");
        if (expr[1] in global_vars)
          throw new Error("variable already declared");
        global_vars[expr[1]] = 1;
        data_section.push([expr[1]]);
        data_section.push([0]);
        break;
      default:
        throw new Error("declaration expected");
    }
  }

  program.forEach((expr) => {
    if (expr[0] == "FUNC") compile_func(expr);
  });

  return [[op.jmp, "main"], ...code_section, ...data_section];

  function alloc_stack(defn) {
    const [, , params, body] = defn;

    let i = 1 + params.length;
    let j = 1 + params.length;

    const local_vars = {};
    for (const [i, name] of params.entries()) {
      local_vars[name] = i;
    }

    body.forEach(check);

    return { local_vars, i, j };

    function check(expr) {
      if (!Array.isArray(expr)) return;
      if (!expr.length) throw new Error("empty list");
      switch (expr[0]) {
        case "FUNC":
          throw new Error("FUNC declaration must be global");
        case "VAR":
          if (expr.length != 2) throw new Error("Syntax error [VAR]");
          local_vars[expr[1]] = i;
          ++i;
          ++j;
          break;
        case "IF":
          if (expr.length != 4) throw new Error("Syntax error [IF]");
          traverse(expr[1]);
          expr[2].forEach(check);
          expr[3].forEach(check);
        case "SET":
          break;
        default:
          j = Math.max(j, i + expr.length - 1);
          expr.slice(1).forEach(check);
      }
    }
  }

  function compile_func(defn) {
    const { local_vars, i, j } = alloc_stack(defn);
    const [, name, , body] = defn;
    code_section.push([name]);
    body.forEach((expr) => compile_expression(expr, i));
    code_section.push([op.sld, -2]);

    function compile_literal(num) {
      num |= 0;
      const name = "literal-" + String(num);
      if (!(name in global_vars)) {
        global_vars[name] = 1;
        data_section.push([name]);
        data_section.push([num]);
      }
      code_section.push([op.lls, name]);
    }

    function compile_reference(name) {
      if (name in local_vars) {
        code_section.push([op.lld, local_vars[name]]);
      } else if (name in global_vars) {
        code_section.push([op.lls, name]);
      } else {
        throw new Error(`Reference Error ${name}`);
      }
    }

    function compile_assignment(expr, k) {
      const [_, name, value] = expr;
      compile_expression(value, k);
      if (name in local_vars) {
        code_section.push([op.sld, local_vars[name]]);
      } else if (name in global_vars) {
        code_section.push([op.sls, name]);
      } else {
        throw new Error(`Reference Error ${name}`);
      }
    }

    function compile_conditional(expr, k) {
      const [, condition, if_branch, else_branch] = expr;
      const if_tag = "IF-" + tag_id++;
      const if_end_tag = "IF-END-" + tag_id++;
      compile_expression(condition, k);
      code_section.push([op.brl, if_tag]);
      else_branch.forEach((e) => compile_expression(e, k));
      code_section.push([op.jmp, if_end_tag]);
      code_section.push([if_tag]);
      if_branch.forEach((e) => compile_expression(e, k));
      code_section.push([if_end_tag]);
    }

    function compile_unary_op(expr, k) {
      if (expr.length != 2) throw new Error("unary");
      compile_expression(expr[1], k);
      code_section.push([op.unopl, U[expr[0]]]);
    }

    function compile_binary_op(expr, k) {
      if (expr.length != 3) throw new Error("binary");
      compile_expression(expr[1], k);
      code_section.push([op.sld, k]);
      compile_expression(expr[2], k + 1);
      code_section.push([op.swp]);
      code_section.push([op.lld, k]);
      code_section.push([op.binopl, B[expr[0]]]);
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
          code_section.push([op.sld, k + i]);
        });
        for (let i = 0; i < args.length; ++i) {
          code_section.push([op.lld, k + i]);
          code_section.push([op.sld, j + 3 + i]);
        }
        code_section.push([op.call, name]);
        code_section.push([op.lld, j]);
      }
    }

    function compile_expression(expr, k) {
      switch (typeof expr) {
        case "number":
          return compile_literal(expr);
        case "string":
          return compile_reference(expr);
        default:
          switch (expr[0]) {
            case "VAR":
              break;
            case "IF":
              compile_conditional(expr, k);
              break;
            case "SET":
              compile_assignment(expr, k);
              break;
            default:
              compile_application(expr, k);
          }
      }
    }
  }
}
