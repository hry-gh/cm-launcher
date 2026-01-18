set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

[windows]
build:
    cd web; npm run build
    $html = Get-Content web\dist\output.html -Raw; "var/launcher = @(~~~)`n$html~~~`n" | Set-Content code\launcher.dm -NoNewline
    try { & "C:\Program Files (x86)\BYOND\bin\dm.exe" cm-launcher.dme } finally { 'var/launcher = ""' | Set-Content code\launcher.dm }

[unix]
build:
    #!/usr/bin/env bash
    set -e
    cd web
    npm run build
    cd ..
    { echo 'var/launcher = @(~~~)'; cat web/dist/output.html; echo '~~~'; } > code/launcher.dm
    cleanup() { echo 'var/launcher = ""' > code/launcher.dm; }
    trap cleanup EXIT
    wine ~/byond/bin/dm.exe cm-launcher.dme
