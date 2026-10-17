# Python Course: Remaining Chapters After Chapter 2

**Course**: Python from Zero  
**Chapters Completed**: 1-2 (10 pages total, approved)  
**Chapters Remaining**: 3-9 (56 pages total, need generation)

---

## Chapter 3: Operators (7 pages, LOCKED)

**Summary**: Arithmetic, comparison, and logical operators in everyday expressions.

**Topics to cover**:
- Arithmetic operators: `+`, `-`, `*`, `/`, `//`, `%`, `**`
- Comparison operators: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical operators: `and`, `or`, `not`
- Operator precedence and parentheses
- Combining operators in expressions
- Common operator mistakes

**Prerequisites**: Chapter 1 (Variables), Chapter 2 (Data Types)

---

## Chapter 4: Conditions (9 pages, LOCKED)

**Summary**: Use if, elif, and else to make your program choose a path.

**Topics to cover**:
- `if` statements and indentation
- `else` clause
- `elif` for multiple conditions
- Nested conditions
- Boolean expressions in conditions
- Common condition patterns (range checks, validation, etc.)
- Truthy and falsy values
- Guard clauses and early returns
- Practice: grade calculator, age categories

**Prerequisites**: Chapter 2 (Booleans), Chapter 3 (Comparison operators)

---

## Chapter 5: Loops (9 pages, LOCKED)

**Summary**: Repeat work with for and while, and make sure every loop can stop.

**Topics to cover**:
- `for` loops with ranges
- `for` loops with lists
- `while` loops
- Loop control: `break`, `continue`
- Infinite loops and how to avoid them
- Nested loops
- Loop patterns (counting, accumulating, filtering)
- `range()` function variations
- Practice: multiplication table, sum calculator

**Prerequisites**: Chapter 3 (Operators), Chapter 4 (Conditions)

---

## Chapter 6: Functions (8 pages, LOCKED)

**Summary**: Package logic into reusable functions with parameters and return values.

**Topics to cover**:
- Defining functions with `def`
- Parameters and arguments
- Return values
- Multiple parameters
- Default parameter values
- Variable scope (local vs global)
- Docstrings
- Practice: calculator functions, validators

**Prerequisites**: All previous chapters (functions use variables, conditions, loops)

---

## Chapter 7: Lists and Dictionaries (10 pages, LOCKED)

**Summary**: Store collections, look items up by key, and loop over both.

**Topics to cover**:
- Creating and indexing lists
- List methods: `append()`, `insert()`, `remove()`, `pop()`
- List slicing
- Looping over lists
- List comprehensions (basic)
- Creating dictionaries
- Dictionary access and modification
- Dictionary methods: `keys()`, `values()`, `items()`
- Looping over dictionaries
- Practice: contact list, inventory system

**Prerequisites**: Chapter 5 (Loops - for iterating over collections)

---

## Chapter 8: Files (7 pages, LOCKED)

**Summary**: Read from and write to text files safely with a with block.

**Topics to cover**:
- Opening and closing files
- `with` statement (context manager)
- Reading files: `read()`, `readline()`, `readlines()`
- Writing files: `write()`, `writelines()`
- File modes: `'r'`, `'w'`, `'a'`
- Working with file paths
- Error handling with files (FileNotFoundError)
- Practice: save user data, read configuration

**Prerequisites**: Chapter 7 (Lists - for reading multiple lines)

---

## Chapter 9: Mini Project (6 pages, LOCKED)

**Summary**: Combine everything into a small to-do list app that saves to a file.

**Topics to cover**:
- Project planning and structure
- Building a menu system (functions + loops + conditions)
- Managing a list of tasks (list operations)
- Saving and loading from file (file I/O)
- Input validation and error handling
- Incremental development approach
- Practice: extending the app with features

**Prerequisites**: All chapters 1-8

---

## Generation Priority

**Phase 1 (Core fundamentals)**: Chapters 3-5 (25 pages)
- Essential for progressing through the course
- Build on Chapter 1-2 concepts

**Phase 2 (Advanced concepts)**: Chapters 6-7 (18 pages)
- Functions and data structures
- Require solid understanding of basics

**Phase 3 (Integration)**: Chapters 8-9 (13 pages)
- File I/O and capstone project
- Combine all previous learning

**Total pages to generate**: 56 pages

---

## Notes for Content Generation

1. **Maintain consistency**: All pages must follow STYLE-GUIDE.md patterns
2. **Progressive difficulty**: Each chapter builds on previous ones
3. **Practice-oriented**: Every chapter needs hands-on practice pages
4. **Tanglish throughout**: Maintain the conversational Tanglish tone from Ch 1-2
5. **Code verification**: All code blocks will be executed in sandbox
6. **Knowledge base**: Ground in Python documentation when available
7. **Citation required**: Cite any facts from uploaded Python docs

---

## Outline Generation Command

Before generating any chapter, run:

```bash
python backend/scripts/generate_course.py outline --chapter 3
```

This will create `docs/outlines/chapter-3.md` with proposed page titles and topics for owner review and approval BEFORE any content generation begins.

---

**Last Updated**: 2026-10-17  
**Status**: Awaiting outline generation for Chapter 3
