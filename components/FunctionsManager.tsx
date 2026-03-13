
import React, { useState, useMemo } from 'react';
import MailCenter from './MailCenter';
import AttendanceManager from './AttendanceManager';
import GradingManager from './GradingManager';
import { Subject, Level, Shift, Teacher, Class, Student, Enrollment, StudentGrade, ScheduleRow, Attendance, SessionDate } from '../types';

interface FunctionsManagerProps {
  subjects: Subject[];
  levels: Level[];
  shifts: Shift[];
  teachers: Teacher[];
  classes: Class[];
  students: Student[];
  enrollments: Enrollment[];
  setEnrollments: React.Dispatch<React.SetStateAction<Enrollment[]>>;
  grades: StudentGrade[];
  setGrades: React.Dispatch<React.SetStateAction<StudentGrade[]>>;
  schedule: ScheduleRow[];
  attendance: Attendance[];
  setAttendance: React.Dispatch<React.SetStateAction<Attendance[]>>;
  sessionDates: SessionDate[];
  setSessionDates: React.Dispatch<React.SetStateAction<SessionDate[]>>;
}

type SubTab = 'ATTENDANCE' | 'GRADING' | 'TRANSFER' | 'MAIL_CENTER';

const FunctionsManager: React.FC<FunctionsManagerProps> = ({
  subjects,
  levels,
  shifts,
  teachers,
  classes,
  students,
  enrollments,
  setEnrollments,
  grades,
  setGrades,
  schedule,
  attendance,
  setAttendance,
  sessionDates,
  setSessionDates
}) => {
  const [activeTab, setActiveTab] = useState<SubTab>('ATTENDANCE');
  const [selectedClassId, setSelectedClassId] = useState('');
  
  // Transfer State
  const [transferFromClassId, setTransferFromClassId] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [isTransferTargetModalOpen, setIsTransferTargetModalOpen] = useState(false);

  // Mail Center State (Moved to MailCenter component)

  // Helpers
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  };

  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    const studentIds = enrollments.filter(e => e.class_id === selectedClassId).map(e => e.student_id);
    return students.filter(s => studentIds.includes(s.id));
  }, [selectedClassId, enrollments, students]);

  const studentsInFromClass = useMemo(() => {
    if (!transferFromClassId) return [];
    const studentIds = enrollments.filter(e => e.class_id === transferFromClassId).map(e => e.student_id);
    return students.filter(s => studentIds.includes(s.id));
  }, [transferFromClassId, enrollments, students]);

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  
  const selectedClassTeacher = useMemo(() => {
    if (!selectedClassId) return null;
    const sched = schedule.find(s => s.class_id === selectedClassId);
    return teachers.find(t => t.id === sched?.teacherId);
  }, [selectedClassId, schedule, teachers]);

  const executeBulkTransfer = (targetClassId: string) => {
    if (!targetClassId || selectedStudentIds.size === 0 || !transferFromClassId) return;
    
    // Find teacher assigned to target class from schedule
    const targetSched = schedule.find(s => s.class_id === targetClassId);
    
    setEnrollments(prev => {
      const filtered = prev.filter(e => !(selectedStudentIds.has(e.student_id) && e.class_id === transferFromClassId));
      const newEntries = Array.from(selectedStudentIds).map(sid => ({ 
        id: crypto.randomUUID(), 
        student_id: sid, 
        class_id: targetClassId,
        teacherId: targetSched?.teacherId || ''
      }));
      return [...filtered, ...newEntries];
    });
    setSelectedStudentIds(new Set()); setIsTransferTargetModalOpen(false);
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <span>🛠️</span> Nghiệp vụ & Vận hành
        </h2>
        <div className="px-4 py-1.5 bg-green-50 border border-green-100 rounded-full flex items-center gap-2">
           <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
           <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Đang kết nối Cloud</span>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto custom-scrollbar">
        {[
          { id: 'ATTENDANCE', label: 'Điểm danh', icon: '📝' },
          { id: 'GRADING', label: 'Quản lý điểm', icon: '⭐' },
          { id: 'TRANSFER', label: 'Chuyển lớp', icon: '🔄' },
          { id: 'MAIL_CENTER', label: 'Mail center', icon: '📧' }
        ].map(tab => (
          <button 
            key={tab.id} 
            onClick={() => setActiveTab(tab.id as SubTab)} 
            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all shrink-0 ${
              activeTab === tab.id 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50/30' 
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <span>{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[450px]">
        {(activeTab === 'ATTENDANCE' || activeTab === 'GRADING') && (
           <div className="space-y-6 animate-in fade-in duration-300">
             <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-end gap-4">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Chọn lớp học vận hành</label>
                  <select 
                    value={selectedClassId} 
                    onChange={(e) => setSelectedClassId(e.target.value)} 
                    className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-slate-50 font-medium text-sm"
                  >
                    <option value="">-- Danh sách lớp --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.courseName} ({c.class_id})</option>)}
                  </select>
                </div>
             </div>

             {activeTab === 'ATTENDANCE' ? (
               <AttendanceManager 
                 selectedClassId={selectedClassId}
                 classes={classes}
                 students={students}
                 enrollments={enrollments}
                 setEnrollments={setEnrollments}
                 attendance={attendance}
                 setAttendance={setAttendance}
                 sessionDates={sessionDates}
                 setSessionDates={setSessionDates}
                 schedule={schedule}
                 teachers={teachers}
                 formatDateDisplay={formatDateDisplay}
               />
             ) : (
               <GradingManager 
                 selectedClassId={selectedClassId}
                 classes={classes}
                 students={students}
                 enrollments={enrollments}
                 grades={grades}
                 setGrades={setGrades}
                 schedule={schedule}
                 teachers={teachers}
                 subjects={subjects}
                 formatDateDisplay={formatDateDisplay}
               />
             )}
           </div>
        )}

        {activeTab === 'TRANSFER' && (
          <div className="flex gap-8 animate-in slide-in-from-right duration-300">
             <div className="w-1/4">
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm sticky top-24">
                  <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><span>📤</span> Lớp nguồn</h3>
                  <select className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 outline-none" value={transferFromClassId} onChange={(e) => { setTransferFromClassId(e.target.value); setSelectedStudentIds(new Set()); }}>
                    <option value="">-- Chọn mã lớp --</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.class_id} - {c.courseName}</option>)}
                  </select>
                </div>
             </div>
             <div className="flex-1">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 text-lg">Học viên lớp nguồn</h3>
                  {selectedStudentIds.size > 0 && (
                    <button onClick={() => setIsTransferTargetModalOpen(true)} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">Chuyển {selectedStudentIds.size} học viên</button>
                  )}
                </div>
                <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden min-h-[400px]">
                   {transferFromClassId ? (
                     <table className="w-full">
                       <thead className="bg-slate-50 border-b border-slate-100">
                         <tr>
                            <th className="p-4 w-12"><input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={studentsInFromClass.length > 0 && selectedStudentIds.size === studentsInFromClass.length} onChange={(e) => { if (e.target.checked) setSelectedStudentIds(new Set(studentsInFromClass.map(s => s.id))); else setSelectedStudentIds(new Set()); }} /></th>
                            <th className="p-4 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Học viên</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50">
                         {studentsInFromClass.map(s => (
                           <tr key={s.id} onClick={() => { const next = new Set(selectedStudentIds); if (next.has(s.id)) next.delete(s.id); else next.add(s.id); setSelectedStudentIds(next); }} className={`hover:bg-indigo-50/30 cursor-pointer transition-colors ${selectedStudentIds.has(s.id) ? 'bg-indigo-50/50' : ''}`}>
                             <td className="p-4 text-center"><input type="checkbox" className="w-4 h-4 text-indigo-600 rounded" checked={selectedStudentIds.has(s.id)} readOnly /></td>
                             <td className="p-4 font-bold text-sm text-slate-700">{s.full_name} ({s.student_id})</td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   ) : (
                     <div className="py-32 text-center text-slate-300"><p className="italic font-medium">Chọn lớp học nguồn ở bên trái</p></div>
                   )}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'MAIL_CENTER' && (
          <MailCenter 
            teachers={teachers}
            classes={classes}
            schedule={schedule}
            shifts={shifts}
            enrollments={enrollments}
            subjects={subjects}
            levels={levels}
            formatDateDisplay={formatDateDisplay}
          />
        )}
      </div>

      {isTransferTargetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 p-6 text-white"><h4 className="text-xl font-bold">Chọn lớp học đích</h4></div>
            <div className="p-8 space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
              {classes.filter(c => c.id !== transferFromClassId).map(c => (
                <div key={c.id} onClick={() => executeBulkTransfer(c.id)} className="p-5 border border-slate-100 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 cursor-pointer flex justify-between items-center group transition-all">
                  <div><span className="font-bold text-slate-700 group-hover:text-indigo-700">{c.courseName}</span><p className="text-[10px] text-slate-400 font-mono mt-0.5">{c.class_id}</p></div>
                  <span className="text-indigo-300 opacity-0 group-hover:opacity-100">→</span>
                </div>
              ))}
            </div>
            <div className="p-6 bg-slate-50 flex justify-end"><button onClick={() => setIsTransferTargetModalOpen(false)} className="px-6 py-2 text-slate-400 font-bold">Hủy bỏ</button></div>
          </div>
        </div>
      )}

      <div className="mt-12 p-6 bg-slate-100/50 rounded-3xl border border-slate-200/50">
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest text-center mb-2">Thông tin vận hành</p>
        <p className="text-[10px] text-slate-400 text-center italic">Dữ liệu đồng bộ Cloud giúp vận hành ổn định.</p>
      </div>
    </div>
  );
};

export default FunctionsManager;
