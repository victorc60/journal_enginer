import Link from "next/link";
import { fetchJson } from "@/lib/api";
import { EquipmentListItem } from "@/lib/types";

const categoryMeta: Record<string, { description: string; order: number }> = {
  "Общая линия": {
    description: "Сводные карточки по линии целиком и общим межузловым работам.",
    order: 1,
  },
  "Оглушение": {
    description: "Подача животных, CO2-участок и связанные с ним узлы.",
    order: 2,
  },
  "Ошпаривание и очистка": {
    description: "Ошпарка, удаление щетины и связанные механизмы.",
    order: 3,
  },
  "Опаливание": {
    description: "Печь, горелки, розжиг и контроль пламени.",
    order: 4,
  },
  "Конвейеры и транспорт": {
    description: "Перемещение туш, цепей, поддонов и транспортных узлов по линии.",
    order: 5,
  },
  "Вспомогательные системы": {
    description: "Пар, вода, охлаждение, насосы и другая поддерживающая инфраструктура.",
    order: 6,
  },
};

function getCategoryMeta(category: string | null) {
  if (!category) {
    return {
      title: "Без категории",
      description: "Карточки, которым еще не назначена категория.",
      order: 99,
    };
  }

  const meta = categoryMeta[category];

  return {
    title: category,
    description: meta?.description ?? "Категория оборудования.",
    order: meta?.order ?? 99,
  };
}

function groupEquipment(items: EquipmentListItem[]) {
  const grouped = new Map<string, EquipmentListItem[]>();

  for (const item of items) {
    const category = getCategoryMeta(item.category).title;
    const current = grouped.get(category) ?? [];

    current.push(item);
    grouped.set(category, current);
  }

  return Array.from(grouped.entries())
    .map(([category, groupItems]) => [
      category,
      [...groupItems].sort((left, right) => left.name.localeCompare(right.name, "ru")),
    ] as const)
    .sort((left, right) => getCategoryMeta(left[0]).order - getCategoryMeta(right[0]).order);
}

export default async function EquipmentPage() {
  try {
    const equipment = await fetchJson<EquipmentListItem[]>("/api/equipment");
    const groupedEquipment = groupEquipment(equipment);
    const equipmentWithHistoryCount = equipment.filter((item) => item.work_history_count > 0).length;
    const openTasksTotal = equipment.reduce((total, item) => total + item.open_handover_items_count, 0);

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card detail-card">
          <Link href="/" className="back-link">
            Назад
          </Link>

          <p className="eyebrow">Карточки узлов</p>
          <h1>Оборудование</h1>
          <p className="intro">
            Раздел приведен к единому виду: карточки собраны по категориям, а в каждой видно конфигурацию, короткую
            заметку и историю работ.
          </p>

          <div className="stats-grid">
            <article className="stat-card">
              <p className="stat-label">Всего узлов</p>
              <p className="stat-value">{equipment.length}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Категорий</p>
              <p className="stat-value">{groupedEquipment.length}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">С историей</p>
              <p className="stat-value">{equipmentWithHistoryCount}</p>
            </article>
            <article className="stat-card">
              <p className="stat-label">Открытых задач</p>
              <p className="stat-value">{openTasksTotal}</p>
            </article>
          </div>

          <div className="section-divider" />

          {groupedEquipment.map(([category, items]) => (
            <section key={category} className="detail-section">
              <div className="section-heading-wrap">
                <h2 className="section-title">{category}</h2>
                <p className="section-text">{getCategoryMeta(category).description}</p>
              </div>

              <div className="insight-grid">
                {items.map((item) => (
                  <article key={item.id} className="insight-card">
                    <h3 className="section-title">{item.name}</h3>
                    <p className="section-text">
                      {item.notes || "Короткая карточка узла для истории работ, обслуживания и передачи смены."}
                    </p>

                    <div className="tag-row">
                      {item.configuration ? <span className="tag-pill">{item.configuration}</span> : null}
                      {item.service_points && item.service_points.length > 0 ? (
                        <span className="tag-pill">Элементов: {item.service_points.length}</span>
                      ) : null}
                      <span className="tag-pill">История: {item.work_history_count}</span>
                      <span className="tag-pill">Открыто: {item.open_handover_items_count}</span>
                    </div>

                    <Link href={`/equipment/${item.id}`} className="text-link">
                      Открыть карточку узла
                    </Link>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </section>
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось загрузить оборудование.";

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card detail-card">
          <Link href="/" className="back-link">
            Назад
          </Link>

          <p className="eyebrow">Карточки узлов</p>
          <h1>Оборудование</h1>
          <div className="status-banner status-error" role="alert">
            <p className="status-title">Карточки оборудования временно недоступны.</p>
            <p className="status-copy">{message}</p>
          </div>
        </section>
      </main>
    );
  }
}
