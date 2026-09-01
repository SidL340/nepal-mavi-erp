'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { todayBS } from '@/lib/nepali-date';
import {
  BookOpen,
  Plus,
  Printer,
  Award,
  Bell,
  Users,
  CheckCircle2,
  X,
  FileSpreadsheet,
  Save,
  Lock,
  Sliders,
  Trash2,
  Edit2,
  Clock,
  Sun,
  Moon,
  Layers,
  Sparkles,
  FileText,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/lib/auth-store';

const PRESET_TEMPLATES = [
  {
    name: '50M Science / Technical (75 Raw → 25 Converted + 5 Test + 10 Prac + 10 HW)',
    nepali: '५० पूर्णाङ्क (७५ सैद्धान्तिकलाई २५ मा रूपान्तरण + ५ + १० + १०)',
    parts: [
      { title: 'Theory (सैद्धान्तिक)', fullMark: 25, rawFullMark: 75, passMarkPct: 40 },
      { title: 'Unit / Terminal Test (एकाइ परीक्षा)', fullMark: 5, rawFullMark: 5, passMarkPct: 40 },
      { title: 'Practical / Project (प्रयोगात्मक कार्य)', fullMark: 10, rawFullMark: 10, passMarkPct: 40 },
      { title: 'Attendance & Homework (नियमितता तथा गृहकार्य)', fullMark: 10, rawFullMark: 10, passMarkPct: 40 },
    ],
  },
  {
    name: '50M Direct Split (25+5+10+10)',
    nepali: 'मानक ५० पूर्णाङ्क (२५ + ५ + १० + १०)',
    parts: [
      { title: 'Theory (सैद्धान्तिक)', fullMark: 25, rawFullMark: 25, passMarkPct: 40 },
      { title: 'Unit Test (एकाइ परीक्षा)', fullMark: 5, rawFullMark: 5, passMarkPct: 40 },
      { title: 'Practical (प्रयोगात्मक)', fullMark: 10, rawFullMark: 10, passMarkPct: 40 },
      { title: 'Homework & Attendance (गृहकार्य र हाजिरी)', fullMark: 10, rawFullMark: 10, passMarkPct: 40 },
    ],
  },
  {
    name: '100M Standard (75 Theory + 25 Practical)',
    nepali: '१०० पूर्णाङ्क (७५ सैद्धान्तिक + २५ प्रयोगात्मक)',
    parts: [
      { title: 'Theory (सैद्धान्तिक)', fullMark: 75, rawFullMark: 75, passMarkPct: 40 },
      { title: 'Practical / Internal (प्रयोगात्मक / आन्तरिक)', fullMark: 25, rawFullMark: 25, passMarkPct: 40 },
    ],
  },
  {
    name: '50M Single Paper (50 Theory)',
    nepali: '५० पूर्णाङ्क एकल परीक्षा',
    parts: [
      { title: 'Theory Exam (सैद्धान्तिक परीक्षा)', fullMark: 50, rawFullMark: 50, passMarkPct: 40 },
    ],
  },
  {
    name: '100M Single Paper (100 Theory)',
    nepali: '१०० पूर्णाङ्क एकल परीक्षा',
    parts: [
      { title: 'Theory Exam (सैद्धान्तिक परीक्षा)', fullMark: 100, rawFullMark: 100, passMarkPct: 40 },
    ],
  },
];

export function generateSymbolNo(yearName?: string | number, className?: string, rollNo?: number | string) {
  const yearMatch = (yearName || '2083').toString().match(/\d{4}/);
  const yearStr = yearMatch ? yearMatch[0] : '2083';

  let classNum = '00';
  const classMatch = (className || '').toString().match(/\d+/);
  if (classMatch) {
    classNum = classMatch[0].padStart(2, '0');
  } else if (/ecd|ppc|nursery/i.test(className || '')) {
    classNum = '00';
  }

  const rollStr = (rollNo || 0).toString().padStart(2, '0');
  return `${yearStr}${classNum}${rollStr}`;
}

export default function ExamsPage() {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  const isTeacher = user?.role === 'TEACHER';
  const teacherId = user?.teacher?.id;

  const searchParams = useSearchParams();
  const examIdParam = searchParams.get('examId');
  const tabParam = searchParams.get('tab');

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'exams' | 'marks' | 'ledger'>('exams');

  // Add Exam state
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);
  const [addExamClassIds, setAddExamClassIds] = useState<number[]>([]);
  const [addExamShift, setAddExamShift] = useState('DAY');
  const [addExamTiming, setAddExamTiming] = useState('11:00 AM - 02:00 PM');

  // Edit Exam state
  const [isEditExamModalOpen, setIsEditExamModalOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<any>(null);
  const [editExamClassIds, setEditExamClassIds] = useState<number[]>([]);
  const [editExamShift, setEditExamShift] = useState('DAY');
  const [editExamTiming, setEditExamTiming] = useState('11:00 AM - 02:00 PM');

  // Breakdown state
  const [isBreakdownModalOpen, setIsBreakdownModalOpen] = useState(false);
  const [breakdownParts, setBreakdownParts] = useState<Array<{ title: string; fullMark: number | string; rawFullMark?: number | string; passMarkPct: number | string }>>([]);

  // Mark entry selection
  const [selectedExamId, setSelectedExamId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [marksState, setMarksState] = useState<Record<string, { marksObtained: string; isAbsent: boolean }>>({});

  // Ledger state
  const [ledgerExamId, setLedgerExamId] = useState('');
  const [ledgerClassId, setLedgerClassId] = useState('');

  // Handle URL Query Params
  useEffect(() => {
    if (tabParam === 'marks' || tabParam === 'exams' || tabParam === 'ledger') {
      setActiveTab(tabParam as any);
    }
    if (examIdParam) {
      setSelectedExamId(examIdParam);
      setLedgerExamId(examIdParam);
    }
  }, [tabParam, examIdParam]);

  // Individual marksheet preview state
  const [selectedMarksheet, setSelectedMarksheet] = useState<any>(null);

  // Dual ledger view mode: 'marks' vs 'grades'
  const [ledgerViewMode, setLedgerViewMode] = useState<'marks' | 'grades'>('marks');

  // Bulk marksheet print state
  const [isBulkPrintModalOpen, setIsBulkPrintModalOpen] = useState(false);
  const [bulkMarksheetsData, setBulkMarksheetsData] = useState<any>(null);
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const [selectedStudentIdsForPrint, setSelectedStudentIdsForPrint] = useState<number[]>([]);

  // Publish Results state
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishExamId, setPublishExamId] = useState('');
  const [publishClassIds, setPublishClassIds] = useState<number[]>([]);

  const handleTogglePublishClass = (cid: number) => {
    setPublishClassIds((prev) =>
      prev.includes(cid) ? prev.filter((id) => id !== cid) : [...prev, cid]
    );
  };

  const handleSelectAllPublishClasses = (selectAll: boolean) => {
    if (selectAll && classesData) {
      setPublishClassIds(classesData.map((c: any) => c.id));
    } else {
      setPublishClassIds([]);
    }
  };

  const publishResultMutation = useMutation({
    mutationFn: async () => {
      if (!publishExamId) throw new Error('Please select an exam to publish.');
      const res = await api.post(`/exams/${publishExamId}/publish-result`, {
        classIds: publishClassIds.length > 0 ? publishClassIds : undefined,
        isPublished: true,
      });
      return res.data;
    },
    onSuccess: (data: any) => {
      toast.success(data.message || 'Exam results published successfully!');
      setIsPublishModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['exams'] });
      queryClient.invalidateQueries({ queryKey: ['student-exams'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to publish results');
    },
  });

  const handleOpenBulkPrint = async () => {
    if (!ledgerExamId || !ledgerClassId) {
      toast.error('Please select an Exam and Class first');
      return;
    }
    setIsBulkLoading(true);
    try {
      const res = await api.get(`/exams/${ledgerExamId}/bulk-marksheets/${ledgerClassId}`);
      if (res.data.success) {
        setBulkMarksheetsData(res.data.data);
        const allIds = res.data.data.students?.map((s: any) => s.student?.id) || [];
        setSelectedStudentIdsForPrint(allIds);
        setIsBulkPrintModalOpen(true);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to load bulk grade sheets');
    } finally {
      setIsBulkLoading(false);
    }
  };

  // Fetch Academic Years
  const { data: yearsData } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await api.get('/classes/academic-years/all');
      return res.data?.data || [];
    },
  });
  const activeYear = yearsData?.find((y: any) => y.isActive) || yearsData?.[0];

  // Fetch Exams
  const { data: examsData, isLoading: isExamsLoading } = useQuery({
    queryKey: ['exams', activeYear?.id],
    queryFn: async () => {
      const res = await api.get('/exams');
      return res.data?.data || [];
    },
  });

  // Fetch Classes
  const { data: classesData } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data?.data || [];
    },
  });

  // Fetch Subjects
  const { data: subjectsData } = useQuery({
    queryKey: ['subjects-all'],
    queryFn: async () => {
      const res = await api.get('/classes/subjects/all');
      return res.data?.data || [];
    },
  });

  // Filter classes & subjects for Teacher vs Admin
  const visibleClasses = (classesData || []).filter((cls: any) => {
    if (isAdmin) return true;
    if (isTeacher && teacherId) {
      const teachesSubject = cls.subjects?.some((cs: any) => cs.teacherId === teacherId);
      const isClassTeacher = cls.classTeacherId === teacherId;
      return teachesSubject || isClassTeacher;
    }
    return true;
  });

  const selectedClassObj = visibleClasses.find((c: any) => c.id.toString() === selectedClassId) || classesData?.find((c: any) => c.id.toString() === selectedClassId);

  const visibleSubjects = (subjectsData || []).filter((sub: any) => {
    if (isAdmin) return true;
    if (isTeacher && teacherId) {
      const isAssignedInClass = selectedClassObj?.subjects?.some((cs: any) => cs.subjectId === sub.id && cs.teacherId === teacherId);
      const isAssignedToTeacher = (user?.teacher as any)?.subjects?.some((ts: any) => ts.subjectId === sub.id);
      return isAssignedInClass || isAssignedToTeacher;
    }
    return true;
  });

  const ledgerAvailableClasses = (isAdmin
    ? (classesData || [])
    : (classesData || []).filter((c: any) => c.classTeacherId === teacherId || c.classTeacher?.id === teacherId)
  );

  // Auto-set default selections for teacher
  useEffect(() => {
    if (examsData?.length > 0 && !selectedExamId) {
      setSelectedExamId(examsData[0].id.toString());
      setLedgerExamId(examsData[0].id.toString());
    }
    if (visibleClasses.length > 0) {
      if (!selectedClassId || !visibleClasses.some((c: any) => c.id.toString() === selectedClassId)) {
        setSelectedClassId(visibleClasses[0].id.toString());
      }
    }
    if (ledgerAvailableClasses.length > 0) {
      if (!ledgerClassId || !ledgerAvailableClasses.some((c: any) => c.id.toString() === ledgerClassId)) {
        setLedgerClassId(ledgerAvailableClasses[0].id.toString());
      }
    }
    if (visibleSubjects.length > 0) {
      if (!selectedSubjectId || !visibleSubjects.some((s: any) => s.id.toString() === selectedSubjectId)) {
        setSelectedSubjectId(visibleSubjects[0].id.toString());
      }
    }
  }, [examsData, visibleClasses, ledgerAvailableClasses, visibleSubjects, selectedExamId, selectedClassId, ledgerClassId, selectedSubjectId]);

  // Synchronize ledger class selection on tab switch
  useEffect(() => {
    if (activeTab === 'ledger' && ledgerAvailableClasses.length > 0) {
      if (!ledgerClassId || !ledgerAvailableClasses.some((c: any) => c.id.toString() === ledgerClassId)) {
        setLedgerClassId(ledgerAvailableClasses[0].id.toString());
      }
    }
  }, [activeTab, ledgerAvailableClasses, ledgerClassId]);

  // Configure Mark Breakdown Mutation
  const configureBreakdownMutation = useMutation({
    mutationFn: async (titles: any[]) => {
      const res = await api.post(`/exams/${selectedExamId}/subjects/configure`, {
        subjectId: selectedSubjectId,
        markTitles: titles,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Mark breakdown saved!');
      setIsBreakdownModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['exam-marks'] });
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to save breakdown');
    },
  });

  const openBreakdownModal = () => {
    if (markSheetData?.examSubject?.markTitles?.length > 0) {
      setBreakdownParts(
        markSheetData.examSubject.markTitles.map((t: any) => ({
          title: t.title,
          fullMark: t.fullMark,
          rawFullMark: t.rawFullMark || t.fullMark,
          passMarkPct: t.passMarkPct || 40,
        }))
      );
    } else {
      setBreakdownParts([
        { title: 'Theory (सैद्धान्तिक)', fullMark: 25, rawFullMark: 75, passMarkPct: 40 },
        { title: 'Terminal / Unit Test (एकाइ परीक्षा)', fullMark: 5, rawFullMark: 5, passMarkPct: 40 },
        { title: 'Practical / Project (प्रयोगात्मक)', fullMark: 10, rawFullMark: 10, passMarkPct: 40 },
        { title: 'Attendance & Homework (नियमितता तथा गृहकार्य)', fullMark: 10, rawFullMark: 10, passMarkPct: 40 },
      ]);
    }
    setIsBreakdownModalOpen(true);
  };

  // Fetch Mark Entry Sheet for (Exam, Class, Subject)
  const { data: markSheetData, isLoading: isMarkSheetLoading } = useQuery({
    queryKey: ['exam-marks', selectedExamId, selectedClassId, selectedSubjectId],
    queryFn: async () => {
      if (!selectedExamId || !selectedClassId || !selectedSubjectId) return null;
      try {
        const res = await api.get(`/exams/${selectedExamId}/marks?classId=${selectedClassId}&subjectId=${selectedSubjectId}`);
        return res.data?.data;
      } catch {
        return null;
      }
    },
    enabled: !!selectedExamId && !!selectedClassId && !!selectedSubjectId && activeTab === 'marks',
  });

  // Populate marksState when markSheetData loads
  useEffect(() => {
    if (markSheetData?.students && markSheetData?.examSubject?.markTitles) {
      const state: Record<string, { marksObtained: string; isAbsent: boolean }> = {};
      const titles = markSheetData.examSubject.markTitles;
      markSheetData.students.forEach((st: any) => {
        titles.forEach((t: any) => {
          const key = `${st.id}_${t.id}`;
          const existing = st.marks?.[t.id];
          state[key] = {
            marksObtained: existing?.marksObtained !== null && existing?.marksObtained !== undefined ? existing.marksObtained.toString() : '',
            isAbsent: existing?.isAbsent || false,
          };
        });
      });
      setMarksState(state);
    }
  }, [markSheetData]);

  // Save Marks Mutation
  const saveMarksMutation = useMutation({
    mutationFn: async () => {
      if (!markSheetData?.examSubject) throw new Error('Exam subject not configured');
      const entries: any[] = [];
      const examSubjectId = markSheetData.examSubject.id;
      const titles = markSheetData.examSubject.markTitles;

      markSheetData.students.forEach((st: any) => {
        titles.forEach((t: any) => {
          const key = `${st.id}_${t.id}`;
          const data = marksState[key];
          if (data) {
            entries.push({
              examSubjectId,
              markTitleId: t.id,
              studentId: st.id,
              marksObtained: data.marksObtained !== '' ? parseFloat(data.marksObtained) : null,
              isAbsent: data.isAbsent,
            });
          }
        });
      });

      const res = await api.post(`/exams/${selectedExamId}/marks`, { entries });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Marks saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['exam-marks'] });
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to save marks');
    },
  });

  // Fetch Class Ledger
  const { data: ledgerData, isLoading: isLedgerLoading, isError: isLedgerError, error: ledgerError } = useQuery({
    queryKey: ['class-ledger', ledgerExamId, ledgerClassId],
    queryFn: async () => {
      if (!ledgerExamId || !ledgerClassId) return null;
      try {
        const res = await api.get(`/exams/${ledgerExamId}/ledger/${ledgerClassId}`);
        return res.data?.data;
      } catch (err: any) {
        throw err;
      }
    },
    enabled: !!ledgerExamId && !!ledgerClassId && activeTab === 'ledger',
  });

  // Create Exam Mutation
  const addExamMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.post('/exams', {
        ...formData,
        academicYearId: activeYear?.id || 1,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Exam created successfully!');
      setIsAddExamModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create exam');
    },
  });

  // Update Exam Mutation
  const updateExamMutation = useMutation({
    mutationFn: async (formData: any) => {
      const res = await api.put(`/exams/${editingExam.id}`, {
        ...formData,
        academicYearId: activeYear?.id || 1,
      });
      return res.data;
    },
    onSuccess: () => {
      toast.success('Exam updated successfully!');
      setIsEditExamModalOpen(false);
      setEditingExam(null);
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update exam');
    },
  });

  // Delete Exam Mutation
  const deleteExamMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await api.delete(`/exams/${id}`);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Exam deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['exams'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete exam');
    },
  });

  const openAddExamModal = () => {
    setAddExamClassIds((classesData || []).map((c: any) => c.id));
    setAddExamShift('DAY');
    setAddExamTiming('11:00 AM - 02:00 PM');
    setIsAddExamModalOpen(true);
  };

  const openEditExamModal = (exam: any) => {
    setEditingExam(exam);
    setEditExamClassIds(exam.examClasses?.map((ec: any) => ec.classId) || []);
    setEditExamShift(exam.shift || 'DAY');
    setEditExamTiming(exam.examTiming || '11:00 AM - 02:00 PM');
    setIsEditExamModalOpen(true);
  };

  const handleAddExam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {
      name: fd.get('name'),
      nameNepali: fd.get('nameNepali') || null,
      startDateBs: fd.get('startDateBs'),
      endDateBs: fd.get('endDateBs') || null,
      shift: addExamShift,
      examTiming: addExamTiming,
      classIds: addExamClassIds,
    };
    addExamMutation.mutate(data);
  };

  const handleUpdateExam = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const data: any = {
      name: fd.get('name'),
      nameNepali: fd.get('nameNepali') || null,
      startDateBs: fd.get('startDateBs'),
      endDateBs: fd.get('endDateBs') || null,
      shift: editExamShift,
      examTiming: editExamTiming,
      classIds: editExamClassIds,
    };
    updateExamMutation.mutate(data);
  };

  const handleMarkChange = (studentId: number, titleId: number, field: 'marksObtained' | 'isAbsent', value: any) => {
    const key = `${studentId}_${titleId}`;
    setMarksState((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  // View Marksheet for student
  const handleViewMarksheet = async (studentId: number) => {
    try {
      const res = await api.get(`/exams/${ledgerExamId}/marksheet/${studentId}`);
      setSelectedMarksheet(res.data?.data);
    } catch {
      toast.error('Failed to load marksheet');
    }
  };

  // Standalone Print Engine for Class Exam Ledger (Mark-wise & Grade-wise)
  const triggerLedgerPrint = () => {
    if (!ledgerData || !ledgerData.rows || ledgerData.rows.length === 0) {
      toast.error('No exam ledger data available to print.');
      return;
    }

    const currentExamObj = examsData?.find((e: any) => e.id.toString() === ledgerExamId);
    const currentLedgerClass = classesData?.find((c: any) => c.id.toString() === ledgerClassId);
    const examTitleStr = currentExamObj ? (currentExamObj.nameNepali || currentExamObj.name) : 'Examination';
    const classNameStr = currentLedgerClass ? `${currentLedgerClass.name} ${currentLedgerClass.section ? `(${currentLedgerClass.section})` : ''}` : 'Class';
    const isGradeMode = ledgerViewMode === 'grades';

    const printWin = window.open('', '_blank');
    if (!printWin) {
      window.print();
      return;
    }

    const subjects = ledgerData.subjects || [];

    // Header HTML for subjects
    const subjectHeaders = subjects
      .map(
        (sub: any) => `
        <th colSpan="3" style="text-align: center; border: 1px solid #1e3a5f; background: #162c46; color: #fff; font-size: 8.5px; padding: 3px 2px;">
          ${sub.subject?.name || sub.subjectName}
        </th>
      `
      )
      .join('');

    const subDetailHeaders = subjects
      .map(() =>
        isGradeMode
          ? `<th style="text-align: center; font-size: 8px; border: 1px solid #cbd5e1; padding: 2px;">TH</th><th style="text-align: center; font-size: 8px; border: 1px solid #cbd5e1; padding: 2px;">PR</th><th style="text-align: center; font-size: 8px; border: 1px solid #cbd5e1; padding: 2px; background: #fef3c7;">FINAL</th>`
          : `<th style="text-align: center; font-size: 8px; border: 1px solid #cbd5e1; padding: 2px;">TH</th><th style="text-align: center; font-size: 8px; border: 1px solid #cbd5e1; padding: 2px;">PR</th><th style="text-align: center; font-size: 8px; border: 1px solid #cbd5e1; padding: 2px; background: #fef3c7;">TOT</th>`
      )
      .join('');

    // Table rows HTML
    const rowsHtml = ledgerData.rows
      .map((row: any) => {
        const symbol = row.symbolNo || generateSymbolNo(activeYear?.year, currentLedgerClass?.name, row.rollNo || row.sn);

        const subCells = row.subjects
          ?.map((sub: any) => {
            if (isGradeMode) {
              const thGrade = sub.theory?.letterGrade || '—';
              const prGrade = sub.practical?.letterGrade || '—';
              const subGrade = sub.finalGrade || (sub.compiled?.finalGrade || 'NG');
              const subIsNG = subGrade === 'NG';
              return `
                <td style="text-align: center; font-size: 8.5px; border: 1px solid #e2e8f0; padding: 3px 1px;">${thGrade}</td>
                <td style="text-align: center; font-size: 8.5px; border: 1px solid #e2e8f0; padding: 3px 1px; color: #6b21a8;">${prGrade}</td>
                <td style="text-align: center; font-size: 8.5px; font-weight: bold; border: 1px solid #cbd5e1; padding: 3px 1px; background: #fffbeb; color: ${subIsNG ? '#b91c1c' : '#1e3a5f'};">${subGrade}</td>
              `;
            } else {
              const thObt = sub.theory?.obtained !== null && sub.theory?.obtained !== undefined ? sub.theory.obtained : '—';
              const prObt = sub.practical?.obtained !== null && sub.practical?.obtained !== undefined ? sub.practical.obtained : '—';
              const totObt = sub.totalObtained ?? (sub.compiled?.obtained ?? 0);
              return `
                <td style="text-align: center; font-size: 8.5px; border: 1px solid #e2e8f0; padding: 3px 1px;">${thObt}</td>
                <td style="text-align: center; font-size: 8.5px; border: 1px solid #e2e8f0; padding: 3px 1px; color: #6b21a8;">${prObt}</td>
                <td style="text-align: center; font-size: 8.5px; font-weight: bold; border: 1px solid #cbd5e1; padding: 3px 1px; background: #f8fafc;">${totObt}</td>
              `;
            }
          })
          .join('');

        if (isGradeMode) {
          const isNG = row.status === 'NON_GRADED' || row.overallGrade === 'NG';
          return `
            <tr>
              <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1;">${row.rank}</td>
              <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1;">${row.rollNo || row.sn}</td>
              <td style="text-align: center; font-family: monospace; border: 1px solid #cbd5e1;">${symbol}</td>
              <td style="border: 1px solid #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;"><strong>${row.fullName}</strong></td>
              ${subCells}
              <td style="text-align: center; font-weight: 900; color: #1e3a5f; border: 1px solid #cbd5e1; background: #fef3c7;">${row.gpa !== undefined ? row.gpa.toFixed(2) : '0.00'}</td>
              <td style="text-align: center; font-weight: 900; border: 1px solid #cbd5e1;">${row.overallGrade || 'NG'}</td>
              <td style="text-align: center; font-weight: 900; color: ${!isNG ? '#15803d' : '#b91c1c'}; border: 1px solid #cbd5e1;">${!isNG ? 'PASSED' : 'NON-GRADED'}</td>
            </tr>
          `;
        } else {
          const isPassed = row.percentage >= 35 && row.status !== 'NON_GRADED';
          return `
            <tr>
              <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1;">${row.rank}</td>
              <td style="text-align: center; font-weight: bold; border: 1px solid #cbd5e1;">${row.rollNo || row.sn}</td>
              <td style="text-align: center; font-family: monospace; border: 1px solid #cbd5e1;">${symbol}</td>
              <td style="border: 1px solid #cbd5e1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 140px;"><strong>${row.fullName}</strong></td>
              <td style="text-align: center; font-family: monospace; border: 1px solid #cbd5e1;">${row.studentId}</td>
              ${subCells}
              <td style="text-align: right; font-weight: 900; color: #1e3a5f; border: 1px solid #cbd5e1;">${row.grandTotal} / ${row.grandFull}</td>
              <td style="text-align: right; font-weight: 900; color: #15803d; border: 1px solid #cbd5e1;">${row.percentage}%</td>
              <td style="text-align: center; font-weight: 900; color: ${isPassed ? '#15803d' : '#b91c1c'}; border: 1px solid #cbd5e1;">${isPassed ? 'PASS' : 'FAIL'}</td>
            </tr>
          `;
        }
      })
      .join('');

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${examTitleStr} Ledger - Shree Nepal Secondary School</title>
          <style>
            @page { size: A4 landscape; margin: 6mm; }
            * { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 0; background: #fff; color: #111; }
            .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 6px; margin-bottom: 10px; }
            .school-name { font-size: 14px; font-weight: 900; color: #1e3a5f; margin: 2px 0; }
            .report-title { font-size: 11px; font-weight: 900; background: #eff6ff; color: #1e3a5f; display: inline-block; padding: 2px 10px; border-radius: 4px; uppercase; border: 1px solid #bfdbfe; }
            .meta-grid { display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; margin-bottom: 8px; background: #f8fafc; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0; }
            table { width: 100%; border-collapse: collapse; font-size: 9.5px; }
            th { background: #1e3a5f; color: #fff; padding: 5px 3px; text-align: left; font-size: 9px; border: 1px solid #1e3a5f; }
            td { padding: 4px 3px; }
            .footer-sig { margin-top: 25px; display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; }
            .sig-line { border-top: 1px solid #333; width: 160px; text-align: center; padding-top: 3px; margin-top: 30px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="school-name">श्री नेपाल माध्यमिक विद्यालय, विश्रामपुर, रौतहट (Shree Nepal Sec. School)</div>
            <div class="report-title">${examTitleStr} — Official Class Ledger Sheet (${isGradeMode ? 'Grade-wise GPA Ledger' : 'Mark-wise Ledger'})</div>
          </div>

          <div class="meta-grid">
            <div><strong>कक्षा (Class):</strong> ${classNameStr}</div>
            <div><strong>शैक्षिक सत्र (Academic Year):</strong> ${activeYear?.year || '2083'}</div>
            <div><strong>कुल विद्यार्थी (Total Students):</strong> ${ledgerData.rows.length}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px; text-align: center;" rowSpan="2">Rank</th>
                <th style="width: 30px; text-align: center;" rowSpan="2">Roll</th>
                <th style="width: 70px; text-align: center;" rowSpan="2">Symbol No.</th>
                <th style="max-width: 140px;" rowSpan="2">Student Name</th>
                ${!isGradeMode ? `<th style="width: 90px;" rowSpan="2">EMIS ID</th>` : ''}
                ${subjectHeaders}
                ${isGradeMode ? `
                  <th style="width: 45px; text-align: center; background: #162c46; color: #fef3c7;" rowSpan="2">GPA</th>
                  <th style="width: 45px; text-align: center;" rowSpan="2">Grade</th>
                  <th style="width: 55px; text-align: center;" rowSpan="2">Status</th>
                ` : `
                  <th style="width: 70px; text-align: right;" rowSpan="2">Total</th>
                  <th style="width: 40px; text-align: right;" rowSpan="2">%</th>
                  <th style="width: 45px; text-align: center;" rowSpan="2">Result</th>
                `}
              </tr>
              <tr>
                ${subDetailHeaders}
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-sig">
            <div class="sig-line">कक्षा शिक्षकको दस्तखत (Class Teacher)</div>
            <div class="sig-line">परीक्षा नियन्त्रकको दस्तखत (Exam Controller)</div>
            <div class="sig-line">प्रधानाध्यापकको दस्तखत तथा छाप (Headmaster Stamp)</div>
          </div>

          <script>
            window.onload = function() { setTimeout(function() { window.print(); }, 400); };
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  const currentClassObj = classesData?.find((c: any) => c.id.toString() === selectedClassId);
  const currentClassSubject = currentClassObj?.subjects?.find((cs: any) => cs.subjectId.toString() === selectedSubjectId);
  const currentSubjectObj = subjectsData?.find((s: any) => s.id.toString() === selectedSubjectId);
  const isSubjectTeacher = isAdmin || (isTeacher && (
    currentClassSubject?.teacherId === teacherId ||
    (user?.teacher as any)?.subjects?.some((s: any) => s.subjectId.toString() === selectedSubjectId)
  ));
  const assignedTeacherName = currentClassSubject?.teacher?.fullName || 'तोकिएको छैन';

  const exams = examsData || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-[#1e3a5f]">
            Exams, Marks & Marksheets (परीक्षा तथा लब्धाङ्क)
          </h1>
          <p className="text-xs text-gray-500 font-nepali mt-0.5">
            प्रथम/दोस्रो/वार्षिक परीक्षा, विषयगत पूर्णाङ्क (Theory, Practical, Life Learning) र लेजर
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl bg-slate-200/70 p-1 text-xs font-bold">
            <button
              onClick={() => setActiveTab('exams')}
              className={`rounded-lg px-3.5 py-1.5 transition ${
                activeTab === 'exams' ? 'bg-white text-[#1e3a5f] shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Exams (परीक्षाहरू)
            </button>
            <button
              onClick={() => setActiveTab('marks')}
              className={`rounded-lg px-3.5 py-1.5 transition ${
                activeTab === 'marks' ? 'bg-white text-[#1e3a5f] shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Mark Entry (अङ्क प्रविष्टि)
            </button>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`rounded-lg px-3.5 py-1.5 transition ${
                activeTab === 'ledger' ? 'bg-white text-[#1e3a5f] shadow-xs' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Class Ledger & Ranking (लेजर)
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                if (exams?.length > 0) setPublishExamId(exams[0].id.toString());
                setIsPublishModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition"
            >
              <Bell size={14} />
              <span>📢 Publish Results (नतिजा प्रकाशन)</span>
            </button>
          )}

          {activeTab === 'exams' && isAdmin && (
            <button
              onClick={openAddExamModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-2xs"
            >
              <Plus size={14} />
              <span>Create Exam (परीक्षा सिर्जना)</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── TAB 1: EXAMS LIST ─────────────────────────────────────────────── */}
      {activeTab === 'exams' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {isExamsLoading ? (
            <div className="col-span-full py-12 text-center text-gray-400">Loading exams...</div>
          ) : !exams?.length ? (
            <div className="col-span-full py-12 text-center text-gray-400 bg-white rounded-2xl border border-gray-100">
              <Award size={32} className="mx-auto text-gray-300 mb-1" />
              <p className="text-sm font-semibold text-gray-600">No exams created for active academic year</p>
            </div>
          ) : (
            exams.map((exam: any) => (
              <div
                key={exam.id}
                className="rounded-2xl border border-gray-100 bg-white p-5 shadow-2xs hover:shadow-md transition space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-gray-900">{exam.name}</h3>
                    {exam.nameNepali && (
                      <p className="text-xs text-gray-500 font-nepali">{exam.nameNepali}</p>
                    )}
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                      {exam.startDateBs || 'N/A'} ~ {exam.endDateBs || 'N/A'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {isAdmin && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditExamModal(exam)}
                          title="Edit Exam Details"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete "${exam.name}"? All related marks will be permanently removed.`)) {
                              deleteExamMutation.mutate(exam.id);
                            }
                          }}
                          title="Delete Exam"
                          className="rounded-lg p-1.5 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shift & Timing Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200/80 px-2 py-0.5 font-bold text-amber-800 text-[11px]">
                    {exam.shift === 'MORNING' ? (
                      <>
                        <Sun size={12} className="text-amber-600" />
                        <span>Morning Shift (बिहानी सत्र)</span>
                      </>
                    ) : exam.shift === 'EVENING' ? (
                      <>
                        <Moon size={12} className="text-indigo-600" />
                        <span>Evening Shift (साँझ सत्र)</span>
                      </>
                    ) : (
                      <>
                        <Sun size={12} className="text-amber-600" />
                        <span>Day Shift (दिवा सत्र)</span>
                      </>
                    )}
                  </span>

                  {exam.examTiming && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 border border-blue-200/80 px-2 py-0.5 font-mono font-bold text-blue-800 text-[11px]">
                      <Clock size={12} className="text-blue-600" />
                      <span>{exam.examTiming}</span>
                    </span>
                  )}
                </div>

                {/* Participating Classes Badges */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Participating Classes (कक्षा):</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {exam.examClasses?.length ? (
                      exam.examClasses.map((ec: any) => (
                        <span key={ec.classId} className="rounded-md bg-slate-100 border border-slate-200/60 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                          {ec.class?.name || `Class ${ec.classId}`}
                        </span>
                      ))
                    ) : (
                      <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        ✓ All School Classes (सम्पूर्ण कक्षाहरू)
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-50 pt-3">
                  <button
                    onClick={() => {
                      setSelectedExamId(exam.id.toString());
                      setActiveTab('marks');
                    }}
                    className="text-xs font-bold text-[#1e3a5f] hover:underline"
                  >
                    Enter Marks →
                  </button>
                  <button
                    onClick={() => {
                      setLedgerExamId(exam.id.toString());
                      setActiveTab('ledger');
                    }}
                    className="text-xs font-bold text-purple-700 hover:underline"
                  >
                    View Ledger →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── TAB 2: MARK ENTRY ─────────────────────────────────────────────── */}
      {activeTab === 'marks' && (
        <div className="space-y-4">
          {/* Permission Guard Notice */}
          {!isSubjectTeacher && selectedSubjectId && (
            <div className="flex items-center gap-2.5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 font-semibold shadow-2xs">
              <Lock size={18} className="text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">विषय शिक्षक अनुमति (Read-Only Mode):</span>{' '}
                <span>
                  <strong>{currentSubjectObj?.name}</strong> को प्राप्ताङ्क प्रविष्टि गर्न केवल तोकिएको विषय शिक्षक ({assignedTeacherName}) वा प्रशासनलाई मात्र अनुमति छ ।
                </span>
              </div>
            </div>
          )}

          {/* Selectors Bar */}
          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Select Exam:</label>
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="erp-input w-44 font-bold"
                >
                  {examsData?.map((e: any) => (
                    <option key={e.id} value={e.id}>{e.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Select Class:</label>
                <select
                  value={selectedClassId}
                  onChange={(e) => setSelectedClassId(e.target.value)}
                  className="erp-input w-40 font-bold"
                >
                  {visibleClasses?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} {c.section ? `(${c.section})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Select Subject:</label>
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="erp-input w-48 font-bold"
                >
                  {visibleSubjects?.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code || 'SUB'})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isSubjectTeacher && (
                <button
                  type="button"
                  onClick={openBreakdownModal}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 hover:bg-purple-100 px-3.5 py-2 text-xs font-bold text-purple-900 shadow-2xs transition"
                >
                  <Sliders size={14} />
                  <span>⚙️ Breakdown Scheme (अङ्क विभाजन)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => saveMarksMutation.mutate()}
                disabled={!isSubjectTeacher || saveMarksMutation.isPending || !markSheetData?.students?.length || !markSheetData?.examSubject?.markTitles?.length}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                <Save size={14} />
                <span>{saveMarksMutation.isPending ? 'Saving...' : 'Save Marks (अङ्क सुरक्षित)'}</span>
              </button>
            </div>
          </div>

          {/* Mark Breakdown / Evaluation Scheme Bar */}
          {selectedSubjectId && (
            markSheetData?.examSubject?.markTitles?.length ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-purple-50/60 border border-purple-200 p-3.5 text-xs text-purple-950 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-purple-900 flex items-center gap-1.5">
                    <Sliders size={15} /> मूल्याङ्कन विभाजन ढाँचा:
                  </span>
                  {markSheetData.examSubject.markTitles.map((t: any) => (
                    <span key={t.id} className="rounded-lg bg-white border border-purple-200 px-2.5 py-1 font-semibold text-purple-900 shadow-2xs">
                      {t.title}: <strong className="text-[#1e3a5f] font-mono">{t.fullMark} M</strong>
                    </span>
                  ))}
                  <span className="rounded-lg bg-purple-200 px-3 py-1 font-extrabold text-purple-950">
                    Total: {markSheetData.examSubject.markTitles.reduce((s: number, t: any) => s + (t.fullMark || 0), 0)} Marks
                  </span>
                </div>

                {isSubjectTeacher && (
                  <button
                    type="button"
                    onClick={openBreakdownModal}
                    className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline"
                  >
                    Change Breakdown Scheme →
                  </button>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-200 bg-amber-50/90 p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-extrabold text-sm text-amber-950 flex items-center gap-1.5">
                    <Sliders size={16} className="text-amber-700" />
                    पूर्णाङ्क तथा मूल्याङ्कन ढाँचा तय गर्नुहोस् (Mark Breakdown Required)
                  </h3>
                  <p className="text-xs text-amber-900 mt-0.5 font-nepali">
                    यस विषयको लागि परीक्षा पूर्णाङ्क विभाजन (जस्तै: Theory 25 + Test 5 + Practical 10 + Homework 10 = Total 50) तय गर्नुहोस् ।
                  </p>
                </div>
                {isSubjectTeacher && (
                  <button
                    type="button"
                    onClick={openBreakdownModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] text-white px-4 py-2 text-xs font-bold transition shadow-sm whitespace-nowrap"
                  >
                    <Sliders size={14} />
                    <span>⚙️ Set Mark Breakdown (अङ्क विभाजन सिर्जना)</span>
                  </button>
                )}
              </div>
            )
          )}

          {/* Mark Entry Table */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            {isMarkSheetLoading ? (
              <div className="py-12 text-center text-gray-400">Loading student mark entry sheet...</div>
            ) : !markSheetData?.students?.length ? (
              <div className="py-12 text-center text-gray-400">
                <p className="text-sm font-semibold text-gray-600">No students enrolled in the selected class.</p>
              </div>
            ) : !markSheetData?.examSubject?.markTitles?.length ? (
              <div className="py-12 text-center text-gray-400 space-y-2">
                <Sliders size={32} className="mx-auto text-amber-400 mb-1" />
                <p className="text-sm font-bold text-gray-700">Please configure the Mark Breakdown Scheme first.</p>
                <p className="text-xs text-gray-400 font-nepali">माथिको "Set Mark Breakdown" बटन क्लिक गरी अङ्क विभाजन तय गर्नुहोस् ।</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead className="bg-[#1e3a5f] text-white">
                    <tr>
                      <th className="px-3.5 py-3.5 font-bold uppercase w-14 text-center">Roll</th>
                      <th className="px-3.5 py-3.5 font-bold uppercase w-28 text-center text-amber-300">Symbol No.</th>
                      <th className="px-4 py-3.5 font-bold uppercase">Student Name</th>
                      <th className="px-3.5 py-3.5 font-bold uppercase text-gray-300">EMIS ID</th>
                      {markSheetData.examSubject.markTitles.map((title: any) => (
                        <th key={title.id} className="px-4 py-3.5 font-bold uppercase text-center">
                          <div>{title.title}</div>
                          <div className="font-mono text-[10px] text-amber-300 font-normal mt-0.5">
                            {title.rawFullMark && title.rawFullMark !== title.fullMark
                              ? `Full: ${title.fullMark} M (Raw: ${title.rawFullMark} M)`
                              : `Full: ${title.fullMark} M`}
                          </div>
                        </th>
                      ))}
                      <th className="px-4 py-3.5 font-bold uppercase text-center bg-[#162c46]">
                        Total ({markSheetData.examSubject.markTitles.reduce((s: number, t: any) => s + (t.fullMark || 0), 0)} M)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {markSheetData.students.map((student: any) => {
                      let studentTotal = 0;
                      let hasAnyScore = false;
                      const studentSymbol = student.symbolNo || generateSymbolNo(activeYear?.year, currentClassObj?.name, student.rollNo);

                      return (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="px-3.5 py-3 font-mono font-bold text-center">{student.rollNo || '—'}</td>
                          <td className="px-3.5 py-3 font-mono font-extrabold text-blue-900 text-center bg-blue-50/60">
                            {studentSymbol}
                          </td>
                          <td className="px-4 py-3 font-bold text-gray-900">{student.fullName}</td>
                          <td className="px-3.5 py-3 font-mono text-gray-400">{student.studentId}</td>

                          {markSheetData.examSubject.markTitles.map((title: any) => {
                            const key = `${student.id}_${title.id}`;
                            const current = marksState[key] || { marksObtained: '', isAbsent: false };
                            if (current.marksObtained !== '' && !current.isAbsent) {
                              studentTotal += parseFloat(current.marksObtained) || 0;
                              hasAnyScore = true;
                            }

                            return (
                              <td key={title.id} className="px-4 py-3 text-center">
                                <div className="inline-flex items-center gap-2">
                                  <input
                                    type="number"
                                    min={0}
                                    max={title.rawFullMark || title.fullMark}
                                    step="any"
                                    disabled={!isSubjectTeacher || current.isAbsent}
                                    placeholder={`0-${title.fullMark}`}
                                    value={current.marksObtained}
                                    onChange={(e) =>
                                      handleMarkChange(student.id, title.id, 'marksObtained', e.target.value)
                                    }
                                    className="erp-input w-20 text-center font-mono font-bold disabled:bg-gray-100"
                                  />
                                  <label className="flex items-center gap-1 text-[10px] text-gray-500 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      disabled={!isSubjectTeacher}
                                      checked={current.isAbsent}
                                      onChange={(e) =>
                                        handleMarkChange(student.id, title.id, 'isAbsent', e.target.checked)
                                      }
                                      className="rounded text-rose-500"
                                    />
                                    <span>Abs</span>
                                  </label>
                                </div>
                              </td>
                            );
                          })}

                          <td className="px-4 py-3 text-center font-mono font-extrabold text-sm text-[#1e3a5f] bg-slate-50/50">
                            {hasAnyScore ? studentTotal.toFixed(1).replace(/\.0$/, '') : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: CLASS LEDGER & RANKING (MARK-WISE & GRADE-WISE) ───────── */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {isTeacher && (classesData || []).filter((c: any) => c.classTeacherId === teacherId).length === 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-8 text-center space-y-3 shadow-xs">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-900 mb-1 border border-amber-300">
                <Lock size={26} />
              </div>
              <h3 className="text-base font-extrabold text-amber-950">
                Class Teacher Access Required (कक्षा शिक्षक अनुमति मात्र)
              </h3>
              <p className="text-xs text-amber-900 max-w-lg mx-auto font-nepali leading-relaxed">
                तपाईं हाल कुनै पनि कक्षाको मुख्य <strong>कक्षा शिक्षक (Class Teacher)</strong> मा तोकिनु भएको छैन। परीक्षाको पूर्ण कक्षा लेजर (Mark-wise / Grade-wise) र एकमुष्ट लब्धाङ्क-पत्र (Bulk Grade Sheet) केवल <strong>सम्बन्धित कक्षा शिक्षक</strong> र <strong>प्रशासन</strong>ले मात्र हेर्न र प्रिन्ट गर्न पाउने व्यवस्था गरिएको छ।
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('marks')}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 text-xs font-bold text-white shadow-xs transition"
                >
                  <BookOpen size={14} />
                  <span>Go to Mark Entry for your Subjects (विषयगत अङ्क प्रविष्टिमा जानुहोस्) →</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Exam (परीक्षा):</label>
                    <select
                      value={ledgerExamId}
                      onChange={(e) => setLedgerExamId(e.target.value)}
                      className="erp-input w-48 font-bold"
                    >
                      {examsData?.map((e: any) => (
                        <option key={e.id} value={e.id}>{e.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Class (कक्षा):</label>
                    <select
                      value={ledgerClassId}
                      onChange={(e) => setLedgerClassId(e.target.value)}
                      className="erp-input w-56 font-bold"
                    >
                      {ledgerAvailableClasses.map((c: any) => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.section ? `(${c.section})` : ''} {isTeacher ? '★ (तपाईंको कक्षा)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>

              {/* Ledger Type Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">Ledger Type (लेजरको प्रकार):</label>
                <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-gray-200">
                  <button
                    type="button"
                    onClick={() => setLedgerViewMode('marks')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      ledgerViewMode === 'marks'
                        ? 'bg-white text-[#1e3a5f] shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    📊 Mark-wise Ledger (अङ्कगत लेजर)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLedgerViewMode('grades')}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                      ledgerViewMode === 'grades'
                        ? 'bg-[#1e3a5f] text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ⭐ Grade-wise Ledger (GPA / ग्रेडगत लेजर)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenBulkPrint}
                disabled={isBulkLoading}
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition disabled:opacity-50"
              >
                <FileText size={14} />
                <span>{isBulkLoading ? 'Loading Grade Sheets...' : 'Bulk Print Grade Sheets (एकमुष्ट ग्रेडसिट प्रिन्ट)'}</span>
              </button>

              <button
                type="button"
                onClick={triggerLedgerPrint}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] px-4 py-2 text-xs font-bold text-white hover:bg-[#2a5280] shadow-xs transition"
              >
                <Printer size={14} />
                <span>Print Ledger (लेजर प्रिन्ट)</span>
              </button>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-2xs overflow-hidden">
            {isLedgerLoading ? (
              <div className="py-12 text-center text-gray-400">Calculating class rankings, GPAs, and ledger...</div>
            ) : isLedgerError ? (
              <div className="py-12 text-center text-rose-600 font-bold px-4">
                {(ledgerError as any)?.response?.data?.message || 'Error loading class ledger.'}
              </div>
            ) : !ledgerData?.rows?.length ? (
              <div className="py-12 text-center text-gray-400">No marks entered for this exam and class yet.</div>
            ) : ledgerViewMode === 'marks' ? (
              /* ─── 1. MARK-WISE LEDGER TABLE (THEORY, PRACTICAL & COMPILED TOTAL) ─── */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700 border-collapse">
                  <thead className="bg-[#1e3a5f] text-white text-[11px]">
                    <tr>
                      <th className="px-2.5 py-2.5 font-bold uppercase text-center w-12 border-r border-slate-700" rowSpan={2}>Rank</th>
                      <th className="px-2.5 py-2.5 font-bold uppercase w-12 text-center border-r border-slate-700" rowSpan={2}>Roll</th>
                      <th className="px-2.5 py-2.5 font-bold uppercase text-center text-amber-300 border-r border-slate-700" rowSpan={2}>Symbol No.</th>
                      <th className="px-3 py-2.5 font-bold uppercase border-r border-slate-700 min-w-[140px]" rowSpan={2}>Student Name</th>
                      <th className="px-2.5 py-2.5 font-bold uppercase text-gray-300 border-r border-slate-700" rowSpan={2}>EMIS ID</th>
                      {ledgerData.subjects?.map((sub: any) => (
                        <th key={sub.id} colSpan={3} className="px-2 py-1.5 font-bold uppercase text-center border-r border-slate-700 bg-[#162c46]">
                          <div className="truncate max-w-[160px] mx-auto">{sub.subject?.name || sub.subjectName}</div>
                        </th>
                      ))}
                      <th className="px-2.5 py-2.5 font-bold uppercase text-right border-l border-slate-700" rowSpan={2}>Grand Total</th>
                      <th className="px-2.5 py-2.5 font-bold uppercase text-right" rowSpan={2}>%</th>
                      <th className="px-2.5 py-2.5 font-bold uppercase text-center" rowSpan={2}>Result</th>
                      <th className="px-2.5 py-2.5 font-bold uppercase text-center no-print" rowSpan={2}>Marksheet</th>
                    </tr>
                    <tr className="bg-[#244570] text-[10px] text-slate-200">
                      {ledgerData.subjects?.map((sub: any) => (
                        <React.Fragment key={sub.id}>
                          <th className="px-1.5 py-1 text-center font-bold text-slate-200 border-r border-slate-600/50">TH</th>
                          <th className="px-1.5 py-1 text-center font-bold text-purple-200 border-r border-slate-600/50">PR</th>
                          <th className="px-1.5 py-1 text-center font-bold text-amber-300 bg-[#1a3250] border-r border-slate-700">TOT</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {ledgerData.rows.map((row: any) => {
                      const isPassed = row.percentage >= 35 && row.status !== 'NON_GRADED';
                      return (
                        <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-2 py-2 text-center border-r border-gray-100">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                                row.rank === 1
                                  ? 'bg-amber-400 text-[#1e3a5f]'
                                  : row.rank === 2
                                  ? 'bg-slate-300 text-slate-800'
                                  : row.rank === 3
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-100 text-gray-600'
                              }`}
                            >
                              {row.rank}
                            </span>
                          </td>
                          <td className="px-2 py-2 font-mono text-gray-700 font-bold text-center border-r border-gray-100">{row.rollNo || row.sn}</td>
                          <td className="px-2 py-2 font-mono font-extrabold text-blue-900 text-center bg-blue-50/40 border-r border-gray-100">
                            {row.symbolNo || generateSymbolNo(activeYear?.year, currentClassObj?.name, row.rollNo || row.sn)}
                          </td>
                          <td className="px-3 py-2 font-bold text-gray-900 border-r border-gray-100">{row.fullName}</td>
                          <td className="px-2 py-2 font-mono text-gray-400 border-r border-gray-100 text-[11px]">{row.studentId}</td>

                          {row.subjects?.map((sub: any, i: number) => {
                            const thObt = sub.theory?.obtained !== null && sub.theory?.obtained !== undefined ? sub.theory.obtained : '—';
                            const prObt = sub.practical?.obtained !== null && sub.practical?.obtained !== undefined ? sub.practical.obtained : '—';
                            const totObt = sub.totalObtained ?? (sub.compiled?.obtained ?? 0);
                            return (
                              <React.Fragment key={i}>
                                <td className="px-1.5 py-2 text-center font-mono text-gray-700 border-r border-gray-100">
                                  {thObt}
                                </td>
                                <td className="px-1.5 py-2 text-center font-mono text-purple-700 font-semibold border-r border-gray-100">
                                  {prObt}
                                </td>
                                <td className="px-1.5 py-2 text-center font-mono font-bold text-gray-900 bg-slate-50 border-r border-gray-200">
                                  {totObt}
                                </td>
                              </React.Fragment>
                            );
                          })}

                          <td className="px-2.5 py-2 text-right font-mono font-extrabold text-[#1e3a5f] border-l border-gray-200 bg-blue-50/20">
                            {row.grandTotal} / {row.grandFull}
                          </td>
                          <td className="px-2.5 py-2 text-right font-mono font-extrabold text-emerald-700">
                            {row.percentage}%
                          </td>
                          <td className="px-2.5 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {isPassed ? 'PASS' : 'FAIL'}
                            </span>
                          </td>
                          <td className="px-2.5 py-2 text-center no-print">
                            <button
                              onClick={() => handleViewMarksheet(row.studentInternalId || row.studentId)}
                              className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                            >
                              Marksheet
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              /* ─── 2. GRADE-WISE / GPA LEDGER TABLE (THEORY, PRACTICAL & FINAL GRADE) ─ */
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700 border-collapse">
                  <thead className="bg-[#1e3a5f] text-white text-[11px]">
                    <tr>
                      <th className="px-2.5 py-2.5 font-bold uppercase text-center w-12 border-r border-slate-700" rowSpan={2}>Rank</th>
                      <th className="px-2.5 py-2.5 font-bold uppercase w-12 text-center border-r border-slate-700" rowSpan={2}>Roll</th>
                      <th className="px-2.5 py-2.5 font-bold uppercase text-center text-amber-300 border-r border-slate-700" rowSpan={2}>Symbol No.</th>
                      <th className="px-3 py-2.5 font-bold uppercase border-r border-slate-700 min-w-[140px]" rowSpan={2}>Student Name</th>
                      {ledgerData.subjects?.map((sub: any) => (
                        <th key={sub.id} colSpan={3} className="px-2 py-1.5 font-bold uppercase text-center border-r border-slate-700 bg-[#162c46]">
                          <div className="truncate max-w-[160px] mx-auto">{sub.subject?.name || sub.subjectName}</div>
                        </th>
                      ))}
                      <th className="px-3 py-2.5 font-bold uppercase text-center bg-[#162c46] text-amber-300 border-l border-slate-700" rowSpan={2}>GPA (/ 4.0)</th>
                      <th className="px-3 py-2.5 font-bold uppercase text-center" rowSpan={2}>Overall Grade</th>
                      <th className="px-3 py-2.5 font-bold uppercase text-center" rowSpan={2}>Status</th>
                      <th className="px-3 py-2.5 font-bold uppercase text-center no-print" rowSpan={2}>Grade Sheet</th>
                    </tr>
                    <tr className="bg-[#244570] text-[10px] text-slate-200">
                      {ledgerData.subjects?.map((sub: any) => (
                        <React.Fragment key={sub.id}>
                          <th className="px-1.5 py-1 text-center font-bold text-blue-200 border-r border-slate-600/50">TH</th>
                          <th className="px-1.5 py-1 text-center font-bold text-purple-200 border-r border-slate-600/50">PR</th>
                          <th className="px-1.5 py-1 text-center font-bold text-amber-300 bg-[#1a3250] border-r border-slate-700">FINAL (GP)</th>
                        </React.Fragment>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {ledgerData.rows.map((row: any) => {
                      const isNG = row.status === 'NON_GRADED' || row.overallGrade === 'NG';
                      return (
                        <tr key={row.studentId} className="hover:bg-slate-50 transition-colors">
                          <td className="px-2 py-2 text-center border-r border-gray-100">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                                row.rank === 1
                                  ? 'bg-amber-400 text-[#1e3a5f]'
                                  : row.rank === 2
                                  ? 'bg-slate-300 text-slate-800'
                                  : row.rank === 3
                                  ? 'bg-amber-600 text-white'
                                  : 'bg-slate-100 text-gray-600'
                              }`}
                            >
                              {row.rank}
                            </span>
                          </td>
                          <td className="px-2 py-2 font-mono text-gray-700 font-bold text-center border-r border-gray-100">{row.rollNo || row.sn}</td>
                          <td className="px-2 py-2 font-mono font-extrabold text-blue-900 text-center bg-blue-50/40 border-r border-gray-100">
                            {row.symbolNo || generateSymbolNo(activeYear?.year, currentClassObj?.name, row.rollNo || row.sn)}
                          </td>
                          <td className="px-3 py-2 font-bold text-gray-900 border-r border-gray-100">{row.fullName}</td>

                          {row.subjects?.map((sub: any, i: number) => {
                            const thGrade = sub.theory?.letterGrade || '—';
                            const prGrade = sub.practical?.letterGrade || '—';
                            const subGrade = sub.finalGrade || (sub.compiled?.finalGrade || 'NG');
                            const subGP = sub.gradePoint !== undefined ? sub.gradePoint.toFixed(1) : (sub.compiled?.gradePoint?.toFixed(1) || '0.0');
                            const subIsNG = subGrade === 'NG';
                            return (
                              <React.Fragment key={i}>
                                <td className="px-1.5 py-2 text-center font-mono font-bold text-blue-900 border-r border-gray-100">
                                  {thGrade}
                                </td>
                                <td className="px-1.5 py-2 text-center font-mono font-bold text-purple-900 border-r border-gray-100">
                                  {prGrade}
                                </td>
                                <td className="px-1.5 py-2 text-center font-mono border-r border-gray-200 bg-amber-50/30">
                                  <span className={`font-black ${subIsNG ? 'text-rose-600' : 'text-[#1e3a5f]'}`}>
                                    {subGrade}
                                  </span>
                                  <span className="text-[10px] text-gray-400 ml-1">({subGP})</span>
                                </td>
                              </React.Fragment>
                            );
                          })}

                          <td className="px-3 py-2 text-center font-mono font-black text-sm bg-amber-50/60 text-[#1e3a5f] border-l border-gray-200">
                            {row.gpa !== undefined ? row.gpa.toFixed(2) : '0.00'}
                          </td>
                          <td className="px-3 py-2 text-center font-bold">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-black ${isNG ? 'bg-rose-100 text-rose-800' : 'bg-blue-100 text-blue-900'}`}>
                              {row.overallGrade || 'NG'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${!isNG ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                              {!isNG ? 'PASSED' : 'NON-GRADED'}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center no-print">
                            <button
                              onClick={() => handleViewMarksheet(row.studentInternalId || row.studentId)}
                              className="rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 hover:bg-blue-100"
                            >
                              Grade Sheet
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
            </>
          )}
        </div>
      )}

      {/* ─── ADD EXAM MODAL ────────────────────────────────────────────────── */}
      {isAddExamModalOpen && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <h2 className="text-sm font-bold text-[#1e3a5f]">Create Exam (नयाँ परीक्षा सिर्जना गर्नुहोस्)</h2>
                <p className="text-[11px] text-gray-500 font-nepali">परीक्षाको नाम, मिति, शिफ्ट, समय र सहभागी कक्षाहरू छनौट गर्नुहोस्</p>
              </div>
              <button onClick={() => setIsAddExamModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddExam} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Exam Name (English) *</label>
                  <input required name="name" type="text" placeholder="1st Terminal Examination" className="erp-input font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Exam Name (नेपाली)</label>
                  <input name="nameNepali" type="text" placeholder="प्रथम त्रैमासिक परीक्षा" className="erp-input font-nepali font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Start Date (BS) *</label>
                  <input required name="startDateBs" type="text" defaultValue={todayBS()} className="erp-input font-mono font-bold" />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">End Date (BS)</label>
                  <input name="endDateBs" type="text" placeholder="2081-06-15" className="erp-input font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Exam Shift (परीक्षा शिफ्ट) *</label>
                  <select
                    value={addExamShift}
                    onChange={(e) => setAddExamShift(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="DAY">☀️ Day Shift (दिवा सत्र)</option>
                    <option value="MORNING">🌅 Morning Shift (बिहानी सत्र)</option>
                    <option value="EVENING">🌙 Evening Shift (साँझ सत्र)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Exam Timing (परीक्षा समय) *</label>
                  <input
                    type="text"
                    value={addExamTiming}
                    onChange={(e) => setAddExamTiming(e.target.value)}
                    placeholder="11:00 AM - 02:00 PM"
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              {/* Participating Classes Checkboxes */}
              <div className="space-y-2 rounded-xl border border-gray-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Layers size={14} className="text-[#1e3a5f]" />
                    <span>Which Classes are Taking this Exam? (सहभागी कक्षाहरू):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (addExamClassIds.length === (classesData || []).length) {
                        setAddExamClassIds([]);
                      } else {
                        setAddExamClassIds((classesData || []).map((c: any) => c.id));
                      }
                    }}
                    className="text-[11px] font-bold text-[#1e3a5f] hover:underline"
                  >
                    {addExamClassIds.length === (classesData || []).length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pt-1">
                  {classesData?.map((c: any) => {
                    const isChecked = addExamClassIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-1.5 rounded-lg border p-1.5 cursor-pointer text-[11px] font-bold transition ${
                          isChecked
                            ? 'border-[#1e3a5f] bg-blue-50 text-[#1e3a5f]'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAddExamClassIds([...addExamClassIds, c.id]);
                            } else {
                              setAddExamClassIds(addExamClassIds.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded text-[#1e3a5f]"
                        />
                        <span className="truncate">{c.name} {c.section ? `(${c.section})` : ''}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddExamModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addExamMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                >
                  {addExamMutation.isPending ? 'Saving...' : 'Save & Schedule Exam'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── EDIT EXAM MODAL ───────────────────────────────────────────────── */}
      {isEditExamModalOpen && isAdmin && editingExam && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div>
                <h2 className="text-sm font-bold text-[#1e3a5f]">Edit Exam (परीक्षा सम्पादन गर्नुहोस्)</h2>
                <p className="text-[11px] text-gray-500 font-nepali">परीक्षाको विवरण, शिफ्ट, समय तथा कक्षाहरू परिमार्जन गर्नुहोस्</p>
              </div>
              <button onClick={() => setIsEditExamModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleUpdateExam} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Exam Name (English) *</label>
                  <input
                    required
                    name="name"
                    type="text"
                    defaultValue={editingExam.name}
                    className="erp-input font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Exam Name (नेपाली)</label>
                  <input
                    name="nameNepali"
                    type="text"
                    defaultValue={editingExam.nameNepali || ''}
                    className="erp-input font-nepali font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Start Date (BS) *</label>
                  <input
                    required
                    name="startDateBs"
                    type="text"
                    defaultValue={editingExam.startDateBs || todayBS()}
                    className="erp-input font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">End Date (BS)</label>
                  <input
                    name="endDateBs"
                    type="text"
                    defaultValue={editingExam.endDateBs || ''}
                    placeholder="2081-06-15"
                    className="erp-input font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Exam Shift (परीक्षा शिफ्ट) *</label>
                  <select
                    value={editExamShift}
                    onChange={(e) => setEditExamShift(e.target.value)}
                    className="erp-input font-bold"
                  >
                    <option value="DAY">☀️ Day Shift (दिवा सत्र)</option>
                    <option value="MORNING">🌅 Morning Shift (बिहानी सत्र)</option>
                    <option value="EVENING">🌙 Evening Shift (साँझ सत्र)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Exam Timing (परीक्षा समय) *</label>
                  <input
                    type="text"
                    value={editExamTiming}
                    onChange={(e) => setEditExamTiming(e.target.value)}
                    placeholder="11:00 AM - 02:00 PM"
                    className="erp-input font-mono font-bold"
                  />
                </div>
              </div>

              {/* Participating Classes Checkboxes */}
              <div className="space-y-2 rounded-xl border border-gray-200 bg-slate-50/70 p-3">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-gray-800 flex items-center gap-1.5">
                    <Layers size={14} className="text-[#1e3a5f]" />
                    <span>Which Classes are Taking this Exam? (सहभागी कक्षाहरू):</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (editExamClassIds.length === (classesData || []).length) {
                        setEditExamClassIds([]);
                      } else {
                        setEditExamClassIds((classesData || []).map((c: any) => c.id));
                      }
                    }}
                    className="text-[11px] font-bold text-[#1e3a5f] hover:underline"
                  >
                    {editExamClassIds.length === (classesData || []).length ? 'Deselect All' : 'Select All'}
                  </button>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-40 overflow-y-auto pt-1">
                  {classesData?.map((c: any) => {
                    const isChecked = editExamClassIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-1.5 rounded-lg border p-1.5 cursor-pointer text-[11px] font-bold transition ${
                          isChecked
                            ? 'border-[#1e3a5f] bg-blue-50 text-[#1e3a5f]'
                            : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setEditExamClassIds([...editExamClassIds, c.id]);
                            } else {
                              setEditExamClassIds(editExamClassIds.filter((id) => id !== c.id));
                            }
                          }}
                          className="rounded text-[#1e3a5f]"
                        />
                        <span className="truncate">{c.name} {c.section ? `(${c.section})` : ''}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditExamModalOpen(false)}
                  className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateExamMutation.isPending}
                  className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
                >
                  {updateExamMutation.isPending ? 'Saving Changes...' : 'Save Changes (सम्पादन सुरक्षित)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── OFFICIAL CDC GPA PROGRESS REPORT CARD / GRADE SHEET MODAL ─────── */}
      {selectedMarksheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between no-print border-b border-gray-100 pb-2">
              <div className="flex items-center gap-2">
                <Award className="text-[#1e3a5f]" size={20} />
                <span className="text-sm font-extrabold text-[#1e3a5f]">
                  Official CDC Grade Sheet / Progress Report (अक्षराङ्कन पद्धति लब्धाङ्क-पत्र)
                </span>
              </div>
              <button
                onClick={() => setSelectedMarksheet(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* ─── PRINTABLE GRADE SHEET PAPER (A4 FORMAT) ─────────────────── */}
            <div className="printable-document p-8 border-4 border-double border-[#1e3a5f] rounded-2xl space-y-5 bg-white text-gray-900 shadow-sm print:p-0 print:border-2 print:shadow-none print:rounded-none">
              {/* Header */}
              <div className="text-center space-y-1 border-b-2 border-[#1e3a5f] pb-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center shadow-xs border-2 border-amber-400 bg-white p-1">
                    {selectedMarksheet.school?.logoUrl ? (
                      <img src={selectedMarksheet.school.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                    ) : (
                      <svg viewBox="0 0 100 100" className="h-full w-full text-[#1e3a5f]">
                        <circle cx="50" cy="50" r="46" stroke="#1e3a5f" strokeWidth="3" fill="#f0f7ff" />
                        <circle cx="50" cy="50" r="36" stroke="#b91c1c" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
                        <polygon points="50,16 59,36 81,36 63,49 70,71 50,57 30,71 37,49 19,36 41,36" fill="#f59e0b" />
                        <text x="50" y="55" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e3a5f">नेपाल</text>
                      </svg>
                    )}
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-[#1e3a5f] tracking-wide uppercase font-serif">
                      {selectedMarksheet.school?.name || 'NEPAL MODEL SECONDARY SCHOOL'}
                    </h2>
                    {selectedMarksheet.school?.nameNepali && (
                      <p className="text-sm font-bold text-gray-700 font-nepali">
                        {selectedMarksheet.school.nameNepali}
                      </p>
                    )}
                    <p className="text-xs text-gray-600 font-medium">
                      {selectedMarksheet.school?.address || 'काठमाडौँ'}, {selectedMarksheet.school?.district || 'काठमाडौँ'}, {selectedMarksheet.school?.province || 'बागमती प्रदेश'}, नेपाल
                    </p>
                    <p className="text-[11px] text-gray-500 font-mono">
                      EMIS Code: <strong>{selectedMarksheet.school?.emisCode || '320160005'}</strong> • Estd: {selectedMarksheet.school?.estYear || '2025'} BS
                    </p>
                  </div>
                </div>

                <div className="pt-2">
                  <span className="inline-block bg-[#1e3a5f] text-amber-300 text-xs font-black uppercase px-6 py-1 rounded-full shadow-xs tracking-wider">
                    GRADE-SHEET / PROGRESS REPORT CARD (लब्धाङ्क पत्र)
                  </span>
                </div>
                <p className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wide pt-1">
                  {selectedMarksheet.exam?.name} ({selectedMarksheet.exam?.nameNepali || 'त्रैमासिक परीक्षा'}) - {selectedMarksheet.exam?.academicYear?.year || '2083'} BS
                </p>
              </div>

              {/* Student Details Grid */}
              <div className="rounded-xl border border-[#1e3a5f]/30 bg-slate-50/60 p-4 text-xs">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2.5 gap-x-4">
                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Student Name (नाम):</span>
                    <strong className="text-gray-950 font-bold text-sm">{selectedMarksheet.student?.fullName}</strong>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Symbol No (सिम्बोल नं):</span>
                    <strong className="font-mono text-[#1e3a5f] font-black text-sm bg-amber-100/80 px-2 py-0.5 rounded">
                      {selectedMarksheet.student?.symbolNo || selectedMarksheet.symbolNo}
                    </strong>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Class & Section (कक्षा):</span>
                    <strong className="text-gray-900 font-bold">
                      {selectedMarksheet.student?.className || 'Class 10'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Roll No (रोल नं):</span>
                    <strong className="text-gray-900 font-mono font-bold text-sm">
                      {selectedMarksheet.student?.rollNo || 1}
                    </strong>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Date of Birth (जन्म मिति):</span>
                    <span className="font-mono font-bold text-gray-800">
                      {selectedMarksheet.student?.dateOfBirthBs || '2068-05-12 BS'}
                    </span>
                  </div>

                  <div>
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Academic Year (शैक्षिक सत्र):</span>
                    <span className="font-mono font-bold text-gray-800">
                      {selectedMarksheet.exam?.academicYear?.year || '2083'} BS
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-gray-500 font-semibold block text-[10px] uppercase">Student EMIS ID:</span>
                    <span className="font-mono font-bold text-gray-700 text-[11px]">
                      {selectedMarksheet.student?.studentId}
                    </span>
                  </div>
                </div>
              </div>

              {/* Official CDC Letter Grading Table */}
              <div className="overflow-x-auto rounded-xl border border-gray-300">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#1e3a5f] text-white text-[11px]">
                    <tr>
                      <th className="border border-slate-700 px-2.5 py-2 text-center w-10" rowSpan={2}>S.N.</th>
                      <th className="border border-slate-700 px-2.5 py-2 w-16" rowSpan={2}>Code</th>
                      <th className="border border-slate-700 px-3 py-2" rowSpan={2}>Subject (विषय)</th>
                      <th className="border border-slate-700 px-2 py-2 text-center w-12" rowSpan={2}>Credit Hour</th>
                      <th className="border border-slate-700 px-2 py-1 text-center" colSpan={3}>THEORY (TH)</th>
                      <th className="border border-slate-700 px-2 py-1 text-center" colSpan={3}>INTERNAL / PR</th>
                      <th className="border border-slate-700 px-2 py-1 text-center bg-[#162c46]" colSpan={2}>FINAL GRADE</th>
                      <th className="border border-slate-700 px-2.5 py-2 text-center" rowSpan={2}>Remarks</th>
                    </tr>
                    <tr>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Full</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Obt</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Grade</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Full</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Obt</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Grade</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px] bg-[#162c46] text-amber-300 font-bold">Grade</th>
                      <th className="border border-slate-700 px-2 py-1 text-center text-[10px] bg-[#162c46] text-amber-300 font-bold">GP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {selectedMarksheet.subjectResults?.map((sr: any, idx: number) => {
                      const isNG = sr.finalGrade === 'NG';
                      return (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-500">{idx + 1}</td>
                          <td className="border border-gray-200 px-2 py-2 font-mono text-gray-600">{sr.subjectCode || 'SUB'}</td>
                          <td className="border border-gray-200 px-3 py-2 font-bold text-gray-900">
                            <div>{sr.subject}</div>
                            {sr.subjectNepali && <div className="text-[10px] font-nepali text-gray-500 font-normal">{sr.subjectNepali}</div>}
                          </td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold text-gray-700">{sr.creditHour || '4.0'}</td>
                          
                          {/* Theory */}
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-600">{sr.theory?.fullMark || '—'}</td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold">{sr.theory?.obtained !== null ? sr.theory.obtained : '—'}</td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold text-blue-900">{sr.theory?.letterGrade || '—'}</td>
                          
                          {/* Practical */}
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-600">{sr.practical?.fullMark || '—'}</td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold">{sr.practical?.obtained !== null ? sr.practical.obtained : '—'}</td>
                          <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold text-purple-900">{sr.practical?.letterGrade || '—'}</td>

                          {/* Final Grade */}
                          <td className={`border border-gray-200 px-2 py-2 text-center font-black font-mono text-sm ${isNG ? 'text-rose-600 bg-rose-50' : 'text-[#1e3a5f] bg-blue-50/50'}`}>
                            {sr.finalGrade || 'A'}
                          </td>
                          <td className={`border border-gray-200 px-2 py-2 text-center font-mono font-black ${isNG ? 'text-rose-600' : 'text-gray-900'}`}>
                            {sr.gradePoint !== undefined ? sr.gradePoint.toFixed(1) : '3.6'}
                          </td>
                          <td className={`border border-gray-200 px-2 py-2 text-center font-semibold text-[11px] ${isNG ? 'text-rose-600 font-bold' : 'text-emerald-700'}`}>
                            {isNG ? 'Needs Imp.' : (sr.remarks?.split(' ')[0] || 'Good')}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Grand Performance & GPA Summary Box */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* GPA Badge */}
                <div className="rounded-xl border-2 border-[#1e3a5f] bg-gradient-to-br from-[#1e3a5f] to-[#2a5280] p-4 text-white text-center flex flex-col items-center justify-center shadow-xs">
                  <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-300">
                    Grade Point Average (GPA)
                  </span>
                  <div className="text-3xl font-black font-mono text-white mt-0.5">
                    {selectedMarksheet.gpa !== undefined ? selectedMarksheet.gpa.toFixed(2) : '3.60'}
                    <span className="text-xs font-normal text-amber-200"> / 4.00</span>
                  </div>
                  <span className="mt-1 inline-block rounded-full bg-amber-400 text-[#1e3a5f] px-3 py-0.5 text-[11px] font-black uppercase shadow-xs">
                    Grade: {selectedMarksheet.overallGrade || 'A'}
                  </span>
                </div>

                {/* Score & Percentage */}
                <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 space-y-1.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">Total Marks (कुल प्राप्ताङ्क):</span>
                    <strong className="font-mono font-bold text-gray-900 text-sm">
                      {selectedMarksheet.grandTotal} / {selectedMarksheet.grandFull}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600 font-semibold">Percentage (प्रतिशत):</span>
                    <strong className="font-mono font-extrabold text-[#1e3a5f] text-sm">
                      {selectedMarksheet.percentage}%
                    </strong>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                    <span className="text-gray-600 font-semibold">Overall Remarks:</span>
                    <strong className="text-emerald-700 font-bold">
                      {selectedMarksheet.overallRemarks || 'Excellent (उत्कृष्ट)'}
                    </strong>
                  </div>
                </div>

                {/* Result Status */}
                <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 flex flex-col justify-center text-center space-y-1 text-xs">
                  <span className="text-gray-500 font-bold uppercase text-[10px]">Academic Evaluation Result</span>
                  <div className="text-base font-black text-emerald-700 uppercase tracking-wide">
                    ✓ PROMOTED / PASSED (उत्तीर्ण)
                  </div>
                  <p className="text-[10px] text-gray-500 font-nepali">
                    अक्षराङ्कन निर्देशिका २०७८ बमोजिम श्रेणीकृत
                  </p>
                </div>
              </div>

              {/* Official Nepal CDC Grading System Scale Reference */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] uppercase font-bold text-gray-600 flex items-center gap-1">
                  <Sparkles size={12} className="text-amber-500" />
                  <span>Curriculum Development Center (CDC) Letter Grading Scale (अक्षराङ्कन पद्धति वर्गीकरण):</span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-center text-[10px] font-sans">
                    <thead className="bg-slate-100 text-gray-700 font-bold">
                      <tr>
                        <th className="p-1 border-r border-gray-200">Score Range %</th>
                        <th className="p-1 border-r border-gray-200">90% & above</th>
                        <th className="p-1 border-r border-gray-200">80% - &lt;90%</th>
                        <th className="p-1 border-r border-gray-200">70% - &lt;80%</th>
                        <th className="p-1 border-r border-gray-200">60% - &lt;70%</th>
                        <th className="p-1 border-r border-gray-200">50% - &lt;60%</th>
                        <th className="p-1 border-r border-gray-200">40% - &lt;50%</th>
                        <th className="p-1 border-r border-gray-200">35% - &lt;40%</th>
                        <th className="p-1">Below 35%</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      <tr>
                        <td className="p-1 font-bold bg-slate-50 border-r border-gray-200">Letter Grade</td>
                        <td className="p-1 font-black text-emerald-700 border-r border-gray-200">A+</td>
                        <td className="p-1 font-black text-emerald-600 border-r border-gray-200">A</td>
                        <td className="p-1 font-black text-blue-600 border-r border-gray-200">B+</td>
                        <td className="p-1 font-black text-blue-500 border-r border-gray-200">B</td>
                        <td className="p-1 font-black text-amber-600 border-r border-gray-200">C+</td>
                        <td className="p-1 font-black text-amber-500 border-r border-gray-200">C</td>
                        <td className="p-1 font-black text-orange-600 border-r border-gray-200">D</td>
                        <td className="p-1 font-black text-rose-600">NG</td>
                      </tr>
                      <tr>
                        <td className="p-1 font-bold bg-slate-50 border-r border-gray-200">Grade Point (GP)</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">4.0</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">3.6</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">3.2</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">2.8</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">2.4</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">2.0</td>
                        <td className="p-1 font-mono font-bold border-r border-gray-200">1.6</td>
                        <td className="p-1 font-mono font-bold text-rose-600">0.0</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures & Seal Block */}
              <div className="grid grid-cols-4 pt-8 text-center text-xs text-gray-800 items-end">
                <div>
                  <p className="font-mono text-gray-600 mb-6 text-[11px]">
                    Date: <strong>{todayBS()} BS</strong>
                  </p>
                  <div className="border-t border-gray-600 mx-2 pt-1 font-bold">
                    Class Teacher (कक्षा शिक्षक)
                  </div>
                </div>

                <div>
                  <div className="border-t border-gray-600 mx-2 pt-1 font-bold mt-10">
                    Exam Controller (परीक्षा प्रमुख)
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="relative h-24 w-24 rounded-full border-4 border-double border-[#1e3a5f] flex flex-col items-center justify-center text-center p-1 bg-white/80 shadow-xs transform -rotate-3 transition hover:rotate-0">
                    <div className="absolute inset-1 rounded-full border border-dashed border-[#1e3a5f]/60 pointer-events-none" />
                    
                    <div className="h-7 w-7 mb-0.5 opacity-90 flex items-center justify-center">
                      {selectedMarksheet.school?.logoUrl ? (
                        <img src={selectedMarksheet.school.logoUrl} alt="Seal Logo" className="h-full w-full object-contain" />
                      ) : (
                        <svg viewBox="0 0 100 100" className="h-full w-full text-[#1e3a5f]">
                          <polygon points="50,15 61,38 86,38 66,54 74,78 50,62 26,78 34,54 14,38 39,38" fill="#1e3a5f" />
                        </svg>
                      )}
                    </div>

                    <div className="text-[7.5px] font-black uppercase text-[#1e3a5f] leading-none tracking-tight">
                      {selectedMarksheet.school?.nameNepali || 'नेपाल मा.वि.'}
                    </div>
                    <div className="text-[6.5px] font-bold text-amber-700 tracking-wider">
                      स्था: {selectedMarksheet.school?.estYear || '२०२५'}
                    </div>
                    <div className="text-[6px] font-extrabold uppercase bg-[#1e3a5f] text-white px-1.5 py-0.5 rounded-full mt-0.5">
                      ★ OFFICIAL SEAL ★
                    </div>
                  </div>
                  <span className="text-[10px] text-gray-700 font-bold mt-1">School Seal (विद्यालयको छाप)</span>
                </div>

                <div>
                  <div className="border-t border-gray-600 mx-2 pt-1 font-bold mt-10">
                    Head Teacher / Principal (प्र.अ.)
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 no-print pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedMarksheet(null)}
                className="rounded-xl border border-gray-200 px-5 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
              >
                Close (बन्द गर्नुहोस्)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-6 py-2 text-xs font-bold text-white shadow-sm transition"
              >
                <Printer size={15} />
                <span>Print Official Grade Sheet (प्रिन्ट गर्नुहोस्)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── CONFIGURE MARK BREAKDOWN MODAL ─────────────────────────────────── */}
      {isBreakdownModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-[#1e3a5f] flex items-center gap-1.5">
                  <Sliders size={16} />
                  <span>Configure Mark Breakdown Scheme (अङ्क विभाजन ढाँचा)</span>
                </h2>
                <p className="text-[11px] text-gray-500 font-nepali mt-0.5">
                  यस विषयको पूर्णाङ्कलाई विभिन्न खण्डमा विभाजन गर्नुहोस् वा पूर्वतयारी ढाँचा छनौट गर्नुहोस्
                </p>
              </div>
              <button onClick={() => setIsBreakdownModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>

            {/* Quick Presets Bar */}
            <div className="rounded-xl border border-purple-200/80 bg-purple-50/50 p-3 space-y-2">
              <label className="text-[11px] font-bold text-purple-950 flex items-center gap-1">
                <Sparkles size={13} className="text-amber-500" />
                <span>Quick Preset Evaluation Templates (तयारी मूल्याङ्कन ढाँचाहरू):</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TEMPLATES.map((tmpl, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setBreakdownParts(tmpl.parts.map((p) => ({ ...p })))}
                    className="rounded-lg border border-purple-200 bg-white px-2.5 py-1 text-[11px] font-bold text-purple-900 hover:bg-purple-100 hover:border-purple-300 transition shadow-2xs"
                  >
                    {tmpl.nepali}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              {breakdownParts.map((part, index) => {
                const isConverted = part.rawFullMark && parseFloat(part.rawFullMark as string) !== parseFloat(part.fullMark as string);

                return (
                  <div key={index} className="rounded-xl border border-gray-200 bg-slate-50/70 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-800">Part {index + 1} (खण्ड {index + 1})</span>
                      {breakdownParts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setBreakdownParts(breakdownParts.filter((_, i) => i !== index));
                          }}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-12 gap-2 text-xs">
                      <div className="col-span-6">
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Part / Title Name *</label>
                        <input
                          type="text"
                          value={part.title}
                          onChange={(e) => {
                            const copy = [...breakdownParts];
                            copy[index].title = e.target.value;
                            setBreakdownParts(copy);
                          }}
                          placeholder="e.g. Theory, Practical, Project"
                          className="erp-input font-bold"
                          required
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Converted Full (पूर्णाङ्क) *</label>
                        <input
                          type="number"
                          min={1}
                          step="any"
                          value={part.fullMark}
                          onChange={(e) => {
                            const copy = [...breakdownParts];
                            copy[index].fullMark = e.target.value;
                            setBreakdownParts(copy);
                          }}
                          placeholder="25"
                          className="erp-input font-mono font-bold"
                          required
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-[10px] font-bold text-gray-600 mb-1">Pass Mark %</label>
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={part.passMarkPct}
                          onChange={(e) => {
                            const copy = [...breakdownParts];
                            copy[index].passMarkPct = e.target.value;
                            setBreakdownParts(copy);
                          }}
                          placeholder="40"
                          className="erp-input font-mono"
                        />
                      </div>

                      {/* Raw Full Marks Option */}
                      <div className="col-span-12 pt-1 flex items-center justify-between text-[11px] bg-white rounded-lg border border-slate-200/80 px-2.5 py-1.5">
                        <span className="text-gray-600 font-semibold">Raw Exam Full Mark (मूल परीक्षा पूर्णाङ्क):</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min={1}
                            step="any"
                            value={part.rawFullMark ?? part.fullMark}
                            onChange={(e) => {
                              const copy = [...breakdownParts];
                              copy[index].rawFullMark = e.target.value;
                              setBreakdownParts(copy);
                            }}
                            className="erp-input w-20 py-1 text-center font-mono font-bold"
                          />
                          {isConverted && (
                            <span className="text-purple-700 font-bold text-[10px]">
                              → Converted to {part.fullMark} M
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setBreakdownParts([
                    ...breakdownParts,
                    { title: `Part ${breakdownParts.length + 1}`, fullMark: 10, rawFullMark: 10, passMarkPct: 40 },
                  ]);
                }}
                className="w-full rounded-xl border border-dashed border-purple-300 bg-purple-50/50 py-2.5 text-xs font-bold text-purple-800 hover:bg-purple-100 transition flex items-center justify-center gap-1.5"
              >
                <Plus size={14} />
                <span>+ Add Another Evaluation Part (थप खण्ड थप्नुहोस्)</span>
              </button>

              {/* Total Sum Preview */}
              <div className="rounded-xl bg-gradient-to-r from-[#1e3a5f] to-[#2a5280] p-3 text-white flex items-center justify-between text-xs font-bold">
                <span>Total Converted / Full Marks (जम्मा पूर्णाङ्क):</span>
                <span className="text-base font-mono text-amber-300">
                  {breakdownParts.reduce((sum, p) => sum + (parseFloat(p.fullMark as string) || 0), 0)} Marks
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-3">
              <button
                type="button"
                onClick={() => setIsBreakdownModalOpen(false)}
                className="rounded-xl border border-gray-200 px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => configureBreakdownMutation.mutate(breakdownParts)}
                disabled={configureBreakdownMutation.isPending || breakdownParts.length === 0}
                className="rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-50"
              >
                {configureBreakdownMutation.isPending ? 'Saving...' : 'Save Mark Breakdown (ढाँचा सुरक्षित गर्नुहोस्)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── BULK GRADE SHEET PRINT MODAL ───────────────────────────────────── */}
      {isBulkPrintModalOpen && bulkMarksheetsData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-5xl rounded-2xl bg-white p-6 shadow-2xl space-y-4 my-6 max-h-[94vh] overflow-y-auto">
            {/* Header (No Print) */}
            <div className="flex flex-wrap items-center justify-between no-print border-b border-gray-200 pb-3 gap-3">
              <div>
                <h2 className="text-base font-extrabold text-[#1e3a5f] flex items-center gap-2">
                  <FileText className="text-amber-500" size={20} />
                  <span>Bulk Print All Grade Sheets (सम्पूर्ण कक्षाको ग्रेडसिट एकमुष्ट प्रिन्ट)</span>
                </h2>
                <p className="text-xs text-gray-500 font-nepali">
                  कक्षा: <strong>{bulkMarksheetsData.className}</strong> • परीक्षा: <strong>{bulkMarksheetsData.exam?.name}</strong> • जम्मा विद्यार्थी: <strong>{bulkMarksheetsData.students?.length || 0}</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const allIds = bulkMarksheetsData.students?.map((s: any) => s.student?.id) || [];
                    if (selectedStudentIdsForPrint.length === allIds.length) {
                      setSelectedStudentIdsForPrint([]);
                    } else {
                      setSelectedStudentIdsForPrint(allIds);
                    }
                  }}
                  className="rounded-xl border border-gray-300 px-3 py-1.5 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
                >
                  {selectedStudentIdsForPrint.length === (bulkMarksheetsData.students?.length || 0)
                    ? 'Deselect All (सबै हटाउनुहोस्)'
                    : 'Select All (सबै छनौट गर्नुहोस्)'}
                </button>

                <button
                  type="button"
                  onClick={() => setIsBulkPrintModalOpen(false)}
                  className="rounded-xl border border-gray-300 px-4 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  Close (बन्द)
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  disabled={selectedStudentIdsForPrint.length === 0}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#1e3a5f] hover:bg-[#2a5280] px-5 py-1.5 text-xs font-bold text-white shadow-sm transition disabled:opacity-50"
                >
                  <Printer size={15} />
                  <span>Print {selectedStudentIdsForPrint.length} Grade Sheets (प्रिन्ट गर्नुहोस्)</span>
                </button>
              </div>
            </div>

            {/* Quick Student Selection Bar (No Print) */}
            <div className="no-print rounded-xl bg-slate-50 border border-gray-200 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-700">
                  Select Students to Print ({selectedStudentIdsForPrint.length} of {bulkMarksheetsData.students?.length || 0} selected):
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {bulkMarksheetsData.students?.map((s: any) => {
                  const isChecked = selectedStudentIdsForPrint.includes(s.student?.id);
                  return (
                    <label
                      key={s.student?.id}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[11px] font-bold cursor-pointer transition ${
                        isChecked
                          ? 'bg-blue-50 border-[#1e3a5f] text-[#1e3a5f]'
                          : 'bg-white border-gray-200 text-gray-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStudentIdsForPrint([...selectedStudentIdsForPrint, s.student?.id]);
                          } else {
                            setSelectedStudentIdsForPrint(selectedStudentIdsForPrint.filter(id => id !== s.student?.id));
                          }
                        }}
                        className="rounded text-[#1e3a5f]"
                      />
                      <span>Roll {s.student?.rollNo}: {s.student?.fullName}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Printable Container with CSS Page Break */}
            <div className="space-y-8 print:space-y-0">
              {bulkMarksheetsData.students
                ?.filter((s: any) => selectedStudentIdsForPrint.includes(s.student?.id))
                .map((sheet: any, sIdx: number) => (
                  <div
                    key={sheet.student?.id || sIdx}
                    className="printable-document p-8 border-4 border-double border-[#1e3a5f] rounded-2xl space-y-5 bg-white text-gray-900 shadow-sm print:p-0 print:border-2 print:shadow-none print:rounded-none print:break-after-page print:page-break-after-always print:min-h-screen"
                    style={{ pageBreakAfter: 'always', breakAfter: 'page' }}
                  >
                    {/* Header */}
                    <div className="text-center space-y-1 border-b-2 border-[#1e3a5f] pb-4">
                      <div className="flex items-center justify-center gap-3">
                        <div className="h-16 w-16 rounded-full overflow-hidden flex items-center justify-center shadow-xs border-2 border-amber-400 bg-white p-1">
                          {bulkMarksheetsData.school?.logoUrl ? (
                            <img src={bulkMarksheetsData.school.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                          ) : (
                            <svg viewBox="0 0 100 100" className="h-full w-full text-[#1e3a5f]">
                              <circle cx="50" cy="50" r="46" stroke="#1e3a5f" strokeWidth="3" fill="#f0f7ff" />
                              <circle cx="50" cy="50" r="36" stroke="#b91c1c" strokeWidth="1.5" fill="none" strokeDasharray="3 2" />
                              <polygon points="50,16 59,36 81,36 63,49 70,71 50,57 30,71 37,49 19,36 41,36" fill="#f59e0b" />
                              <text x="50" y="55" textAnchor="middle" fontSize="10" fontWeight="bold" fill="#1e3a5f">नेपाल</text>
                            </svg>
                          )}
                        </div>
                        <div>
                          <h2 className="text-xl md:text-2xl font-black text-[#1e3a5f] tracking-wide uppercase font-serif">
                            {bulkMarksheetsData.school?.name || 'NEPAL MODEL SECONDARY SCHOOL'}
                          </h2>
                          {bulkMarksheetsData.school?.nameNepali && (
                            <p className="text-sm font-bold text-gray-700 font-nepali">
                              {bulkMarksheetsData.school.nameNepali}
                            </p>
                          )}
                          <p className="text-xs text-gray-600 font-medium">
                            {bulkMarksheetsData.school?.address || 'काठमाडौँ'}, {bulkMarksheetsData.school?.district || 'काठमाडौँ'}, {bulkMarksheetsData.school?.province || 'बागमती प्रदेश'}, नेपाल
                          </p>
                          <p className="text-[11px] text-gray-500 font-mono">
                            EMIS Code: <strong>{bulkMarksheetsData.school?.emisCode || '320160005'}</strong> • Estd: {bulkMarksheetsData.school?.estYear || '2025'} BS
                          </p>
                        </div>
                      </div>

                      <div className="pt-2">
                        <span className="inline-block bg-[#1e3a5f] text-amber-300 text-xs font-black uppercase px-6 py-1 rounded-full shadow-xs tracking-wider">
                          GRADE-SHEET / PROGRESS REPORT CARD (लब्धाङ्क पत्र)
                        </span>
                      </div>
                      <p className="text-xs font-extrabold text-[#1e3a5f] uppercase tracking-wide pt-1">
                        {bulkMarksheetsData.exam?.name} ({bulkMarksheetsData.exam?.nameNepali || 'त्रैमासिक परीक्षा'}) - {bulkMarksheetsData.exam?.academicYear?.year || '2083'} BS
                      </p>
                    </div>

                    {/* Student Details Grid */}
                    <div className="rounded-xl border border-[#1e3a5f]/30 bg-slate-50/60 p-4 text-xs">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2.5 gap-x-4">
                        <div>
                          <span className="text-gray-500 font-semibold block text-[10px] uppercase">Student Name (नाम):</span>
                          <strong className="text-gray-950 font-bold text-sm">{sheet.student?.fullName}</strong>
                        </div>

                        <div>
                          <span className="text-gray-500 font-semibold block text-[10px] uppercase">Symbol No (सिम्बोल नं):</span>
                          <strong className="font-mono text-[#1e3a5f] font-black text-sm bg-amber-100/80 px-2 py-0.5 rounded">
                            {sheet.student?.symbolNo || sheet.symbolNo}
                          </strong>
                        </div>

                        <div>
                          <span className="text-gray-500 font-semibold block text-[10px] uppercase">Class & Section (कक्षा):</span>
                          <strong className="text-gray-900 font-bold">
                            {sheet.student?.className || bulkMarksheetsData.className || 'Class 10'}
                          </strong>
                        </div>

                        <div>
                          <span className="text-gray-500 font-semibold block text-[10px] uppercase">Roll No (रोल नं):</span>
                          <strong className="text-gray-900 font-mono font-bold text-sm">
                            {sheet.student?.rollNo || 1}
                          </strong>
                        </div>

                        <div>
                          <span className="text-gray-500 font-semibold block text-[10px] uppercase">Date of Birth (जन्म मिति):</span>
                          <span className="font-mono font-bold text-gray-800">
                            {sheet.student?.dateOfBirthBs || '2068-05-12 BS'}
                          </span>
                        </div>

                        <div>
                          <span className="text-gray-500 font-semibold block text-[10px] uppercase">Academic Year (शैक्षिक सत्र):</span>
                          <span className="font-mono font-bold text-gray-800">
                            {bulkMarksheetsData.exam?.academicYear?.year || '2083'} BS
                          </span>
                        </div>

                        <div className="col-span-2">
                          <span className="text-gray-500 font-semibold block text-[10px] uppercase">Student EMIS ID:</span>
                          <span className="font-mono font-bold text-gray-700 text-[11px]">
                            {sheet.student?.studentId}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Official CDC Letter Grading Table */}
                    <div className="overflow-x-auto rounded-xl border border-gray-300">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-[#1e3a5f] text-white text-[11px]">
                          <tr>
                            <th className="border border-slate-700 px-2.5 py-2 text-center w-10" rowSpan={2}>S.N.</th>
                            <th className="border border-slate-700 px-2.5 py-2 w-16" rowSpan={2}>Code</th>
                            <th className="border border-slate-700 px-3 py-2" rowSpan={2}>Subject (विषय)</th>
                            <th className="border border-slate-700 px-2 py-2 text-center w-12" rowSpan={2}>Credit Hour</th>
                            <th className="border border-slate-700 px-2 py-1 text-center" colSpan={3}>THEORY (TH)</th>
                            <th className="border border-slate-700 px-2 py-1 text-center" colSpan={3}>INTERNAL / PR</th>
                            <th className="border border-slate-700 px-2 py-1 text-center bg-[#162c46]" colSpan={2}>FINAL GRADE</th>
                            <th className="border border-slate-700 px-2.5 py-2 text-center" rowSpan={2}>Remarks</th>
                          </tr>
                          <tr>
                            <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Full</th>
                            <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Obt</th>
                            <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Grade</th>
                            <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Full</th>
                            <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Obt</th>
                            <th className="border border-slate-700 px-2 py-1 text-center text-[10px]">Grade</th>
                            <th className="border border-slate-700 px-2 py-1 text-center text-[10px] bg-[#162c46] text-amber-300 font-bold">Grade</th>
                            <th className="border border-slate-700 px-2 py-1 text-center text-[10px] bg-[#162c46] text-amber-300 font-bold">GP</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {sheet.subjectResults?.map((sr: any, idx: number) => {
                            const isNG = sr.finalGrade === 'NG';
                            return (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-500">{idx + 1}</td>
                                <td className="border border-gray-200 px-2 py-2 font-mono text-gray-600">{sr.subjectCode || 'SUB'}</td>
                                <td className="border border-gray-200 px-3 py-2 font-bold text-gray-900">
                                  <div>{sr.subject}</div>
                                  {sr.subjectNepali && <div className="text-[10px] font-nepali text-gray-500 font-normal">{sr.subjectNepali}</div>}
                                </td>
                                <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold text-gray-700">{sr.creditHour || '4.0'}</td>
                                
                                {/* Theory */}
                                <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-600">{sr.theory?.fullMark || '—'}</td>
                                <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold">{sr.theory?.obtained !== null ? sr.theory.obtained : '—'}</td>
                                <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold text-blue-900">{sr.theory?.letterGrade || '—'}</td>
                                
                                {/* Practical */}
                                <td className="border border-gray-200 px-2 py-2 text-center font-mono text-gray-600">{sr.practical?.fullMark || '—'}</td>
                                <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold">{sr.practical?.obtained !== null ? sr.practical.obtained : '—'}</td>
                                <td className="border border-gray-200 px-2 py-2 text-center font-mono font-bold text-purple-900">{sr.practical?.letterGrade || '—'}</td>

                                {/* Final Grade */}
                                <td className={`border border-gray-200 px-2 py-2 text-center font-black font-mono text-sm ${isNG ? 'text-rose-600 bg-rose-50' : 'text-[#1e3a5f] bg-blue-50/50'}`}>
                                  {sr.finalGrade || 'A'}
                                </td>
                                <td className={`border border-gray-200 px-2 py-2 text-center font-mono font-black ${isNG ? 'text-rose-600' : 'text-gray-900'}`}>
                                  {sr.gradePoint !== undefined ? sr.gradePoint.toFixed(1) : '3.6'}
                                </td>
                                <td className={`border border-gray-200 px-2 py-2 text-center font-semibold text-[11px] ${isNG ? 'text-rose-600 font-bold' : 'text-emerald-700'}`}>
                                  {isNG ? 'Needs Imp.' : (sr.remarks?.split(' ')[0] || 'Good')}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Grand Performance & GPA Summary Box */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* GPA Badge */}
                      <div className="rounded-xl border-2 border-[#1e3a5f] bg-gradient-to-br from-[#1e3a5f] to-[#2a5280] p-4 text-white text-center flex flex-col items-center justify-center shadow-xs">
                        <span className="text-[10px] uppercase font-extrabold tracking-wider text-amber-300">
                          Grade Point Average (GPA)
                        </span>
                        <div className="text-3xl font-black font-mono text-white mt-0.5">
                          {sheet.gpa !== undefined ? sheet.gpa.toFixed(2) : '3.60'}
                          <span className="text-xs font-normal text-amber-200"> / 4.00</span>
                        </div>
                        <span className="mt-1 inline-block rounded-full bg-amber-400 text-[#1e3a5f] px-3 py-0.5 text-[11px] font-black uppercase shadow-xs">
                          Grade: {sheet.overallGrade || 'A'}
                        </span>
                      </div>

                      {/* Score & Percentage */}
                      <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 space-y-1.5 text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 font-semibold">Total Marks (कुल प्राप्ताङ्क):</span>
                          <strong className="font-mono font-bold text-gray-900 text-sm">
                            {sheet.grandTotal} / {sheet.grandFull}
                          </strong>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600 font-semibold">Percentage (प्रतिशत):</span>
                          <strong className="font-mono font-extrabold text-[#1e3a5f] text-sm">
                            {sheet.percentage}%
                          </strong>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-gray-200">
                          <span className="text-gray-600 font-semibold">Overall Remarks:</span>
                          <strong className="text-emerald-700 font-bold">
                            {sheet.overallRemarks || 'Excellent (उत्कृष्ट)'}
                          </strong>
                        </div>
                      </div>

                      {/* Result Status */}
                      <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 flex flex-col justify-center text-center space-y-1 text-xs">
                        <span className="text-gray-500 font-bold uppercase text-[10px]">Academic Evaluation Result</span>
                        <div className="text-base font-black text-emerald-700 uppercase tracking-wide">
                          ✓ PROMOTED / PASSED (उत्तीर्ण)
                        </div>
                        <p className="text-[10px] text-gray-500 font-nepali">
                          अक्षराङ्कन निर्देशिका २०७८ बमोजिम श्रेणीकृत
                        </p>
                      </div>
                    </div>

                    {/* Official Nepal CDC Grading System Scale Reference */}
                    <div className="space-y-1.5 pt-1">
                      <div className="text-[10px] uppercase font-bold text-gray-600 flex items-center gap-1">
                        <Sparkles size={12} className="text-amber-500" />
                        <span>Curriculum Development Center (CDC) Letter Grading Scale (अक्षराङ्कन पद्धति वर्गीकरण):</span>
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="w-full text-center text-[10px] font-sans">
                          <thead className="bg-slate-100 text-gray-700 font-bold">
                            <tr>
                              <th className="p-1 border-r border-gray-200">Score Range %</th>
                              <th className="p-1 border-r border-gray-200">90% & above</th>
                              <th className="p-1 border-r border-gray-200">80% - &lt;90%</th>
                              <th className="p-1 border-r border-gray-200">70% - &lt;80%</th>
                              <th className="p-1 border-r border-gray-200">60% - &lt;70%</th>
                              <th className="p-1 border-r border-gray-200">50% - &lt;60%</th>
                              <th className="p-1 border-r border-gray-200">40% - &lt;50%</th>
                              <th className="p-1 border-r border-gray-200">35% - &lt;40%</th>
                              <th className="p-1">Below 35%</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            <tr>
                              <td className="p-1 font-bold bg-slate-50 border-r border-gray-200">Letter Grade</td>
                              <td className="p-1 font-black text-emerald-700 border-r border-gray-200">A+</td>
                              <td className="p-1 font-black text-emerald-600 border-r border-gray-200">A</td>
                              <td className="p-1 font-black text-blue-600 border-r border-gray-200">B+</td>
                              <td className="p-1 font-black text-blue-500 border-r border-gray-200">B</td>
                              <td className="p-1 font-black text-amber-600 border-r border-gray-200">C+</td>
                              <td className="p-1 font-black text-amber-500 border-r border-gray-200">C</td>
                              <td className="p-1 font-black text-orange-600 border-r border-gray-200">D</td>
                              <td className="p-1 font-black text-rose-600">NG</td>
                            </tr>
                            <tr>
                              <td className="p-1 font-bold bg-slate-50 border-r border-gray-200">Grade Point (GP)</td>
                              <td className="p-1 font-mono font-bold border-r border-gray-200">4.0</td>
                              <td className="p-1 font-mono font-bold border-r border-gray-200">3.6</td>
                              <td className="p-1 font-mono font-bold border-r border-gray-200">3.2</td>
                              <td className="p-1 font-mono font-bold border-r border-gray-200">2.8</td>
                              <td className="p-1 font-mono font-bold border-r border-gray-200">2.4</td>
                              <td className="p-1 font-mono font-bold border-r border-gray-200">2.0</td>
                              <td className="p-1 font-mono font-bold border-r border-gray-200">1.6</td>
                              <td className="p-1 font-mono font-bold text-rose-600">0.0</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Signatures & Seal Block */}
                    <div className="grid grid-cols-4 pt-8 text-center text-xs text-gray-800 items-end">
                      <div>
                        <p className="font-mono text-gray-600 mb-6 text-[11px]">
                          Date: <strong>{todayBS()} BS</strong>
                        </p>
                        <div className="border-t border-gray-600 mx-2 pt-1 font-bold">
                          Class Teacher (कक्षा शिक्षक)
                        </div>
                      </div>

                      <div>
                        <div className="border-t border-gray-600 mx-2 pt-1 font-bold mt-10">
                          Exam Controller (परीक्षा प्रमुख)
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center">
                        <div className="relative h-24 w-24 rounded-full border-4 border-double border-[#1e3a5f] flex flex-col items-center justify-center text-center p-1 bg-white/80 shadow-xs transform -rotate-3 transition hover:rotate-0">
                          <div className="absolute inset-1 rounded-full border border-dashed border-[#1e3a5f]/60 pointer-events-none" />
                          
                          <div className="h-7 w-7 mb-0.5 opacity-90 flex items-center justify-center">
                            {bulkMarksheetsData.school?.logoUrl ? (
                              <img src={bulkMarksheetsData.school.logoUrl} alt="Seal Logo" className="h-full w-full object-contain" />
                            ) : (
                              <svg viewBox="0 0 100 100" className="h-full w-full text-[#1e3a5f]">
                                <polygon points="50,15 61,38 86,38 66,54 74,78 50,62 26,78 34,54 14,38 39,38" fill="#1e3a5f" />
                              </svg>
                            )}
                          </div>

                          <div className="text-[7.5px] font-black uppercase text-[#1e3a5f] leading-none tracking-tight">
                            {bulkMarksheetsData.school?.nameNepali || 'नेपाल मा.वि.'}
                          </div>
                          <div className="text-[6.5px] font-bold text-amber-700 tracking-wider">
                            स्था: {bulkMarksheetsData.school?.estYear || '२०२५'}
                          </div>
                          <div className="text-[6px] font-extrabold uppercase bg-[#1e3a5f] text-white px-1.5 py-0.5 rounded-full mt-0.5">
                            ★ OFFICIAL SEAL ★
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-700 font-bold mt-1">School Seal (विद्यालयको छाप)</span>
                      </div>

                      <div>
                        <div className="border-t border-gray-600 mx-2 pt-1 font-bold mt-10">
                          Head Teacher / Principal (प्र.अ.)
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}
      {/* ─── PUBLISH RESULTS MODAL ────────────────────────────────────────── */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-extrabold text-base text-[#1e3a5f] flex items-center gap-2">
                <Bell size={18} className="text-amber-500" />
                <span>Publish Exam Results (परीक्षा नतिजा प्रकाशन)</span>
              </h3>
              <button onClick={() => setIsPublishModalOpen(false)} className="p-1 text-gray-400 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-2xl flex items-start gap-2">
                <Sparkles size={16} className="text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Publishing results will make official Grade Sheets visible to students & parents in the Student Portal, and send an automated notice notification!
                </span>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Select Exam (परीक्षा छनोट गर्नुहोस्) *</label>
                <select
                  value={publishExamId}
                  onChange={(e) => setPublishExamId(e.target.value)}
                  className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold bg-white"
                >
                  <option value="">-- Select Terminal Exam --</option>
                  {exams.map((ex: any) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} {ex.nameNepali ? `(${ex.nameNepali})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-gray-700">Target Classes (कुन-कुन कक्षाको नतिजा प्रकाशन गर्ने?)</label>
                  <label className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#1e3a5f] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={classesData && classesData.length > 0 && publishClassIds.length === classesData.length}
                      onChange={(e) => handleSelectAllPublishClasses(e.target.checked)}
                      className="rounded border-gray-300 text-[#1e3a5f] focus:ring-[#1e3a5f]"
                    />
                    <span>Select All (सबै छनोट)</span>
                  </label>
                </div>

                <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-2xl p-3 bg-slate-50 grid grid-cols-2 gap-2">
                  {classesData?.map((c: any) => {
                    const isChecked = publishClassIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs font-bold cursor-pointer transition ${
                          isChecked ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs' : 'bg-white border-gray-200 text-gray-700 hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleTogglePublishClass(c.id)}
                          className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                        />
                        <span className="truncate">{c.name} {c.section ? `(${c.section})` : ''}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-gray-500 mt-1 italic">
                  * Check individual classes or Select All to publish results for multiple classes at once.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(false)}
                  className="px-4 py-2 border rounded-xl text-xs font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={publishResultMutation.isPending || !publishExamId}
                  onClick={() => publishResultMutation.mutate()}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-black text-xs rounded-xl shadow-md disabled:opacity-50 transition"
                >
                  {publishResultMutation.isPending ? 'Publishing...' : '📢 Publish Results Now'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
