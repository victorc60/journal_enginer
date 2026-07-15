"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Co2Point = {
  shift_date: string;
  co2_per_head_g: number | null;
};

type TemperaturePoint = {
  shift_date: string;
  meat_temp_c: number | null;
};

type FailurePoint = {
  equipment_name: string;
  failures_count: number;
};

type DashboardChartsProps = {
  co2PerHeadByDate: Co2Point[];
  meatTemperatureByDate: TemperaturePoint[];
  failuresByEquipment: FailurePoint[];
};

function formatDateLabel(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function renderEmptyState(message: string) {
  return <div className="empty-chart">{message}</div>;
}

export default function DashboardCharts({
  co2PerHeadByDate,
  meatTemperatureByDate,
  failuresByEquipment,
}: DashboardChartsProps) {
  return (
    <div className="dashboard-chart-stack">
      <section className="chart-card">
        <div className="chart-heading">
          <h2 className="section-title">CO2 Grams Per Head</h2>
          <p className="section-text">Average CO2 grams per head by shift date.</p>
        </div>

        <div className="chart-frame">
          {co2PerHeadByDate.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={co2PerHeadByDate} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="shift_date"
                  tickFormatter={formatDateLabel}
                  stroke="rgba(202, 191, 174, 0.8)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(202, 191, 174, 0.8)"
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  labelFormatter={(value) => formatDateLabel(String(value))}
                  formatter={(value) => [`${Number(value).toFixed(2)} g`, "CO2 / head"]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(18, 26, 32, 0.96)",
                    color: "#f5f2eb",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="co2_per_head_g"
                  stroke="#d46a2e"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#d46a2e" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            renderEmptyState("No CO2 per-head data yet.")
          )}
        </div>
      </section>

      <section className="chart-card">
        <div className="chart-heading">
          <h2 className="section-title">Meat Temperature</h2>
          <p className="section-text">Average meat temperature by shift date.</p>
        </div>

        <div className="chart-frame">
          {meatTemperatureByDate.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={meatTemperatureByDate} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="shift_date"
                  tickFormatter={formatDateLabel}
                  stroke="rgba(202, 191, 174, 0.8)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="rgba(202, 191, 174, 0.8)"
                  tickLine={false}
                  axisLine={false}
                  width={48}
                />
                <Tooltip
                  labelFormatter={(value) => formatDateLabel(String(value))}
                  formatter={(value) => [`${Number(value).toFixed(2)} °C`, "Meat temperature"]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(18, 26, 32, 0.96)",
                    color: "#f5f2eb",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="meat_temp_c"
                  stroke="#7dc0b0"
                  strokeWidth={3}
                  dot={{ r: 3, fill: "#7dc0b0" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            renderEmptyState("No meat temperature data yet.")
          )}
        </div>
      </section>

      <section className="chart-card">
        <div className="chart-heading">
          <h2 className="section-title">Failures By Equipment</h2>
          <p className="section-text">Recorded failures grouped by equipment name.</p>
        </div>

        <div className="chart-frame chart-frame-tall">
          {failuresByEquipment.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={failuresByEquipment} margin={{ top: 8, right: 8, left: -16, bottom: 48 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="equipment_name"
                  stroke="rgba(202, 191, 174, 0.8)"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={72}
                />
                <YAxis
                  allowDecimals={false}
                  stroke="rgba(202, 191, 174, 0.8)"
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  formatter={(value) => [Number(value), "Failures"]}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(18, 26, 32, 0.96)",
                    color: "#f5f2eb",
                  }}
                />
                <Bar dataKey="failures_count" fill="#e3b35d" radius={[10, 10, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            renderEmptyState("No failure data yet.")
          )}
        </div>
      </section>
    </div>
  );
}
