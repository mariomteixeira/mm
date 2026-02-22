export const metadata = {
  title: 'MM Webhook',
  description: 'WhatsApp webhook endpoint',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
