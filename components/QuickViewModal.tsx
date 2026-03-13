
import React, { useMemo } from 'react';
import { X, User, BookOpen, Calendar, GraduationCap, Phone, Mail, Award, Clock, Users } from 'lucide-react';
import { Teacher, Student, Class, Subject, Level, Shift, Enrollment, StudentGrade, ScheduleRow } from '../types';
import { formatDateDisplay } from '../src/utils';

interface QuickViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { type: 'STUDENT' | 'TEACHER' | 'CLASS'; data: any } | null;
  subjects: Subject[];
  levels: Level[];
  shifts: Shift[];
  enrollments: Enrollment[];
  classes: Class[];
  teachers: Teacher[];
  students: Student[];
  grades: StudentGrade[];
  schedule: ScheduleRow[];
}

const QuickViewModal: React.FC<QuickViewModalProps> = ({
  isOpen,
  onClose,
  item,
  subjects,
  levels,
  shifts,
  enrollments,
  classes,
  teachers,
  students,
  grades,
  schedule
}) => {
  if (!isOpen || !item) return null;

  const { type, data } = item;

  // --- TEACHER VIEW LOGIC ---
  const teacherDetails = useMemo(() => {
    if (type !== 'TEACHER') return null;
    const teacherClasses = classes.filter(c => 
      schedule.some(s => s.teacherId === data.id && s.class_id === c.id)
    );
    const totalClasses = teacherClasses.length;
    const totalCourses = Array.from(new Set(teacherClasses.map(c => c.courseName))).length;

    const classList = teacherClasses.map(c => {
      const studentCount = enrollments.filter(e => e.class_id === c.id).length;
      return { ...c, studentCount };
    });

    return { totalClasses, totalCourses, classList };
  }, [type, data, classes, schedule, enrollments]);

  // --- STUDENT VIEW LOGIC ---
  const studentDetails = useMemo(() => {
    if (type !== 'STUDENT') return null;
    const studentEnrollments = enrollments.filter(e => e.student_id === data.id);
    const history = studentEnrollments.map(e => {
      const cls = classes.find(c => c.id === e.class_id);
      const grade = grades.find(g => g.student_id === data.id && g.class_id === e.class_id);
      return { class: cls, grade };
    }).filter(h => h.class);

    return { history };
  }, [type, data, enrollments, classes, grades]);

  // --- CLASS VIEW LOGIC ---
  const classDetails = useMemo(() => {
    if (type !== 'CLASS') return null;
    const teacherId = schedule.find(s => s.class_id === data.id)?.teacherId;
    const teacher = teachers.find(t => t.id === teacherId);
    const classEnrollments = enrollments.filter(e => e.class_id === data.id);
    const classStudents = classEnrollments.map(e => students.find(s => s.id === e.student_id)).filter(Boolean);
    const subject = subjects.find(s => s.id === data.subjectId);
    const level = levels.find(l => l.id === data.levelId);
    const shift = shifts.find(s => s.id === data.shiftId);

    return { teacher, classStudents, subject, level, shift };
  }, [type, data, schedule, teachers, enrollments, students, subjects, levels, shifts]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-3xl max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative border border-slate-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
              type === 'TEACHER' ? 'bg-indigo-100 text-indigo-600' :
              type === 'STUDENT' ? 'bg-emerald-100 text-emerald-600' :
              'bg-amber-100 text-amber-600'
            }`}>
              {type === 'TEACHER' ? <User size={24} /> : type === 'STUDENT' ? <GraduationCap size={24} /> : <BookOpen size={24} />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {type === 'TEACHER' ? data.name : type === 'STUDENT' ? data.full_name : data.class_id}
              </h2>
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                {type === 'TEACHER' ? 'Thông tin Giảng viên' : type === 'STUDENT' ? 'Thông tin Học viên' : 'Thông tin Lớp học'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
          {type === 'TEACHER' && teacherDetails && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Thông tin cá nhân</h3>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Phone size={16} className="text-indigo-500" />
                    <span>{data.phone || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Mail size={16} className="text-indigo-500" />
                    <span className="break-all">{data.email || 'Chưa cập nhật'}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-600">
                    <Award size={16} className="text-indigo-500" />
                    <span>{data.notes || 'Giảng viên trung tâm'}</span>
                  </div>
                </div>
                <div className="bg-indigo-50/50 rounded-2xl p-6 border border-indigo-100/50">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-4">Thống kê tổng quan</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-black text-indigo-600">{teacherDetails.totalCourses}</p>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Khóa đã dạy</p>
                    </div>
                    <div className="text-center border-l border-indigo-100">
                      <p className="text-2xl font-black text-indigo-600">{teacherDetails.totalClasses}</p>
                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Lớp đã dạy</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Danh sách lớp phụ trách</h3>
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Mã lớp</th>
                        <th className="px-4 py-3">Khóa học</th>
                        <th className="px-4 py-3">Sĩ số</th>
                        <th className="px-4 py-3">Thời gian</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {teacherDetails.classList.length > 0 ? teacherDetails.classList.map((cls, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-indigo-600">{cls.class_id}</td>
                          <td className="px-4 py-3 text-slate-600">{cls.courseName}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-bold">
                              {cls.studentCount} HV
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-[11px]">
                            {formatDateDisplay(cls.startDate)}
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">Chưa có dữ liệu lớp học</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {type === 'STUDENT' && studentDetails && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="w-32 h-32 rounded-3xl bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 shadow-inner">
                  <User size={64} />
                </div>
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Mã học viên</p>
                    <p className="font-bold text-slate-900">{data.student_id}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Số điện thoại</p>
                    <p className="font-bold text-slate-900">{data.phone || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</p>
                    <p className="font-bold text-slate-900 break-all">{data.email || '---'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Trạng thái</p>
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      data.status === 'Đang học' ? 'bg-green-100 text-green-700' :
                      data.status === 'Chờ lên kỳ' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-500'
                    }`}>
                      {data.status || 'Chưa học'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Lịch sử học tập & Điểm số</h3>
                <div className="overflow-hidden border border-slate-100 rounded-2xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Lớp học</th>
                        <th className="px-4 py-3">L</th>
                        <th className="px-4 py-3">R</th>
                        <th className="px-4 py-3">S</th>
                        <th className="px-4 py-3">W</th>
                        <th className="px-4 py-3">Tổng</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {studentDetails.history.length > 0 ? studentDetails.history.map((h, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3">
                            <p className="font-bold text-slate-900">{h.class?.class_id}</p>
                            <p className="text-[10px] text-slate-400">{h.class?.courseName}</p>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-600">{h.grade?.listening || '-'}</td>
                          <td className="px-4 py-3 font-medium text-slate-600">{h.grade?.reading || '-'}</td>
                          <td className="px-4 py-3 font-medium text-slate-600">{h.grade?.speaking || '-'}</td>
                          <td className="px-4 py-3 font-medium text-slate-600">{h.grade?.writing || '-'}</td>
                          <td className="px-4 py-3">
                            <span className="font-black text-emerald-600">
                              {h.grade?.total || '-'}
                            </span>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400 italic">Chưa có lịch sử học tập</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {type === 'CLASS' && classDetails && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Môn học</p>
                  <p className="font-bold text-slate-900">{classDetails.subject?.name || '---'}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Cấp độ</p>
                  <p className="font-bold text-slate-900">{classDetails.level?.name || '---'}</p>
                </div>
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ca học</p>
                  <p className="font-bold text-slate-900">{classDetails.shift?.name || '---'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Thông tin thời gian</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Ngày bắt đầu:</span>
                        <span className="font-bold text-slate-900">{formatDateDisplay(data.startDate)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Ngày kết thúc:</span>
                        <span className="font-bold text-slate-900">{formatDateDisplay(data.endDate)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-500">Số buổi:</span>
                        <span className="font-bold text-slate-900">{data.sessions} buổi</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-amber-600 mb-3 flex items-center gap-2">
                      <User size={14} /> Giảng viên phụ trách
                    </h3>
                    {classDetails.teacher ? (
                      <div>
                        <p className="font-bold text-slate-900">{classDetails.teacher.name}</p>
                        <p className="text-xs text-slate-500">{classDetails.teacher.email}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-400 italic">Chưa phân công giảng viên</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center justify-between">
                    <span>Danh sách học viên</span>
                    <span className="text-indigo-600">{classDetails.classStudents.length} HV</span>
                  </h3>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar border border-slate-100 rounded-2xl divide-y divide-slate-50">
                    {classDetails.classStudents.length > 0 ? classDetails.classStudents.map((s: any, idx) => (
                      <div key={idx} className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-[10px] font-bold">
                          {s.full_name?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{s.full_name}</p>
                          <p className="text-[10px] text-slate-400">{s.student_id}</p>
                        </div>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-400 italic text-sm">Chưa có học viên đăng ký</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickViewModal;
