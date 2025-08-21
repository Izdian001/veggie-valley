import './globals.css'

export const metadata = {
  title: 'Online Vegetable Vendor',
  description: 'Connect farmers with fresh produce lovers',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
