/**
 * RTK 的用户级 Windows 安装策略。文件状态与用户 PATH 分开检查，使复制成功
 * 但注册表写入失败时可以安全重试，也让 --dry-run 保持真正只读。
 */
import { spawnSync } from 'node:child_process';
import { cp, lstat, mkdir, readFile, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

const FILES = ['LICENSE', 'LICENSE-ENGINE', 'rtk.exe'];

/** Windows PATH 不区分大小写；末尾分隔符不应制造重复条目。 */
function samePath(left, right) {
  // 注册表 PATH 常以 %LOCALAPPDATA% 等形式保存；比较时展开，但保留原字串。
  const normalize = (value) => path.resolve(value.replace(/%([^%]+)%/g, (match, name) =>
    process.env[name] ?? match)).replace(/[\\/]+$/, '').toLowerCase();
  return normalize(left) === normalize(right);
}

function hasPath(userPath, target) {
  return userPath.split(path.delimiter).filter(Boolean).some((entry) => samePath(entry, target));
}

/** 仅允许包内的三个已校验文件，既有目录多一个文件也不推定属于本发行包。 */
async function targetState(source, target) {
  const info = await lstat(target).catch(() => null);
  if (!info) return 'missing';
  if (!info.isDirectory() || info.isSymbolicLink()) return 'conflict';
  const names = (await readdir(target)).sort();
  if (names.join('\n') !== FILES.join('\n')) return 'conflict';
  for (const name of FILES) {
    const file = path.join(target, name);
    const stat = await lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) return 'conflict';
    if (!(await readFile(file)).equals(await readFile(path.join(source, name)))) return 'conflict';
  }
  return 'identical';
}

/** 供安装器调用的只读状态函数；effectivePath 用于发现先于目标解析的其他 RTK。 */
export async function inspectRtkInstall(source, target, pathAccess, effectivePath = process.env.PATH ?? '') {
  const state = await targetState(source, target);
  const userPath = pathAccess.read();
  if (state === 'conflict') return { kind: 'conflict', detail: `目标目录已有其他内容：${target}` };
  for (const entry of effectivePath.split(path.delimiter).filter(Boolean)) {
    if (samePath(entry, target)) continue;
    if ((await lstat(path.join(entry, 'rtk.exe')).catch(() => null))?.isFile()) {
      return { kind: 'conflict', detail: `PATH 中已有其他 RTK：${path.join(entry, 'rtk.exe')}` };
    }
  }
  if (state === 'identical' && hasPath(userPath, target)) {
    return { kind: 'skip', detail: `本包 RTK 已安装，用户 PATH 已包含 ${target}` };
  }
  const copy = state === 'missing' ? `复制 RTK 与许可证到 ${target}；` : '';
  return { kind: 'ready', detail: `${copy}用户 PATH 将添加 ${target}；新终端生效` };
}

/** 写 PATH 前重新读取，避免预览与真正执行之间状态变化导致重复登记。 */
export async function installRtk(source, target, pathAccess, effectivePath = '') {
  const state = await inspectRtkInstall(source, target, pathAccess, effectivePath);
  if (state.kind === 'conflict') throw new Error(state.detail);
  if (state.kind === 'skip') return;
  if (await targetState(source, target) === 'missing') {
    await mkdir(path.dirname(target), { recursive: true });
    await cp(source, target, { recursive: true, force: false, errorOnExist: true });
  }
  const current = pathAccess.read();
  // 只追加目标，不重排或删除原有条目（包括空段和结尾分隔符）。
  if (!hasPath(current, target)) pathAccess.write(`${current}${current && !current.endsWith(path.delimiter) ? path.delimiter : ''}${target}`);
}

/** 调用 PowerShell 的 .NET 注册表接口，只读取或修改当前用户 PATH。 */
function powershell(script) {
  // Windows PowerShell 默认输出代码页可能不是 UTF-8，强制编码以保留中文路径。
  const command = "$ErrorActionPreference='Stop'; [Console]::OutputEncoding = [Text.UTF8Encoding]::new($false); " + script;
  const encoded = Buffer.from(command, 'utf16le').toString('base64');
  const result = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { encoding: 'utf8' });
  if (result.error || result.status !== 0) throw new Error(`读取或写入用户 PATH 失败：${result.stderr || result.error?.message}`);
  return result.stdout;
}

export const windowsUserPath = {
  read() {
    // GetEnvironmentVariable 会展开 REG_EXPAND_SZ，回写后丢失 %USERPROFILE% 原文。
    // 直接从注册表读取未经展开的值，避免改变用户已有 PATH 的语义。
    return powershell("$key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $false); if ($null -ne $key) { try { $raw = $key.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames); [Console]::Write([string]$raw) } finally { $key.Dispose() } }");
  },
  write(value) {
    // PATH 内容用 Base64 传入脚本，保留原注册表类型和变量引用。
    const bytes = Buffer.from(value, 'utf8').toString('base64');
    powershell(`$value = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${bytes}')); $key = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey('Environment'); try { $kind = if ($key.GetValueNames() -contains 'Path') { $key.GetValueKind('Path') } else { [Microsoft.Win32.RegistryValueKind]::ExpandString }; if ($kind -ne [Microsoft.Win32.RegistryValueKind]::String -and $kind -ne [Microsoft.Win32.RegistryValueKind]::ExpandString) { throw '用户 PATH 的注册表类型无法安全修改' }; $key.SetValue('Path', $value, $kind) } finally { $key.Dispose() }`);
    // 写注册表后通知 Explorer 等长驻进程更新用户环境。通知失败不回滚已写的
    // PATH：用户重新登录仍会生效，提示比把已成功的安装当作未写入更准确。
    const broadcast = `$source = @'
using System;
using System.Runtime.InteropServices;
public static class RtkEnvironmentBroadcast {
  [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
  public static extern IntPtr SendMessageTimeout(IntPtr hwnd, uint message, IntPtr wParam, string lParam, uint flags, uint timeout, out IntPtr result);
}
'@
Add-Type -TypeDefinition $source
[IntPtr]$result = [IntPtr]::Zero
$sent = [RtkEnvironmentBroadcast]::SendMessageTimeout([IntPtr]0xffff, 0x1a, [IntPtr]::Zero, 'Environment', 0x2, 2000, [ref]$result)
if ($sent -eq [IntPtr]::Zero) { throw 'Windows 未确认环境变更通知' }`;
    try { powershell(broadcast); }
    catch (error) { console.warn(`用户 PATH 已写入，但环境变更通知失败；重新登录后生效：${error.message}`); }
  },
};

export function rtkUserDestination() {
  return path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Programs', 'rtk');
}
