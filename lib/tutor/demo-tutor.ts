import type { LearningCourseId } from '@/lib/mock/learning'
import type { PreferredLanguage } from '@/lib/stores/personalization'
import type { BookLessonPage } from '@/types/book'

/**
 * Seeded, offline tutor. Answers are picked from author-written lesson notes;
 * no question ever leaves the browser and no model is called.
 */

export type TutorIntent = 'explain' | 'another-example' | 'harder' | 'try' | 'off-topic'

export interface TutorSource {
  label: string
  /** 0-based index into the course's reader pages. */
  pageIndex: number
}

export interface TutorAnswer {
  intent: TutorIntent
  text: string
  code?: string
  diagram?: string[]
  sources: TutorSource[]
}

export const TUTOR_SUGGESTIONS = [
  { intent: 'another-example', label: 'Explain with another example' },
  { intent: 'harder', label: 'Show a harder example' },
  { intent: 'try', label: 'Let me try it' },
] as const

export const DEMO_MIC_TRANSCRIPT = 'Indha page-a innoru simple example la explain pannunga'

export const MAX_QUESTION_LENGTH = 280

interface PageKit {
  explain: string
  example: [text: string, code: string]
  harder: [text: string, code: string]
  practice: [text: string, code: string]
  diagram: string[]
}

