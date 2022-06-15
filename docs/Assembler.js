import { OPCODE, BINARY_OPERATOR, UNARY_OPERATOR, } from "./CPU.js";
export function assemble(program) {
    const tags = {};
    const res = [];
    let i = 0;
    for (const asm of program) {
        if (asm.op == "__TAG__") {
            tags[asm.arg] = i;
        }
        else {
            ++i;
        }
    }
    for (const asm of program) {
        if (asm.op == "__TAG__")
            continue;
        if (asm.op == "__VAL__") {
            res.push(asm.arg);
        }
        else {
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
                    res.push((OPCODE[asm.op] << 24) |
                        ((typeof asm.arg == "string" ? tags[asm.arg] : asm.arg) &
                            ((1 << 24) - 1)));
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
export function optimize(code) {
    const res = [code[0]];
    for (let i = 1; i < code.length; ++i) {
        const prev = code[i - 1];
        const cur = code[i];
        if (((prev.op == "SLS" && cur.op == "LLS") ||
            (prev.op == "SRS" && cur.op == "LRS") ||
            (prev.op == "SLSI" && cur.op == "LLSI") ||
            (prev.op == "SRSI" && cur.op == "LRSI") ||
            (prev.op == "SLD" && cur.op == "LLD") ||
            (prev.op == "SRD" && cur.op == "LRD") ||
            (prev.op == "SLDI" && cur.op == "LLDI") ||
            (prev.op == "SRDI" && cur.op == "LRDI")) &&
            prev.arg == cur.arg) {
            continue;
        }
        res.push(code[i]);
    }
    return res;
}
