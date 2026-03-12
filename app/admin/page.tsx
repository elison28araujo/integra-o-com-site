'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  Users, 
  MousePointer2, 
  LogOut,
  RefreshCw,
  LayoutDashboard,
  Activity,
  Globe,
  Smartphone,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ActivityEvent {
  id: string;
  type: 'Visita' | 'Clique';
  target: string;
  time: string;
  device: string;
  timestamp: number;
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [stats, setStats] = useState({
    totalVisits: 0,
    totalClicks: 0,
    liveUsers: 0
  });
  const router = useRouter();

  const addActivity = (event: ActivityEvent) => {
    setActivities(prev => [event, ...prev].slice(0, 10));
  };

  const parseUserAgent = (ua?: string) => {
    if (!ua) return 'Desconhecido';
    if (ua.includes('iPhone') || ua.includes('Android')) return 'Mobile';
    return 'Desktop';
  };

  useEffect(() => {
    const checkUser = async () => {
      if (!supabase) {
        setLoading(false);
        return;
      }
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/admin/login');
      } else {
        setUser(user);
        fetchInitialData();
        setupRealtime();
        setLoading(false);
      }
    };

    const fetchInitialData = async () => {
      if (!supabase) return;

      // Fetch total visits
      const { count: visitCount } = await supabase
        .from('visits')
        .select('*', { count: 'exact', head: true });

      // Fetch total clicks
      const { count: clickCount } = await supabase
        .from('clicks')
        .select('*', { count: 'exact', head: true });

      // Fetch recent visits
      const { data: recentVisits } = await supabase
        .from('visits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch recent clicks
      const { data: recentClicks } = await supabase
        .from('clicks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      const initialActivities: ActivityEvent[] = [
        ...(recentVisits || []).map(v => ({
          id: v.id,
          type: 'Visita' as const,
          target: v.referrer || 'Direto',
          time: new Date(v.created_at).toLocaleTimeString(),
          device: parseUserAgent(v.user_agent),
          timestamp: new Date(v.created_at).getTime()
        })),
        ...(recentClicks || []).map(c => ({
          id: c.id,
          type: 'Clique' as const,
          target: c.link_id || 'Link',
          time: new Date(c.created_at).toLocaleTimeString(),
          device: parseUserAgent(c.user_agent),
          timestamp: new Date(c.created_at).getTime()
        }))
      ].sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);

      setStats({
        totalVisits: visitCount || 0,
        totalClicks: clickCount || 0,
        liveUsers: Math.floor(Math.random() * 5) + 1 // Simulated live users
      });
      setActivities(initialActivities);
    };

    const setupRealtime = () => {
      if (!supabase) return;

      const channel = supabase
        .channel('realtime-stats')
        .on('postgres_changes', { event: 'INSERT', table: 'visits', schema: 'public' }, (payload) => {
          const newVisit = payload.new;
          setStats(prev => ({ ...prev, totalVisits: prev.totalVisits + 1 }));
          addActivity({
            id: newVisit.id,
            type: 'Visita',
            target: newVisit.referrer || 'Direto',
            time: new Date().toLocaleTimeString(),
            device: parseUserAgent(newVisit.user_agent),
            timestamp: Date.now()
          });
        })
        .on('postgres_changes', { event: 'INSERT', table: 'clicks', schema: 'public' }, (payload) => {
          const newClick = payload.new;
          setStats(prev => ({ ...prev, totalClicks: prev.totalClicks + 1 }));
          addActivity({
            id: newClick.id,
            type: 'Clique',
            target: newClick.link_id || 'Link',
            time: new Date().toLocaleTimeString(),
            device: parseUserAgent(newClick.user_agent),
            timestamp: Date.now()
          });
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    checkUser();
  }, [router]);

  const handleLogout = async () => {
    if (supabase) {
      await supabase.auth.signOut();
      router.push('/admin/login');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f8f8] flex items-center justify-center">
        <RefreshCw className="animate-spin text-zinc-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] text-zinc-900 font-sans">
      {/* Header */}
      <nav className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white">
            <Activity size={20} />
          </div>
          <div>
            <h1 className="font-bold tracking-tight">Elison Bio Analytics</h1>
            <div className="flex items-center space-x-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <p className="text-[10px] text-zinc-400 uppercase tracking-widest font-mono">Monitoramento em Tempo Real</p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={handleLogout}
            className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-500 hover:text-red-600"
          >
            <LogOut size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-6 space-y-8">
        {/* Real-time Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Visitas Totais', value: stats.totalVisits, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Cliques Totais', value: stats.totalClicks, icon: MousePointer2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Usuários Online', value: stats.liveUsers, icon: Globe, color: 'text-orange-600', bg: 'bg-orange-50' },
          ].map((item, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-zinc-200 shadow-sm flex flex-col items-center text-center"
            >
              <div className={`w-14 h-14 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center mb-4`}>
                <item.icon size={28} />
              </div>
              <p className="text-sm text-zinc-500 font-medium mb-1 uppercase tracking-wider">{item.label}</p>
              <h3 className="text-4xl font-bold tracking-tighter">{item.value}</h3>
            </motion.div>
          ))}
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white rounded-[2.5rem] border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-zinc-100 flex items-center justify-between">
            <h3 className="font-bold text-xl tracking-tight">Fluxo de Atividade</h3>
            <div className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-bold uppercase tracking-widest text-zinc-500">
              Live Feed
            </div>
          </div>
          
          <div className="divide-y divide-zinc-50">
            <AnimatePresence initial={false}>
              {activities.length > 0 ? (
                activities.map((event) => (
                  <motion.div 
                    key={event.id}
                    initial={{ opacity: 0, height: 0, x: -20 }}
                    animate={{ opacity: 1, height: 'auto', x: 0 }}
                    exit={{ opacity: 0, height: 0, x: 20 }}
                    className="p-6 flex items-center justify-between hover:bg-zinc-50/50 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${event.type === 'Visita' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'}`}>
                        {event.type === 'Visita' ? <Users size={18} /> : <MousePointer2 size={18} />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm tracking-tight">{event.type}</span>
                          <span className="text-zinc-300">•</span>
                          <span className="text-xs text-zinc-500 font-medium">{event.target}</span>
                        </div>
                        <div className="flex items-center space-x-2 mt-0.5">
                          <span className="text-[10px] text-zinc-400 font-mono">{event.time}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-zinc-400">
                      {event.device === 'Mobile' ? <Smartphone size={14} /> : <Monitor size={14} />}
                      <span className="text-[10px] font-bold uppercase tracking-wider">{event.device}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-20 text-center text-zinc-400">
                  <RefreshCw className="animate-spin mx-auto mb-4 opacity-20" size={32} />
                  <p className="text-sm font-medium">Aguardando atividade...</p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
}
