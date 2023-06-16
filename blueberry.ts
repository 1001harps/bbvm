// TODO: this should be its own package

import {
  EventType,
  WindowBuilder,
} from "https://deno.land/x/sdl2@0.6.0/mod.ts";
import { green } from "./debug.ts";
import { VM } from "./vm.ts";

enum KeyScanCode {
  LeftArrow = 80,
  RightArrow = 79,
  UpArrow = 82,
  DownArrow = 81,
  Z = 29,
  X = 27,
  Space = 44,
}

const keys = [
  KeyScanCode.LeftArrow,
  KeyScanCode.RightArrow,
  KeyScanCode.UpArrow,
  KeyScanCode.DownArrow,
  KeyScanCode.Z,
  KeyScanCode.X,
  KeyScanCode.Space,
  // ctrl?
];

const CLOCK_SPEED = 4_000_000; // 4Mhz
const INSTRUCTIONS_PER_MS = CLOCK_SPEED / 1000;

const SCREEN_WIDTH = 16;
const SCREEN_HEIGHT = 16;
const SCREEN_PIXEL_COUNT = SCREEN_WIDTH * SCREEN_HEIGHT;
const SCALE = 50;

const KEY_STATE_ADDRESS = 0xcccc;
const SYSCALL_ARGS_ADDRESS = 0xbb00;
const SCREEN_MEMORY_START = 0x1000;

export enum SysCallOpcode {
  Print = 1,
  Render,
}

export const addr = (n: number) => `0x${n.toString(16)}`;

export class BlueBerry {
  start(rom: Uint8Array) {
    const vm = new VM({});
    vm.load(rom);

    const printQueue: number[] = [];
    let lastPrintedValue = -1;
    let lastPrintedValueCount = 0;

    const flushPrintQueue = () => {
      // flush print queue
      while (printQueue.length > 0) {
        const value = printQueue.shift();
        if (!value && value !== 0) break;

        // same value, just increment count
        if (lastPrintedValue == value) {
          lastPrintedValueCount++;
          continue;
        }

        // value has changed

        // print
        // if (lastPrintedValueCount > 0) {
        //   console.log(`${green(value)} (${lastPrintedValueCount})`);
        // } else {
        //   console.log(`${green(value)}`);
        // }

        lastPrintedValue = value;
        lastPrintedValueCount = 0;
      }
    };

    vm.addEventListener("syscall", (code: SysCallOpcode, vm) => {
      switch (code) {
        case SysCallOpcode.Print: {
          const value = vm.memory[SYSCALL_ARGS_ADDRESS];
          // drop older values if queue too long
          if (printQueue.length > 1000) {
            console.log("dropping values from print queue");
            printQueue.shift();
          }
          printQueue.push(value);
          break;
        }
        case SysCallOpcode.Render: {
          canvas.setDrawColor(0, 0, 0, 0);
          canvas.clear();

          const buffer = vm.readMem(
            SCREEN_MEMORY_START,
            SCREEN_MEMORY_START + SCREEN_PIXEL_COUNT
          );

          for (let y = 0; y < SCREEN_HEIGHT; y++) {
            for (let x = 0; x < SCREEN_WIDTH; x++) {
              if (buffer[y * SCREEN_WIDTH + x]) {
                canvas.setDrawColor(255, 255, 255, 255);
                canvas.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
              }
            }
          }

          canvas.present();
          break;
        }
      }
    });

    const window = new WindowBuilder(
      "title",
      SCREEN_WIDTH * SCALE,
      SCREEN_HEIGHT * SCALE
    ).build();
    const canvas = window.canvas();

    let keyState = 0;

    let lastRender = performance.now();
    let delta = 0;

    // let frames = 0;

    let x = 0;

    const FPS = 30;
    const SECONDS_PER_FRAME = 1 / FPS;
    const MS_PER_FRAME = SECONDS_PER_FRAME * 1000;

    for (const event of window.events()) {
      if (event.type == EventType.Quit) {
        Deno.exit(0);
      } else if (event.type == EventType.Draw) {
        const now = performance.now();
        delta = now - lastRender;
        lastRender = now;

        const ticksElapsed = Math.floor(delta * INSTRUCTIONS_PER_MS);
        for (let i = 0; i < ticksElapsed; i++) {
          vm.tick();

          if (vm.ip >= vm.rom.length) {
            console.log("end of program");
            flushPrintQueue();
            Deno.exit(0);
          }
        }

        x += delta;

        if (x >= MS_PER_FRAME) {
          x = 0;
          vm.interrupt();

          // canvas.setDrawColor(0, 0, 0, 0);
          // canvas.clear();

          // console.log("pixelsToDraw", pixelsToDraw);

          // // canvas.setDrawColor(255, 255, 255, 255);
          // // canvas.fillRect(0 * SCALE, 0 * SCALE, SCALE, SCALE);

          // while (pixelsToDraw.length > 0) {
          //   const p = pixelsToDraw.shift();
          //   if (!p) break;

          //   const { x, y } = p;
          //   canvas.setDrawColor(255, 255, 255, 255);
          //   canvas.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
          // }

          // canvas.present();
        }

        flushPrintQueue();
      } else if (event.type === EventType.KeyDown) {
        keys.forEach((key, i) => {
          if (event.keysym.scancode === key) {
            keyState |= 1 << i;
          }
        });
        vm.writeMem(KEY_STATE_ADDRESS, keyState);
      } else if (event.type === EventType.KeyUp) {
        keys.forEach((key, i) => {
          if (event.keysym.scancode === key) {
            keyState &= ~(1 << i);
          }
        });
        vm.writeMem(KEY_STATE_ADDRESS, keyState);
      }
    }
  }
}
