export function ThemeScript() {
  const code = `
    (function () {
      try {
        var stored = localStorage.getItem('taskorga-theme');
        var isDark = stored === 'dark';
        if (isDark) document.documentElement.classList.add('dark');

        var fontSize = localStorage.getItem('taskorga-font-size');
        if (fontSize === 'sm' || fontSize === 'lg') {
          document.documentElement.setAttribute('data-font-size', fontSize);
        }
      } catch (e) {}
    })();
  `;
  // eslint-disable-next-line react/no-danger
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
