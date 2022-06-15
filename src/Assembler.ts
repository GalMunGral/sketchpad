import {
  OPCODE,
  BINARY_OPERATOR,
  UNARY_OPERATOR,
  UnaryOperatorT,
  BinaryOperatorT,
} from "./CPU.js";

export type AssemblyT =
  | {
      op:
        | "LLS"
        | "LLSI"
        | "LRS"
        | "LRSI"
        | "SLS"
        | "SLSI"
        | "SRS"
        | "SRSI"
        | "BRL"
        | "BRR"
        | "JMP"
        | "CALL";
      arg: string | number;
    }
  | {
      op: "LLD" | "LLDI" | "LRD" | "LRDI" | "SLD" | "SLDI" | "SRD" | "SRDI";
      arg: number;
    }
  | {
      op: "UOPL" | "UOPR";
      arg: keyof UnaryOperatorT;
    }
  | {
      op: "BOPL" | "BOPR";
      arg: keyof BinaryOperatorT;
    }
  | {
      op: "NOP" | "SWP" | "RET";
    }
  | {
      op: "__TAG__";
      arg: string;
    }
  | {
      op: "__VAL__";
      arg: number;
    };

export function assemble(program: Array<AssemblyT>): Array<number> {
  const tags: Record<string, number> = {};
  const res: Array<number> = [];

  let i = 0;
  for (const asm of program) {
    if (asm.op == "__TAG__") {
      tags[asm.arg] = i;
    } else {
      ++i;
    }
  }

  for (const asm of program) {
    if (asm.op == "__TAG__") continue;
    if (asm.op == "__VAL__") {
      res.push(asm.arg);
    } else {
      switch (asm.op) {
        case "LLS":
        case "LLSI":
        case "LRS":
        case "LRSI":
        case "SLS":
        case "SLSI":
        case "SRS":
        case "SRSI":
        case "BRL":
        case "BRR":
        case "JMP":
        case "CALL":
          res.push(
            (OPCODE[asm.op] << 24) |
              ((typeof asm.arg == "string" ? tags[asm.arg] : asm.arg) &
                ((1 << 24) - 1))
          );
          break;
        case "LLD":
        case "LRD":
        case "LLDI":
        case "LRDI":
        case "SLD":
        case "SRD":
        case "SLDI":
        case "SRDI":
          res.push((OPCODE[asm.op] << 24) | (asm.arg & ((1 << 24) - 1)));
          break;
        case "UOPL":
        case "UOPR":
          res.push((OPCODE[asm.op] << 24) | (UNARY_OPERATOR[asm.arg] << 16));
          break;
        case "BOPL":
        case "BOPR":
          res.push((OPCODE[asm.op] << 24) | (BINARY_OPERATOR[asm.arg] << 16));
          break;
        case "NOP":
        case "SWP":
        case "RET":
          res.push(OPCODE[asm.op] << 24);
          break;
      }
    }
  }
  return res;
}

export function optimize(code: Array<AssemblyT>): Array<AssemblyT> {
  const res: Array<AssemblyT> = [code[0]];
  for (let i = 1; i < code.length; ++i) {
    const prev = code[i - 1];
    const cur = code[i];
    if (
      ((prev.op == "SLS" && cur.op == "LLS") ||
        (prev.op == "SRS" && cur.op == "LRS") ||
        (prev.op == "SLSI" && cur.op == "LLSI") ||
        (prev.op == "SRSI" && cur.op == "LRSI") ||
        (prev.op == "SLD" && cur.op == "LLD") ||
        (prev.op == "SRD" && cur.op == "LRD") ||
        (prev.op == "SLDI" && cur.op == "LLDI") ||
        (prev.op == "SRDI" && cur.op == "LRDI")) &&
      prev.arg == cur.arg
    ) {
      continue;
    }
    res.push(code[i]);
  }
  return res;
}
