import { BinaryOperatorT, UnaryOperatorT } from "./CPU";

export type ValueOf<T> = T[keyof T];

export const LEFT = Symbol("(");
export const RIGHT = Symbol(")");
export type TokenT = typeof LEFT | typeof RIGHT | string | number;

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

export type ProgramT = Array<FunctionT | DeclarationT>;

export interface FunctionMetadata {
  length: number;
}
