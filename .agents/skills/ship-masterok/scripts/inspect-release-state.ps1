[CmdletBinding()]
param(
    [string]$ExpectedBranch = "main",
    [switch]$Json
)

$ErrorActionPreference = "Stop"

$repoRoot = (& git rev-parse --show-toplevel 2>$null)
if (-not $repoRoot) {
    Write-Error "Current directory is not inside a Git repository."
    exit 2
}

$repoRoot = $repoRoot.Trim()
$branch = (& git -C $repoRoot branch --show-current).Trim()
$head = (& git -C $repoRoot rev-parse --short HEAD).Trim()
$statusLines = @(& git -C $repoRoot status --porcelain=v1 --untracked-files=all 2>$null)

$entries = @(
    foreach ($line in $statusLines) {
        if ([string]::IsNullOrWhiteSpace($line) -or $line.Length -lt 4) {
            continue
        }

        $xy = $line.Substring(0, 2)
        $path = $line.Substring(3)
        [pscustomobject]@{
            status = $xy
            path = $path
            staged = ($xy[0] -ne " " -and $xy[0] -ne "?")
            unstaged = ($xy[1] -ne " ")
            untracked = ($xy -eq "??")
            generated = ($path -match "^(tests/fixtures/parity/|src/lib/calculators/meta\.generated\.ts$)")
            sensitive = ($path -match "(^|/|\\)\.env($|\.|/|\\)")
        }
    }
)

$upstream = $null
try {
    $upstream = (& git -C $repoRoot rev-parse --abbrev-ref --symbolic-full-name "@{upstream}" 2>$null).Trim()
} catch {
    $upstream = $null
}

$ahead = $null
$behind = $null
if ($upstream) {
    $counts = ((& git -C $repoRoot rev-list --left-right --count "$upstream...HEAD" 2>$null) -split "\s+")
    if ($counts.Count -ge 2) {
        $behind = [int]$counts[0]
        $ahead = [int]$counts[1]
    }
}

$result = [pscustomobject]@{
    repository = $repoRoot
    branch = $branch
    expectedBranch = $ExpectedBranch
    branchMatches = ($branch -eq $ExpectedBranch)
    head = $head
    upstream = $upstream
    ahead = $ahead
    behind = $behind
    changedCount = $entries.Count
    stagedCount = @($entries | Where-Object staged).Count
    untrackedCount = @($entries | Where-Object untracked).Count
    generatedCount = @($entries | Where-Object generated).Count
    sensitiveCount = @($entries | Where-Object sensitive).Count
    changes = $entries
}

if ($Json) {
    $result | ConvertTo-Json -Depth 5
    exit 0
}

Write-Output "Repository: $repoRoot"
Write-Output "Branch: $branch (expected: $ExpectedBranch)"
Write-Output "HEAD: $head"
Write-Output "Upstream: $(if ($upstream) { $upstream } else { '<none>' })"
Write-Output "Ahead/behind: $(if ($null -ne $ahead) { "$ahead/$behind" } else { '<unknown>' })"
Write-Output "Changes: $($entries.Count); staged: $(@($entries | Where-Object staged).Count); untracked: $(@($entries | Where-Object untracked).Count); generated: $(@($entries | Where-Object generated).Count)"

if ($entries.Count -gt 0) {
    $entries | Format-Table status, path, staged, untracked, generated, sensitive -AutoSize
}

if ($branch -ne $ExpectedBranch) {
    Write-Warning "Current branch differs from the expected branch."
}
if (@($entries | Where-Object sensitive).Count -gt 0) {
    Write-Warning "An env-like path is present in Git status. Do not stage or print its contents."
}
