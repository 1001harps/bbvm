import {
  assertEquals,
  assertExists,
  assertFalse,
  assertObjectMatch,
} from "https://deno.land/std@0.191.0/testing/asserts.ts";
import {
  Register,
  RegisterName,
  registerByNameLookup,
} from "../core/opcode.ts";
import {
  IRConstDefinition,
  IRGenerator,
  IRLabelDefinition,
  IROffset,
  IRToken,
} from "./ir.ts";
import { Lexer } from "./lexer.ts";

const instructionTestData: { source: string; expected: Partial<IRToken> }[] = [
  {
    source: "push 123",
    expected: {
      type: "instruction",
      name: "push",
      operands: [
        // @ts-ignore
        {
          type: "integer_literal",
          value: 123,
        },
      ],
    },
  },
  {
    source: "set a 123",
    expected: {
      type: "instruction",
      name: "set",
      operands: [
        // @ts-ignore
        {
          type: "register_literal",
          value: Register.A,
        },
        // @ts-ignore
        {
          type: "integer_literal",
          value: 123,
        },
      ],
    },
  },
  {
    source: "jump #test",
    expected: {
      type: "instruction",
      name: "jump",
      operands: [
        // @ts-ignore
        {
          type: "label",
          value: "test",
        },
      ],
    },
  },
  {
    source: "jump #test[0]",
    expected: {
      type: "instruction",
      name: "jump",
      operands: [
        // @ts-ignore
        {
          type: "label",
          value: "test",
          offset: {
            sign: "+",
            type: "literal",
            value: 0,
          },
        },
      ],
    },
  },
];

instructionTestData.forEach(({ source, expected }) => {
  Deno.test(`IRGen instructions: ${source}`, () => {
    const l = new Lexer();
    const tokens = l.run("", source);

    const irgen = new IRGenerator();
    const ir = irgen.run(tokens);

    assertEquals(ir.length, 1, `expected 1 IR token, got ${ir.length}`);
    assertEquals(ir[0].type, "instruction");
    if (ir[0].type === "instruction") {
      //@ts-ignore
      const expectedOperandAmount = expected.operands.length;
      assertEquals(
        ir[0].operands.length,
        expectedOperandAmount,
        `expected instruction to have ${expectedOperandAmount} operands, got ${ir[0].operands.length}`
      );
      assertObjectMatch(ir[0], expected);
    }
  });
});

const integerTestData: [string, number][] = [
  ["0", 0],
  ["1", 1],
  ["123", 123],
  ["0x0", 0],
  ["0x1", 1],
  ["0x123", 291],
  ["0b0", 0],
  ["0b1", 1],
  ["0b101", 5],
];

integerTestData.forEach(([source, value]) => {
  Deno.test(`IRGen.parseOperand(${source}) -> integer_literal`, () => {
    const l = new Lexer();
    const tokens = l.run("", source);

    const irgen = new IRGenerator();
    irgen.tokens = tokens;
    const operand = irgen.parseOperand();

    assertEquals(operand.type, "integer_literal");
    if (operand.type === "integer_literal") {
      assertEquals(operand.value, value);
      assertFalse(operand.offset);
    }
  });
});

Object.keys(RegisterName).forEach((r) => {
  Deno.test(`IRGen.parseOperand(${r}) -> register_literal`, () => {
    const l = new Lexer();
    const tokens = l.run("", r);

    const irgen = new IRGenerator();
    irgen.tokens = tokens;
    const operand = irgen.parseOperand();

    assertEquals(operand.type, "register_literal");
    if (operand.type === "register_literal") {
      assertEquals(operand.value, registerByNameLookup[r as RegisterName]);
    }
  });
});

Deno.test(`IRGen.parseOperand() -> label`, () => {
  const l = new Lexer();
  const tokens = l.run("", "#test_label");

  const irgen = new IRGenerator();
  irgen.tokens = tokens;
  const operand = irgen.parseOperand();

  assertEquals(operand.type, "label");
  if (operand.type === "label") {
    assertFalse(operand.offset);
  }
});

Deno.test(`IRGen.parseOperand() -> label with offset`, () => {
  const l = new Lexer();
  const tokens = l.run("", "#test_label[-1]");

  const irgen = new IRGenerator();
  irgen.tokens = tokens;
  const operand = irgen.parseOperand();

  assertEquals(operand.type, "label");
  if (operand.type === "label") {
    assertExists(operand.offset);
    assertObjectMatch(operand.offset as IROffset, {
      type: "literal",
      value: 1,
      sign: "-",
    });
  }
});

Deno.test(`IRGen const definition - int literal`, () => {
  const l = new Lexer();
  const tokens = l.run("", "const test = 123");

  const irgen = new IRGenerator();
  const ir = irgen.run(tokens);

  const def = ir[0] as IRConstDefinition;
  assertEquals(def.type, "const_definition");
  assertEquals(def.name, "test");
  assertObjectMatch(def.value, { type: "integer_literal", value: 123 });
});

Deno.test(`IRGen const definition - register`, () => {
  const l = new Lexer();
  const tokens = l.run("", "const test = x");

  const irgen = new IRGenerator();
  const ir = irgen.run(tokens);

  const def = ir[0] as IRConstDefinition;
  assertEquals(def.type, "const_definition");
  assertEquals(def.name, "test");
  assertObjectMatch(def.value, { type: "register_literal", value: Register.X });
});

