"""
app/db/seed.py — seed the database from the frontend learning data.
Seeds: Python from Zero course, chapters 1-2 (10 pages), plus skeleton for chapters 3-9 (locked).
"""
from __future__ import annotations

from sqlalchemy.ext.asyncio import AsyncSession

import logging
import secrets

from .models import Chapter, Course, Invite, Page, User

_log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Course seed — Python from Zero
# ---------------------------------------------------------------------------

PYTHON_COURSE = {
    "id": "python",
    "title": "Python from Zero",
    "subtitle": "Variables, loops, and functions — with code you run on the page.",
    "description": (
        "A gentle first programming book. Each chapter introduces one idea, shows it in a few "
        "lines of Python, and lets you run and tweak the code right next to the explanation."
    ),
    "level": "Beginner",
    "category": "Programming",
    "language": "Python",
    "available": True,
    "author": "Bookey demo",
    "cover": {"base": "#E11D48", "spine": "#9F1239", "accent": "#FFE4E6", "text": "#FFFFFF"},
    "outcomes": [
        "Write and run short Python programs without copying from a template",
        "Choose the right data type and collection for a problem",
        "Control program flow with conditions and loops",
        "Split code into small, testable functions",
        "Read and save data to plain text files",
    ],
    "topics": ["Python 3", "Interactive code cells", "Variables", "Control flow", "Functions", "File I/O"],
    "tutor_style": "Patient and example-first: explains one idea at a time, then asks you to predict the output before running it.",
    "minutes_per_page": 4,
}

PYTHON_CHAPTERS = [
    {"number": 1, "title": "Variables", "summary": "Name values, reassign them, and print what they hold.", "page_count": 6, "locked": False},
    {"number": 2, "title": "Data Types", "summary": "Numbers, strings, and booleans — and converting between them.", "page_count": 4, "locked": False},
    {"number": 3, "title": "Operators", "summary": "Arithmetic, comparison, and logical operators in everyday expressions.", "page_count": 7, "locked": True},
    {"number": 4, "title": "Conditions", "summary": "Use if, elif, and else to make your program choose a path.", "page_count": 9, "locked": True},
    {"number": 5, "title": "Loops", "summary": "Repeat work with for and while, and make sure every loop can stop.", "page_count": 9, "locked": True},
    {"number": 6, "title": "Functions", "summary": "Package logic into reusable functions with parameters and return values.", "page_count": 8, "locked": True},
    {"number": 7, "title": "Lists and Dictionaries", "summary": "Store collections, look items up by key, and loop over both.", "page_count": 10, "locked": True},
    {"number": 8, "title": "Files", "summary": "Read from and write to text files safely with a with block.", "page_count": 7, "locked": True},
    {"number": 9, "title": "Mini Project", "summary": "Combine everything into a small to-do list app that saves to a file.", "page_count": 6, "locked": True},
]

# Full narration texts (Tanglish, from book-pages.ts)
_NARRATION_1_1 = (
    "Vanakkam! Indha page-la oru variable na enna nu paarkalaam. Oru program-ku, work pannura information-a "
    "ninaivula vechukka oru idam venum. Adhu thaan variable. Variable na oru labeled box maari. Box mela "
    "irukkira label thaan variable name, box-kulla irukkirathu thaan value. Inga x = 10 nu ezhudhuna, "
    "Python 10-a memory-la store pannum, x nra peru andha value-a point pannum. Aduthu print(x) ezhudhina, "
    "Python box-a thirandhu 10-a screen-la kaattum. type(x) kettaa, adhu int nu solludhu, because 10 oru "
    "whole number. Score, username, price, edhaiyum store pannalaam, logic-a mattum oru thadavai ezhudhina "
    "podhum. Ippo code-a run pannitu output-a paarunga. Appuram x value-a maathi, thirumba run pannunga. "
    "Output maarum, ana idea ore madhiri thaan. Konjam neram edutthu, unga mind-la oru chinna example "
    "yosichu paarunga: unga phone-la contact name-um number-um irukku. Name thaan label, number thaan value. "
    "Adhe madhiri thaan Python-um velai pannum, so idha nalla purinjikonga."
)

_NARRATION_1_2 = (
    "Ippo oru variable-ku value assign panradhu eppadinu paarkalaam. Equals sign, idhu thaan assignment "
    "operator. Left side-la name, right side-la value ezhudhanum. Score = 10 nu ezhudhina, score nra "
    "box-kulla 10 pogum. Idhula oru mukkiyamaana vishayam irukku, Python eppovume right side-a first "
    "calculate pannum. Appuram thaan result-a left side name-la store pannum. So score = score + 2 nu "
    "ezhudhina, first pazhaya score-a read pannum, adhu 10. Aduthu 10 + 2 calculate pannum, adhu 12. "
    "Kadaisiya 12-a score-la store pannum. Pazhaya 10 replace aagidum, ana name score maaraadhu. "
    "Reassign pannum pothu box pudhusu illa, andha box-kulla irukkura value mattum maarum. Idhu loop-la "
    "counter, game-la points update panna romba useful. Ippo code-a run pannitu 12 varudhanu check pannunga. "
    "Idha purinjikittaa, aduthu varra chapters-la loops, conditions ellaam romba easy-a irukkum. "
    "Ovvoru thadavaiyum right side first nu ninaivula vechukonga, appo confusion varaadhu."
)

