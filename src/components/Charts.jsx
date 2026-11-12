import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { PRIORITY_COLOR } from '../utils/constants';

// Series colors validated for color-vision deficiency separation (blue / amber).
const SERIES = { reported: '#2563EB', resolved: '#D97706' };
const AXIS = { fontSize: 12, fill: '#64748B' };
const GRID = '#E2E8F0';

function ChartTooltip({ active, payload, label, unit = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-semibold text-slate-800">{label}</p>}
      {payload.map((p) => (
        <p key={p.dataKey || p.name} className="flex items-center gap-2 text-slate-600">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          {p.name}: <b className="text-slate-800">{p.value}{unit}</b>
        </p>
      ))}
    </div>
  );
}

export function ChartCard({ title, subtitle, children, className = '', action }) {
  return (
    <div className={`card p-5 ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-navy">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function TrendChart({ data, height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="month" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#94A3B8', strokeDasharray: '4 4' }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Line type="monotone" dataKey="reported" name="Reported" stroke={SERIES.reported} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
        <Line type="monotone" dataKey="resolved" name="Resolved" stroke={SERIES.resolved} strokeWidth={2} strokeDasharray="6 3" dot={{ r: 4 }} activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({ data, height = 280 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }} barCategoryGap={6}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" width={120} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
        <Bar dataKey="count" name="Incidents" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((d) => <Cell key={d.key || d.name} fill={d.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Priority levels: labeled bars in status colors (label always present, never color alone). */
export function PriorityChart({ data, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: '#F1F5F9' }} />
        <Bar dataKey="value" name="Incidents" radius={[4, 4, 0, 0]} maxBarSize={48} label={{ position: 'top', fontSize: 12, fill: '#334155' }}>
          {data.map((d) => <Cell key={d.name} fill={PRIORITY_COLOR[d.name]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ResolutionDonut({ data, height = 240 }) {
  const colors = ['#16A34A', '#D97706'];
  const total = data.reduce((a, b) => a + b.value, 0);
  const pct = total ? Math.round((data[0].value / total) * 100) : 0;
  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="85%" paddingAngle={2} stroke="#fff" strokeWidth={2}>
            {data.map((d, i) => <Cell key={d.name} fill={colors[i]} />)}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend iconType="circle" verticalAlign="bottom" wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-x-0 top-[38%] text-center">
        <p className="text-2xl font-bold text-navy">{pct}%</p>
        <p className="text-xs text-slate-500">resolved</p>
      </div>
    </div>
  );
}

export function SimpleBarChart({ data, dataKey = 'value', nameKey = 'name', name = 'Incidents', unit = '', color = '#2563EB', height = 240, colorMap }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={nameKey} tick={AXIS} axisLine={false} tickLine={false} interval="preserveStartEnd" />
        <YAxis allowDecimals={false} tick={AXIS} axisLine={false} tickLine={false} />
        <Tooltip content={<ChartTooltip unit={unit} />} cursor={{ fill: '#F1F5F9' }} />
        <Bar dataKey={dataKey} name={name} fill={color} radius={[4, 4, 0, 0]} maxBarSize={40}>
          {colorMap && data.map((d) => <Cell key={d[nameKey]} fill={colorMap[d[nameKey]] || color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
