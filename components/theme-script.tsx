export function ThemeScript() {
  const code = `
    (function () {
      try {
        var stored = localStorage.getItem('taskorga-theme');
        var isDark = stored === 'dark';
        if (isDark) document.documentElement.classList.add('dark');
      } catch (e) {}
    })();
  `;
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
