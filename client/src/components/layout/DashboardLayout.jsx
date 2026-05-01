import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import AnimatedBackdrop from "./AnimatedBackdrop";

export default function DashboardLayout({ children }) {
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem("sidebar_collapsed") === "true"
  );
  const toggle = () =>
    setCollapsed((v) => {
      localStorage.setItem("sidebar_collapsed", String(!v));
      return !v;
    });

  return (
    <div className="flex min-h-[calc(100vh-1px)] relative">
      <AnimatedBackdrop />
      <Sidebar collapsed={collapsed} onToggle={toggle} />
      <div className="flex-1 min-w-0 flex flex-col">
        <TopBar />
        <div className="flex-1 px-3 sm:px-4 lg:px-5 py-4">
          <div className="max-w-[1500px] mx-auto space-y-3 route-fade-in">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
