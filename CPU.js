import { read, write } from "./RAM.js";
import { $ } from "./Symbols.js";

export const O = {
  [$.nop]: 0x00,
  [$.lls]: 0x10,
  [$.lrs]: 0x11,
  [$.llsi]: 0x12,
  [$.lrsi]: 0x13,
  [$.lld]: 0x14,
  [$.lrd]: 0x15,
  [$.lldi]: 0x16,
  [$.lrdi]: 0x17,
  [$.sls]: 0x20,
  [$.srs]: 0x21,
  [$.slsi]: 0x22,
  [$.srsi]: 0x23,
  [$.sld]: 0x24,
  [$.srd]: 0x25,
  [$.sldi]: 0x26,
  [$.srdi]: 0x27,
  [$.unopl]: 0x30,
  [$.unopr]: 0x31,
  [$.binopl]: 0x32,
  [$.binopr]: 0x33,
  [$.swp]: 0x34,
  [$.brl]: 0x40,
  [$.brr]: 0x41,
  [$.jmp]: 0x42,
  [$.call]: 0x43,
  [$.ret]: 0x44,
};

export const U = {
  [$["~"]]: 0x00,
  [$["!"]]: 0x01,
};

export const B = {
  [$[">>"]]: 0x10,
  [$["<<"]]: 0x11,
  [$["&"]]: 0x12,
  [$["|"]]: 0x13,
  [$["^"]]: 0x14,
  [$["=="]]: 0x20,
  [$["!="]]: 0x21,
  [$["<="]]: 0x22,
  [$[">="]]: 0x23,
  [$["<"]]: 0x24,
  [$[">"]]: 0x25,
  [$["&&"]]: 0x26,
  [$["||"]]: 0x27,
  [$["+"]]: 0x30,
  [$["-"]]: 0x31,
  [$["*"]]: 0x32,
  [$["/"]]: 0x33,
  [$["%"]]: 0x34,
  [$["**"]]: 0x35,
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
    case U[$["~"]]:
      return ~a;
    case U[$["!"]]:
      return a ? 0 : 1;
    default:
      "Unknown unary operator";
  }
}

function binary(op, l, r) {
  switch (op) {
    case B[$["~"]]:
      return ~l;
    case B[$["!"]]:
      return l ? 0 : 1;
    case B[$[">>"]]:
      return l >> r;
    case B[$["<<"]]:
      return l << r;
    case B[$["&"]]:
      return l & r;
    case B[$["|"]]:
      return l | r;
    case B[$["^"]]:
      return l ^ r;
    case B[$["=="]]:
      return l == r ? 1 : 0;
    case B[$["!="]]:
      return l != r ? 1 : 0;
    case B[$["<="]]:
      return l <= r ? 1 : 0;
    case B[$[">="]]:
      return l >= r ? 1 : 0;
    case B[$["<"]]:
      return l < r ? 1 : 0;
    case B[$[">"]]:
      return l > r ? 1 : 0;
    case B[$["&&"]]:
      return l && r ? 1 : 0;
    case B[$["||"]]:
      return l || r ? 1 : 0;
    case B[$["+"]]:
      return 0 | (l + r);
    case B[$["-"]]:
      return 0 | (l - r);
    case B[$["*"]]:
      return 0 | (l * r);
    case B[$["/"]]:
      return 0 | (l / r);
    case B[$["%"]]:
      return 0 | l % r;
    case B[$["**"]]:
      return 0 | (l ** r);
    default:
      throw "Unknown binary operator";
  }
}

export function run(program) {
  for (let i = 0; i < program.length; ++i) {
    write(BASE + i, program[i]);
  }

  program
    .map((x) => {
      let s = "";
      for (let i = 31; i > -1; --i) {
        s += String((x >> i) & 1);
      }
      return s;
    })
    .forEach((line, i) => {
      const el = document.createElement("pre");
      el.textContent = line;
      el.id = "line-" + i;
      el.style.margin = 0;
      code.append(el);
    });

  const __DEBUG__ = Boolean(
    new URLSearchParams(location?.search)?.get("visualize")
  );

  requestIdleCallback(function run_until_deadline(deadline) {
    let i = 0;
    while (deadline.timeRemaining()) {
      if (reg.pc < BASE) return;

      if (__DEBUG__) {
        const el = document.getElementById("line-" + (reg.pc - BASE));
        if (el) {
          setTimeout(() => {
            requestAnimationFrame(() => {
              el.style.color = "white";
              requestAnimationFrame(() => {
                el.style.color = "gray";
              });
            });
          }, 16 * i++);
        }
      }

      const instr = read(reg.pc++);
      const opcode = instr >> 24;
      const offset = (instr << 8) >> 8;
      const operator = (instr << 8) >> 24;

      switch (opcode) {
        case O[$.nop]:
          break;
        case O[$.lls]:
          reg.l = read(BASE + offset);
          break;
        case O[$.lrs]:
          reg.r = read(BASE + offset);
          break;
        case O[$.llsi]:
          reg.l = read(read(BASE + offset));
          break;
        case O[$.lrsi]:
          reg.r = read(read(BASE + offset));
          break;
        case O[$.lld]:
          reg.l = read(reg.spl + offset);
          break;
        case O[$.lrd]:
          reg.r = read(reg.spl + offset);
          break;
        case O[$.lldi]:
          reg.l = read(read(reg.spl + offset));
          break;
        case O[$.lrdi]:
          reg.r = read(read(reg.spl + offset));
          break;
        case O[$.sls]:
          write(BASE + offset, reg.l);
          break;
        case O[$.srs]:
          write(BASE + offset, reg.r);
          break;
        case O[$.slsi]:
          write(read(BASE + offset), reg.l);
          break;
        case O[$.srsi]:
          write(read(BASE + offset), reg.r);
          break;
        case O[$.sld]:
          write(reg.spl + offset, reg.l);
          break;
        case O[$.srd]:
          write(reg.spl + offset, reg.r);
          break;
        case O[$.sldi]:
          write(read(reg.spl + offset), reg.l);
          break;
        case O[$.srdi]:
          write(read(reg.spl + offset), reg.r);
          break;
        case O[$.unopl]:
          reg.l = unary(operator, reg.l);
          break;
        case O[$.unopr]:
          reg.r = unary(operator, reg.r);
          break;
        case O[$.binopl]:
          reg.l = binary(operator, reg.l, reg.r);
          break;
        case O[$.binopr]:
          reg.r = binary(operator, reg.l, reg.r);
          break;
        case O[$.swp]:
          [reg.l, reg.r] = [reg.r, reg.l];
          break;
        case O[$.brl]:
          if (reg.l) reg.pc = BASE + offset;
          break;
        case O[$.brr]:
          if (reg.r) reg.pc = BASE + offset;
          break;
        case O[$.jmp]:
          reg.pc = BASE + offset;
          break;
        case O[$.call]: {
          const next = BASE + offset;
          const stack_size = read(next - 1) + 3;
          write(reg.spr - 1, reg.pc);
          write(reg.spr, reg.spl);
          reg.spl = reg.spr;
          reg.spr += stack_size;
          reg.pc = next;
          break;
        }
        case O[$.ret]:
          reg.spr = reg.spl;
          reg.spl = read(reg.spr);
          reg.pc = read(reg.spr - 1);
          break;
        default:
          throw "Unsupported instruction";
      }
    }
    requestIdleCallback(run_until_deadline);
  });
}
