param(
  [string]$WebView2SdkPath = $env:WEBVIEW2_SDK,
  [string]$WixPath
)

$ErrorActionPreference = 'Stop'
$nativeDir = $PSScriptRoot
$repoRoot = (Resolve-Path (Join-Path $nativeDir '..\..')).Path
$buildDir = Join-Path $nativeDir 'build'
$downloadsDir = Join-Path $repoRoot 'public\downloads'
$output = Join-Path $downloadsDir 'Pongy-AI-0.26.1-windows-x64.msi'

if (-not $WebView2SdkPath -or -not (Test-Path (Join-Path $WebView2SdkPath 'build\native\x64\WebView2LoaderStatic.lib'))) {
  throw 'Set WEBVIEW2_SDK to the extracted Microsoft.Web.WebView2 1.0.3537.50 NuGet package.'
}

if (-not $WixPath) {
  $wixCommand = Get-Command wix.exe,wix -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($wixCommand) { $WixPath = $wixCommand.Source }
}
if (-not $WixPath -or -not (Test-Path $WixPath)) {
  throw 'Install the WiX Toolset .NET CLI and pass its wix.exe path with -WixPath.'
}

$vswhere = Join-Path ${env:ProgramFiles(x86)} 'Microsoft Visual Studio\Installer\vswhere.exe'
if (-not (Test-Path $vswhere)) { throw 'Visual Studio Build Tools with the C++ x64 toolchain are required.' }
$env:PATH = (Split-Path $vswhere)+';'+$env:PATH
$vsPath = & $vswhere -latest -products '*' -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath
if (-not $vsPath) { throw 'Could not find the Visual Studio C++ x64 build tools.' }
$vcvars = Join-Path $vsPath 'VC\Auxiliary\Build\vcvars64.bat'
if (-not (Test-Path $vcvars)) { throw 'The Visual Studio x64 build environment script is missing.' }

New-Item -ItemType Directory -Force -Path $buildDir,$downloadsDir | Out-Null
$loader = Join-Path $WebView2SdkPath 'build\native\x64\WebView2Loader.dll'
Copy-Item -LiteralPath $loader -Destination (Join-Path $buildDir 'WebView2Loader.dll') -Force
$offline = [IO.File]::ReadAllText((Join-Path $repoRoot 'public\offline.html'))
$logo = [Convert]::ToBase64String([IO.File]::ReadAllBytes((Join-Path $repoRoot 'public\welcome-logo.png')))
$offline = $offline.Replace('/welcome-logo.png',"data:image/png;base64,$logo")
$offlineScript = [IO.File]::ReadAllText((Join-Path $repoRoot 'public\offline-page.js')).Replace(
  'location.reload()',
  'location.assign("https://pongy-ai.devs.surf/?pongy_app=windows&client_version=0.26.1")'
)
$offline = $offline.Replace(
  '<script src="/offline-page.js"></script>',
  "<script>$offlineScript</script>"
)
[IO.File]::WriteAllText((Join-Path $buildDir 'offline.html'),$offline,[Text.UTF8Encoding]::new($false))

$compile = 'call "'+$vcvars+'" >nul && cd /d "'+$nativeDir+'" && rc /nologo /fo build\resources.res launcher.rc && cl /nologo /utf-8 /std:c++17 /O2 /EHsc /I"'+$buildDir+'" /I"'+(Join-Path $WebView2SdkPath 'build\native\include')+'" /Fo:build\PongyAI.obj /c launcher.cpp && link /nologo /SUBSYSTEM:WINDOWS /ENTRY:wWinMainCRTStartup /OUT:build\PongyAI.exe build\PongyAI.obj build\resources.res /LIBPATH:"'+(Join-Path $WebView2SdkPath 'build\native\x64')+'" WebView2LoaderStatic.lib ole32.lib shell32.lib uuid.lib advapi32.lib user32.lib'
& $env:ComSpec /d /c $compile
if ($LASTEXITCODE -ne 0) { throw "Native Windows application build failed with exit code $LASTEXITCODE." }

$generatedWxs = Join-Path $nativeDir 'installer.generated.wxs'
Push-Location $nativeDir
try {
  Copy-Item -LiteralPath 'installer.wxs' -Destination 'installer.generated.wxs' -Force
  & $WixPath convert 'installer.generated.wxs'
  if (-not ([IO.File]::ReadAllText($generatedWxs).Contains('http://wixtoolset.org/schemas/v4/wxs'))) {
    throw "WiX source conversion failed with exit code $LASTEXITCODE."
  }
  & $WixPath build 'installer.generated.wxs' -arch x64 -out $output -pdbtype none
  if ($LASTEXITCODE -ne 0) { throw "MSI build failed with exit code $LASTEXITCODE." }
} finally {
  Remove-Item -LiteralPath $generatedWxs -Force -ErrorAction SilentlyContinue
  Pop-Location
}

Write-Output "Built unsigned MSI: $output"
