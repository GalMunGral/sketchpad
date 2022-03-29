import { read_word as read, write_word as write } from "./RAM.js";

export const op = {
  nop: { toString: () => "nop", valueOf: () => 0x00 },
  lls: { toString: () => "lls", valueOf: () => 0x10 },
  lrs: { toString: () => "lrs", valueOf: () => 0x11 },
  llsi: { toString: () => "llsi", valueOf: () => 0x12 },
  lrsi: { toString: () => "lrsi", valueOf: () => 0x13 },
  lld: { toString: () => "lld", valueOf: () => 0x14 },
  lrd: { toString: () => "lrd", valueOf: () => 0x15 },
  lldi: { toString: () => "lldi", valueOf: () => 0x16 },
  lrdi: { toString: () => "lrdi", valueOf: () => 0x17 },
  sls: { toString: () => "sls", valueOf: () => 0x20 },
  srs: { toString: () => "srs", valueOf: () => 0x21 },
  slsi: { toString: () => "slsi", valueOf: () => 0x22 },
  srsi: { toString: () => "srsi", valueOf: () => 0x23 },
  sld: { toString: () => "sld", valueOf: () => 0x24 },
  srd: { toString: () => "srd", valueOf: () => 0x25 },
  sldi: { toString: () => "sldi", valueOf: () => 0x26 },
  srdi: { toString: () => "srdi", valueOf: () => 0x27 },
  unopl: { toString: () => "unopl", valueOf: () => 0x30 },
  unopr: { toString: () => "unopr", valueOf: () => 0x31 },
  binopl: { toString: () => "binopl", valueOf: () => 0x32 },
  binopr: { toString: () => "binopr", valueOf: () => 0x33 },
  swp: { toString: () => "swp", valueOf: () => 0x34 },
  brl: { toString: () => "brl", valueOf: () => 0x40 },
  brr: { toString: () => "brr", valueOf: () => 0x41 },
  jmp: { toString: () => "jmp", valueOf: () => 0x42 },
  call: { toString: () => "call", valueOf: () => 0x43 },
  ret: { toString: () => "ret", valueOf: () => 0x44 },
};

export const U = {
  "~": { toString: () => "~", valueOf: () => 0x00 },
  "!": { toString: () => "!", valueOF: () => 0x01 },
};

export const B = {
  ">>": { toString: () => ">>", valueOf: () => 0x10 },
  "<<": { toString: () => "<<", valueOf: () => 0x11 },
  "&": { toString: () => "&", valueOf: () => 0x12 },
  "|": { toString: () => "|", valueOf: () => 0x13 },
  "^": { toString: () => "^", valueOf: () => 0x14 },
  "==": { toString: () => "==", valueOf: () => 0x20 },
  "!=": { toString: () => "!=", valueOf: () => 0x21 },
  "<=": { toString: () => "<=", valueOf: () => 0x22 },
  ">=": { toString: () => ">=", valueOf: () => 0x23 },
  "<": { toString: () => "<", valueOf: () => 0x24 },
  ">": { toString: () => ">", valueOf: () => 0x25 },
  "&&": { toString: () => "&&", valueOf: () => 0x26 },
  "||": { toString: () => "||", valueOf: () => 0x27 },
  "+": { toString: () => "+", valueOf: () => 0x30 },
  "-": { toString: () => "-", valueOf: () => 0x31 },
  "*": { toString: () => "*", valueOf: () => 0x32 },
  "/": { toString: () => "/", valueOf: () => 0x33 },
  "%": { toString: () => "%", valueOf: () => 0x34 },
  "**": { toString: () => "**", valueOf: () => 0x35 },
};

const BASE = 0 | 0x00800000;
const STACK_BASE = 0 | 0x00810000;

const reg = {
  pc: BASE,
  spl: STACK_BASE,
  spr: STACK_BASE + 3,
  r: 0,
  l: 0,
};

function unary(op, a) {
  switch (op) {
    case 0 | U["~"]:
      return ~a;
    case 0 | ["!"]:
      return a ? 0 : 1;
    default:
      "Unknown unary operator";
  }
}

