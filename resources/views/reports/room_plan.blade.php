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
        table.prices { border-collapse: collapse; margin: 0 0 8px; }
        table.prices th, table.prices td { padding: 3px 10px 3px 0; border-bottom: 1px solid #e5e7eb; text-align: left; }
        table.prices th { font-size: 8px; text-transform: uppercase; color: #555; }
        table.prices td.r, table.prices th.r { text-align: right; }
        .note { color: #555; font-size: 8px; margin-bottom: 8px; }
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

@if ($priceRows->isNotEmpty())
    <table class="prices">
        <tr><th>Room</th><th class="r">Per person</th><th class="r">Whole room</th></tr>
        @foreach ($priceRows as $row)
            <tr>
                <td>{{ $row['label'] }}</td>
                <td class="r"><strong>{{ number_format($row['price'], 2) }} {{ $competition->currency }}</strong></td>
                <td class="r">{{ number_format($row['price'] * $row['beds'], 2) }} {{ $competition->currency }}</td>
            </tr>
        @endforeach
    </table>
    <div class="note">
        Price per person for the whole stay{{ $packageNights ? " ({$packageNights} nights)" : '' }}.
        @if ($supporterDiscount > 0) Supporters: {{ number_format($supporterDiscount, 2) }} {{ $competition->currency }} discount. @endif
        @if ($childNote) Children (age at check-in): {{ $childNote }}. @endif
    </div>
@endif

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
