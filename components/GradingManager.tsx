import React, { useMemo } from 'react';
import { Teacher, Class, Student, Enrollment, StudentGrade, ScheduleRow, Subject } from '../types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface GradingManagerProps {
  selectedClassId: string;
  classes: Class[];
  students: Student[];
  enrollments: Enrollment[];
  grades: StudentGrade[];
  setGrades: React.Dispatch<React.SetStateAction<StudentGrade[]>>;
  schedule: ScheduleRow[];
  teachers: Teacher[];
  subjects: Subject[];
  formatDateDisplay: (dateStr: string) => string;
}

const GradingManager: React.FC<GradingManagerProps> = ({
  selectedClassId,
  classes,
  students,
  enrollments,
  grades,
  setGrades,
  schedule,
  teachers,
  subjects,
  formatDateDisplay
}) => {
  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const classStudents = useMemo(() => {
    if (!selectedClassId) return [];
    const studentIds = enrollments.filter(e => e.class_id === selectedClassId).map(e => e.student_id);
    return students.filter(s => studentIds.includes(s.id));
  }, [selectedClassId, enrollments, students]);

  const handleGradeChange = (studentId: string, field: keyof StudentGrade, value: string | boolean) => {
    setGrades(prev => {
      const existingIdx = prev.findIndex(g => g.student_id === studentId && g.class_id === selectedClassId);
      
      const calculateTotal = (grade: Partial<StudentGrade>) => {
        if (grade.isAbsent) return 0;
        const m = Number(grade.midterm) || 0;
        const l = Number(grade.listening) || 0;
        const r = Number(grade.reading) || 0;
        const s = Number(grade.speaking) || 0;
        const w = Number(grade.writing) || 0;
        return m + l + r + s + w;
      };

      if (existingIdx > -1) {
        const updated = [...prev];
        const newGradeData = { ...updated[existingIdx], [field]: value };
        newGradeData.total = calculateTotal(newGradeData);
        updated[existingIdx] = newGradeData;
        return updated;
      } else {
        const newGrade: StudentGrade = {
          id: crypto.randomUUID(), student_id: studentId, class_id: selectedClassId,
          midterm: '', listening: '', reading: '', speaking: '', writing: '', isAbsent: false, [field]: value
        };
        newGrade.total = calculateTotal(newGrade);
        return [...prev, newGrade];
      }
    });
  };

  const getGrade = (studentId: string) => {
    return grades.find(g => g.student_id === studentId && g.class_id === selectedClassId) || {
      midterm: '', listening: '', reading: '', speaking: '', writing: '', total: 0, isAbsent: false
    };
  };

  const selectedClassTeacher = useMemo(() => {
    if (!selectedClassId) return null;
    const sched = schedule.find(s => s.class_id === selectedClassId);
    return teachers.find(t => t.id === sched?.teacherId);
  }, [selectedClassId, schedule, teachers]);

  const exportGradesToExcel = async () => {
    if (!selectedClassId || classStudents.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Bảng điểm');

    // Add metadata
    worksheet.addRow(['THÔNG TIN LỚP HỌC']);
    worksheet.addRow(['Khóa học', selectedClass?.courseName || '---']);
    worksheet.addRow(['Mã lớp', selectedClass?.class_id || '---']);
    worksheet.addRow(['Giảng viên', selectedClassTeacher?.name || '---']);
    worksheet.addRow(['Ngày bắt đầu', formatDateDisplay(selectedClass?.startDate || '---')]);
    worksheet.addRow(['Ngày kết thúc', formatDateDisplay(selectedClass?.endDate || '---')]);
    worksheet.addRow([]);

    // Add headers
    const headerRow = worksheet.addRow(['STT', 'Họ và tên', 'Điểm GK', 'Nghe', 'Đọc', 'Nói', 'Viết', 'Tổng cộng', 'Vắng thi']);
    headerRow.font = { bold: true };

    // Add data
    classStudents.forEach((s, index) => {
      const g = getGrade(s.id);
      const total = g.total !== undefined ? g.total : ((Number(g.midterm) || 0) + (Number(g.listening) || 0) + (Number(g.reading) || 0) + (Number(g.speaking) || 0) + (Number(g.writing) || 0));
      worksheet.addRow([
        index + 1,
        s.full_name,
        g.midterm || 0,
        g.listening || 0,
        g.reading || 0,
        g.speaking || 0,
        g.writing || 0,
        g.isAbsent ? '-' : total,
        g.isAbsent ? 'X' : ''
      ]);
    });

    // Formatting
    worksheet.getColumn(2).width = 30;
    worksheet.getColumn(3).width = 15;
    worksheet.getColumn(4).width = 15;
    worksheet.getColumn(5).width = 15;
    worksheet.getColumn(6).width = 15;
    worksheet.getColumn(7).width = 15;
    worksheet.getColumn(8).width = 15;
    worksheet.getColumn(9).width = 15;

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `BangDiem_${selectedClass?.class_id || 'Lop'}.xlsx`);
  };

  if (!selectedClassId) {
    return (
      <div className="py-32 text-center text-slate-300">
        <p className="italic font-medium">Chọn lớp học để bắt đầu thao tác quản lý điểm</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
        <div>
          <h4 className="font-bold text-slate-800">Bảng điểm học viên</h4>
          <p className="text-xs text-slate-500">Quản lý điểm giữa kỳ và cuối kỳ</p>
        </div>
        <button 
          onClick={exportGradesToExcel} 
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <span>📊</span> Tải xuống Excel
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-200">
                <th rowSpan={2} className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-r border-slate-200">Học viên</th>
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-r border-slate-200">Giữa kỳ</th>
                <th colSpan={4} className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-r border-slate-200">Cuối kỳ</th>
                <th rowSpan={2} className="px-3 py-4 text-[10px] font-bold text-indigo-600 uppercase tracking-widest text-center border-r border-slate-200">Tổng cộng</th>
                <th rowSpan={2} className="px-3 py-4 text-[10px] font-bold text-rose-500 uppercase tracking-widest text-center">Vắng thi</th>
              </tr>
              <tr className="bg-slate-50 text-left border-b border-slate-200">
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-r border-slate-200">Điểm GK</th>
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-r border-slate-100">Nghe</th>
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-r border-slate-100">Đọc</th>
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-r border-slate-100">Nói</th>
                <th className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center border-r border-slate-200">Viết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {classStudents.map(s => {
                const g = getGrade(s.id);
                const total = g.total !== undefined ? g.total : ((Number(g.midterm) || 0) + (Number(g.listening) || 0) + (Number(g.reading) || 0) + (Number(g.speaking) || 0) + (Number(g.writing) || 0));
                return (
                  <tr key={s.id} className={`hover:bg-slate-50 transition-colors ${g.isAbsent ? 'bg-rose-50/30' : ''}`}>
                    <td className="px-6 py-4 border-r border-slate-100">
                      <p className="font-bold text-sm text-slate-700">{s.full_name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{s.student_id}</p>
                    </td>
                    <td className="px-3 py-4 text-center border-r border-slate-100">
                      <input 
                        type="text" 
                        disabled={g.isAbsent}
                        className="w-12 border border-slate-200 rounded p-1 text-center text-sm focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-100" 
                        value={g.midterm} 
                        onChange={e => handleGradeChange(s.id, 'midterm', e.target.value)} 
                      />
                    </td>
                    <td className="px-3 py-4 text-center border-r border-slate-50">
                      <input 
                        type="text" 
                        disabled={g.isAbsent}
                        className="w-12 border border-slate-200 rounded p-1 text-center text-sm focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-100" 
                        value={g.listening} 
                        onChange={e => handleGradeChange(s.id, 'listening', e.target.value)} 
                      />
                    </td>
                    <td className="px-3 py-4 text-center border-r border-slate-50">
                      <input 
                        type="text" 
                        disabled={g.isAbsent}
                        className="w-12 border border-slate-200 rounded p-1 text-center text-sm focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-100" 
                        value={g.reading} 
                        onChange={e => handleGradeChange(s.id, 'reading', e.target.value)} 
                      />
                    </td>
                    <td className="px-3 py-4 text-center border-r border-slate-50">
                      <input 
                        type="text" 
                        disabled={g.isAbsent}
                        className="w-12 border border-slate-200 rounded p-1 text-center text-sm focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-100" 
                        value={g.speaking} 
                        onChange={e => handleGradeChange(s.id, 'speaking', e.target.value)} 
                      />
                    </td>
                    <td className="px-3 py-4 text-center border-r border-slate-100">
                      <input 
                        type="text" 
                        disabled={g.isAbsent}
                        className="w-12 border border-slate-200 rounded p-1 text-center text-sm focus:ring-1 focus:ring-indigo-500 outline-none disabled:bg-slate-100" 
                        value={g.writing} 
                        onChange={e => handleGradeChange(s.id, 'writing', e.target.value)} 
                      />
                    </td>
                    <td className="px-3 py-4 text-center font-black text-indigo-600 border-r border-slate-100 bg-indigo-50/20">
                      {g.isAbsent ? '-' : total}
                    </td>
                    <td className="px-3 py-4 text-center">
                      <input 
                        type="checkbox" 
                        className="w-5 h-5 text-rose-600 rounded focus:ring-rose-500 cursor-pointer"
                        checked={g.isAbsent || false}
                        onChange={(e) => handleGradeChange(s.id, 'isAbsent', e.target.checked)}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GradingManager;
