# 从已构建的网页暂存目录制作内网更新包。离线发行物来自暂存目录，
# 网页构建结果、技能源码和文档始终从当前项目读取，避免发布旧页面或空文库。
param(
    [string]$ProjectRoot = (Split-Path -Parent $PSScriptRoot),
    [Parameter(Mandatory = $true)][string]$StagingDir,
    [Parameter(Mandatory = $true)][string]$OutputZip
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$project = [System.IO.Path]::GetFullPath($ProjectRoot)
$stage = [System.IO.Path]::GetFullPath($StagingDir)
$output = [System.IO.Path]::GetFullPath($OutputZip)
if (-not (Test-Path -LiteralPath $stage -PathType Container)) { throw "网页暂存目录不存在：$stage" }
if (Test-Path -LiteralPath $output) { throw "输出文件已存在，请换一个文件名：$output" }

# 这些文件是当前部署形态的最小运行条件，缺一个就不应发布 ZIP。
$runtimeFiles = @(
    'offline/install-skills.mjs',
    'offline/offline-kit.mjs',
    'offline/offline-installer.mjs',
    'offline/rtk-install.mjs',
    'offline/kit/manifest.json',
    'offline/kit/complete.json'
)
foreach ($name in $runtimeFiles) {
    if (-not (Test-Path -LiteralPath (Join-Path $stage $name) -PathType Leaf)) {
        throw "网页暂存目录缺少运行文件：$name"
    }
}

# 暂存包可以内部自洽，却仍是旧版本。逐字节比较当前项目中的四个安装模块
# 和 manifest，确保新网页、RTK 文档与同一版本的安装器和离线包一起发布。
foreach ($name in @($runtimeFiles | Where-Object { $_ -ne 'offline/kit/complete.json' })) {
    $currentFile = Join-Path $project $name
    if (-not (Test-Path -LiteralPath $currentFile -PathType Leaf)) {
        throw "当前项目缺少运行文件：$name"
    }
    $stageHash = (Get-FileHash -LiteralPath (Join-Path $stage $name) -Algorithm SHA256).Hash
    $currentHash = (Get-FileHash -LiteralPath $currentFile -Algorithm SHA256).Hash
    if ($stageHash -ne $currentHash) {
        throw "暂存目录与当前项目版本不一致：$name"
    }
}

# RTK 已列入离线发行清单。这里再核对生成后的 kit，避免维护机使用未重建
# 的旧 kit：只要版本不符，或任一目标未包含 RTK，就拒绝发布。
$inputsFile = Join-Path $project 'offline/offline-inputs.json'
if (-not (Test-Path -LiteralPath $inputsFile -PathType Leaf)) {
    throw '当前项目缺少 offline/offline-inputs.json'
}
$inputs = Get-Content -LiteralPath $inputsFile -Raw -Encoding UTF8 | ConvertFrom-Json
$manifest = Get-Content -LiteralPath (Join-Path $stage 'offline/kit/manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$expectedRtk = @($inputs.bundles | Where-Object { $_.name -eq 'rtk' })
$actualRtk = @($manifest.bundles | Where-Object { $_.name -eq 'rtk' })
if ($expectedRtk.Count -ne 1 -or $actualRtk.Count -ne 1 -or $actualRtk[0].version -ne $expectedRtk[0].version) {
    throw '离线目录中的 RTK 版本与当前 offline/offline-inputs.json 不一致'
}
foreach ($target in $manifest.targets) {
    if ('rtk' -notin @($target.bundles)) { throw "离线目标缺少 RTK：$($target.agent)" }
}

# 完成标记只证明清单字节未变；必须复用离线安装器的逐文件校验入口，
# 才能在发布前发现 payload 缺失、额外文件或等长篡改。
$verifier = Join-Path $PSScriptRoot 'verify-offline-kit.mjs'
& node $verifier (Join-Path $stage 'offline/kit')
if ($LASTEXITCODE -ne 0) { throw '离线目录校验失败：暂存目录与清单不一致' }

# 使用 ZIP 内的正斜杠路径作为键。先收录暂存目录，再覆盖资料目录，
# 因此即使旧暂存目录里残留了过期文档，也不会掩盖当前仓库的内容。
$files = New-Object 'System.Collections.Generic.Dictionary[string,string]' ([System.StringComparer]::Ordinal)
function Add-Files([string]$directory, [string]$prefix) {
    if (-not (Test-Path -LiteralPath $directory -PathType Container)) { return 0 }
    $count = 0
    foreach ($file in Get-ChildItem -LiteralPath $directory -Recurse -Force -File) {
        if ($file.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
            throw "不能把符号链接写入更新包：$($file.FullName)"
        }
        $relative = $file.FullName.Substring($directory.TrimEnd('\', '/').Length).TrimStart('\', '/')
        $entry = ($prefix + $relative).Replace('\', '/')
        $files[$entry] = $file.FullName
        $count++
    }
    return $count
}

[void](Add-Files $stage '')
# 暂存目录可能沿用旧网页构建。先移除其中的网页条目，再收录当前
# 仓库本次构建的静态资源与独立服务端入口，避免新旧 asset 混装。
foreach ($prefix in @('viewer/dist/', 'viewer/dist-server/')) {
    foreach ($name in @($files.Keys | Where-Object { $_.StartsWith($prefix, [System.StringComparison]::Ordinal) })) {
        [void]$files.Remove($name)
    }
}
$dist = Join-Path $project 'viewer/dist'
if (-not (Test-Path -LiteralPath (Join-Path $dist 'index.html') -PathType Leaf)) {
    throw '当前项目缺少 viewer/dist/index.html，请先构建网页'
}
[void](Add-Files $dist 'viewer/dist/')
$serverEntry = Join-Path $project 'viewer/dist-server/main.mjs'
if (-not (Test-Path -LiteralPath $serverEntry -PathType Leaf)) {
    throw '当前项目缺少 viewer/dist-server/main.mjs，请先执行独立构建'
}
$files['viewer/dist-server/main.mjs'] = $serverEntry

foreach ($prefix in @('skills/', 'docs/skills/', 'docs/ai-docs/', 'docs/collections/')) {
    foreach ($name in @($files.Keys | Where-Object { $_.StartsWith($prefix, [System.StringComparison]::Ordinal) })) {
        [void]$files.Remove($name)
    }
    $source = Join-Path $project $prefix
    $count = Add-Files $source $prefix
    # 自建分组可为空；其他三类目录为空则是会导致文库缺内容的坏包。
    if ($count -eq 0 -and $prefix -ne 'docs/collections/') {
        throw "当前项目缺少必须随包发布的资料：$prefix"
    }
}

# 根级 Markdown 也是文库可浏览内容；把它们从当前项目加入，避免旧包中的
# CLAUDE.md 等文件与仓库版本不同。其他暂存文件保持原样，包括隐藏的离线清单。
foreach ($file in Get-ChildItem -LiteralPath $project -File -Filter '*.md') {
    $files[$file.Name] = $file.FullName
}

$outputDir = Split-Path -Parent $output
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
$temporary = Join-Path $outputDir ('.web-update-' + [guid]::NewGuid().ToString('N') + '.zip')
try {
    $stream = [System.IO.File]::Open($temporary, [System.IO.FileMode]::CreateNew)
    try {
        $zip = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
        try {
            foreach ($name in @($files.Keys | Sort-Object)) {
                [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                    $zip, $files[$name], $name, [System.IO.Compression.CompressionLevel]::Optimal
                )
            }
        } finally {
            $zip.Dispose()
        }
    } finally {
        $stream.Dispose()
    }

    # 再读 ZIP 目录，确保真正写入的条目与待发布清单完全一致。
    $check = [System.IO.Compression.ZipFile]::OpenRead($temporary)
    try {
        if ($check.Entries.Count -ne $files.Count) {
            throw "ZIP 条目数不一致：预期 $($files.Count)，实际 $($check.Entries.Count)"
        }
        foreach ($name in $files.Keys) {
            if ($null -eq $check.GetEntry($name)) { throw "ZIP 缺少文件：$name" }
        }
    } finally {
        $check.Dispose()
    }
    Move-Item -LiteralPath $temporary -Destination $output
    Write-Output "已生成完整更新包：$output（$($files.Count) 个文件）"
} finally {
    if (Test-Path -LiteralPath $temporary) { Remove-Item -LiteralPath $temporary -Force }
}
