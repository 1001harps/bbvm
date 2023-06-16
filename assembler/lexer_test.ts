import { assertEquals } from "https://deno.land/std@0.191.0/testing/asserts.ts";
import { RegisterName } from "../core/opcode.ts";
import { Lexer } from "./lexer.ts";

Object.keys(RegisterName).forEach((r) => {
  Deno.test(`Lexer: register_literal tokens - ${r}`, () => {
    const l = new Lexer();
    const tokens = l.run("", r);

    assertEquals(tokens.length, 2);
    assertEquals(tokens[1].type, "eof");
    assertEquals(tokens[0].type, "register_literal");
    assertEquals(tokens[0].value, r);
  });
});

["0", "1", "123", "0x0", "0x1", "0x123", "0b0", "0b1", "0b101"].forEach((n) => {
  Deno.test(`Lexer: integer_literal tokens - ${n}`, () => {
    const l = new Lexer();
    const tokens = l.run("", n);

    assertEquals(tokens.length, 2);
    assertEquals(tokens[1].type, "eof");
    assertEquals(tokens[0].type, "integer_literal");
    assertEquals(tokens[0].value, n);
  });
});
