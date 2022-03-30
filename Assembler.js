import { O, B, U } from "./CPU.js";
import { $ } from "./Symbols.js";

export function assemble(text) {
  const tags = {};
  const res = [];

  let offset = 0;
  for (const [head] of text) {
    if (typeof head == "string") {
      tags[head] = offset;
    } else {
      ++offset;
    }
  }

  for (const [head, arg] of text) {
    if (typeof head == "string") continue;
    if (typeof head == "number") {
      res.push(head);
    } else {
      switch (head) {
        case $.brl:
        case $.brr:
        case $.jmp:
        case $.call:
        case $.lls:
        case $.lrs:
        case $.llsi:
        case $.lrsi:
        case $.sls:
        case $.srs:
        case $.slsi:
        case $.srsi: {
          const real_arg = typeof arg == "string" ? tags[arg] : arg;
          res.push((O[head] << 24) | (real_arg & ((1 << 24) - 1)));
          break;
        }
        case $.lld:
        case $.lrd:
        case $.lldi:
        case $.lrdi:
        case $.sld:
        case $.srd:
        case $.sldi:
        case $.srdi:
          res.push((O[head] << 24) | (arg & ((1 << 24) - 1)));
          break;
        case $.unopl:
        case $.unopr:
          res.push((O[head] << 24) | (U[arg] << 16));
          break;
        case $.binopl:
        case $.binopr:
          res.push((O[head] << 24) | (B[arg] << 16));
          break;
        case $.nop:
        case $.swp:
        case $.ret:
          res.push(O[head] << 24);
          break;
        default:
          throw "[assembler] unsupported instruction";
      }
    }
  }
  return res;
}
