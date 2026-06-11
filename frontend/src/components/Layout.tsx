import TopNav from './TopNav';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface">
      <Sidebar />
      <TopNav />
      {/* Offset content by sidebar width (280px) and top nav height (64px) */}
      <main className="ml-[280px] pt-16 min-h-screen flex flex-col">
        {children}
      </main>
    </div>
  );
}
