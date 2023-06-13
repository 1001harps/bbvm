import { assertEquals } from "https://deno.land/std@0.191.0/testing/asserts.ts";
import { VM } from "./vm.ts";

Deno.test("vm - call() saves state correctly", () => {
  const address = 11;
  const ip = 22;
  const fp = 33;
  const sp = 44;

  const x = 55;
  const y = 66;

  const vm = new VM({});
  vm.ip = ip;
  vm.fp = fp;
  vm.sp = sp;
  vm.x = x;
  vm.y = y;

  vm.call(address);

  // ip should be set to address we are calling
  assertEquals(vm.ip, address);
  // fp should be set to sp before saving registers, so fp[0] is arg[0]
  assertEquals(vm.fp, sp);

  // top items on stack should be x and y registers
  assertEquals(vm.pop(), vm.x);
  assertEquals(vm.pop(), vm.y);

  // top item on stack should be original fp
  const originalFp = (vm.pop() << 8) + vm.pop();
  assertEquals(originalFp, fp);

  // next item should be return address, which is address vm was at before call
  const returnAddress = (vm.pop() << 8) + vm.pop();
  assertEquals(returnAddress, ip);
});
