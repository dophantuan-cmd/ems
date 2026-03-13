import React, { useMemo } from 'react';
import { Teacher, Class, Student, Enrollment, Attendance, SessionDate, ScheduleRow } from '../types';

interface AttendanceManagerProps {
  selectedClassId: string;
  classes: Class[];
  students: Student[];
  enrollments: Enrollment[];
  setEnrollments: React.Dispatch<React.SetStateAction<Enrollment[]>>;
  attendance: Attendance[];
  setAttendance: React.Dispatch<React.SetStateAction<Attendance[]>>;
  sessionDates: SessionDate[];
  setSessionDates: React.Dispatch<React.SetStateAction<SessionDate[]>>;
  schedule: ScheduleRow[];
  teachers: Teacher[];
  formatDateDisplay: (dateStr: string) => string;
}

const AttendanceManager: React.FC<AttendanceManagerProps> = ({
  selectedClassId,
  classes,
  students,
  enrollments,
  setEnrollments,
  attendance,
  setAttendance,
  sessionDates,
  setSessionDates,
  schedule,
  teachers,
  formatDateDisplay
}) => {
  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const numSessions = selectedClass ? Number(selectedClass.sessions) || 0 : 0;

  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    const studentIds = enrollments.filter(e => e.class_id === selectedClassId).map(e => e.student_id);
    return students.filter(s => studentIds.includes(s.id));
  }, [selectedClassId, enrollments, students]);

  const selectedClassTeacher = useMemo(() => {
    if (!selectedClassId) return null;
    const sched = schedule.find(s => s.class_id === selectedClassId);
    return teachers.find(t => t.id === sched?.teacherId);
  }, [selectedClassId, schedule, teachers]);

  const classAttendanceStats = useMemo(() => {
    const stats: Record<string, number> = {};
    attendance.filter(a => a.class_id === selectedClassId && a.isPresent).forEach(a => {
      stats[a.student_id] = (stats[a.student_id] || 0) + 1;
    });
    return stats;
  }, [attendance, selectedClassId]);

  const handleAttendanceChange = (studentId: string, sessionIndex: number, isPresent: boolean) => {
    setAttendance(prev => {
      const existingIdx = prev.findIndex(a => a.student_id === studentId && a.class_id === selectedClassId && a.sessionIndex === sessionIndex);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], isPresent };
        return updated;
      } else {
        return [...prev, { id: crypto.randomUUID(), student_id: studentId, class_id: selectedClassId, sessionIndex, isPresent }];
      }
    });
  };

  const handleSessionDateChange = (sessionIndex: number, date: string) => {
    setSessionDates(prev => {
      const existingIdx = prev.findIndex(sd => sd.class_id === selectedClassId && sd.sessionIndex === sessionIndex);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], date };
        return updated;
      } else {
        return [...prev, { id: crypto.randomUUID(), class_id: selectedClassId, sessionIndex, date }];
      }
    });
  };

  const getAttendance = (studentId: string, sessionIndex: number) => {
    return attendance.find(a => a.student_id === studentId && a.class_id === selectedClassId && a.sessionIndex === sessionIndex)?.isPresent || false;
  };

  const getSessionDate = (sessionIndex: number) => {
    return sessionDates.find(sd => sd.class_id === selectedClassId && sd.sessionIndex === sessionIndex)?.date || '';
  };

  const handleDropoutToggle = (studentId: string) => {
    setEnrollments(prev => prev.map(e => {
      if (e.class_id === selectedClassId && e.student_id === studentId) {
        return { ...e, isDroppedOut: !e.isDroppedOut };
      }
      return e;
    }));
  };

  const exportAttendanceToCSV = () => {
    if (!selectedClassId || classStudents.length === 0) return;

    const metadata = [
      ['THÔNG TIN LỚP HỌC'],
      ['Khóa học', selectedClass?.courseName || '---'],
      ['Mã lớp', selectedClass?.class_id || '---'],
      ['Giảng viên', selectedClassTeacher?.name || '---'],
      ['Ngày bắt đầu', formatDateDisplay(selectedClass?.startDate || '---')],
      ['Ngày kết thúc', formatDateDisplay(selectedClass?.endDate || '---')],
      [''],
      ['DANH SÁCH ĐIỂM DANH CHI TIẾT']
    ];

    // Headers with dates
    const headers = ['Học viên'];
    for (let i = 0; i < numSessions; i++) {
      const date = getSessionDate(i);
      headers.push(`Buổi ${i + 1}${date ? ` (${date})` : ''}`);
    }
    headers.push('Tổng cộng');

    const rows = classStudents.map(s => {
      const row = [s.full_name];
      for (let i = 0; i < numSessions; i++) {
        row.push(getAttendance(s.id, i) ? 'X' : '');
      }
      row.push((classAttendanceStats[s.id] || 0).toString());
      return row;
    });

    const csvContent = "\uFEFF" + [
      ...metadata.map(m => m.join(',')),
      headers.join(','),
      ...rows.map(r => r.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `DiemDanh_${selectedClass?.class_id || 'Lop'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!selectedClassId) {
    return (
      <div className="py-32 text-center text-slate-300">
        <p className="italic font-medium">Chọn lớp học để bắt đầu thao tác điểm danh</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h4 className="font-bold text-slate-800">Bảng điểm danh chi tiết</h4>
          <p className="text-xs text-slate-500">Giảng viên: <span className="font-bold text-indigo-600">{selectedClassTeacher?.name || 'Chưa gán'}</span></p>
        </div>
        <button 
          onClick={exportAttendanceToCSV} 
          className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all flex items-center gap-2 shadow-lg shadow-green-600/20"
        >
          <span>📥</span> Xuất Excel
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest sticky left-0 bg-slate-50 z-10 border-r border-slate-200 min-w-[200px]">Tên học viên</th>
                {Array.from({ length: numSessions }).map((_, i) => (
                  <th key={i} className="px-2 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-r border-slate-100 min-w-[100px]">
                    <div className="mb-2">Buổi {i + 1}</div>
                    <input 
                      type="text" 
                      placeholder="Ngày" 
                      className="w-full text-[10px] p-1 border border-slate-200 rounded text-center focus:ring-1 focus:ring-indigo-500 outline-none"
                      value={getSessionDate(i)}
                      onChange={(e) => handleSessionDateChange(i, e.target.value)}
                    />
                  </th>
                ))}
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center min-w-[80px]">Bỏ ngang</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center min-w-[80px]">Tổng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 sticky left-0 bg-white z-10 border-r border-slate-200 group-hover:bg-slate-50">
                    <p className="font-bold text-sm text-slate-700">{s.full_name}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{s.student_id}</p>
                  </td>
                  {Array.from({ length: numSessions }).map((_, i) => (
                    <td key={i} className="px-2 py-4 text-center border-r border-slate-50">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                        checked={getAttendance(s.id, i)}
                        onChange={(e) => handleAttendanceChange(s.id, i, e.target.checked)}
                      />
                    </td>
                  ))}
                  <td className="px-6 py-4 text-center border-r border-slate-50">
                    <button 
                      onClick={() => handleDropoutToggle(s.id)}
                      className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                        enrollments.find(e => e.class_id === selectedClassId && e.student_id === s.id)?.isDroppedOut 
                          ? 'bg-red-100 text-red-600 border border-red-200' 
                          : 'bg-slate-100 text-slate-400 border border-slate-200 hover:bg-red-50 hover:text-red-400'
                      }`}
                    >
                      {enrollments.find(e => e.class_id === selectedClassId && e.student_id === s.id)?.isDroppedOut ? 'Đã bỏ' : 'Bỏ ngang'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-center font-black text-indigo-600 bg-indigo-50/30">
                    {classAttendanceStats[s.id] || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceManager;
