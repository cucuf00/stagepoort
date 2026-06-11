export const metadata = {
  title: 'Stagepoort',
  description: 'Het digitale stageplatform voor MBO-scholen',
}

export default function RootLayout({ children }) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  )
}