function binary(op, l, r) {
  switch (op) {
    case 0 | B["~"]:
      return ~l;
    case 0 | B["!"]:
      return l ? 0 : 1;
    case 0 | B[">>"]:
      return l >> r;
    case 0 | B["<<"]:
      return l << r;
    case 0 | B["&"]:
      return l & r;
    case 0 | B["|"]:
      return l | r;
    case 0 | B["^"]:
      return l ^ r;
    case 0 | B["=="]:
      return l == r ? 1 : 0;
    case 0 | B["!="]:
      return l != r ? 1 : 0;
    case 0 | B["<="]:
      return l <= r ? 1 : 0;
    case 0 | B[">="]:
      return l >= r ? 1 : 0;
    case 0 | B["<"]:
      return l < r ? 1 : 0;
    case 0 | B[">"]:
      return l > r ? 1 : 0;
    case 0 | B["&&"]:
      return l && r ? 1 : 0;
    case 0 | ["||"]:
      return l || r ? 1 : 0;
    case 0 | B["+"]:
      return 0 | (l + r);
    case 0 | B["-"]:
      return 0 | (l - r);
    case 0 | B["*"]:
      return 0 | (l * r);
    case 0 | B["/"]:
      return 0 | (l / r);
    case 0 | B["%"]:
      return 0 | l % r;
    case 0 | B["**"]:
      return 0 | (l ** r);
    default:
      throw "Unknown binary operator";
  }
}

export function run(program) {
  for (let i = 0; i < program.length; ++i) {
    write(BASE + i, program[i]);
  }

  requestIdleCallback(function run_until_deadline(deadline) {
    while (deadline.timeRemaining()) {
      // console.log(reg.pc);
      if (reg.pc < BASE) return;

      const instr = read(reg.pc++);
      const opcode = instr >> 24;
      const offset = (instr << 8) >> 8;
      const operator = (instr << 8) >> 24;

      switch (opcode) {
        case 0 | op.nop:
          break;
        case 0 | op.lls:
          reg.l = read(BASE + offset);
          break;
        case 0 | op.lrs:
          reg.r = read(BASE + offset);
          break;
        case 0 | op.llsi:
          reg.l = read(read(BASE + offset));
          break;
        case 0 | op.lrsi:
          reg.r = read(read(BASE + offset));
          break;
        case 0 | op.lld:
          reg.l = read(reg.spl + offset);
          break;
        case 0 | op.lrd:
          reg.r = read(reg.spl + offset);
          break;
        case 0 | op.lldi:
          reg.l = read(read(reg.spl + offset));
          break;
        case 0 | op.lrdi:
          reg.r = read(read(reg.spl + offset));
          break;
        case 0 | op.sls:
          write(BASE + offset, reg.l);
          break;
        case 0 | op.srs:
          write(BASE + offset, reg.r);
          break;
        case 0 | op.slsi:
          write(read(BASE + offset), reg.l);
          break;
        case op.srsi:
          write(read(BASE + offset), reg.r);
          break;
        case 0 | op.sld:
          write(reg.spl + offset, reg.l);
          break;
        case 0 | op.srd:
          write(reg.spl + offset, reg.r);
          break;
        case 0 | op.sldi:
          write(read(reg.spl + offset), reg.l);
          break;
        case 0 | op.srdi:
          write(read(reg.spl + offset), reg.r);
          break;
        case 0 | op.unopl:
          reg.l = unary(operator, reg.l);
          break;
        case 0 | op.unopr:
          reg.r = unary(operator, reg.r);
          break;
        case 0 | op.binopl:
          reg.l = binary(operator, reg.l, reg.r);
          break;
        case 0 | op.binopr:
          reg.r = binary(operator, reg.l, reg.r);
          break;
        case 0 | op.swp:
          [reg.l, reg.r] = [reg.r, reg.l];
          break;
        case 0 | op.brl:
          if (reg.l) reg.pc = BASE + offset;
          break;
        case 0 | op.brr:
          if (reg.r) reg.pc = BASE + offset;
          break;
        case 0 | op.jmp:
          reg.pc = BASE + offset;
          break;
        case 0 | op.call: {
          const next = BASE + offset;
          const stack_size = read(next - 1) + 3;
          write(reg.spr - 1, reg.pc);
          write(reg.spr, reg.spl);
          reg.spl = reg.spr;
          reg.spr += stack_size;
          reg.pc = next;
          console.groupCollapsed();
          break;
        }
        case 0 | op.ret:
          reg.spr = reg.spl;
          reg.spl = read(reg.spr);
          reg.pc = read(reg.spr - 1);
          console.groupEnd();
          console.log("RETURN", read(reg.spr - 2));
          break;
        default:
          throw "Unsupported instruction";
      }
    }
    requestIdleCallback(run_until_deadline);
  });
}
