/**
 * Inject the page-script payload into the main world via a `<script>` element.
 */
export function injectPageScript(payload: string): void {
  try {
    const script = document.createElement('script');
    script.textContent = payload;
    document.documentElement.appendChild(script);
    script.remove();
  } catch (e) {
    console.error('[yyawf] Page script initialization failed:', e);
    alert(
      '[yyawf] 脚本初始化失败，部分功能可能无法正常工作。请检查控制台获取详细错误信息。\n\n' + e,
    );
  }
}
