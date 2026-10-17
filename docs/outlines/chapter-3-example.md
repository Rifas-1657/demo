# Chapter 3: Operators

**Summary**: Arithmetic, comparison, and logical operators in everyday expressions.
**Total Pages**: 7

---

## Proposed Page Outline

**Instructions for Owner**:
1. Review each page outline below
2. Edit titles, learning goals, topics, and code sketches as needed
3. Reorder pages if the progression doesn't feel right
4. Approve by running: `python backend/scripts/generate_course.py generate --chapter 3 --pages all`

---

### Page 1: Addition and Subtraction

**Learning Goals**:
- Use + and - operators with numbers
- Understand that operators work with variables
- Combine multiple operations in one expression

**Topics Covered**:
- Basic arithmetic with + and -
- Order of operations (left to right for same precedence)
- Using operators with variables

**Code Example**: Create a simple calculator that adds and subtracts scores, shows total and remaining balance

**Prerequisites**:
- Chapter 1: Variables
- Chapter 2: int and float types

---

### Page 2: Multiplication and Division

**Learning Goals**:
- Use * and / operators
- Understand that / always returns float
- Calculate percentages and ratios

**Topics Covered**:
- Multiplication with *
- Division with /
- Result type (always float for /)
- Real-world calculations (total price, split bill)

**Code Example**: Calculate total price of items (quantity * price), split a bill among friends

**Prerequisites**:
- Page 1: Addition and Subtraction
- Chapter 2: float type

---

### Page 3: Integer Division and Remainder

**Learning Goals**:
- Use // for integer division (drops decimal)
- Use % for remainder (modulo)
- Apply these to real problems (grouping, detecting even/odd)

**Topics Covered**:
- Integer division with //
- Remainder with %
- Practical uses: even/odd check, grouping items

**Code Example**: Split 17 apples among 5 people (how many each + how many left), check if number is even with % 2

**Prerequisites**:
- Page 2: Regular division
- Chapter 2: int vs float

---

### Page 4: Exponentiation

**Learning Goals**:
- Use ** for powers
- Calculate squares, cubes, and roots
- Understand precedence (** before * or /)

**Topics Covered**:
- Power operator **
- Common uses: area, volume, compound growth
- Square roots with ** 0.5

**Code Example**: Calculate area of square (side ** 2), cube volume, square root of a number

**Prerequisites**:
- Page 1-3: Basic arithmetic operators

---

### Page 5: Comparison Operators

**Learning Goals**:
- Use ==, !=, <, >, <=, >= to compare values
- Understand that comparisons return True/False
- Remember: == checks equality, = assigns

**Topics Covered**:
- All six comparison operators
- Returning boolean values
- Common mistake: using = instead of ==

**Code Example**: Compare ages, scores, prices; show True/False results

**Prerequisites**:
- Chapter 2: bool type
- Chapter 2: True and False values

---

### Page 6: Logical Operators

**Learning Goals**:
- Combine conditions with and, or, not
- Understand truth tables (and needs both True, or needs one True)
- Apply to age ranges, validation logic

**Topics Covered**:
- and operator (both must be True)
- or operator (at least one True)
- not operator (flip True/False)
- Combining multiple conditions

**Code Example**: Check if age is between 18 and 65, validate password requirements (length AND has digits)

**Prerequisites**:
- Page 5: Comparison operators
- Chapter 2: Booleans

---

### Page 7: Operator Precedence

**Learning Goals**:
- Understand default order: ** → * / // % → + - → comparisons → and or
- Use parentheses to override precedence
- Debug order-of-operations mistakes

**Topics Covered**:
- Operator precedence rules
- Using () to control order
- Common precedence mistakes
- Practice: complex expressions

**Code Example**: Expression without parentheses produces wrong result, adding () fixes it; calculator with multiple operations

**Prerequisites**:
- All previous pages in Chapter 3
- Chapter 2: Data types

---

## Next Steps

1. **Edit this file** to adjust page titles, topics, or ordering
2. **Run outline again** (optional): `python backend/scripts/generate_course.py outline --chapter 3`
3. **Approve and generate** (dry-run first): `python backend/scripts/generate_course.py generate --chapter 3 --dry-run`
4. **Generate for real**: `python backend/scripts/generate_course.py generate --chapter 3 --yes`

Generated pages will be saved as `status=draft` and written to `review/3/{page}.md` for your review.
