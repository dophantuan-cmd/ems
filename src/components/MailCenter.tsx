
import React, { useState, useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import { Teacher, Class, ScheduleRow, Shift, Enrollment, Subject, Level } from '../types';

interface MailCenterProps {
  teachers: Teacher[];
  classes: Class[];
  schedule: ScheduleRow[];
  shifts: Shift[];
  enrollments: Enrollment[];
  subjects: Subject[];
  levels: Level[];
  formatDateDisplay: (dateStr: string) => string;
}

const MailCenter: React.FC<MailCenterProps> = ({
  teachers,
  classes,
  schedule,
  shifts,
  enrollments,
  subjects,
  levels,
  formatDateDisplay
}) => {
  const [selectedMailTeacherId, setSelectedMailTeacherId] = useState('');
  const [consolidatedMailList, setConsolidatedMailList] = useState<Record<string, string[]>>({});
  const [mailSubject, setMailSubject] = useState('Thông báo lịch dạy mới - Trung tâm Ngoại ngữ');
  const [mailBody, setMailBody] = useState(`
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 900px; margin: auto; border: 1px solid #eee; padding: 30px; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #4f46e5; margin-bottom: 5px;">THÔNG BÁO LỊCH DẠY MỚI</h1>
    <p style="color: #666; font-style: italic;">Trung tâm Ngoại ngữ - Trường Đại học KHXH&NV</p>
  </div>
  
  <p>Chào <strong>{DANH_XUNG} {TEN_GIAO_VIEN}</strong>,</p>
  
  <p>Trung tâm xin gửi đến {DANH_XUNG.toLowerCase()} chi tiết lịch giảng dạy cho các lớp học sắp tới. {DANH_XUNG} vui lòng kiểm tra kỹ thông tin trong bảng dưới đây:</p>
  
  <div style="overflow-x: auto; margin: 25px 0;">
    {LICH_DAY}
  </div>

  <p>Thầy/cô có thể truy cập kho tài liệu cá nhân: {LINK_DRIVE}</p>
  
  <div style="background-color: #f9fafb; padding: 15px; border-radius: 10px; border-left: 4px solid #4f46e5; margin-bottom: 25px;">
    <p style="margin: 0; font-size: 13px;"><strong>Lưu ý:</strong> Thầy/cô vui lòng có mặt trước giờ học 10 phút để chuẩn bị thiết bị và ổn định lớp. Nếu có bất kỳ thay đổi nào về lịch trình, xin vui lòng liên hệ bộ phận Giáo vụ sớm nhất có thể.</p>
  </div>
  
  <p>Trân trọng cảm ơn thầy/cô,</p>
  <p><strong>Ban Quản lý Đào tạo</strong><br/>Trung tâm Ngoại ngữ</p>
  
  <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
  <p style="font-size: 11px; color: #999; text-align: center;">Đây là email tự động từ hệ thống quản lý Language Center Scheduler Pro. Vui lòng không trả lời trực tiếp email này.</p>
</div>
  `.trim());
  const [recipientEmail, setRecipientEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [isTeacherSearchOpen, setIsTeacherSearchOpen] = useState(false);

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
      [{ 'color': [] }, { 'background': [] }],
      ['link', 'clean']
    ],
  };

  const filteredMailTeachers = useMemo(() => {
    return teachers.filter(t => 
      t.name.toLowerCase().includes(teacherSearchQuery.toLowerCase())
    );
  }, [teachers, teacherSearchQuery]);

  const addToConsolidatedMail = (teacherId: string, scheduleId: string) => {
    setConsolidatedMailList(prev => {
      const current = prev[teacherId] || [];
      if (current.includes(scheduleId)) return prev;
      return { ...prev, [teacherId]: [...current, scheduleId] };
    });
  };

  const removeFromConsolidatedMail = (teacherId: string, scheduleId: string) => {
    setConsolidatedMailList(prev => {
      const current = prev[teacherId] || [];
      const updated = current.filter(id => id !== scheduleId);
      if (updated.length === 0) {
        const { [teacherId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [teacherId]: updated };
    });
  };

  const generateScheduleTableHTML = (teacherId: string, scheduleIds: string[]) => {
    const teacher = teachers.find(t => t.id === teacherId);
    const rows = scheduleIds.map(sid => {
      const row = schedule.find(s => s.id === sid);
      const classObj = classes.find(c => c.id === row?.class_id);
      const subject = subjects.find(s => s.id === row?.subjectId)?.name || '---';
      const level = levels.find(l => l.id === classObj?.levelId);
      const shift = shifts.find(s => s.id === row?.shiftId)?.name || '---';
      const studentCount = enrollments.filter(e => e.class_id === row?.class_id).length;
      
      const resourceLink = level?.resources 
        ? `<a href="${level.resources}" style="color: #4f46e5; text-decoration: underline;">Xem đề cương</a>`
        : '<span style="color: #94a3b8; font-style: italic;">Chưa cập nhật</span>';

      return `
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center; font-family: monospace; font-weight: bold; color: #4f46e5;">${classObj?.class_id || '---'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; font-weight: bold;">${subject}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;">${classObj?.periods || '---'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;">${studentCount}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;">${shift}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;">${formatDateDisplay(row?.startDate || '')}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;">${formatDateDisplay(row?.endDate || '')}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;">${resourceLink}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; font-size: 11px; color: #64748b;">${classObj?.notes || '---'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px; text-align: center;">${teacher?.phone || '---'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 12px;">${teacher?.name || '---'}</td>
        </tr>
      `;
    }).join('');

    return `
      <table style="width: 100%; border-collapse: collapse; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <thead>
          <tr style="background-color: #f8fafc; color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em;">
            <th style="border: 1px solid #e2e8f0; padding: 12px;">Mã lớp</th>
            <th style="border: 1px solid #e2e8f0; padding: 12px;">Ngoại ngữ</th>
            <th style="border: 1px solid #e2e8f0; padding: 12px;">Số tiết</th>
            <th style="border: 1px solid #e2e8f0; padding: 12px;">Sĩ số</th>
            <th style="border: 1px solid #e2e8f0; padding: 12px;">Ca học</th>
            <th style="border: 1px solid #e2e8f0; padding: 12px;">Khai giảng</th>
            <th style="border: 1px solid #e2e8f0; padding: 12px;">Kết thúc</th>
            <th style="border: 1px solid #e2e8f0; padding: 12px;">Đề cương</th>
            <th style="border: 1px solid #e2e8f0; padding: 12px;">Ghi chú</th>
            <th style="border: 1px solid #e2e8f0; padding: 12px;">SĐT GV</th>
            <th style="border: 1px solid #e2e8f0; padding: 12px;">Giảng viên</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  };

  const handleSendMail = async () => {
    setIsSending(true);
    const consolidatedEntries = Object.entries(consolidatedMailList) as [string, string[]][];
    
    try {
      if (consolidatedEntries.length === 0) {
        if (!recipientEmail) {
          alert("Vui lòng nhập email người nhận");
          return;
        }
        
        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipientEmail,
            subject: mailSubject,
            body: mailBody
          })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gửi mail thất bại");
        
        alert(`Đã gửi email thành công đến ${recipientEmail}`);
      } else {
        let successCount = 0;
        for (const [teacherId, scheduleIds] of consolidatedEntries) {
          const teacher = teachers.find(t => t.id === teacherId);
          if (!teacher?.email) continue;

          const teacherTable = generateScheduleTableHTML(teacherId, scheduleIds);
          
          const driveLinkHtml = teacher.driveLink 
            ? `<a href="${teacher.driveLink}" style="color: #4f46e5; font-weight: bold; text-decoration: underline;">TẠI ĐÂY</a>`
            : '<span style="color: #94a3b8; font-style: italic;">Chưa cập nhật</span>';

          const danhXung = teacher.gender === 'Nữ' ? 'Cô' : 'Thầy';

          const personalizedBody = mailBody
            .replace('{LICH_DAY}', teacherTable)
            .replace('{TEN_GIAO_VIEN}', teacher.name)
            .replace(/{DANH_XUNG}/g, danhXung)
            .replace(/{LINK_DRIVE}/g, driveLinkHtml);
          
          const response = await fetch("/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: teacher.email,
              subject: mailSubject,
              body: personalizedBody
            })
          });

          if (response.ok) successCount++;
        }
        alert(`Đã gửi mail merge thành công cho ${successCount}/${consolidatedEntries.length} giáo viên`);
        setConsolidatedMailList({});
      }
    } catch (error: any) {
      console.error("Mail error:", error);
      alert(`Lỗi: ${error.message || "Có lỗi xảy ra khi gửi mail"}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 animate-in slide-in-from-right duration-300">
      {/* Top Row: Lists */}
      <div className="grid grid-cols-12 gap-6">
        {/* Teacher List */}
        <div className="col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[300px]">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            {!isTeacherSearchOpen ? (
              <>
                <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">1. Danh sách giáo viên</h3>
                <button 
                  onClick={() => setIsTeacherSearchOpen(true)}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                  title="Tìm kiếm giáo viên"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2 w-full animate-in slide-in-from-right-2 duration-200">
                <div className="relative flex-1">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Tìm tên giáo viên..."
                    value={teacherSearchQuery}
                    onChange={(e) => setTeacherSearchQuery(e.target.value)}
                    className="w-full pl-7 pr-2 py-1 text-xs border border-indigo-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <button 
                  onClick={() => {
                    setIsTeacherSearchOpen(false);
                    setTeacherSearchQuery('');
                  }}
                  className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-400"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {filteredMailTeachers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-[10px] text-center px-4">
                {teacherSearchQuery ? 'Không tìm thấy giáo viên' : 'Danh sách trống'}
              </div>
            ) : (
              filteredMailTeachers.map(t => (
                <div 
                  key={t.id} 
                  onClick={() => setSelectedMailTeacherId(t.id)}
                  className={`p-3 border-b border-slate-50 cursor-pointer transition-colors hover:bg-indigo-50 ${selectedMailTeacherId === t.id ? 'bg-indigo-100/50 border-l-4 border-indigo-600' : ''}`}
                >
                  <p className="font-bold text-sm text-slate-700">{t.name}</p>
                  <p className="text-[10px] text-slate-400">{t.email || '---'}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Class List */}
        <div className="col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[300px]">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">2. Lịch dạy giáo viên</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {!selectedMailTeacherId ? (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-xs text-center px-4">
                Chọn giáo viên để xem lịch dạy
              </div>
            ) : (
              schedule.filter(s => s.teacherId === selectedMailTeacherId).length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-300 italic text-xs text-center px-4">
                  Giáo viên chưa được gán lớp nào
                </div>
              ) : (
                schedule.filter(s => s.teacherId === selectedMailTeacherId).map(row => {
                  const classObj = classes.find(c => c.id === row.class_id);
                  const shift = shifts.find(s => s.id === row.shiftId);
                  return (
                    <div 
                      key={row.id} 
                      onDoubleClick={() => addToConsolidatedMail(selectedMailTeacherId, row.id)}
                      className="p-4 border-b border-slate-50 cursor-pointer hover:bg-indigo-50 transition-all select-none group"
                      title="Double click để thêm vào danh sách tổng hợp"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-bold text-sm text-slate-700 group-hover:text-indigo-600">{classObj?.courseName}</p>
                        <span className="text-[9px] font-black bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded uppercase">{classObj?.class_id}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 flex items-center gap-1">
                        <span>🕒</span> {shift?.name} ({shift?.time})
                      </p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {formatDateDisplay(row.startDate)} - {formatDateDisplay(row.endDate)}
                      </p>
                    </div>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Consolidated List */}
        <div className="col-span-4 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-[300px]">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-widest">3. Danh sách tổng hợp</h3>
            <button 
              onClick={() => setConsolidatedMailList({})}
              className="text-[10px] text-rose-500 font-bold hover:underline"
            >
              Xóa hết
            </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
            {Object.keys(consolidatedMailList).length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-300 italic text-xs text-center px-4">
                Double click vào lịch dạy để thêm vào danh sách gửi mail merge
              </div>
            ) : (
              (Object.entries(consolidatedMailList) as [string, string[]][]).map(([teacherId, scheduleIds]) => {
                const teacher = teachers.find(t => t.id === teacherId);
                return (
                  <div key={teacherId} className="mb-4 bg-slate-50 rounded-xl p-3 border border-slate-100">
                    <p className="font-black text-indigo-600 text-[11px] uppercase mb-2 border-b border-indigo-100 pb-1">
                      Giáo viên: {teacher?.name}
                    </p>
                    <div className="space-y-1">
                      {scheduleIds.map(sid => {
                        const row = schedule.find(s => s.id === sid);
                        const classObj = classes.find(c => c.id === row?.class_id);
                        return (
                          <div 
                            key={sid} 
                            className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 group"
                          >
                            <span className="text-[10px] font-bold text-slate-600">
                              {classObj?.courseName} ({classObj?.class_id})
                            </span>
                            <button 
                              onClick={() => removeFromConsolidatedMail(teacherId, sid)}
                              className="text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Mail Composer */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
        <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
          <h3 className="font-bold text-xs uppercase tracking-widest">4. Soạn thảo Email (Rich Text Editor)</h3>
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded">Từ: dophantuan@hcmussh.edu.vn</span>
            <button 
              onClick={handleSendMail}
              disabled={isSending}
              className={`px-8 py-2 rounded-lg font-bold text-xs shadow-lg transition-all flex items-center gap-2 ${
                isSending ? 'bg-slate-400 cursor-not-allowed' : 'bg-white text-indigo-600 hover:bg-slate-100 active:scale-95'
              }`}
            >
              {isSending ? (
                <>
                  <div className="w-3 h-3 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></div>
                  Đang gửi...
                </>
              ) : (
                <>
                  <span>✈️</span> {Object.keys(consolidatedMailList).length > 0 ? `Gửi Mail Merge (${Object.keys(consolidatedMailList).length})` : 'Gửi Email'}
                </>
              )}
            </button>
          </div>
        </div>
        <div className="p-6 flex-1 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            {Object.keys(consolidatedMailList).length === 0 && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Người nhận (Email)</label>
                <input 
                  type="email" 
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="example@gmail.com"
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
            
            <div className={Object.keys(consolidatedMailList).length === 0 ? "col-span-1" : "col-span-2"}>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tiêu đề Email</label>
              <input 
                type="text" 
                value={mailSubject}
                onChange={(e) => setMailSubject(e.target.value)}
                className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              />
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nội dung thư</label>
            <div className="flex-1 min-h-[400px] flex flex-col">
              <ReactQuill 
                theme="snow"
                value={mailBody}
                onChange={setMailBody}
                modules={quillModules}
                className="flex-1 flex flex-col h-full"
                style={{ height: '400px' }}
              />
            </div>
            {Object.keys(consolidatedMailList).length > 0 && (
              <div className="mt-12 p-4 bg-indigo-50 border border-indigo-100 rounded-xl flex justify-between items-center">
                <div className="flex gap-4">
                  <p className="text-[10px] text-indigo-700">
                    * Biến <strong>{'{LICH_DAY}'}</strong>: Chèn bảng lịch dạy.
                  </p>
                  <p className="text-[10px] text-indigo-700">
                    * Biến <strong>{'{TEN_GIAO_VIEN}'}</strong>: Chèn tên giáo viên.
                  </p>
                  <p className="text-[10px] text-indigo-700">
                    * Biến <strong>{'{DANH_XUNG}'}</strong>: Chèn "Thầy" hoặc "Cô" dựa trên giới tính.
                  </p>
                  <p className="text-[10px] text-indigo-700">
                    * Biến <strong>{'{LINK_DRIVE}'}</strong>: Chèn link Drive cá nhân của giáo viên.
                  </p>
                </div>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Chế độ Mail Merge đang bật</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MailCenter;
