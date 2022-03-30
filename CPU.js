import { read_word as read, write_word as write } from "./RAM.js";

export const S = {
  nop: Symbol("NOP"),
  lls: Symbol("LLS"),
  lrs: Symbol("LRS"),
  llsi: Symbol("LLSI"),
  lrsi: Symbol("LRSI"),
  lld: Symbol("LLD"),
  lrd: Symbol("LRD"),
  lldi: Symbol("LLDI"),
  lrdi: Symbol("LRDI"),
  sls: Symbol("SLS"),
  srs: Symbol("SRS"),
  slsi: Symbol("SLSI"),
  srsi: Symbol("SRSI"),
  sld: Symbol("SLD"),
  srd: Symbol("SRD"),
  sldi: Symbol("SLDI"),
  srdi: Symbol("SRDI"),
  unopl: Symbol("UNOPL"),
  unopr: Symbol("UNOPR"),
  binopl: Symbol("BINOPL"),
  binopr: Symbol("BINOPR"),
  swp: Symbol("SWP"),
  brl: Symbol("BRL"),
  brr: Symbol("BRR"),
  jmp: Symbol("JMP"),
  call: Symbol("CALL"),
  ret: Symbol("RET"),
  "~": Symbol("~"),
  "!": Symbol("!"),
  ">>": Symbol(">>"),
  "<<": Symbol("<<"),
  "&": Symbol("&"),
  "|": Symbol("|"),
  "^": Symbol("^"),
  "==": Symbol("=="),
  "!=": Symbol("!="),
  "<=": Symbol("<="),
  ">=": Symbol(">="),
  "<": Symbol("<"),
  ">": Symbol(">"),
  "&&": Symbol("&&"),
  "||": Symbol("||"),
  "+": Symbol("+"),
  "-": Symbol("-"),
  "*": Symbol("*"),
  "/": Symbol("/"),
  "%": Symbol("%"),
  "**": Symbol("**"),
};

export const O = {
  [S.nop]: 0x00,
  [S.lls]: 0x10,
  [S.lrs]: 0x11,
  [S.llsi]: 0x12,
  [S.lrsi]: 0x13,
  [S.lld]: 0x14,
  [S.lrd]: 0x15,
  [S.lldi]: 0x16,
  [S.lrdi]: 0x17,
  [S.sls]: 0x20,
  [S.srs]: 0x21,
  [S.slsi]: 0x22,
  [S.srsi]: 0x23,
  [S.sld]: 0x24,
  [S.srd]: 0x25,
  [S.sldi]: 0x26,
  [S.srdi]: 0x27,
  [S.unopl]: 0x30,
  [S.unopr]: 0x31,
  [S.binopl]: 0x32,
  [S.binopr]: 0x33,
  [S.swp]: 0x34,
  [S.brl]: 0x40,
  [S.brr]: 0x41,
  [S.jmp]: 0x42,
  [S.call]: 0x43,
  [S.ret]: 0x44,
};

export const U = {
  [S["~"]]: 0x00,
  [S["!"]]: 0x01,
};

export const B = {
  [S[">>"]]: 0x10,
  [S["<<"]]: 0x11,
  [S["&"]]: 0x12,
  [S["|"]]: 0x13,
  [S["^"]]: 0x14,
  [S["=="]]: 0x20,
  [S["!="]]: 0x21,
  [S["<="]]: 0x22,
  [S[">="]]: 0x23,
  [S["<"]]: 0x24,
  [S[">"]]: 0x25,
  [S["&&"]]: 0x26,
  [S["||"]]: 0x27,
  [S["+"]]: 0x30,
  [S["-"]]: 0x31,
  [S["*"]]: 0x32,
  [S["/"]]: 0x33,
  [S["%"]]: 0x34,
  [S["**"]]: 0x35,
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
    case U[S["~"]]:
      return ~a;
    case U[S["!"]]:
      return a ? 0 : 1;
    default:
      "Unknown unary operator";
  }
}