PYTHON_PAGES = [
    {
        "id": "lesson_python_1_1",
        "chapter_number": 1,
        "page_number": 1,
        "title": "What is a variable?",
        "narration_text": _NARRATION_1_1,
        "paragraphs": [
            "A program needs somewhere to keep the information it is working with. A variable is a name that refers to a value stored in memory.",
            "Think of it as a labeled box. The label is the variable name, and whatever sits inside the box is its value. When you use the name later, Python looks inside the box and hands you the value.",
            "Variables let you write code once and reuse it with different data — a score, a username, a price — without rewriting the logic each time.",
        ],
        "key_terms": ["variable", "labeled box", "value"],
        "code_example": {
            "language": "python",
            "source": "x = 10\nprint(x)\nprint(type(x))",
            "expectedOutput": "10\n<class 'int'>",
            "runnable": True,
        },
        "diagram_spec": {
            "kind": "variable-box",
            "title": "Variables as labeled boxes",
            "caption": "Each variable is a named slot in memory.",
            "nodes": [
                {"id": "x", "label": "x", "value": "10", "caption": "int", "tone": "highlight"},
                {"id": "memory", "label": "Memory", "value": "", "caption": "where values live", "tone": "muted"},
                {"id": "code", "label": "print(x)", "value": "→ 10", "caption": "output", "tone": "valid"},
            ],
        },
        "cues": [
            {"id": "c1", "atWord": 5, "kind": "highlight-term", "target": "variable"},
            {"id": "c2", "atWord": 17, "kind": "highlight-term", "target": "labeled box"},
            {"id": "c3", "atWord": 22, "kind": "focus-node", "target": "x"},
            {"id": "c4", "atWord": 27, "kind": "highlight-term", "target": "value"},
            {"id": "c5", "atWord": 37, "kind": "focus-node", "target": "code"},
            {"id": "c6", "atWord": 45, "kind": "focus-node", "target": "memory"},
            {"id": "c7", "atWord": 60, "kind": "focus-code-line", "target": "2"},
            {"id": "c8", "atWord": 72, "kind": "focus-code-line", "target": "3"},
        ],
        "practice_prompts": [
            "Change x = 10 to x = 25, run the code, and say what print(x) shows.",
            "Add a second variable y = 3 and print it next to x.",
        ],
        "analogies": {
            "cricket": "A variable is the scoreboard: the label says 'Runs', the number on it changes as the match goes on.",
            "movies": "A variable is the name on a seat in a theatre: the name stays, and the person sitting there can change.",
            "neutral": "A variable is a labeled jar in a kitchen: the label stays on the front, and what is inside can be swapped.",
        },
        "estimated_minutes": 3,
    },
    {
        "id": "lesson_python_1_2",
        "chapter_number": 1,
        "page_number": 2,
        "title": "Assigning variables",
        "narration_text": _NARRATION_1_2,
        "paragraphs": [
            "You create a variable with the assignment operator, a single equals sign. The name goes on the left and the value on the right: score = 10.",
            "Python always evaluates the right side first, then stores the result under the name on the left. That is why score = score + 2 works: it reads the old value, adds 2, and stores 12.",
            "Assigning again simply points the name at a new value. The old value is replaced; the name itself does not change.",
        ],
        "key_terms": ["assignment operator", "right side first", "replaced"],
        "code_example": {
            "language": "python",
            "source": "score = 10\nscore = score + 2\nprint(score)",
            "expectedOutput": "12",
            "runnable": True,
        },
        "diagram_spec": {
            "kind": "assignment-flow",
            "title": "Right side first, then store",
            "caption": "score = score + 2 reads 10, computes 12, then stores it.",
            "nodes": [
                {"id": "read", "label": "Read", "value": "10", "caption": "old value"},
                {"id": "compute", "label": "10 + 2", "value": "12", "caption": "evaluate", "tone": "highlight"},
                {"id": "store", "label": "score", "value": "12", "caption": "stored", "tone": "valid"},
            ],
        },
        "cues": [
            {"id": "c1", "atWord": 8, "kind": "highlight-term", "target": "assignment operator"},
            {"id": "c2", "atWord": 18, "kind": "highlight-term", "target": "right side first"},
            {"id": "c3", "atWord": 25, "kind": "focus-code-line", "target": "1"},
            {"id": "c4", "atWord": 42, "kind": "focus-node", "target": "read"},
            {"id": "c5", "atWord": 50, "kind": "focus-node", "target": "compute"},
            {"id": "c6", "atWord": 60, "kind": "focus-node", "target": "store"},
            {"id": "c7", "atWord": 68, "kind": "highlight-term", "target": "replaced"},
            {"id": "c8", "atWord": 80, "kind": "focus-code-line", "target": "3"},
        ],
        "practice_prompts": [
            "Predict the output if line 2 becomes score = score * 3, then run it.",
            "Write two lines that swap a score of 10 to 15 using the old value.",
        ],
        "analogies": {
            "cricket": "score = score + 4 is the scorer adding a boundary: read the old total, add four, write the new total.",
            "movies": "Re-assigning is a recast: the role name stays the same, but a different actor now plays it.",
            "neutral": "Re-assigning is like writing a new number on the same whiteboard slot after erasing the old one.",
        },
        "estimated_minutes": 4,
    },
    {
        "id": "lesson_python_1_3",
        "chapter_number": 1,
        "page_number": 3,
        "title": "Data types",
        "narration_text": (
            "Ovvoru value-kkum oru data type irukku. Adhu thaan andha value-oda ennenna panna mudiyum nu decide pannum. "
            "Python-la neenga type-a solla venaam, value-a paarthu Python thaanaaga kandupidichidum. "
            "21 maari whole number na int. 3.5 maari decimal point irundha float. Quotes kulla irukkura text, "
            "\"Priya\" maari, adhu str, string nu solluvaanga. True illa False na bool, boolean. "
            "Appuram [90, 85, 77] maari oru list, niraiya values-a order-la vechukkum. "
            "Doubt vandha type() function use pannunga, adhu type-a kaattum. Types mix pannum pothu kavanam. "
            "\"5\" + 5 error tharum, because text-um number-um serala. Aana int(\"5\") + 5 na 10 varum. "
            "Code-a run pannitu ovvoru type-um print aagudhanu paarunga. "
            "Unga peru, vayasu, price-oda type-a neengalae check pannunga. "
            "Idhai purinjikittaa, aduthu varra chapter-la strings, numbers, booleans ellaam romba thelivaa theriyum. "
            "Ovvoru type-kkum thani gunam irukku, adha pathi next chapter-la detail-a paarpom."
        ),
        "paragraphs": [
            "Every value in Python has a data type that decides what you can do with it. You never declare the type yourself — Python infers it from the value.",
            "Whole numbers are int, numbers with a decimal point are float, text inside quotes is a str (string), True or False is a bool (boolean), and a list such as [90, 85, 77] holds several values in order.",
            "Use the built-in type() function whenever you are unsure. Mixing types matters: \"5\" + 5 raises an error, while int(\"5\") + 5 gives 10.",
        ],
        "key_terms": ["data type", "int", "float", "str", "bool", "list", "type()"],
        "code_example": {
            "language": "python",
            "source": 'age = 21\nprice = 3.5\nname = "Priya"\nready = True\nscores = [90, 85, 77]\nprint(type(age), type(price))\nprint(type(name), type(ready))\nprint(type(scores))',
            "expectedOutput": "<class 'int'> <class 'float'>\n<class 'str'> <class 'bool'>\n<class 'list'>",
            "runnable": True,
        },
        "diagram_spec": {
            "kind": "data-types",
            "title": "Python data types",
            "caption": "Every value has a type. Python detects it automatically.",
            "nodes": [
                {"id": "int", "label": "int", "value": "21", "caption": "whole number", "tone": "highlight"},
                {"id": "float", "label": "float", "value": "3.5", "caption": "decimal", "tone": "highlight"},
                {"id": "str", "label": "str", "value": '"Priya"', "caption": "text", "tone": "highlight"},
                {"id": "bool", "label": "bool", "value": "True", "caption": "yes/no", "tone": "highlight"},
                {"id": "list", "label": "list", "value": "[90, 85, 77]", "caption": "collection", "tone": "highlight"},
            ],
        },
        "cues": [
            {"id": "c1", "atWord": 2, "kind": "highlight-term", "target": "data type"},
            {"id": "c2", "atWord": 20, "kind": "focus-node", "target": "int"},
            {"id": "c3", "atWord": 26, "kind": "focus-node", "target": "float"},
            {"id": "c4", "atWord": 32, "kind": "focus-node", "target": "str"},
            {"id": "c5", "atWord": 40, "kind": "focus-node", "target": "bool"},
            {"id": "c6", "atWord": 47, "kind": "focus-node", "target": "list"},
            {"id": "c7", "atWord": 55, "kind": "highlight-term", "target": "type()"},
            {"id": "c8", "atWord": 75, "kind": "focus-code-line", "target": "6"},
        ],
        "practice_prompts": [
            "Predict type(3 + 4.0) before running it, then check.",
            "Create one variable of each type and print type() for all five.",
        ],
        "analogies": {
            "cricket": "Types are like player roles: batter, bowler, keeper. The role decides what the player can do on the field.",
            "movies": "Types are like film genres: the genre sets what to expect, just as the type sets what you can do with a value.",
            "neutral": "Types are like containers: a bottle holds liquid, a box holds objects. What it holds decides how you use it.",
        },
        "estimated_minutes": 4,
    },
    {
        "id": "lesson_python_1_4",
        "chapter_number": 1,
        "page_number": 4,
        "title": "Naming rules",
        "narration_text": (
            "Ippo variable-ku peru vaikkura rules paarkalaam. Peru oru letter-la illa underscore-la thaan start aaganum. "
            "Number-la start aaga koodathu, so 2player thappu, player2 sari. "
            "Peru-kulla letters, digits, underscore use pannalaam. Space allowed illa, total score nu ezhudhina error varum. "
            "Adhukku badhila underscore podunga, total_score maari. Idhu thaan snake_case, ellaa words-um lowercase, naduvula underscore. "
            "Python case-sensitive, so Score-um score-um rendu vera vera variables. "
            "Neenga score nu assign panni Score nu print panna NameError varum. "
            "Appuram if, for, class maari keywords-a peru-aa use panna koodathu, adhu Python-ku reserved. "
            "Nalla peru na paartha udane purinjikkanum, x vida total_score better. "
            "Code-la valid names mattum run aagum, comments-la irukkura thappu names run aagaadhu. "
            "Neengalae oru invalid name try pannitu error-a paarunga. "
            "Ellaa rules-um oru thadavai paduchaa podhum, appuram code ezhudhum pothu thaanaaga ninaivukku varum. "
            "Pazhagidichuna, nalla peru vaikka unga kai thaanaaga pazhagidum."
        ),
        "paragraphs": [
            "Variable names must start with a letter or an underscore, never a digit. After the first character you can use letters, digits, and underscores.",
            "Spaces and symbols like - or ! are not allowed. Python style uses snake_case: lowercase words joined by underscores, such as total_score.",
            "Names are case-sensitive, so score and Score are two different variables. Reserved keywords like if, for, and class cannot be used as names.",
        ],
        "key_terms": ["letter or an underscore", "snake_case", "case-sensitive", "keywords"],
        "code_example": {
            "language": "python",
            "source": 'total_score = 42\n_hidden = "ok"\nplayer2 = "Arun"\n# 2player = "no"   -> SyntaxError\n# total score = 1  -> SyntaxError\nprint(total_score, player2)',
            "expectedOutput": "42 Arun",
            "runnable": True,
        },
        "diagram_spec": {
            "kind": "naming-rules",
            "title": "Valid or not?",
            "caption": "Start with a letter or underscore; no spaces or symbols.",
            "nodes": [
                {"id": "n1", "label": "total_score", "caption": "snake_case", "tone": "valid"},
                {"id": "n2", "label": "_hidden", "caption": "underscore start", "tone": "valid"},
                {"id": "n3", "label": "player2", "caption": "digit after letter", "tone": "valid"},
                {"id": "n4", "label": "2player", "caption": "starts with digit", "tone": "invalid"},
                {"id": "n5", "label": "total score", "caption": "contains space", "tone": "invalid"},
                {"id": "n6", "label": "class", "caption": "reserved keyword", "tone": "invalid"},
            ],
        },
        "cues": [
            {"id": "c1", "atWord": 6, "kind": "highlight-term", "target": "letter or an underscore"},
            {"id": "c2", "atWord": 16, "kind": "focus-node", "target": "n4"},
            {"id": "c3", "atWord": 20, "kind": "focus-node", "target": "n3"},
            {"id": "c4", "atWord": 30, "kind": "focus-node", "target": "n5"},
            {"id": "c5", "atWord": 38, "kind": "highlight-term", "target": "snake_case"},
            {"id": "c6", "atWord": 48, "kind": "highlight-term", "target": "case-sensitive"},
            {"id": "c7", "atWord": 62, "kind": "highlight-term", "target": "keywords"},
            {"id": "c8", "atWord": 75, "kind": "focus-node", "target": "n1"},
        ],
        "practice_prompts": [
            "Write three valid variable names and three invalid ones, then predict which Python accepts.",
            "Try assigning to a reserved keyword like 'if' and describe the error.",
        ],
        "analogies": {
            "cricket": "Naming rules are like player jersey numbers: must follow a format (not start with 0, etc.) so everyone can identify them.",
            "movies": "A variable name is like a character name: unique, clear, and cannot be a reserved word like 'The' or 'And'.",
            "neutral": "Naming rules are like street addresses: must follow a format so Python can find the right memory slot every time.",
        },
        "estimated_minutes": 4,
    },
    {
        "id": "lesson_python_1_5",
        "chapter_number": 1,
        "page_number": 5,
        "title": "print() and input()",
        "narration_text": (
            "Ippo program user kooda pesa katrukalaam. print() screen-la edhaiyum kaattum. "
            "Comma pottu niraiya values kudutha, naduvula space potu print pannum. "
            "input() program-a nirutthi, user-kitta kelvi kekkum. "
            "User type pannadhu ellaam text-a thirumbi tharum, eppovume string-a. "
            "Idhu thaan beginners-ku varra romba common bug. "
            "Udharanathukku name = input(\"Your name? \") nu ezhudhina, Priya nu type pannadhu name variable-la \"Priya\" nu str-a store aagum. "
            "Vayasu maari number venumna, int(input(\"Your age? \")) nu convert pannanum. "
            "Illa na age + 1 pannum pothu error varum. "
            "Appuram print(\"Hi\", name) Hi Priya nu screen-la kaattum. "
            "Keyboard, input(), variable, print(), screen, ippadi data oru flow-la pogudhu. "
            "Code-a run pannitu unga peru kuduthu paarunga. "
            "Appuram int-a edutthu paarthu enna aagudhunu observe pannunga. "
            "Idhu thaan unga program-a interactive aakkum, user enna kudukkiraangalo adha vachu output maarum. "
            "Chinna chinna questions kelunga, bill, vayasu, peru, ippadi pala variations try pannunga."
        ),
        "paragraphs": [
            "print() displays any value on the screen. Separate multiple values with commas and Python adds spaces between them automatically.",
            "input() pauses the program and waits for the user to type. It always returns a string — convert to int or float when you need a number.",
            "Together they let your program talk with the user: ask a question with input(), compute something, and show the result with print().",
        ],
        "key_terms": ["print()", "input()", "string conversion"],
        "code_example": {
            "language": "python",
            "source": 'name = input("Your name? ")\nage = int(input("Your age? "))\nprint("Hi", name, "- next year you will be", age + 1)',
            "expectedOutput": "Your name? Priya\nYour age? 20\nHi Priya - next year you will be 21",
            "runnable": True,
        },
        "diagram_spec": {
            "kind": "input-output",
            "title": "Data flow: keyboard to screen",
            "caption": "input() reads text. print() writes text.",
            "nodes": [
                {"id": "keyboard", "label": "Keyboard", "value": "Priya", "caption": "input()", "tone": "highlight"},
                {"id": "var", "label": "name", "value": '"Priya"', "caption": "str", "tone": "valid"},
                {"id": "screen", "label": "Screen", "value": "Hi Priya", "caption": "print()", "tone": "valid"},
            ],
        },
        "cues": [
            {"id": "c1", "atWord": 5, "kind": "highlight-term", "target": "print()"},
            {"id": "c2", "atWord": 18, "kind": "highlight-term", "target": "input()"},
            {"id": "c3", "atWord": 32, "kind": "focus-node", "target": "keyboard"},
            {"id": "c4", "atWord": 45, "kind": "focus-node", "target": "var"},
            {"id": "c5", "atWord": 58, "kind": "highlight-term", "target": "string conversion"},
            {"id": "c6", "atWord": 70, "kind": "focus-node", "target": "screen"},
            {"id": "c7", "atWord": 82, "kind": "focus-code-line", "target": "1"},
            {"id": "c8", "atWord": 95, "kind": "focus-code-line", "target": "3"},
        ],
        "practice_prompts": [
            "Ask the user for two numbers and print their sum.",
            "Ask for a name and age, then print a sentence using both.",
        ],
        "analogies": {
            "cricket": "print() is the stadium scoreboard: everyone sees it. input() is the umpire asking the scorer for a correction.",
            "movies": "print() is the final cut shown to the audience. input() is the director asking the actor to say their line.",
            "neutral": "print() is a loudspeaker announcement. input() is a question box waiting for your answer.",
        },
        "estimated_minutes": 4,
    },
    {
        "id": "lesson_python_1_6",
        "chapter_number": 1,
        "page_number": 6,
        "title": "Practice: bill calculator",
        "narration_text": (
            "Ippo practice time! Neenga ippo kathukitta ellaathaiyum serthu, oru chinna bill calculator ezhudhalam. "
            "Mudhalla moonu variables venum. item, adhula \"Notebook\". price, adhula 45.0, idhu float. quantity, adhula 3, idhu int. "
            "Names-a purinjikkira madhiri vainga, a, b, c venaam. "
            "Aduthu total = price * quantity nu ezhudhunga. Star sign thaan multiply. "
            "Python 45.0 * 3 calculate pannum, 135.0-a total-la store pannum. "
            "Kadaisiya print(item, \"x\", quantity, \"=\", total) nu ezhudhina, Notebook x 3 = 135.0 nu screen-la varum. "
            "Paarunga, ovvoru line-um neenga padicha oru idea-vai use pannudhu. "
            "Ippo neengalae try pannunga. Quantity-a maathunga, discount variable-a sertthu paarunga, "
            "input() use panni quantity-a keluunga. "
            "Mudinjadhum chapter 2-ku poganum. Idhu vera onnum illa, nee ippo paditha variables, types, naming, input, print ellaam "
            "serndhu oru nijamaana chinna program. Idha neengalae ezhudhi mudichaa, chapter 1 mudinjadhu nu solla mudiyum."
        ),
        "paragraphs": [
            "Bring together what you have learned: variables, data types, naming, arithmetic, and print. Write a small bill calculator.",
            "Use meaningful names (item, price, quantity), multiply to get the total, and print a readable receipt line.",
            "Extend it: ask the user for the quantity with input(), add a discount variable, and watch the total change.",
        ],
        "key_terms": ["practice", "bill calculator", "arithmetic"],
        "code_example": {
            "language": "python",
            "source": 'item = "Notebook"\nprice = 45.0\nquantity = 3\ntotal = price * quantity\nprint(item, "x", quantity, "=", total)',
            "expectedOutput": "Notebook x 3 = 135.0",
            "runnable": True,
        },
        "diagram_spec": {
            "kind": "variable-box",
            "title": "Variables in the bill calculator",
            "caption": "Each variable stores one piece of information about the bill.",
            "nodes": [
                {"id": "item", "label": "item", "value": '"Notebook"', "caption": "str", "tone": "highlight"},
                {"id": "price", "label": "price", "value": "45.0", "caption": "float", "tone": "highlight"},
                {"id": "qty", "label": "quantity", "value": "3", "caption": "int", "tone": "highlight"},
                {"id": "total", "label": "total", "value": "135.0", "caption": "price * quantity", "tone": "valid"},
            ],
        },
        "cues": [
            {"id": "c1", "atWord": 10, "kind": "focus-node", "target": "item"},
            {"id": "c2", "atWord": 16, "kind": "focus-node", "target": "price"},
            {"id": "c3", "atWord": 22, "kind": "focus-node", "target": "qty"},
            {"id": "c4", "atWord": 38, "kind": "focus-node", "target": "total"},
            {"id": "c5", "atWord": 52, "kind": "focus-code-line", "target": "5"},
            {"id": "c6", "atWord": 65, "kind": "focus-code-line", "target": "4"},
            {"id": "c7", "atWord": 80, "kind": "focus-code-line", "target": "1"},
            {"id": "c8", "atWord": 95, "kind": "focus-code-line", "target": "5"},
        ],
        "practice_prompts": [
            "Change quantity to 5 and add a 10% discount. Print the discounted total.",
            "Rewrite using input() to ask for the quantity instead of hardcoding 3.",
        ],
        "analogies": {
            "cricket": "The bill calculator is like keeping score: each ball adds to the over, each over adds to the innings total.",
            "movies": "Writing the calculator is like editing: combine the scenes (variables) to make the final cut (output).",
            "neutral": "The bill calculator is like a recipe: gather ingredients (variables), follow the steps (arithmetic), serve the result (print).",
        },
        "estimated_minutes": 5,
    },
    # Chapter 2 pages
    {
        "id": "lesson_python_2_1",
        "chapter_number": 2,
        "page_number": 1,
        "title": "Numbers: int and float",
        "narration_text": (
            "Ippo numbers pathi detail-a paarkalaam. Python-la rendu main number types irukku, int and float. "
            "int na whole number, 7 maari. float na decimal point irukkura number, 12.5 maari. "
            "Ivangala vachu calculator maari math pannalaam. Plus, minus, star for multiply, slash for divide. "
            "apples = 7 and price = 12.5 nu vechukonga. apples * price na 87.5 varum. "
            "Oru int-um float-um sernthaal result eppovume float aagum. "
            "Rendu special operators irukku. Double slash, adhu integer division, 7 // 2 na 3. "
            "Percent sign remainder tharum, 7 % 2 na 1. Double star power, 2 ** 3 na 8. "
            "Idhellaam operators chapter-la detail-a paarpom. Ippo mukkiyam, number-a type-a purinjikkanum. "
            "Code-a run pannitu 87.5 and 3 1 8 varudhanu check pannunga. Neengalae vera numbers vachu try pannunga."
        ),
        "paragraphs": [
            "Python has two main number types: int for whole numbers and float for decimals. Mix them and the result is always a float.",
            "Standard operators: + - * / for basic maths. // for integer division (drops the decimal), % for remainder, ** for power.",
            "Use these to build simple calculators, compute totals, or check whether a number is odd or even with the % operator.",
        ],
        "key_terms": ["int", "float", "integer division", "remainder", "power"],
        "code_example": {
            "language": "python",
            "source": "apples = 7\nprice = 12.5\nprint(apples * price)\nprint(7 // 2)\nprint(7 % 2)\nprint(2 ** 3)",
            "expectedOutput": "87.5\n3\n1\n8",
            "runnable": True,
        },
        "diagram_spec": {
            "kind": "data-types",
            "title": "int and float operators",
            "caption": "Each operator produces a specific type.",
            "nodes": [
                {"id": "int", "label": "int", "value": "7", "caption": "whole", "tone": "highlight"},
                {"id": "float", "label": "float", "value": "12.5", "caption": "decimal", "tone": "highlight"},
                {"id": "floor", "label": "//", "value": "3", "caption": "integer div", "tone": "valid"},
                {"id": "mod", "label": "%", "value": "1", "caption": "remainder", "tone": "valid"},
                {"id": "pow", "label": "**", "value": "8", "caption": "power", "tone": "valid"},
            ],
        },
        "cues": [
            {"id": "c1", "atWord": 5, "kind": "focus-node", "target": "int"},
            {"id": "c2", "atWord": 10, "kind": "focus-node", "target": "float"},
            {"id": "c3", "atWord": 35, "kind": "focus-code-line", "target": "3"},
            {"id": "c4", "atWord": 48, "kind": "focus-node", "target": "floor"},
            {"id": "c5", "atWord": 55, "kind": "focus-node", "target": "mod"},
            {"id": "c6", "atWord": 62, "kind": "focus-node", "target": "pow"},
            {"id": "c7", "atWord": 75, "kind": "focus-code-line", "target": "4"},
            {"id": "c8", "atWord": 85, "kind": "focus-code-line", "target": "6"},
        ],
        "practice_prompts": [
            "Compute how many complete dozens fit in 100 apples and how many are left over.",
            "Predict 9 // 4 and 9 % 4 before running them.",
        ],
        "analogies": {
            "cricket": "Integer division is like overs: 10 balls bowled // 6 = 1 complete over, 10 % 6 = 4 balls remaining.",
            "movies": "Float is like the running time 1.5 hours; int is like 90 minutes. Same value, different precision.",
            "neutral": "// is like cutting a pizza into slices: 7 slices // 2 people = 3 slices each; 7 % 2 = 1 slice left.",
        },
        "estimated_minutes": 4,
    },
    {
        "id": "lesson_python_2_2",
        "chapter_number": 2,
        "page_number": 2,
        "title": "Strings",
        "narration_text": (
            "Ippo strings, athaavadhu text pathi paarkalaam. "
            "Quotes kulla ezhudhina edhuvum string thaan, single quote illa double quote rendume sari. "
            "name = \"Priya\" nu vechukonga. Rendu strings-a plus sign vachu serkalaam, idhukku concatenation nu peru. "
            "\"Hello, \" + name na Hello, Priya varum. Space-a neengalae string kulla podanum, illa na words ottikkum. "
            "len() function string-oda length-a tharum, so len(name) 5. "
            "name.upper() ellaa letters-um capital aakkum, PRIYA. Idhu oru method, dot potu call pannanum. "
            "Strings-la ovvoru character-kum oru position irukku, adhu 0 la irundhu start aagum. So name[0] na P. "
            "Oru vishayam, strings maara mudiyaadhu. Neenga mattum pudhu string uruvakkalaam. "
            "Code-a run pannitu moonu lines-um check pannunga. Unga peru vachu try pannunga. "
            "Idhu romba simple ah theriyum, aana strings thaan almost ellaa program-layum varum: "
            "names, messages, emails, ellaam. So idha nalla pazhagikonga, next chapters-la rombha useful aagum."
        ),
        "paragraphs": [
            "A string is text inside quotes. Single or double quotes both work. Use + to join (concatenate) two strings.",
            "len() returns the number of characters. Methods like .upper(), .lower(), and .strip() transform strings. Access individual characters with str[0], str[1], ...",
            "Strings are immutable: you cannot change a character in place. Instead, create a new string with the transformation applied.",
        ],
        "key_terms": ["string", "concatenation", "len()", ".upper()", "index"],
        "code_example": {
            "language": "python",
            "source": 'name = "Priya"\nprint("Hello, " + name)\nprint(len(name))\nprint(name.upper())\nprint(name[0])',
            "expectedOutput": "Hello, Priya\n5\nPRIYA\nP",
            "runnable": True,
        },
        "diagram_spec": {
            "kind": "data-types",
            "title": "String operations",
            "caption": "Common string operations and what they return.",
            "nodes": [
                {"id": "str", "label": "str", "value": '"Priya"', "caption": "text", "tone": "highlight"},
                {"id": "concat", "label": "+", "value": '"Hello, Priya"', "caption": "concatenation", "tone": "valid"},
                {"id": "len", "label": "len()", "value": "5", "caption": "length", "tone": "valid"},
                {"id": "upper", "label": ".upper()", "value": '"PRIYA"', "caption": "uppercase", "tone": "valid"},
                {"id": "index", "label": "[0]", "value": '"P"', "caption": "first char", "tone": "valid"},
            ],
        },
        "cues": [
            {"id": "c1", "atWord": 3, "kind": "focus-node", "target": "str"},
            {"id": "c2", "atWord": 18, "kind": "highlight-term", "target": "concatenation"},
            {"id": "c3", "atWord": 30, "kind": "focus-node", "target": "concat"},
            {"id": "c4", "atWord": 40, "kind": "highlight-term", "target": "len()"},
            {"id": "c5", "atWord": 48, "kind": "focus-node", "target": "len"},
            {"id": "c6", "atWord": 55, "kind": "focus-node", "target": "upper"},
            {"id": "c7", "atWord": 65, "kind": "highlight-term", "target": "index"},
            {"id": "c8", "atWord": 72, "kind": "focus-node", "target": "index"},
        ],
        "practice_prompts": [
            "Concatenate your first and last name with a space between them.",
            "Print the 3rd character of your name using indexing.",
        ],
        "analogies": {
            "cricket": "A string is like a scorecard: a fixed sequence of characters you can read but not erase mid-match.",
            "movies": "Concatenation is like splicing two film reels: they play one after the other.",
            "neutral": "A string index is like a hotel room number: room 0 is first, room 1 is second, and so on.",
        },
        "estimated_minutes": 4,
    },
    {
        "id": "lesson_python_2_3",
        "chapter_number": 2,
        "page_number": 3,
        "title": "Booleans and comparisons",
        "narration_text": (
            "Ippo boolean, athaavadhu True illa False pathi paarkalaam. "
            "Boolean-la rendu values thaan irukku, True and False. T and F capital-a ezhudhanum, illa na Python purinjikkaadhu. "
            "Idhu yes or no kelvikku badhil maari. age = 21 nu vechukonga. "
            "age >= 18 nu ezhudhina Python compare pannum, 21 pathinettai vida adhigam na True. "
            "Adha is_adult nra variable-la store pannalaam. "
            "Comparison operators-la less than, greater than, equals irukku. "
            "Double equals check pannum, single equals assign pannum, idha mix pannaadheenga. "
            "age == 21 True, age < 18 False. "
            "Rendu conditions-a and, or, not vachu serkalaam. "
            "is_adult and age < 25 na rendume True irundha mattum True. "
            "Idhu later if statements-la romba use aagum. "
            "Code-a run pannitu True, False True, True varudhanu paarunga. Vera age vachu try pannunga."
        ),
        "paragraphs": [
            "A boolean holds only True or False (capital T and F). Comparisons like age >= 18 produce a boolean.",
            "Comparison operators: == (equal), != (not equal), < > <= >=. Remember: == checks equality, = assigns. Do not mix them.",
            "Combine conditions with and, or, not. These logical operators let you test multiple things at once, which is essential for if statements.",
        ],
        "key_terms": ["bool", "True", "False", "comparison operators", "and / or / not"],
        "code_example": {
            "language": "python",
            "source": "age = 21\nis_adult = age >= 18\nprint(is_adult)\nprint(age == 21)\nprint(age < 18)\nprint(is_adult and age < 25)",
            "expectedOutput": "True\nTrue\nFalse\nTrue",
            "runnable": True,
        },
        "diagram_spec": {
            "kind": "data-types",
            "title": "Comparisons produce booleans",
            "caption": "Every comparison evaluates to True or False.",
            "nodes": [
                {"id": "bool", "label": "bool", "value": "True / False", "caption": "yes or no", "tone": "highlight"},
                {"id": "ge", "label": ">=", "value": "True", "caption": "greater or equal", "tone": "valid"},
                {"id": "eq", "label": "==", "value": "True", "caption": "equal check", "tone": "valid"},
                {"id": "lt", "label": "<", "value": "False", "caption": "less than", "tone": "invalid"},
                {"id": "and", "label": "and", "value": "True", "caption": "both true", "tone": "valid"},
            ],
        },
        "cues": [
            {"id": "c1", "atWord": 2, "kind": "focus-node", "target": "bool"},
            {"id": "c2", "atWord": 18, "kind": "focus-node", "target": "ge"},
            {"id": "c3", "atWord": 32, "kind": "highlight-term", "target": "comparison operators"},
            {"id": "c4", "atWord": 45, "kind": "focus-node", "target": "eq"},
            {"id": "c5", "atWord": 55, "kind": "focus-node", "target": "lt"},
            {"id": "c6", "atWord": 65, "kind": "highlight-term", "target": "and / or / not"},
            {"id": "c7", "atWord": 72, "kind": "focus-node", "target": "and"},
            {"id": "c8", "atWord": 85, "kind": "focus-code-line", "target": "4"},
        ],
        "practice_prompts": [
            "Write a boolean expression that is True only when a score is between 50 and 100.",
            "Predict is_adult and age < 25 for age = 17, then check.",
        ],
        "analogies": {
            "cricket": "A boolean is like an umpire's decision: Out or Not Out. No middle ground.",
            "movies": "True/False is like a movie's box-office result: hit or flop, based on a threshold.",
            "neutral": "A boolean is a light switch: on (True) or off (False). Comparisons flip the switch.",
        },
        "estimated_minutes": 4,
    },
    {
        "id": "lesson_python_2_4",
        "chapter_number": 2,
        "page_number": 4,
        "title": "Type conversion",
        "narration_text": (
            "Ippo oru type-a innoru type-a maathara pathi paarkalaam, idhukku type conversion nu peru. "
            "input() eppovume string tharum, so number venumna convert pannanum. "
            "text = \"5\" nu vechukonga, adhu string. int(text) na 5 nra number, so number + 5 na 10. "
            "str(number) thirumba text aakkum, so str(number) + \"5\" na 55, adhu add illa, joining. "
            "float(\"3.5\") * 2 na 7.0 varum. int(7.9) na 7, decimal-a vetti thallum, round pannaadhu. "
            "Ella conversion-um work aagaadhu. int(\"abc\") ValueError tharum, because adhu number illa. "
            "Type-a maathrathu original variable-a maathaadhu, pudhu value-a thirumba tharum, adha store pannanum. "
            "Idhu thaan input() with age problem-a theerkkum. "
            "Code-a run pannitu 10, 55, 7.0, 7 varudhanu paarunga. Neengalae vera values kudutthu try pannunga. "
            "Idhu ellaa program-layum thevai padum, especially user input-oda velai pannum pothu. "
            "Ovvoru conversion-um oru pudhu value-a tharum, so adha oru variable-la store pannitu use pannunga."
        ),
        "paragraphs": [
            "Type conversion turns one type into another: int(\"5\") gives the number 5, str(42) gives the string \"42\".",
            "int() truncates (does not round) floats: int(7.9) is 7. float() accepts integers and numeric strings. str() accepts any value.",
            "Conversions fail with a ValueError when the value cannot be interpreted as the target type (e.g. int(\"abc\")). Always convert user input before arithmetic.",
        ],
        "key_terms": ["type conversion", "int()", "float()", "str()", "ValueError"],
        "code_example": {
            "language": "python",
            "source": 'text = "5"\nnumber = int(text)\nprint(number + 5)\nprint(str(number) + "5")\nprint(float("3.5") * 2)\nprint(int(7.9))',
            "expectedOutput": "10\n55\n7.0\n7",
            "runnable": True,
        },
        "diagram_spec": {
            "kind": "assignment-flow",
            "title": "Type conversion flow",
            "caption": "int(), float(), str() produce new values without changing the original.",
            "nodes": [
                {"id": "orig", "label": '"5"', "value": "str", "caption": "original", "tone": "highlight"},
                {"id": "conv", "label": "int()", "value": "5", "caption": "new int", "tone": "valid"},
                {"id": "back", "label": "str()", "value": '"5"', "caption": "back to str", "tone": "valid"},
            ],
        },
        "cues": [
            {"id": "c1", "atWord": 8, "kind": "highlight-term", "target": "type conversion"},
            {"id": "c2", "atWord": 18, "kind": "highlight-term", "target": "int()"},
            {"id": "c3", "atWord": 28, "kind": "focus-node", "target": "orig"},
            {"id": "c4", "atWord": 38, "kind": "focus-node", "target": "conv"},
            {"id": "c5", "atWord": 48, "kind": "highlight-term", "target": "float()"},
            {"id": "c6", "atWord": 58, "kind": "highlight-term", "target": "ValueError"},
            {"id": "c7", "atWord": 68, "kind": "focus-node", "target": "back"},
            {"id": "c8", "atWord": 78, "kind": "focus-code-line", "target": "3"},
        ],
        "practice_prompts": [
            "Ask the user for two numbers and print their sum. Fix the input() string problem with int().",
            "Try int('hello') and describe the error message you see.",
        ],
        "analogies": {
            "cricket": "Type conversion is like converting a run to an over equivalent: the value changes form but represents the same game event.",
            "movies": "Converting str to int is like dubbing a film: same content, new format for a different audience.",
            "neutral": "Type conversion is like converting Celsius to Fahrenheit: same temperature, different scale.",
        },
        "estimated_minutes": 4,
    },
]


