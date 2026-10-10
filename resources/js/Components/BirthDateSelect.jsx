import { useState } from 'react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const pad = (n) => String(n).padStart(2, '0');
const daysIn = (year, month) => new Date(year || 2000, month, 0).getDate();

// Day / month / year dropdowns for a birth date. Android's native date picker
// only pages month by month, which is impractical for birth years.
// value/onChange use YYYY-MM-DD, or '' until all three parts are chosen.
export default function BirthDateSelect({ id, value, onChange, className }) {
    const [initY, initM, initD] = value ? value.split('-').map(Number) : [];
    const [parts, setParts] = useState({ day: initD || '', month: initM || '', year: initY || '' });

    const thisYear = new Date().getFullYear();
    const years = Array.from({ length: 100 }, (_, i) => thisYear - i);
    const maxDay = parts.month ? daysIn(parts.year, parts.month) : 31;

    const update = (field, val) => {
        const next = { ...parts, [field]: val ? Number(val) : '' };
        if (next.day && next.month && next.day > daysIn(next.year, next.month)) {
            next.day = '';
        }
        setParts(next);
        onChange(next.day && next.month && next.year
            ? `${next.year}-${pad(next.month)}-${pad(next.day)}`
            : '');
    };

    return (
        <div className="grid grid-cols-3 gap-2">
            <select id={id} aria-label="Day" value={parts.day} onChange={(e) => update('day', e.target.value)} className={className}>
                <option value="">Day</option>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>{d}</option>
                ))}
            </select>
            <select aria-label="Month" value={parts.month} onChange={(e) => update('month', e.target.value)} className={className}>
                <option value="">Month</option>
                {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                ))}
            </select>
            <select aria-label="Year" value={parts.year} onChange={(e) => update('year', e.target.value)} className={className}>
                <option value="">Year</option>
                {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                ))}
            </select>
        </div>
    );
}
