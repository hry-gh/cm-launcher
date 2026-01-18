set windows-shell := ["powershell.exe", "-NoLogo", "-Command"]

[windows]
build:
    cd web; npm run build
    Copy-Item code\launcher.dm code\launcher.dm.bak
    $html = Get-Content web\dist\output.html -Raw; (Get-Content code\launcher.dm.bak -Raw) -replace 'LAUNCHER HTML HERE', $html | Set-Content code\launcher.dm
    & "C:\Program Files (x86)\BYOND\bin\dm.exe" cm-launcher.dme
    Move-Item -Force code\launcher.dm.bak code\launcher.dm

[unix]
build:
    #!/usr/bin/env bash
    set -e
    cd web
    npm run build
    cd ..
    cp code/launcher.dm code/launcher.dm.bak
    sed -e '/LAUNCHER HTML HERE/{
        r web/dist/output.html
        d
    }' code/launcher.dm.bak > code/launcher.dm
    wine ~/byond/bin/dm.exe cm-launcher.dme
    mv code/launcher.dm.bak code/launcher.dm
