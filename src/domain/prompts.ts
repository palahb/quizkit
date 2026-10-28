// Ready-made instructions the user pastes into ChatGPT/Claude to get quizzes in Quizkit's format.
// Every example below is built from real objects and checked by the importer in tests, so a
// prompt can never teach a broken format.

export type PromptId = 'notes' | 'past-exam' | 'course' | 'math' | 'terms' | 'topic' | 'fix-json';
export type PromptLanguage = 'tr' | 'en';

export const PROMPT_IDS: PromptId[] = ['notes', 'past-exam', 'course', 'math', 'terms', 'topic', 'fix-json'];

export interface PromptDef {
  id: PromptId;
  title: string;
  description: string;
  body: string;
}

const json = (value: unknown) => JSON.stringify(value, null, 2);

// ---------- Example content (LaTeX written with single backslashes; JSON.stringify doubles them) ----------

/** Example quizzes used in the prompts (and published in examples/). */
export const PROMPT_EXAMPLES = {
  tr: {
    single: {
      schemaVersion: 1,
      title: 'Uluslararası İşletmecilik – Ara Sınav 2023',
      language: 'tr',
      questions: [
        {
          question: 'İşletmenin faaliyetlerini yürüttüğü yabancı ülkeye ne ad verilir?',
          options: ['Bağlı ülke', 'Ev sahibi ülke', 'Ana ülke', 'Üçüncü ülke', 'Yatırımcı ülke'],
          answer: 'B',
          explanation: 'İşletmenin merkezi dışında faaliyet yürüttüğü yabancı ülkeye ev sahibi ülke denir.',
        },
      ],
    },
    math: {
      schemaVersion: 1,
      title: 'Matematik – İntegral',
      language: 'tr',
      questions: [
        {
          question: String.raw`$\int_0^1 x^2\,dx$ integralinin değeri nedir?`,
          options: [String.raw`$\frac{1}{3}$`, String.raw`$\frac{1}{2}$`, '$1$', '$2$', String.raw`$\frac{2}{3}$`],
          answer: 'A',
          explanation: String.raw`$$\int_0^1 x^2\,dx = \left[\frac{x^3}{3}\right]_0^1 = \frac{1}{3}$$`,
        },
      ],
    },
    terms: {
      schemaVersion: 1,
      title: 'İktisat – Temel Kavramlar',
      language: 'tr',
      questions: [
        {
          question: '“Genel fiyat düzeyinin sürekli artması” hangi kavramın tanımıdır?',
          options: ['Deflasyon', 'Enflasyon', 'Devalüasyon', 'Stagflasyon', 'Resesyon'],
          answer: 'B',
          explanation: 'Enflasyon, genel fiyat düzeyindeki sürekli artıştır; deflasyon bunun tersidir.',
        },
      ],
    },
    course: {
      schemaVersion: 1,
      folders: [
        {
          name: 'İktisat',
          folders: [
            {
              name: '2023',
              quizzes: [
                {
                  title: 'İktisat – Ara Sınav 2023',
                  questions: [
                    {
                      question: 'Talep kanununa göre fiyat artarsa talep edilen miktar ne olur?',
                      options: ['Artar', 'Azalır', 'Değişmez', 'Önce artar sonra azalır', 'Sıfır olur'],
                      answer: 'B',
                      explanation: 'Diğer koşullar sabitken fiyat ile talep edilen miktar ters yönlü hareket eder.',
                    },
                  ],
                },
              ],
            },
          ],
          quizzes: [
            {
              title: 'İktisat – Ünite 1',
              questions: [
                {
                  question: 'Kıt kaynakların sınırsız ihtiyaçlara dağıtımını inceleyen bilim hangisidir?',
                  options: ['Sosyoloji', 'İktisat', 'Hukuk', 'Psikoloji', 'Coğrafya'],
                  answer: 'B',
                },
              ],
            },
          ],
        },
      ],
    },
  },
  en: {
    single: {
      schemaVersion: 1,
      title: 'Biology – Cell Structure',
      language: 'en',
      questions: [
        {
          question: "Which organelle produces most of the cell's ATP?",
          options: ['Nucleus', 'Ribosome', 'Mitochondrion', 'Golgi apparatus', 'Lysosome'],
          answer: 'C',
          explanation: 'Mitochondria carry out cellular respiration, which produces most of the ATP.',
        },
      ],
    },
    math: {
      schemaVersion: 1,
      title: 'Calculus – Integrals',
      language: 'en',
      questions: [
        {
          question: String.raw`What is the value of $\int_0^1 x^2\,dx$?`,
          options: [String.raw`$\frac{1}{3}$`, String.raw`$\frac{1}{2}$`, '$1$', '$2$', String.raw`$\frac{2}{3}$`],
          answer: 'A',
          explanation: String.raw`$$\int_0^1 x^2\,dx = \left[\frac{x^3}{3}\right]_0^1 = \frac{1}{3}$$`,
        },
      ],
    },
    terms: {
      schemaVersion: 1,
      title: 'Economics – Key Terms',
      language: 'en',
      questions: [
        {
          question: 'Which term means “a sustained rise in the general price level”?',
          options: ['Deflation', 'Inflation', 'Devaluation', 'Stagflation', 'Recession'],
          answer: 'B',
          explanation: 'Inflation is a sustained rise in the general price level; deflation is the opposite.',
        },
      ],
    },
    course: {
      schemaVersion: 1,
      folders: [
        {
          name: 'Economics',
          folders: [
            {
              name: '2023',
              quizzes: [
                {
                  title: 'Economics – Midterm 2023',
                  questions: [
                    {
                      question: 'According to the law of demand, what happens to quantity demanded when the price rises?',
                      options: ['It rises', 'It falls', 'It stays the same', 'It rises, then falls', 'It becomes zero'],
                      answer: 'B',
                      explanation: 'All else equal, price and quantity demanded move in opposite directions.',
                    },
                  ],
                },
              ],
            },
          ],
          quizzes: [
            {
              title: 'Economics – Unit 1',
              questions: [
                {
                  question: 'Which science studies how scarce resources are allocated to unlimited wants?',
                  options: ['Sociology', 'Economics', 'Law', 'Psychology', 'Geography'],
                  answer: 'B',
                },
              ],
            },
          ],
        },
      ],
    },
  },
};

