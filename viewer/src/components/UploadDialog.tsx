/**
 * 单文件 Markdown 上传表单。
 *
 * 对话框仅管理尚未提交的表单状态；真正的上传、目录刷新与导航由 App 负责。
 * 服务端发生同名冲突时不重置 file input，让用户直接修改保存文件名重试。
 */
import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import type { UploadTarget } from '../../shared/types'

export interface UploadGroupOption {
  id: string
  title: string
}

interface UploadDialogProps {
  groups: UploadGroupOption[]
  onSubmit: (file: File, targetName: string, target: UploadTarget) => Promise<void>
  onClose: () => void
}

const NEW_GROUP_ID = '__new__'
const MAX_BYTES = 5 * 1024 * 1024

/** 只显示用户有意义的文件大小，不展示浏览器提供的本地绝对路径。 */
function fileSizeLabel(size: number): string {
  return size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KiB`
}

export function UploadDialog({ groups, onSubmit, onClose }: UploadDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const busyRef = useRef(false)
  const [file, setFile] = useState<File | null>(null)
  const [targetName, setTargetName] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('ai-docs')
  const [newGroup, setNewGroup] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    dialog.showModal()
    fileInputRef.current?.focus()
    return () => { if (dialog.open) dialog.close() }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    // ref 在 React 批量更新 busy 之前立即生效，阻止双击或回车连发重复写入。
    if (busyRef.current) return
    setError(null)
    if (!file) {
      setError('请选择一个 .md 文件')
      fileInputRef.current?.focus()
      return
    }
    if (!file.name.endsWith('.md')) {
      setError('源文件必须是 .md 文件')
      fileInputRef.current?.focus()
      return
    }
    if (file.size > MAX_BYTES) {
      setError('文件不得超过 5 MiB')
      fileInputRef.current?.focus()
      return
    }
    if (!targetName.endsWith('.md')) {
      setError('保存文件名必须以 .md 结尾')
      document.getElementById('upload-target-name')?.focus()
      return
    }
    if (selectedGroup === NEW_GROUP_ID && !newGroup.trim()) {
      setError('请输入新分组名称')
      document.getElementById('upload-new-group')?.focus()
      return
    }

    const target: UploadTarget = selectedGroup === NEW_GROUP_ID
      ? { kind: 'new', name: newGroup }
      : { kind: 'existing', groupId: selectedGroup }
    busyRef.current = true
    setBusy(true)
    try {
      await onSubmit(file, targetName, target)
      onClose()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '保存文档失败，请重试')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <dialog ref={dialogRef} className="upload-dialog" aria-labelledby="upload-dialog-title"
      aria-describedby="upload-dialog-description" onCancel={(event) => {
        // 原生 dialog 提供 Esc、背景惰性与焦点圈定；上传过程中暂不允许关闭。
        event.preventDefault()
        if (!busyRef.current) onClose()
      }}>
      <form className="upload-form" onSubmit={handleSubmit} noValidate>
        <header className="upload-dialog-header">
          <h2 id="upload-dialog-title">上传 Markdown</h2>
          <p id="upload-dialog-description">保存到项目文档目录，之后可在目录和搜索中找到。</p>
        </header>

        <div className="upload-field">
          <label htmlFor="upload-file">选择 Markdown 文件</label>
          <input ref={fileInputRef} id="upload-file" type="file" accept=".md,text/markdown"
            aria-describedby="upload-file-help" disabled={busy} onChange={(event) => {
              const selected = event.target.files?.[0] ?? null
              setFile(selected)
              setTargetName(selected?.name ?? '')
              setError(null)
            }} />
          <small id="upload-file-help">每次一份 .md 文件，最大 5 MiB</small>
          <span className="upload-file-summary" aria-live="polite">
            {file ? `${file.name} · ${fileSizeLabel(file.size)}` : '尚未选择文件'}
          </span>
        </div>

        <div className="upload-field">
          <label htmlFor="upload-group">保存到分组</label>
          <select id="upload-group" value={selectedGroup} disabled={busy}
            onChange={(event) => { setSelectedGroup(event.target.value); setError(null) }}>
            {groups.map((group) => <option value={group.id} key={group.id}>{group.title}</option>)}
            <option value={NEW_GROUP_ID}>新建分组…</option>
          </select>
        </div>

        {selectedGroup === NEW_GROUP_ID && (
          <div className="upload-field">
            <label htmlFor="upload-new-group">新分组名称</label>
            <input id="upload-new-group" type="text" value={newGroup} maxLength={120}
              disabled={busy} autoComplete="off" onChange={(event) => {
                setNewGroup(event.target.value)
                setError(null)
              }} />
          </div>
        )}

        <div className="upload-field">
          <label htmlFor="upload-target-name">保存文件名</label>
          <input id="upload-target-name" type="text" value={targetName} maxLength={120}
            disabled={busy} autoComplete="off" onChange={(event) => {
              setTargetName(event.target.value)
              setError(null)
            }} />
          <small>同名文件不会被覆盖；冲突时可在这里改名。</small>
        </div>

        <div className="upload-feedback" aria-live="polite">
          {busy && <span role="status">正在保存文档…</span>}
          {error && <span role="alert" className="upload-error">{error}</span>}
        </div>
        <footer className="upload-actions">
          <button type="button" className="ghost-btn" disabled={busy} onClick={onClose}>取消</button>
          <button type="submit" className="upload-submit" disabled={busy} aria-busy={busy}>
            保存文档
          </button>
        </footer>
      </form>
    </dialog>
  )
}
