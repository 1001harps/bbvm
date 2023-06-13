import { assertEquals } from "https://deno.land/std@0.191.0/testing/asserts.ts";
import {
  AddressType,
  OffsetSign,
  OffsetType,
  Opcode,
  OperandType,
  Register,
  RegisterName,
  registerByNameLookup,
} from "./opcode.ts";
import { Assembler, isNumber, isRegister, parseNumber } from "./assembler.ts";

//#region parse functions
const isNumberTestData: [string, boolean][] = [
  ["0", true],
  ["123", true],
  ["12334321", true],
  ["0x1", true],
  ["0xab", true],
  ["0b1", true],
  ["0b101", true],
  ["not a number", false],
];

isNumberTestData.forEach(([s, expected]) => {
  Deno.test(`assembler: isNumber("${s}") = ${expected}`, () => {
    assertEquals(expected, isNumber(s));
  });
});

const parseNumberTestData: [string, number][] = [
  ["0", 0],
  ["123", 123],
  ["12334321", 12334321],
  ["0x1", 1],
  ["0xab", 171],
  ["0b1", 1],
  ["0b101", 5],
];

parseNumberTestData.forEach(([s, expected]) => {
  Deno.test(`assembler: parseNumber("${s}") = ${expected}`, () => {
    assertEquals(expected, parseNumber(s));
  });
});

const registerTestData = ["a", "x", "y", "xy", "ip", "fp", "sp"];

registerTestData.forEach((s) => {
  Deno.test(`assembler: isRegister("${s}") = true`, () => {
    assertEquals(true, isRegister(s));
  });
});

Deno.test(`assembler: isRegister("not a register") = false`, () => {
  assertEquals(false, isRegister("not a register"));
});

//#endregion

const getPeekTests = (addressType: AddressType, address: string) => {
  const sourceOperands =
    addressType === AddressType.Register
      ? [AddressType.Register, registerByNameLookup[address as RegisterName], 0]
      : [
          AddressType.Literal,
          ((address === "label" ? 0 : parseNumber(address)) & 0xff00) >> 8,
          (address === "label" ? 0 : parseNumber(address)) & 0xff,
        ];

  return [
    {
      source: `
      label:
      peek ${address}`,
      expected: [
        Opcode.Peek,
        ...sourceOperands,
        OffsetType.Literal,
        OffsetSign.Plus,
        0,
      ],
    },
    {
      source: `
      label:
      peek ${address}[0]`,
      expected: [
        Opcode.Peek,
        ...sourceOperands,
        OffsetType.Literal,
        OffsetSign.Plus,
        0,
      ],
    },
    {
      source: `
      label:
      peek ${address}[1]`,
      expected: [
        Opcode.Peek,
        ...sourceOperands,
        OffsetType.Literal,
        OffsetSign.Plus,
        1,
      ],
    },
    {
      source: `
      label:
      peek ${address}[+1]`,
      expected: [
        Opcode.Peek,
        ...sourceOperands,
        OffsetType.Literal,
        OffsetSign.Plus,
        1,
      ],
    },
    {
      source: `
      label:
      peek ${address}[-1]`,
      expected: [
        Opcode.Peek,
        ...sourceOperands,
        OffsetType.Literal,
        OffsetSign.Minus,
        1,
      ],
    },
    {
      source: `
      label:
      peek ${address}[a]`,
      expected: [
        Opcode.Peek,
        ...sourceOperands,
        OffsetType.Register,
        OffsetSign.Plus,
        Register.A,
      ],
    },
    {
      source: `
      label:
      peek ${address}[+a]`,
      expected: [
        Opcode.Peek,
        ...sourceOperands,
        OffsetType.Register,
        OffsetSign.Plus,
        Register.A,
      ],
    },
    {
      source: `
      label:
      peek ${address}[-a]`,
      expected: [
        Opcode.Peek,
        ...sourceOperands,
        OffsetType.Register,
        OffsetSign.Minus,
        Register.A,
      ],
    },
  ];
};

const getPokeTests = (addressType: AddressType, address: string) => {
  const destinationOperands =
    addressType === AddressType.Register
      ? [AddressType.Register, registerByNameLookup[address as RegisterName], 0]
      : [
          AddressType.Literal,
          ((address === "label" ? 0 : parseNumber(address)) & 0xff00) >> 8,
          (address === "label" ? 0 : parseNumber(address)) & 0xff,
        ];

  return [
    {
      source: `
      label:
      poke ${address}`,
      expected: [
        Opcode.Poke,
        ...destinationOperands,
        OffsetType.Literal,
        OffsetSign.Plus,
        0,
      ],
    },
    {
      source: `
      label:
      poke ${address}[0]`,
      expected: [
        Opcode.Poke,
        ...destinationOperands,
        OffsetType.Literal,
        OffsetSign.Plus,
        0,
      ],
    },
    {
      source: `
      label:
      poke ${address}[1]`,
      expected: [
        Opcode.Poke,
        ...destinationOperands,
        OffsetType.Literal,
        OffsetSign.Plus,
        1,
      ],
    },
    {
      source: `
      label:
      poke ${address}[+1]`,
      expected: [
        Opcode.Poke,
        ...destinationOperands,
        OffsetType.Literal,
        OffsetSign.Plus,
        1,
      ],
    },
    {
      source: `
      label:
      poke ${address}[-1]`,
      expected: [
        Opcode.Poke,
        ...destinationOperands,
        OffsetType.Literal,
        OffsetSign.Minus,
        1,
      ],
    },
    {
      source: `
      label:
      poke ${address}[a]`,
      expected: [
        Opcode.Poke,
        ...destinationOperands,
        OffsetType.Register,
        OffsetSign.Plus,
        Register.A,
      ],
    },
    {
      source: `
      label:
      poke ${address}[+a]`,
      expected: [
        Opcode.Poke,
        ...destinationOperands,
        OffsetType.Register,
        OffsetSign.Plus,
        Register.A,
      ],
    },
    {
      source: `
      label:
      poke ${address}[-a]`,
      expected: [
        Opcode.Poke,
        ...destinationOperands,
        OffsetType.Register,
        OffsetSign.Minus,
        Register.A,
      ],
    },
  ];
};

