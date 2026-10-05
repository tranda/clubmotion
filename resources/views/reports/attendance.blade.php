<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Attendance {{ $from }} – {{ $to }}</title>
    <style>
        @page { margin: 12mm 10mm; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #111; }
        h1 { font-size: 15px; margin: 0 0 4px; }
        h2 { font-size: 11px; margin: 14px 0 6px; padding-bottom: 2px; border-bottom: 1px solid #999; text-transform: uppercase; color: #333; }
        .meta { color: #666; font-size: 9px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 3px 4px; border: 1px solid #e0e0e0; }
        th { background: #f3f4f6; font-size: 8px; color: #555; }
        td.c, th.c { text-align: center; }
        td.r, th.r { text-align: right; }
        tr.totals td { font-weight: bold; background: #f9fafb; }
        .yes { color: #166534; font-weight: bold; }
        .footer { margin-top: 12px; color: #999; font-size: 8px; text-align: center; }
    </style>
</head>
<body>

@php
    $sessionCount = count($sessions);
    $showGrid = $sessionCount > 0 && $sessionCount <= 31;
@endphp

<h1>Attendance {{ \Carbon\Carbon::parse($from)->format('d.m.Y') }} – {{ \Carbon\Carbon::parse($to)->format('d.m.Y') }}</h1>
<div class="meta">
    {{ $sessionCount }} session(s){{ $sessionTypeName ? ' · ' . $sessionTypeName : '' }}
    · {{ $filter === 'all' ? 'All members' : 'Active members' }}
    · Generated {{ now()->format('d.m.Y H:i') }}
</div>

<h2>Summary</h2>
<table>
    <tr>
        <th class="r" style="width:30px">#</th>
        <th>Name</th>
        <th>Category</th>
        <th class="r">Attended</th>
        <th class="r">Sessions</th>
        <th class="r">%</th>
    </tr>
    @foreach ($rows as $row)
        <tr>
            <td class="r">{{ $row['number'] }}</td>
            <td>{{ $row['name'] }}</td>
            <td>{{ $row['category'] }}</td>
            <td class="r">{{ $row['total'] }}</td>
            <td class="r">{{ $sessionCount }}</td>
            <td class="r">{{ $row['percent'] }}%</td>
        </tr>
    @endforeach
</table>

@if ($showGrid)
    <h2>By session</h2>
    <table>
        <tr>
            <th>Name</th>
            @foreach ($sessions as $session)
                <th class="c" title="{{ $session['type'] }}">{{ substr($session['date'], 0, 5) }}</th>
            @endforeach
            <th class="r">Σ</th>
        </tr>
        @foreach ($rows as $row)
            <tr>
                <td>{{ $row['name'] }}</td>
                @foreach ($row['marks'] as $mark)
                    <td class="c">@if ($mark)<span class="yes">✓</span>@endif</td>
                @endforeach
                <td class="r">{{ $row['total'] }}</td>
            </tr>
        @endforeach
        <tr class="totals">
            <td>Total</td>
            @foreach ($sessionTotals as $total)
                <td class="c">{{ $total }}</td>
            @endforeach
            <td></td>
        </tr>
    </table>
@elseif ($sessionCount > 31)
    <div class="meta" style="margin-top:10px">The per-session grid is omitted for periods with more than 31 sessions; use the XLSX export for full detail.</div>
@endif

<div class="footer">ClubMotion</div>

</body>
</html>
