
import React, { useState } from 'react';
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Hammer, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  Info,
  MoreVertical,
  Plus
} from 'lucide-react';

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
  const [currentYear] = useState(2024);
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  
  const [projects] = useState<ProjectTimeline[]>([
    { id: '1', name: 'Apartamento Granja Viana', client: 'Mauro Silva', startMonth: 2, endMonth: 5, progress: 45, status: 'on-track' },
    { id: '2', name: 'Residência Alphaville', client: 'Ana Paula', startMonth: 0, endMonth: 8, progress: 70, status: 'on-track' },
    { id: '3', name: 'Loja Shopping Center', client: 'Grupo Moda', startMonth: 3, endMonth: 4, progress: 95, status: 'delayed' },
    { id: '4', name: 'Cobertura Itaim', client: 'Roberto K.', startMonth: 5, endMonth: 11, progress: 10, status: 'on-track' },
  ]);

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
            <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"><ChevronLeft size={20}/></button>
            <span className="px-4 py-2 text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center">{currentYear}</span>
            <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-all"><ChevronRight size={20}/></button>
          </div>
          <button className="flex items-center gap-2 px-6 py-3.5 bg-indigo-600 text-white rounded-2xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">
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
              className={`py-4 text-center border-r border-gray-100 dark:border-gray-800 last:border-0 ${idx === currentMonth ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
            >
              <span className={`text-[10px] font-black uppercase tracking-widest ${idx === currentMonth ? 'text-indigo-600' : 'text-gray-400'}`}>
                {month}
              </span>
            </div>
          ))}
        </div>

        {/* Timeline Content */}
        <div className="relative">
          {projects.map((project) => (
            <div key={project.id} className="group border-b border-gray-50 dark:border-gray-800 last:border-0 p-2">
              <div className="flex items-center gap-3 mb-2 px-4 mt-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${project.status === 'delayed' ? 'bg-rose-50 text-rose-500' : 'bg-indigo-50 text-indigo-600'} dark:bg-gray-800`}>
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
                  <div key={i} className={`h-full border-r border-gray-50 dark:border-gray-800/50 last:border-0 ${i === currentMonth ? 'bg-indigo-50/20 dark:bg-indigo-900/10' : ''}`} />
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
            className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10 pointer-events-none"
            style={{ left: `${((currentMonth + 0.5) / 12) * 100}%` }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-indigo-500 text-white text-[8px] font-black rounded-b-md whitespace-nowrap">
              HOJE
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Info size={20} className="text-indigo-600" /> Próximas Entregas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.filter(p => p.progress > 80).map(p => (
              <div key={p.id} className="p-6 bg-white dark:bg-gray-900 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between group hover:border-indigo-500 transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Finalização</p>
                    <p className="text-sm font-black text-gray-900 dark:text-white">{p.name}</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-300 group-hover:text-indigo-600 transition-all" />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle size={20} className="text-rose-500" /> Alertas Críticos
          </h3>
          <div className="p-8 bg-rose-50 dark:bg-rose-900/20 rounded-[40px] border border-rose-100 dark:border-rose-800">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white dark:bg-gray-900 rounded-2xl flex items-center justify-center text-rose-500 shadow-sm shrink-0">
                <Clock size={24} />
              </div>
              <div>
                <h4 className="text-sm font-black text-rose-900 dark:text-rose-300 uppercase tracking-widest leading-tight">Obra Atrasada</h4>
                <p className="text-xs font-bold text-rose-700 dark:text-rose-400 mt-2">Loja Shopping Center excedeu o prazo de gesso em 4 dias. Replanejamento necessário.</p>
              </div>
            </div>
            <button className="w-full mt-6 py-3 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-600/20 active:scale-95 transition-all">Ajustar Cronograma</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Schedule;