function binary(op, l, r) {
  switch (op) {
    case B[S["~"]]:
      return ~l;
    case B[S["!"]]:
      return l ? 0 : 1;
    case B[S[">>"]]:
      return l >> r;
    case B[S["<<"]]:
      return l << r;
    case B[["&"]]:
      return l & r;
    case B[["|"]]:
      return l | r;
    case B[S["^"]]:
      return l ^ r;
    case B[S["=="]]:
      return l == r ? 1 : 0;
    case B[S["!="]]:
      return l != r ? 1 : 0;
    case B[S["<="]]:
      return l <= r ? 1 : 0;
    case B[S[">="]]:
      return l >= r ? 1 : 0;
    case B[S["<"]]:
      return l < r ? 1 : 0;
    case B[S[">"]]:
      return l > r ? 1 : 0;
    case B[S["&&"]]:
      return l && r ? 1 : 0;
    case B[S["||"]]:
      return l || r ? 1 : 0;
    case B[S["+"]]:
      return 0 | (l + r);
    case B[S["-"]]:
      return 0 | (l - r);
    case B[S["*"]]:
      return 0 | (l * r);
    case B[S["/"]]:
      return 0 | (l / r);
    case B[S["%"]]:
      return 0 | l % r;
    case B[S["**"]]:
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
      if (reg.pc < BASE) return;

      const instr = read(reg.pc++);
      const opcode = instr >> 24;
      const offset = (instr << 8) >> 8;
      const operator = (instr << 8) >> 24;

      switch (opcode) {
        case O[S.nop]:
          break;
        case O[S.lls]:
          reg.l = read(BASE + offset);
          break;
        case O[S.lrs]:
          reg.r = read(BASE + offset);
          break;
        case O[S.llsi]:
          reg.l = read(read(BASE + offset));
          break;
        case O[S.lrsi]:
          reg.r = read(read(BASE + offset));
          break;
        case O[S.lld]:
          reg.l = read(reg.spl + offset);
          break;
        case O[S.lrd]:
          reg.r = read(reg.spl + offset);
          break;
        case O[S.lldi]:
          reg.l = read(read(reg.spl + offset));
          break;
        case O[S.lrdi]:
          reg.r = read(read(reg.spl + offset));
          break;
        case O[S.sls]:
          write(BASE + offset, reg.l);
          break;
        case O[S.srs]:
          write(BASE + offset, reg.r);
          break;
        case O[S.slsi]:
          write(read(BASE + offset), reg.l);
          break;
        case O[S.srsi]:
          write(read(BASE + offset), reg.r);
          break;
        case O[S.sld]:
          write(reg.spl + offset, reg.l);
          break;
        case O[S.srd]:
          write(reg.spl + offset, reg.r);
          break;
        case O[S.sldi]:
          write(read(reg.spl + offset), reg.l);
          break;
        case O[S.srdi]:
          write(read(reg.spl + offset), reg.r);
          break;
        case O[S.unopl]:
          reg.l = unary(operator, reg.l);
          break;
        case O[S.unopr]:
          reg.r = unary(operator, reg.r);
          break;
        case O[S.binopl]:
          reg.l = binary(operator, reg.l, reg.r);
          break;
        case O[S.binopr]:
          reg.r = binary(operator, reg.l, reg.r);
          break;
        case O[S.swp]:
          [reg.l, reg.r] = [reg.r, reg.l];
          break;
        case O[S.brl]:
          if (reg.l) reg.pc = BASE + offset;
          break;
        case O[S.brr]:
          if (reg.r) reg.pc = BASE + offset;
          break;
        case O[S.jmp]:
          reg.pc = BASE + offset;
          break;
        case O[S.call]: {
          const next = BASE + offset;
          const stack_size = read(next - 1) + 3;
          write(reg.spr - 1, reg.pc);
          write(reg.spr, reg.spl);
          reg.spl = reg.spr;
          reg.spr += stack_size;
          reg.pc = next;
          // console.groupCollapsed();
          break;
        }
        case O[S.ret]:
          reg.spr = reg.spl;
          reg.spl = read(reg.spr);
          reg.pc = read(reg.spr - 1);
          // console.groupEnd();
          break;
        default:
          throw "Unsupported instruction";
      }
    }
    requestIdleCallback(run_until_deadline);
  });
}
