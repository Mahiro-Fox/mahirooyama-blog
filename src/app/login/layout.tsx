// Login page - independent layout without site header/footer
export const metadata = {
  title: '管理后台登录',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-muted/30 flex min-h-screen">
      <main className="flex-1">{children}</main>
    </div>
  );
}