// ---------- Shared rules ----------

const RULES = {
  tr: [
    'Kurallar:',
    '- Yalnızca JSON döndür. Öncesinde ya da sonrasında açıklama yazma, kod bloğu işareti (```) koyma.',
    '- "schemaVersion" her zaman 1.',
    '- Her soruda 2–6 şık olsun ve tam olarak biri doğru olsun. Şıkların başına "A)" gibi harf koyma.',
    '- "answer" doğru şıkkın harfidir: birinci şık "A", ikinci şık "B" ve böyle devam eder.',
    '- "explanation" isteğe bağlıdır ama faydalıdır: doğru cevabın neden doğru olduğunu kısaca açıkla.',
    '- Metnin içinde tırnak işareti gerekiyorsa düz " yerine “ ” kullan. Düz " işareti JSON\'u bozar.',
    String.raw`- Formül varsa LaTeX'i $...$ (satır içi) ya da $$...$$ (ayrı satır) içine yaz. JSON içinde her ters eğik çizgiyi iki kez yaz: \\frac, \\sqrt (tek \frac değil).`,
    '- Markdown, HTML ya da görsel kullanma. Bir şekil gerekiyorsa onu sözle anlat.',
    '- İçerik uzun olsa da hiçbir soruyu atlama, yarıda kesme.',
  ],
  en: [
    'Rules:',
    '- Reply with only the JSON. No text before or after it, no code fences (```).',
    '- "schemaVersion" is always 1.',
    '- Every question has 2–6 options with exactly one correct option. Do not prefix options with "A)".',
    '- "answer" is the letter of the correct option: "A" for the first, "B" for the second, and so on.',
    '- "explanation" is optional but helpful: briefly say why the answer is right.',
    '- If a text needs quotation marks, use “ ” instead of a plain ". A plain " inside a text breaks the JSON.',
    String.raw`- Write any formula in LaTeX inside $...$ (inline) or $$...$$ (own line). Inside JSON strings, double every backslash: \\frac, \\sqrt (never a single \frac).`,
    '- Do not use Markdown, HTML or images. Describe any figure in words.',
    '- Even if the material is long, include every question; do not stop early.',
  ],
};

