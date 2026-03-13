
import { Class, Enrollment, AdmissionSummary } from '../types';

/**
 * Đảm bảo dữ liệu luôn là mảng, xử lý cả trường hợp chuỗi JSON hoặc chuỗi phân cách dấu phẩy
 */
export const safeArray = (data: any): string[] => {
  if (Array.isArray(data)) return data;
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback to comma split if JSON parse fails
      }
    }
    return trimmed.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

/**
 * Tính toán báo cáo tuyển sinh từ danh sách lớp và học viên
 */
export const calculateAdmissionSummary = (classes: Class[], enrollments: Enrollment[]): AdmissionSummary[] => {
  const courseGroups: { [key: string]: { name: string, start: string, end: string, studentIds: Set<string> } } = {};
  
  classes.forEach(cls => {
    const cName = (cls.courseName || 'N/A').trim();
    const clsStart = cls.startDate || '';
    const clsEnd = cls.endDate || '';
    
    if (!courseGroups[cName]) {
      courseGroups[cName] = { 
        name: cName, 
        start: clsStart || '9999-12-31', 
        end: clsEnd || '0000-01-01', 
        studentIds: new Set() 
      };
    } else {
      if (clsStart && clsStart < courseGroups[cName].start) courseGroups[cName].start = clsStart;
      if (clsEnd && clsEnd > courseGroups[cName].end) courseGroups[cName].end = clsEnd;
    }
    
    enrollments.filter(e => e.class_id === cls.id).forEach(e => {
      courseGroups[cName].studentIds.add(e.student_id);
    });
  });

  const sortedCourses = Object.values(courseGroups).sort((a, b) => {
    if (a.start !== b.start) return a.start.localeCompare(b.start);
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
  
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
      Start_Date: course.start === '9999-12-31' ? '---' : course.start,
      End_Date: course.end === '0000-01-01' ? '---' : course.end,
      Total_Students: course.studentIds.size,
      Previous_Course_Name: prevCourse ? prevCourse.name : '---',
      Returning_Students: returningCount
    };
  });
};

/**
 * Hàm tìm kiếm toàn cục (Global Search)
 */
export const globalSearch = (
  query: string,
  students: any[],
  teachers: any[],
  classes: any[]
) => {
  if (!query.trim()) return { students: [], teachers: [], classes: [] };

  const q = query.toLowerCase().trim();

  const filteredStudents = students.filter(s => 
    s.full_name?.toLowerCase().includes(q) || 
    s.student_id?.toLowerCase().includes(q)
  ).slice(0, 5);

  const filteredTeachers = teachers.filter(t => 
    t.name?.toLowerCase().includes(q) || 
    t.email?.toLowerCase().includes(q) ||
    t.phone?.toLowerCase().includes(q)
  ).slice(0, 5);

  const filteredClasses = classes.filter(c => 
    c.class_id?.toLowerCase().includes(q) || 
    c.courseName?.toLowerCase().includes(q)
  ).slice(0, 5);

  return {
    students: filteredStudents,
    teachers: filteredTeachers,
    classes: filteredClasses
  };
};

export const formatDateDisplay = (dateStr: string) => {
  if (!dateStr || dateStr === '---') return '---';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [y, m, d] = parts;
  return `${d}-${m}-${y}`;
};
