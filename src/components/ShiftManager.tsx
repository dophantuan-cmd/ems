
import React, { useState } from 'react';
import { Shift } from '../types';

interface ShiftManagerProps {
  shifts: Shift[];
  setShifts: React.Dispatch<React.SetStateAction<Shift[]>>;
}

const DAYS_OF_WEEK = ["Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7", "Chủ nhật"];

const ShiftManager: React.FC<ShiftManagerProps> = ({ shifts, setShifts }) => {
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [editingShiftId, setEditingShiftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (day: string) => {
    setSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
    if (error) setError(null);
  };

  const saveShift = () => {
    if (!name.trim() || !time.trim()) {
      setError("Vui lòng nhập tên ca và khung giờ.");
      return;
    }
    if (selectedDays.length === 0) {
      setError("Vui lòng chọn ít nhất một ngày học trong tuần.");
      return;
    }

    if (editingShiftId) {
      // Update existing shift
      setShifts(shifts.map(s => s.id === editingShiftId ? {
        ...s,
        name: name.trim(),
        time: time.trim(),
        days: selectedDays
      } : s));
      setEditingShiftId(null);
    } else {
      // Add new shift
      const newShift: Shift = {
        id: crypto.randomUUID(),
        name: name.trim(),
        time: time.trim(),
        days: selectedDays
      };
      setShifts([...shifts, newShift]);
    }

    setName('');
    setTime('');
    setSelectedDays([]);
    setError(null);
  };

  const startEdit = (shift: Shift) => {
    setEditingShiftId(shift.id);
    setName(shift.name);
    setTime(shift.time);
    setSelectedDays(safeGetDays(shift.days));
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingShiftId(null);
    setName('');
    setTime('');
    setSelectedDays([]);
    setError(null);
  };

  const deleteShift = (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa ca học này?')) {
      setShifts(shifts.filter(s => s.id !== id));
    }
  };

  // Hàm helper để đảm bảo days luôn là một mảng
  const safeGetDays = (days: any): string[] => {
    if (Array.isArray(days)) return days;
    if (typeof days === 'string') {
      try {
        const parsed = JSON.parse(days);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        return days.split(',').map(d => d.trim()).filter(Boolean);
      }
    }
    return [];
  };

  return (
    <div className="p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2 text-slate-800">
            <span>⏰</span> Quản lý Ca học
          </h2>
          <p className="text-sm text-slate-500 mt-1">Thiết lập khung giờ và các ngày học cố định cho trung tâm.</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm mb-10">
        <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
           <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           {editingShiftId ? 'Cập nhật ca học' : 'Thiết lập ca học mới'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tên ca học</label>
            <input 
              type="text"
              placeholder="VD: Ca tối 2-4-6"
              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Khung giờ</label>
            <input 
              type="text"
              placeholder="VD: 18:00 - 19:30"
              className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-medium"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        <div className="mb-8">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 mb-3 block">Chọn các ngày trong tuần</label>
          <div className="flex flex-wrap gap-2">
            {DAYS_OF_WEEK.map(day => (
              <button
                key={day}
                onClick={() => toggleDay(day)}
                className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                  selectedDays.includes(day)
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-xl flex items-center gap-2 animate-bounce">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button 
            onClick={saveShift}
            className="bg-indigo-600 text-white px-10 py-3.5 rounded-2xl hover:bg-indigo-700 transition-all font-bold shadow-lg shadow-indigo-600/20 active:scale-95 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            {editingShiftId ? 'Cập nhật cấu hình' : 'Lưu cấu hình ca học'}
          </button>
          
          {editingShiftId && (
            <button 
              onClick={cancelEdit}
              className="bg-slate-100 text-slate-600 px-8 py-3.5 rounded-2xl hover:bg-slate-200 transition-all font-bold active:scale-95"
            >
              Hủy bỏ
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {shifts.map(shift => {
          const daysArray = safeGetDays(shift.days);
          return (
            <div key={shift.id} className="bg-white border border-slate-200 p-6 rounded-[2rem] shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all relative group">
              <div className="absolute top-6 right-6 flex gap-1 opacity-0 group-hover:opacity-100 transition-all">
                <button 
                  onClick={() => startEdit(shift)}
                  className="text-slate-300 hover:text-indigo-600 p-2 hover:bg-indigo-50 rounded-full transition-all"
                  title="Sửa ca học"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button 
                  onClick={() => deleteShift(shift.id)}
                  className="text-slate-300 hover:text-red-500 p-2 hover:bg-red-50 rounded-full transition-all"
                  title="Xóa ca học"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
              
              <div className="flex items-start gap-4 mb-4">
                 <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                 </div>
                 <div>
                    <h4 className="font-extrabold text-slate-800 text-lg leading-tight">{shift.name}</h4>
                    <p className="text-indigo-600 font-black text-sm mt-0.5">{shift.time}</p>
                 </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-4">
                {daysArray.map((day, idx) => (
                  <span key={idx} className="text-[9px] uppercase tracking-widest bg-slate-50 text-slate-500 px-2.5 py-1 rounded-lg border border-slate-100 font-black">
                    {day}
                  </span>
                ))}
                {daysArray.length === 0 && <span className="text-xs text-slate-300 italic">Chưa chọn ngày</span>}
              </div>
            </div>
          );
        })}
        {shifts.length === 0 && (
          <div className="col-span-full py-24 text-center bg-white border-2 border-dashed border-slate-200 rounded-[3rem]">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-200">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <p className="text-slate-400 font-medium italic">Hệ thống chưa có dữ liệu ca học. Vui lòng thêm ca học mới phía trên.</p>
          </div>
        )}
      </div>

      <div className="mt-12 p-6 bg-slate-100/50 rounded-3xl border border-slate-200/50 flex gap-4 items-center">
        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-indigo-500 shrink-0">
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase tracking-wider">
          Lưu ý: Các ca học này sẽ được sử dụng để lọc danh sách giáo viên rảnh khi bạn thực hiện nghiệp vụ xếp lịch dạy. Hãy đảm bảo khung giờ chính xác để tránh xung đột.
        </p>
      </div>
    </div>
  );
};

export default ShiftManager;
