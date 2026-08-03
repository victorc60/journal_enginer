import Link from "next/link";
import AccordionSection from "@/components/AccordionSection";

const actionGroups = [
  {
    title: "Смена и записи",
    description: "Фиксация смены, handover и полная история работы линии.",
    badge: "3 раздела",
    defaultOpen: true,
    actions: [
      {
        label: "Записать смену",
        hint: "Диктовка, ручной ввод, handover и вложения.",
        href: "/record",
      },
      {
        label: "История смен",
        hint: "Поиск, фильтры, экспорт и открытие полной записи.",
        href: "/shifts",
      },
      {
        label: "Доска handover",
        hint: "Открытые задачи и контроль статусов между сменами.",
        href: "/handover",
      },
    ],
  },
  {
    title: "Оборудование и обходы",
    description: "Быстрый доступ к узлам, обходам и подготовке перед забоем.",
    badge: "3 раздела",
    defaultOpen: false,
    actions: [
      {
        label: "Оборудование",
        hint: "Карточки узлов, поломки, простой и история работ.",
        href: "/equipment",
      },
      {
        label: "Утренний обход",
        hint: "Чек-лист точек обхода и редактирование самого списка.",
        href: "/morning-rounds",
      },
      {
        label: "Вечерняя подготовка",
        hint: "Проверка линии на следующий день забоя перед уходом.",
        href: "/evening-prep",
      },
    ],
  },
  {
    title: "Ресурсы и контроль",
    description: "Сводные показатели линии, вода, CO2 и ежедневный расход.",
    badge: "2 раздела",
    defaultOpen: false,
    actions: [
      {
        label: "Дашборд",
        hint: "Головы, температуры, CO2, поломки и общая динамика.",
        href: "/dashboard",
      },
      {
        label: "Вода и CO2",
        hint: "Счетчики, химия, остаток газа и история расхода.",
        href: "/water-co2",
      },
    ],
  },
  {
    title: "AI инструменты",
    description: "Помощь с анализом смен, ответами по журналу и выводами.",
    badge: "2 раздела",
    defaultOpen: false,
    actions: [
      {
        label: "AI ассистент",
        hint: "Итоги недели, ответы по журналу и быстрые сводки.",
        href: "/chat",
      },
      {
        label: "AI инсайты",
        hint: "Практические наблюдения из сохранённых смен.",
        href: "/insights",
      },
    ],
  },
] as const;

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="hero-card">
        <p className="eyebrow">Инженерный журнал линии</p>
        <h1>Журнал мясной линии</h1>
        <p className="intro">
          Практичное рабочее пространство для смен, обходов, ресурсов и оборудования без сплошной бесконечной
          прокрутки на телефоне.
        </p>

        <div className="action-group-list" aria-label="Primary actions">
          {actionGroups.map((group) => (
            <AccordionSection
              key={group.title}
              title={group.title}
              description={group.description}
              badge={group.badge}
              defaultOpen={group.defaultOpen}
            >
              <div className="action-list action-list-compact">
                {group.actions.map((action) => (
                  <Link key={action.label} href={action.href} className="action-button">
                    <span className="action-button-label">{action.label}</span>
                    <span className="action-button-hint">{action.hint}</span>
                  </Link>
                ))}
              </div>
            </AccordionSection>
          ))}
        </div>
      </section>
    </main>
  );
}
