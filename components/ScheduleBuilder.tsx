
import React, { useState, useMemo } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ScheduleRow, Subject, Teacher, Shift, Class, Enrollment } from '../types';

interface ScheduleBuilderProps {
  schedule: ScheduleRow[];
  setSchedule: React.Dispatch<React.SetStateAction<ScheduleRow[]>>;
  subjects: Subject[];
  teachers: Teacher[];
  shifts: Shift[];
  classes: Class[];
  enrollments: Enrollment[];
  setEnrollments: React.Dispatch<React.SetStateAction<Enrollment[]>>;
}

type SortKey = keyof ScheduleRow | 'subjectName' | 'teacherName' | 'shiftName';
type SortOrder = 'asc' | 'desc' | null;

const ScheduleBuilder: React.FC<ScheduleBuilderProps> = ({ 
  schedule, 
  setSchedule, 
  subjects, 
  teachers, 
  shifts, 
  classes,
  enrollments,
  setEnrollments
}) => {
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; order: SortOrder }>({ key: 'startDate', order: 'asc' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [selectedScheduleIds, setSelectedScheduleIds] = useState<Set<string>>(new Set());

  // Filter out classes already in schedule
  const availableClasses = useMemo(() => {
    const scheduledIds = new Set(schedule.map(s => s.class_id));
    const scheduledNames = new Set(schedule.map(s => s.className));
    return classes.filter(c => !scheduledIds.has(c.id) && !scheduledNames.has(c.class_id));
  }, [classes, schedule]);

  // Helpers
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  };

  const handleToggleClass = (classId: string) => {
    setSelectedClassIds(prev => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId);
      else next.add(classId);
      return next;
    });
  };

  const handleToggleScheduleRow = (id: string) => {
    setSelectedScheduleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedScheduleIds.size === schedule.length) {
      setSelectedScheduleIds(new Set());
    } else {
      setSelectedScheduleIds(new Set(schedule.map(s => s.id)));
    }
  };

  const handleAcceptClasses = () => {
    const newRows: ScheduleRow[] = classes
      .filter(c => selectedClassIds.has(c.id))
      .map(c => ({
        id: crypto.randomUUID(),
        courseName: c.courseName,
        subjectId: c.subjectId,
        class_id: c.id,
        className: c.class_id,
        teacherId: '', // To be assigned
        startDate: c.startDate?.split('T')[0] || '',
        endDate: c.endDate?.split('T')[0] || '',
        shiftId: c.shiftId
      }));
    
    setSchedule(prev => [...prev, ...newRows]);
    setIsModalOpen(false);
    setSelectedClassIds(new Set());
  };

  const updateRow = (id: string, updates: Partial<ScheduleRow>) => {
    setSchedule(prev => prev.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row, ...updates };
        // If teacherId is updated, update all enrollments for this class
        if (updates.teacherId !== undefined) {
          setEnrollments(prevEnroll => prevEnroll.map(e => 
            e.class_id === row.class_id ? { ...e, teacherId: updates.teacherId! } : e
          ));
        }
        return updatedRow;
      }
      return row;
    }));
  };

  const removeRow = (id: string) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa dòng lịch học này?')) {
      setSchedule(prev => prev.filter(r => r.id !== id));
      setSelectedScheduleIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const downloadSchedule = async () => {
    if (schedule.length === 0) return;
    
    if (selectedScheduleIds.size === 0) {
      alert("Bạn chưa chọn lớp để tải");
      return;
    }

    const rowsToExport = schedule.filter(s => selectedScheduleIds.has(s.id));
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ThoiKhoaBieu');

    // Header
    const row1 = worksheet.getCell('A1');
    row1.value = 'TRƯỜNG ĐẠI HỌC KHXH&NV';
    row1.font = { name: 'Times New Roman', size: 14, bold: true };

    const row2 = worksheet.getCell('A2');
    row2.value = 'TRUNG TÂM NGOẠI NGỮ';
    row2.font = { name: 'Times New Roman', size: 14, bold: true, underline: true };

    // Title
    const firstCourse = rowsToExport[0]?.courseName || '';
    const row4 = worksheet.getCell('A4');
    row4.value = `THỜI KHOÁ BIỂU NGOẠI NGỮ KHÓA ${firstCourse}`;
    row4.font = { name: 'Times New Roman', size: 17, bold: true };
    row4.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A4:O4');

    const row5 = worksheet.getCell('A5');
    row5.value = 'Cơ sở Sài Gòn';
    row5.font = { name: 'Times New Roman', size: 17, bold: true };
    row5.alignment = { horizontal: 'center' };
    worksheet.mergeCells('A5:O5');

    // Table Headers (Row 8)
    const headerRow = worksheet.getRow(8);
    const headers = [
      "STT", "Mã lớp", "Ngoại ngữ", "Số tiết", "Sĩ số", "Ca học", "Phòng học", 
      "Ngày khai giảng", "Ngày kết thúc", "Tình trạng lớp", "Số điện thoại giảng viên", 
      "Giảng viên", "Địa chỉ email", "Giáo vụ hỗ trợ", "Điện thoại"
    ];
    headerRow.values = headers;
    headerRow.eachCell((cell) => {
      cell.font = { name: 'Times New Roman', bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' }
      };
    });

    // Data Rows
    rowsToExport.forEach((row, idx) => {
      const classObj = classes.find(c => c.id === row.class_id);
      const subject = subjects.find(s => s.id === row.subjectId)?.name || '---';
      const shift = shifts.find(s => s.id === row.shiftId)?.name || '---';
      const teacher = teachers.find(t => t.id === row.teacherId);
      const studentCount = enrollments.filter(e => e.class_id === row.class_id).length;

      const dataRow = worksheet.getRow(9 + idx);
      dataRow.values = [
        idx + 1,
        classObj?.class_id || row.className,
        subject,
        classObj?.periods || '---',
        studentCount,
        shift,
        classObj?.room || '---',
        formatDateDisplay(row.startDate),
        formatDateDisplay(row.endDate),
        classObj?.notes || '---',
        teacher?.phone || '---',
        teacher?.name || 'Chưa gán',
        teacher?.email || '---',
        '', // Giáo vụ hỗ trợ
        ''  // Điện thoại
      ];

      dataRow.eachCell((cell) => {
        cell.font = { name: 'Times New Roman' };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
      // Left align for text columns
      dataRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' }; // Ngoại ngữ
      dataRow.getCell(10).alignment = { horizontal: 'left', vertical: 'middle' }; // Tình trạng lớp
      dataRow.getCell(12).alignment = { horizontal: 'left', vertical: 'middle' }; // Giảng viên
      dataRow.getCell(13).alignment = { horizontal: 'left', vertical: 'middle' }; // Email
    });

    // Column Widths
    worksheet.getColumn(1).width = 5;   // STT
    worksheet.getColumn(2).width = 15;  // Mã lớp
    worksheet.getColumn(3).width = 25;  // Ngoại ngữ
    worksheet.getColumn(4).width = 10;  // Số tiết
    worksheet.getColumn(5).width = 8;   // Sĩ số
    worksheet.getColumn(6).width = 15;  // Ca học
    worksheet.getColumn(7).width = 15;  // Phòng học
    worksheet.getColumn(8).width = 15;  // Ngày khai giảng
    worksheet.getColumn(9).width = 15;  // Ngày kết thúc
    worksheet.getColumn(10).width = 30; // Tình trạng lớp
    worksheet.getColumn(11).width = 20; // SĐT GV
    worksheet.getColumn(12).width = 25; // Giảng viên
    worksheet.getColumn(13).width = 30; // Email
    worksheet.getColumn(14).width = 15; // Giáo vụ
    worksheet.getColumn(15).width = 15; // Điện thoại

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `ThoiKhoaBieu_${new Date().getTime()}.xlsx`);
  };

  // Pre-calculate teacher conflicts for performance
  const teacherConflicts = useMemo(() => {
    const map: { [teacherId: string]: { [shiftId: string]: { start: number, end: number, id: string }[] } } = {};
    
    schedule.forEach(row => {
      if (!row.teacherId || !row.shiftId || !row.startDate || !row.endDate) return;
      
      if (!map[row.teacherId]) map[row.teacherId] = {};
      if (!map[row.teacherId][row.shiftId]) map[row.teacherId][row.shiftId] = [];
      
      map[row.teacherId][row.shiftId].push({
        start: new Date(row.startDate).getTime(),
        end: new Date(row.endDate).getTime(),
        id: row.id
      });
    });
    
    return map;
  }, [schedule]);

  const getEligibleTeachers = (row: ScheduleRow) => {
    if (!row.subjectId || !row.shiftId || !row.startDate || !row.endDate) return [];

    const currentStart = new Date(row.startDate).getTime();
    const currentEnd = new Date(row.endDate).getTime();

    return teachers.filter(teacher => {
      // 1. Check subject and shift availability
      if (!teacher.subjectIds.includes(row.subjectId)) return false;
      if (!teacher.availableShiftIds.includes(row.shiftId)) return false;

      // 2. Check conflicts using pre-calculated map
      const teacherShiftConflicts = teacherConflicts[teacher.id]?.[row.shiftId] || [];
      const hasConflict = teacherShiftConflicts.some(conflict => {
        if (conflict.id === row.id) return false;
        return Math.max(currentStart, conflict.start) <= Math.min(currentEnd, conflict.end);
      });

      return !hasConflict;
    });
  };

  const handleSort = (key: SortKey) => {
    let order: SortOrder = 'asc';
    if (sortConfig.key === key && sortConfig.order === 'asc') order = 'desc';
    else if (sortConfig.key === key && sortConfig.order === 'desc') order = null;
    setSortConfig({ key, order });
  };

  const sortedSchedule = useMemo(() => {
    if (!sortConfig.order) return schedule;

    return [...schedule].sort((a, b) => {
      let valA: any = a[sortConfig.key as keyof ScheduleRow] || '';
      let valB: any = b[sortConfig.key as keyof ScheduleRow] || '';

      if (sortConfig.key === 'subjectName') {
        valA = subjects.find(s => s.id === a.subjectId)?.name || '';
        valB = subjects.find(s => s.id === b.subjectId)?.name || '';
      } else if (sortConfig.key === 'teacherName') {
        valA = teachers.find(t => t.id === a.teacherId)?.name || '';
        valB = teachers.find(t => t.id === b.teacherId)?.name || '';
      } else if (sortConfig.key === 'shiftName') {
        valA = shifts.find(s => s.id === a.shiftId)?.name || '';
        valB = shifts.find(s => s.id === b.shiftId)?.name || '';
      }

      if (valA < valB) return sortConfig.order === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.order === 'asc' ? 1 : -1;
      return 0;
    });
  }, [schedule, sortConfig, subjects, teachers, shifts]);

  const SortIndicator = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortConfig.key !== columnKey) return <span className="ml-1 text-slate-300">⇅</span>;
    if (sortConfig.order === 'asc') return <span className="ml-1 text-indigo-600 font-bold">↑</span>;
    if (sortConfig.order === 'desc') return <span className="ml-1 text-indigo-600 font-bold">↓</span>;
    return <span className="ml-1 text-slate-300">⇅</span>;
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <span>📅</span> Sắp xếp lịch học & GV
          </h2>
          <p className="text-sm text-slate-500 mt-1">Gán giáo viên vào các lớp học đã mở một cách thông minh, tránh trùng lịch.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={downloadSchedule}
            disabled={schedule.length === 0}
            className="bg-white border border-slate-200 text-slate-600 px-6 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-bold shadow-sm flex items-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
            title="Tải danh sách lịch dạy xuống file Excel/CSV"
          >
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Tải danh sách
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-md flex items-center gap-2 active:scale-95"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Thêm lớp mới
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-200">
                <th className="px-4 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    checked={schedule.length > 0 && selectedScheduleIds.size === schedule.length}
                    onChange={handleSelectAll}
                  />
                </th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('courseName')}>
                  Khóa <SortIndicator columnKey="courseName" />
                </th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('subjectName')}>
                  Môn học <SortIndicator columnKey="subjectName" />
                </th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('class_id')}>
                  Mã lớp <SortIndicator columnKey="class_id" />
                </th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Ca & Thời gian
                </th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => handleSort('teacherName')}>
                  Giáo viên gán <SortIndicator columnKey="teacherName" />
                </th>
                <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16 text-center">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedSchedule.map((row) => {
                const eligibleTeachers = getEligibleTeachers(row);
                const shift = shifts.find(s => s.id === row.shiftId);
                
                return (
                  <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors group ${selectedScheduleIds.has(row.id) ? 'bg-indigo-50/30' : ''}`}>
                    <td className="px-4 py-3 text-center">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                        checked={selectedScheduleIds.has(row.id)}
                        onChange={() => handleToggleScheduleRow(row.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-800 text-sm">{row.courseName}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{subjects.find(s => s.id === row.subjectId)?.name || '---'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono bg-indigo-50 px-2 py-0.5 rounded text-xs text-indigo-700 font-bold">
                        {classes.find(c => c.id === row.class_id)?.class_id || row.className}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-bold text-slate-600">{shift?.name}</p>
                      <p className="text-[10px] text-slate-400">{formatDateDisplay(row.startDate)} → {formatDateDisplay(row.endDate)}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select 
                        value={row.teacherId}
                        onChange={(e) => updateRow(row.id, { teacherId: e.target.value })}
                        className={`w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all ${!row.teacherId ? 'border-orange-200 text-orange-500 italic' : 'text-slate-800 font-medium'}`}
                      >
                        <option value="">-- Chọn GV (Lọc thông minh) --</option>
                        {eligibleTeachers.map(t => (
                          <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                      </select>
                      {eligibleTeachers.length === 0 && (
                        <p className="text-[9px] text-red-500 mt-1 font-bold">⚠ Không có GV nào phù hợp!</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button 
                        onClick={() => removeRow(row.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50 active:scale-90"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {schedule.length === 0 && (
          <div className="py-24 text-center bg-slate-50/50">
             <div className="text-slate-200 mb-2">
               <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <p className="text-slate-400 italic">Bấm nút "Thêm lớp mới" để bắt đầu gán lịch dạy.</p>
          </div>
        )}
      </div>

      {/* Class Selection Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="bg-indigo-600 px-6 py-5 text-white flex justify-between items-center shrink-0">
              <div>
                <h4 className="text-xl font-bold flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  Chọn lớp học cần xếp lịch
                </h4>
                <p className="text-indigo-100 text-sm mt-0.5">Hiển thị các lớp học đang hoạt động chưa được gán giáo viên.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar">
              <table className="w-full border-collapse">
                <thead className="sticky top-0 bg-slate-50 z-10">
                  <tr className="text-left border-b border-slate-200">
                    <th className="px-6 py-4 w-12"></th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Khóa học</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Môn học</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã lớp</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ca học</th>
                    <th className="px-4 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Thời gian</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {availableClasses.length > 0 ? (
                    availableClasses.map(cls => (
                      <tr 
                        key={cls.id} 
                        onClick={() => handleToggleClass(cls.id)}
                        className={`cursor-pointer transition-colors ${selectedClassIds.has(cls.id) ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="px-6 py-4">
                          <input 
                            type="checkbox" 
                            checked={selectedClassIds.has(cls.id)}
                            onChange={() => {}} // Controlled by row click
                            className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-4 font-bold text-sm text-slate-700">{cls.courseName}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{subjects.find(s => s.id === cls.subjectId)?.name}</td>
                        <td className="px-4 py-4 font-mono text-xs text-indigo-600 font-bold">{cls.class_id}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{shifts.find(s => s.id === cls.shiftId)?.name}</td>
                        <td className="px-4 py-4 text-[10px] text-slate-500">{formatDateDisplay(cls.startDate)} → {formatDateDisplay(cls.endDate)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-20 text-center text-slate-400 italic">Không tìm thấy lớp học mới khả dụng.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 flex justify-between items-center shrink-0">
              <span className="text-sm font-medium text-slate-500">
                Đã chọn: <span className="text-indigo-600 font-bold">{selectedClassIds.size} lớp</span>
              </span>
              <div className="flex gap-3">
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-100 transition-all"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleAcceptClasses}
                  disabled={selectedClassIds.size === 0}
                  className="bg-indigo-600 text-white px-8 py-2 rounded-xl hover:bg-indigo-700 transition-all font-bold shadow-md disabled:bg-slate-300 disabled:shadow-none active:scale-95"
                >
                  Chấp nhận
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
        <div className="flex gap-4">
          <div className="bg-indigo-100 p-3 rounded-xl h-fit">
             <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="text-xs text-indigo-800 space-y-2">
            <p className="font-bold text-sm text-indigo-900">Quy trình gán Giáo viên thông minh (Smart Assignment):</p>
            <p>1. <strong>Chọn lớp:</strong> Bấm "Thêm lớp mới" để chọn từ danh sách các lớp đã được tạo ở mục Quản lý Lớp học.</p>
            <p>2. <strong>Gán GV:</strong> Hệ thống tự động lọc danh sách Giáo viên phù hợp dựa trên: 
               <br/>• <strong>Môn học:</strong> Giáo viên phải phụ trách môn học đó.
               <br/>• <strong>Ca rảnh:</strong> Giáo viên phải đăng ký rảnh trong ca học của lớp.
               <br/>• <strong>Xung đột lịch:</strong> Giáo viên không được có lịch dạy khác trùng ca trong cùng khoảng thời gian của lớp.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleBuilder;
