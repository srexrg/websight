export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="text-gray-100 antialiased">
      {children}
    </div>
  );
}