const FORMAT_LABEL = { tr: 'Biçim (bu yapıyı aynen kullan):', en: 'Format (use exactly this structure):' };

function assemble(lang: PromptLanguage, intro: string[], extra: string[], example: unknown, outro: string[]): string {
  return [...intro, '', ...RULES[lang], ...extra, '', FORMAT_LABEL[lang], '', json(example), '', ...outro].join('\n');
}

// ---------- Prompts ----------

function buildTr(): PromptDef[] {
  const ex = PROMPT_EXAMPLES.tr;
  return [
    {
      id: 'notes',
      title: 'Notlardan / PDF’ten test',
      description: 'Ders notunu, kitap bölümünü, sunumu ya da PDF’i teste çevirir.',
      body: assemble(
        'tr',
        ['Sana vereceğim materyalden (ders notu, kitap bölümü, sunum ya da PDF) Quizkit uygulaması için çoktan seçmeli bir test hazırla.'],
        [
          '- Materyaldeki önemli bilgilerin hepsini kapsayan [SORU SAYISI, örn. 20] soru yaz.',
          '- Soruları, şıkları ve açıklamaları materyalin dilinde yaz.',
        ],
        ex.single,
        ['Materyal:'],
      ),
    },
    {
      id: 'past-exam',
      title: 'Çıkmış sorulardan test',
      description: 'Sınav sorularını kelimesi kelimesine, aynı sırayla aktarır.',
      body: assemble(
        'tr',
        ['Sana vereceğim sınav sorularını (çıkmış sorular, deneme sınavı) Quizkit uygulaması için teste çevir.'],
        [
          '- Soruları ve şıkları kelimesi kelimesine, aynı sırayla aktar. Düzeltme ya da sadeleştirme yapma.',
          '- Cevap anahtarı verilmişse ona uy. Verilmemişse doğru cevabı sen belirle ve açıklamada bunu söyle.',
          String.raw`- "I. … II. …" gibi öncüller varsa her birini yeni satıra al (JSON içinde \n kullan).`,
          '- Başlığa dersin adını, sınav türünü ve yılını yaz (örneğin “İktisat – Ara Sınav 2023”).',
        ],
        ex.single,
        ['Sınav soruları:'],
      ),
    },
    {
      id: 'course',
      title: 'Bütün bir ders: klasörlü toplu',
      description: 'Ünite ya da yıl başına bir test, klasörler halinde tek seferde.',
      body: assemble(
        'tr',
        [
          'Sana vereceğim materyalden Quizkit uygulaması için birden fazla test hazırla ve onları klasörlere yerleştir.',
          'Bu, tek test biçimi değil, "folders" ve "quizzes" içeren toplu biçimdir.',
        ],
        [
          '- Her ünite, sınav ya da yıl için ayrı bir test oluştur.',
          '- Klasörler iç içe olabilir (en fazla 8 seviye). Klasör adlarını kısa tut.',
          '- Bir klasörün içinde hem "quizzes" (testler) hem "folders" (alt klasörler) olabilir. En üst seviyede de "quizzes" kullanabilirsin.',
          '- Uygulama aynı adlı klasörleri birleştirir: var olan bir klasörün adını aynen yazarsan testler o klasöre eklenir.',
          '- Testlerin içine ayrıca "schemaVersion" yazma; en üstte bir kez yazman yeterli.',
        ],
        ex.course,
        ['Materyal:'],
      ),
    },
    {
      id: 'math',
      title: 'Matematik / formüllü test',
      description: 'Formüllü ve sayısal sorular, LaTeX kurallarıyla.',
      body: assemble(
        'tr',
        ['Sana vereceğim materyalden Quizkit uygulaması için formüllü, çoktan seçmeli bir test hazırla.'],
        [
          String.raw`- Bütün matematiksel ifadeleri LaTeX ile yaz: kesir \\frac{a}{b}, kök \\sqrt{x}, üs x^{2}, integral \\int.`,
          '- Sayısal sorularda şıklar birbirine yakın olsun ama yalnızca biri doğru olsun. Açıklamada çözüm adımlarını göster.',
          String.raw`- Para birimi için $ işaretini kullanma: “TL” ya da “dolar” yaz ya da \\$ kullan.`,
        ],
        ex.math,
        ['Materyal:'],
      ),
    },
    {
      id: 'terms',
      title: 'Terim ve tanımlardan test',
      description: 'Sözlük, kavram listesi ya da yabancı dil kelimeleri.',
      body: assemble(
        'tr',
        ['Sana vereceğim terim ve tanım listesinden Quizkit uygulaması için bir test hazırla.'],
        [
          '- Her terim için bir soru yaz: ya tanımı sorup terimi şıklarda ver ya da terimi sorup tanımı şıklarda ver. İkisini karıştırabilirsin.',
          '- Yanlış şıkları listedeki diğer terimlerden seç, böylece sorular gerçekten ayırt edici olsun.',
          '- Yabancı dil kelimeleriyse soruyu Türkçe, şıkları hedef dilde yaz (ya da tersini yap).',
        ],
        ex.terms,
        ['Terimler:'],
      ),
    },
    {
      id: 'topic',
      title: 'Konu adından test',
      description: 'Kaynak vermeden, yapay zekânın kendi bilgisinden.',
      body: assemble(
        'tr',
        ['Şu konu hakkında Quizkit uygulaması için çoktan seçmeli bir test hazırla: [KONU]', 'Soru sayısı: [SAYI]', 'Seviye: [başlangıç / orta / ileri]'],
        [
          '- Yalnızca emin olduğun, doğrulanabilir bilgileri sor. Emin olmadığın bir şeyi soru yapma.',
          '- Her soruya açıklama ekle.',
        ],
        ex.single,
        [],
      ),
    },
    {
      id: 'fix-json',
      title: 'Hatalı JSON’u düzelttir',
      description: 'Uygulamanın verdiği hata mesajıyla birlikte yapıştır.',
      body: assemble(
        'tr',
        ['Aşağıdaki JSON, Quizkit uygulamasına aktarılırken hata verdi. Hatayı bul ve düzelt.'],
        [
          '- İçeriği (soruları, şıkları, cevapları, açıklamaları) değiştirme; yalnızca biçim hatalarını düzelt.',
          '- Düzeltilmiş JSON\'un tamamını döndür, kısaltma.',
          '- Bu bir toplu dosyaysa ("folders"/"quizzes" içeriyorsa) aynı yapıyı koru.',
        ],
        ex.single,
        ['Uygulamanın hata mesajı:', '[HATA MESAJINI BURAYA YAPIŞTIR]', '', 'JSON:', "[JSON'U BURAYA YAPIŞTIR]"],
      ),
    },
  ];
}