const pythonKits: Record<number, PageKit> = {
  1: {
    explain:
      'Simple-a sonna, variable oru labeled box. `x = 10` nu ezhudhumbodhu Python memory-la oru box create panni, adhukulla 10 vechu, mela `x` nu label ottum.\n\nApram `print(x)` sonna, Python andha box-a open panni ulla irukkira value-a eduthu kaatum.',
    example: [
      'Oru shop-la price tag maari yosinga. `price` thaan label, 250 thaan ulla irukkira value. Rate maarina label-a maatha vendaam — value-a mattum update pannalaam.',
      'price = 250\nprint(price)\nprice = 300\nprint(price)',
    ],
    harder: [
      'Konjam tricky: `b = a` pannumbodhu `b`-ku value copy aagudhu. Apram `a`-va maathinaalum `b` maaradhu. Adhanaala output 5 thaan, 8 illa.',
      'a = 5\nb = a\na = 8\nprint(b)  # 5',
    ],
    practice: [
      'Ungalukku oru chinna task: `city` nu oru variable create panni ungal ooru per store pannunga, apram print pannunga. Code panel-la type panni Run press pannunga.',
      'city = "Madurai"\nprint(city)',
    ],
    diagram: ['label: x', 'box: 10', 'print(x) → 10'],
  },
  2: {
    explain:
      'Assignment-la `=` na "equal" illa — "store pannu" nu artham. Python mudhalla right side-a calculate pannum, apram andha result-a left side name-la store pannum.\n\nAdhanaala `total = 40 + 2` la mudhalla 42 calculate aagum, apram adhu `total` box-la poi utkaarum.',
    example: [
      'Oru marks example: `marks = 70` apram `marks = marks + 5`. Right side `70 + 5` = 75 mudhalla varum, apram adhe `marks` box-la overwrite aagum.',
      'marks = 70\nmarks = marks + 5\nprint(marks)  # 75',
    ],
    harder: [
      'Multiple assignment and swap: Python right side-la irukkira rendu value-ayum mudhalla eduthukkum, apram left side-la store pannum. Adhanaala temp variable illaama swap pannalaam.',
      'a, b = 3, 7\na, b = b, a\nprint(a, b)  # 7 3',
    ],
    practice: [
      'Try pannunga: `steps = 1000` nu start panni, adhula 500 add panni, result-a print pannunga. Expected output: 1500.',
      'steps = 1000\nsteps = steps + 500\nprint(steps)',
    ],
    diagram: ['right side: 40 + 2', 'result: 42', 'store → total'],
  },
  3: {
    explain:
      'Data type na value enna vagai nu Python-ku sollura label. `10` oru int, `3.5` oru float, `"Hi"` oru str, `True` oru bool.\n\n`type()` use panni endha value enna type nu check pannalaam — debugging-ku romba useful.',
    example: [
      'Oru movie ticket example: seat count int, price float, show name str, booked aacha nu bool.',
      'seats = 2\nprice = 180.5\nshow = "Night Show"\nbooked = True\nprint(type(price))  # <class \'float\'>',
    ],
    harder: [
      'Tricky part: `"5" + 5` error kudukkum — str-um int-um direct-a add panna mudiyaadhu. `int()` vechu convert panna thaan work aagum.',
      'age_text = "5"\nage = int(age_text) + 5\nprint(age)  # 10',
    ],
    practice: [
      "Try pannunga: ungal height-a float-a store panni, `type()` vechu print pannunga. Expected: <class 'float'>.",
      'height = 5.7\nprint(type(height))',
    ],
    diagram: ['10 → int', '3.5 → float', '"Hi" → str', 'True → bool'],
  },
  4: {
    explain:
      'Variable name-ku sila rules irukku: letter illa underscore-la start aaganum, space irukka koodaadhu, `if`, `for` maari keywords use panna koodaadhu. Case-sensitive kooda — `Age`-um `age`-um vera vera.\n\nRead panna easy-a irukka `snake_case` style use pannunga, eg. `total_price`.',
    example: [
      'Valid: `user_name`, `_count`, `score2`. Invalid: `2score` (number-la start), `user name` (space), `class` (keyword).',
      'user_name = "Priya"\nscore2 = 88\n# 2score = 88  -> SyntaxError',
    ],
    harder: [
      'Konjam tricky: `print = 5` nu ezhudhinaa udane error varaadhu, aana apram `print()` function work aagaadhu — built-in name-a overwrite pannitteenga. Built-in names-a variable name-a use pannaadheenga.',
      'total = 5\nprint(total)\n# print = 5  -> later print() breaks',
    ],
    practice: [
      'Try pannunga: "monthly salary"-ku oru nalla snake_case name vechu 25000 store panni print pannunga.',
      'monthly_salary = 25000\nprint(monthly_salary)',
    ],
    diagram: ['start: letter or _', 'no spaces', 'not a keyword', 'snake_case'],
  },
  5: {
    explain:
      '`input()` user kitta irundhu text vaangum, `print()` screen-la kaatum. Important point: `input()` eppovum str thaan return pannum — number venumna `int()` vechu convert pannanum.',
    example: [
      'Oru greeting program: per kettu, adha vechu welcome message print pannalaam.',
      'name = input("Un per enna? ")\nprint("Vanakkam,", name)',
    ],
    harder: [
      'Rendu number add pannumbodhu `int()` marandhuttaa "2" + "3" = "23" nu join aagidum! Correct-a convert pannunga.',
      'a = int(input("First: "))\nb = int(input("Second: "))\nprint(a + b)',
    ],
    practice: [
      'Try pannunga: user-oda age kettu, next year avanga age enna nu print pannunga.',
      'age = int(input("Age: "))\nprint(age + 1)',
    ],
    diagram: ['keyboard → input()', 'str value', 'int() if needed', 'print() → screen'],
  },
  6: {
    explain:
      'Indha mini practice-la ellaa concepts-um serndhu varudhu: variables-la price, quantity store panni, multiply panni total kandupidikkurom, apram `print()` vechu bill kaatrom.',
    example: [
      'Tea shop bill: 3 tea, oru tea 15 rupees. total = 3 × 15 = 45.',
      'tea_price = 15\nqty = 3\ntotal = tea_price * qty\nprint("Total:", total)',
    ],
    harder: [
      'GST add pannalaam: total mela 5% tax calculate panni, `round()` vechu 2 decimal-ku round pannunga.',
      'subtotal = 450\ntax = subtotal * 0.05\nprint("Bill:", round(subtotal + tax, 2))  # 472.5',
    ],
    practice: [
      'Try pannunga: 2 dosa (40 each) + 1 coffee (25) bill calculate panni print pannunga. Expected: 105.',
      'dosa = 40 * 2\ncoffee = 25\nprint(dosa + coffee)',
    ],
    diagram: ['price × qty', 'subtotal', '+ tax', 'print bill'],
  },
}