async def seed_database(session: AsyncSession) -> None:
    """
    Idempotent seed: inserts only if records don't exist.
    Safe to call on every startup.
    """
    from sqlalchemy import select

    # Check if course already seeded
    result = await session.execute(select(Course).where(Course.id == "python"))
    if result.scalar_one_or_none():
        return  # already seeded

    # Insert course
    course = Course(**PYTHON_COURSE)
    session.add(course)
    await session.flush()

    # Insert chapters and collect id map
    chapter_id_map: dict[int, str] = {}
    for ch_data in PYTHON_CHAPTERS:
        ch = Chapter(
            course_id="python",
            number=ch_data["number"],
            title=ch_data["title"],
            summary=ch_data["summary"],
            page_count=ch_data["page_count"],
            locked=ch_data["locked"],
        )
        session.add(ch)
        await session.flush()
        chapter_id_map[ch_data["number"]] = ch.id

    # Insert pages
    for p_data in PYTHON_PAGES:
        chapter_id = chapter_id_map[p_data["chapter_number"]]
        page = Page(
            id=p_data["id"],
            course_id="python",
            chapter_id=chapter_id,
            page_number=p_data["page_number"],
            title=p_data["title"],
            narration_text=p_data["narration_text"],
            paragraphs=p_data["paragraphs"],
            key_terms=p_data["key_terms"],
            code_example=p_data["code_example"],
            diagram_spec=p_data["diagram_spec"],
            cues=p_data["cues"],
            practice_prompts=p_data["practice_prompts"],
            analogies=p_data["analogies"],
            estimated_minutes=p_data["estimated_minutes"],
        )
        session.add(page)

    await session.commit()

    # Seed admin user + a first learner invite (dev only)
    await _seed_admin_and_invite(session)


