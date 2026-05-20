import { useState } from "react";
import { Link } from "react-router";
import { trpc } from "@/providers/trpc";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import {
  Search,
  Bell,
  ChevronRight,
} from "lucide-react";

const routeLabels: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/teams": "Команды",
  "/players": "Игроки",
  "/training": "Тренировки",
  "/matches": "Матчи",
  "/medical": "Медицина",
  "/injuries": "Травмы",
  "/analytics": "Аналитика",
  "/reports": "Отчеты",
  "/notifications": "Уведомления",
  "/settings": "Настройки",
};

export default function Header() {
  const { user } = useCustomAuth();
  const location = window.location.pathname;
  const pageLabel = routeLabels[location] || "";

  const { data: unreadCount } = trpc.notification.getUnreadCount.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user, refetchInterval: 30000 }
  );

  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 lg:left-[240px] right-0 h-14 bg-white dark:bg-[#191a1b] border-b border-gray-200 dark:border-[#2a2b2c] z-20 flex items-center justify-between px-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm ml-8 lg:ml-0">
        <span className="text-gray-500 dark:text-gray-400">FootballManager</span>
        <ChevronRight size={14} className="text-gray-400" />
        <span className="text-gray-900 dark:text-white font-medium">{pageLabel}</span>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="relative">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
          >
            <Search size={18} className="text-gray-500 dark:text-gray-400" />
          </button>
          {searchOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-[#191a1b] rounded-lg shadow-lg border border-gray-200 dark:border-[#2a2b2c] p-3 z-50">
              <input
                type="text"
                placeholder="Поиск..."
                className="w-full h-9 px-3 text-sm bg-gray-50 dark:bg-[#11131a] border border-gray-200 dark:border-[#2a2b2c] rounded-md focus:outline-none focus:border-[#96f7b9] focus:ring-1 focus:ring-[#96f7b9]/20 text-gray-900 dark:text-white placeholder:text-gray-400"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
        >
          <Bell size={18} className="text-gray-500 dark:text-gray-400" />
          {unreadCount && unreadCount > 0 ? (
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount}
            </span>
          ) : null}
        </Link>
      </div>
    </header>
  );
}
