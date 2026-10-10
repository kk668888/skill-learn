/**
 * 侧边栏目录树（递归渲染）。
 * 纯展示组件：展开状态和选中状态都由父级（App）管理，方便做"打开文档自动展开祖先"。
 */
import type { TreeNode } from '../../shared/types'
import { cx } from '../lib/cx'

interface TreeViewProps {
  nodes: TreeNode[]
  currentPath: string | null
  expanded: Set<string>
  onSelect: (path: string) => void
  onToggle: (id: string) => void
}

export function TreeView({ nodes, currentPath, expanded, onSelect, onToggle }: TreeViewProps) {
  return (
    <div className="tree" role="tree">
      {nodes.map((node) => (
        <NodeView
          key={nodeKey(node)}
          node={node}
          depth={0}
          currentPath={currentPath}
          expanded={expanded}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </div>
  )
}

function nodeKey(node: TreeNode): string {
  return node.type === 'file' ? node.path : node.id
}

interface NodeViewProps {
  node: TreeNode
  depth: number
  currentPath: string | null
  expanded: Set<string>
  onSelect: (path: string) => void
  onToggle: (id: string) => void
}

function NodeView({ node, depth, currentPath, expanded, onSelect, onToggle }: NodeViewProps) {
  // 叶子：文件
  if (node.type === 'file') {
    const active = node.path === currentPath
    return (
      <button
        type="button"
        className={cx('tree-item', 'tree-file', active && 'active')}
        style={{ paddingLeft: depth * 14 + 10 }}
        title={node.path}
        onClick={() => onSelect(node.path)}
      >
        {node.title}
      </button>
    )
  }

  // 分支：套件 / 技能 / 文件夹 / 分组
  const open = expanded.has(node.id)
  const branchClass =
    node.type === 'suite' ? 'tree-suite' : node.type === 'skill' ? 'tree-skill' : 'tree-folder'
  return (
    <div>
      <button
        type="button"
        className={cx('tree-item', 'tree-branch', branchClass, open && 'open')}
        style={{ paddingLeft: depth * 14 + 8 }}
        onClick={() => onToggle(node.id)}
      >
        <span className="chevron" aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span className="tree-label">{node.title}</span>
      </button>
      {open &&
        (node.children.length > 0 ? (
          <div className="tree-children">
            {node.children.map((child) => (
              <NodeView
                key={nodeKey(child)}
                node={child}
                depth={depth + 1}
                currentPath={currentPath}
                expanded={expanded}
                onSelect={onSelect}
                onToggle={onToggle}
              />
            ))}
          </div>
        ) : (
          <div className="tree-empty" style={{ paddingLeft: (depth + 1) * 14 + 10 }}>
            （空）
          </div>
        ))}
    </div>
  )
}
