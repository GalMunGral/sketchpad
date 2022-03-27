import { op } from "./CPU.js";

export function assemble(text) {
  const tags = {};
  let i = 0;
  for (const line of text) {
    if (typeof line == "string") {
      tags[line] = i;
    } else {
      ++i;
    }
  }

  const res = [];
  for (const line of text) {
    if (typeof line == "string") continue;
    if (typeof line == "number") {
      res.push(line);
    } else {
      const [opcode, arg] = line;
      switch (opcode) {
        case op.jump:
        case op.branch:
        case op.load_static:
        case op.store_static: {
          const real_arg = typeof arg == "string" ? tags[arg] : arg;
          console.log(arg, real_arg);
          res.push((opcode << 24) | real_arg);
          break;
        }
        case op.load_dynamic:
        case op.store_dynamic:
          if (typeof arg != "number") throw "arg type error";
          res.push((opcode << 24) | arg);
          break;
        case op.nop:
        case op.load:
        case op.store:
        case op.shift:
          res.push(opcode << 24);
          break;
        case op.reduce:
          if (typeof arg != "number") throw "arg type error";
          res.push((opcode << 24) | (arg << 16));
          break;
        default:
          throw "unsupported";
      }
    }
  }
  console.log(res.map((x) => x.toString(16).padStart(8, "0")).join("\n"));
  return res;
}
