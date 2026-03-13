
import React, { useState, useMemo, useEffect } from 'react';
import { Teacher, Subject, Class, Enrollment, ScheduleRow, Attendance, StudentGrade, Student } from '../types';

interface ReportsProps {
  teachers: Teacher[];
  subjects: Subject[];
  classes: Class[];
  enrollments: Enrollment[];
  schedule: ScheduleRow[];
  attendance: Attendance[];
  grades: StudentGrade[];
  students: Student[];
  initialMainTab?: 'TEACHER' | 'STUDENT';
}

const Reports: React.FC<ReportsProps> = ({ teachers, subjects, classes, enrollments, schedule, attendance, grades, students, initialMainTab }) => {
  const [activeMainTab, setActiveMainTab] = useState<'TEACHER' | 'STUDENT'>(initialMainTab || 'TEACHER');

  useEffect(() => {
    if (initialMainTab) {
      setActiveMainTab(initialMainTab);
    }
  }, [initialMainTab]);

  const [activeSubTab, setActiveSubTab] = useState<'PERSONAL' | 'GENERAL'>('PERSONAL');
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  
  // General Report filters
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  
  // Helpers
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  };

  // Pre-calculate lookups for performance
  const attendanceLookup = useMemo(() => {
    const map: { [key: string]: Attendance[] } = {};
    attendance.forEach(a => {
      const key = `${a.class_id}_${a.student_id}`;
      if (!map[key]) map[key] = [];
      map[key].push(a);
    });
    return map;
  }, [attendance]);

  const enrollmentsByClass = useMemo(() => {
    const map: { [key: string]: Enrollment[] } = {};
    enrollments.forEach(e => {
      if (!map[e.class_id]) map[e.class_id] = [];
      map[e.class_id].push(e);
    });
    return map;
  }, [enrollments]);

  const enrollmentsByStudent = useMemo(() => {
    const map: { [key: string]: Enrollment[] } = {};
    enrollments.forEach(e => {
      if (!map[e.student_id]) map[e.student_id] = [];
      map[e.student_id].push(e);
    });
    return map;
  }, [enrollments]);

  const gradesByClass = useMemo(() => {
    const map: { [key: string]: StudentGrade[] } = {};
    grades.forEach(g => {
      if (!map[g.class_id]) map[g.class_id] = [];
      map[g.class_id].push(g);
    });
    return map;
  }, [grades]);

  // Helper function for dropout calculation
  const calculateIsDroppedOut = (studentId: string, classId: string, totalSessions: number) => {
    const key = `${classId}_${studentId}`;
    const studentAttendance = [...(attendanceLookup[key] || [])]
      .sort((a, b) => a.sessionIndex - b.sessionIndex);
    
    if (studentAttendance.length === 0) return false;

    let maxConsecutive = 0;
    let currentConsecutive = 0;

    studentAttendance.forEach(record => {
      if (!record.isPresent) {
        currentConsecutive++;
        if (currentConsecutive > maxConsecutive) maxConsecutive = currentConsecutive;
      } else {
        currentConsecutive = 0;
      }
    });

    return maxConsecutive >= (totalSessions * 0.5);
  };

  const teacherStats = useMemo(() => {
    if (!selectedTeacherId) return null;

    // Find all schedule entries for this teacher
    let teacherSchedule = schedule.filter(s => s.teacherId === selectedTeacherId);
    
    // Filter by subject if selected
    if (selectedSubjectId) {
      teacherSchedule = teacherSchedule.filter(s => s.subjectId === selectedSubjectId);
    }

    // Get unique class IDs taught by this teacher
    const classIds = Array.from(new Set(teacherSchedule.map(s => s.class_id)));
    
    // Get the actual class objects
    const teacherClasses = classes.filter(c => classIds.includes(c.id));
    
    // Total classes
    const totalClasses = teacherClasses.length;
    
    // Total courses (unique subjects)
    const totalCourses = Array.from(new Set(teacherClasses.map(c => c.subjectId))).length;
    
    // Total students (unique student IDs in those classes)
    const teacherEnrollments = classIds.flatMap(cid => enrollmentsByClass[cid] || []);
    const uniqueStudentIds = Array.from(new Set(teacherEnrollments.map(e => e.student_id)));
    const totalStudents = uniqueStudentIds.length;

    // Calculate Re-enrollment Rate (Tỷ lệ lên kỳ)
    const today = new Date().toISOString().split('T')[0];
    const finishedClasses = teacherClasses.filter(c => c.endDate < today);
    const finishedClassIds = finishedClasses.map(c => c.id);
    
    const studentsWhoFinished = Array.from(new Set(
      finishedClassIds.flatMap(cid => enrollmentsByClass[cid] || []).map(e => e.student_id)
    ));

    let reEnrolledCount = 0;
    studentsWhoFinished.forEach(sid => {
      const studentEnrolls = enrollmentsByStudent[sid] || [];
      const studentClassesWithTeacher = teacherClasses.filter(c => 
        studentEnrolls.some(e => e.class_id === c.id) && c.endDate < today
      );
      
      if (studentClassesWithTeacher.length === 0) return;
      
      const latestEndDate = studentClassesWithTeacher.reduce((latest, c) => 
        c.endDate > latest ? c.endDate : latest, studentClassesWithTeacher[0].endDate
      );

      const hasFutureEnrollment = studentEnrolls.some(e => {
        const targetClass = classes.find(c => c.id === e.class_id);
        return targetClass && targetClass.startDate > latestEndDate;
      });

      if (hasFutureEnrollment) reEnrolledCount++;
    });

    const reEnrollmentRate = studentsWhoFinished.length > 0 
      ? Math.round((reEnrolledCount / studentsWhoFinished.length) * 100) 
      : 0;

    // Detailed class metrics
    const classMetrics = teacherClasses.map(c => {
      const totalSessions = typeof c.sessions === 'string' ? parseInt(c.sessions) : c.sessions;
      const classEnrolls = enrollmentsByClass[c.id] || [];
      
      const dropouts = classEnrolls.filter(e => calculateIsDroppedOut(e.student_id, c.id, totalSessions));
      const classDropoutRate = classEnrolls.length > 0 ? Math.round((dropouts.length / classEnrolls.length) * 100) : 0;
      
      // Calculate Absentee Rate (Tỷ lệ vắng thi)
      const classGrades = gradesByClass[c.id] || [];
      const absentCount = classGrades.filter(g => g.isAbsent).length;
      const absenteeRate = classEnrolls.length > 0 ? Math.round((absentCount / classEnrolls.length) * 100) : 0;

      // Calculate Student Progress (Tiến bộ học viên - Average Total Score)
      const totalScores = classGrades.map(g => {
        if (g.isAbsent) return 0;
        if (g.total !== undefined) return Number(g.total) || 0;
        return (Number(g.midterm) || 0) + (Number(g.listening) || 0) + (Number(g.reading) || 0) + (Number(g.speaking) || 0) + (Number(g.writing) || 0);
      });
      const avgProgress = totalScores.length > 0 
        ? Math.round((totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length) * 10) / 10 
        : 0;

      return {
        ...c,
        studentCount: classEnrolls.length,
        dropoutCount: dropouts.length,
        dropoutRate: classDropoutRate,
        absenteeRate,
        avgProgress
      };
    });

    let totalEnrollmentsCount = 0;
    classIds.forEach(cid => {
      totalEnrollmentsCount += (enrollmentsByClass[cid]?.length || 0);
    });

    let totalDropoutsCount = 0;
    classMetrics.forEach(m => {
      totalDropoutsCount += m.dropoutCount;
    });

    const avgDropoutRate = totalEnrollmentsCount > 0 ? Math.round((totalDropoutsCount / totalEnrollmentsCount) * 100) : 0;

    const avgProgressAcrossClasses = classMetrics.length > 0
      ? Math.round((classMetrics.reduce((sum, m) => sum + m.avgProgress, 0) / classMetrics.length) * 10) / 10
      : 0;

    // Reputation Score Calculation:
    // 40% Re-enrollment Rate + 40% Normalized Progress (assuming max 50) + 20% Retention (100 - Dropout)
    const normalizedProgress = Math.min((avgProgressAcrossClasses / 50) * 100, 100);
    const reputationScore = Math.round(
      (reEnrollmentRate * 0.4) + 
      (normalizedProgress * 0.4) + 
      ((100 - avgDropoutRate) * 0.2)
    );

    return {
      totalClasses,
      totalCourses,
      totalStudents,
      reEnrollmentRate,
      dropoutRate: avgDropoutRate,
      dropoutCount: totalDropoutsCount,
      studentsWhoFinished: studentsWhoFinished.length,
      avgProgress: avgProgressAcrossClasses,
      reputationScore,
      classMetrics
    };
  }, [selectedTeacherId, selectedSubjectId, schedule, classes, enrollments, attendance, grades]);

  const selectedTeacher = teachers.find(t => t.id === selectedTeacherId);

  const generalStats = useMemo(() => {
    if (activeMainTab !== 'TEACHER' || activeSubTab !== 'GENERAL') return [];

    // Filter classes by date range
    const filteredClasses = classes.filter(c => c.startDate >= startDate && c.startDate <= endDate);

    return filteredClasses.map(c => {
      const totalSessions = typeof c.sessions === 'string' ? parseInt(c.sessions) : c.sessions;
      const classEnrolls = enrollmentsByClass[c.id] || [];
      
      // Find teacher for this class
      const sched = schedule.find(s => s.class_id === c.id);
      const teacher = teachers.find(t => t.id === sched?.teacherId);

      const dropouts = classEnrolls.filter(e => calculateIsDroppedOut(e.student_id, c.id, totalSessions));
      const dropoutRate = classEnrolls.length > 0 ? Math.round((dropouts.length / classEnrolls.length) * 100) : 0;
      
      const classGrades = gradesByClass[c.id] || [];
      const absentCount = classGrades.filter(g => g.isAbsent).length;
      const absenteeRate = classEnrolls.length > 0 ? Math.round((absentCount / classEnrolls.length) * 100) : 0;

      const totalScores = classGrades.map(g => {
        if (g.isAbsent) return 0;
        if (g.total !== undefined) return Number(g.total) || 0;
        return (Number(g.midterm) || 0) + (Number(g.listening) || 0) + (Number(g.reading) || 0) + (Number(g.speaking) || 0) + (Number(g.writing) || 0);
      });
      const avgProgress = totalScores.length > 0 
        ? Math.round((totalScores.reduce((sum, score) => sum + score, 0) / totalScores.length) * 10) / 10 
        : 0;

      return {
        ...c,
        teacherName: teacher?.name || 'Chưa phân công',
        dropoutRate,
        absenteeRate,
        avgProgress
      };
    });
  }, [activeMainTab, activeSubTab, startDate, endDate, classes, enrollments, schedule, teachers, attendance, grades]);

  const studentStats = useMemo(() => {
    if (activeMainTab !== 'STUDENT') return [];

    // Filter classes by date range
    const filteredClasses = classes.filter(c => c.startDate >= startDate && c.startDate <= endDate);
    const filteredClassIds = filteredClasses.map(c => c.id);

    return students.map(student => {
      const studentEnrolls = enrollmentsByStudent[student.id] || [];
      const studentEnrollments = studentEnrolls.filter(e => filteredClassIds.includes(e.class_id));
      
      if (studentEnrollments.length === 0) return null;

      const studentClasses = filteredClasses.filter(c => studentEnrollments.some(e => e.class_id === c.id))
        .sort((a, b) => a.startDate.localeCompare(b.startDate));
      
      const courseNames = Array.from(new Set(studentClasses.map(c => c.courseName))).join(', ');
      const classIds = studentClasses.map(c => c.class_id).join(', ');

      const achievement = studentClasses.map(c => {
        const classGrades = gradesByClass[c.id] || [];
        const grade = classGrades.find(g => g.student_id === student.id);
        if (!grade) return null;
        if (grade.isAbsent) return { classId: c.class_id, score: 'Vắng', date: c.startDate };
        
        const total = grade.total !== undefined ? grade.total : ((Number(grade.midterm) || 0) + (Number(grade.listening) || 0) + (Number(grade.reading) || 0) + (Number(grade.speaking) || 0) + (Number(grade.writing) || 0));
        return { classId: c.class_id, score: total, date: c.startDate };
      }).filter(Boolean);

      return {
        id: student.id,
        name: student.full_name,
        courses: courseNames,
        classes: classIds,
        achievement
      };
    }).filter(Boolean);
  }, [activeMainTab, startDate, endDate, students, enrollments, classes, grades]);

  const exportReport = () => {
    if (!teacherStats || !selectedTeacher) return;

    const csvContent = "\uFEFF" + [
      ['BÁO CÁO HIỆU QUẢ GIẢNG VIÊN'],
      ['Tên giáo viên', selectedTeacher.name],
      ['Khóa học', selectedSubjectId ? subjects.find(s => s.id === selectedSubjectId)?.name : 'Tất cả'],
      ['Email', selectedTeacher.email],
      [''],
      ['CHỈ SỐ THỐNG KÊ'],
      ['Tổng số môn học', teacherStats.totalCourses],
      ['Tổng số lớp dạy', teacherStats.totalClasses],
      ['Tổng số học viên tiếp cận', teacherStats.totalStudents],
      ['Số học viên đã hoàn thành', teacherStats.studentsWhoFinished],
      ['Tỷ lệ lên kỳ', `${teacherStats.reEnrollmentRate}%`],
      ['Tỷ lệ bỏ ngang', `${teacherStats.dropoutRate}%`],
      [''],
      ['CHI TIẾT LỚP HỌC'],
      ['Mã lớp', 'Khóa học', 'Sĩ số', 'Số học viên bỏ ngang', 'Tỷ lệ bỏ ngang (%)', 'Tỷ lệ vắng thi (%)', 'Tiến bộ (Điểm TB)'],
      ...teacherStats.classMetrics.map(m => [m.class_id, m.courseName, m.studentCount, m.dropoutCount, `${m.dropoutRate}%`, `${m.absenteeRate}%`, m.avgProgress])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `BaoCao_ChiTiet_${selectedTeacher.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {activeMainTab === 'TEACHER' ? 'Báo cáo Giảng viên' : 'Báo cáo Học viên'}
          </h1>
          
          {activeMainTab === 'TEACHER' && (
            <div className="flex gap-4 mt-6 border-b border-slate-100">
              <button 
                onClick={() => setActiveSubTab('PERSONAL')}
                className={`pb-2 text-[11px] font-bold uppercase tracking-wider transition-all ${activeSubTab === 'PERSONAL' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Báo cáo cá nhân
              </button>
              <button 
                onClick={() => setActiveSubTab('GENERAL')}
                className={`pb-2 text-[11px] font-bold uppercase tracking-wider transition-all ${activeSubTab === 'GENERAL' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Báo cáo tổng quát
              </button>
            </div>
          )}
        </div>

        {activeMainTab === 'TEACHER' ? (
          activeSubTab === 'PERSONAL' ? (
            <div className="flex flex-wrap items-center gap-4">
              {selectedTeacherId && (
                <button 
                  onClick={exportReport}
                  className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/20 flex items-center gap-2"
                >
                  <span>📥</span> Xuất báo cáo chi tiết
                </button>
              )}
              
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giáo viên:</label>
                <select
                  value={selectedTeacherId}
                  onChange={(e) => setSelectedTeacherId(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm min-w-[180px]"
                >
                  <option value="">-- Chọn giáo viên --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Khóa học:</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm min-w-[180px]"
                >
                  <option value="">-- Tất cả khóa học --</option>
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Từ ngày:</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đến ngày:</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Từ ngày:</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đến ngày:</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
              />
            </div>
          </div>
        )}
      </div>

      {activeMainTab === 'TEACHER' ? (
        activeSubTab === 'PERSONAL' ? (
          <>
            {!selectedTeacherId ? (
              <div className="flex flex-col items-center justify-center h-96 bg-white border border-slate-200 rounded-[3rem] border-dashed">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center text-3xl mb-4 grayscale opacity-50">👨‍🏫</div>
                <p className="text-slate-400 font-medium italic">Vui lòng chọn một giáo viên để phân tích hiệu quả giảng dạy</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Header Stats Bento */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tổng khóa đã dạy</p>
                    <h4 className="text-4xl font-black text-indigo-600">{teacherStats?.totalCourses}</h4>
                    <div className="mt-4 h-1 w-12 bg-indigo-100 rounded-full"></div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tổng lớp đã dạy</p>
                    <h4 className="text-4xl font-black text-emerald-600">{teacherStats?.totalClasses}</h4>
                    <div className="mt-4 h-1 w-12 bg-emerald-100 rounded-full"></div>
                  </div>

                  <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Tỷ lệ lên kỳ</p>
                    <h4 className="text-4xl font-black text-amber-600">{teacherStats?.reEnrollmentRate}%</h4>
                    <div className="mt-4 h-1 w-12 bg-amber-100 rounded-full"></div>
                  </div>

                  <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-600/20 text-white relative overflow-hidden group">
                    <div className="relative z-10">
                      <p className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mb-2">Chỉ số uy tín</p>
                      <h4 className="text-4xl font-black">
                        {teacherStats?.reputationScore}
                      </h4>
                      <p className="mt-2 text-[10px] font-bold text-indigo-300 uppercase">Dựa trên lên kỳ, tiến bộ & duy trì</p>
                    </div>
                    <div className="absolute -right-4 -bottom-4 text-8xl opacity-10 group-hover:scale-110 transition-transform duration-500">⭐</div>
                  </div>
                </div>

                {/* Detailed Class List */}
                <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm">
                  <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-3">
                      <span className="w-1.5 h-8 bg-indigo-600 rounded-full"></span>
                      Chi tiết hiệu quả theo lớp
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="text-left bg-white border-b border-slate-100">
                          <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Khóa học</th>
                          <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Mã lớp</th>
                          <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Tỷ lệ bỏ ngang</th>
                          <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Tỷ lệ vắng thi</th>
                          <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Tiến bộ (TB)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {teacherStats?.classMetrics.map(m => (
                          <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-10 py-6">
                              <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{m.courseName}</p>
                              <p className="text-[10px] text-slate-400 font-medium mt-0.5">{m.startDate} → {m.endDate}</p>
                            </td>
                            <td className="px-10 py-6">
                              <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{m.class_id}</span>
                            </td>
                            <td className="px-10 py-6">
                              <div className="flex flex-col items-center gap-2">
                                <span className={`text-sm font-black ${m.dropoutRate > 30 ? 'text-rose-600' : m.dropoutRate > 15 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                  {m.dropoutRate}%
                                </span>
                                <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ${m.dropoutRate > 30 ? 'bg-rose-500' : m.dropoutRate > 15 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                    style={{ width: `${m.dropoutRate}%` }}
                                  ></div>
                                </div>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Vắng liên tiếp ≥ 50%</p>
                              </div>
                            </td>
                            <td className="px-10 py-6 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className={`text-sm font-black ${m.absenteeRate > 20 ? 'text-rose-600' : 'text-slate-700'}`}>
                                  {m.absenteeRate}%
                                </span>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Vắng thi</p>
                              </div>
                            </td>
                            <td className="px-10 py-6 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-lg font-black text-indigo-600">
                                  {m.avgProgress}
                                </span>
                                <p className="text-[9px] font-bold text-slate-400 uppercase">Điểm TB lớp</p>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
              <h3 className="font-bold text-slate-800 text-lg flex items-center gap-3">
                <span className="w-1.5 h-8 bg-indigo-600 rounded-full"></span>
                Báo cáo tổng quát tất cả giảng viên
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-left bg-white border-b border-slate-100">
                    <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Khóa học</th>
                    <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Giảng viên</th>
                    <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Mã lớp</th>
                    <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Tỷ lệ bỏ ngang</th>
                    <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Tỷ lệ vắng thi</th>
                    <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Tiến bộ (TB)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {generalStats.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-10 py-20 text-center text-slate-400 italic">Không có dữ liệu lớp học trong khoảng thời gian này</td>
                    </tr>
                  ) : (
                    generalStats.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-10 py-6">
                          <p className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{m.courseName}</p>
                        </td>
                        <td className="px-10 py-6">
                          <p className="text-sm font-bold text-slate-600">{m.teacherName}</p>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">{m.class_id}</span>
                        </td>
                        <td className="px-10 py-6">
                          <div className="flex flex-col items-center gap-2">
                            <span className={`text-sm font-black ${m.dropoutRate > 30 ? 'text-rose-600' : m.dropoutRate > 15 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {m.dropoutRate}%
                            </span>
                            <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ${m.dropoutRate > 30 ? 'bg-rose-500' : m.dropoutRate > 15 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                style={{ width: `${m.dropoutRate}%` }}
                              ></div>
                            </div>
                          </div>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className={`text-sm font-black ${m.absenteeRate > 20 ? 'text-rose-600' : 'text-slate-700'}`}>
                            {m.absenteeRate}%
                          </span>
                        </td>
                        <td className="px-10 py-6 text-center">
                          <span className="text-lg font-black text-indigo-600">
                            {m.avgProgress}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      ) : (
        <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
            <h3 className="font-bold text-slate-800 text-lg flex items-center gap-3">
              <span className="w-1.5 h-8 bg-indigo-600 rounded-full"></span>
              Báo cáo học viên
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left bg-white border-b border-slate-100">
                  <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Tên học viên</th>
                  <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Các khóa đã học</th>
                  <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Các lớp đã học</th>
                  <th className="px-10 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Thành tích (Cũ → Mới)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {studentStats.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-10 py-20 text-center text-slate-400 italic">Không có dữ liệu học viên trong khoảng thời gian này</td>
                  </tr>
                ) : (
                  studentStats.map((s: any) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-10 py-6">
                        <p className="text-sm font-bold text-slate-700">{s.name}</p>
                      </td>
                      <td className="px-10 py-6">
                        <p className="text-xs text-slate-600 max-w-xs">{s.courses}</p>
                      </td>
                      <td className="px-10 py-6">
                        <p className="text-xs font-mono text-slate-500">{s.classes}</p>
                      </td>
                      <td className="px-10 py-6">
                        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
                          {s.achievement.map((a: any, idx: number) => (
                            <div key={idx} className="flex flex-col items-center min-w-[60px] bg-slate-50 p-2 rounded-lg border border-slate-100">
                              <span className="text-[9px] font-bold text-slate-400 uppercase mb-1">{a.classId}</span>
                              <span className={`text-sm font-black ${typeof a.score === 'number' ? 'text-indigo-600' : 'text-rose-500'}`}>
                                {a.score}
                              </span>
                              <span className="text-[8px] text-slate-400 mt-1">{formatDateDisplay(a.date)}</span>
                            </div>
                          ))}
                          {s.achievement.length === 0 && <span className="text-xs text-slate-400 italic">Chưa có điểm</span>}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
