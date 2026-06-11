import TopNav from './TopNav';
import Sidebar from './Sidebar';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <TopNav />
      {children}
    </div>
  );
}
