import { B, op, U } from "./CPU.js";

const data_section = [["0"], 0];

function compile_local_var_declr(expr, context) {
  if (!Array.isArray(expr)) {
    throw 0;
  }
  const [name, params, body] = expr;
  if (
    typeof name != "string" ||
    !Array.isArray(params) ||
    !Array.isArray(body)
  ) {
    throw 0;
  }
  if (context.localVariables.has(name)) throw `"${name}" already declared`;
  context.functions.set(name, { params });
  return {
    data: [],
    code: [],
    space_required: 0,
  };
}

function compile_global_declr(name, context) {
  if (context.global_vars.has(name)) throw `"${name}" already declared`;
  context.global_vars.add(name);
  return {
    data: [[name], [0]],
    code: [],
    space_required: 0,
  };
}

function compile_local_declr(name, context) {
  const offset = context.local_vars.size + 1;
  context.local_vars.set(name, offset);
  return {
    data: [],
    code: [
      [op.lrs, "0"],
      [op.srd, offset],
    ],
    space_required: 0,
  };
}

function compile_set_statement(stmt, context) {
  const [_, name, expr] = stmt;
  const res = compile_expression(expr, context);
  const { code, data, space_required } = res;

  code.push(
    // the actuall offset needs to be determined later
    [op.lrd, null, res.location.offset]
  );

  if (context.local_vars.has(name)) {
    code.push([op.srd, context.local_vars[name]]);
  } else if (global_vars.has(name)) {
    code.push([op.srs, name]);
  } else {
    throw "Reference Error";
  }

  return {
    data,
    code,
    space_required,
  };
}

function compile_literal(literal, context) {
  literal |= 0;
  const new_literal = !context.global_vars.has(literal);
  if (new_literal) context.global_vars.add(literal);
  return {
    data: new_literal ? [[String(literal)], [literal]] : [],
    code: [],
    location: {
      type: STATIC,
      offset: String(literal),
    },
    space_required: 0,
  };
}

function compile_reference(name, context) {
  if (context.local_vars.has(name)) {
    return {
      data: [],
      code: [],
      location: {
        type: AUTO,
        offset: context.local_vars[name],
      },
      space_required: 0,
    };
  }
  if (context.global_vars.has(name)) {
    return {
      data: [],
      code: [],
      location: {
        type: STATIC,
        offset: name,
      },
      space_required: 0,
    };
  }
  throw "Reference Error";
}

function load_instr(arg, to_left) {
  const { type, offset } = arg.location;
  switch (type) {
    case STATIC:
      return [to_left ? op.lls : op.lrs, offset];
    case AUTO:
      return [to_left ? op.lld : op.lrd, offset];
    case TEMP:
      return [to_left ? op.lld : op.lrd, null, offset];
  }
}

function compile_composite_expr(expr, context, offset) {
  const name = expr[0];
  if (!(name in B || name in U || name in context.functions)) {
    throw "Reference Error [func/op]";
  }
  const args = expr.slice(1);
  if (name in U && args.length !== 1) throw "Unary";
  if (name in B && args.length !== 2) throw "Binary";
  if (
    name in context.functions &&
    context.functions[name].params.length != args.length
  ) {
    throw "Argument count does not match";
  }

  const compiled_args = args.map(
    // each temporary value takes up one slot, therefore the i-th value needs
    // to be put in the (offset + i)-th slot
    (m, i) => compile_expression(m, context, offset + i)
  );
  const data = compiled_args.flatMap((m) => m.data);
  const code = compiled_args.flatMap((m) => m.code);
  const space_required = compiled_args.reduce(
    (space, m) => Math.max(space, m.space_required),
    0
  );

  if (expr[0] in U) {
    code.push(load_instr(compiled_args[0], false));
    code.push([op.unopr, U[name]]);
  } else if (expr[0] in B) {
    code.push(load_instr(compiled_args[0], true));
    code.push(load_instr(compiled_args[1], false));
    code.push([op.binopr, B[name]]);
  } else {
    compiled_args.forEach((arg, i) => {
      code.push(load_instr(arg, false));
      code.push([op.srd, null, null, 3 + i]);
    });
    code.push([op.call]);
    code.push([op.lrd, null, null, 0]);
  }
  code.push([op.srd, null, offset]);

  return {
    data,
    code,
    location: {
      type: TEMP,
      offset,
    },
    space_required,
  };
}

function compile_expression(expr, context, offset) {
  switch (typeof expr) {
    case "number":
      return compile_literal(expr, context);
    case "string":
      return compile_reference(expr, context);
    default:
      if (!Array.isArray(expr)) throw "Syntax error";
      return compile_composite_expr(expr, context, offset);
  }
}

var i;

function compile_if_statement(expr, context) {
  const members = expr.slice(1).map((m) => compile_expression(m, context, 0));
  const compiled_condition = compile_expression(condition, context, 0);

  const data = members.flatMap((m) => m.data);
  const space_required = members.reduce(
    (space, m) => Math.max(space, m.space_required),
    0
  );

  const [condition, if_branch, else_branch] = members;
  // const if
  const code = [
    ...condition.code,
    load_instr(condition, true),
    [op.brr, ""],
    ...else_branch.code,
    ["if"],
    ...if_branch.code,
  ];
}

function compile_while_statement(expr, context) {}

function compile_program(prog, context) {
  for (const line of prog) {
    switch (line[0]) {
    }
  }
}

export function compile(program) {
  const global_vars = new Set();
  const functions = new Map();

  for (const expr of program) {
    function compile_expression(expr) {
      const stack_size = 3 + (expr.length - 1);
      const res = [];
      for (const arg of expr) {
        res.push(express);
      }
    }
    if (op in U || op in B) {
    }
  }
  return [];
}

function extract_literals(program) {
  const literals = {};
}

function extrac_data(program) {
  let offset = 1;
  global_vars;
  const global_vars = {};

  let static_section = [];

  function traverse_program(prog) {
    for (let expr of prog) {
      traverse(expr, {});
    }
  }

  function traverse_expr(expr, local_vars) {
    for (let m of expr) {
      switch (typeof m) {
        case "number":
          if (!(literal, m in global_vars)) {
          }
      }
    }
  }

  function traverse_function() {}
  function traverse(expr) {
    for (const m of expr) {
      if (typeof m == "number") {
        if (!Array.isArray(expr) || !expr.length) continue;
        if (expr[0] == FUNC || expr[1] == VAR) {
          const name = expr[1];
          global_vars[name] = offset++;
        }

        // } else if (typeof m == 'string')
      }
    }
    for (const expr of program) {
      traverse(expr);
    }

    for (let i = 0; i < program.length; ++i) {
      const expr = program[i];
      if (!Array.isArray(expr)) {
        if (typeof expr == "string") {
          program[i] = new Reference();
        }
      }
      // if ()
      if (expr[0] == FUNC) {
        let offset = 0;
        const local_vars = {};
        const params = expr[2];
        // for (offset )
      }
    }
  }
}

function alloc_stack(func_defn) {
  const [_, name, params, body] = func_defn;
  let i = params.length;
  let j = params.length;
  body.forEach(check);
  return j;

  function check(expr) {
    if (!Array.isArray(expr)) return;
    if (!expr.length) throw "empty list";
    switch (expr[0]) {
      case "FUNC":
        throw "FUNC declaration must be global";
      case "VAR":
        ++i;
        ++j;
        break;
      case "IF":
        if (expr.length != 4) throw "Syntax error [if]";
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
