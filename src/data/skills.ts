import type { SkillCategory } from './types'

const t = (s: string) => ({ en: s, ar: s })

export const skillCategories: SkillCategory[] = [
  {
    name: { en: 'Core Skills', ar: 'المهارات الأساسية' },
    discipline: 'core',
    items: [
      t('Problem Solving'),
      t('Team Problem Solving'),
      t('Teamwork'),
      t('Self Learning'),
      t('Collaboration'),
      t('Project Management'),
    ],
  },
  {
    name: { en: 'Full-Stack Development', ar: 'تطوير الشامل' },
    discipline: 'swe',
    items: [
      t('Full-Stack Development'),
      t('Web Development'),
      t('Web Design'),
      t('Software Development'),
      t('Architecture'),
      t('Local-first Architecture'),
      t('Release Engineering'),
    ],
  },
  {
    name: { en: 'AI & Machine Learning', ar: 'الذكاء الاصطناعي وتعلّم الآلة' },
    discipline: 'ai',
    items: [
      t('Artificial Intelligence (AI)'),
      t('Generative AI'),
      t('Large Language Models (LLM)'),
      t('Retrieval-Augmented Generation (RAG)'),
      t('Vector Databases'),
      t('Game AI'),
      t('Vibe Coding'),
    ],
  },
  {
    name: { en: 'Web & Desktop Technologies', ar: 'تقنيات الويب وسطح المكتب' },
    discipline: 'swe',
    items: [
      t('TypeScript'),
      t('React'),
      t('Next.js'),
      t('Electron'),
      t('JavaScript'),
      t('Python'),
      t('FastAPI'),
      t('Flask'),
      t('C#'),
      t('Java'),
      t('PHP'),
      t('HTML'),
      t('CSS'),
      t('MySQL'),
      t('SQLite'),
      t('XAMPP'),
      t('phpMyAdmin'),
    ],
  },
  {
    name: { en: 'Game Development', ar: 'تطوير الألعاب' },
    discipline: 'game',
    items: [
      t('Game Programming'),
      t('Game Design'),
      t('Game Development'),
      t('Game Mechanics'),
      t('Unity'),
    ],
  },
  {
    name: { en: '3D & Visual Creation', ar: 'الثلاثي الأبعاد والإبداع البصري' },
    discipline: 'game',
    items: [t('Blender'), t('3D Modeling'), t('3D Rendering')],
  },
  {
    name: { en: 'Technical & Conceptual', ar: 'مفاهيم تقنية' },
    discipline: 'swe',
    items: [t('Human Computer Interaction'), t('Programming Languages'), t('MVC')],
  },
]
