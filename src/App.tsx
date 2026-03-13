
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { AppView, Subject, Level, Shift, Teacher, Student, Class, Enrollment, ScheduleRow, StudentGrade, Attendance, SessionDate, AdmissionSummary } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import SubjectManager from './components/SubjectManager';
import LevelManager from './components/LevelManager';
import ShiftManager from './components/ShiftManager';
import TeacherManager from './components/TeacherManager';
import StudentManager from './components/StudentManager';
import ClassManager from './components/ClassManager';
import ScheduleBuilder from './components/ScheduleBuilder';
import FunctionsManager from './components/FunctionsManager';
import Reports from './components/Reports';
import ErrorBoundary from './components/ErrorBoundary';

// DÁN WEB APP URL CỦA BẠN VÀO ĐÂY
const SHEET_API_URL = "https://script.google.com/macros/s/AKfycbz_XXXXXXXXX/exec";

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('DASHBOARD');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  
  // Data State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [grades, setGrades] = useState<StudentGrade[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [sessionDates, setSessionDates] = useState<SessionDate[]>([]);

  // 0. Tự động tính toán Admission Summary từ dữ liệu thực tế (Classes & Enrollments)
  // Logic: 
  // - Nhóm các lớp theo Tên khóa học.
  // - Sắp xếp các khóa học theo thời gian (từ trái sang phải trên biểu đồ).
  // - Học viên lên kỳ (Returning): Chỉ tính những người học liên tục từ khóa ngay trước đó.
  //   (Ví dụ: Học 189, nghỉ 190, học 191 -> Không tính là "Lên kỳ" tại khóa 191).
  const calculatedAdmissionSummary = useMemo(() => {
    const courseGroups: { [key: string]: { name: string, start: string, end: string, studentIds: Set<string> } } = {};
    
    // Optimize enrollment lookup
    const enrollmentsByClass = enrollments.reduce((acc, e) => {
      if (!acc[e.class_id]) acc[e.class_id] = [];
      acc[e.class_id].push(e.student_id);
      return acc;
    }, {} as { [key: string]: string[] });

    classes.forEach(cls => {
      const cName = cls.courseName || 'N/A';
      if (!courseGroups[cName]) {
        courseGroups[cName] = { name: cName, start: cls.startDate, end: cls.endDate, studentIds: new Set() };
      } else {
        if (cls.startDate < courseGroups[cName].start) courseGroups[cName].start = cls.startDate;
        if (cls.endDate > courseGroups[cName].end) courseGroups[cName].end = cls.endDate;
      }
      
      // Lấy học viên của lớp này từ map đã tối ưu
      const studentIds = enrollmentsByClass[cls.id] || [];
      studentIds.forEach(id => {
        courseGroups[cName].studentIds.add(id);
      });
    });

    const sortedCourses = Object.values(courseGroups).sort((a, b) => a.start.localeCompare(b.start));
    
    return sortedCourses.map((course, index) => {
      const prevCourse = index > 0 ? sortedCourses[index - 1] : null;
      let returningCount = 0;
      
      if (prevCourse) {
        course.studentIds.forEach(id => {
          if (prevCourse.studentIds.has(id)) returningCount++;
        });
      }
      
      return {
        Course_Name: course.name,
        Start_Date: course.start,
        End_Date: course.end,
        Total_Students: course.studentIds.size,
        Previous_Course_Name: prevCourse ? prevCourse.name : '---',
        Returning_Students: returningCount
      };
    });
  }, [classes, enrollments]);

  // Sync & UI State
  const [syncStatus, setSyncStatus] = useState<'IDLE' | 'LOADING' | 'SYNCING' | 'SAVED' | 'ERROR'>('IDLE');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoadingCloud, setIsLoadingCloud] = useState(true);
  
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitialMount = useRef(true);

  // 1. KHỞI ĐỘNG: LẤY DỮ LIỆU TỪ CLOUD
  useEffect(() => {
    const fetchData = async () => {
      if (SHEET_API_URL.includes("XXXXXXXXX")) {
        // Fallback to local if URL not set
        const load = (k: string) => JSON.parse(localStorage.getItem(k) || '[]');
        setSubjects(load('subjects'));
        setLevels(load('levels'));
        setShifts(load('shifts'));
        setTeachers(load('teachers'));
        setStudents(load('students'));
        setClasses(load('classes'));
        setEnrollments(load('enrollments'));
        setSchedule(load('schedule'));
        setGrades(load('grades'));
        setIsLoadingCloud(false);
        return;
      }

      setSyncStatus('LOADING');
      try {
        const response = await fetch(SHEET_API_URL);
        const result = await response.json();
        
        if (result.status === 'success' && result.data) {
          const d = result.data;
          setSubjects(d.subjects || []);
          setLevels(d.levels || []);
          setShifts((d.shifts || []).map((s: any) => ({
            ...s,
            days: typeof s.days === 'string' ? s.days.split(',').map((d: string) => d.trim()).filter(Boolean) : (Array.isArray(s.days) ? s.days : [])
          })));
          setTeachers((d.teachers || []).map((t: any) => ({
            ...t,
            subjectIds: typeof t.subjectIds === 'string' ? t.subjectIds.split(',').map((s: string) => s.trim()).filter(Boolean) : (Array.isArray(t.subjectIds) ? t.subjectIds : []),
            availableShiftIds: typeof t.availableShiftIds === 'string' ? t.availableShiftIds.split(',').map((s: string) => s.trim()).filter(Boolean) : (Array.isArray(t.availableShiftIds) ? t.availableShiftIds : [])
          })));
          setStudents(d.students || []);
          setClasses(d.classes || []);
          setEnrollments(d.enrollments || []);
          setSchedule(d.schedule || []);
          setGrades(d.grades || []);
          setAttendance(d.attendance || []);
          setSessionDates(d.sessionDates || []);
        }
      } catch (error) {
        console.error("Cloud Fetch Error:", error);
      } finally {
        setIsLoadingCloud(false);
        setSyncStatus('IDLE');
      }
    };

    fetchData();
  }, []);

  const pushDataToCloud = useCallback(async () => {
    if (SHEET_API_URL.includes("XXXXXXXXX")) return;

    setSyncStatus('SYNCING');
    
    // Tính toán trạng thái học viên trước khi lưu lên Cloud để báo cáo
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    // Optimize student status calculation
    const enrollmentsByStudent: Record<string, string[]> = {};
    enrollments.forEach(e => {
      if (!enrollmentsByStudent[e.student_id]) enrollmentsByStudent[e.student_id] = [];
      enrollmentsByStudent[e.student_id].push(e.class_id);
    });

    const classLookup: Record<string, Class> = {};
    classes.forEach(c => {
      classLookup[c.id] = c;
    });

    const studentsWithStatus = students.map(student => {
      const studentEnrolls = enrollmentsByStudent[student.id] || [];
      if (studentEnrolls.length === 0) {
        return { ...student, status: 'Chưa học' };
      }
      
      const hasActive = studentEnrolls.some(classId => {
        const cls = classLookup[classId];
        return cls && cls.endDate >= today;
      });
      
      return { 
        ...student, 
        status: hasActive ? 'Đang học' : 'Chờ lên kỳ' 
      };
    });

    const payload = { 
      subjects, 
      levels, 
      shifts: shifts.map(s => ({
        ...s,
        days: Array.isArray(s.days) ? s.days.join(',') : s.days
      })), 
      teachers: teachers.map(t => ({
        ...t,
        subjectIds: Array.isArray(t.subjectIds) ? t.subjectIds.join(',') : t.subjectIds,
        availableShiftIds: Array.isArray(t.availableShiftIds) ? t.availableShiftIds.join(',') : t.availableShiftIds
      })), 
      students: studentsWithStatus, 
      classes, 
      enrollments, 
      grades, 
      schedule,
      attendance,
      sessionDates,
      admissionSummary: calculatedAdmissionSummary
    };

    try {
      const response = await fetch(SHEET_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'sync', data: payload })
      });
      const result = await response.json();
      if (result.status === 'success' || result.success === true) {
        setLastSaved(new Date());
        setSyncStatus('SAVED');
      } else {
        throw new Error(result.message || 'Unknown error');
      }
    } catch (error) {
      console.error("Cloud Push Error:", error);
      setSyncStatus('ERROR');
    }
  }, [subjects, levels, shifts, teachers, students, classes, enrollments, grades, schedule, attendance, sessionDates, calculatedAdmissionSummary]);

  // 2. ĐỒNG BỘ LIÊN TỤC KHI DỮ LIỆU THAY ĐỔI
  useEffect(() => {
    // Không chạy sync nếu đang load dữ liệu từ cloud lần đầu
    if (isLoadingCloud) return;

    // Lưu LocalStorage dự phòng
    localStorage.setItem('subjects', JSON.stringify(subjects));
    localStorage.setItem('levels', JSON.stringify(levels));
    localStorage.setItem('shifts', JSON.stringify(shifts));
    localStorage.setItem('teachers', JSON.stringify(teachers));
    localStorage.setItem('students', JSON.stringify(students));
    localStorage.setItem('classes', JSON.stringify(classes));
    localStorage.setItem('enrollments', JSON.stringify(enrollments));
    localStorage.setItem('schedule', JSON.stringify(schedule));
    localStorage.setItem('grades', JSON.stringify(grades));
    localStorage.setItem('attendance', JSON.stringify(attendance));
    localStorage.setItem('sessionDates', JSON.stringify(sessionDates));

    // Tránh sync ngay lập tức ở lần đầu tiên (mount)
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Debounce 1.5 giây để tránh spam API
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    
    setSyncStatus('IDLE');
    syncTimerRef.current = setTimeout(() => {
      pushDataToCloud();
    }, 1500);

  }, [pushDataToCloud, isLoadingCloud, subjects, levels, shifts, teachers, students, classes, enrollments, schedule, grades, attendance, sessionDates, calculatedAdmissionSummary]);

  const renderView = () => {
    try {
      if (isLoadingCloud) {
        return (
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Đang tải dữ liệu từ Google Sheets...</p>
          </div>
        );
      }

      switch (view) {
        case 'DASHBOARD': return <ErrorBoundary><Dashboard stats={{ subjects, levels, shifts, teachers, students, classes, schedule, enrollments, grades, admissionSummary: calculatedAdmissionSummary }} setView={setView} /></ErrorBoundary>;
        case 'SUBJECTS': return <ErrorBoundary><SubjectManager subjects={subjects} setSubjects={setSubjects} /></ErrorBoundary>;
        case 'LEVELS': return <ErrorBoundary><LevelManager levels={levels} setLevels={setLevels} subjects={subjects} /></ErrorBoundary>;
        case 'SHIFTS': return <ErrorBoundary><ShiftManager shifts={shifts} setShifts={setShifts} /></ErrorBoundary>;
        case 'TEACHERS': return <ErrorBoundary><TeacherManager teachers={teachers} setTeachers={setTeachers} subjects={subjects} shifts={shifts} /></ErrorBoundary>;
        case 'STUDENTS': return <ErrorBoundary><StudentManager students={students} setStudents={setStudents} subjects={subjects} enrollments={enrollments} classes={classes} /></ErrorBoundary>;
        case 'CLASSES': return <ErrorBoundary><ClassManager classes={classes} setClasses={setClasses} subjects={subjects} levels={levels} shifts={shifts} teachers={teachers} students={students} enrollments={enrollments} setEnrollments={setEnrollments} schedule={schedule} /></ErrorBoundary>;
        case 'SCHEDULER': return <ErrorBoundary><ScheduleBuilder schedule={schedule} setSchedule={setSchedule} subjects={subjects} teachers={teachers} shifts={shifts} classes={classes} enrollments={enrollments} setEnrollments={setEnrollments} /></ErrorBoundary>;
        case 'FUNCTIONS': return <ErrorBoundary><FunctionsManager subjects={subjects} levels={levels} shifts={shifts} teachers={teachers} classes={classes} students={students} enrollments={enrollments} setEnrollments={setEnrollments} grades={grades} setGrades={setGrades} schedule={schedule} attendance={attendance} setAttendance={setAttendance} sessionDates={sessionDates} setSessionDates={setSessionDates} /></ErrorBoundary>;
        case 'REPORTS': return <ErrorBoundary><Reports teachers={teachers} subjects={subjects} classes={classes} enrollments={enrollments} schedule={schedule} attendance={attendance} grades={grades} students={students} initialMainTab="TEACHER" /></ErrorBoundary>;
        case 'REPORTS_TEACHER': return <ErrorBoundary><Reports teachers={teachers} subjects={subjects} classes={classes} enrollments={enrollments} schedule={schedule} attendance={attendance} grades={grades} students={students} initialMainTab="TEACHER" /></ErrorBoundary>;
        case 'REPORTS_STUDENT': return <ErrorBoundary><Reports teachers={teachers} subjects={subjects} classes={classes} enrollments={enrollments} schedule={schedule} attendance={attendance} grades={grades} students={students} initialMainTab="STUDENT" /></ErrorBoundary>;
        default: return <Dashboard stats={{ subjects, levels, shifts, teachers, students, classes, schedule, enrollments, grades, admissionSummary: calculatedAdmissionSummary }} setView={setView} />;
      }
    } catch (error) {
      console.error("Render View Error:", error);
      return (
        <div className="p-12 text-center">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-8 max-w-lg mx-auto">
            <h3 className="text-red-800 font-bold text-lg mb-2">Đã xảy ra lỗi hiển thị</h3>
            <p className="text-red-600 text-sm mb-4">Ứng dụng gặp sự cố khi hiển thị nội dung này. Vui lòng thử tải lại trang hoặc kiểm tra dữ liệu.</p>
            <pre className="bg-white p-4 rounded-lg text-left text-[10px] overflow-auto max-h-40 border border-red-100">
              {error instanceof Error ? error.message : String(error)}
            </pre>
            <button 
              onClick={() => setView('DASHBOARD')}
              className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
            >
              Quay lại Dashboard
            </button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden">
      <Sidebar currentView={view} setView={setView} isCollapsed={isSidebarCollapsed} />
      
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-20 border-b border-slate-200 bg-white flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
              title={isSidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="h-6 w-[1px] bg-slate-200 mx-2"></div>
            
            {/* Sync Status Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all ${
              syncStatus === 'SAVED' ? 'bg-green-50 border-green-100 text-green-600' :
              syncStatus === 'SYNCING' ? 'bg-amber-50 border-amber-100 text-amber-600' :
              syncStatus === 'ERROR' ? 'bg-red-50 border-red-100 text-red-600' :
              'bg-slate-50 border-slate-100 text-slate-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                syncStatus === 'SAVED' ? 'bg-green-500' :
                syncStatus === 'SYNCING' ? 'bg-amber-500 animate-pulse' :
                syncStatus === 'ERROR' ? 'bg-red-500' : 'bg-slate-300'
              }`}></div>
              <span className="text-[10px] font-bold uppercase tracking-widest">
                {syncStatus === 'LOADING' ? 'Đang tải database...' :
                 syncStatus === 'SYNCING' ? 'Đang cập nhật Cloud...' :
                 syncStatus === 'SAVED' ? (lastSaved ? `Cloud OK: ${lastSaved.toLocaleTimeString()}` : 'Cloud Sẵn sàng') :
                 syncStatus === 'ERROR' ? 'Lỗi kết nối Cloud' : 'Chờ thay đổi'}
              </span>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-xl px-12">
            <div className="relative group">
              <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input 
                type="text" 
                placeholder="Tìm kiếm giảng viên, học viên..." 
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-slate-900 leading-tight">ADMIN</p>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Administrator</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/20 border-2 border-white shrink-0 overflow-hidden">
              <img 
                src="data:image/png;base64,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" 
                alt="Avatar" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          <div className="container mx-auto py-8 px-8">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden min-h-[calc(100vh-160px)] relative">
              {renderView()}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
