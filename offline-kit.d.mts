/** 与离线校验模块保持同名，供查看器 TypeScript 代码引用。 */
export interface OfflineKitManifest {
  format: number
  targets: Array<{ agent: string; platform: string; bundles: string[] }>
  bundles: Array<{ name: string; suite?: string; method: string; version: string; source: string; license: string; path?: string }>
  files: Array<{ path: string; size: number; sha256: string }>
}

export function verifyOfflineKit(root: string, options?: { snapshot?: boolean | 'disk' }): Promise<{
  manifest: OfflineKitManifest
  paths: string[]
  contents?: Map<string, Buffer>
  snapshotRoot?: string
  dispose?: () => Promise<void>
}>
