
import React, { useState, useRef, useMemo } from 'react';
import { Student, Subject, Enrollment, Class } from '../types';

interface StudentManagerProps {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
  subjects: Subject[];
  enrollments: Enrollment[];
  classes: Class[];
}

const StudentManager: React.FC<StudentManagerProps> = ({ students, setStudents, subjects, enrollments, classes }) => {
  const [formData, setFormData] = useState<Partial<Student>>({
    student_id: '',
    full_name: '',
    dob: '',
    phone: '',
    email: '',
    subjectId: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  // Helpers
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      full_name: '',
      dob: '',
      phone: '',
      email: '',
      subjectId: ''
    });
    setEditingId(null);
    setError(null);
  };

  const saveStudent = () => {
    const trimmedId = formData.student_id?.trim().toUpperCase();
    const trimmedName = formData.full_name?.trim();

    if (!trimmedId || !trimmedName || !formData.subjectId) {
      setError("Vui lòng nhập đầy đủ: Mã học viên, Tên và Môn học.");
      return;
    }

    const duplicate = students.find(s => s.student_id === trimmedId && s.id !== editingId);
    if (duplicate) {
      setError(`Mã học viên "${trimmedId}" đã tồn tại. Vui lòng nhập mã khác.`);
      return;
    }

    if (editingId) {
      setStudents(prev => prev.map(s => s.id === editingId ? { 
        ...s, 
        ...formData as Student, 
        student_id: trimmedId,
        full_name: trimmedName 
      } : s));
    } else {
      const newStudent: Student = {
        ...(formData as Student),
        id: crypto.randomUUID(),
        student_id: trimmedId,
        full_name: trimmedName
      };
      setStudents([...students, newStudent]);
    }
    resetForm();
  };

  const startEdit = (student: Student) => {
    setFormData(student);
    setEditingId(student.id);
    setError(null);
    setOpenMenuId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteStudent = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa học viên này?')) {
      setStudents(students.filter(s => s.id !== id));
      setOpenMenuId(null);
    }
  };

  const downloadTemplate = () => {
    const headers = ["Mã học viên", "Họ và tên", "Ngày sinh", "Số điện thoại", "Email", "Tên môn học"];
    const example = ["HV001", "Nguyễn Văn A", "2010-01-01", "0912345678", "student@example.com", subjects[0]?.name || "Tên môn học"];
    const csvContent = "\uFEFF" + [headers.join(','), example.join(',')].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'mau_import_hoc_vien.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = text.split('\n').filter(row => row.trim() !== '');
      if (rows.length <= 1) return;

      const newStudents: Student[] = [];
      let skipCount = 0;

      for (let i = 1; i < rows.length; i++) {
        const columns = rows[i].split(',').map(col => col.trim().replace(/^"|"$/g, ''));
        if (columns.length < 2) continue;

        const student_id = columns[0].toUpperCase();
        const full_name = columns[1];
        const dob = columns[2] || '';
        const phone = columns[3] || '';
        const email = columns[4] || '';
        const subjectName = columns[5] || '';

        const matchedSubject = subjects.find(s => s.name.toLowerCase() === subjectName.toLowerCase());
        const isDuplicate = students.some(s => s.student_id === student_id) || 
                           newStudents.some(s => s.student_id === student_id);

        if (student_id && full_name && !isDuplicate) {
          newStudents.push({
            id: crypto.randomUUID(),
            student_id,
            full_name,
            dob,
            phone,
            email,
            subjectId: matchedSubject?.id || (subjects[0]?.id || '')
          });
        } else if (isDuplicate) {
          skipCount++;
        }
      }

      if (newStudents.length > 0) {
        setStudents(prev => [...prev, ...newStudents]);
        alert(`Đã nhập thành công ${newStudents.length} học viên.${skipCount > 0 ? ` Bỏ qua ${skipCount} dòng do trùng mã học viên.` : ''}`);
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // Pre-calculate student enrollments and class status for faster lookups
  const studentStatusLookup = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const enrollmentsByStudent: Record<string, string[]> = {};
    enrollments.forEach(e => {
      if (!enrollmentsByStudent[e.student_id]) enrollmentsByStudent[e.student_id] = [];
      enrollmentsByStudent[e.student_id].push(e.class_id);
    });

    const classLookup: Record<string, Class> = {};
    classes.forEach(c => {
      classLookup[c.id] = c;
    });

    const statuses: Record<string, { label: string; color: string }> = {};
    students.forEach(student => {
      const studentEnrolls = enrollmentsByStudent[student.id] || [];
      if (studentEnrolls.length === 0) {
        statuses[student.id] = { label: 'Chưa học', color: 'bg-slate-100 text-slate-600 border-slate-200' };
        return;
      }
      
      const hasActive = studentEnrolls.some(classId => {
        const cls = classLookup[classId];
        return cls && cls.endDate >= today;
      });

      if (hasActive) {
        statuses[student.id] = { label: 'Đang học', color: 'bg-green-100 text-green-700 border-green-200' };
      } else {
        statuses[student.id] = { label: 'Chờ lên kỳ', color: 'bg-amber-100 text-amber-700 border-amber-200' };
      }
    });
    return statuses;
  }, [students, enrollments, classes]);

  // Lấy lịch sử học tập của học viên được chọn
  const studentHistory = useMemo(() => {
    if (!viewingStudent) return [];
    const studentEnrolls = enrollments.filter(e => e.student_id === viewingStudent.id);
    const enrolledClassIds = new Set(studentEnrolls.map(e => e.class_id));
    
    return classes
      .filter(c => enrolledClassIds.has(c.id))
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [viewingStudent, enrollments, classes]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-800">
        <span>🧑‍🎓</span> Quản lý Học viên
      </h2>

      {/* Entry Form */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm mb-10 transition-all">
        <h3 className="font-semibold text-slate-700 mb-6 flex items-center justify-between">
          <span>{editingId ? 'Chỉnh sửa thông tin học viên' : 'Đăng ký học viên mới'}</span>
          {editingId && (
            <button onClick={resetForm} className="text-sm text-indigo-600 hover:underline">Hủy chỉnh sửa</button>
          )}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã học viên (PK)</label>
            <input 
              name="student_id"
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all uppercase font-mono ${
                error && error.includes('Mã') ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:ring-indigo-500'
              }`}
              placeholder="VD: STU-001"
              value={formData.student_id || ''}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ và tên</label>
            <input 
              name="full_name"
              type="text"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Nguyễn Văn B"
              value={formData.full_name || ''}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Môn học đăng ký</label>
            <select 
              name="subjectId"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={formData.subjectId || ''}
              onChange={handleInputChange}
            >
              <option value="">-- Chọn môn học --</option>
              {subjects.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày sinh</label>
            <input 
              name="dob"
              type="date"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={formData.dob || ''}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số điện thoại</label>
            <input 
              name="phone"
              type="tel"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="0987xxxxxx"
              value={formData.phone || ''}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
            <input 
              name="email"
              type="email"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="student@example.com"
              value={formData.email || ''}
              onChange={handleInputChange}
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}
        
        <div className="mt-8 flex justify-end items-center gap-2">
          <input type="file" ref={fileInputRef} onChange={handleImportCSV} accept=".csv" className="hidden" />
          <button onClick={saveStudent} className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-md active:scale-95 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            {editingId ? 'Cập nhật học viên' : 'Lưu học viên'}
          </button>
          <div className="flex">
            <button onClick={() => fileInputRef.current?.click()} className="bg-white border border-slate-200 text-slate-600 px-5 py-2.5 rounded-l-lg hover:bg-slate-50 transition-all font-bold shadow-sm active:scale-95 flex items-center gap-2" title="Import từ file CSV">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              Import
            </button>
            <button onClick={downloadTemplate} className="bg-white border border-slate-200 border-l-0 text-slate-400 px-3 py-2.5 rounded-r-lg hover:bg-slate-50 hover:text-indigo-600 transition-all shadow-sm active:scale-95" title="Tải file CSV mẫu">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Students List Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã HV</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Họ và tên</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Môn học</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Liên hệ</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Trạng thái</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {students.map((student, index) => {
                const subject = subjects.find(s => s.id === student.subjectId);
                const status = studentStatusLookup[student.id];
                const isNearBottom = index >= students.length - 2 && students.length > 2;

                return (
                  <tr key={student.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono bg-amber-50 px-2 py-1 rounded text-xs text-amber-700 border border-amber-100 font-bold">
                        {student.student_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{student.full_name}</p>
                      <p className="text-[10px] text-slate-400">{student.dob ? `NS: ${formatDateDisplay(student.dob)}` : 'Chưa nhập NS'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{subject?.name || '---'}</span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-xs text-slate-600 font-medium">{student.phone || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400 italic truncate w-32" title={student.email}>{student.email || 'No email'}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${status.color}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center relative">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === student.id ? null : student.id)}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 active:scale-90"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                      </button>

                      {openMenuId === student.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)}></div>
                          <div className={`absolute right-12 w-44 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in zoom-in duration-150 ${
                            isNearBottom ? 'bottom-0 mb-4 origin-bottom-right' : 'top-4 origin-top-right'
                          }`}>
                            <button 
                              onClick={() => { setViewingStudent(student); setOpenMenuId(null); }}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-600 group"
                            >
                              <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              Xem hồ sơ
                            </button>
                            <button 
                              onClick={() => startEdit(student)}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-600 group"
                            >
                              <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              Chỉnh sửa
                            </button>
                            <div className="border-t border-slate-100 my-1"></div>
                            <button 
                              onClick={() => deleteStudent(student.id)}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-3 transition-colors text-red-600 group"
                            >
                              <svg className="w-4 h-4 text-red-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              Xóa học viên
                            </button>
                          </div>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {students.length === 0 && (
          <div className="py-24 text-center bg-slate-50/50 italic text-slate-400">Chưa có học viên nào trong danh sách.</div>
        )}
      </div>

      {/* Viewing Modal (Detail View) */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col md:flex-row h-[85vh] animate-in slide-in-from-bottom duration-300">
            
            {/* 25% Info Column */}
            <div className="md:w-1/4 bg-slate-50 p-8 border-r border-slate-200 overflow-y-auto shrink-0 flex flex-col">
               <button onClick={() => setViewingStudent(null)} className="mb-8 w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 transition-colors shadow-sm active:scale-90">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
               </button>

               <div className="mb-8 text-center md:text-left">
                  <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto md:mx-0 flex items-center justify-center text-white text-3xl font-bold shadow-lg shadow-indigo-200 mb-4">
                    {viewingStudent.full_name.charAt(0)}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-800 leading-tight">{viewingStudent.full_name}</h3>
                  <p className="text-indigo-600 font-mono text-xs font-bold mt-1">{viewingStudent.student_id}</p>
               </div>

               <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Môn học đăng ký</label>
                    <p className="text-sm font-semibold text-slate-700">{subjects.find(s => s.id === viewingStudent.subjectId)?.name || '---'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ngày sinh</label>
                    <p className="text-sm font-semibold text-slate-700">{formatDateDisplay(viewingStudent.dob) || 'Chưa cập nhật'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Số điện thoại</label>
                    <p className="text-sm font-semibold text-slate-700">{viewingStudent.phone || 'Chưa cập nhật'}</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Email</label>
                    <p className="text-sm font-semibold text-slate-700 break-all">{viewingStudent.email || 'Chưa cập nhật'}</p>
                  </div>
               </div>
            </div>

            {/* 75% History Column */}
            <div className="flex-1 p-10 overflow-y-auto bg-white flex flex-col">
               <div className="mb-8 flex justify-between items-end border-b border-slate-100 pb-6 shrink-0">
                  <div>
                    <h4 className="text-2xl font-extrabold text-slate-800">Quá trình học tập</h4>
                    <p className="text-slate-400 text-sm">Lịch sử tham gia các lớp học tại trung tâm</p>
                  </div>
                  <div className="text-right">
                     <span className="text-3xl font-black text-indigo-600">{studentHistory.length}</span>
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Tổng số lớp học</p>
                  </div>
               </div>

               <div className="flex-1 relative">
                  {studentHistory.length > 0 ? (
                    <div className="space-y-8 pl-8 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
                      {studentHistory.map((cls, idx) => {
                        const today = new Date().toISOString().split('T')[0];
                        const isActive = cls.endDate >= today;
                        return (
                          <div key={cls.id} className="relative animate-in slide-in-from-left duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                             {/* Timeline dot */}
                             <div className={`absolute -left-8 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center ${isActive ? 'bg-green-500' : 'bg-slate-300'}`}>
                                {isActive && <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>}
                             </div>

                             <div className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
                                <div className="flex justify-between items-start mb-2">
                                   <div>
                                      <h5 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{cls.courseName}</h5>
                                      <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-bold uppercase">{cls.class_id}</span>
                                   </div>
                                   <div className="text-right">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${isActive ? 'bg-green-100 text-green-600 border border-green-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}>
                                        {isActive ? 'Đang học' : 'Đã kết thúc'}
                                      </span>
                                   </div>
                                </div>
                                <div className="flex items-center gap-6 mt-4">
                                   <div className="flex items-center gap-2">
                                      <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                      <span className="text-xs text-slate-500 font-medium">{formatDateDisplay(cls.startDate)} → {formatDateDisplay(cls.endDate)}</span>
                                   </div>
                                   {cls.notes && (
                                     <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>
                                        <span className="text-xs text-slate-400 italic truncate max-w-[200px]">{cls.notes}</span>
                                     </div>
                                   )}
                                </div>
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 text-center px-12">
                       <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                         <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                       </div>
                       <p className="font-bold text-slate-400">Học viên chưa tham gia lớp học nào</p>
                       <p className="text-sm">Vui lòng vào mục <span className="text-indigo-600 font-bold underline cursor-pointer">Ghi danh</span> để thêm học viên vào lớp.</p>
                    </div>
                  )}
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
          <div className="text-sm text-indigo-800 leading-relaxed">
            <p className="font-bold mb-1">Mẹo quản lý:</p>
            <p>• Bấm vào nút <strong>ba chấm (...)</strong> để mở menu quản lý nhanh cho từng học viên.</p>
            <p>• Sử dụng chức năng <strong>Xem hồ sơ</strong> để theo dõi toàn bộ quá trình học tập (Timeline) của học viên theo thời gian.</p>
            <p>• <strong>Dòng thời gian:</strong> Lớp học mới nhất luôn hiển thị ở trên cùng để bạn dễ dàng nắm bắt trạng thái hiện tại.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentManager;
