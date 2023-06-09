import { Assembler } from "./assembler.ts";
import { VM } from "./vm.ts";

const source = `
jump start

add_two_nums:
    peek fp[1]
    set x=a
    peek fp[2]
    set y=a
    + x y
    return

start:
    push 120
    push 3
    call add_two_nums
`;

const a = new Assembler();
const program = a.run(source);

const vm = new VM();
vm.run(program);