Deno.test(`IRGen label definition`, () => {
  const l = new Lexer();
  const tokens = l.run("", "#test:");

  const irgen = new IRGenerator();
  const ir = irgen.run(tokens);

  const def = ir[0] as IRLabelDefinition;
  assertEquals(def.type, "label_definition");
  assertEquals(def.name, "test");
});

const offsetTestData: { source: string; expected: IROffset }[] = [
  {
    source: "[0]",
    expected: {
      type: "literal",
      value: 0,
      sign: "+",
    },
  },
  {
    source: "[1]",
    expected: {
      type: "literal",
      value: 1,
      sign: "+",
    },
  },
  {
    source: "[+1]",
    expected: {
      type: "literal",
      value: 1,
      sign: "+",
    },
  },
  {
    source: "[-1]",
    expected: {
      type: "literal",
      value: 1,
      sign: "-",
    },
  },
  {
    source: "[a]",
    expected: {
      type: "register",
      value: Register.A,
      sign: "+",
    },
  },
  {
    source: "[x]",
    expected: {
      type: "register",
      value: Register.X,
      sign: "+",
    },
  },
  {
    source: "[+x]",
    expected: {
      type: "register",
      value: Register.X,
      sign: "+",
    },
  },
  {
    source: "[-x]",
    expected: {
      type: "register",
      value: Register.X,
      sign: "-",
    },
  },
];

offsetTestData.forEach(({ source, expected }) => {
  Deno.test(`IRGen.parseOffset(${source})`, () => {
    const l = new Lexer();
    const tokens = l.run("", source);

    const irgen = new IRGenerator();
    irgen.tokens = tokens;
    const offset = irgen.parseOffset();

    assertObjectMatch(offset, expected);
  });
});

Deno.test(`call label after another instruction`, () => {
  const l = new Lexer();
  const source = `
  halt
  call #test
  `;

  const tokens = l.run("", source);

  const irgen = new IRGenerator();
  const result = irgen.run(tokens);

  const expected = [
    { type: "instruction", name: "halt" },
    {
      type: "instruction",
      name: "call",
      operands: [
        {
          type: "label",
          value: "test",
        },
      ],
    },
  ];

  assertEquals(result.length, expected.length);

  for (let i = 0; i < expected.length; i++) {
    assertObjectMatch(result[i], expected[i]);
  }
});

Deno.test(`peek - literal with register offset`, () => {
  const l = new Lexer();
  const source = `
  #label:
  peek 0xabcd[-a]
  `;

  const tokens = l.run("", source);

  const irgen = new IRGenerator();
  const result = irgen.run(tokens);

  const expected: IRToken[] = [
    { type: "label_definition", name: "label" } as IRToken,
    {
      type: "instruction",
      name: "peek",
      operands: [
        {
          type: "integer_literal",
          value: 0xabcd,
          offset: {
            type: "register",
            sign: "-",
            value: Register.A,
          },
        },
      ],
    } as IRToken,
  ];

  assertEquals(result.length, expected.length);

  for (let i = 0; i < expected.length; i++) {
    assertObjectMatch(result[i], expected[i]);
  }
});

Deno.test(`const definition`, () => {
  const l = new Lexer();
  const source = `
const test = 0xbb00
  `;

  const tokens = l.run("", source);

  const irgen = new IRGenerator();
  const result = irgen.run(tokens);

  const expected: IRToken[] = [
    {
      type: "const_definition",
      name: "test",
      value: {
        type: "integer_literal",
        value: 0xbb00,
      },
    } as IRToken,
  ];

  assertEquals(result.length, expected.length);

  for (let i = 0; i < expected.length; i++) {
    assertObjectMatch(result[i], expected[i]);
  }
});

Deno.test(`subroutine using consts`, () => {
  const l = new Lexer();
  const source = `
const test_addr = 123
const test_code = 234

#print_a:
  poke $test_addr[0]
  syscall $test_code
  return
  `;

  const tokens = l.run("", source);

  const irgen = new IRGenerator();
  const result = irgen.run(tokens);

  // :((((
  result.forEach((irToken) => {
    // @ts-ignore
    delete irToken.token;
    // @ts-ignore
    if (irToken.operands) {
      // @ts-ignore
      irToken.operands.forEach((op) => {
        delete op.token;
      });
    }
  });

  const expected = [
    {
      type: "const_definition",
      name: "test_addr",
      value: {
        type: "integer_literal",
        value: 123,
      },
    } as IRToken,
    {
      type: "const_definition",
      name: "test_code",
      value: {
        type: "integer_literal",
        value: 234,
      },
    } as IRToken,
    {
      type: "label_definition",
      name: "print_a",
    },
    {
      type: "instruction",
      name: "poke",
      operands: [
        {
          type: "const",
          value: "test_addr",
          offset: {
            type: "literal",
            sign: "+",
            value: 0,
          } as IROffset,
        },
      ],
    },
    {
      type: "instruction",
      name: "syscall",
      operands: [
        {
          type: "const",
          value: "test_code",
        },
      ],
    },
    {
      type: "instruction",
      name: "return",
    },
  ];

  assertEquals(result.length, expected.length);

  for (let i = 0; i < expected.length; i++) {
    assertObjectMatch(result[i], expected[i]);
  }
});