function genericKit(page: BookLessonPage): PageKit {
  const code = page.codeExample.source
  return {
    explain: `"${page.title}" page-oda main idea: ${page.paragraphs[0] ?? page.title}\n\nCode example-a step by step run panni paarunga — ovvoru line enna pannudhu nu note pannunga.`,
    example: [`"${page.title}"-ku innoru angle: idhe code-a konjam maathi try pannunga.`, code],
    harder: [`Next level: indha code-la oru value-a maathi output eppadi maarudhu nu predict pannunga.`, code],
    practice: [`Try pannunga: indha code-a type panni Run press pannunga, apram oru line maathi paarunga.`, code],
    diagram: [page.title],
  }
}

const OFF_TOPIC =
  /\b(cricket|ipl|world cup|match|score|tournament|weather|forecast|temperature|rain|movie|film|actor|actress|song|news|election|politic\w*|president|prime minister|stock|share price|bitcoin|crypto|recipe|horoscope|lottery|celebrity|football|gold rate|petrol price|traffic)\b/i

const COURSE_TERMS: Record<LearningCourseId, RegExp> = {
  python:
    /\b(python|variable|value|print|input|type|int|str|string|float|bool|code|data|name|assign\w*|box|memory|list|error|bill|example|keyword|snake_case|page|explain)\b/i,
  java: /\b(java|class|object|method|variable|jvm|code|type|int|string|example|page|explain)\b/i,
  'machine-learning': /\b(model|data|train\w*|feature|label|predict\w*|learning|regression|example|page|explain)\b/i,
  'web-development': /\b(html|css|javascript|js|web|page|browser|dom|react|layout|example|explain)\b/i,
}

export function classifyQuestion(question: string, courseId: LearningCourseId): TutorIntent {
  const q = question.toLowerCase()
  if (OFF_TOPIC.test(q) && !COURSE_TERMS[courseId].test(q)) return 'off-topic'
  if (/harder|tough|advanced|challenge|tricky|kashtam|kastam/.test(q)) return 'harder'
  if (/\btry\b|practice|exercise|quiz|let me|task/.test(q)) return 'try'
  if (/another|example|innoru|vera|different/.test(q)) return 'another-example'
  return 'explain'
}

function offTopicReply(language: PreferredLanguage, courseTitle: string, pageTitle: string) {
  if (language === 'tamil') {
    return `மன்னிக்கவும், இந்த டெமோ ஆசிரியர் ${courseTitle} பாடத்துக்கு மட்டுமே பதில் சொல்லும். கிரிக்கெட் ஸ்கோர், செய்திகள் போன்றவற்றுக்கு உதவ முடியாது. "${pageTitle}" பற்றி ஏதாவது கேளுங்கள்!`
  }
  if (language === 'english') {
    return `Sorry — this demo tutor only handles the ${courseTitle} course, so it can't help with things like scores or news. Try asking something about "${pageTitle}".`
  }
  return `Sorry, indha demo tutor ${courseTitle} course-ku mattum thaan answer pannum. Cricket score, news maari vishayangalukku help panna mudiyaadhu. "${pageTitle}" pathi edhavadhu kelunga!`
}

interface AnswerInput {
  question: string
  courseId: LearningCourseId
  courseTitle: string
  page: BookLessonPage
  pageIndex: number
  language: PreferredLanguage
}

export function answerQuestion({ question, courseId, courseTitle, page, pageIndex, language }: AnswerInput): TutorAnswer {
  const intent = classifyQuestion(question, courseId)
  if (intent === 'off-topic') {
    return { intent, text: offTopicReply(language, courseTitle, page.title), sources: [] }
  }

  const kit = (courseId === 'python' ? pythonKits[page.pageNumber] : undefined) ?? genericKit(page)
  const sources: TutorSource[] = [{ label: `Demo course notes · Page ${pageIndex + 1}`, pageIndex }]

  switch (intent) {
    case 'another-example':
      return { intent, text: kit.example[0], code: kit.example[1], sources }
    case 'harder':
      return { intent, text: `Sari, konjam level up pannalaam. ${kit.harder[0]}`, code: kit.harder[1], sources }
    case 'try':
      return { intent, text: kit.practice[0], code: kit.practice[1], sources }
    default:
      return { intent, text: kit.explain, diagram: kit.diagram, sources }
  }
}

/** Whitespace-preserving tokens so streamed text keeps its line breaks. */
export function tokenizeAnswer(text: string) {
  return text.split(/(\s+)/).filter(Boolean)
}
