$define COUNTER 0xbbb9
$define CURSOR_POSITION 0xaa00
$define CURSOR_SPEED 1

jump main

// don't move this lol cos address is hardcoded
interrupt__render:
  call clear_screen_buffer

  // get y and push to stack
  peek $CURSOR_POSITION[1]
  / a 16
  push a

  // get x and push to stack
  peek $CURSOR_POSITION[0]
  / a 16
  push a

  // render
  call draw_pixel
  pop x
  pop x

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
  pop x
  return

is_right_key_pressed:
  push $KEYCODE_RIGHT
  call is_key_pressed
  pop x
  return

is_up_key_pressed:
  push $KEYCODE_UP
  call is_key_pressed
  pop x
  return

is_down_key_pressed:
  push $KEYCODE_DOWN
  call is_key_pressed
  pop x
  return

inc_x:
  peek $CURSOR_POSITION[0]
  + a 1
  poke $CURSOR_POSITION[0]
  return

dec_x:
  peek $CURSOR_POSITION[0]
  - a 1
  poke $CURSOR_POSITION[0]
  return

inc_y:
  peek $CURSOR_POSITION[1]
  + a 1
  poke $CURSOR_POSITION[1]
  return

dec_y:
  peek $CURSOR_POSITION[1]
  - a 1
  poke $CURSOR_POSITION[1]
  return

update:
  // check up key
  call is_up_key_pressed
  jump==0 update_after_up_check

  call dec_y

  update_after_up_check:

  // check down key
  call is_down_key_pressed
  jump==0 update_after_down_check

  call inc_y

  update_after_down_check:

  // check left key
  call is_left_key_pressed
  jump==0 update_after_left_check

  call dec_x

  update_after_left_check:

  // check right key
  call is_right_key_pressed
  jump==0 update_after_right_check

  call inc_x

  update_after_right_check:

  return

main:
  call wait_2550
  call update
  jump main

end:
  halt