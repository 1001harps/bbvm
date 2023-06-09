# bbvm 🐁✨💻

~ tiny 8bit vm + assembler ~

---

## specs

memory

- 16k, $0000->$ffff

registers:

|      |                                          |
| ---- | ---------------------------------------- |
| `a`  | accumulator, 8bit unsigned int           |
| `x`  | general purpose, 8bit unsigned int       |
| `y`  | general purpose, 8bit unsigned int       |
| `xy` | (x << 8) + y, read as 16bit unsigned int |
| `ip` | instruction pointer, 16bit unsigned int  |
| `sp` | stack pointer, 16bit unsigned int        |
| `fp` | frame pointer, 16bit unsigned int        |

---

## instructions

### arithmetic / logic

```
<operator> <left register> <right register>
(result of operation is put in a register)
```

| operator | operation        |                      |
| -------- | ---------------- | -------------------- |
| `+`      | add              |                      |
| `-`      | subtract         |                      |
| `*`      | multiply         |                      |
| `/`      | divide           |                      |
| `<<`     | shift bits left  |                      |
| `>>`     | shift bits right |                      |
| `&`      | bitwise and      |                      |
| `\|`     | bitwise or       |                      |
| `~`      | bitwise not      | (left register only) |

examples:

```
+ a x
- x y
* a a
/ y x
~ a
```

### branching

```
<jump | jump==0 | jump!=0> <label> // jump my_label, jump==0 my_label, jump!=0 my_label
<jump | jump==0 | jump!=0> <integer literal address> // jump 0x1234, jump==0 0x1234, jump!=0 0x1234
```

| instruction | description                                    |
| ----------- | ---------------------------------------------- |
| `jump`      | unconditional jump                             |
| `jump==0`   | jump to destination if value in `a` is `0`     |
| `jump!=0`   | jump to destination if value in `a` is non `0` |

### register operations

```
set <destination register>=<source register> // set a=x,set y=a set
<destination register>=<integer literal // set a=123
```

### memory operations

read from memory, result goes into "a" register

```
peek xy // read memory at address in xy register, with optional offset
peek label // read memory at address defined by label
peek 0xabcd // read memory at address defined by integer

// with offsets
peek xy[1], peek xy[+1], peek xy[-1] // using offset literal, address+-offset
peek xy[a], peek xy[+a], peek xy[-a] // using register offset, address+-value in register
```

write memory, value comes from "a" register

```
poke xy // write value in "a" register into memory at address in xy register, with optional offset
poke label // write value in "a" register into memory at address defined by label
poke 0xabcd // write value in "a" register into memory at address defined by integer

// with offsets
poke xy[1], poke xy[+1], poke xy[-1] // using offset literal, address+-offset
poke xy[a], poke xy[+a], poke xy[-a] // using register offset, address+-value in register
```

### subroutines

```
call <label> // call my_label call <integer literal> // call 0xabcd return
```

### stack operations

```
push <integer literal> // push 123 push <register> // push a, push x
```

```
pop // result placed in accumulator
```

---

### calling convention

```
jump start

cool_subroutine: // parameters are accessed in reverse order, from fp[n..1] peek
fp[1] // arg 3, 33 peek fp[2] // arg 2, 22 peek fp[3] // arg 1, 11 return

start: // push args push 11 // arg 1 push 22 // arg 2 push 33 // arg 3 call
cool_subroutine halt
```
