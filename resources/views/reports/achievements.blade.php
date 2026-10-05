<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Achievements {{ $from }}–{{ $to }}</title>
    <style>
        @page { margin: 14mm 12mm; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #111; }
        h1 { font-size: 15px; margin: 0 0 4px; }
        h2 { font-size: 11px; margin: 14px 0 6px; padding-bottom: 2px; border-bottom: 1px solid #999; text-transform: uppercase; color: #333; }
        h3 { font-size: 10px; margin: 10px 0 4px; }
        .meta { color: #666; font-size: 9px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 3px 5px; border-bottom: 1px solid #e5e5e5; vertical-align: top; }
        th { background: #f3f4f6; text-align: left; font-size: 8px; text-transform: uppercase; color: #555; }
        td.r, th.r { text-align: right; }
        .medal { display: inline-block; padding: 1px 5px; border-radius: 3px; font-size: 8px; font-weight: bold; }
        .GOLD { background: #fef3c7; color: #92400e; }
        .SILVER { background: #e5e7eb; color: #374151; }
        .BRONZE { background: #ffedd5; color: #9a3412; }
        table.layout td.col { width: 50%; padding: 0; border: none; vertical-align: top; }
        .footer { margin-top: 12px; color: #999; font-size: 8px; text-align: center; }
    </style>
</head>
<body>

@php
    $medalCols = $hasOther ? ['GOLD', 'SILVER', 'BRONZE', 'OTHER', 'TOTAL'] : ['GOLD', 'SILVER', 'BRONZE', 'TOTAL'];
    $label = fn ($m) => ucfirst(strtolower($m));
    $resultsByYear = collect($results)->groupBy('year');
@endphp

<h1>Club Achievements {{ $from === $to ? $from : $from . '–' . $to }}</h1>
<div class="meta">{{ count($results) }} result(s) · Generated {{ now()->format('d.m.Y H:i') }}</div>

@if (count($results) === 0)
    <p>No achievements in this period.</p>
@else
    <h2>Medal summary</h2>
    <table class="layout"><tr><td class="col">
        <h3>By year</h3>
        <table>
            <tr>
                <th>Year</th>
                @foreach ($medalCols as $m)<th class="r">{{ $label($m) }}</th>@endforeach
            </tr>
            @foreach ($byYear as $year => $counts)
                <tr>
                    <td>{{ $year }}</td>
                    @foreach ($medalCols as $m)<td class="r">{{ $counts[$m] }}</td>@endforeach
                </tr>
            @endforeach
        </table>
    </td><td class="col" style="padding-left:14px">
        <h3>By member</h3>
        <table>
            <tr>
                <th>Member</th>
                @foreach ($medalCols as $m)<th class="r">{{ $label($m) }}</th>@endforeach
            </tr>
            @foreach ($byMember as $counts)
                <tr>
                    <td>{{ $counts['name'] }}</td>
                    @foreach ($medalCols as $m)<td class="r">{{ $counts[$m] }}</td>@endforeach
                </tr>
            @endforeach
        </table>
    </td></tr></table>

    <h2>Results</h2>
    @foreach ($resultsByYear as $year => $yearResults)
        <h3>{{ $year }}</h3>
        <table>
            <tr>
                <th style="width:28%">Event</th>
                <th style="width:22%">Class</th>
                <th style="width:10%">Medal</th>
                <th>Members</th>
            </tr>
            @foreach ($yearResults as $r)
                <tr>
                    <td>{{ $r['event'] }}</td>
                    <td>{{ $r['class'] }}</td>
                    <td><span class="medal {{ $r['medal'] }}">{{ $label($r['medal']) }}</span></td>
                    <td>{{ $r['members'] }}</td>
                </tr>
            @endforeach
        </table>
    @endforeach
@endif

<div class="footer">ClubMotion</div>

</body>
</html>
