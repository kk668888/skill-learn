# 回归测试：更新包必须同时保留运行文件与当前仓库的全部文档、技能源码。
# 使用临时项目构造旧版「只有一篇 AI 文档」的错误场景，避免读取真实离线大包。
$ErrorActionPreference = 'Stop'
$project = Join-Path ([System.IO.Path]::GetTempPath()) ("skill-learn-web-update-" + [guid]::NewGuid().ToString('N'))
$stage = Join-Path $project 'stage'
$archive = Join-Path $project 'web-update.zip'

function Write-FixtureFile([string]$relative, [string]$content) {
    $target = Join-Path $project $relative
    New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
    [System.IO.File]::WriteAllText($target, $content, (New-Object System.Text.UTF8Encoding($false)))
}

try {
    Write-FixtureFile 'stage/viewer/dist/index.html' '<html>old-viewer</html>'
    Write-FixtureFile 'stage/viewer/dist/old.js' '// old asset'
    Write-FixtureFile 'stage/viewer/dist-server/main.mjs' 'console.log("old-viewer")'
    Write-FixtureFile 'viewer/dist/index.html' '<html>current-viewer</html>'
    Write-FixtureFile 'viewer/dist/current.js' '// current asset'
    Write-FixtureFile 'viewer/dist-server/main.mjs' 'console.log("current-viewer")'
    Write-FixtureFile 'stage/offline/install-skills.mjs' '// installer'
    Write-FixtureFile 'stage/offline/offline-kit.mjs' '// verifier'
    Write-FixtureFile 'stage/offline/offline-installer.mjs' '// installer implementation'
    Write-FixtureFile 'stage/offline/rtk-install.mjs' '// RTK installer'
    Write-FixtureFile 'stage/offline/kit/payload/fixture.txt' 'fixture'
    $payload = Join-Path $stage 'offline/kit/payload/fixture.txt'
    $manifest = @{
        format = 1
        targets = @(@{ agent = 'codex'; platform = 'win32-x64'; bundles = @('rtk') })
        bundles = @(@{ name = 'rtk'; method = 'executable'; version = '1.1.0'; source = 'fixture'; license = 'MIT' })
        files = @(@{ path = 'payload/fixture.txt'; size = (Get-Item $payload).Length; sha256 = (Get-FileHash $payload -Algorithm SHA256).Hash.ToLowerInvariant() })
    } | ConvertTo-Json -Depth 7 -Compress
    Write-FixtureFile 'stage/offline/kit/manifest.json' $manifest
    $manifestFile = Join-Path $stage 'offline/kit/manifest.json'
    $manifestSha = (Get-FileHash $manifestFile -Algorithm SHA256).Hash.ToLowerInvariant()
    Write-FixtureFile 'stage/offline/kit/complete.json' ('{"manifestSha256":"' + $manifestSha + '"}')
    # 当前项目的离线包与暂存包初始相同；后续单独改写暂存副本，验证旧版完整包会被拒绝。
    New-Item -ItemType Directory -Path (Join-Path $project 'offline') -Force | Out-Null
    foreach ($name in @('install-skills.mjs', 'offline-kit.mjs', 'offline-installer.mjs', 'rtk-install.mjs')) {
        Copy-Item -LiteralPath (Join-Path $stage "offline/$name") -Destination (Join-Path $project "offline/$name")
    }
    Copy-Item -LiteralPath (Join-Path $stage 'offline/kit') -Destination (Join-Path $project 'offline/kit') -Recurse
    Write-FixtureFile 'offline/offline-inputs.json' '{"bundles":[{"name":"rtk","version":"1.1.0"}]}'
    Write-FixtureFile 'stage/docs/ai-docs/旧文章.md' '旧内容'
    Write-FixtureFile 'stage/docs/collections/旧分组/旧文章.md' '过期自建文档'
    Write-FixtureFile 'docs/ai-docs/新文章.md' '新内容'
    Write-FixtureFile 'docs/collections/新分组/新文章.md' '当前自建文档'
    Write-FixtureFile 'docs/skills/demo/demo-中文版.md' '中文文档'
    Write-FixtureFile 'skills/demo/demo/SKILL.md' '# 源码'
    Write-FixtureFile 'README.md' '# 项目说明'

    $builder = Join-Path (Split-Path -Parent $PSScriptRoot) 'deploy/build-web-update.ps1'
    & $builder -ProjectRoot $project -StagingDir $stage -OutputZip $archive

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    $zip = [System.IO.Compression.ZipFile]::OpenRead($archive)
    try {
        $expected = @(
            'viewer/dist/index.html',
            'viewer/dist/current.js',
            'viewer/dist-server/main.mjs',
            'offline/install-skills.mjs',
            'offline/kit/manifest.json',
            'docs/ai-docs/新文章.md',
            'docs/collections/新分组/新文章.md',
            'docs/skills/demo/demo-中文版.md',
            'skills/demo/demo/SKILL.md',
            'README.md'
        )
        foreach ($name in $expected) {
            if ($null -eq $zip.GetEntry($name)) { throw "更新包缺少：$name" }
        }
        if ($null -ne $zip.GetEntry('docs/ai-docs/旧文章.md')) {
            throw '更新包仍使用旧暂存目录中的过期文档'
        }
        if ($null -ne $zip.GetEntry('docs/collections/旧分组/旧文章.md')) {
            throw '更新包仍携带旧暂存目录中的过期自建文档'
        }
        if ($null -ne $zip.GetEntry('viewer/dist/old.js')) {
            throw '更新包仍携带旧暂存目录中的过期网页资源'
        }
        $reader = New-Object System.IO.StreamReader($zip.GetEntry('viewer/dist/index.html').Open())
        try {
            if ($reader.ReadToEnd() -ne '<html>current-viewer</html>') {
                throw '更新包没有使用当前项目的网页构建结果'
            }
        } finally {
            $reader.Dispose()
        }
    } finally {
        $zip.Dispose()
    }
    # 暂存模块即使存在且可读，只要不是当前仓库版本，也不能混入新页面的 ZIP。
    Write-FixtureFile 'stage/offline/rtk-install.mjs' '// stale RTK installer'
    $staleModule = Join-Path $project 'stale-module.zip'
    try {
        & $builder -ProjectRoot $project -StagingDir $stage -OutputZip $staleModule
        throw '旧版安装模块仍被制包接受'
    } catch {
        if ($_.Exception.Message -notlike '*offline/rtk-install.mjs*') { throw }
    }
    if (Test-Path -LiteralPath $staleModule) { throw '旧版安装模块的 ZIP 被发布了' }
    Copy-Item -LiteralPath (Join-Path $project 'offline/rtk-install.mjs') -Destination (Join-Path $stage 'offline/rtk-install.mjs') -Force
    # manifest 和完成标记可自洽，但与当前项目不同的旧版 kit 仍须拒绝。
    $staleManifest = $manifest.Replace('1.1.0', '1.0.0')
    Write-FixtureFile 'stage/offline/kit/manifest.json' $staleManifest
    $staleSha = (Get-FileHash $manifestFile -Algorithm SHA256).Hash.ToLowerInvariant()
    Write-FixtureFile 'stage/offline/kit/complete.json' ('{"manifestSha256":"' + $staleSha + '"}')
    $staleKit = Join-Path $project 'stale-kit.zip'
    try {
        & $builder -ProjectRoot $project -StagingDir $stage -OutputZip $staleKit
        throw '旧版完整离线包仍被制包接受'
    } catch {
        if ($_.Exception.Message -notlike '*offline/kit/manifest.json*') { throw }
    }
    if (Test-Path -LiteralPath $staleKit) { throw '旧版完整离线包的 ZIP 被发布了' }
    Copy-Item -LiteralPath (Join-Path $project 'offline/kit/manifest.json') -Destination $manifestFile -Force
    Copy-Item -LiteralPath (Join-Path $project 'offline/kit/complete.json') -Destination (Join-Path $stage 'offline/kit/complete.json') -Force
    # 缺少安装器自身的依赖时，不能发布表面上能解压、实际不能安装的 ZIP。
    Remove-Item -LiteralPath (Join-Path $stage 'offline/offline-installer.mjs') -Force
    $missingModule = Join-Path $project 'missing-module.zip'
    try {
        & $builder -ProjectRoot $project -StagingDir $stage -OutputZip $missingModule
        throw '缺少安装模块时制包没有失败'
    } catch {
        if ($_.Exception.Message -notlike '*offline/offline-installer.mjs*') { throw }
    }
    if (Test-Path -LiteralPath $missingModule) { throw '缺少安装模块的 ZIP 被发布了' }
    Write-FixtureFile 'stage/offline/offline-installer.mjs' '// installer implementation'
    # 完成标记与清单存在仍不够，payload 内容损坏也必须在输出 ZIP 前发现。
    Write-FixtureFile 'stage/offline/kit/payload/fixture.txt' 'corrupted'
    $brokenKit = Join-Path $project 'broken-kit.zip'
    try {
        & $builder -ProjectRoot $project -StagingDir $stage -OutputZip $brokenKit
        throw '离线目录损坏时制包没有失败'
    } catch {
        if ($_.Exception.Message -notlike '*离线目录校验失败*') { throw }
    }
    if (Test-Path -LiteralPath $brokenKit) { throw '损坏离线目录的 ZIP 被发布了' }
    Write-FixtureFile 'stage/offline/kit/payload/fixture.txt' 'fixture'
    # 源仓库缺少整类技能文档时，制包应在发布前失败，且不能留下目标 ZIP。
    Remove-Item -LiteralPath (Join-Path $project 'docs/skills/demo/demo-中文版.md') -Force
    $rejected = Join-Path $project 'invalid.zip'
    try {
        & $builder -ProjectRoot $project -StagingDir $stage -OutputZip $rejected
        throw '缺少 docs/skills 时制包没有失败'
    } catch {
        if ($_.Exception.Message -notlike '*docs/skills/*') { throw }
    }
    if (Test-Path -LiteralPath $rejected) { throw '错误的 ZIP 被发布了' }
    Write-Output 'web-update package regression: PASS'
} finally {
    if (Test-Path -LiteralPath $project) {
        Remove-Item -LiteralPath $project -Recurse -Force
    }
}
