
import React, { useState, useMemo } from 'react';
import { Class, Subject, Level, Shift, Teacher, Student, Enrollment, ScheduleRow } from '../types';

interface ClassManagerProps {
  classes: Class[];
  setClasses: React.Dispatch<React.SetStateAction<Class[]>>;
  subjects: Subject[];
  levels: Level[];
  shifts: Shift[];
  teachers: Teacher[];
  students: Student[];
  enrollments: Enrollment[];
  setEnrollments: React.Dispatch<React.SetStateAction<Enrollment[]>>;
  schedule: ScheduleRow[];
}

const ClassManager: React.FC<ClassManagerProps> = ({ 
  classes, 
  setClasses, 
  subjects, 
  levels, 
  shifts, 
  teachers, 
  students,
  enrollments,
  setEnrollments,
  schedule
}) => {
  const [formData, setFormData] = useState<Partial<Class>>({
    class_id: '',
    courseName: '',
    subjectId: '',
    levelId: '',
    shiftId: '',
    startDate: '',
    endDate: '',
    sessions: '',
    periods: '',
    room: '',
    notes: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [viewingClass, setViewingClass] = useState<Class | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [enrollingClassId, setEnrollingClassId] = useState<string | null>(null);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [classSearchTerm, setClassSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Helpers
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  };

  const calculateClassStatus = (startDate: string, endDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Tính số ngày còn lại đến ngày kết thúc
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (start > today) {
      return { label: 'Pending', color: 'bg-blue-100 text-blue-600 border-blue-200', shadow: 'shadow-blue-500/20' };
    }

    if (end < today) {
      return { label: 'Đã kết thúc', color: 'bg-slate-100 text-slate-500 border-slate-200', shadow: 'shadow-slate-500/20' };
    }

    if (diffDays >= 15) {
      return { label: 'Đang hoạt động', color: 'bg-green-100 text-green-700 border-green-200', shadow: 'shadow-green-500/20' };
    }

    if (diffDays >= 7) {
      return { label: 'Sắp kết thúc', color: 'bg-yellow-100 text-yellow-700 border-yellow-200', shadow: 'shadow-yellow-500/20' };
    }

    return { label: 'Sắp kết thúc', color: 'bg-red-100 text-red-700 border-red-200', shadow: 'shadow-red-500/20' };
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const updates = { ...prev, [name]: value };
      if (name === 'subjectId') {
        updates.levelId = '';
      }
      return updates;
    });
    if (error) setError(null);
  };

  const resetForm = () => {
    setFormData({
      class_id: '',
      courseName: '',
      subjectId: '',
      levelId: '',
      shiftId: '',
      startDate: '',
      endDate: '',
      sessions: '',
      periods: '',
      room: '',
      notes: ''
    });
    setEditingId(null);
    setError(null);
  };

  const filteredLevels = useMemo(() => {
    if (!formData.subjectId) return [];
    return levels.filter(l => l.subjectId === formData.subjectId);
  }, [levels, formData.subjectId]);

  const saveClass = () => {
    const trimmedId = formData.class_id?.trim().toUpperCase();
    const trimmedCourse = formData.courseName?.trim();

    const sessionsVal = formData.sessions !== undefined && formData.sessions !== '' ? Number(formData.sessions) : null;
    const periodsVal = formData.periods !== undefined && formData.periods !== '' ? Number(formData.periods) : null;

    if (!trimmedId || !trimmedCourse || !formData.subjectId || !formData.levelId || !formData.shiftId || !formData.startDate || !formData.endDate || sessionsVal === null || periodsVal === null) {
      setError("Vui lòng điền đầy đủ các thông tin bắt buộc.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const duplicate = classes.find(c => c.class_id === trimmedId && c.id !== editingId);
    if (duplicate) {
      setError(`Mã lớp "${trimmedId}" đã tồn tại.`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const startDate = formData.startDate?.split('T')[0] || '';
    const endDate = formData.endDate?.split('T')[0] || '';

    if (editingId) {
      setClasses(prev => prev.map(c => c.id === editingId ? { 
        ...c, 
        ...formData,
        class_id: trimmedId,
        courseName: trimmedCourse,
        startDate,
        endDate,
        sessions: Number(formData.sessions) || 0,
        periods: Number(formData.periods) || 0,
        room: formData.room || '',
        status: c.status // Preserve existing status if any
      } as Class : c));
    } else {
      const newClass: Class = {
        ...(formData as Class),
        id: crypto.randomUUID(),
        class_id: trimmedId,
        courseName: trimmedCourse,
        startDate,
        endDate,
        sessions: Number(formData.sessions) || 0,
        periods: Number(formData.periods) || 0,
        room: formData.room || '',
        notes: formData.notes || '',
        status: '' // placeholder
      };
      setClasses([...classes, newClass]);
    }
    resetForm();
  };

  const startEdit = (cls: Class) => {
    setFormData(cls);
    setEditingId(cls.id);
    setError(null);
    setOpenMenuId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteClass = (id: string) => {
    if (confirm('Xóa lớp học này khỏi hệ thống?')) {
      setClasses(classes.filter(c => c.id !== id));
      setEnrollments(prev => prev.filter(e => e.class_id !== id));
      setOpenMenuId(null);
    }
  };

  const openEnrollment = (id: string) => {
    setEnrollingClassId(id);
    setStudentSearchTerm('');
    setOpenMenuId(null);
  };

  const closeEnrollment = () => {
    setEnrollingClassId(null);
  };

  const enrollingClass = useMemo(() => 
    classes.find(c => c.id === enrollingClassId), 
  [classes, enrollingClassId]);

  const checkStudentConflict = (studentId: string, targetClassId: string) => {
    const targetClass = classes.find(c => c.id === targetClassId);
    if (!targetClass) return [];

    const targetStart = new Date(targetClass.startDate).getTime();
    const targetEnd = new Date(targetClass.endDate).getTime();

    const studentEnrolledClassIds = enrollments
      .filter(e => e.student_id === studentId && e.class_id !== targetClassId)
      .map(e => e.class_id);

    return classes.filter(c => {
      if (!studentEnrolledClassIds.includes(c.id)) return false;
      if (c.shiftId !== targetClass.shiftId) return false;

      const otherStart = new Date(c.startDate).getTime();
      const otherEnd = new Date(c.endDate).getTime();
      
      return Math.max(targetStart, otherStart) <= Math.min(targetEnd, otherEnd);
    });
  };

  // Pre-calculate enrollment lookup for faster checks
  const enrollmentLookup = useMemo(() => {
    const lookup: Record<string, Set<string>> = {};
    enrollments.forEach(e => {
      if (!lookup[e.class_id]) lookup[e.class_id] = new Set();
      lookup[e.class_id].add(e.student_id);
    });
    return lookup;
  }, [enrollments]);

  const eligibleStudents = useMemo(() => {
    if (!enrollingClass) return [];
    
    const currentClassEnrollments = enrollmentLookup[enrollingClass.id] || new Set();

    return students.filter(student => {
      const isSameSubject = student.subjectId === enrollingClass.subjectId;
      if (!isSameSubject) return false;
      
      const isEnrolled = currentClassEnrollments.has(student.id);
      if (isEnrolled) return true; // Keep in list to allow toggling off

      return true; // Simplified for this view
    }).filter(s => 
      s.full_name.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
      s.student_id.toLowerCase().includes(studentSearchTerm.toLowerCase())
    );
  }, [enrollingClass, students, enrollmentLookup, studentSearchTerm]);

  const toggleEnrollment = (studentId: string) => {
    if (!enrollingClassId) return;
    const currentClassEnrollments = enrollmentLookup[enrollingClassId] || new Set();
    const isEnrolled = currentClassEnrollments.has(studentId);
    if (isEnrolled) {
      setEnrollments(prev => prev.filter(e => !(e.class_id === enrollingClassId && e.student_id === studentId)));
    } else {
      // Find teacher assigned to this class from schedule
      const sched = schedule.find(s => s.class_id === enrollingClassId);
      const newEnrollment: Enrollment = {
        id: crypto.randomUUID(),
        class_id: enrollingClassId,
        student_id: studentId,
        teacherId: sched?.teacherId || ''
      };
      setEnrollments(prev => [...prev, newEnrollment]);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Pre-calculate student counts for classes
  const studentCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    enrollments.forEach(e => {
      counts[e.class_id] = (counts[e.class_id] || 0) + 1;
    });
    return counts;
  }, [enrollments]);

  const sortedAndFilteredClasses = useMemo(() => {
    let result = [...classes];

    // Filter
    if (classSearchTerm) {
      const lowerSearch = classSearchTerm.toLowerCase();
      result = result.filter(c => 
        c.courseName.toLowerCase().includes(lowerSearch) || 
        c.class_id.toLowerCase().includes(lowerSearch)
      );
    }

    // Sort
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue: any = a[sortConfig.key as keyof Class];
        let bValue: any = b[sortConfig.key as keyof Class];

        // Custom logic for special columns
        if (sortConfig.key === 'subject') {
          aValue = subjects.find(s => s.id === a.subjectId)?.name || '';
          bValue = subjects.find(s => s.id === b.subjectId)?.name || '';
        } else if (sortConfig.key === 'studentCount') {
          aValue = studentCounts[a.id] || 0;
          bValue = studentCounts[b.id] || 0;
        } else if (sortConfig.key === 'status') {
          aValue = calculateClassStatus(a.startDate, a.endDate).label;
          bValue = calculateClassStatus(b.startDate, b.endDate).label;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [classes, classSearchTerm, sortConfig, subjects, studentCounts]);

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (!sortConfig || sortConfig.key !== columnKey) {
      return (
        <svg className="w-3 h-3 ml-1 text-slate-300 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortConfig.direction === 'asc' ? (
      <svg className="w-3 h-3 ml-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-3 h-3 ml-1 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-800">
        <span>🏫</span> Quản lý Lớp học
      </h2>

      {/* Entry Form */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm mb-10 transition-all">
        <h3 className="font-semibold text-slate-700 mb-6 flex items-center justify-between">
          <span>{editingId ? 'Chỉnh sửa thông tin lớp' : 'Mở lớp học mới'}</span>
          {editingId && (
            <button onClick={resetForm} className="text-sm text-indigo-600 hover:underline">Hủy chỉnh sửa</button>
          )}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên khóa học</label>
            <input 
              name="courseName"
              type="text"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="VD: Tiếng Anh cho người mới"
              value={formData.courseName || ''}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã lớp (PK)</label>
            <input 
              name="class_id"
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all uppercase font-mono ${
                error && error.includes('Mã') ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:ring-indigo-500'
              }`}
              placeholder="VD: ENG-L1-01"
              value={formData.class_id || ''}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Môn học</label>
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cấp độ</label>
            <select 
              name="levelId"
              disabled={!formData.subjectId}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all disabled:bg-slate-50"
              value={formData.levelId || ''}
              onChange={handleInputChange}
            >
              <option value="">-- Chọn cấp độ --</option>
              {filteredLevels.map(l => (
                <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ca học</label>
            <select 
              name="shiftId"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={formData.shiftId || ''}
              onChange={handleInputChange}
            >
              <option value="">-- Chọn ca học --</option>
              {shifts.map(sh => (
                <option key={sh.id} value={sh.id}>{sh.name} ({sh.time})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày bắt đầu</label>
            <input 
              name="startDate"
              type="date"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={formData.startDate || ''}
              onChange={handleInputChange}
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày kết thúc</label>
            <input 
              name="endDate"
              type="date"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={formData.endDate || ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số buổi</label>
              <input 
                name="sessions"
                type="number"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="VD: 24"
                value={formData.sessions === 0 ? 0 : (formData.sessions || '')}
                onChange={handleInputChange}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Số tiết</label>
              <input 
                name="periods"
                type="number"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                placeholder="VD: 48"
                value={formData.periods === 0 ? 0 : (formData.periods || '')}
                onChange={handleInputChange}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phòng học</label>
            <input 
              name="room"
              type="text"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="VD: Phòng 101"
              value={formData.room || ''}
              onChange={handleInputChange}
            />
          </div>

          <div className="lg:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ghi chú</label>
            <textarea 
              name="notes"
              rows={2}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none text-sm"
              placeholder="Nhập thông tin ghi chú cho lớp học..."
              value={formData.notes || ''}
              onChange={handleInputChange}
            ></textarea>
          </div>

          <div className="flex items-center">
            <button 
              onClick={saveClass}
              className="w-full h-[52px] bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-md active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {editingId ? 'Cập nhật' : 'Lưu lớp'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-100 text-red-600 text-sm rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}
      </div>

      {/* Classes List Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-slate-700 flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
            Danh sách Lớp học
          </h3>
          <div className="relative w-full md:w-72">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </span>
            <input 
              type="text"
              placeholder="Tìm tên hoặc mã lớp..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={classSearchTerm}
              onChange={(e) => setClassSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-200">
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors group"
                  onClick={() => handleSort('courseName')}
                >
                  <div className="flex items-center">Khóa học <SortIcon columnKey="courseName" /></div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors group"
                  onClick={() => handleSort('class_id')}
                >
                  <div className="flex items-center">Mã lớp <SortIcon columnKey="class_id" /></div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-colors group"
                  onClick={() => handleSort('subject')}
                >
                  <div className="flex items-center">Môn học <SortIcon columnKey="subject" /></div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                  onClick={() => handleSort('sessions')}
                >
                  <div className="flex items-center justify-center">Số buổi <SortIcon columnKey="sessions" /></div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                  onClick={() => handleSort('periods')}
                >
                  <div className="flex items-center justify-center">Số tiết <SortIcon columnKey="periods" /></div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                  onClick={() => handleSort('studentCount')}
                >
                  <div className="flex items-center justify-center">Sĩ số <SortIcon columnKey="studentCount" /></div>
                </th>
                <th 
                  className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center cursor-pointer hover:bg-slate-100 transition-colors group"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-center">Trạng thái <SortIcon columnKey="status" /></div>
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-20 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedAndFilteredClasses.map((cls, index) => {
                const subject = subjects.find(s => s.id === cls.subjectId);
                const statusInfo = calculateClassStatus(cls.startDate, cls.endDate);
                const isNearBottom = index >= sortedAndFilteredClasses.length - 2 && sortedAndFilteredClasses.length > 2;

                return (
                  <tr key={cls.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-800 text-sm">{cls.courseName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono bg-purple-50 px-2 py-1 rounded text-xs text-purple-700 border border-purple-100 font-bold">
                        {cls.class_id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{subject?.name || '---'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-bold text-slate-600">{cls.sessions || '---'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-bold text-slate-600">{cls.periods || '---'}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-xs font-black border border-indigo-100">
                        {studentCounts[cls.id] || 0}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center relative">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === cls.id ? null : cls.id)}
                        className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400 active:scale-90"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                      </button>

                      {openMenuId === cls.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)}></div>
                          <div className={`absolute right-12 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2 overflow-hidden animate-in fade-in zoom-in duration-150 ${
                            isNearBottom ? 'bottom-0 mb-4 origin-bottom-right' : 'top-4 origin-top-right'
                          }`}>
                            <button 
                              onClick={() => { setViewingClass(cls); setOpenMenuId(null); }}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-600 group"
                            >
                              <svg className="w-4 h-4 text-slate-400 group-hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              Xem chi tiết
                            </button>
                            <button 
                              onClick={() => openEnrollment(cls.id)}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-600 group"
                            >
                              <svg className="w-4 h-4 text-slate-400 group-hover:text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                              Thêm học viên
                            </button>
                            <button 
                              onClick={() => startEdit(cls)}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-600 group"
                            >
                              <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              Điều chỉnh
                            </button>
                            <div className="border-t border-slate-100 my-1"></div>
                            <button 
                              onClick={() => deleteClass(cls.id)}
                              className="w-full px-4 py-2.5 text-left text-sm hover:bg-red-50 flex items-center gap-3 transition-colors text-red-600 group"
                            >
                              <svg className="w-4 h-4 text-red-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              Xóa lớp
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
      </div>

      {/* Class Detail View Modal */}
      {viewingClass && (() => {
        const statusInfo = calculateClassStatus(viewingClass.startDate, viewingClass.endDate);
        const shift = shifts.find(s => s.id === viewingClass.shiftId);
        const sched = schedule.find(s => s.class_id === viewingClass.id || s.className === viewingClass.class_id);
        const teacher = sched ? teachers.find(t => t.id === sched.teacherId) : null;
        const studentCount = studentCounts[viewingClass.id] || 0;

        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className={`bg-white rounded-[2rem] border-2 ${statusInfo.color.replace('bg-', 'border-').replace('text-', 'border-')} w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl ${statusInfo.shadow}`}>
              <div className={`px-8 py-6 flex justify-between items-center border-b border-slate-100`}>
                <div>
                   <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${statusInfo.color} mb-2 inline-block`}>
                      {statusInfo.label}
                   </span>
                   <h3 className="text-xl font-extrabold text-slate-800">{viewingClass.courseName}</h3>
                </div>
                <button onClick={() => setViewingClass(null)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Mã lớp học</label>
                      <p className="font-mono text-indigo-600 font-bold">{viewingClass.class_id}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Giáo viên phụ trách</label>
                      <p className="text-sm font-semibold text-slate-700">{teacher?.name || 'Chưa gán giáo viên'}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Sĩ số hiện tại</label>
                      <div className="flex items-center gap-2">
                         <span className="text-lg font-black text-slate-800">{studentCount}</span>
                         <span className="text-xs text-slate-400 font-medium">Học viên</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Số buổi học</label>
                      <p className="text-sm font-semibold text-slate-700">{viewingClass.sessions} buổi</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Số tiết học</label>
                      <p className="text-sm font-semibold text-slate-700">{viewingClass.periods} tiết</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ca học</label>
                      <p className="text-sm font-semibold text-slate-700">{shift?.name || '---'}</p>
                      <p className="text-[10px] text-slate-400">{shift?.time}</p>
                    </div>
                 </div>

                 <div className="pt-6 border-t border-slate-50 grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ngày bắt đầu</label>
                      <p className="text-sm font-medium text-slate-600">{formatDateDisplay(viewingClass.startDate)}</p>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ngày kết thúc</label>
                      <p className="text-sm font-medium text-slate-600">{formatDateDisplay(viewingClass.endDate)}</p>
                    </div>
                 </div>

                 {viewingClass.notes && (
                   <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Ghi chú vận hành</label>
                      <p className="text-xs text-slate-600 italic leading-relaxed">{viewingClass.notes}</p>
                   </div>
                 )}
              </div>

              <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
                 <button onClick={() => setViewingClass(null)} className="px-8 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-colors shadow-sm">
                   Đóng cửa sổ
                 </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Enrollment Modal */}
      {enrollingClass && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="bg-green-600 px-6 py-6 text-white flex justify-between items-center shrink-0">
              <div>
                <h4 className="text-xl font-bold flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Ghi danh học viên
                </h4>
                <p className="text-green-50 opacity-90 text-sm mt-1">
                  Khóa: <span className="font-bold">{enrollingClass.courseName}</span> • Lớp: <span className="font-bold">{enrollingClass.class_id}</span>
                </p>
              </div>
              <button 
                onClick={closeEnrollment}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 shrink-0 border-b border-slate-100 bg-slate-50/50">
              <input 
                type="text" 
                placeholder="Tìm kiếm học viên..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none transition-all shadow-sm"
                value={studentSearchTerm}
                onChange={(e) => setStudentSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              <div className="grid grid-cols-1 gap-2">
                {eligibleStudents.map(student => {
                  const isEnrolled = enrollmentLookup[enrollingClass.id]?.has(student.id);
                  const conflicts = !isEnrolled ? checkStudentConflict(student.id, enrollingClass.id) : [];
                  const hasConflict = conflicts.length > 0;

                  return (
                    <div 
                      key={student.id}
                      onClick={() => toggleEnrollment(student.id)}
                      className={`p-4 border-2 rounded-2xl cursor-pointer transition-all flex items-center justify-between group ${
                        isEnrolled ? 'border-green-500 bg-green-50/50 shadow-md' : 
                        hasConflict ? 'border-amber-200 bg-amber-50/30 hover:border-amber-400' :
                        'border-slate-100 hover:border-green-200 bg-white hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                          isEnrolled ? 'bg-green-500 text-white' : 
                          hasConflict ? 'bg-amber-100 text-amber-600' :
                          'bg-slate-100 text-slate-400 group-hover:bg-green-100 group-hover:text-green-600'
                        }`}>
                          {student.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={`font-bold text-sm ${isEnrolled ? 'text-green-700' : 'text-slate-700'}`}>{student.full_name}</p>
                            {hasConflict && (
                              <span className="bg-amber-100 text-amber-700 text-[8px] px-1.5 py-0.5 rounded font-black uppercase tracking-tighter flex items-center gap-1">
                                <svg className="w-2 h-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                Trùng lịch
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {student.student_id}
                            {hasConflict && <span className="ml-2 text-amber-500 font-bold italic">({conflicts.map(c => c.class_id).join(', ')})</span>}
                          </p>
                        </div>
                      </div>
                      {isEnrolled ? (
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      ) : hasConflict ? (
                        <div className="w-5 h-5 rounded-full border-2 border-amber-200"></div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-slate-100 group-hover:border-green-200"></div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 flex justify-end">
              <button 
                onClick={closeEnrollment}
                className="bg-green-600 text-white px-10 py-2.5 rounded-xl hover:bg-green-700 transition-all font-bold shadow-md active:scale-95"
              >
                Hoàn tất
              </button>
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
            <p className="font-bold mb-1 text-indigo-900">Tính năng Mới:</p>
            <p>• <strong>Bubble Menu:</strong> Bấm vào nút "ba chấm" ở cuối mỗi dòng để mở menu thao tác nhanh.</p>
            <p>• <strong>Shadow Glow Modal:</strong> Cửa sổ xem chi tiết lớp học sẽ có hiệu ứng đổ bóng trùng với màu sắc của trạng thái lớp hiện tại để bạn dễ dàng nhận diện nhanh.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassManager;
