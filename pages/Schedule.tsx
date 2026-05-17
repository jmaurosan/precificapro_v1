
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Hammer,
  Info,
  Plus
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabaseClient';

interface ProjectTimeline {
  id: string;
  name: string;
  client: string;
  startMonth: number; // 0-11
  endMonth: number;   // 0-11
  progress: number;
  status: 'on-track' | 'delayed' | 'completed';
}

const Schedule: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectTimeline[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentYear] = useState(new Date().getFullYear());
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          clients (nome)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const timelineProjects: ProjectTimeline[] = data.map(p => {
          const startDate = p.start_date ? new Date(p.start_date) : new Date(p.created_at);
          const startMonth = startDate.getMonth();

          // Estimativa de 4 meses se não houver prazo (fake logic for visualization)
          // Se houver deadline no banco, usaria aqui.
          const endMonth = (startMonth + 4) % 12;

          const total = Number(p.total_budget || 0);
          const spent = Number(p.spent_amount || 0);
          const progress = total > 0 ? Math.round((spent / total) * 100) : 0;

          return {
            id: p.id,
            name: p.name,
            client: p.clients?.nome || 'Cliente',
            startMonth,
            endMonth: endMonth < startMonth ? 11 : endMonth, // Simplificação para visualização anual
            progress: Math.min(progress, 100),
            status: spent > total ? 'delayed' : 'on-track' // Simplificação de status
          };
        });
        setProjects(timelineProjects);
      }
    } catch (error) {
      console.error('Erro ao buscar cronograma:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentMonth = new Date().getMonth();

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Cronograma de Obras</h1>
          <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">Gestão de prazos e alocação de equipes por período.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex p-1 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm">
            <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"><ChevronLeft size={20} /></button>
            <span className="px-4 py-2 text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center">{currentYear}</span>
            <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"><ChevronRight size={20} /></button>
          </div>
          <button className="flex items-center gap-2 px-6 py-3.5 bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-teal-600/20 active:scale-95 transition-all">
            <Plus size={20} /> <span className="hidden sm:inline">Planejar Obra</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Timeline Header */}
        <div className="grid grid-cols-12 border-b border-gray-50 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
          {months.map((month, idx) => (
            <div
              key={month}
              className={`py-4 text-center border-r border-gray-100 dark:border-gray-800 last:border-0 ${idx === currentMonth ? 'bg-teal-50/50 dark:bg-teal-900/20' : ''}`}
            >
              <span className={`text-[10px] font-black uppercase tracking-widest ${idx === currentMonth ? 'text-teal-600' : 'text-gray-400'}`}>
                {month}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline Content */}
        <div className="relative">
          {projects.map((project) => (
            <div
              key={project.id}
              onClick={() => navigate(`/projects/${project.id}/finances`)}
              className="group border-b border-gray-50 dark:border-gray-800 last:border-0 p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2 px-4 mt-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${project.status === 'delayed' ? 'bg-rose-50 text-rose-500' : 'bg-teal-50 text-teal-600'} dark:bg-gray-800`}>
                  <Hammer size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-gray-900 dark:text-white leading-none">{project.name}</h4>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter mt-1">{project.client}</p>
                </div>
              </div>

              <div className="grid grid-cols-12 h-10 relative">
                {/* Linha de fundo para grade */}
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className={`h-full border-r border-gray-50 dark:border-gray-800/50 last:border-0 ${i === currentMonth ? 'bg-teal-50/20 dark:bg-teal-900/10' : ''}`} />
                ))}

                {/* Barra da Obra */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 h-5 rounded-full transition-all duration-700 flex items-center px-3 overflow-hidden shadow-sm"
                  style={{
                    left: `${(project.startMonth / 12) * 100}%`,
                    width: `${((project.endMonth - project.startMonth + 1) / 12) * 100}%`,
                    backgroundColor: project.status === 'delayed' ? '#f43f5e' : '#3b66f5'
                  }}
                >
                  <div
                    className="absolute inset-0 bg-white/20 transition-all duration-1000"
                    style={{ width: `${project.progress}%` }}
                  />
                  <span className="relative z-10 text-[8px] font-black text-white uppercase tracking-widest">
                    {project.progress}%
                  </span>
                </div>
              </div>
            </div>
          ))}

          {/* Current Month Indicator Line */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-teal-500 z-10 pointer-events-none"
            style={{ left: `${((currentMonth + 0.5) / 12) * 100}%` }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-teal-500 text-white text-[8px] font-black rounded-b-md whitespace-nowrap">
              HOJE
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Info size={20} className="text-teal-600" /> Próximas Entregas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.filter(p => p.progress > 80).map(p => (
              <div key={p.id} className="p-6 bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:border-teal-500 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Finalização</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{p.name}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-teal-600 transition-all" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-500" /> Alertas Críticos
          </h3>

          {projects.filter(p => p.status === 'delayed').length > 0 ? (
            projects.filter(p => p.status === 'delayed').map(p => (
              <div key={p.id} className="p-8 bg-rose-50 dark:bg-rose-900/20 rounded-[40px] border border-rose-100 dark:border-rose-800 mb-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm shrink-0">
                    <Clock size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-rose-900 dark:text-rose-300 uppercase tracking-widest leading-tight">Orçamento Excedido</h4>
                    <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mt-2">
                      A obra {p.name} ultrapassou o orçamento previsto.
                    </p>
                  </div>
                </div>
                <button onClick={() => navigate(`/projects/${p.id}/finances`)} className="w-full mt-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-600/20 active:scale-95 transition-all">Ver Detalhes Financeiros</button>
              </div>
            ))
          ) : (
            <div className="p-8 bg-emerald-50 dark:bg-emerald-900/20 rounded-[40px] border border-emerald-100 dark:border-emerald-800 flex flex-col items-center text-center">
              <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center text-emerald-500 shadow-sm mb-4">
                <CheckCircle2 size={24} />
              </div>
              <h4 className="text-sm font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-widest">Tudo em ordem!</h4>
              <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mt-2">Nenhuma obra com status crítico no momento.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Schedule;
