<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ config('app.name') }}</title>
</head>
<body style="margin:0; padding:0; background-color:#f3f4f6; font-family: Arial, Helvetica, sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6; padding:24px 0;">
        <tr>
            <td align="center">
                <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#ffffff; border-radius:12px; overflow:hidden;">
                    <tr>
                        <td style="background-color:#2563eb; padding:20px 32px;">
                            <span style="color:#ffffff; font-size:20px; font-weight:bold;">{{ env('CLUB_NAME', config('app.name')) }}</span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px;">
                            <div style="color:#374151; font-size:15px; line-height:1.6; white-space:pre-line;">{{ $bodyText }}</div>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:16px 32px; background-color:#f9fafb; color:#9ca3af; font-size:12px;">
                            This message was sent by {{ env('CLUB_NAME', config('app.name')) }}.
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
