
import React, { useState } from 'react';
import { Teacher, Subject, Shift } from '../types';
import { safeArray } from '../utils';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

interface TeacherManagerProps {
  teachers: Teacher[];
  setTeachers: React.Dispatch<React.SetStateAction<Teacher[]>>;
  subjects: Subject[];
  shifts: Shift[];
}

const TeacherManager: React.FC<TeacherManagerProps> = ({ teachers, setTeachers, subjects, shifts }) => {
  // Form State
  const [formData, setFormData] = useState<Partial<Teacher>>({
    name: '',
    gender: 'Nam',
    dob: '',
    phone: '',
    email: '',
    notes: '',
    driveLink: '',
    subjectIds: [],
    availableShiftIds: []
  });
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingTeacher, setViewingTeacher] = useState<Teacher | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Helpers
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleSubject = (id: string) => {
    setFormData(prev => {
      const current = safeArray(prev.subjectIds);
      return {
        ...prev,
        subjectIds: current.includes(id) ? current.filter(i => i !== id) : [...current, id]
      };
    });
  };

  const toggleShift = (id: string) => {
    setFormData(prev => {
      const current = safeArray(prev.availableShiftIds);
      return {
        ...prev,
        availableShiftIds: current.includes(id) ? current.filter(i => i !== id) : [...current, id]
      };
    });
  };

  const resetForm = () => {
    setFormData({
      name: '',
      gender: 'Nam',
      dob: '',
      phone: '',
      email: '',
      notes: '',
      driveLink: '',
      subjectIds: [],
      availableShiftIds: []
    });
    setEditingId(null);
  };

  const saveTeacher = () => {
    if (!formData.name) return;

    const teacherToSave = {
      ...formData,
      subjectIds: safeArray(formData.subjectIds),
      availableShiftIds: safeArray(formData.availableShiftIds)
    };

    if (editingId) {
      setTeachers(prev => prev.map(t => t.id === editingId ? { ...t, ...teacherToSave as Teacher } : t));
    } else {
      const newTeacher: Teacher = {
        ...(teacherToSave as Teacher),
        id: crypto.randomUUID()
      };
      setTeachers([...teachers, newTeacher]);
    }
    resetForm();
  };

  const startEdit = (teacher: Teacher) => {
    setFormData({
      ...teacher,
      subjectIds: safeArray(teacher.subjectIds),
      availableShiftIds: safeArray(teacher.availableShiftIds)
    });
    setEditingId(teacher.id);
    setOpenMenuId(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteTeacher = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa giáo viên này?')) {
      setTeachers(teachers.filter(t => t.id !== id));
      setOpenMenuId(null);
    }
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Danh sách giáo viên');

    // 1. Header
    const schoolRow = worksheet.getRow(1);
    schoolRow.getCell(1).value = 'TRƯỜNG ĐH KHXH & NV';
    schoolRow.getCell(1).font = { name: 'Times New Roman', bold: true, size: 12 };

    const centerRow = worksheet.getRow(2);
    centerRow.getCell(1).value = 'TRUNG TÂM NGOẠI NGỮ';
    centerRow.getCell(1).font = { name: 'Times New Roman', bold: true, size: 12 };

    // 2. Title
    const titleRow = worksheet.getRow(4);
    titleRow.getCell(1).value = 'DANH SÁCH GIẢNG VIÊN';
    titleRow.getCell(1).font = { name: 'Times New Roman', bold: true, size: 16 };
    titleRow.getCell(1).alignment = { horizontal: 'center' };
    worksheet.mergeCells('A4:F4');

    // 3. Table Headers (Row 6)
    const headerRow = worksheet.getRow(6);
    const headers = ['STT', 'Họ và tên', 'Giới tính', 'Ngày sinh', 'Số điện thoại', 'Email', 'Môn dạy', 'Link Drive'];
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = { name: 'Times New Roman', bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // 4. Data
    teachers.forEach((teacher, index) => {
      const row = worksheet.getRow(index + 7);
      const teacherSubjects = safeArray(teacher.subjectIds)
        .map(sid => subjects.find(s => s.id === sid)?.name || '')
        .filter(Boolean)
        .join(', ');

      const dobFormatted = teacher.dob ? teacher.dob.split('-').reverse().join('-') : '';

      const values = [
        index + 1,
        teacher.name,
        teacher.gender || '---',
        dobFormatted,
        teacher.phone,
        teacher.email,
        teacherSubjects,
        teacher.driveLink || ''
      ];

      values.forEach((val, i) => {
        const cell = row.getCell(i + 1);
        cell.value = val;
        cell.font = { name: 'Times New Roman' };
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        if (i === 0 || i === 2) {
          cell.alignment = { horizontal: 'center' };
        }
      });
    });

    // 5. Auto-fit columns
    worksheet.columns.forEach(column => {
      let maxColumnLength = 0;
      column.eachCell({ includeEmpty: true }, cell => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxColumnLength) {
          maxColumnLength = columnLength;
        }
      });
      column.width = maxColumnLength < 10 ? 10 : maxColumnLength + 5;
    });

    // Write to buffer and save
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Danh_sach_giang_vien_${new Date().getTime()}.xlsx`);
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Template Import');
    
    worksheet.columns = [
      { header: 'Họ và tên', key: 'name', width: 25 },
      { header: 'Giới tính (Nam/Nữ)', key: 'gender', width: 15 },
      { header: 'Ngày sinh (YYYY-MM-DD)', key: 'dob', width: 20 },
      { header: 'Số điện thoại', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Link Drive', key: 'driveLink', width: 30 },
      { header: 'Ghi chú', key: 'notes', width: 30 },
      { header: 'Môn dạy (Tên môn học, cách nhau bởi dấu phẩy)', key: 'subjects', width: 40 },
      { header: 'Ca học rảnh (Tên ca học, cách nhau bởi dấu phẩy)', key: 'shifts', width: 40 }
    ];

    // Add sample row
    worksheet.addRow({
      name: 'Nguyễn Văn A',
      gender: 'Nam',
      dob: '1990-01-01',
      phone: '0901234567',
      email: 'nguyenvana@gmail.com',
      driveLink: 'https://drive.google.com/drive/folders/...',
      notes: 'Kinh nghiệm 5 năm',
      subjects: subjects.length > 0 ? subjects[0].name : 'IELTS, TOEIC',
      shifts: shifts.length > 0 ? shifts[0].name : 'Ca Tối 2-4-6'
    });

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), 'Mau_Import_Giang_Vien.xlsx');
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);
        
        const newTeachers: Teacher[] = [];
        
        worksheet?.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return; // Skip header

          const name = row.getCell(1).text;
          if (!name || name === 'Họ và tên') return;

          const genderRaw = row.getCell(2).text;
          const gender = (genderRaw === 'Nữ' || genderRaw === 'nữ') ? 'Nữ' : 'Nam';
          const dob = row.getCell(3).text;
          const phone = row.getCell(4).text;
          const email = row.getCell(5).text;
          const driveLink = row.getCell(6).text;
          const notes = row.getCell(7).text;
          const subjectNamesStr = row.getCell(8).text;
          const shiftNamesStr = row.getCell(9).text;

          const subjectNames = subjectNamesStr ? subjectNamesStr.split(',').map(s => s.trim()) : [];
          const shiftNames = shiftNamesStr ? shiftNamesStr.split(',').map(s => s.trim()) : [];

          const subjectIds = subjectNames
            .map(name => subjects.find(s => s.name.toLowerCase() === name.toLowerCase())?.id)
            .filter((id): id is string => !!id);

          const availableShiftIds = shiftNames
            .map(name => shifts.find(sh => sh.name.toLowerCase() === name.toLowerCase())?.id)
            .filter((id): id is string => !!id);

          newTeachers.push({
            id: crypto.randomUUID(),
            name,
            gender,
            dob,
            phone,
            email,
            driveLink,
            notes,
            subjectIds,
            availableShiftIds
          });
        });

        if (newTeachers.length > 0) {
          setTeachers(prev => [...prev, ...newTeachers]);
          alert(`Đã nhập thành công ${newTeachers.length} giáo viên.`);
        } else {
          alert('Không tìm thấy dữ liệu hợp lệ trong file.');
        }
      } catch (error) {
        console.error('Import error:', error);
        alert('Có lỗi xảy ra khi đọc file. Vui lòng kiểm tra lại định dạng file.');
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = ''; // Reset input
  };

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
          <span>👨‍🏫</span> Quản lý Giáo viên
        </h2>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <label className="flex items-center gap-2 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-all border-r border-slate-100 group">
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleImport} />
              <svg className="w-4 h-4 text-indigo-600 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              <span className="text-xs font-bold text-slate-600">Import</span>
            </label>
            <button 
              onClick={downloadTemplate}
              className="px-4 py-2.5 hover:bg-slate-50 transition-all group"
              title="Tải file mẫu import"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-y-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
            </button>
          </div>
        </div>
      </div>

      {/* Entry Form */}
      <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm mb-10 transition-all">
        <h3 className="font-extrabold text-slate-700 mb-8 flex items-center justify-between">
          <span className="flex items-center gap-2 text-indigo-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {editingId ? 'Cập nhật hồ sơ giáo viên' : 'Đăng ký giáo viên mới'}
          </span>
          {editingId && (
            <button onClick={resetForm} className="text-xs font-bold text-red-500 uppercase tracking-widest hover:bg-red-50 px-4 py-2 rounded-xl transition-all">Hủy điều chỉnh</button>
          )}
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-6">
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Họ và tên giáo viên</label>
              <div className="flex gap-2">
                <select 
                  name="gender"
                  className="w-32 px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-bold text-slate-700"
                  value={formData.gender || 'Nam'}
                  onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value as 'Nam' | 'Nữ' }))}
                >
                  <option value="Nam">Thầy</option>
                  <option value="Nữ">Cô</option>
                </select>
                <input 
                  name="name"
                  type="text"
                  className="flex-1 px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-slate-700"
                  placeholder="VD: Nguyễn Văn A"
                  value={formData.name || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ngày sinh</label>
                <input 
                  name="dob"
                  type="date"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-slate-700"
                  value={formData.dob || ''}
                  onChange={handleInputChange}
                />
              </div>
              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Số điện thoại</label>
                <input 
                  name="phone"
                  type="tel"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-slate-700 font-mono"
                  placeholder="09xxx..."
                  value={formData.phone || ''}
                  onChange={handleInputChange}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Địa chỉ Email</label>
              <input 
                name="email"
                type="email"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-slate-700"
                placeholder="email@example.com"
                value={formData.email || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Link Drive cá nhân</label>
              <input 
                name="driveLink"
                type="text"
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-slate-700 font-mono"
                placeholder="https://drive.google.com/..."
                value={formData.driveLink || ''}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-1">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Ghi chú & Kinh nghiệm</label>
              <textarea 
                name="notes"
                rows={3}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all font-medium text-slate-600 text-sm"
                placeholder="VD: Có 5 năm kinh nghiệm giảng dạy IELTS..."
                value={formData.notes || ''}
                onChange={handleInputChange}
              ></textarea>
            </div>
          </div>

          <div className="space-y-8">
            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Chuyên môn giảng dạy</label>
              <div className="flex flex-wrap gap-2">
                {subjects.map(s => (
                  <button
                    key={s.id}
                    onClick={() => toggleSubject(s.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      safeArray(formData.subjectIds).includes(s.id)
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
                {subjects.length === 0 && <p className="text-xs text-slate-300 italic">Vui lòng thêm Môn học trước</p>}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Khung giờ rảnh đăng ký</label>
              <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-3 custom-scrollbar">
                {shifts.map(sh => (
                  <div 
                    key={sh.id}
                    onClick={() => toggleShift(sh.id)}
                    className={`p-4 border-2 rounded-2xl cursor-pointer transition-all flex items-center justify-between ${
                      safeArray(formData.availableShiftIds).includes(sh.id)
                      ? 'bg-indigo-50 border-indigo-500 shadow-sm'
                      : 'bg-white border-slate-100 hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div>
                      <p className={`font-bold text-sm ${safeArray(formData.availableShiftIds).includes(sh.id) ? 'text-indigo-700' : 'text-slate-700'}`}>{sh.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{sh.time}</p>
                    </div>
                    {safeArray(formData.availableShiftIds).includes(sh.id) ? (
                       <div className="w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center text-white">
                         <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                       </div>
                    ) : (
                       <div className="w-6 h-6 border-2 border-slate-100 rounded-full"></div>
                    )}
                  </div>
                ))}
                {shifts.length === 0 && <p className="text-xs text-slate-300 italic">Vui lòng thêm Ca học trước</p>}
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-10 pt-8 border-t border-slate-50 flex justify-end gap-4">
          <button 
            onClick={exportToExcel}
            className="bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-2xl hover:bg-slate-50 transition-all font-bold shadow-sm active:scale-95 flex items-center gap-3"
          >
            <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Tải danh sách
          </button>
          <button 
            onClick={saveTeacher}
            className="bg-indigo-600 text-white px-12 py-4 rounded-2xl hover:bg-indigo-700 transition-all font-bold shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            {editingId ? 'Cập nhật thay đổi' : 'Lưu hồ sơ giáo viên'}
          </button>
        </div>
      </div>

      {/* Teachers List View */}
      <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-200">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hồ sơ giáo viên</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Môn học phụ trách</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Ca học đã gán</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map((teacher, index) => {
                const isNearBottom = index >= teachers.length - 2 && teachers.length > 2;
                const teacherSubjectIds = safeArray(teacher.subjectIds);
                const teacherShiftIds = safeArray(teacher.availableShiftIds);

                return (
                  <tr key={teacher.id} className="hover:bg-indigo-50/20 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-sm border border-indigo-100">
                          {teacher.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 text-sm leading-none">
                            <span className="text-slate-400 font-normal mr-1">{teacher.gender === 'Nữ' ? 'Cô' : 'Thầy'}</span>
                            {teacher.name}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-1 font-medium">{teacher.email || 'Chưa cập nhật email'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-wrap gap-1.5">
                        {teacherSubjectIds.map(sid => (
                          <span key={sid} className="bg-white text-indigo-600 px-2.5 py-1 rounded-lg text-[9px] font-black border border-indigo-100 uppercase tracking-tighter">
                            {subjects.find(s => s.id === sid)?.name || 'N/A'}
                          </span>
                        ))}
                        {teacherSubjectIds.length === 0 && <span className="text-slate-300 text-[10px] italic">Trống</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-wrap gap-1.5">
                        {teacherShiftIds.map(shid => (
                          <span key={shid} className="bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg text-[9px] font-black border border-slate-100 uppercase tracking-tighter">
                            {shifts.find(sh => sh.id === shid)?.name || 'N/A'}
                          </span>
                        ))}
                        {teacherShiftIds.length === 0 && <span className="text-slate-300 text-[10px] italic">Trống</span>}
                      </div>
                    </td>
                    <td className="px-8 py-5 relative">
                      <button 
                        onClick={() => setOpenMenuId(openMenuId === teacher.id ? null : teacher.id)}
                        className="p-2.5 hover:bg-white border border-transparent hover:border-slate-200 rounded-xl transition-all text-slate-400 active:scale-90"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" /></svg>
                      </button>
                      
                      {openMenuId === teacher.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)}></div>
                          <div className={`absolute right-12 w-56 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 py-3 overflow-hidden animate-in fade-in zoom-in duration-150 ${
                            isNearBottom ? 'bottom-0 mb-4 origin-bottom-right' : 'top-4 origin-top-right'
                          }`}>
                            <button 
                              onClick={() => { setViewingTeacher(teacher); setOpenMenuId(null); }}
                              className="w-full px-5 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-600 font-bold group"
                            >
                              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                              </span>
                              Xem hồ sơ chi tiết
                            </button>
                            <button 
                              onClick={() => startEdit(teacher)}
                              className="w-full px-5 py-3 text-left text-sm hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-600 font-bold group"
                            >
                              <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                              </span>
                              Điều chỉnh thông tin
                            </button>
                            <div className="border-t border-slate-50 my-2"></div>
                            <button 
                              onClick={() => deleteTeacher(teacher.id)}
                              className="w-full px-5 py-3 text-left text-sm hover:bg-red-50 flex items-center gap-3 transition-colors text-red-600 font-bold group"
                            >
                              <span className="p-1.5 bg-red-50 text-red-600 rounded-lg group-hover:bg-red-600 group-hover:text-white transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </span>
                              Xóa giáo viên
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
        {teachers.length === 0 && (
          <div className="py-32 text-center bg-slate-50/30">
            <div className="text-slate-200 mb-4 scale-150 opacity-50">
               <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            </div>
            <p className="text-slate-400 font-medium italic">Danh sách giáo viên đang trống.</p>
          </div>
        )}
      </div>

      {/* View Modal */}
      {viewingTeacher && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="bg-slate-900 px-10 py-10 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-12 bg-indigo-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
              <button 
                onClick={() => setViewingTeacher(null)}
                className="absolute top-8 right-8 bg-white/10 hover:bg-white/20 p-2.5 rounded-2xl transition-all active:scale-90 border border-white/10 z-10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              <div className="flex items-center gap-6 relative z-10">
                <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center text-3xl font-black shadow-xl shadow-indigo-600/30 border-4 border-white/10">
                  {viewingTeacher.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-2xl font-black tracking-tight">{viewingTeacher.name}</h4>
                  <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-1">Instructor Profile</p>
                </div>
              </div>
            </div>
            
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10 bg-white">
              <div className="space-y-8">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Liên hệ
                  </p>
                  <div className="space-y-4">
                    <div className="flex flex-col">
                       <span className="text-[10px] text-slate-400 font-bold">GIỚI TÍNH</span>
                       <span className="text-sm font-bold text-slate-700">{viewingTeacher.gender || 'Nam'}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] text-slate-400 font-bold">NGÀY SINH</span>
                       <span className="text-sm font-bold text-slate-700">{formatDateDisplay(viewingTeacher.dob)}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] text-slate-400 font-bold">SỐ ĐIỆN THOẠI</span>
                       <span className="text-sm font-bold text-slate-700 font-mono">{viewingTeacher.phone || '---'}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] text-slate-400 font-bold">EMAIL</span>
                       <span className="text-sm font-bold text-slate-700 break-all">{viewingTeacher.email || '---'}</span>
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[10px] text-slate-400 font-bold">LINK DRIVE</span>
                       {viewingTeacher.driveLink ? (
                         <a href={viewingTeacher.driveLink} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-indigo-600 hover:underline break-all">
                           {viewingTeacher.driveLink}
                         </a>
                       ) : (
                         <span className="text-sm font-bold text-slate-400 italic">Chưa cập nhật</span>
                       )}
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                    Nghiệp vụ
                  </p>
                  <div className="space-y-5">
                    <div>
                      <p className="text-[9px] text-slate-400 mb-1.5 font-black uppercase">Chuyên môn:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {safeArray(viewingTeacher.subjectIds).map(sid => (
                          <span key={sid} className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg text-[10px] font-bold border border-indigo-100">
                            {subjects.find(s => s.id === sid)?.name}
                          </span>
                        ))}
                        {safeArray(viewingTeacher.subjectIds).length === 0 && <span className="text-slate-400 italic text-[10px]">Chưa đăng ký</span>}
                      </div>
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 mb-1.5 font-black uppercase">Lịch rảnh:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {safeArray(viewingTeacher.availableShiftIds).map(shid => (
                          <span key={shid} className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-bold border border-slate-100">
                            {shifts.find(sh => sh.id === shid)?.name}
                          </span>
                        ))}
                        {safeArray(viewingTeacher.availableShiftIds).length === 0 && <span className="text-slate-400 italic text-[10px]">Chưa đăng ký</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 bg-indigo-500 rounded-full"></span>
                  Ghi chú
                </p>
                <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed italic flex-1">
                  {viewingTeacher.notes || 'Không có ghi chú bổ sung.'}
                </div>
                <div className="mt-8 pt-6 border-t border-slate-200/50 flex items-center justify-between">
                   <div className="flex -space-x-2">
                      <div className="w-6 h-6 rounded-full bg-indigo-200 border-2 border-slate-50"></div>
                      <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-slate-50"></div>
                   </div>
                   <span className="text-[9px] font-bold text-slate-400 uppercase">Verified Instructor</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-10 py-6 flex justify-end">
              <button 
                onClick={() => setViewingTeacher(null)}
                className="bg-white border border-slate-200 text-slate-700 px-10 py-3 rounded-2xl hover:bg-slate-100 transition-all font-bold shadow-sm active:scale-95"
              >
                Đóng hồ sơ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherManager;
