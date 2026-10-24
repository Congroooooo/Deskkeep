param([string]$JsonPath, [string]$OutDir)
Add-Type -AssemblyName System.Speech
$lines = Get-Content -Raw -LiteralPath $JsonPath | ConvertFrom-Json
New-Item -ItemType Directory -Force -Path $OutDir | Out-Null
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.SelectVoice("Microsoft David Desktop")
$s.Rate = 1
$s.Volume = 100
foreach ($l in $lines) {
  $file = Join-Path $OutDir ("vo-" + $l.id + ".wav")
  $s.SetOutputToWaveFile($file)
  $s.Speak($l.text)
  $s.SetOutputToNull()
  Write-Output ("wrote " + $file)
}
$s.Dispose()
