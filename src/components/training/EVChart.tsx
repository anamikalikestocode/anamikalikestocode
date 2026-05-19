import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';
import { HandSnapshot } from '../../types/training';

interface EVChartProps {
  history: HandSnapshot[];
}

export const EVChart: React.FC<EVChartProps> = ({ history }) => {
  const data = [...history].reverse().map((h, i) => ({
    hand: i + 1,
    ev: parseFloat(h.heroNet.toFixed(2)),
    cumulative: 0, // filled below
  }));

  let cum = 0;
  for (const d of data) {
    cum += d.ev;
    d.cumulative = parseFloat(cum.toFixed(2));
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-xs text-gray-600">
        Play hands to see EV chart
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={120}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
        <XAxis dataKey="hand" tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#6b7280' }} tickLine={false} axisLine={false} />
        <ReferenceLine y={0} stroke="#374151" strokeDasharray="2 2" />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid #374151', fontSize: 11 }}
          formatter={(v: number) => [`${v.toFixed(1)}bb`, 'Cumulative EV']}
          labelFormatter={(l) => `Hand ${l}`}
        />
        <Line
          type="monotone"
          dataKey="cumulative"
          stroke={data[data.length - 1]?.cumulative >= 0 ? '#10b981' : '#ef4444'}
          strokeWidth={1.5}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};