const labelTestData: { source: string; expected: number[] }[] = [
  { source: "label:", expected: [] },
  {
    source: `
        label:
        halt
      `,
    expected: [Opcode.Halt],
  },
  {
    source: `
        halt
        label:
      `,
    expected: [Opcode.Halt],
  },
  {
    source: `
        halt
        label:
        halt
      `,
    expected: [Opcode.Halt, Opcode.Halt],
  },
  {
    source: `
        pop a
        label:
        halt
        call label
      `,
    expected: [Opcode.Pop, Register.A, Opcode.Halt, Opcode.Call, 0, 1],
  },
  {
    source: `
        start:
        push 123
        end:
        halt
        call end
      `,
    expected: [
      Opcode.Push,
      OperandType.Literal,
      123,
      Opcode.Halt,
      Opcode.Call,
      0,
      3,
    ],
  },
];

const operatorTestData: [string, Opcode][] = [
  ["+", Opcode.Add],
  ["-", Opcode.Subtract],
  ["*", Opcode.Multiply],
  ["/", Opcode.Divide],
  ["<<", Opcode.ShiftLeft],
  [">>", Opcode.ShiftRight],
  ["==", Opcode.EqualTo],
  ["!=", Opcode.NotEqualTo],
  ["&", Opcode.And],
  ["|", Opcode.Or],
  ["~", Opcode.Not],
];

//#region instructions
const assemblerTestData: { source: string; expected: number[] }[] = [
  // comments
  { source: "//", expected: [] },
  { source: "// halt", expected: [] },
  // single opcode instructions
  { source: "halt", expected: [Opcode.Halt] },

  // arithmetic/logic
  ...operatorTestData.map(([operator, opcode]) => ({
    source: `${operator} a x`,
    expected: [opcode, Register.A, OperandType.Register, Register.X],
  })),
  ...operatorTestData.map(([operator, opcode]) => ({
    source: `${operator} a 123`,
    expected: [opcode, Register.A, OperandType.Literal, 123],
  })),

  // subroutines
  { source: "pop", expected: [Opcode.Pop, Register.A] },
  { source: "pop a", expected: [Opcode.Pop, Register.A] },
  { source: "pop x", expected: [Opcode.Pop, Register.X] },
  { source: "return", expected: [Opcode.Return] },
  // labels
  ...labelTestData,
  // set
  {
    source: "set a=123",
    expected: [Opcode.Set, Register.A, OperandType.Literal, 123],
  },
  {
    source: "set a=x",
    expected: [Opcode.Set, Register.A, OperandType.Register, Register.X],
  },

  ...getPeekTests(AddressType.Register, "xy"),
  ...getPeekTests(AddressType.Register, "fp"),
  ...getPeekTests(AddressType.Literal, "0xabcd"),
  ...getPeekTests(AddressType.Literal, "label"),

  ...getPokeTests(AddressType.Register, "xy"),
  ...getPokeTests(AddressType.Literal, "0xabcd"),
  ...getPokeTests(AddressType.Literal, "label"),

  {
    source: "poke 0xcccc",
    expected: [
      Opcode.Poke,
      AddressType.Literal,
      0xcc,
      0xcc,
      OffsetType.Literal,
      OffsetSign.Plus,
      0,
    ],
  },

  // push
  {
    source: "push 123 ",
    expected: [Opcode.Push, OperandType.Literal, 123],
  },
  ...Object.keys(RegisterName).map((reg) => ({
    source: `push ${reg}`,
    expected: [
      Opcode.Push,
      OperandType.Register,
      registerByNameLookup[RegisterName[reg as RegisterName]],
    ],
  })),
  // call
  {
    source: "call 123",
    expected: [Opcode.Call, 0, 123],
  },
  {
    source: `
    label:
    call label`,
    expected: [Opcode.Call, 0, 0],
  },
  // jump
  {
    source: "jump 123",
    expected: [Opcode.Jump, 0, 123],
  },
  {
    source: `
        label:
        jump label`,
    expected: [Opcode.Jump, 0, 0],
  },
  {
    source: "jump==0 123",
    expected: [Opcode.JumpIfZero, 0, 123],
  },
  {
    source: `
        label:
        jump!=0 label`,
    expected: [Opcode.JumpIfNotZero, 0, 0],
  },
  {
    source: "jump!=0 123",
    expected: [Opcode.JumpIfNotZero, 0, 123],
  },
  {
    source: `
        label:
        jump!=0 label`,
    expected: [Opcode.JumpIfNotZero, 0, 0],
  },

  // syscall
  {
    source: "syscall 123",
    expected: [Opcode.SysCall, 123],
  },
];

assemblerTestData.forEach(({ source, expected }) => {
  Deno.test(`assembler: ${source}`, () => {
    const a = new Assembler();
    const program = a.run(source);

    assertEquals(program.length, expected.length);
    for (let i = 0; i < expected.length; i++) {
      assertEquals(program[i], expected[i]);
    }
  });
});

//#endregion
