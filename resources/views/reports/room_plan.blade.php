<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Room plan — {{ $competition->name }}</title>
    <style>
        @page { margin: 12mm 12mm; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 9px; color: #111; }
        h1 { font-size: 15px; margin: 0 0 3px; }
        .meta { color: #555; font-size: 9px; margin-bottom: 10px; }
        table.grid { width: 100%; border-collapse: separate; border-spacing: 6px; }
        table.grid td.cell { width: 33.33%; vertical-align: top; padding: 0; }
        .room { border: 1px solid #d1d5db; border-radius: 4px; padding: 6px 7px; page-break-inside: avoid; }
        .beds-1 { background: #f8fafc; border-color: #e2e8f0; }
        .beds-2 { background: #f0f9ff; border-color: #bae6fd; }
        .beds-3 { background: #ecfdf5; border-color: #a7f3d0; }
        .beds-4 { background: #fffbeb; border-color: #fde68a; }
        .beds-5 { background: #f5f3ff; border-color: #ddd6fe; }
        .badge { display: inline-block; background: #4f46e5; color: #fff; font-weight: bold; padding: 1px 6px; border-radius: 3px; font-size: 10px; }
        .sub { color: #555; font-size: 8px; margin: 3px 0; }
        ul { margin: 3px 0 0; padding-left: 12px; }
        li { margin: 1px 0; }
        .extras { color: #666; font-size: 8px; }
        h2 { font-size: 11px; margin: 12px 0 4px; border-bottom: 1px solid #999; padding-bottom: 2px; }
        .footer { margin-top: 10px; color: #999; font-size: 8px; text-align: center; }
    </style>
</head>
<body>

<h1>Room plan — {{ $competition->name }}</h1>
<div class="meta">
    {{ collect([$dateRange, $competition->location])->filter()->implode(' · ') }}
    @if ($defaults['check_in'] && $defaults['check_out'])
        · Stay {{ date('d.m.Y', strtotime($defaults['check_in'])) }} – {{ date('d.m.Y', strtotime($defaults['check_out'])) }}
    @endif
    <br>
    {{ $rooms->count() }} rooms ({{ $bySize }}) · {{ $peopleCount }} people
</div>

<table class="grid">
    @foreach ($rooms->chunk(3) as $row)
        <tr>
            @foreach ($row as $room)
                @php $info = $roomInfo[$room->id]; @endphp
                <td class="cell">
                    <div class="room beds-{{ $room->beds }}">
                        <span class="badge">Room {{ $room->name ?: $room->number }}</span>
                        <span class="sub">&nbsp;{{ $room->beds }}-bed</span>
                        @if ($info['stay'])
                            <div class="sub">{{ $info['stay'] }}</div>
                        @endif
                        @if ($info['price'] !== null)
                            <div class="sub">{{ number_format($info['price'], 2) }} {{ $competition->currency }} per person · room {{ number_format($info['price'] * $room->beds, 2) }} {{ $competition->currency }}</div>
                        @endif
                        @if ($info['occupants']->isEmpty())
                            <div class="sub">Empty</div>
                        @else
                            <ul>
                                @foreach ($info['occupants'] as $o)
                                    <li>{{ $o['name'] }}@if ($o['extras']) <span class="extras">{{ $o['extras'] }}</span>@endif</li>
                                @endforeach
                            </ul>
                        @endif
                    </div>
                </td>
            @endforeach
            @for ($i = $row->count(); $i < 3; $i++)
                <td class="cell"></td>
            @endfor
        </tr>
    @endforeach
</table>

@if ($notInRoom->isNotEmpty())
    <h2>Not in a room yet</h2>
    <div>{{ $notInRoom->implode(', ') }}</div>
@endif

<div class="footer">Generated {{ now()->format('d.m.Y H:i') }}</div>
</body>
</html>
