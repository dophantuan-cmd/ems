import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Users, BookOpen, GraduationCap, TrendingUp, TrendingDown } from 'lucide-react';
import { AppView, Subject, Level, Shift, Teacher, Student, Class, ScheduleRow, Enrollment, StudentGrade, AdmissionSummary } from '../types';

interface DashboardProps {
  stats: {
    subjects: Subject[];
    levels: Level[];
    shifts: Shift[];
    teachers: Teacher[];
    students: Student[];
    classes: Class[];
    schedule: ScheduleRow[];
    enrollments: Enrollment[];
    grades: StudentGrade[];
    admissionSummary: AdmissionSummary[];
  };
  setView: (view: AppView) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ stats, setView }) => {
  // 1. Calculate Top Stats
  const classes = stats?.classes || [];
  const students = stats?.students || [];
  const teachers = stats?.teachers || [];
  const enrollments = stats?.enrollments || [];
  const subjects = stats?.subjects || [];
  const admissionSummary = stats?.admissionSummary || [];

  const activeClassesCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return classes.filter(cls => {
      if (!cls.startDate || !cls.endDate) return false;
      const start = new Date(cls.startDate);
      const end = new Date(cls.endDate);
      return today >= start && today <= end;
    }).length;
  }, [classes]);

  const totalClassesCount = classes.length;
  
  // Calculate growth based on the last two courses in admission summary
  const studentGrowth = useMemo(() => {
    if (!admissionSummary || admissionSummary.length < 2) return 0;
    
    const latest = admissionSummary[admissionSummary.length - 1];
    const previous = admissionSummary[admissionSummary.length - 2];
    
    if (!previous || previous.Total_Students === 0) return 0;
    
    // Formula: ((Current - Previous) / Previous) * 100
    const growth = ((latest.Total_Students - previous.Total_Students) / previous.Total_Students) * 100;
    return parseFloat(growth.toFixed(1));
  }, [admissionSummary]);

  const isPositiveGrowth = studentGrowth >= 0;

  // 2. Prepare Bar Chart Data (Students per Course)
  const barChartData = useMemo(() => {
    return admissionSummary.map(item => ({
      name: item.Course_Name,
      total: item.Total_Students,
      continuing: item.Returning_Students
    }));
  }, [admissionSummary]);

  // 3. Prepare Pie Chart Data (Classes per Subject)
  const pieChartData = useMemo(() => {
    const subjectCounts: { [key: string]: number } = {};
    const subjectMap = new Map<string, string>();
    subjects.forEach(s => {
      if (s && s.id) subjectMap.set(s.id, s.name);
    });

    classes.forEach(cls => {
      if (!cls) return;
      const name = subjectMap.get(cls.subjectId) || 'Khác';
      subjectCounts[name] = (subjectCounts[name] || 0) + 1;
    });

    return Object.entries(subjectCounts).map(([name, value]) => ({ name, value }));
  }, [classes, subjects]);

  // 4. Prepare Operational Classes Data
  const operationalClasses = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return classes
      .filter(cls => {
        if (!cls || !cls.endDate) return false;
        const end = new Date(cls.endDate);
        return end >= today; // Hide classes that have ended
      })
      .sort((a, b) => {
        const dateA = new Date(a.endDate).getTime();
        const dateB = new Date(b.endDate).getTime();
        return dateA - dateB; // Sort by closest end date first
      })
      .slice(0, 5);
  }, [classes]);

  // Logic for calculating class status (matching ClassManager.tsx)
  const getStatusInfo = (startDate: string, endDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (start > today) {
      return { label: 'Pending', color: 'bg-blue-100 text-blue-600 border-blue-200' };
    }

    if (end < today) {
      return { label: 'Đã kết thúc', color: 'bg-slate-100 text-slate-500 border-slate-200' };
    }

    if (diffDays >= 15) {
      return { label: 'Đang hoạt động', color: 'bg-green-100 text-green-700 border-green-200' };
    }

    if (diffDays >= 7) {
      return { label: 'Sắp kết thúc', color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
    }

    return { label: 'Sắp kết thúc', color: 'bg-red-100 text-red-700 border-red-200' };
  };

  // Helpers
  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '---';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const [y, m, d] = parts;
    return `${d}-${m}-${y}`;
  };

  const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4', '#84cc16', '#64748b'];

  return (
    <div className="p-8 bg-slate-50 min-h-full">
      {/* Top Section: Bento Grid Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Total Students */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
              <Users size={24} />
            </div>
            <div className={`flex items-center gap-1 text-sm font-bold ${isPositiveGrowth ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isPositiveGrowth ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              {Math.abs(studentGrowth)}%
            </div>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Tổng số học viên</p>
            <h3 className="text-3xl font-bold text-slate-900">{students.length}</h3>
          </div>
        </div>

        {/* Classes Ratio */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
              <BookOpen size={24} />
            </div>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Số lớp đang học / Tổng số lớp</p>
            <h3 className="text-3xl font-bold text-slate-900">
              {activeClassesCount} <span className="text-slate-300 font-light">/</span> {totalClassesCount}
            </h3>
          </div>
        </div>

        {/* Total Teachers */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
              <GraduationCap size={24} />
            </div>
          </div>
          <div>
            <p className="text-slate-500 text-sm font-medium">Tổng số giáo viên</p>
            <h3 className="text-3xl font-bold text-slate-900">{teachers.length}</h3>
          </div>
        </div>
      </div>

      {/* Middle Section: Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Bar Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Số lượng học viên theo khóa</h2>
          <div className="h-[350px] w-full">
            {stats.classes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 italic gap-2">
                <BookOpen size={40} className="opacity-20" />
                <p>Chưa có dữ liệu lớp học để hiển thị biểu đồ</p>
              </div>
            ) : barChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    width={40}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                  <Bar 
                    name="Tổng học viên" 
                    dataKey="total" 
                    fill="#6366f1" 
                    radius={[4, 4, 0, 0]} 
                    barSize={32}
                    minPointSize={2}
                  />
                  <Bar 
                    name="Học viên lên kỳ" 
                    dataKey="continuing" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                    barSize={32}
                    minPointSize={2}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 italic gap-2">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-indigo-500 rounded-full animate-spin mb-2"></div>
                <p>Đang tính toán dữ liệu biểu đồ...</p>
              </div>
            )}
          </div>
        </div>

        {/* Pie Chart */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-800 mb-6">Tỷ trọng lớp học theo môn</h2>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend 
                  layout="vertical" 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Section: Operational Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Thông tin vận hành</h2>
          <button 
            onClick={() => setView('CLASSES')}
            className="text-indigo-600 text-sm font-semibold hover:underline"
          >
            Xem tất cả lớp học
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Khóa học</th>
                <th className="px-6 py-4 font-semibold">Mã lớp</th>
                <th className="px-6 py-4 font-semibold">Môn học</th>
                <th className="px-6 py-4 font-semibold">Thời gian</th>
                <th className="px-6 py-4 font-semibold text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {operationalClasses.map((cls) => {
                if (!cls) return null;
                const subject = subjects.find(s => s && s.id === cls.subjectId);
                const statusInfo = getStatusInfo(cls.startDate, cls.endDate);
                return (
                  <tr key={cls.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900">{cls.courseName}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono bg-purple-50 px-2 py-1 rounded text-xs text-purple-700 border border-purple-100 font-bold">
                        {cls.class_id}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{subject?.name || '---'}</td>
                    <td className="px-6 py-4 text-slate-500 text-sm">
                      {formatDateDisplay(cls.startDate)} <span className="text-slate-300">→</span> {formatDateDisplay(cls.endDate)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {operationalClasses.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    Chưa có dữ liệu vận hành lớp học (hoặc tất cả các lớp đã kết thúc).
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
