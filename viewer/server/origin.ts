/**
 * 容器访问地址的启动期校验。
 *
 * 部署者显式给出浏览器实际使用的 HTTP Origin；服务端不能把请求的 Host
 * 当作可信配置，否则攻击者可通过自定义 Host 伪造一个“同源”请求。
 */
export function requirePublicOrigin(value: string | undefined): string {
  if (!value) throw new Error('缺少 VIEWER_PUBLIC_ORIGIN，请填写局域网访问地址')

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error('VIEWER_PUBLIC_ORIGIN 必须是完整的 HTTP Origin')
  }
  if (url.protocol !== 'http:') {
    throw new Error('VIEWER_PUBLIC_ORIGIN 当前只支持 HTTP 局域网地址')
  }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('VIEWER_PUBLIC_ORIGIN 只能包含协议、主机和端口，不得含路径或参数')
  }
  return url.origin
}
