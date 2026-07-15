import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { LabResultResponse } from "../types/documents";

interface LabResultsVisualizationProps {
  labResults: LabResultResponse[];
}

interface LabTrend {
  key: string;
  name: string;
  unit: string;
  results: Array<{
    date: string;
    timestamp: number;
    value: number;
    flag?: string | null;
  }>;
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));

const buildLabTrends = (labResults: LabResultResponse[]): LabTrend[] => {
  const grouped = new Map<string, LabTrend>();

  for (const result of labResults) {
    if (
      result.value_quantity === null ||
      result.value_quantity === undefined ||
      !result.observed_at
    ) {
      continue;
    }

    const unit = result.unit?.trim() || "";
    const identifier = result.code?.trim() || result.name.trim();
    const key = `${identifier}::${unit}`;

    const existing = grouped.get(key) ?? {
      key,
      name: result.name,
      unit,
      results: [],
    };

    existing.results.push({
      date: formatDate(result.observed_at),
      timestamp: new Date(result.observed_at).getTime(),
      value: result.value_quantity,
      flag: result.flag,
    });

    grouped.set(key, existing);
  }

  return Array.from(grouped.values())
    .map((trend) => ({
      ...trend,
      results: trend.results.sort((a, b) => a.timestamp - b.timestamp),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
};

export const LabResultsVisualization = ({
  labResults,
}: LabResultsVisualizationProps) => {
  const trends = useMemo(() => buildLabTrends(labResults), [labResults]);

  if (trends.length === 0) {
    return (
      <section className="lab-results-empty" aria-live="polite">
        <h2>Lab results</h2>
        <p>No numeric lab results are available for this record.</p>
      </section>
    );
  }

  return (
    <section className="lab-results-visualization">
      <div className="lab-results-heading">
        <div>
          <h2>Lab results</h2>
          <p>
            Review your latest results and see how repeated measurements change
            over time.
          </p>
        </div>
        <span>{trends.length} tracked tests</span>
      </div>

      <div className="lab-results-grid">
        {trends.map((trend) => {
          const latest = trend.results.at(-1);
          const previous =
            trend.results.length > 1
              ? trend.results[trend.results.length - 2]
              : undefined;
          const change =
            latest && previous ? latest.value - previous.value : undefined;

          return (
            <article className="lab-trend-card" key={trend.key}>
              <header className="lab-trend-card-header">
                <div>
                  <h3>{trend.name}</h3>
                  <p>
                    {trend.results.length} result
                    {trend.results.length === 1 ? "" : "s"}
                  </p>
                </div>

                {latest && (
                  <div className="lab-latest-value">
                    <strong>{latest.value}</strong>
                    {trend.unit && <span>{trend.unit}</span>}
                  </div>
                )}
              </header>

              {latest && (
                <div className="lab-result-summary">
                  <span>Latest: {latest.date}</span>
                  {change !== undefined && (
                    <span>
                      Change: {change > 0 ? "+" : ""}
                      {Number(change.toFixed(2))} {trend.unit}
                    </span>
                  )}
                </div>
              )}

              {trend.results.length >= 2 ? (
                <div
                  className="lab-chart"
                  role="img"
                  aria-label={`${trend.name} trend across ${trend.results.length} results`}
                >
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart
                      data={trend.results}
                      margin={{ top: 16, right: 16, bottom: 8, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" minTickGap={24} />
                      <YAxis width={52} />
                      <Tooltip
                        formatter={(value) => [
                          `${value} ${trend.unit}`.trim(),
                          trend.name,
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="currentColor"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="lab-single-result-state">
                  <p>Another result is needed to show a trend.</p>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <p className="lab-results-disclaimer">
        These charts summarize values in your medical record. They do not
        provide a diagnosis or treatment recommendation.
      </p>
    </section>
  );
};
