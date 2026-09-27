import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { apiClient } from '../services/api.ts';
import { NotificationItem } from '../types/index.ts';

export const NotificationsPage: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    if (user) loadNotifications();
  }, [user]);

  const loadNotifications = async () => {
    try {
      const res = await apiClient.getMyNotifications();
      setNotifications(res.notifications);
    } catch (err) {
      console.error('Error loading notifications:', err);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      await apiClient.markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" />
            <span>Centro de Alertas</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Notificações</h1>
          <p className="text-xs text-slate-400 mt-1">
            Alertas sobre as suas ordens de compra, venda, depósitos e atualizações de conta.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-xs text-slate-500">
            Nenhuma notificação no momento.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && markAsRead(n.id)}
              className={`p-4 rounded-xl border transition cursor-pointer flex items-start justify-between gap-3 ${
                n.isRead
                  ? 'bg-slate-900/60 border-slate-800 text-slate-400'
                  : 'bg-slate-800/90 border-emerald-500/40 text-slate-200 shadow-md'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-white">{n.title}</h4>
                  {!n.isRead && (
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  )}
                </div>
                <p className="text-xs text-slate-300">{n.message}</p>
                <span className="text-[10px] text-slate-500 block pt-1">
                  {new Date(n.createdAt).toLocaleString('pt-AO')}
                </span>
              </div>

              {!n.isRead && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    markAsRead(n.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-emerald-400 rounded-lg hover:bg-slate-700"
                  title="Marcar como lida"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
