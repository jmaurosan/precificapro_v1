import { Check, Clock, Plus, StickyNote, Trash2, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface Note {
  id: string;
  text: string;
  createdAt: string;
  urgency: 'low' | 'medium' | 'high';
  done: boolean;
}

const QuickNotes: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteUrgency, setNewNoteUrgency] = useState<'low' | 'medium' | 'high'>('low');

  useEffect(() => {
    const stored = localStorage.getItem('precificaPro_notes');
    if (stored) {
      setNotes(JSON.parse(stored));
    }
  }, []);

  const saveNotes = (updatedNotes: Note[]) => {
    setNotes(updatedNotes);
    localStorage.setItem('precificaPro_notes', JSON.stringify(updatedNotes));
  };

  const addNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    const newNote: Note = {
      id: Date.now().toString(),
      text: newNoteText,
      createdAt: new Date().toISOString(),
      urgency: newNoteUrgency,
      done: false
    };

    saveNotes([newNote, ...notes]);
    setNewNoteText('');
    setNewNoteUrgency('low');
  };

  const toggleDone = (id: string) => {
    const updated = notes.map(n => n.id === id ? { ...n, done: !n.done } : n);
    saveNotes(updated);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter(n => n.id !== id);
    saveNotes(updated);
  };

  const deleteDone = () => {
    const updated = notes.filter(n => !n.done);
    saveNotes(updated);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-600 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800';
      case 'medium': return 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800';
      default: return 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800';
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
      {/* Widget Panel */}
      <div
        className={`bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 mb-4 w-96 overflow-hidden transition-all duration-300 pointer-events-auto ${isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-95 h-0 mb-0'
          }`}
      >
        <div className="p-5 bg-gradient-to-r from-amber-200 to-yellow-400 dark:from-amber-900 dark:to-yellow-900/40 flex items-center justify-between">
          <h3 className="font-black text-amber-900 dark:text-amber-100 flex items-center gap-2">
            <StickyNote className="fill-amber-900/20" size={20} />
            Lembretes Rápidos
          </h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg text-amber-900 dark:text-amber-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 max-h-[60vh] overflow-y-auto space-y-4">
          <form onSubmit={addNote} className="space-y-3">
            <textarea
              value={newNoteText}
              onChange={(e) => setNewNoteText(e.target.value)}
              placeholder="O que você não pode esquecer?"
              rows={2}
              className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
              autoFocus={isOpen}
            />
            <div className="flex gap-2">
              <select
                value={newNoteUrgency}
                onChange={(e) => setNewNoteUrgency(e.target.value as any)}
                className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold uppercase text-gray-500"
              >
                <option value="low">Normal</option>
                <option value="medium">Importante</option>
                <option value="high">Urgente 🔥</option>
              </select>
              <button
                type="submit"
                disabled={!newNoteText.trim()}
                className="px-4 bg-amber-400 hover:bg-amber-500 text-amber-950 rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={20} />
              </button>
            </div>
          </form>

          <div className="space-y-2">
            {notes.filter(n => !n.done).length === 0 && notes.length > 0 && (
              <p className="text-center text-gray-400 text-xs py-4">Tudo limpo! 🎉</p>
            )}

            {notes.map(note => (
              <div
                key={note.id}
                className={`group relative p-3 rounded-xl border flex items-start gap-3 transition-all ${note.done
                    ? 'bg-gray-50 dark:bg-gray-800/50 border-transparent opacity-60'
                    : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md'
                  }`}
              >
                <button
                  onClick={() => toggleDone(note.id)}
                  className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${note.done
                      ? 'bg-emerald-500 border-emerald-500 text-white'
                      : 'border-gray-300 dark:border-gray-600 text-transparent hover:border-emerald-400'
                    }`}
                >
                  <Check size={12} strokeWidth={4} />
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium leading-relaxed break-words ${note.done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {note.text}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider border ${getUrgencyColor(note.urgency)}`}>
                      {note.urgency === 'low' ? 'Normal' : note.urgency === 'medium' ? 'Importante' : 'Urgente'}
                    </span>
                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                      <Clock size={10} /> {new Date(note.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => deleteNote(note.id)}
                  className="absolute top-2 right-2 p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {notes.some(n => n.done) && (
            <button
              onClick={deleteDone}
              className="w-full py-2 text-xs text-center text-gray-400 hover:text-red-500 transition-colors underline decoration-dotted"
            >
              Limpar tarefas concluídas
            </button>
          )}

          {notes.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <StickyNote size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum lembrete</p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`group flex items-center justify-center w-14 h-14 rounded-2xl shadow-lg border-2 border-white dark:border-gray-800 transition-all active:scale-95 pointer-events-auto ${isOpen
            ? 'bg-amber-400 text-amber-950 rotate-90'
            : 'bg-teal-600 text-white hover:bg-teal-700 hover:-translate-y-1'
          }`}
      >
        {isOpen ? <X size={24} /> : (
          <div className="relative">
            <StickyNote size={24} />
            {notes.filter(n => !n.done).length > 0 && (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-teal-600"></span>
            )}
          </div>
        )}
      </button>
    </div>
  );
};

export default QuickNotes;
