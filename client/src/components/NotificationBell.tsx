import { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type NotifItem = {
  id: number;
  notificationNumber: string;
  payerName: string;
  amount: string;
  currencyCode: string;
  createdAt: number;
};

const POLL_MS = 30_000;
const LS_KEY = "notif_last_ts";

function getInitialTs() {
  try { return parseInt(localStorage.getItem(LS_KEY) || "0") || Date.now() - 60_000; }
  catch { return Date.now() - 60_000; }
}

export default function NotificationBell() {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>([]);
  const [unread, setUnread] = useState(0);
  const lastTsRef = useRef(getInitialTs());

  const { refetch } = trpc.office.getNewSince.useQuery(
    { sinceTs: lastTsRef.current },
    { enabled: false }
  );

  const poll = useCallback(async () => {
    try {
      const res = await refetch();
      const data = res.data as NotifItem[] | undefined;
      if (!data || data.length === 0) return;
      const newest = Math.max(...data.map((r) => r.createdAt));
      lastTsRef.current = newest + 1;
      try { localStorage.setItem(LS_KEY, String(lastTsRef.current)); } catch {}
      setItems((prev) => {
        const ids = new Set(prev.map((p) => p.id));
        const fresh = data.filter((d) => !ids.has(d.id));
        return [...fresh, ...prev].slice(0, 30);
      });
      setUnread((n) => n + data.length);
      // نغمة تنبيه بسيطة
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = 880;
        gain.gain.setValueAtTime(0.07, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start(); osc.stop(ctx.currentTime + 0.25);
      } catch {}
    } catch {}
  }, [refetch]);

  useEffect(() => {
    poll();
    const timer = setInterval(poll, POLL_MS);
    return () => clearInterval(timer);
  }, [poll]);

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setUnread(0); }}>
      <PopoverTrigger asChild>
        <button className="relative h-9 w-9 rounded-lg flex items-center justify-center hover:bg-accent/50 transition-colors">
          <Bell className="h-5 w-5 text-slate-600" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end" dir="rtl">
        <div className="p-3 border-b flex items-center justify-between">
          <p className="font-semibold text-sm">الإشعارات</p>
          {items.length > 0 && (
            <Button size="sm" variant="ghost" className="text-xs h-6" onClick={() => setItems([])}>
              مسح الكل
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-slate-400 text-sm">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              لا توجد إشعارات جديدة
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                className="w-full text-right px-3 py-2.5 border-b hover:bg-slate-50 transition-colors block"
                onClick={() => { setLocation(`/admin/transfers/${item.id}`); setOpen(false); }}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-sm text-slate-900 truncate">{item.payerName}</span>
                  <Badge variant="outline" className="font-mono text-xs shrink-0">
                    {item.amount} {item.currencyCode}
                  </Badge>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs text-slate-500 font-mono">{item.notificationNumber}</span>
                  <span className="text-xs text-slate-400">
                    {new Date(item.createdAt).toLocaleTimeString("ar-SA", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="p-2 border-t bg-slate-50 text-center">
          <p className="text-xs text-slate-400">تحديث تلقائي كل 30 ثانية</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
