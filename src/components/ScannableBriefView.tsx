import React from 'react';
import { Copy, Check, Sparkles, AlertCircle, Clock, CheckSquare, Layers, Utensils } from 'lucide-react';
import { AnalysisResult, TaskItem, TaskDepartment } from '../types';
import { DEPARTMENTS, DEPARTMENT_COLORS } from '../data/staffData';
import { useTheme } from '../context/ThemeContext';

interface ScannableBriefViewProps {
  analysis: AnalysisResult;
  allTasks: TaskItem[];
  onToggleTask: (id: string) => void;
  onCopyText: () => void;
  copied: boolean;
}

export const ScannableBriefView: React.FC<ScannableBriefViewProps> = ({
  analysis,
  allTasks = [],
  onToggleTask,
  onCopyText,
  copied,
}) => {
  const { isLightMode } = useTheme();
  const safeTasks = Array.isArray(allTasks) ? allTasks : [];

  // Group all tasks by Department
  const departmentsWithTasks = DEPARTMENTS.filter((dept) =>
    safeTasks.some((t) => t?.department?.toLowerCase() === dept.toLowerCase())
  );

  const completedCount = safeTasks.filter((t) => t?.completed).length;

  return (
    <div
      className={`p-4 sm:p-8 max-w-4xl mx-auto border-2 ${
        isLightMode
          ? 'bg-white text-zinc-950 border-zinc-300 shadow-xl'
          : 'bg-zinc-950 text-zinc-100 border-zinc-800 shadow-2xl'
      }`}
    >
      {/* Header bar */}
      <div
        className={`flex flex-wrap items-center justify-between gap-4 pb-4 sm:pb-6 border-b-4 ${
          isLightMode ? 'border-zinc-950' : 'border-white'
        }`}
      >
        <div>
          <span
            className={`text-xs font-black uppercase tracking-widest ${
              isLightMode ? 'text-zinc-600' : 'text-zinc-400'
            }`}
          >
            Amarii Cafe Shift Intelligence
          </span>
          <h2
            className={`text-xl sm:text-3xl font-black uppercase tracking-tight ${
              isLightMode ? 'text-zinc-950' : 'text-white'
            }`}
          >
            Department-Wise Daily Checklist Brief
          </h2>
          <p
            className={`text-[11px] sm:text-xs font-mono font-bold uppercase mt-0.5 ${
              isLightMode ? 'text-zinc-600' : 'text-zinc-400'
            }`}
          >
            {completedCount}/{safeTasks.length} Tasks Completed Across {departmentsWithTasks.length} Departments
          </p>
        </div>
        <button
          type="button"
          onClick={onCopyText}
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-tight transition cursor-pointer min-h-[40px] ${
            isLightMode
              ? 'bg-zinc-950 hover:bg-zinc-800 text-white'
              : 'bg-white hover:bg-zinc-200 text-black'
          }`}
        >
          {copied ? (
            <>
              <Check className={`w-3.5 h-3.5 stroke-[3] ${isLightMode ? 'text-emerald-400' : 'text-emerald-700'}`} />
              <span>Copied Brief</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy Plain Text</span>
            </>
          )}
        </button>
      </div>

      {/* Summary callout */}
      {analysis?.summary && (
        <div
          className={`my-4 sm:my-6 p-3.5 sm:p-4 border-l-4 text-xs sm:text-sm font-bold uppercase tracking-wider flex items-center gap-3 ${
            isLightMode
              ? 'bg-zinc-100 border-zinc-950 text-zinc-900'
              : 'bg-zinc-900 border-white text-zinc-200'
          }`}
        >
          <Sparkles className={`w-4 h-4 flex-shrink-0 ${isLightMode ? 'text-zinc-950' : 'text-white'}`} />
          <span>{analysis.summary}</span>
        </div>
      )}

      {/* Department-wise Sections */}
      <div className="space-y-6 sm:space-y-8 text-sm my-6">
        {departmentsWithTasks.map((dept) => {
          const deptTasks = safeTasks.filter(
            (t) => t?.department?.toLowerCase() === dept.toLowerCase()
          );
          const deptDone = deptTasks.filter((t) => t?.completed).length;
          const colors = DEPARTMENT_COLORS[dept as TaskDepartment] || DEPARTMENT_COLORS.General;

          return (
            <div
              key={dept}
              className={`space-y-2.5 pt-4 border-t ${
                isLightMode ? 'border-zinc-200' : 'border-zinc-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 text-[10px] font-black uppercase ${colors.badge}`}>
                    {dept}
                  </span>
                  <h3
                    className={`text-base sm:text-lg font-black uppercase tracking-tight ${
                      isLightMode ? 'text-zinc-950' : 'text-white'
                    }`}
                  >
                    {dept} Daily Checklist
                  </h3>
                </div>
                <span className={`text-[11px] font-mono font-bold ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                  {deptDone}/{deptTasks.length} Done
                </span>
              </div>

              <ul className="space-y-1.5 pl-1">
                {deptTasks.map((t) => (
                  <li
                    key={t.id}
                    onClick={() => onToggleTask(t.id)}
                    className={`flex items-start gap-2.5 text-xs sm:text-sm cursor-pointer p-2.5 transition rounded-sm border ${
                      isLightMode
                        ? t.completed
                          ? 'line-through opacity-40 bg-zinc-50 border-zinc-200 text-zinc-400'
                          : 'bg-zinc-50 border-zinc-200 hover:border-zinc-400 text-zinc-950'
                        : t.completed
                        ? 'line-through opacity-40 bg-zinc-900/60 border-zinc-800 text-zinc-400'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-500 text-zinc-100'
                    }`}
                  >
                    <span className={`font-black ${t.priority === 'urgent' ? (isLightMode ? 'text-red-600' : 'text-red-500') : (isLightMode ? 'text-zinc-600' : 'text-zinc-400')}`}>
                      {t.priority === 'urgent' ? '🚨' : '•'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="font-bold uppercase tracking-tight">{t.title}</span>
                      {t.details && t.details !== t.title && (
                        <span className={isLightMode ? 'text-zinc-600 font-normal' : 'text-zinc-400 font-normal'}>
                          {' '}— {t.details}
                        </span>
                      )}
                      {t.deadline && (
                        <span className={`font-mono text-[11px] ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                          {' '}({t.deadline})
                        </span>
                      )}
                      {t.assignee && (
                        <span className={`font-mono text-[11px] ml-1 ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                          [{t.assignee}]
                        </span>
                      )}
                      {t.notes && (
                        <span className={`block text-[11px] italic mt-0.5 ${isLightMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                          Note: {t.notes}
                        </span>
                      )}
                      {t.media && t.media.length > 0 && (
                        <span className={`text-[10px] font-bold block mt-0.5 ${isLightMode ? 'text-emerald-700' : 'text-emerald-400'}`}>
                          📸 {t.media.length} media attached
                        </span>
                      )}
                    </div>
                    {t.completed && (
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 ml-auto flex-shrink-0 ${
                          isLightMode ? 'text-white bg-zinc-950' : 'text-black bg-white'
                        }`}
                      >
                        DONE
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Footer prompt */}
      <footer
        className={`mt-8 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 -mx-4 -mb-4 sm:-mx-8 sm:-mb-8 ${
          isLightMode ? 'bg-zinc-950 text-white' : 'bg-white text-black'
        }`}
      >
        <p className="text-base sm:text-xl font-black italic uppercase tracking-tight text-center sm:text-left">
          Which tasks should I mark as completed today?
        </p>
        <div className="flex gap-2 flex-shrink-0">
          <span
            className={`px-3 py-1 text-xs font-black uppercase tracking-tight ${
              isLightMode ? 'bg-white text-zinc-950' : 'bg-black text-white'
            }`}
          >
            Amarii Cafe AI
          </span>
          <span
            className={`px-3 py-1 text-xs font-black uppercase tracking-tight ${
              isLightMode ? 'bg-zinc-800 text-zinc-200' : 'bg-zinc-200 text-black'
            }`}
          >
            Ready
          </span>
        </div>
      </footer>
    </div>
  );
};
