import Layout from "@/components/layout/Layout";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { trpc } from "@/providers/trpc";
import { Bell, Check, AlertTriangle, XCircle, Info, Trash2 } from "lucide-react";
import { toast } from "sonner";

const typeConfig = {
  warning: { icon: AlertTriangle, color: "text-amber-500", border: "border-l-amber-500", bg: "bg-amber-500/5" },
  error: { icon: XCircle, color: "text-red-500", border: "border-l-red-500", bg: "bg-red-500/5" },
  info: { icon: Info, color: "text-blue-500", border: "border-l-blue-500", bg: "bg-blue-500/5" },
};

export default function Notifications() {
  const { user } = useCustomAuth();
  const utils = trpc.useUtils();

  const { data: notifications, isLoading } = trpc.notification.list.useQuery(
    user?.id ? { userId: user.id } : undefined,
    { enabled: !!user, refetchInterval: 30000 }
  );

  const markAsRead = trpc.notification.markAsRead.useMutation({
    onSuccess: () => { utils.notification.list.invalidate(); utils.notification.getUnreadCount.invalidate(); },
  });

  const markAllAsRead = trpc.notification.markAllAsRead.useMutation({
    onSuccess: () => { utils.notification.list.invalidate(); utils.notification.getUnreadCount.invalidate(); toast.success("Все уведомления прочитаны"); },
  });

  const deleteMutation = trpc.notification.delete.useMutation({
    onSuccess: () => { utils.notification.list.invalidate(); utils.notification.getUnreadCount.invalidate(); toast.success("Уведомление удалено"); },
  });

  return (
    <Layout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Уведомления</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Системные уведомления и аномалии</p>
        </div>
        {notifications && notifications.some((n) => !n.isRead) && (
          <button onClick={() => user && markAllAsRead.mutate({ userId: user.id })}
            className="flex items-center gap-2 h-10 px-4 bg-[#1f2937] hover:bg-[#374151] text-white text-sm font-medium rounded-md"
          >
            <Check size={16} /> Отметить все прочитанными
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="bg-white dark:bg-[#191a1b] rounded-[10px] h-20 animate-pulse" />)}
        </div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((note) => {
            const config = typeConfig[note.type as keyof typeof typeConfig] || typeConfig.info;
            const Icon = config.icon;
            return (
              <div key={note.id} className={`bg-white dark:bg-[#191a1b] rounded-[10px] shadow-sm p-5 border-l-2 ${config.border} ${!note.isRead ? config.bg : ""}`}>
                <div className="flex items-start gap-3">
                  <Icon size={18} className={`mt-0.5 flex-shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className={`text-sm font-semibold ${!note.isRead ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"}`}>
                        {note.title}
                      </h3>
                      {!note.isRead && <span className="w-2 h-2 rounded-full bg-[#96f7b9]" />}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{note.message}</p>
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(note.createdAt).toLocaleDateString("ru-RU")} {new Date(note.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {!note.isRead && (
                      <button onClick={() => markAsRead.mutate({ id: note.id })}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-md transition-colors"
                        title="Отметить прочитанным"
                      >
                        <Check size={16} className="text-gray-400" />
                      </button>
                    )}
                    <button onClick={() => { if (confirm("Удалить уведомление?")) deleteMutation.mutate({ id: note.id }); }}
                      className="p-2 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-md transition-colors"
                      title="Удалить"
                    >
                      <Trash2 size={16} className="text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#191a1b] rounded-[10px] p-12 text-center">
          <Bell className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Нет уведомлений</h3>
          <p className="text-sm text-gray-500 mt-1">Все в порядке</p>
        </div>
      )}
    </Layout>
  );
}
