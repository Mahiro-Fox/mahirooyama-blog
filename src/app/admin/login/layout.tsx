// Login page layout - no authentication check
// This layout overrides the parent admin/layout.tsx
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
