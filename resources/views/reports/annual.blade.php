<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Annual Ledger Report — {{ $year }}</title>
    <style>
        @page { margin: 16mm 14mm; }
        body { font-family: DejaVu Sans, sans-serif; font-size: 10px; color: #111; }
        h1 { font-size: 16px; margin: 0 0 4px; }
        h2 { font-size: 12px; margin: 14px 0 6px; padding-bottom: 2px; border-bottom: 1px solid #999; text-transform: uppercase; letter-spacing: 0.5px; color: #333; }
        .meta { color: #666; font-size: 9px; margin-bottom: 12px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
        th, td { padding: 4px 6px; border-bottom: 1px solid #e5e5e5; }
        th { background: #f3f4f6; text-align: left; font-size: 9px; text-transform: uppercase; color: #555; }
        td.r, th.r { text-align: right; }
        .num { font-variant-numeric: tabular-nums; }
        .pos { color: #166534; }
        .neg { color: #991b1b; }
        .totals-card { width: 33%; display: inline-block; vertical-align: top; padding: 4px; box-sizing: border-box; }
        .totals-card .inner { border: 1px solid #ddd; padding: 8px; border-radius: 4px; }
        .totals-card .label { font-size: 9px; text-transform: uppercase; color: #666; }
        .totals-card .row { display: block; margin-top: 3px; }
        .totals-card .row .k { display: inline-block; width: 50%; }
        .totals-card .row .v { display: inline-block; width: 50%; text-align: right; }
        .net-row { border-top: 1px solid #ccc; padding-top: 3px; font-weight: bold; }
        .footer { margin-top: 16px; color: #999; font-size: 8px; text-align: center; }
    </style>
</head>
<body>

@php
    $fmt = fn ($n) => number_format((float) $n, 2, '.', ',');
@endphp

<h1>Annual Ledger Report — {{ $year }}</h1>
<div class="meta">Generated {{ now()->format('Y-m-d H:i') }}</div>

<h2>Year totals</h2>
<div>
    @foreach (['cash' => 'Cash', 'bank' => 'Bank', 'eur' => 'EUR'] as $b => $label)
    <div class="totals-card">
        <div class="inner">
            <div class="label">{{ $label }}</div>
            <div class="row"><span class="k">Opening</span><span class="v num">{{ $fmt($totals['opening'][$b]) }}</span></div>
            <div class="row"><span class="k pos">Income</span><span class="v num pos">+{{ $fmt($totals['income'][$b]) }}</span></div>
            <div class="row"><span class="k neg">Expense</span><span class="v num neg">-{{ $fmt($totals['expense'][$b]) }}</span></div>
            <div class="row net-row"><span class="k">Closing</span><span class="v num">{{ $fmt($totals['closing'][$b]) }}</span></div>
        </div>
    </div>
    @endforeach
</div>

<h2>Monthly breakdown</h2>
<table>
    <thead>
        <tr>
            <th>Month</th>
            <th class="r">Inc Cash</th>
            <th class="r">Inc Bank</th>
            <th class="r">Inc EUR</th>
            <th class="r">Exp Cash</th>
            <th class="r">Exp Bank</th>
            <th class="r">Exp EUR</th>
            <th class="r">End Cash</th>
            <th class="r">End Bank</th>
            <th class="r">End EUR</th>
        </tr>
    </thead>
    <tbody>
        @foreach ($monthly as $m)
        <tr>
            <td>{{ $m['name'] }}</td>
            <td class="r num pos">{{ $fmt($m['income']['cash']) }}</td>
            <td class="r num pos">{{ $fmt($m['income']['bank']) }}</td>
            <td class="r num pos">{{ $fmt($m['income']['eur']) }}</td>
            <td class="r num neg">{{ $fmt($m['expense']['cash']) }}</td>
            <td class="r num neg">{{ $fmt($m['expense']['bank']) }}</td>
            <td class="r num neg">{{ $fmt($m['expense']['eur']) }}</td>
            <td class="r num">{{ $fmt($m['closing']['cash']) }}</td>
            <td class="r num">{{ $fmt($m['closing']['bank']) }}</td>
            <td class="r num">{{ $fmt($m['closing']['eur']) }}</td>
        </tr>
        @endforeach
    </tbody>
</table>

<h2>Per category</h2>
<table>
    <thead>
        <tr>
            <th>Category</th>
            <th class="r">Income</th>
            <th class="r">Expense</th>
            <th class="r">Net</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($categories as $c)
        <tr>
            <td>{{ $c['name'] }}</td>
            <td class="r num pos">{{ $fmt($c['income_total']) }}</td>
            <td class="r num neg">{{ $fmt($c['expense_total']) }}</td>
            <td class="r num">{{ $fmt($c['net']) }}</td>
        </tr>
        @empty
        <tr><td colspan="4" style="text-align: center; color: #999; padding: 12px;">No data.</td></tr>
        @endforelse
    </tbody>
</table>

<h2>Member contributions (income)</h2>
<table>
    <thead>
        <tr>
            <th>Member</th>
            <th class="r">Membership</th>
            <th class="r">Registration</th>
            <th class="r">Other</th>
            <th class="r">Total</th>
        </tr>
    </thead>
    <tbody>
        @forelse ($members as $m)
        <tr>
            <td>{{ $m['name'] }}</td>
            <td class="r num">{{ $fmt($m['membership']) }}</td>
            <td class="r num">{{ $fmt($m['registration']) }}</td>
            <td class="r num">{{ $fmt($m['other']) }}</td>
            <td class="r num"><strong>{{ $fmt($m['total']) }}</strong></td>
        </tr>
        @empty
        <tr><td colspan="5" style="text-align: center; color: #999; padding: 12px;">No member-linked income.</td></tr>
        @endforelse
    </tbody>
</table>

<div class="footer">ClubMotion — Ledger Annual Report {{ $year }}</div>

</body>
</html>
