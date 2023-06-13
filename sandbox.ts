import { Assembler } from "./assembler.ts";
import { BlueBerry, bbHeader } from "./blueberry.ts";
import { Preprocessor } from "./preprocessor.ts";

const source = `
${bbHeader}

$define COUNTER 0xbbb9
$define CURSOR_POSITION 0xaa00
$define CURSOR_SPEED 1

jump main

// don't move this lol cos address is hardcoded
interrupt__render:
  call clear_screen_buffer

  // draw x
  peek $CURSOR_POSITION[0]
  / a 16
  push a
  call draw_pixel
  pop

  // draw y
  peek $CURSOR_POSITION[1]
  push a
  / a 16
  call draw_pixel
  pop

  syscall $SysCallOpcode.Render
  
  return

// ()
clear_screen_buffer:
  set x=0

  clear_screen_buffer_inc_a:
  set a=0
  poke $SCREEN_MEMORY_START[x]

  + x 1
  set x=a


  == x 0
  jump==0 clear_screen_buffer_inc_a

  return

// (x,y)
draw_pixel:
  // read x
  peek fp[0]
  // move x value to x reg
  set x=a

  // read y
  peek fp[1]
  // move y value to y reg
  set y=a

  // get index in screen buffer
  * y $SCREEN_WIDTH
  + a x

  poke $SCREEN_MEMORY_START[a]

  return

// ()
print_a:
  poke $SYSCALL_ARGS_ADDRESS[0]
  syscall $SysCallOpcode.Print
  return

// (value)
print:
  peek fp[0]
  call print_a
  return


wait_255:
  peek $COUNTER
  + a 1
  poke $COUNTER

  == a 255
  jump==0 wait_255

  return

wait_2550:
  // :(
  call wait_255
  call wait_255
  call wait_255
  call wait_255
  call wait_255
  call wait_255
  call wait_255
  call wait_255
  call wait_255
  call wait_255
  return


// (keycode)
is_key_pressed:
  // put keycode in x
  peek fp[0]
  set x=a

  // read key state
  peek $KEY_STATE

  // compare key to keycode
  & a x
  != a 0

  // call print_a

  return

is_left_key_pressed:
  push $KEYCODE_LEFT
  call is_key_pressed
  pop
  call print_a
  return

is_right_key_pressed:
  push $KEYCODE_RIGHT
  call is_key_pressed
  pop
  return

is_up_key_pressed:
  push $KEYCODE_UP
  call is_key_pressed
  pop
  return

is_down_key_pressed:
  push $KEYCODE_DOWN
  call is_key_pressed
  pop
  return

main:
  call wait_2550

  call is_up_key_pressed

  jump==0 main

  peek $CURSOR_POSITION[0]
  + a 1
  poke $CURSOR_POSITION[0]

  jump main

end:
  halt

`;

const p = new Preprocessor();
const processedSource = p.run(source);

const a = new Assembler();
const program = a.run(processedSource);

const bb = new BlueBerry();
bb.start(program);
