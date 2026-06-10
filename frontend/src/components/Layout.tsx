import TopNav from './TopNav';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-container-low flex flex-col">
      <TopNav />
      <div className="flex flex-1 pt-16 pb-16 md:pb-0">
        <Sidebar />
        <main className="flex-1 md:ml-64 p-4 md:p-6 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
