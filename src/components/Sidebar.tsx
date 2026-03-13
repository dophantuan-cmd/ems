
import React, { useState } from 'react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  setView: (view: AppView) => void;
  isCollapsed: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, isCollapsed }) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(
    ['SUBJECTS', 'LEVELS', 'SHIFTS', 'TEACHERS'].includes(currentView)
  );
  const [isReportsOpen, setIsReportsOpen] = useState(
    ['REPORTS', 'REPORTS_TEACHER', 'REPORTS_STUDENT'].includes(currentView)
  );

  const menuItems = [
    { id: 'DASHBOARD', label: 'Tổng quan', icon: '📊' },
    { id: 'STUDENTS', label: 'Học viên', icon: '🧑‍🎓' },
    { id: 'CLASSES', label: 'Lớp học', icon: '🏫' },
    { id: 'SCHEDULER', label: 'Xếp lịch', icon: '📅' },
    { id: 'FUNCTIONS', label: 'Nghiệp vụ', icon: '🛠️' },
  ];

  const reportItems = [
    { id: 'REPORTS_TEACHER', label: 'Giáo viên', icon: '👨‍🏫' },
    { id: 'REPORTS_STUDENT', label: 'Học viên', icon: '🎓' },
  ];

  const settingItems = [
    { id: 'SUBJECTS', label: 'Môn học', icon: '📚' },
    { id: 'LEVELS', label: 'Cấp độ', icon: '📈' },
    { id: 'SHIFTS', label: 'Ca học', icon: '⏰' },
    { id: 'TEACHERS', label: 'Giáo viên', icon: '👨‍🏫' },
  ];

  return (
    <aside className={`${isCollapsed ? 'w-20' : 'w-72'} bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0 border-r border-slate-800 shadow-xl transition-all duration-300 overflow-hidden`}>
      <div className={`p-6 border-b border-slate-800 flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
        <img 
          src="data:image/png;base64,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" 
          alt="Logo" 
          className="w-10 h-10 object-contain rounded-xl shadow-lg shadow-indigo-500/20 shrink-0" 
        />

        {!isCollapsed && (
          <div className="animate-in fade-in duration-300">
            <h1 className="text-white font-bold text-sm tracking-tight">ACADEMIC MANAGER</h1>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">EMS CFL</p>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar overflow-x-hidden">
        {!isCollapsed && <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-in fade-in duration-300">Menu chính</p>}
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setView(item.id as AppView)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-4 py-3 rounded-xl transition-all duration-200 group ${
              currentView === item.id
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'hover:bg-slate-800 hover:text-white'
            }`}
            title={isCollapsed ? item.label : ''}
          >
            <span className="text-lg group-hover:scale-110 transition-transform shrink-0">{item.icon}</span>
            {!isCollapsed && <span className="text-sm font-semibold truncate animate-in fade-in duration-300">{item.label}</span>}
          </button>
        ))}

        <div className="pt-2">
          <button
            onClick={() => !isCollapsed && setIsReportsOpen(!isReportsOpen)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white group ${
              isReportsOpen && !isCollapsed ? 'text-slate-100' : 'text-slate-500'
            }`}
            title={isCollapsed ? 'Báo cáo' : ''}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <span className="text-lg group-hover:scale-110 transition-transform shrink-0">📈</span>
              {!isCollapsed && <span className="text-sm font-semibold animate-in fade-in duration-300">Báo cáo</span>}
            </div>
            {!isCollapsed && (
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${isReportsOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {isReportsOpen && !isCollapsed && (
            <div className="mt-2 ml-4 pl-4 border-l border-slate-800 space-y-1 animate-in slide-in-from-top-2 duration-200">
              {reportItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as AppView)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                    currentView === item.id
                      ? 'bg-slate-800 text-indigo-400'
                      : 'text-slate-500 hover:text-slate-100'
                  }`}
                >
                  <span className="text-sm shrink-0">{item.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wider truncate">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={`pt-4 mt-4 border-t border-slate-800`}>
          <button
            onClick={() => !isCollapsed && setIsSettingsOpen(!isSettingsOpen)}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'} px-4 py-3 rounded-xl transition-all duration-200 hover:bg-slate-800 hover:text-white group ${
              isSettingsOpen && !isCollapsed ? 'text-slate-100' : 'text-slate-500'
            }`}
            title={isCollapsed ? 'Thiết lập' : ''}
          >
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <span className="text-lg shrink-0">⚙️</span>
              {!isCollapsed && <span className="text-sm font-semibold animate-in fade-in duration-300">Thiết lập</span>}
            </div>
            {!isCollapsed && (
              <svg
                className={`w-4 h-4 transition-transform duration-200 ${isSettingsOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            )}
          </button>

          {isSettingsOpen && !isCollapsed && (
            <div className="mt-2 ml-4 pl-4 border-l border-slate-800 space-y-1 animate-in slide-in-from-top-2 duration-200">
              {settingItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setView(item.id as AppView)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200 ${
                    currentView === item.id
                      ? 'bg-slate-800 text-indigo-400'
                      : 'text-slate-500 hover:text-slate-100'
                  }`}
                >
                  <span className="text-sm shrink-0">{item.icon}</span>
                  <span className="text-xs font-bold uppercase tracking-wider truncate">{item.label}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className={`p-6 border-t border-slate-800 ${isCollapsed ? 'flex justify-center' : ''}`}>
        <div className={`bg-slate-800/50 ${isCollapsed ? 'p-2' : 'p-4'} rounded-2xl flex items-center gap-3 overflow-hidden`}>
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
            AD
          </div>
          {!isCollapsed && (
            <div className="overflow-hidden animate-in fade-in duration-300">
              <p className="text-xs font-bold text-white truncate">Administrator</p>
              <p className="text-[10px] text-slate-500 truncate">admin@center.edu.vn</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
