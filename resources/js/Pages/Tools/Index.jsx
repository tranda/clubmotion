import { useState, useMemo, useEffect } from 'react';
import { router } from '@inertiajs/react';
import Layout from '../../Components/Layout';

const PRESET_DISTANCES = [200, 500, 1000, 2000];

const DEFAULT_COEF_SET = { tail: 0.02, head: 0.03, side: 0.01 };

const DEFAULT_COEFS_BY_DISTANCE = PRESET_DISTANCES.reduce((acc, d) => {
    acc[String(d)] = { ...DEFAULT_COEF_SET };
    return acc;
}, {});

const DISTANCE_OPTIONS = [
    ...PRESET_DISTANCES.map(d => ({ value: String(d), label: `${d} m` })),
    { value: 'custom', label: 'Custom' },
];

const WIND_DIR_OPTIONS = [
    { value: 'tail', label: 'U leđa (tailwind)' },
    { value: 'head', label: 'U prsa (headwind)' },
    { value: 'side', label: 'Bočni (side)' },
];

function signedFactor(dirKey, coefSet) {
    if (dirKey === 'tail') return -coefSet.tail;
    if (dirKey === 'head') return coefSet.head;
    if (dirKey === 'side') return coefSet.side;
    return 0;
}

function nearestPresetDistance(d) {
    let best = PRESET_DISTANCES[0];
    let bestDiff = Math.abs(d - best);
    for (const opt of PRESET_DISTANCES.slice(1)) {
        const diff = Math.abs(d - opt);
        if (diff < bestDiff) { best = opt; bestDiff = diff; }
    }
    return best;
}

// Parse decimal accepting either "." or "," as separator (for mobile keyboards in locales without dot).
function parseDecimal(value) {
    if (value === null || value === undefined) return NaN;
    const str = String(value).trim().replace(',', '.');
    if (str === '') return NaN;
    return Number(str);
}

