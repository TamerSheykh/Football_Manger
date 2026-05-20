import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-[#f3f4f6] dark:bg-[#0c0d0e]">
      <Sidebar />
      <Header />
      <main className="lg:ml-[240px] pt-14 min-h-screen">
        <div className="p-4 lg:p-6 max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