function buildEn(): PromptDef[] {
  const ex = PROMPT_EXAMPLES.en;
  return [
    {
      id: 'notes',
      title: 'Quiz from notes / PDF',
      description: 'Turns lecture notes, a book chapter, slides or a PDF into a quiz.',
      body: assemble(
        'en',
        ['Turn the material I give you (lecture notes, a book chapter, slides or a PDF) into a multiple-choice quiz for the Quizkit app.'],
        [
          '- Write [NUMBER, e.g. 20] questions that cover all the important points of the material.',
          '- Write questions, options and explanations in the same language as the material.',
        ],
        ex.single,
        ['Material:'],
      ),
    },
    {
      id: 'past-exam',
      title: 'Quiz from past exam questions',
      description: 'Copies exam questions word for word, in order.',
      body: assemble(
        'en',
        ['Turn the exam questions I give you (past papers, practice exams) into a quiz for the Quizkit app.'],
        [
          '- Copy the questions and options word for word, in the same order. Do not correct or simplify them.',
          '- If an answer key is given, follow it. If not, decide the correct answer yourself and say so in the explanation.',
          String.raw`- If a question lists statements like "I. … II. …", put each on its own line (use \n inside the JSON string).`,
          '- Put the course, exam type and year in the title (for example “Economics – Midterm 2023”).',
        ],
        ex.single,
        ['Exam questions:'],
      ),
    },
    {
      id: 'course',
      title: 'Whole course: folders in one go',
      description: 'One quiz per unit or year, organized into folders.',
      body: assemble(
        'en',
        [
          'Turn the material I give you into several quizzes for the Quizkit app and organize them into folders.',
          'This is the collection format with "folders" and "quizzes", not the single-quiz format.',
        ],
        [
          '- Make a separate quiz for each unit, exam or year.',
          '- Folders can be nested (at most 8 levels). Keep folder names short.',
          '- A folder can contain both "quizzes" and "folders" (subfolders). You can also put "quizzes" at the top level.',
          '- The app merges folders with the same name: if you reuse an existing folder name exactly, the quizzes are added to that folder.',
          '- Do not repeat "schemaVersion" inside the quizzes; once at the top is enough.',
        ],
        ex.course,
        ['Material:'],
      ),
    },
    {
      id: 'math',
      title: 'Math / formula quiz',
      description: 'Numeric and formula questions with LaTeX rules.',
      body: assemble(
        'en',
        ['Turn the material I give you into a multiple-choice quiz with formulas for the Quizkit app.'],
        [
          String.raw`- Write all math in LaTeX: fractions \\frac{a}{b}, roots \\sqrt{x}, powers x^{2}, integrals \\int.`,
          '- In numeric questions, make the options close to each other but with only one correct. Show the solution steps in the explanation.',
          String.raw`- Do not use $ for money: write “USD” or “dollars”, or use \\$.`,
        ],
        ex.math,
        ['Material:'],
      ),
    },
    {
      id: 'terms',
      title: 'Quiz from terms and definitions',
      description: 'A glossary, a list of concepts or vocabulary words.',
      body: assemble(
        'en',
        ['Turn the list of terms and definitions I give you into a quiz for the Quizkit app.'],
        [
          '- Write one question per term: either ask for the term given the definition, or the definition given the term. You can mix both.',
          '- Take the wrong options from the other terms in the list, so the questions really test the difference.',
          '- For vocabulary, ask in my language and give the options in the target language (or the other way round).',
        ],
        ex.terms,
        ['Terms:'],
      ),
    },
    {
      id: 'topic',
      title: 'Quiz from a topic name',
      description: 'No source material: from the AI’s own knowledge.',
      body: assemble(
        'en',
        ['Write a multiple-choice quiz for the Quizkit app about this topic: [TOPIC]', 'Number of questions: [NUMBER]', 'Level: [beginner / intermediate / advanced]'],
        [
          '- Only ask about facts you are sure of and that can be checked. Leave out anything you are unsure about.',
          '- Add an explanation to every question.',
        ],
        ex.single,
        [],
      ),
    },
    {
      id: 'fix-json',
      title: 'Fix a broken JSON',
      description: 'Paste it together with the app’s error message.',
      body: assemble(
        'en',
        ['The JSON below failed to import into the Quizkit app. Find the problem and fix it.'],
        [
          '- Do not change the content (questions, options, answers, explanations); only fix format errors.',
          '- Return the whole corrected JSON; do not shorten it.',
          '- If it is a collection (it has "folders"/"quizzes"), keep that structure.',
        ],
        ex.single,
        ["The app's error message:", '[PASTE THE ERROR MESSAGE HERE]', '', 'JSON:', '[PASTE THE JSON HERE]'],
      ),
    },
  ];
}

const CACHE: Partial<Record<PromptLanguage, PromptDef[]>> = {};

export function getPrompts(lang: PromptLanguage): PromptDef[] {
  return (CACHE[lang] ??= lang === 'tr' ? buildTr() : buildEn());
}

export function getPrompt(id: PromptId, lang: PromptLanguage): PromptDef {
  return getPrompts(lang).find((p) => p.id === id)!;
}
