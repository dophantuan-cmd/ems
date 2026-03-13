
import React, { useState } from 'react';
import { Subject } from '../types';

interface SubjectManagerProps {
  subjects: Subject[];
  setSubjects: React.Dispatch<React.SetStateAction<Subject[]>>;
}

const SubjectManager: React.FC<SubjectManagerProps> = ({ subjects, setSubjects }) => {
  const [newSubject, setNewSubject] = useState('');

  const addSubject = () => {
    if (!newSubject.trim()) return;
    const subject: Subject = {
      id: crypto.randomUUID(),
      name: newSubject.trim()
    };
    setSubjects([...subjects, subject]);
    setNewSubject('');
  };

  const deleteSubject = (id: string) => {
    setSubjects(subjects.filter(s => s.id !== id));
  };

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <span>📚</span> Quản lý Môn học
      </h2>
      
      <div className="flex gap-2 mb-8 max-w-md">
        <input 
          type="text" 
          value={newSubject}
          onChange={(e) => setNewSubject(e.target.value)}
          placeholder="Tên môn học mới (VD: Tiếng Anh Giao Tiếp)"
          className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
          onKeyDown={(e) => e.key === 'Enter' && addSubject()}
        />
        <button 
          onClick={addSubject}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
        >
          Thêm
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {subjects.map((subject) => (
          <div key={subject.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 transition-colors group">
            <span className="font-medium text-slate-700">{subject.name}</span>
            <button 
              onClick={() => deleteSubject(subject.id)}
              className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-2"
            >
              🗑️
            </button>
          </div>
        ))}
        {subjects.length === 0 && (
          <p className="text-slate-400 col-span-full py-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
            Chưa có môn học nào. Hãy thêm môn học đầu tiên!
          </p>
        )}
      </div>
    </div>
  );
};

export default SubjectManager;
