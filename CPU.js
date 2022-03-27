import { read_word, write_word } from "./RAM.js";

export const op = {
  nop: 0x00,
  load: 0x02,
  store: 0x03,
  load_static: 0x04,
  load_dynamic: 0x05,
  store_static: 0x06,
  store_dynamic: 0x07,
  shift: 0x08,
  reduce: 0x09,
  jump: 0x0a,
  branch: 0x0b,
};

export const alu = {
  "~": 0x00,
  "!": 0x01,
  ">>": 0x02,
  "<<": 0x03,
  "&": 0x04,
  "|": 0x05,
  "^": 0x06,
  "==": 0x08,
  "!=": 0x09,
  "<=": 0x0a,
  ">=": 0x0b,
  "<": 0x0c,
  ">": 0x0d,
  "&&": 0x0e,
  "||": 0x0f,
  "+": 0x10,
  "-": 0x11,
  "*": 0x12,
  "/": 0x13,
  "%": 0x14,
  "**": 0x15,
};

const reg = {
  pc: 0x00800000,
  sp1: 0,
  sp2: 0,
  r: 0,
  l: 0,
};
window.reg = reg;

window.onclick = () => console.log("yoyoy");

export function run(program) {
  for (let i = 0; i < program.length; ++i) {
    write_word(0x00800000 + i, program[i]);
  }

  requestIdleCallback(function run_until_deadline(deadline) {
    console.log("run");
    while (deadline.timeRemaining()) {
      const instr = read_word(reg.pc);
      const opcode = instr >> 24;
      const offset = (instr << 8) >> 8;
      const operator = (instr << 8) >> 24;

      console.log(
        (reg.pc | 0).toString(16).padStart(8, "0"),
        "->",
        (instr | 0).toString(16).padStart(8, "0")
      );

      ++reg.pc;
      switch (opcode) {
        case op.nop:
          break;
        case op.jump:
          if (offset < 0) {
            console.log("yo");
            return;
          }
          reg.pc = 0x00800000 + offset;
          break;
        case op.branch:
          if (offset < 0) {
            console.log("yo");
            return;
          }
          if (offset < 0) return;
          if (reg.l) reg.pc = 0x00800000 + offset;
          break;
        case op.load:
          reg.r = read_word(reg.r);
          break;
        case op.load_static:
          reg.r = read_word(0x00800000 + offset);
          break;
        case op.load_dynamic:
          reg.r = read_word(reg.sp1 + offset);
          break;
        case op.store:
          write_word(reg.r, reg.l);
          break;
        case op.store_static:
          write_word(0x00800000 + offset, reg.l);
          break;
        case op.store_dynamic:
          write_word(reg.sp1 + offset, reg.l);
          break;
        case op.shift:
          reg.l = reg.r;
          break;
        case op.reduce: {
          switch (operator) {
            case alu["~"]:
              reg.l = ~reg.l;
              break;
            case alu["!"]:
              reg.l = reg.l ? 0 : 1;
              break;
            case alu[">>"]:
              reg.l = reg.l >> reg.r;
              break;
            case alu["<<"]:
              reg.l = reg.l << reg.r;
              break;
            case alu["&"]:
              reg.l = reg.l & reg.r;
              break;
            case alu["|"]:
              reg.l = reg.l | reg.r;
              break;
            case alu["^"]:
              reg.l = reg.l ^ reg.r;
              break;
            case alu["=="]:
              reg.l = reg.l == reg.r ? 1 : 0;
              break;
            case alu["!="]:
              reg.l = reg.l != reg.r ? 1 : 0;
              break;
            case alu["<="]:
              reg.l = reg.l <= reg.r ? 1 : 0;
              break;
            case alu[">="]:
              reg.l = reg.l >= reg.r ? 1 : 0;
              break;
            case alu["<"]:
              reg.l = reg.l < reg.r ? 1 : 0;
              break;
            case alu[">"]:
              reg.l = reg.l > reg.r ? 1 : 0;
              break;
            case alu["&&"]:
              reg.l = reg.l && reg.r ? 1 : 0;
              break;
            case alu["||"]:
              reg.l = reg.l || reg.r ? 1 : 0;
              break;
            case alu["+"]:
              reg.l = (reg.l + reg.r) | 0;
              break;
            case alu["-"]:
              reg.l = (reg.l - reg.r) | 0;
              break;
            case alu["*"]:
              reg.l = (reg.l * reg.r) | 0;
              break;
            case alu["/"]:
              reg.l = (reg.l / reg.r) | 0;
              break;
            case alu["%"]:
              reg.l = reg.l % reg.r | 0;
              break;
            case alu["**"]:
              reg.l = (reg.l ** reg.r) | 0;
              break;
            default:
              throw "unsupported";
          }
          break;
        }
        default:
          throw "unsupported";
      }
    }
    requestIdleCallback(run_until_deadline);
  });
}
