import { useState, useMemo } from 'react';
import Layout from '../../Components/Layout';

const WIND_DIRECTIONS = [
    { value: 'U leđa', label: 'U leđa (tailwind)', factor: -0.02 },
    { value: 'U prsa', label: 'U prsa (headwind)', factor: 0.03 },
    { value: 'Bočni',  label: 'Bočni (side)',     factor: 0.01 },
];

// Parse "mm:ss.zzz" / "m:ss.zzz" / "ss.zzz" into seconds. Returns null on invalid.
function parseTimeToSeconds(input) {
    if (input === null || input === undefined) return null;
    const str = String(input).trim();
    if (str === '') return null;

    const parts = str.split(':');
    if (parts.length > 3) return null;

    let h = 0, m = 0, s = 0;
    if (parts.length === 3) {
        h = Number(parts[0]); m = Number(parts[1]); s = Number(parts[2]);
    } else if (parts.length === 2) {
        m = Number(parts[0]); s = Number(parts[1]);
    } else {
        s = Number(parts[0]);
    }
    if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null;
    if (h < 0 || m < 0 || s < 0) return null;
    return h * 3600 + m * 60 + s;
}

// Format seconds to "MM:SS.zzz" (or "H:MM:SS.zzz" if >= 1h).
function formatSecondsToTime(totalSeconds) {
    if (totalSeconds === null || !Number.isFinite(totalSeconds)) return '';
    const sign = totalSeconds < 0 ? '-' : '';
    const t = Math.abs(totalSeconds);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t - h * 3600) / 60);
    const s = t - h * 3600 - m * 60;
    const ss = s.toFixed(3).padStart(6, '0');
    if (h > 0) {
        return `${sign}${h}:${String(m).padStart(2, '0')}:${ss}`;
    }
    return `${sign}${String(m).padStart(2, '0')}:${ss}`;
}

export default function ToolsIndex() {
    const [distance, setDistance] = useState('200');
    const [raceTime, setRaceTime] = useState('00:45.000');
    const [windSpeed, setWindSpeed] = useState('10');
    const [windDir, setWindDir] = useState('U leđa');

    const result = useMemo(() => {
        const dist = distance === '' ? null : Number(distance);
        const wind = windSpeed === '' ? null : Number(windSpeed);
        const seconds = parseTimeToSeconds(raceTime);
        const dirCfg = WIND_DIRECTIONS.find(d => d.value === windDir);

        const distOk = dist !== null && Number.isFinite(dist) && dist > 0;
        const timeOk = seconds !== null && Number.isFinite(seconds) && seconds > 0;
        const windOk = wind !== null && Number.isFinite(wind) && wind >= 0;

        const avgKmh = (distOk && timeOk) ? (dist / seconds) * 3.6 : null;

        let correctedKmh = null;
        let correctedTimeSec = null;
        if (avgKmh !== null && windOk && dirCfg) {
            correctedKmh = Math.max(0.1, avgKmh + wind * dirCfg.factor);
            if (distOk) {
                correctedTimeSec = dist / (correctedKmh / 3.6);
            }
        }

        return {
            avgKmh,
            correctedKmh,
            correctedTimeSec,
        };
    }, [distance, raceTime, windSpeed, windDir]);

    const fmtKmh = (v) => v === null ? '—' : v.toFixed(3) + ' km/h';
    const fmtTime = (v) => v === null ? '—' : formatSecondsToTime(v);

    return (
        <Layout>
            <div className="max-w-3xl mx-auto py-6">
                <div className="mb-6">
                    <h1 className="text-2xl font-bold text-gray-900">Tools</h1>
                    <p className="text-sm text-gray-600 mt-1">Internal admin utilities.</p>
                </div>

                <div className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 bg-orange-100 rounded-full">
                            <svg className="w-5 h-5 text-orange-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900">Kalkulator vremena</h2>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                        Dragon-boat: izračunaj prosečnu brzinu i korigovano vreme/brzinu na osnovu vetra.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Distanca (m)
                            </label>
                            <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min="0"
                                value={distance}
                                onChange={(e) => setDistance(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="200"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Vreme trke (mm:ss.zzz)
                            </label>
                            <input
                                type="text"
                                value={raceTime}
                                onChange={(e) => setRaceTime(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="00:45.000"
                            />
                            <p className="text-xs text-gray-500 mt-1">npr. 00:45.000 ili 1:23.456</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Brzina vetra (km/h)
                            </label>
                            <input
                                type="number"
                                inputMode="decimal"
                                step="any"
                                min="0"
                                value={windSpeed}
                                onChange={(e) => setWindSpeed(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="10"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Smer vetra
                            </label>
                            <select
                                value={windDir}
                                onChange={(e) => setWindDir(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                {WIND_DIRECTIONS.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-xs text-gray-600 uppercase tracking-wide">GPS / prosečna brzina</p>
                            <p className="text-xl font-semibold text-blue-700 mt-1">{fmtKmh(result.avgKmh)}</p>
                        </div>
                        <div className="p-4 bg-green-50 rounded-lg">
                            <p className="text-xs text-gray-600 uppercase tracking-wide">Korigovana brzina</p>
                            <p className="text-xl font-semibold text-green-700 mt-1">{fmtKmh(result.correctedKmh)}</p>
                        </div>
                        <div className="p-4 bg-purple-50 rounded-lg">
                            <p className="text-xs text-gray-600 uppercase tracking-wide">Korigovano vreme</p>
                            <p className="text-xl font-semibold text-purple-700 mt-1">{fmtTime(result.correctedTimeSec)}</p>
                        </div>
                    </div>

                    <div className="mt-4 text-xs text-gray-500">
                        Korekcija: U leđa −0.02·v<sub>w</sub>, U prsa +0.03·v<sub>w</sub>, Bočni +0.01·v<sub>w</sub> (km/h). Min. 0.1 km/h.
                    </div>
                </div>
            </div>
        </Layout>
    );
}
