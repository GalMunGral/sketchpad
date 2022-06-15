var _a;
import { read, write } from "./RAM.js";
const __DEBUG__ = Boolean((_a = new URLSearchParams(location === null || location === void 0 ? void 0 : location.search)) === null || _a === void 0 ? void 0 : _a.get("visualize"));
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
};
export const UNARY_OPERATOR = {
    "~": 0x00,
    "!": 0x01,
};
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
};
const BASE = 0 | 0x00800000;
const STACK_BASE = 0 | 0x00810000;
const REGISTER = {
    PC: BASE,
    STACK_L: STACK_BASE,
    STACK_R: STACK_BASE + 3,
    L: 0,
    R: 0,
};
function unary(op, a) {
    switch (op) {
        case UNARY_OPERATOR["~"]:
            return ~a;
        case UNARY_OPERATOR["!"]:
            return a ? 0 : 1;
    }
}
function binary(op, l, r) {
    switch (op) {
        case BINARY_OPERATOR[">>"]:
            return l >> r;
        case BINARY_OPERATOR["<<"]:
            return l << r;
        case BINARY_OPERATOR["&"]:
            return l & r;
        case BINARY_OPERATOR["|"]:
            return l | r;
        case BINARY_OPERATOR["^"]:
            return l ^ r;
        case BINARY_OPERATOR["=="]:
            return l == r ? 1 : 0;
        case BINARY_OPERATOR["!="]:
            return l != r ? 1 : 0;
        case BINARY_OPERATOR["<="]:
            return l <= r ? 1 : 0;
        case BINARY_OPERATOR[">="]:
            return l >= r ? 1 : 0;
        case BINARY_OPERATOR["<"]:
            return l < r ? 1 : 0;
        case BINARY_OPERATOR[">"]:
            return l > r ? 1 : 0;
        case BINARY_OPERATOR["&&"]:
            return l && r ? 1 : 0;
        case BINARY_OPERATOR["||"]:
            return l || r ? 1 : 0;
        case BINARY_OPERATOR["+"]:
            return 0 | (l + r);
        case BINARY_OPERATOR["-"]:
            return 0 | (l - r);
        case BINARY_OPERATOR["*"]:
            return 0 | (l * r);
        case BINARY_OPERATOR["/"]:
            return 0 | (l / r);
        case BINARY_OPERATOR["%"]:
            return 0 | l % r;
        case BINARY_OPERATOR["**"]:
            return 0 | (l ** r);
    }
}
export function run(program) {
    for (let i = 0; i < program.length; ++i) {
        write(BASE + i, program[i]);
    }
    program
        .map(function formatBinary(x) {
        let s = "";
        for (let i = 31; i > -1; --i) {
            s += String((x >> i) & 1);
        }
        return s;
    })
        .forEach((line, i) => {
        const code = document.getElementById("code");
        const el = document.createElement("pre");
        el.textContent = line;
        el.id = "line-" + i;
        el.style.margin = "0px";
        code.append(el);
    });
    requestIdleCallback(function run(deadline) {
        let i = 0;
        while (deadline.timeRemaining()) {
            if (REGISTER.PC < BASE)
                return;
            if (__DEBUG__) {
                const el = document.getElementById("line-" + (REGISTER.PC - BASE));
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
            const instr = read(REGISTER.PC++);
            const opcode = (instr >> 24);
            const offset = (instr << 8) >> 8;
            const operator = (instr << 8) >> 24;
            switch (opcode) {
                case OPCODE.NOP:
                    break;
                case OPCODE.LLS:
                    REGISTER.R = read(BASE + offset);
                    break;
                case OPCODE.LRS:
                    REGISTER.L = read(BASE + offset);
                    break;
                case OPCODE.LLSI:
                    REGISTER.R = read(read(BASE + offset));
                    break;
                case OPCODE.LRSI:
                    REGISTER.L = read(read(BASE + offset));
                    break;
                case OPCODE.LLD:
                    REGISTER.R = read(REGISTER.STACK_L + offset);
                    break;
                case OPCODE.LRD:
                    REGISTER.L = read(REGISTER.STACK_L + offset);
                    break;
                case OPCODE.LLDI:
                    REGISTER.R = read(read(REGISTER.STACK_L + offset));
                    break;
                case OPCODE.LRDI:
                    REGISTER.L = read(read(REGISTER.STACK_L + offset));
                    break;
                case OPCODE.SLS:
                    write(BASE + offset, REGISTER.R);
                    break;
                case OPCODE.SRS:
                    write(BASE + offset, REGISTER.L);
                    break;
                case OPCODE.SLSI:
                    write(read(BASE + offset), REGISTER.R);
                    break;
                case OPCODE.SRSI:
                    write(read(BASE + offset), REGISTER.L);
                    break;
                case OPCODE.SLD:
                    write(REGISTER.STACK_L + offset, REGISTER.R);
                    break;
                case OPCODE.SRD:
                    write(REGISTER.STACK_L + offset, REGISTER.L);
                    break;
                case OPCODE.SLDI:
                    write(read(REGISTER.STACK_L + offset), REGISTER.R);
                    break;
                case OPCODE.SRDI:
                    write(read(REGISTER.STACK_L + offset), REGISTER.L);
                    break;
                case OPCODE.UOPL:
                    REGISTER.R = unary(operator, REGISTER.R);
                    break;
                case OPCODE.UOPR:
                    REGISTER.L = unary(operator, REGISTER.L);
                    break;
                case OPCODE.BOPL:
                    REGISTER.R = binary(operator, REGISTER.R, REGISTER.L);
                    break;
                case OPCODE.BOPR:
                    REGISTER.L = binary(operator, REGISTER.R, REGISTER.L);
                    break;
                case OPCODE.SWP:
                    [REGISTER.R, REGISTER.L] = [REGISTER.L, REGISTER.R];
                    break;
                case OPCODE.BRL:
                    if (REGISTER.R)
                        REGISTER.PC = BASE + offset;
                    break;
                case OPCODE.BRR:
                    if (REGISTER.L)
                        REGISTER.PC = BASE + offset;
                    break;
                case OPCODE.JMP:
                    REGISTER.PC = BASE + offset;
                    break;
                case OPCODE.CALL: {
                    const next = BASE + offset;
                    const stack_size = read(next - 1);
                    write(REGISTER.STACK_R - 1, REGISTER.PC);
                    write(REGISTER.STACK_R, REGISTER.STACK_L);
                    REGISTER.STACK_L = REGISTER.STACK_R;
                    REGISTER.STACK_R += stack_size;
                    REGISTER.PC = next;
                    break;
                }
                case OPCODE.RET:
                    REGISTER.STACK_R = REGISTER.STACK_L;
                    REGISTER.STACK_L = read(REGISTER.STACK_R);
                    REGISTER.PC = read(REGISTER.STACK_R - 1);
                    break;
                default:
                    throw "Unsupported instruction";
            }
        }
        requestIdleCallback(run);
    });
}
