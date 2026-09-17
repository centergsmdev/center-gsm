$ErrorActionPreference = "Stop"

function Read-PlainPassword([string]$Prompt) {
  $secure = Read-Host $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

$first = $null
$second = $null
$pbkdf = $null
$rng = $null
$sqlFile = $null
try {
  Write-Host "CENTER GSM - Ozel silme sifresi kurulumu" -ForegroundColor Cyan
  Write-Host "Sifre ekranda gorunmez ve sohbet kaydina girmez." -ForegroundColor Yellow

  $first = Read-PlainPassword "Yeni silme sifresi (en az 12 karakter)"
  $second = Read-PlainPassword "Yeni silme sifresini tekrar girin"

  if ($first.Length -lt 12 -or $first.Length -gt 128) {
    throw "Silme sifresi 12-128 karakter arasinda olmalidir."
  }
  if ($first -cne $second) {
    throw "Girilen sifreler birbiriyle eslesmiyor."
  }

  $salt = [byte[]]::new(24)
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($salt)
  $pbkdf = [Security.Cryptography.Rfc2898DeriveBytes]::new(
    $first,
    $salt,
    310000,
    [Security.Cryptography.HashAlgorithmName]::SHA256
  )
  $digest = $pbkdf.GetBytes(32)
  $saltText = [Convert]::ToBase64String($salt).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  $digestText = [Convert]::ToBase64String($digest).TrimEnd('=').Replace('+', '-').Replace('/', '_')
  $encoded = "pbkdf2-sha256`$310000`$$saltText`$$digestText"
  $sql = @"
insert into public.admin_deletion_security (id, password_hash, failed_attempts, locked_until)
values (true, '$encoded', 0, null)
on conflict (id) do update
set password_hash = excluded.password_hash,
    failed_attempts = 0,
    locked_until = null,
    updated_at = timezone('utc', now());
"@

  Push-Location (Join-Path $PSScriptRoot "..")
  try {
    $sqlFile = [IO.Path]::GetTempFileName()
    [IO.File]::WriteAllText($sqlFile, $sql, [Text.Encoding]::UTF8)
    & npx.cmd supabase db query --linked --file $sqlFile
    if ($LASTEXITCODE -ne 0) {
      throw "Silme sifresi veritabanina kaydedilemedi."
    }
  }
  finally {
    Pop-Location
  }

  Write-Host "Ozel silme sifresi guvenli bicimde kaydedildi." -ForegroundColor Green
}
finally {
  if ($sqlFile) {
    $resolvedSqlFile = [IO.Path]::GetFullPath($sqlFile)
    $resolvedTempRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($resolvedSqlFile.StartsWith($resolvedTempRoot, [StringComparison]::OrdinalIgnoreCase)) {
      Remove-Item -LiteralPath $resolvedSqlFile -Force -ErrorAction SilentlyContinue
    }
  }
  if ($rng) { $rng.Dispose() }
  if ($pbkdf) { $pbkdf.Dispose() }
  $first = $null
  $second = $null
}
