import { useState } from "react";
import { Link, useLocation } from "react-router";
import { useTheme } from "@/hooks/useTheme";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import {
  LayoutDashboard,
  Users,
  Calendar,
  Trophy,
  HeartPulse,
  BarChart3,
  FileText,
  Bell,
  Settings,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  LogOut,
  Shield,
  Menu,
  X,
  Stethoscope,
} from "lucide-react";

interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  children?: { label: string; path: string }[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", icon: <LayoutDashboard size={20} />, path: "/dashboard" },
  {
    label: "Команды",
    icon: <Users size={20} />,
    children: [
      { label: "Список команд", path: "/teams" },
      { label: "Игроки", path: "/players" },
    ],
  },
  {
    label: "Тренировки",
    icon: <Calendar size={20} />,
    children: [
      { label: "Расписание", path: "/training" },
    ],
  },
  {
    label: "Матчи",
    icon: <Trophy size={20} />,
    children: [
      { label: "Календарь", path: "/matches" },
    ],
  },
  {
    label: "Медицина",
    icon: <HeartPulse size={20} />,
    children: [
      { label: "Медкарты", path: "/medical" },
      { label: "Травмы", path: "/injuries" },
    ],
  },
  { label: "Аналитика", icon: <BarChart3 size={20} />, path: "/analytics" },
  { label: "Отчеты", icon: <FileText size={20} />, path: "/reports" },
  { label: "Уведомления", icon: <Bell size={20} />, path: "/notifications" },
  { label: "Настройки", icon: <Settings size={20} />, path: "/settings" },
];

export default function Sidebar() {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useCustomAuth();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleExpand = (label: string) => {
    setExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (path: string) => location.pathname === path;
  const isParentActive = (item: NavItem) =>
    item.children?.some((c) => isActive(c.path)) ?? false;

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3 left-3 z-50 p-2 rounded-md bg-[#11131a] text-white lg:hidden"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-full w-[240px] bg-[#11131a] text-[#a1a5ab] flex flex-col z-40 transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-14 border-b border-white/5">
          <div className="w-8 h-8 rounded-lg bg-[#96f7b9] flex items-center justify-center">
            <Shield className="w-5 h-5 text-[#1e2c20]" />
          </div>
          <span className="text-white font-bold text-base">FootballManager</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {navItems.map((item) => (
            <div key={item.label}>
              {item.children ? (
                <>
                  <button
                    onClick={() => toggleExpand(item.label)}
                    className={`w-full flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-white/[0.04] 
                      ${isParentActive(item) ? "text-white border-l-2 border-[#96f7b9] bg-[#1a1d26]" : ""}`}
                  >
                    {item.icon}
                    <span className="flex-1 text-left">{item.label}</span>
                    {expanded[item.label] ? (
                      <ChevronDown size={14} />
                    ) : (
                      <ChevronRight size={14} />
                    )}
                  </button>
                  {expanded[item.label] && (
                    <div className="pl-12 pr-3">
                      {item.children.map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={() => setMobileOpen(false)}
                          className={`block py-2 px-3 text-sm rounded-md transition-colors
                            ${isActive(child.path) ? "text-[#96f7b9] bg-white/[0.04]" : "hover:text-white hover:bg-white/[0.04]"}`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path!}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-5 py-2.5 text-sm transition-colors hover:bg-white/[0.04]
                    ${isActive(item.path!) ? "text-white border-l-2 border-[#96f7b9] bg-[#1a1d26]" : ""}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-white/5 px-4 py-3">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 px-3 py-2 text-sm w-full hover:bg-white/[0.04] rounded-md transition-colors"
          >
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === "dark" ? "Светлая тема" : "Темная тема"}</span>
          </button>

          {user && (
            <div className="mt-3 flex items-center gap-3 px-3">
              <div className="w-8 h-8 rounded-full bg-[#96f7b9]/20 flex items-center justify-center">
                {user.role === "coach" ? (
                  <Users size={14} className="text-[#96f7b9]" />
                ) : (
                  <Stethoscope size={14} className="text-[#96f7b9]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-xs font-medium truncate">{user.name}</p>
                <p className="text-[10px] text-[#a1a5ab] uppercase">
                  {user.role === "coach" ? "Тренер" : "Медперсонал"}
                </p>
              </div>
              <button
                onClick={logout}
                className="p-1.5 hover:bg-white/[0.08] rounded-md transition-colors"
                title="Выйти"
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
