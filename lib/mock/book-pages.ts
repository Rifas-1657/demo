import type { BookLessonPage, CueKind, NarrationCue } from '@/types/book'
import { dataTypesDiagram, inputOutputDiagram, variableBoxDiagram } from './diagrams'
import type { LearningCourseId } from './learning'

type CueSpec = [kind: CueKind, target: string, anchor: string]

const normalizeToken = (token: string) => token.toLowerCase().replace(/^[("'“]+|[.,!?;:"'”]+$/g, '')

/**
 * Turns anchor words into word-index cues. Anchors are matched in order against the
 * narration tokens (exact, or prefix when written as `~prefix`), so cues stay aligned
 * with the text even when the narration is edited. A missing anchor fails loudly.
 */
function cuesFor(narration: string, specs: CueSpec[]): NarrationCue[] {
  const tokens = narration.split(/\s+/).filter(Boolean).map(normalizeToken)
  let from = 0
  return specs.map(([kind, target, anchor], index) => {
    const prefix = anchor.startsWith('~')
    const wanted = (prefix ? anchor.slice(1) : anchor).toLowerCase()
    const found = tokens.findIndex((token, position) => position >= from && (prefix ? token.startsWith(wanted) : token === wanted))
    if (found < 0) throw new Error(`Cue anchor "${anchor}" not found in narration: ${narration.slice(0, 40)}`)
    from = found + 1
    return { id: `c${index + 1}`, atWord: found, kind, target }
  })
}

const narration1_1 = `Vanakkam! Indha page-la oru variable na enna nu paarkalaam. Oru program-ku, work pannura information-a ninaivula vechukka oru idam venum. Adhu thaan variable. Variable na oru labeled box maari. Box mela irukkira label thaan variable name, box-kulla irukkirathu thaan value. Inga x = 10 nu ezhudhuna, Python 10-a memory-la store pannum, x nra peru andha value-a point pannum. Aduthu print(x) ezhudhina, Python box-a thirandhu 10-a screen-la kaattum. type(x) kettaa, adhu int nu solludhu, because 10 oru whole number. Score, username, price, edhaiyum store pannalaam, logic-a mattum oru thadavai ezhudhina podhum. Ippo code-a run pannitu output-a paarunga. Appuram x value-a maathi, thirumba run pannunga. Output maarum, ana idea ore madhiri thaan. Konjam neram edutthu, unga mind-la oru chinna example yosichu paarunga: unga phone-la contact name-um number-um irukku. Name thaan label, number thaan value. Adhe madhiri thaan Python-um velai pannum, so idha nalla purinjikonga.`

const narration1_2 = `Ippo oru variable-ku value assign panradhu eppadinu paarkalaam. Equals sign, idhu thaan assignment operator. Left side-la name, right side-la value ezhudhanum. Score = 10 nu ezhudhina, score nra box-kulla 10 pogum. Idhula oru mukkiyamaana vishayam irukku, Python eppovume right side-a first calculate pannum. Appuram thaan result-a left side name-la store pannum. So score = score + 2 nu ezhudhina, first pazhaya score-a read pannum, adhu 10. Aduthu 10 + 2 calculate pannum, adhu 12. Kadaisiya 12-a score-la store pannum. Pazhaya 10 replace aagidum, ana name score maaraadhu. Reassign pannum pothu box pudhusu illa, andha box-kulla irukkura value mattum maarum. Idhu loop-la counter, game-la points update panna romba useful. Ippo code-a run pannitu 12 varudhanu check pannunga. Idha purinjikittaa, aduthu varra chapters-la loops, conditions ellaam romba easy-a irukkum. Ovvoru thadavaiyum right side first nu ninaivula vechukonga, appo confusion varaadhu.`

const narration1_3 = `Ovvoru value-kkum oru data type irukku. Adhu thaan andha value-oda ennenna panna mudiyum nu decide pannum. Python-la neenga type-a solla venaam, value-a paarthu Python thaanaaga kandupidichidum. 21 maari whole number na int. 3.5 maari decimal point irundha float. Quotes kulla irukkura text, "Priya" maari, adhu str, string nu solluvaanga. True illa False na bool, boolean. Appuram [90, 85, 77] maari oru list, niraiya values-a order-la vechukkum. Doubt vandha type() function use pannunga, adhu type-a kaattum. Types mix pannum pothu kavanam. "5" + 5 error tharum, because text-um number-um serala. Aana int("5") + 5 na 10 varum. Code-a run pannitu ovvoru type-um print aagudhanu paarunga. Unga peru, vayasu, price-oda type-a neengalae check pannunga. Idhai purinjikittaa, aduthu varra chapter-la strings, numbers, booleans ellaam romba thelivaa theriyum. Ovvoru type-kkum thani gunam irukku, adha pathi next chapter-la detail-a paarpom.`

const narration1_4 = `Ippo variable-ku peru vaikkura rules paarkalaam. Peru oru letter-la illa underscore-la thaan start aaganum. Number-la start aaga koodathu, so 2player thappu, player2 sari. Peru-kulla letters, digits, underscore use pannalaam. Space allowed illa, total score nu ezhudhina error varum. Adhukku badhila underscore podunga, total_score maari. Idhu thaan snake_case, ellaa words-um lowercase, naduvula underscore. Python case-sensitive, so Score-um score-um rendu vera vera variables. Neenga score nu assign panni Score nu print panna NameError varum. Appuram if, for, class maari keywords-a peru-aa use panna koodathu, adhu Python-ku reserved. Nalla peru na paartha udane purinjikkanum, x vida total_score better. Code-la valid names mattum run aagum, comments-la irukkura thappu names run aagaadhu. Neengalae oru invalid name try pannitu error-a paarunga. Ellaa rules-um oru thadavai paduchaa podhum, appuram code ezhudhum pothu thaanaaga ninaivukku varum. Pazhagidichuna, nalla peru vaikka unga kai thaanaaga pazhagidum.`

const narration1_5 = `Ippo program user kooda pesa katrukalaam. print() screen-la edhaiyum kaattum. Comma pottu niraiya values kudutha, naduvula space potu print pannum. input() program-a nirutthi, user-kitta kelvi kekkum. User type pannadhu ellaam text-a thirumbi tharum, eppovume string-a. Idhu thaan beginners-ku varra romba common bug. Udharanathukku name = input("Your name? ") nu ezhudhina, Priya nu type pannadhu name variable-la "Priya" nu str-a store aagum. Vayasu maari number venumna, int(input("Your age? ")) nu convert pannanum. Illa na age + 1 pannum pothu error varum. Appuram print("Hi", name) Hi Priya nu screen-la kaattum. Keyboard, input(), variable, print(), screen, ippadi data oru flow-la pogudhu. Code-a run pannitu unga peru kuduthu paarunga. Appuram int-a edutthu paarthu enna aagudhunu observe pannunga. Idhu thaan unga program-a interactive aakkum, user enna kudukkiraangalo adha vachu output maarum. Chinna chinna questions kelunga, bill, vayasu, peru, ippadi pala variations try pannunga.`

const narration1_6 = `Ippo practice time! Neenga ippo kathukitta ellaathaiyum serthu, oru chinna bill calculator ezhudhalam. Mudhalla moonu variables venum. item, adhula "Notebook". price, adhula 45.0, idhu float. quantity, adhula 3, idhu int. Names-a purinjikkira madhiri vainga, a, b, c venaam. Aduthu total = price * quantity nu ezhudhunga. Star sign thaan multiply. Python 45.0 * 3 calculate pannum, 135.0-a total-la store pannum. Kadaisiya print(item, "x", quantity, "=", total) nu ezhudhina, Notebook x 3 = 135.0 nu screen-la varum. Paarunga, ovvoru line-um neenga padicha oru idea-vai use pannudhu. Ippo neengalae try pannunga. Quantity-a maathunga, discount variable-a sertthu paarunga, input() use panni quantity-a keluunga. Mudinjadhum chapter 2-ku poganum. Idhu vera onnum illa, nee ippo paditha variables, types, naming, input, print ellaam serndhu oru nijamaana chinna program. Idha neengalae ezhudhi mudichaa, chapter 1 mudinjadhu nu solla mudiyum.`

const narration2_1 = `Ippo numbers pathi detail-a paarkalaam. Python-la rendu main number types irukku, int and float. int na whole number, 7 maari. float na decimal point irukkura number, 12.5 maari. Ivangala vachu calculator maari math pannalaam. Plus, minus, star for multiply, slash for divide. apples = 7 and price = 12.5 nu vechukonga. apples * price na 87.5 varum. Oru int-um float-um sernthaal result eppovume float aagum. Rendu special operators irukku. Double slash, adhu integer division, 7 // 2 na 3. Percent sign remainder tharum, 7 % 2 na 1. Double star power, 2 ** 3 na 8. Idhellaam operators chapter-la detail-a paarpom. Ippo mukkiyam, number-a type-a purinjikkanum. Code-a run pannitu 87.5 and 3 1 8 varudhanu check pannunga. Neengalae vera numbers vachu try pannunga.`

const narration2_2 = `Ippo strings, athaavadhu text pathi paarkalaam. Quotes kulla ezhudhina edhuvum string thaan, single quote illa double quote rendume sari. name = "Priya" nu vechukonga. Rendu strings-a plus sign vachu serkalaam, idhukku concatenation nu peru. "Hello, " + name na Hello, Priya varum. Space-a neengalae string kulla podanum, illa na words ottikkum. len() function string-oda length-a tharum, so len(name) 5. name.upper() ellaa letters-um capital aakkum, PRIYA. Idhu oru method, dot potu call pannanum. Strings-la ovvoru character-kum oru position irukku, adhu 0 la irundhu start aagum. So name[0] na P. Oru vishayam, strings maara mudiyaadhu. Neenga mattum pudhu string uruvakkalaam. Code-a run pannitu moonu lines-um check pannunga. Unga peru vachu try pannunga. Idhu romba simple ah theriyum, aana strings thaan almost ellaa program-layum varum: names, messages, emails, ellaam. So idha nalla pazhagikonga, next chapters-la rombha useful aagum.`

const narration2_3 = `Ippo boolean, athaavadhu True illa False pathi paarkalaam. Boolean-la rendu values thaan irukku, True and False. T and F capital-a ezhudhanum, illa na Python purinjikkaadhu. Idhu yes or no kelvikku badhil maari. age = 21 nu vechukonga. age >= 18 nu ezhudhina Python compare pannum, 21 pathinettai vida adhigam na True. Adha is_adult nra variable-la store pannalaam. Comparison operators-la less than, greater than, equals irukku. Double equals check pannum, single equals assign pannum, idha mix pannaadheenga. age == 21 True, age < 18 False. Rendu conditions-a and, or, not vachu serkalaam. is_adult and age < 25 na rendume True irundha mattum True. Idhu later if statements-la romba use aagum. Code-a run pannitu True, False True, True varudhanu paarunga. Vera age vachu try pannunga.`

const narration2_4 = `Ippo oru type-a innoru type-a maathara pathi paarkalaam, idhukku type conversion nu peru. input() eppovume string tharum, so number venumna convert pannanum. text = "5" nu vechukonga, adhu string. int(text) na 5 nra number, so number + 5 na 10. str(number) thirumba text aakkum, so str(number) + "5" na 55, adhu add illa, joining. float("3.5") * 2 na 7.0 varum. int(7.9) na 7, decimal-a vetti thallum, round pannaadhu. Ella conversion-um work aagaadhu. int("abc") ValueError tharum, because adhu number illa. Type-a maathrathu original variable-a maathaadhu, pudhu value-a thirumba tharum, adha store pannanum. Idhu thaan input() with age problem-a theerkkum. Code-a run pannitu 10, 55, 7.0, 7 varudhanu paarunga. Neengalae vera values kudutthu try pannunga. Idhu ellaa program-layum thevai padum, especially user input-oda velai pannum pothu. Ovvoru conversion-um oru pudhu value-a tharum, so adha oru variable-la store pannitu use pannunga.`

const pythonPages: BookLessonPage[] = [
  {
    id: 'lesson_python_1_1',
    courseId: 'python',
    chapterId: 'python-ch1',
    chapterNumber: 1,
    pageNumber: 1,
    title: 'What is a variable?',
    narrationText: narration1_1,
    paragraphs: [
      'A program needs somewhere to keep the information it is working with. A variable is a name that refers to a value stored in memory.',
      'Think of it as a labeled box. The label is the variable name, and whatever sits inside the box is its value. When you use the name later, Python looks inside the box and hands you the value.',
      'Variables let you write code once and reuse it with different data — a score, a username, a price — without rewriting the logic each time.',
    ],
    keyTerms: ['variable', 'labeled box', 'value'],
    codeExample: {
      language: 'python',
      source: 'x = 10\nprint(x)\nprint(type(x))',
      expectedOutput: "10\n<class 'int'>",
      runnable: true,
    },
    diagramSpec: variableBoxDiagram,
    cues: cuesFor(narration1_1, [
      ['highlight-term', 'variable', 'variable'],
      ['highlight-term', 'labeled box', 'labeled'],
      ['focus-node', 'x', 'label'],
      ['highlight-term', 'value', 'value'],
      ['focus-node', 'code', 'x'],
      ['focus-node', 'memory', 'memory-la'],
      ['focus-code-line', '2', 'print(x)'],
      ['focus-code-line', '3', 'type(x)'],
    ]),
    practicePrompts: [
      'Change x = 10 to x = 25, run the code, and say what print(x) shows.',
      'Add a second variable y = 3 and print it next to x.',
    ],
    analogies: {
      cricket: 'A variable is the scoreboard: the label says "Runs", the number on it changes as the match goes on.',
      movies: 'A variable is the name on a seat in a theatre: the name stays, and the person sitting there can change.',
      neutral: 'A variable is a labeled jar in a kitchen: the label stays on the front, and what is inside can be swapped.',
    },
    estimatedMinutes: 3,
  },
  {
    id: 'lesson_python_1_2',
    courseId: 'python',
    chapterId: 'python-ch1',
    chapterNumber: 1,
    pageNumber: 2,
    title: 'Assigning variables',
    narrationText: narration1_2,
    paragraphs: [
      'You create a variable with the assignment operator, a single equals sign. The name goes on the left and the value on the right: score = 10.',
      'Python always evaluates the right side first, then stores the result under the name on the left. That is why score = score + 2 works: it reads the old value, adds 2, and stores 12.',
      'Assigning again simply points the name at a new value. The old value is replaced; the name itself does not change.',
    ],
    keyTerms: ['assignment operator', 'right side first', 'replaced'],
    codeExample: {
      language: 'python',
      source: 'score = 10\nscore = score + 2\nprint(score)',
      expectedOutput: '12',
      runnable: true,
    },
    diagramSpec: {
      kind: 'assignment-flow',
      title: 'Right side first, then store',
      caption: 'score = score + 2 reads 10, computes 12, then stores it.',
      nodes: [
        { id: 'read', label: 'Read', value: '10', caption: 'old value' },
        { id: 'compute', label: '10 + 2', value: '12', caption: 'evaluate', tone: 'highlight' },
        { id: 'store', label: 'score', value: '12', caption: 'stored', tone: 'valid' },
      ],
    },
    cues: cuesFor(narration1_2, [
      ['highlight-term', 'assignment operator', 'assignment'],
      ['highlight-term', 'right side first', 'right'],
      ['focus-code-line', '1', 'score'],
      ['focus-node', 'read', 'read'],
      ['focus-node', 'compute', 'calculate'],
      ['focus-node', 'store', 'kadaisiya'],
      ['highlight-term', 'replaced', 'replace'],
      ['focus-code-line', '3', 'run'],
    ]),
    practicePrompts: [
      'Predict the output if line 2 becomes score = score * 3, then run it.',
      'Write two lines that swap a score of 10 to 15 using the old value.',
    ],
    analogies: {
      cricket: 'score = score + 4 is the scorer adding a boundary: read the old total, add four, write the new total.',
      movies: 'Re-assigning is a recast: the role name stays the same, but a different actor now plays it.',
      neutral: 'Re-assigning is like writing a new number on the same whiteboard slot after erasing the old one.',
    },
    estimatedMinutes: 4,
  },
  {
    id: 'lesson_python_1_3',
    courseId: 'python',
    chapterId: 'python-ch1',
    chapterNumber: 1,
    pageNumber: 3,
    title: 'Data types',
    narrationText: narration1_3,
    paragraphs: [
      'Every value in Python has a data type that decides what you can do with it. You never declare the type yourself — Python infers it from the value.',
      'Whole numbers are int, numbers with a decimal point are float, text inside quotes is a str (string), True or False is a bool (boolean), and a list such as [90, 85, 77] holds several values in order.',
      'Use the built-in type() function whenever you are unsure. Mixing types matters: "5" + 5 raises an error, while int("5") + 5 gives 10.',
    ],
    keyTerms: ['data type', 'int', 'float', 'str', 'bool', 'list', 'type()'],
    codeExample: {
      language: 'python',
      source:
        'age = 21\nprice = 3.5\nname = "Priya"\nready = True\nscores = [90, 85, 77]\nprint(type(age), type(price))\nprint(type(name), type(ready))\nprint(type(scores))',
      expectedOutput: "<class 'int'> <class 'float'>\n<class 'str'> <class 'bool'>\n<class 'list'>",
      runnable: true,
    },
    diagramSpec: dataTypesDiagram,
    cues: cuesFor(narration1_3, [
      ['highlight-term', 'data type', 'data'],
      ['focus-node', 'int', 'int'],
      ['focus-node', 'float', 'float'],
      ['focus-node', 'str', 'str'],
      ['focus-node', 'bool', 'bool'],
      ['focus-node', 'list', 'list'],
      ['highlight-term', 'type()', 'type()'],
      ['focus-code-line', '6', 'run'],
    ]),
    practicePrompts: [
      'Predict type(3 + 4.0) before running it, then check.',
      'Create one variable of each type and print type() for all five.',
    ],
    analogies: {
      cricket: 'Types are like player roles: batter, bowler, keeper. The role decides what the player can do on the field.',
      movies: 'Types are like film genres: the genre sets what to expect, just as the type sets what you can do with a value.',
      neutral: 'Types are like containers: a bottle holds liquid, a box holds objects. What it holds decides how you use it.',
    },
    estimatedMinutes: 4,
  },
  {
    id: 'lesson_python_1_4',
    courseId: 'python',
    chapterId: 'python-ch1',
    chapterNumber: 1,
    pageNumber: 4,
    title: 'Naming rules',
    narrationText: narration1_4,
    paragraphs: [
      'Variable names must start with a letter or an underscore, never a digit. After the first character you can use letters, digits, and underscores.',
      'Spaces and symbols like - or ! are not allowed. Python style uses snake_case: lowercase words joined by underscores, such as total_score.',
      'Names are case-sensitive, so score and Score are two different variables. Reserved keywords like if, for, and class cannot be used as names.',
    ],
    keyTerms: ['letter or an underscore', 'snake_case', 'case-sensitive', 'keywords'],
    codeExample: {
      language: 'python',
      source: 'total_score = 42\n_hidden = "ok"\nplayer2 = "Arun"\n# 2player = "no"   -> SyntaxError\n# total score = 1  -> SyntaxError\nprint(total_score, player2)',
      expectedOutput: '42 Arun',
      runnable: true,
    },
    diagramSpec: {
      kind: 'naming-rules',
      title: 'Valid or not?',
      caption: 'Start with a letter or underscore; no spaces or symbols.',
      nodes: [
        { id: 'n1', label: 'total_score', caption: 'snake_case', tone: 'valid' },
        { id: 'n2', label: '_hidden', caption: 'underscore start', tone: 'valid' },
        { id: 'n3', label: 'player2', caption: 'digit after letter', tone: 'valid' },
        { id: 'n4', label: '2player', caption: 'starts with digit', tone: 'invalid' },
        { id: 'n5', label: 'total score', caption: 'contains space', tone: 'invalid' },
        { id: 'n6', label: 'class', caption: 'reserved keyword', tone: 'invalid' },
      ],
    },
    cues: cuesFor(narration1_4, [
      ['highlight-term', 'letter or an underscore', 'letter-la'],
      ['focus-node', 'n4', '2player'],
      ['focus-node', 'n3', 'player2'],
      ['focus-node', 'n5', 'score'],
      ['focus-node', 'n1', 'total_score'],
      ['highlight-term', 'snake_case', 'snake_case'],
      ['highlight-term', 'case-sensitive', 'case-sensitive'],
      ['focus-node', 'n6', 'class'],
      ['highlight-term', 'keywords', 'keywords-a'],
    ]),
    practicePrompts: [
      'Decide which is invalid and why: first_name, 1st_name, first-name.',
      'Rename a variable called x to a clearer snake_case name for a bill total.',
    ],
    analogies: {
      cricket: 'Names follow rules like a jersey: a clear name, no spaces or symbols, and no two players share the same one.',
      movies: 'A variable name is a character name in the credits: unique, readable, and "Hero" is not the same as "hero".',
      neutral: 'A name is a label on a file folder: short, clear, and consistent so you find the right one quickly.',
    },
    estimatedMinutes: 3,
  },
  {
    id: 'lesson_python_1_5',
    courseId: 'python',
    chapterId: 'python-ch1',
    chapterNumber: 1,
    pageNumber: 5,
    title: 'input() and print()',
    narrationText: narration1_5,
    paragraphs: [
      'print() shows values on the screen. Pass several values separated by commas and print() puts a space between them.',
      'input() pauses the program, shows a prompt, and returns whatever the user types — always as a string.',
      'If you need a number, convert it: age = int(input("Age? ")). Forgetting this is the most common beginner bug with input().',
    ],
    keyTerms: ['print()', 'input()', 'always as a string', 'int('],
    codeExample: {
      language: 'python',
      source: 'name = input("Your name? ")\nage = int(input("Your age? "))\nprint("Hi", name)\nprint("Next year you will be", age + 1)',
      expectedOutput: 'Your name? Priya\nYour age? 21\nHi Priya\nNext year you will be 22',
      runnable: true,
    },
    diagramSpec: inputOutputDiagram,
    cues: cuesFor(narration1_5, [
      ['highlight-term', 'print()', 'print()'],
      ['highlight-term', 'input()', 'input()'],
      ['highlight-term', 'always as a string', 'string-a'],
      ['focus-node', 'call', 'name'],
      ['focus-node', 'kbd', 'priya'],
      ['focus-node', 'var', 'variable-la'],
      ['highlight-term', 'int(', '~int(input('],
      ['focus-node', 'print', '~print("hi'],
      ['focus-node', 'screen', 'screen-la'],
    ]),
    practicePrompts: [
      'Ask for a favourite number with input(), convert it, and print double its value.',
      'Predict what happens if you add age + 1 without int() around input().',
    ],
    analogies: {
      cricket: 'input() is the umpire asking "ready?" and waiting for your reply; print() is the big screen showing the result.',
      movies: 'input() is the ticket counter asking which show you want; print() is the screen playing what you picked.',
      neutral: 'input() is a shopkeeper asking what you want and waiting; print() is the receipt they hand back.',
    },
    estimatedMinutes: 4,
  },
  {
    id: 'lesson_python_1_6',
    courseId: 'python',
    chapterId: 'python-ch1',
    chapterNumber: 1,
    pageNumber: 6,
    title: 'Mini practice',
    narrationText: narration1_6,
    paragraphs: [
      'Put the chapter together with a tiny bill calculator. Store an item name, its price, and a quantity in three well-named variables.',
      'Compute the total by multiplying price and quantity, store it in a new variable, and print a friendly summary line.',
      'Try it yourself: change the quantity, add a discount variable, or ask for the quantity with input() and convert it with int().',
    ],
    keyTerms: ['three well-named variables', 'Try it yourself'],
    codeExample: {
      language: 'python',
      source: 'item = "Notebook"\nprice = 45.0\nquantity = 3\ntotal = price * quantity\nprint(item, "x", quantity, "=", total)',
      expectedOutput: 'Notebook x 3 = 135.0',
      runnable: true,
    },
    diagramSpec: {
      kind: 'practice',
      title: 'Your bill calculator',
      caption: 'Three inputs, one computed result.',
      nodes: [
        { id: 'item', label: 'item', value: '"Notebook"', caption: 'str' },
        { id: 'price', label: 'price', value: '45.0', caption: 'float' },
        { id: 'quantity', label: 'quantity', value: '3', caption: 'int' },
        { id: 'total', label: 'total', value: '135.0', caption: 'price * quantity', tone: 'highlight' },
      ],
    },
    cues: cuesFor(narration1_6, [
      ['highlight-term', 'three well-named variables', 'moonu'],
      ['focus-node', 'item', 'item'],
      ['focus-node', 'price', 'price'],
      ['focus-node', 'quantity', 'quantity'],
      ['focus-node', 'total', 'total'],
      ['focus-code-line', '5', '~print(item'],
      ['highlight-term', 'Try it yourself', 'try'],
    ]),
    practicePrompts: [
      'Add a discount variable of 10.0 and subtract it from the total.',
      'Change quantity to 5 and predict the printed total before running.',
    ],
    analogies: {
      cricket: 'A bill is like a scorecard: individual numbers (runs, balls) combine into one total you print at the end.',
      movies: 'A bill is like a ticket booking: seat price times seats gives the total on your confirmation screen.',
      neutral: 'A bill is like a shopping receipt: each line has a price and quantity, and the total sits at the bottom.',
    },
    estimatedMinutes: 6,
  },
  {
    id: 'lesson_python_2_1',
    courseId: 'python',
    chapterId: 'python-ch2',
    chapterNumber: 2,
    pageNumber: 7,
    title: 'Numbers: int and float',
    narrationText: narration2_1,
    paragraphs: [
      'Python has two everyday number types. A whole number such as 7 is an int, and a number with a decimal point such as 12.5 is a float.',
      'Use + - * / for the usual arithmetic. Mixing an int and a float always gives a float, so 7 * 12.5 is 87.5.',
      'Three more operators are worth knowing: // is integer division (7 // 2 is 3), % gives the remainder (7 % 2 is 1), and ** is a power (2 ** 3 is 8).',
    ],
    keyTerms: ['whole number', 'decimal point', 'integer division', 'remainder', 'power'],
    codeExample: {
      language: 'python',
      source: 'apples = 7\nprice = 12.5\ntotal = apples * price\nprint(total)\nprint(7 // 2, 7 % 2, 2 ** 3)',
      expectedOutput: '87.5\n3 1 8',
      runnable: true,
    },
    diagramSpec: {
      kind: 'type-table',
      title: 'Numbers at a glance',
      caption: 'int and float, plus three operators worth remembering.',
      nodes: [
        { id: 'int', label: 'int', value: '7', caption: 'whole number' },
        { id: 'float', label: 'float', value: '12.5', caption: 'decimal point' },
        { id: 'result', label: 'apples * price', value: '87.5', caption: 'int * float = float', tone: 'highlight' },
        { id: 'floordiv', label: '7 // 2', value: '3', caption: 'integer division' },
        { id: 'mod', label: '7 % 2', value: '1', caption: 'remainder' },
        { id: 'pow', label: '2 ** 3', value: '8', caption: 'power' },
      ],
    },
    cues: cuesFor(narration2_1, [
      ['focus-node', 'int', 'int'],
      ['focus-node', 'float', 'float'],
      ['highlight-term', 'whole number', 'whole'],
      ['highlight-term', 'decimal point', 'decimal'],
      ['focus-node', 'result', '87.5'],
      ['highlight-term', 'integer division', 'integer'],
      ['focus-node', 'floordiv', '//'],
      ['highlight-term', 'remainder', 'remainder'],
      ['focus-node', 'mod', '%'],
      ['highlight-term', 'power', 'power'],
      ['focus-node', 'pow', '**'],
      ['focus-code-line', '5', 'run'],
    ]),
    practicePrompts: [
      'Predict 10 // 3 and 10 % 3, then run them to check.',
      'Use ** to print 5 squared and 5 cubed.',
    ],
    analogies: {
      cricket: 'Overs bowled is an int, but a batter average like 45.5 is a float. Run rate mixes both and gives a float.',
      movies: 'Seats booked is an int, ticket price 150.5 is a float, and the total bill is a float.',
      neutral: 'Counting apples gives an int; weighing them gives a float. Price times count gives a decimal total.',
    },
    estimatedMinutes: 4,
  },
  {
    id: 'lesson_python_2_2',
    courseId: 'python',
    chapterId: 'python-ch2',
    chapterNumber: 2,
    pageNumber: 8,
    title: 'Strings: working with text',
    narrationText: narration2_2,
    paragraphs: [
      'Text in quotes is a string, written with single or double quotes. name = "Priya" stores a string in name.',
      'Join strings with +, which is called concatenation. "Hello, " + name builds Hello, Priya, so include the space yourself.',
      'len() returns how many characters a string has, and name.upper() returns an uppercase copy. Characters are numbered from 0, so name[0] is P.',
    ],
    keyTerms: ['string', 'concatenation', 'len()', 'name.upper()'],
    codeExample: {
      language: 'python',
      source: 'name = "Priya"\ngreeting = "Hello, " + name\nprint(greeting)\nprint(len(name), name.upper())\nprint(name[0])',
      expectedOutput: 'Hello, Priya\n5 PRIYA\nP',
      runnable: true,
    },
    diagramSpec: {
      kind: 'labeled-boxes',
      title: 'Strings, step by step',
      caption: 'One string, joined, measured, uppercased, and indexed.',
      nodes: [
        { id: 'value', label: 'name', value: '"Priya"', caption: 'str', tone: 'highlight' },
        { id: 'join', label: '"Hello, " + name', value: '"Hello, Priya"', caption: 'concatenation' },
        { id: 'len', label: 'len(name)', value: '5', caption: 'characters' },
        { id: 'upper', label: 'name.upper()', value: '"PRIYA"', caption: 'uppercase copy' },
        { id: 'index', label: 'name[0]', value: '"P"', caption: 'first character' },
      ],
    },
    cues: cuesFor(narration2_2, [
      ['highlight-term', 'string', 'string'],
      ['focus-node', 'value', 'priya'],
      ['highlight-term', 'concatenation', 'concatenation'],
      ['focus-node', 'join', 'hello'],
      ['highlight-term', 'len()', 'len()'],
      ['focus-node', 'len', 'len(name)'],
      ['focus-node', 'upper', 'name.upper()'],
      ['focus-node', 'index', 'name[0]'],
      ['focus-code-line', '5', 'run'],
    ]),
    practicePrompts: [
      'Print your own name in uppercase and its length.',
      'Build a greeting with + and print the first letter of it.',
    ],
    analogies: {
      cricket: 'A string is a commentary line: a sequence of characters you can join, measure, and pick letters from.',
      movies: 'A string is a movie title on a poster: you can join it with a tagline, count its letters, or shout it in capitals.',
      neutral: 'A string is a row of lettered tiles: you can join rows, count tiles, and point to the first one.',
    },
    estimatedMinutes: 4,
  },
  {
    id: 'lesson_python_2_3',
    courseId: 'python',
    chapterId: 'python-ch2',
    chapterNumber: 2,
    pageNumber: 9,
    title: 'Booleans and comparisons',
    narrationText: narration2_3,
    paragraphs: [
      'A boolean has only two values, True and False, and always starts with a capital letter. It answers yes or no questions.',
      'Comparison operators such as >=, <, and == produce booleans. Remember that == checks equality while a single = assigns a value.',
      'Combine conditions with and, or, and not. A and B is True only when both parts are True.',
    ],
    keyTerms: ['boolean', 'comparison', '=='],
    codeExample: {
      language: 'python',
      source: 'age = 21\nis_adult = age >= 18\nprint(is_adult)\nprint(age < 18, age == 21)\nprint(is_adult and age < 25)',
      expectedOutput: 'True\nFalse True\nTrue',
      runnable: true,
    },
    diagramSpec: {
      kind: 'type-table',
      title: 'Yes or no answers',
      caption: 'Comparisons produce True or False; and combines them.',
      nodes: [
        { id: 'true', label: 'True', caption: 'yes' },
        { id: 'false', label: 'False', caption: 'no' },
        { id: 'compare', label: 'age >= 18', value: 'True', caption: 'comparison', tone: 'highlight' },
        { id: 'eq', label: 'age == 21', value: 'True', caption: 'equality check' },
        { id: 'and', label: 'is_adult and age < 25', value: 'True', caption: 'both must be True' },
      ],
    },
    cues: cuesFor(narration2_3, [
      ['highlight-term', 'boolean', 'boolean'],
      ['focus-node', 'true', 'true'],
      ['focus-node', 'false', 'false'],
      ['focus-node', 'compare', '>='],
      ['highlight-term', 'comparison', 'comparison'],
      ['focus-node', 'eq', '=='],
      ['focus-node', 'and', 'and'],
      ['focus-code-line', '5', 'is_adult'],
    ]),
    practicePrompts: [
      'Set age = 15 and predict the output of all three prints before running.',
      'Write a boolean that is True only when a score is between 40 and 100.',
    ],
    analogies: {
      cricket: 'A boolean is the umpire\'s decision: out or not out. A comparison like runs >= 50 gives a fifty or not yet.',
      movies: 'A boolean is a thumbs up or thumbs down: a comparison like rating >= 4 decides whether a film is recommended.',
      neutral: 'A boolean is a light switch: only on or off, and a comparison decides which position it takes.',
    },
    estimatedMinutes: 4,
  },
  {
    id: 'lesson_python_2_4',
    courseId: 'python',
    chapterId: 'python-ch2',
    chapterNumber: 2,
    pageNumber: 10,
    title: 'Converting between types',
    narrationText: narration2_4,
    paragraphs: [
      'Type conversion turns a value into another type with int(), float(), and str(). int(text) turns "5" into the number 5, so number + 5 is 10.',
      'str(number) turns a number back into text, so str(number) + "5" is "55", which is joining rather than adding. float("3.5") * 2 is 7.0, and int(7.9) is 7 because it cuts off the decimal.',
      'Not every conversion works: int("abc") raises a ValueError. The original variable never changes, so store the converted value.',
    ],
    keyTerms: ['Type conversion', 'int(text)', 'str(number)', 'ValueError'],
    codeExample: {
      language: 'python',
      source: 'text = "5"\nnumber = int(text)\nprint(number + 5)\nprint(str(number) + "5")\nprint(float("3.5") * 2)\nprint(int(7.9))',
      expectedOutput: '10\n55\n7.0\n7',
      runnable: true,
    },
    diagramSpec: {
      kind: 'assignment-flow',
      title: 'Converting types',
      caption: 'int(), str(), and float() return a new value of another type.',
      nodes: [
        { id: 'text', label: 'text', value: '"5"', caption: 'str' },
        { id: 'number', label: 'int(text)', value: '5', caption: 'int', tone: 'highlight' },
        { id: 'joined', label: 'str(number) + "5"', value: '"55"', caption: 'joining, not adding' },
        { id: 'float', label: 'float("3.5") * 2', value: '7.0', caption: 'float' },
        { id: 'trunc', label: 'int(7.9)', value: '7', caption: 'cuts the decimal' },
      ],
    },
    cues: cuesFor(narration2_4, [
      ['highlight-term', 'Type conversion', 'conversion'],
      ['focus-node', 'text', 'text'],
      ['focus-node', 'number', 'int(text)'],
      ['focus-node', 'joined', '55'],
      ['focus-node', 'float', 'float("3.5")'],
      ['focus-node', 'trunc', 'int(7.9)'],
      ['highlight-term', 'ValueError', 'valueerror'],
      ['focus-code-line', '6', 'run'],
    ]),
    practicePrompts: [
      'Convert "42" to an int, add 8, and print the result.',
      'Predict what int(9.99) prints, then run it.',
    ],
    analogies: {
      cricket: 'Converting is like turning a scoreboard text "45" into the number 45 so you can add it to the next batter\'s runs.',
      movies: 'Converting is like a subtitle: the same dialogue, a different form. The text "5" becomes the number 5 to do math.',
      neutral: 'Converting is like changing currency: same value idea, new form, and you must keep the converted amount.',
    },
    estimatedMinutes: 5,
  },
]

const pagesByCourse: Partial<Record<LearningCourseId, BookLessonPage[]>> = {
  python: pythonPages,
}

export function getBookPages(courseId: string): BookLessonPage[] {
  return pagesByCourse[courseId as LearningCourseId] ?? []
}

/** 1-based position of a page inside its chapter (matches library PageRef.page). */
export function pageInChapter(pages: BookLessonPage[], page: BookLessonPage) {
  return pages.filter((entry) => entry.chapterNumber === page.chapterNumber).findIndex((entry) => entry.id === page.id) + 1
}

/** Index into `pages` for a chapter/page deep link, or -1 when not seeded. */
export function findPageIndex(pages: BookLessonPage[], chapter: number, page: number) {
  let position = 0
  return pages.findIndex((entry) => {
    if (entry.chapterNumber !== chapter) return false
    position += 1
    return position === page
  })
}
