'use client';
import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { formatINR } from '@/lib/utils/refund-math';
import { NavPageId } from '@/lib/types/refund';

/**
 * ============================================================================
 * 8 INTERACTIVE FINANCIAL OPERATIONS CHARTS (LAZY-LOADED)
 * 1. Monthly Refund Amount Trend (click bar to filter month)
 * 2. Refund Status Distribution (Donut chart)
 * 3. Refund Reasons Breakdown (Horizontal Bar chart)
 * 4. Processing Time Performance (SLA Turnaround buckets)
 * 5. Weekly Refund Activity (Chronological weekly refund trajectory)
 * 6. Year-over-Year & Quarterly Comparison (2026 vs 2027 readiness)
 * 7. Pending vs. Completed Refunds (Stacked monthly bar comparison)
 * 8. Product-Wise Refund Analysis (Top refunded Gleva SKUs by INR value)
 * ============================================================================
 */

const GLEVA_CHART_PALETTE = [
  '#881337',
  '#EF4444',
  '#D4A373',
  '#0D9488',
  '#4F46E5',
  '#D97706',
  '#7C3AED',
  '#2563EB'
];

interface DashboardChartsProps {
  monthlySeries2026: any[];
  statusDistribution: { name: string; value: number; amount: number; color: string }[];
  reasonBreakdown: any[];
  processingTimeBuckets: { bucket: string; cases: number; share: number }[];
  weeklyActivitySeries: { week: string; cases: number; amount: number }[];
  yoyComparisonSeries: { quarter: string; amount2026: number; amount2027: number; cases2026: number }[];
  productOrderBreakdown: any[];
  filterMonth: string;
  onSelectMonth: (month: string) => void;
  onNavigate: (page: NavPageId) => void;
}

