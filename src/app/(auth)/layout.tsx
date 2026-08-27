export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 items-center justify-center bg-bg px-6 py-16 text-ink">
      {children}
    </div>
  );
}
