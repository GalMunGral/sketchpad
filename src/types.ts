export type ValueOf<T> = T[keyof T];

export const OPCODE = {
  NOP: 0x00,
  LLS: 0x10,
  LRS: 0x11,
  LLSI: 0x12,
  LRSI: 0x13,
  LLD: 0x14,
  LRD: 0x15,
  LLDI: 0x16,
  LRDI: 0x17,
  SLS: 0x20,
  SRS: 0x21,
  SLSI: 0x22,
  SRSI: 0x23,
  SLD: 0x24,
  SRD: 0x25,
  SLDI: 0x26,
  SRDI: 0x27,
  UOPL: 0x30,
  UOPR: 0x31,
  BOPL: 0x32,
  BOPR: 0x33,
  SWP: 0x34,
  BRL: 0x40,
  BRR: 0x41,
  JMP: 0x42,
  CALL: 0x43,
  RET: 0x44,
} as const;

export const UNARY_OPERATOR = {
  "~": 0x00,
  "!": 0x01,
} as const;

export const BINARY_OPERATOR = {
  ">>": 0x10,
  "<<": 0x11,
  "&": 0x12,
  "|": 0x13,
  "^": 0x14,
  "==": 0x20,
  "!=": 0x21,
  "<=": 0x22,
  ">=": 0x23,
  "<": 0x24,
  ">": 0x25,
  "&&": 0x26,
  "||": 0x27,
  "+": 0x30,
  "-": 0x31,
  "*": 0x32,
  "/": 0x33,
  "%": 0x34,
  "**": 0x35,
} as const;

export type OpcodeT = typeof OPCODE;
export type UnaryOperatorT = typeof UNARY_OPERATOR;
export type BinaryOperatorT = typeof BINARY_OPERATOR;

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

export const LEFT = Symbol("(");
export const RIGHT = Symbol(")");
export type TokenT = typeof LEFT | typeof RIGHT | string | number;

export type ProgramT = Array<FunctionT | DeclarationT>;

export type ExpressionT =
  | LiteralT
  | SymbolT
  | ReferenceT
  | UnaryOperationT
  | BinaryOperationT
  | DeclarationT
  | AssignmentT
  | ConditionalT
  | LoopT
  | ApplicationT;

export type LiteralT = {
  type: "LITERAL";
  value: number;
};

export type SymbolT = {
  type: "SYMBOL";
  name: string;
};

export type DeclarationT = {
  type: "DECLARATION";
  name: string;
  value: ExpressionT;
};

export type ReferenceT = {
  type: "REFERENCE";
  name: string;
  indirect: boolean;
};

export type UnaryOperationT = {
  type: "UNARY_OPERATION";
  operator: keyof UnaryOperatorT;
  operand: ExpressionT;
};

export type BinaryOperationT = {
  type: "BINARY_OPERATION";
  operator: keyof BinaryOperatorT;
  left: ExpressionT;
  right: ExpressionT;
};

export type AssignmentT = {
  type: "ASSIGNMENT";
  indirect: boolean;
  name: string;
  value: ExpressionT;
};

export type ConditionalT = {
  type: "CONDITIONAL";
  condition: ExpressionT;
  ifBranch: Array<ExpressionT>;
  elseBranch: Array<ExpressionT>;
};

export type LoopT = {
  type: "LOOP";
  condition: ExpressionT;
  body: Array<ExpressionT>;
};

export type ApplicationT = {
  type: "APPLICATION";
  name: string;
  args: Array<ExpressionT>;
};

export type FunctionT = {
  type: "FUNCTION";
  name: string;
  params: Array<string>;
  body: Array<ExpressionT>;
};

export interface FunctionMetadata {
  length: number;
}