export default function DashboardCharts({
  monthlySeries2026,
  statusDistribution,
  reasonBreakdown,
  processingTimeBuckets,
  weeklyActivitySeries,
  yoyComparisonSeries,
  productOrderBreakdown,
  filterMonth,
  onSelectMonth,
  onNavigate
}: DashboardChartsProps) {
  const total2026Amount = monthlySeries2026.reduce((s, m) => s + m.amount, 0);
  const total2026Cases = monthlySeries2026.reduce((s, m) => s + m.cases, 0);

  return (
    <div className="space-y-5">
      {/* Row 1: Monthly Refund Amount Trend & Refund Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl gleva-glass-card">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#171717] dark:text-[#FFF8F0]">
                1. Monthly Refund Amount Trend (₹) — 2026
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Click any month bar to toggle live dashboard filtering •{' '}
                {filterMonth !== 'ALL' ? `Filtered: ${filterMonth}` : 'Showing All Months'}
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-[#FFE4E6] dark:bg-[#881337]/40 text-[#881337] dark:text-[#FFE4E6]">
              {formatINR(total2026Amount)} ({total2026Cases} Cases)
            </span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={monthlySeries2026}
                onClick={(data: any) => {
                  if (data?.activePayload?.[0]?.payload?.month) {
                    const clicked = data.activePayload[0].payload.month;
                    onSelectMonth(filterMonth === clicked ? 'ALL' : clicked);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(136,19,55,0.1)" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: any) => [formatINR(Number(v)), 'Refund Amount']}
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid rgba(136,19,55,0.2)',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="amount" name="Refund Amount (₹)" radius={[8, 8, 0, 0]}>
                  {monthlySeries2026.map(entry => (
                    <Cell
                      key={entry.month}
                      fill={
                        filterMonth === entry.month
                          ? '#EF4444'
                          : entry.amount > 20000
                          ? '#881337'
                          : '#D4A373'
                      }
                      cursor="pointer"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl gleva-glass-card flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#171717] dark:text-[#FFF8F0]">
              2. Refund Status Distribution
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
              Real-time breakdown across Processed, Pending, and Failed states
            </p>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  nameKey="name"
                >
                  {statusDistribution.map((entry, idx) => (
                    <Cell
                      key={entry.name}
                      fill={entry.color || GLEVA_CHART_PALETTE[idx % GLEVA_CHART_PALETTE.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: any, name: any, props: any) => [
                    `${v} cases (${formatINR(props?.payload?.amount || 0)})`,
                    name
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: Refund Reasons Breakdown & Product-Wise Refund Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-4 sm:p-5 rounded-2xl gleva-glass-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#171717] dark:text-[#FFF8F0]">
                3. Refund Reasons Breakdown
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Standardized 10-category return classification from customer notes
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reason-analytics')}
              className="text-xs font-semibold text-[#881337] dark:text-[#FFE4E6] hover:underline"
            >
              Reason Matrix →
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={reasonBreakdown.filter(r => r.cases > 0)}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(136,19,55,0.1)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="shortName" type="category" width={135} tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(v: any, _n: any, p: any) => [
                    `${v} cases • ${formatINR(p?.payload?.amount || 0)}`,
                    p?.payload?.category || 'Reason'
                  ]}
                />
                <Bar dataKey="cases" name="Cases" fill="#881337" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl gleva-glass-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#171717] dark:text-[#FFF8F0]">
                4. Product-Wise Refund Analysis (₹)
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Order-level SKU & multi-product bundle value attribution
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('product-analytics')}
              className="text-xs font-semibold text-[#881337] dark:text-[#FFE4E6] hover:underline"
            >
              SKU Deep-Dive →
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={productOrderBreakdown.slice(0, 6)}
                layout="vertical"
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(136,19,55,0.1)" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="shortProduct" type="category" width={145} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [formatINR(Number(v)), 'Refund Amount']} />
                <Bar dataKey="amount" name="Refund Value (₹)" fill="#D4A373" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Weekly Refund Activity & Processing Time Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-4 sm:p-5 rounded-2xl gleva-glass-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#171717] dark:text-[#FFF8F0]">
                5. Weekly Refund Activity Velocity
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Chronological weekly refund volume and INR payout velocity across 2026
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-stone-100 dark:bg-stone-800">
              {weeklyActivitySeries.length} Active Weeks
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyActivitySeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(136,19,55,0.1)" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [formatINR(Number(v)), 'Weekly Refund Amount']} />
                <Area
                  type="monotone"
                  dataKey="amount"
                  name="Weekly Refund Amount"
                  stroke="#881337"
                  fill="rgba(136, 19, 55, 0.22)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl gleva-glass-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#171717] dark:text-[#FFF8F0]">
                6. Processing Time & SLA Performance
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Turnaround speed distribution across verified & SLA-tracked cases
              </p>
            </div>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
              SLA Target: ≤ 3 Days
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={processingTimeBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(136,19,55,0.1)" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [`${v} cases`, 'Volume']} />
                <Bar dataKey="cases" name="Cases" fill="#0D9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: Pending vs Completed Refunds & Year-over-Year / Quarterly Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="p-4 sm:p-5 rounded-2xl gleva-glass-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#171717] dark:text-[#FFF8F0]">
                7. Pending vs. Completed Refunds by Month
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Stacked monthly comparison of closed payouts vs. open follow-up queue
              </p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySeries2026.filter(m => m.cases > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(136,19,55,0.1)" />
                <XAxis dataKey="shortMonth" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="processed" stackId="a" name="Processed / Completed" fill="#0D9488" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending" stackId="a" name="Pending / In Queue" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl gleva-glass-card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[#171717] dark:text-[#FFF8F0]">
                8. Year-over-Year & Quarterly Trajectory (2026 vs. 2027)
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Quarterly refund value comparison across 2026 historicals and 2027 ledger entries
              </p>
            </div>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={yoyComparisonSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(136,19,55,0.1)" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => [formatINR(Number(v)), 'Refund Value']} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line
                  type="monotone"
                  dataKey="amount2026"
                  name="FY 2026 Actual (₹)"
                  stroke="#881337"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="amount2027"
                  name="FY 2027 Ledger (₹)"
                  stroke="#D4A373"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