async def _seed_admin_and_invite(session: AsyncSession) -> None:
    """
    Create a dev admin user and a bootstrap learner invite.
    Only runs if no admin exists yet.
    Logs the invite token so a developer can sign up their first learner.
    """
    from sqlalchemy import select
    from datetime import datetime, timedelta, timezone
    import hashlib

    result = await session.execute(
        select(User).where(User.role == "admin")
    )
    if result.scalar_one_or_none():
        return  # already seeded

    from app.auth.service import hash_password

    # Create dev admin
    admin = User(
        email="admin@bookey.dev",
        display_name="Bookey Admin",
        role="admin",
        password_hash=hash_password("bookey-admin-dev"),
    )
    session.add(admin)
    await session.flush()

    # Create a bootstrap learner invite
    raw_invite = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_invite.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(days=365)
    invite = Invite(
        token_hash=token_hash,
        invited_email=None,
        role="learner",
        created_by=admin.id,
        expires_at=expires_at,
    )
    session.add(invite)
    await session.commit()

    _log.warning(
        "\n"
        "=== DEV BOOTSTRAP ===\n"
        "Admin user:  admin@bookey.dev  /  bookey-admin-dev\n"
        "Learner invite token: %s\n"
        "(Use this at POST /auth/signup to create the first learner account)\n"
        "=====================",
        raw_invite,
    )
