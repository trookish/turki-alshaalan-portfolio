import type { L } from '../i18n/types'

export interface CaseStudyFact {
  label: L
  value: L
  note?: L
}

export interface CaseStudySection {
  id: string
  label: L
  paragraphs: L[]
  facts?: CaseStudyFact[]
}

export interface CaseStudy {
  projectId: string
  eyebrow: L
  summary: L
  sections: CaseStudySection[]
  privacy: L
  /** Present once the cut is delivered; the video block is hidden until then. */
  video?: { mp4: string; webm?: string; poster: string; caption: L }
  /** Present once the in-browser model export is wired; the tab is hidden until then. */
  calculator?: boolean
}

const plateStudy: CaseStudy = {
  projectId: 'saudi-plate-predictor',
  eyebrow: { en: 'Case study', ar: 'دراسة حالة' },
  summary: {
    en: 'A pricing model for Saudi distinguished license plates, built on public Absher auction data: collector, permanent history, model, and four surfaces that read it. The code is private, so this page documents what it does and what it measurably gets right.',
    ar: 'نموذج لتسعير اللوحات المميزة السعودية مبني على بيانات مزاد أبشر العامة: جامع، وتاريخ دائم، ونموذج، وأربع واجهات تقرأ منه. الشيفرة خاصة، لذا توثّق هذه الصفحة ما يفعله النموذج وما يصيبه بدقة قابلة للقياس.',
  },
  sections: [
    {
      id: 'problem',
      label: { en: 'The problem', ar: 'المشكلة' },
      paragraphs: [
        {
          en: 'Distinguished plates trade in two places: the Absher eAuction and the marketplace listings beside it. Both show what a plate is being asked for right now, and neither shows what plates like it actually closed at. A buyer deciding whether 9,000 SAR is reasonable has no comparison point.',
          ar: 'تُتداول اللوحات المميزة في مكانين: مزاد أبشر، وعروض السوق المجاورة له. كلاهما يعرض السعر المطلوب الآن، ولا يعرض أيٌّ منهما الأسعار التي أُغلقت عليها لوحات مشابهة. من يواجه سعراً مثل ٩٠٠٠ ريال لا يجد ما يقارن به.',
        },
        {
          en: 'The project turns that gap into a number: a typical closing price for a plate, two ranges around it, and — for a live listing — where the bidding is likely to end.',
          ar: 'يحوّل المشروع هذه الفجوة إلى رقم: سعر إغلاق معتاد للوحة، ونطاقان حوله، وللعرض الجاري تقدير لأين ينتهي المزاد.',
        },
      ],
    },
    {
      id: 'data',
      label: { en: 'The data', ar: 'البيانات' },
      paragraphs: [
        {
          en: 'Two public Absher auction feeds are polled on a fixed schedule. Every observation is written to SQLite with a source and a data-type column, so an observed close can always be told apart from a derived value; a provenance audit fails the run when a plate row arrives without them.',
          ar: 'يُستقصى مصدران عامان من مزاد أبشر وفق جدول ثابت. تُكتب كل مشاهدة في SQLite مع عمودَي المصدر ونوع البيانات، فيبقى سعر الإغلاق المرصود متميزاً عن أي قيمة مشتقة، ويفشل تدقيق المصدر عند وصول صف لوحة بلا هذين العمودين.',
        },
        {
          en: 'History is append-only. A listing that disappears from the feed is kept, which is what makes closing prices usable later: the observation is never overwritten by the next poll.',
          ar: 'التاريخ تراكمي لا يُعاد كتابته. العرض الذي يختفي من المصدر يبقى محفوظاً، وهذا ما يجعل أسعار الإغلاق قابلة للاستخدام لاحقاً: لا تُمحى المشاهدة عند الاستقصاء التالي.',
        },
        {
          en: 'Plates are normalised before anything else. Letters are stored in Arabic reading order and printed in reverse — ك و ي is stored UKV and shown VKU — so a plate typed in either script resolves to one key.',
          ar: 'تُطبَّع اللوحات قبل أي خطوة أخرى. تُخزَّن الحروف بترتيب القراءة العربي وتُطبع معكوسة — «ك و ي» تُخزَّن UKV وتُعرض VKU — فتُحلّ اللوحة المكتوبة بأي حرف إلى مفتاح واحد.',
        },
      ],
    },
    {
      id: 'pipeline',
      label: { en: 'The pipeline', ar: 'خط المعالجة' },
      paragraphs: [
        {
          en: 'Collection and scoring are separate runs over one database. The live monitor polls, detects new listings and records bid ladders; the historical pipeline fits statistics over observed closes only.',
          ar: 'الجمع والتقييم عمليتان منفصلتان على قاعدة بيانات واحدة. يراقب المجمّع العروض الجديدة ويسجّل سلالم المزايدة، بينما يحسب خط التاريخ إحصاءاته على أسعار الإغلاق المرصودة وحدها.',
        },
        {
          en: 'A third pipeline scores any frozen JSON universe of plates exactly once, using sealed statistics that carry a training cut-off. Evaluation data never flows back into the database: the loader writes nothing, similarity search excludes unobserved neighbours, and a leakage test enforces each boundary.',
          ar: 'هناك خط ثالث يقيّم أي مجموعة لوحات مجمّدة بصيغة JSON مرة واحدة، بإحصاءات مختومة تحمل تاريخ قطع التدريب. لا تعود بيانات التقييم إلى قاعدة البيانات: المحمّل لا يكتب شيئاً، ويستثني بحث التشابه الجيران غير المرصودين، ويختبر اختبار تسريب كل حد من هذه الحدود.',
        },
      ],
      facts: [
        {
          label: { en: 'Storage', ar: 'التخزين' },
          value: { en: 'SQLite, WAL, eight tables', ar: 'SQLite بنمط WAL وثماني جداول' },
          note: { en: 'Provenance columns on every plate row', ar: 'أعمدة مصدر في كل صف لوحة' },
        },
        {
          label: { en: 'Surfaces', ar: 'الواجهات' },
          value: { en: 'Launcher, web console, calculator, terminal', ar: 'لانشر، ووحدة تحكم ويب، وحاسبة، والطرفية' },
          note: { en: 'All read one valuation API', ar: 'جميعها تقرأ واجهة تقييم واحدة' },
        },
      ],
    },
    {
      id: 'model',
      label: { en: 'The model', ar: 'النموذج' },
      paragraphs: [
        {
          en: 'Pricing runs at two levels: plate patterns, then individual plates. Candidates are drawn from historical closes that match on digits and letters, and two models are fitted — a baseline and a machine-learning model — so the second has something honest to beat.',
          ar: 'يجري التسعير على مستويين: أنماط اللوحات، ثم اللوحات المفردة. تُستخرج المرشّحات من أسعار الإغلاق التاريخية المتوافقة في الأرقام والحروف، ويُدرَّب نموذجان — خط أساس ونموذج تعلّم آلة — ليقاس الثاني على أساس واضح.',
        },
        {
          en: 'Every estimate returns a typical closing price with two ranges: a likely band targeting 50% coverage and a wide band targeting 90%. Both carry the coverage they actually measured, so a band is a tested statement rather than a decoration.',
          ar: 'يعيد كل تقدير سعر إغلاق معتاداً مع نطاقين: نطاق مرجّح يستهدف تغطية ٥٠٪ ونطاق واسع يستهدف ٩٠٪. ويحمل كل نطاق التغطية التي قاسها فعلاً، فيكون النطاق ادعاءً مختبَراً لا زخرفة.',
        },
        {
          en: 'For a listing that is live, a separate expected-final estimate uses the observed bid ladder, the hours left and the opening price, and reports its own method and status instead of passing as a measured close.',
          ar: 'أما العرض الجاري فيقدّره حساب منفصل لسعر الإغلاق المتوقع يعتمد سلم المزايدة المرصود والساعات المتبقية وسعر الافتتاح، ويعلن طريقته وحالته بدل أن يبدو كسعر إغلاق مقيس.',
        },
      ],
    },
    {
      id: 'evidence',
      label: { en: 'What it measures', ar: 'ما يقيسه' },
      paragraphs: [
        {
          en: 'Every answer the model gives carries its own evidence block: plates tested, the typical error factor, the coverage each band achieved, the model version and the date it was trained through. The figures below are that block for model fair-price-v4, trained through 2026-11-03, measured on 2,001 plates held out of training.',
          ar: 'ترافق كل إجابة كتلة أدلتها: عدد اللوحات المختبَرة، ومعامل الخطأ المعتاد، والتغطية التي حققها كل نطاق، وإصدار النموذج وتاريخ التدريب. الأرقام أدناه هي تلك الكتلة للنموذج fair-price-v4 حتى ٢٠٢٦-١١-٠٣، مقيسة على ٢٠٠١ لوحة مستبعدة من التدريب.',
        },
      ],
      facts: [
        {
          label: { en: 'Plates held out', ar: 'لوحات مستبعدة' },
          value: { en: '2,001', ar: '٢٠٠١' },
        },
        {
          label: { en: 'Typical error', ar: 'الخطأ المعتاد' },
          value: { en: '×1.35', ar: '×١٫٣٥' },
          note: { en: 'Estimated against actual closing price', ar: 'التقدير مقابل سعر الإغلاق الفعلي' },
        },
        {
          label: { en: 'Wide band coverage', ar: 'تغطية النطاق الواسع' },
          value: { en: '91–93%', ar: '٩١–٩٣٪' },
          note: { en: 'Held per digit count, target 90%', ar: 'محققة لكل عدد أرقام، الهدف ٩٠٪' },
        },
        {
          label: { en: 'Rank correlation', ar: 'ارتباط الترتيب' },
          value: { en: '0.78', ar: '٠٫٧٨' },
          note: { en: 'Against the segment-median baseline at 0.63', ar: 'مقابل خط أساس وسيط القطاع ٠٫٦٣' },
        },
      ],
    },
    {
      id: 'limits',
      label: { en: 'Limits', ar: 'الحدود' },
      paragraphs: [
        {
          en: 'The model prices a plate by what comparable plates closed at. It is not an appraisal and not an offer, and the console says so beside every result.',
          ar: 'يسعّر النموذج اللوحة بما أُغلقت عليه لوحات مشابهة. هذا ليس تقييماً رسمياً ولا عرض شراء، ووحدة التحكم تكتب ذلك بجانب كل نتيجة.',
        },
        {
          en: 'Rare plates are the weak case: with few or no closes to compare against, the band widens and the estimate should be read as a neighbourhood, not a price.',
          ar: 'اللوحات النادرة هي الحالة الضعيفة: مع قلّة أسعار إغلاق للمقارنة يتّسع النطاق، ويُقرأ التقدير كمجال تقريبي لا كسعر.',
        },
        {
          en: 'Headlines and service descriptions are not treated as sales evidence. Only recorded closes feed the statistics, and market commentary is shown with its source links and retrieval dates.',
          ar: 'لا تُعامَل العناوين ووصوف الخدمة كأدلة بيع. الإحصاءات تُبنى على أسعار الإغلاق المسجّلة فقط، ويُعرض تعليق السوق بروابط مصادره وتواريخ استرجاعه.',
        },
      ],
    },
  ],
  video: {
    mp4: '/video/plate-predictor.mp4',
    webm: '/video/plate-predictor.webm',
    poster: '/video/plate-predictor-poster.webp',
    caption: {
      en: 'Recorded from the running console: a plate is typed, priced against its comparison group, then checked on plates the model never saw.',
      ar: 'مسجّل من الواجهة أثناء تشغيلها: تُدخل اللوحة، وتُسعّر مقابل مجموعتها، ثم تُفحص على لوحات لم يرها النموذج.',
    },
  },
  calculator: true,
  privacy: {
    en: 'The repository is private and stays private: it holds the collected auction history and the collection configuration. This page carries no raw listings — only the model and its measured behaviour.',
    ar: 'المستودع خاص ويبقى خاصاً: يحتوي تاريخ المزاد المجموع وإعدادات الجمع. هذه الصفحة لا تحمل أي عروض خام، بل النموذج وسلوكه المقيس فقط.',
  },
}

export const caseStudies: Record<string, CaseStudy> = {
  [plateStudy.projectId]: plateStudy,
}

export function getCaseStudy(projectId: string): CaseStudy | undefined {
  return caseStudies[projectId]
}
