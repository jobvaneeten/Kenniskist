# Spreekt zinnen in met een stem van Windows (de "OneCore"-stemmen, dezelfde als
# Verteller). Gebruik: powershell -File stem-windows.ps1 -Lijst zinnen.json -Taal nl
# zinnen.json = [{ "tekst": "...", "pad": "C:\\...\\1.wav" }, ...]
# Zonder Nederlandse stem: Instellingen > Tijd en taal > Spraak > Stemmen toevoegen > Nederlands.
param([string]$Lijst, [string]$Taal = 'nl', [string]$Stem = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Wacht($op, [Type]$soort) { $t = $asTask.MakeGenericMethod($soort).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }

$stemmen = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices
$v = if ($Stem) { $stemmen | Where-Object { $_.DisplayName -like "*$Stem*" } | Select-Object -First 1 } else { $stemmen | Where-Object { $_.Language -like "$Taal*" } | Select-Object -First 1 }
if (-not $v) { Write-Output "GEEN-STEM: geen stem voor '$Taal'. Aanwezig: $(( $stemmen | ForEach-Object { $_.DisplayName + ' (' + $_.Language + ')' }) -join ', ')"; exit 2 }
$s = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$s.Voice = $v
Write-Output "STEM: $($v.DisplayName) ($($v.Language))"
foreach ($z in (Get-Content -Raw -Encoding UTF8 $Lijst | ConvertFrom-Json)) {
  $stroom = Wacht ($s.SynthesizeTextToStreamAsync($z.tekst)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $lezer = New-Object Windows.Storage.Streams.DataReader($stroom.GetInputStreamAt(0))
  $null = Wacht ($lezer.LoadAsync([uint32]$stroom.Size)) ([uint32])
  $bytes = New-Object byte[] ([int]$stroom.Size)
  $lezer.ReadBytes($bytes)
  [IO.File]::WriteAllBytes($z.pad, $bytes)
}
Write-Output "KLAAR"
