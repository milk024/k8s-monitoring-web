import { useRef } from 'react'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useAppState } from '../../core/AppState.ts'
import { createSeriesColorAssigner } from '../utils/chartPalette.js'
import { EmptyState } from './EmptyState.jsx'

export function TrendChart({ data, seriesKeys, valueFormatter = (v) => v, height = 220 }) {
  const theme = useAppState((s) => s.theme)
  const colorAssignerRef = useRef(createSeriesColorAssigner())

  if (!data.length || !seriesKeys.length) {
    return <EmptyState title="아직 수집된 데이터가 없습니다" description="잠시 후 실시간 값이 쌓이면 그래프가 그려집니다." />
  }

  const gridColor = theme === 'light' ? '#e1e0d9' : '#2c2c2a'
  const axisColor = theme === 'light' ? '#898781' : '#8b99a7'
  const tooltipBg = theme === 'light' ? '#ffffff' : '#16222e'
  const tooltipBorder = theme === 'light' ? '#d5dbdb' : '#2a3f52'
  const tooltipText = theme === 'light' ? '#16191f' : '#e9ebed'

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={gridColor} strokeWidth={1} vertical={false} />
          <XAxis dataKey="time" tick={{ fill: axisColor, fontSize: 11 }} axisLine={{ stroke: gridColor }} tickLine={false} />
          <YAxis
            tick={{ fill: axisColor, fontSize: 11 }}
            axisLine={{ stroke: gridColor }}
            tickLine={false}
            width={44}
            tickFormatter={valueFormatter}
          />
          <Tooltip
            contentStyle={{ backgroundColor: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 6 }}
            labelStyle={{ color: tooltipText, fontWeight: 600, marginBottom: 4 }}
            itemStyle={{ color: tooltipText }}
            formatter={(value) => valueFormatter(value)}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: axisColor }} iconType="plainline" />
          {seriesKeys.map((key) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              name={key}
              stroke={colorAssignerRef.current(key, theme)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
