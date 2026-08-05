import Link from "next/link";
import EquipmentDetailClient from "@/components/EquipmentDetailClient";
import { fetchJson } from "@/lib/api";
import { EquipmentDetailResponse } from "@/lib/types";

type EquipmentDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EquipmentDetailPage({ params }: EquipmentDetailPageProps) {
  const { id } = await params;

  try {
    const data = await fetchJson<EquipmentDetailResponse>(`/api/equipment/${id}`);

    return <EquipmentDetailClient initialData={data} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось загрузить карточку узла.";

    return (
      <main className="page-shell page-shell-top">
        <section className="hero-card">
          <Link href="/equipment" className="back-link">
            Назад к оборудованию
          </Link>

          <p className="eyebrow">Карточка узла</p>
          <h1>Карточка недоступна</h1>
          <div className="status-banner status-error" role="alert">
            <p className="status-title">Данные по узлу временно недоступны.</p>
            <p className="status-copy">{message}</p>
          </div>
        </section>
      </main>
    );
  }
}
