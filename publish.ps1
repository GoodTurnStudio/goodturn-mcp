# Publishes every server in servers.json to the official MCP Registry.
# First: download mcp-publisher.exe (github.com/modelcontextprotocol/registry/releases) next to this file,
# run .\mcp-publisher.exe login github, then: .\publish.ps1 -Namespace io.github.GoodTurnStudio
param([Parameter(Mandatory=$true)][string]$Namespace)
$here = $PSScriptRoot
$servers = Get-Content (Join-Path $here "servers.json") -Raw | ConvertFrom-Json
foreach ($s in $servers) {
  $s.name = $s.name -replace 'NAMESPACE', $Namespace
  $dir = Join-Path $env:TEMP ("mcp-" + ($s.name -split '/')[1])
  New-Item -ItemType Directory -Force $dir | Out-Null
  $s | ConvertTo-Json -Depth 10 | Set-Content -Path (Join-Path $dir "server.json") -Encoding utf8
  Push-Location $dir; & (Join-Path $here "mcp-publisher.exe") publish; Pop-Location
}
