import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AnimatedBackdrop from "./AnimatedBackdrop";

export default function DashboardLayout({ children }) {
  return (
    <div className="flex min-h-[calc(100vh-1px)] relative">
      <AnimatedBackdrop />
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <div className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
          <div className="max-w-[1400px] mx-auto space-y-6 route-fade-in">{children}</div>
        </div>
      </div>
    </div>
  );
}