// Parse "mm:ss.zzz" / "m:ss,zzz" / "ss.zzz" into seconds. Returns null on invalid.
function parseTimeToSeconds(input) {
    if (input === null || input === undefined) return null;
    const str = String(input).trim();
    if (str === '') return null;

    const parts = str.split(':');
    if (parts.length > 3) return null;

    let h = 0, m = 0, s = 0;
    if (parts.length === 3) {
        h = parseDecimal(parts[0]); m = parseDecimal(parts[1]); s = parseDecimal(parts[2]);
    } else if (parts.length === 2) {
        m = parseDecimal(parts[0]); s = parseDecimal(parts[1]);
    } else {
        s = parseDecimal(parts[0]);
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

function coefSetEqual(a, b) {
    return Number(a.tail) === Number(b.tail)
        && Number(a.head) === Number(b.head)
        && Number(a.side) === Number(b.side);
}

function allCoefsEqual(a, b) {
    for (const d of PRESET_DISTANCES) {
        const k = String(d);
        if (!coefSetEqual(a[k], b[k])) return false;
    }
    return true;
}

function normalizeCoefs(input) {
    const result = {};
    for (const d of PRESET_DISTANCES) {
        const k = String(d);
        const src = (input && input[k]) ? input[k] : DEFAULT_COEF_SET;
        result[k] = {
            tail: Number.isFinite(Number(src.tail)) ? Number(src.tail) : DEFAULT_COEF_SET.tail,
            head: Number.isFinite(Number(src.head)) ? Number(src.head) : DEFAULT_COEF_SET.head,
            side: Number.isFinite(Number(src.side)) ? Number(src.side) : DEFAULT_COEF_SET.side,
        };
    }
    return result;
}

export default function ToolsIndex({ coefs: serverCoefs }) {
    // Mode: 'time' (distance + time -> speed) | 'speed' (distance + GPS speed -> time)
    const [mode, setMode] = useState('time');

    const [distanceKey, setDistanceKey] = useState('200');
    const [customDistance, setCustomDistance] = useState('');
    const [raceTime, setRaceTime] = useState('00:45.000');
    const [gpsSpeed, setGpsSpeed] = useState('16');
    const [windSpeed, setWindSpeed] = useState('10');
    const [windDir, setWindDir] = useState('tail');

    const initialCoefs = normalizeCoefs(serverCoefs);
    const [savedCoefs, setSavedCoefs] = useState(initialCoefs);
    const [editCoefs,  setEditCoefs]  = useState(initialCoefs);
    const [coefsOpen,  setCoefsOpen]  = useState(false);
    const [saving,     setSaving]     = useState(false);
    const [savedFlash, setSavedFlash] = useState(false);

    // Pick up updated server coefs after a save round-trip.
    useEffect(() => {
        if (!serverCoefs) return;
        const norm = normalizeCoefs(serverCoefs);
        setSavedCoefs(norm);
        setEditCoefs(norm);
    }, [serverCoefs]);

    const dirty = !allCoefsEqual(savedCoefs, editCoefs);

    // Resolve effective distance (number) and which preset's coefs to use.
    const distInfo = useMemo(() => {
        if (distanceKey === 'custom') {
            const d = customDistance === '' ? NaN : Number(customDistance);
            if (!Number.isFinite(d) || d <= 0) {
                return { dist: null, presetKey: null, isFallback: false };
            }
            const preset = nearestPresetDistance(d);
            return { dist: d, presetKey: String(preset), isFallback: true };
        }
        return { dist: Number(distanceKey), presetKey: distanceKey, isFallback: false };
    }, [distanceKey, customDistance]);

    const result = useMemo(() => {
        const wind = windSpeed === '' ? null : Number(windSpeed);
        const distOk = distInfo.dist !== null && Number.isFinite(distInfo.dist) && distInfo.dist > 0;
        const windOk = wind !== null && Number.isFinite(wind) && wind >= 0;
        const coefSet = distInfo.presetKey ? savedCoefs[distInfo.presetKey] : DEFAULT_COEF_SET;
        const factor = signedFactor(windDir, coefSet);

        let baseKmh = null;
        let baseTimeSec = null;

        if (mode === 'time') {
            const seconds = parseTimeToSeconds(raceTime);
            const timeOk = seconds !== null && Number.isFinite(seconds) && seconds > 0;
            if (distOk && timeOk) {
                baseKmh = (distInfo.dist / seconds) * 3.6;
                baseTimeSec = seconds;
            }
        } else {
            const v = gpsSpeed === '' ? null : Number(gpsSpeed);
            const speedOk = v !== null && Number.isFinite(v) && v > 0;
            if (speedOk) {
                baseKmh = v;
                if (distOk) baseTimeSec = distInfo.dist / (v / 3.6);
            }
        }

        let correctedKmh = null;
        let correctedTimeSec = null;
        if (baseKmh !== null && windOk) {
            correctedKmh = Math.max(0.1, baseKmh + wind * factor);
            if (distOk) {
                correctedTimeSec = distInfo.dist / (correctedKmh / 3.6);
            }
        }

        return { baseKmh, baseTimeSec, correctedKmh, correctedTimeSec };
    }, [mode, distInfo, raceTime, gpsSpeed, windSpeed, windDir, savedCoefs]);

    const fmtKmh = (v) => v === null ? '—' : v.toFixed(3) + ' km/h';
    const fmtTime = (v) => v === null ? '—' : formatSecondsToTime(v);

    const updateEditCoef = (distKey, fieldKey, raw) => {
        const num = raw === '' ? '' : Number(raw);
        setEditCoefs(prev => ({
            ...prev,
            [distKey]: {
                ...prev[distKey],
                [fieldKey]: raw === '' ? 0 : (Number.isFinite(num) ? num : prev[distKey][fieldKey]),
            },
        }));
    };

    const resetEditCoefs = () => setEditCoefs(normalizeCoefs(null));

    const saveCoefs = () => {
        setSaving(true);
        router.put('/tools/coefs', { coefs: editCoefs }, {
            preserveScroll: true,
            preserveState: true,
            onSuccess: () => {
                setSavedFlash(true);
                setTimeout(() => setSavedFlash(false), 2000);
            },
            onFinish: () => setSaving(false),
        });
    };

    const ModeButton = ({ value, children }) => (
        <button
            type="button"
            onClick={() => setMode(value)}
            className={
                'px-3 py-1.5 text-sm font-medium rounded-md transition-colors ' +
                (mode === value
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
            }
        >
            {children}
        </button>
    );

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
                        Dragon-boat: izračunaj brzinu/vreme i korekciju zbog vetra.
                    </p>

                    <div className="flex items-center gap-2 mb-5">
                        <span className="text-sm text-gray-600 mr-1">Režim:</span>
                        <ModeButton value="time">Iz vremena → brzina</ModeButton>
                        <ModeButton value="speed">Iz brzine → vreme</ModeButton>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Distanca (m)
                            </label>
                            <select
                                value={distanceKey}
                                onChange={(e) => setDistanceKey(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                {DISTANCE_OPTIONS.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                            {distanceKey === 'custom' && (
                                <>
                                    <input
                                        type="number"
                                        inputMode="decimal"
                                        step="any"
                                        min="0"
                                        value={customDistance}
                                        onChange={(e) => setCustomDistance(e.target.value)}
                                        className="w-full px-3 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="npr. 750"
                                        autoFocus
                                    />
                                    {distInfo.isFallback && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            Koristi koeficijente za <strong>{distInfo.presetKey} m</strong> (najbliža predefinisana distanca).
                                        </p>
                                    )}
                                </>
                            )}
                        </div>

                        {mode === 'time' ? (
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
                        ) : (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    GPS brzina (km/h)
                                </label>
                                <input
                                    type="number"
                                    inputMode="decimal"
                                    step="any"
                                    min="0"
                                    value={gpsSpeed}
                                    onChange={(e) => setGpsSpeed(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="16"
                                />
                                <p className="text-xs text-gray-500 mt-1">izmerena brzina (npr. sa GPS-a)</p>
                            </div>
                        )}

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
                                {WIND_DIR_OPTIONS.map(d => (
                                    <option key={d.value} value={d.value}>{d.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-blue-50 rounded-lg">
                            <p className="text-xs text-gray-600 uppercase tracking-wide">
                                {mode === 'time' ? 'GPS / prosečna brzina' : 'Vreme (iz GPS brzine)'}
                            </p>
                            <p className="text-xl font-semibold text-blue-700 mt-1">
                                {mode === 'time' ? fmtKmh(result.baseKmh) : fmtTime(result.baseTimeSec)}
                            </p>
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

                    {/* Coefficient settings */}
                    <div className="mt-6 border-t border-gray-200 pt-4">
                        <button
                            type="button"
                            onClick={() => setCoefsOpen(o => !o)}
                            className="flex items-center justify-between w-full text-left text-sm font-medium text-gray-700 hover:text-gray-900"
                        >
                            <span>
                                Podešavanja koeficijenata vetra (po distanci)
                                {dirty && <span className="ml-2 text-xs text-orange-600">• nesačuvane izmene</span>}
                            </span>
                            <svg
                                className={'w-4 h-4 transform transition-transform ' + (coefsOpen ? 'rotate-180' : '')}
                                fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                                viewBox="0 0 24 24" stroke="currentColor"
                            >
                                <path d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>

                        {coefsOpen && (
                            <div className="mt-3">
                                <p className="text-xs text-gray-500 mb-3">
                                    Korekcija (km/h) = brzina + vetar · faktor. Tailwind se oduzima, head/side dodaju.
                                    Custom distanca koristi koeficijente najbliže predefinisane.
                                    Vrednosti se čuvaju u bazi i važe za sve admine.
                                </p>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="text-xs text-gray-600 uppercase">
                                                <th className="text-left py-2 pr-3">Distanca</th>
                                                <th className="text-left py-2 px-2">U leđa<br/><span className="font-normal normal-case text-gray-400">(oduzima)</span></th>
                                                <th className="text-left py-2 px-2">U prsa<br/><span className="font-normal normal-case text-gray-400">(dodaje)</span></th>
                                                <th className="text-left py-2 px-2">Bočni<br/><span className="font-normal normal-case text-gray-400">(dodaje)</span></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {PRESET_DISTANCES.map(d => {
                                                const k = String(d);
                                                return (
                                                    <tr key={k} className="border-t border-gray-100">
                                                        <td className="py-2 pr-3 font-medium text-gray-700">{d} m</td>
                                                        {['tail', 'head', 'side'].map(field => (
                                                            <td key={field} className="py-2 px-2">
                                                                <input
                                                                    type="number"
                                                                    inputMode="decimal"
                                                                    step="0.001"
                                                                    min="0"
                                                                    max="1"
                                                                    value={editCoefs[k][field]}
                                                                    onChange={(e) => updateEditCoef(k, field, e.target.value)}
                                                                    className="w-24 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                                />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-3 flex items-center gap-3 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={saveCoefs}
                                        disabled={!dirty || saving}
                                        className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-md"
                                    >
                                        {saving ? 'Čuvanje...' : 'Sačuvaj'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={resetEditCoefs}
                                        className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md"
                                    >
                                        Vrati podrazumevano
                                    </button>
                                    <span className="text-xs text-gray-500">
                                        Podrazumevano za svaku: 0.02 / 0.03 / 0.01
                                    </span>
                                    {savedFlash && (
                                        <span className="text-xs text-green-700 font-medium">Sačuvano.</span>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="mt-4 text-xs text-gray-500">
                        Min. korigovana brzina: 0.1 km/h.
                    </div>
                </div>
            </div>
        </Layout>
    );
}
