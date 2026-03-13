// Login page has its own full-screen layout — no sidebar
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-slate-900 overflow-auto" style={{ marginLeft: 0 }}>
      {children}
    </div>
  );
}
