
import React, { useState } from 'react';
import { Level, Subject } from '../types';

interface LevelManagerProps {
  levels: Level[];
  setLevels: React.Dispatch<React.SetStateAction<Level[]>>;
  subjects: Subject[];
}

const LevelManager: React.FC<LevelManagerProps> = ({ levels, setLevels, subjects }) => {
  const [formData, setFormData] = useState<Partial<Level>>({
    code: '',
    subjectId: '',
    name: '',
    resources: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const resetForm = () => {
    setFormData({ code: '', subjectId: '', name: '', resources: '' });
    setEditingId(null);
    setError(null);
  };

  const saveLevel = () => {
    const trimmedCode = formData.code?.trim().toUpperCase();
    const trimmedName = formData.name?.trim();
    const trimmedResources = formData.resources?.trim() || '';

    if (!trimmedCode || !formData.subjectId || !trimmedName) {
      setError("Vui lòng nhập đầy đủ thông tin: Mã, Môn học và Tên cấp độ.");
      return;
    }

    // Check if code is unique (Primary Key behavior)
    const duplicate = levels.find(l => l.code === trimmedCode && l.id !== editingId);
    if (duplicate) {
      setError(`Mã cấp độ "${trimmedCode}" đã tồn tại. Vui lòng chọn mã khác.`);
      return;
    }

    if (editingId) {
      setLevels(prev => prev.map(l => l.id === editingId ? { 
        ...l, 
        code: trimmedCode, 
        subjectId: formData.subjectId!, 
        name: trimmedName,
        resources: trimmedResources
      } : l));
    } else {
      const newLevel: Level = {
        id: crypto.randomUUID(),
        code: trimmedCode,
        subjectId: formData.subjectId,
        name: trimmedName,
        resources: trimmedResources
      };
      setLevels([...levels, newLevel]);
    }
    resetForm();
  };

  const startEdit = (level: Level) => {
    setFormData(level);
    setEditingId(level.id);
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const deleteLevel = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa cấp độ này?')) {
      setLevels(levels.filter(l => l.id !== id));
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 text-slate-800">
        <span>📈</span> Quản lý Cấp độ học
      </h2>

      {/* Entry Form */}
      <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm mb-10 transition-all">
        <h3 className="font-semibold text-slate-700 mb-6 flex items-center justify-between">
          <span>{editingId ? 'Chỉnh sửa cấp độ' : 'Thêm cấp độ mới'}</span>
          {editingId && (
            <button onClick={resetForm} className="text-sm text-indigo-600 hover:underline">Hủy chỉnh sửa</button>
          )}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã cấp độ (Duy nhất)</label>
            <input 
              name="code"
              type="text"
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 outline-none transition-all uppercase font-mono ${
                error && error.includes('Mã') ? 'border-red-400 focus:ring-red-100' : 'border-slate-200 focus:ring-indigo-500'
              }`}
              placeholder="VD: PET-01"
              value={formData.code || ''}
              onChange={handleInputChange}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thuộc môn học</label>
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên cấp độ</label>
            <input 
              name="name"
              type="text"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="VD: Sơ cấp 1"
              value={formData.name || ''}
              onChange={handleInputChange}
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tài nguyên / Đề cương (Link)</label>
            <input 
              name="resources"
              type="text"
              className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="VD: https://drive.google.com/file/d/..."
              value={formData.resources || ''}
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
        
        <div className="mt-6 flex justify-end">
          <button 
            onClick={saveLevel}
            className="bg-indigo-600 text-white px-8 py-2.5 rounded-lg hover:bg-indigo-700 transition-all font-bold shadow-md active:scale-95 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            {editingId ? 'Cập nhật cấp độ' : 'Lưu cấp độ'}
          </button>
        </div>
      </div>

      {/* Levels Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-200">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã cấp độ (PK)</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Môn học</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tên cấp độ</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tài nguyên</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest w-24 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {levels.map((level) => {
                const subject = subjects.find(s => s.id === level.subjectId);
                return (
                  <tr key={level.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-mono bg-indigo-50 px-2.5 py-1 rounded text-xs text-indigo-700 border border-indigo-100 font-bold">
                        {level.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-600">{subject?.name || '---'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-semibold">
                      {level.name}
                    </td>
                    <td className="px-6 py-4">
                      {level.resources ? (
                        <a 
                          href={level.resources} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                          Link đề cương
                        </a>
                      ) : (
                        <span className="text-xs text-slate-300 italic">Chưa có</span>
                      )}
                    </td>
                    <td className="px-6 py-4 flex items-center justify-center gap-2">
                      <button 
                        onClick={() => startEdit(level)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 transition-colors bg-white border border-transparent hover:border-indigo-100 rounded-lg hover:shadow-sm"
                        title="Sửa"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button 
                        onClick={() => deleteLevel(level.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 transition-colors bg-white border border-transparent hover:border-red-100 rounded-lg hover:shadow-sm"
                        title="Xóa"
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
        {levels.length === 0 && (
          <div className="py-20 text-center bg-slate-50/50">
             <div className="text-slate-200 mb-2">
               <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <p className="text-slate-400 italic">Chưa có cấp độ học nào được tạo.</p>
          </div>
        )}
      </div>

      <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl">
        <div className="flex gap-4">
          <div className="bg-blue-100 p-3 rounded-xl h-fit">
             <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div className="text-sm text-blue-800 leading-relaxed">
            <p className="font-bold mb-1">Ràng buộc dữ liệu (Data Constraint):</p>
            <p>• <strong>Mã cấp độ (Level Code)</strong> là định danh duy nhất (Primary Key). Hệ thống sẽ không cho phép tạo hai cấp độ có cùng mã.</p>
            <p>• Mã cấp độ sẽ tự động được viết hoa để đảm bảo tính nhất quán trong cơ sở dữ liệu.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LevelManager;
