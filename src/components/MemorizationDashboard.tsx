import React, { useState, useEffect } from "react";
import { 
  Users, BookOpen, Layers, Award, ShieldAlert, CheckCircle2, 
  Clock, MessageSquare, Plus, Trash2, Edit, Save, LogOut, 
  ChevronRight, ArrowLeft, Star, Send, Search, Check, Filter, 
  TrendingUp, Download, Eye, AlertCircle, RefreshCw, BarChart2,
  Calendar, MapPin, UserCheck, Heart
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MemoUser {
  id: number;
  name: string;
  role: "admin" | "teacher" | "supervisor" | "parent";
  code: string;
  phone?: string;
}

export default function MemorizationDashboard() {
  const [currentUser, setCurrentUser] = useState<MemoUser | null>(() => {
    try {
      const saved = localStorage.getItem("memo_current_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [parentStudent, setParentStudent] = useState<any>(null);
  const [accessCode, setAccessCode] = useState("");
  const [loading, setLoading] = useState(false);

  // Common stats / counts
  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    supervisors: 0,
    programs: 0,
    groups: 0,
    avgCompletion: 0
  });

  // Data states
  const [programs, setPrograms] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [teacherGroups, setTeacherGroups] = useState<any[]>([]);
  const [groupStudents, setGroupStudents] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);

  // Selection states
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [selectedProgram, setSelectedProgram] = useState<any>(null);
  const [selectedGroup, setSelectedGroup] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);

  // Edit / Add modal & form states
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Form Fields
  const [programForm, setProgramForm] = useState({ name: "", description: "", start_date: "", end_date: "", status: "active" });
  const [studentForm, setStudentForm] = useState({ name: "", village: "", parent_phone: "", parent_code: "" });
  const [teacherForm, setTeacherForm] = useState({ name: "", code: "", phone: "" });
  const [supervisorForm, setSupervisorForm] = useState({ name: "", code: "", phone: "" });
  const [groupForm, setGroupForm] = useState({ name: "", program_id: "", teacher_id: "", village: "", level: "" });
  const [sectionForm, setSectionForm] = useState({ surah_name: "", surah_number: 1, section_name: "كامل السورة", from_ayah: 1, to_ayah: "", juz: 30, order_number: 1 });

  // Mapping Sections to Program Modal
  const [showSectionMapper, setShowSectionMapper] = useState(false);
  const [programSections, setProgramSections] = useState<any[]>([]);

  // Evaluating Student Record state
  const [selectedEvaluationSection, setSelectedEvaluationSection] = useState<any>(null);
  const [evaluationForm, setEvaluationForm] = useState({
    status: "لم يبدأ",
    first_recitation_done: false,
    first_recitation_date: "",
    second_recitation_done: false,
    second_recitation_date: "",
    mastery_level: "ممتاز",
    teacher_notes: ""
  });

  // Supervisor Messaging state
  const [showSupervisorNoteForm, setShowSupervisorNoteForm] = useState(false);
  const [supervisorNote, setSupervisorNote] = useState({ teacher_id: "", group_id: "", message: "", rating: 5 });

  // Parent view stats
  const [parentData, setParentData] = useState<any>(null);

  // Save user session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem("memo_current_user", JSON.stringify(currentUser));
      fetchStatsAndData();
    } else {
      localStorage.removeItem("memo_current_user");
    }
  }, [currentUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/memorization/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: accessCode.trim() })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setCurrentUser(data.user);
        if (data.role === "parent") {
          setParentStudent(data.student);
          fetchParentStudentDetails(data.student.id);
        }
        toast.success(`أهلاً بك، تم الدخول بنجاح`);
      } else {
        toast.error(data.error || "كود الدخول غير صحيح");
      }
    } catch (err) {
      toast.error("فشل الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setParentStudent(null);
    setParentData(null);
    setAccessCode("");
    toast.success("تم تسجيل الخروج بنجاح");
  };

  const fetchStatsAndData = () => {
    if (!currentUser) return;

    if (currentUser.role === "admin") {
      fetchAdminStats();
      fetchPrograms();
      fetchStudents();
      fetchTeachers();
      fetchSupervisors();
      fetchSections();
      fetchGroups();
    } else if (currentUser.role === "teacher") {
      fetchTeacherGroups();
      fetchTeacherMessages();
    } else if (currentUser.role === "supervisor") {
      fetchSupervisorTeachers();
      fetchSupervisorGroups();
    } else if (currentUser.role === "parent" && parentStudent) {
      fetchParentStudentDetails(parentStudent.id);
    }
  };

  // FETCHING UTILITIES
  const fetchAdminStats = () => {
    fetch("/api/memorization/admin/stats")
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(() => {});
  };

  const fetchPrograms = () => {
    fetch("/api/memorization/admin/programs")
      .then(res => res.json())
      .then(data => setPrograms(data))
      .catch(() => {});
  };

  const fetchStudents = () => {
    fetch("/api/memorization/admin/students")
      .then(res => res.json())
      .then(data => setStudents(data))
      .catch(() => {});
  };

  const fetchTeachers = () => {
    fetch("/api/memorization/admin/teachers")
      .then(res => res.json())
      .then(data => setTeachers(data))
      .catch(() => {});
  };

  const fetchSupervisors = () => {
    fetch("/api/memorization/admin/supervisors")
      .then(res => res.json())
      .then(data => setSupervisors(data))
      .catch(() => {});
  };

  const fetchSections = () => {
    fetch("/api/memorization/admin/sections")
      .then(res => res.json())
      .then(data => setSections(data))
      .catch(() => {});
  };

  const fetchGroups = () => {
    fetch("/api/memorization/admin/groups")
      .then(res => res.json())
      .then(data => setGroups(data))
      .catch(() => {});
  };

  const fetchTeacherGroups = () => {
    fetch(`/api/memorization/teacher/${currentUser?.id}/groups`)
      .then(res => res.json())
      .then(data => setTeacherGroups(data))
      .catch(() => {});
  };

  const fetchTeacherMessages = () => {
    fetch(`/api/memorization/teacher/${currentUser?.id}/messages`)
      .then(res => res.json())
      .then(data => setMessages(data))
      .catch(() => {});
  };

  const fetchSupervisorTeachers = () => {
    fetch("/api/memorization/supervisor/teachers")
      .then(res => res.json())
      .then(data => setTeachers(data))
      .catch(() => {});
  };

  const fetchSupervisorGroups = () => {
    fetch("/api/memorization/supervisor/groups")
      .then(res => res.json())
      .then(data => setGroups(data))
      .catch(() => {});
  };

  const fetchParentStudentDetails = (studentId: number) => {
    fetch(`/api/memorization/parent/student/${studentId}`)
      .then(res => res.json())
      .then(data => setParentData(data))
      .catch(() => {});
  };

  // ADMIN OPERATIONS
  const handleAddProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/memorization/admin/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(programForm)
      });
      if (res.ok) {
        toast.success("تم إضافة البرنامج بنجاح");
        setShowAddForm(false);
        setProgramForm({ name: "", description: "", start_date: "", end_date: "", status: "active" });
        fetchPrograms();
        fetchAdminStats();
      }
    } catch {
      toast.error("فشل إضافة البرنامج");
    }
  };

  const handleDeleteProgram = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا البرنامج؟ سيتم حذف كافة الارتباطات التابعة له.")) return;
    try {
      const res = await fetch(`/api/memorization/admin/programs/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("تم حذف البرنامج بنجاح");
        fetchPrograms();
        fetchAdminStats();
      }
    } catch {
      toast.error("فشل حذف البرنامج");
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentForm.parent_code) {
      studentForm.parent_code = "P-" + Math.floor(1000 + Math.random() * 9000);
    }
    try {
      const res = await fetch("/api/memorization/admin/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(studentForm)
      });
      if (res.ok) {
        toast.success(`تم إضافة الطالب بنجاح. كود ولي الأمر: ${studentForm.parent_code}`);
        setShowAddForm(false);
        setStudentForm({ name: "", village: "", parent_phone: "", parent_code: "" });
        fetchStudents();
        fetchAdminStats();
      }
    } catch {
      toast.error("فشل إضافة الطالب");
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا الطالب؟ سيتم حذفه من كافة المجموعات وسجلات الحفظ.")) return;
    try {
      const res = await fetch(`/api/memorization/admin/students/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("تم حذف الطالب بنجاح");
        fetchStudents();
        fetchAdminStats();
      }
    } catch {
      toast.error("فشل حذف الطالب");
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherForm.code) {
      teacherForm.code = "T-" + Math.floor(1000 + Math.random() * 9000);
    }
    try {
      const res = await fetch("/api/memorization/admin/teachers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(teacherForm)
      });
      if (res.ok) {
        toast.success(`تم إضافة المحفظ بنجاح. كود الدخول الخاص به هو: ${teacherForm.code}`);
        setShowAddForm(false);
        setTeacherForm({ name: "", code: "", phone: "" });
        fetchTeachers();
        fetchAdminStats();
      }
    } catch {
      toast.error("فشل إضافة المحفظ");
    }
  };

  const handleDeleteTeacher = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المحفظ؟")) return;
    try {
      const res = await fetch(`/api/memorization/admin/teachers/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("تم حذف المحفظ بنجاح");
        fetchTeachers();
        fetchAdminStats();
      }
    } catch {
      toast.error("فشل حذف المحفظ");
    }
  };

  const handleAddSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorForm.code) {
      supervisorForm.code = "S-" + Math.floor(1000 + Math.random() * 9000);
    }
    try {
      const res = await fetch("/api/memorization/admin/supervisors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supervisorForm)
      });
      if (res.ok) {
        toast.success(`تم إضافة المشرف بنجاح. كود الدخول الخاص به هو: ${supervisorForm.code}`);
        setShowAddForm(false);
        setSupervisorForm({ name: "", code: "", phone: "" });
        fetchSupervisors();
        fetchAdminStats();
      }
    } catch {
      toast.error("فشل إضافة المشرف");
    }
  };

  const handleDeleteSupervisor = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المشرف؟")) return;
    try {
      const res = await fetch(`/api/memorization/admin/supervisors/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("تم حذف المشرف بنجاح");
        fetchSupervisors();
        fetchAdminStats();
      }
    } catch {
      toast.error("فشل حذف المشرف");
    }
  };

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/memorization/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sectionForm)
      });
      if (res.ok) {
        toast.success("تم إضافة المقطع القرآني بنجاح");
        setShowAddForm(false);
        setSectionForm({ surah_name: "", surah_number: 1, section_name: "كامل السورة", from_ayah: 1, to_ayah: "", juz: 30, order_number: 1 });
        fetchSections();
      }
    } catch {
      toast.error("فشل إضافة المقطع");
    }
  };

  const handleDeleteSection = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذا المقطع؟")) return;
    try {
      const res = await fetch(`/api/memorization/admin/sections/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("تم حذف المقطع بنجاح");
        fetchSections();
      }
    } catch {
      toast.error("فشل حذف المقطع");
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/memorization/admin/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(groupForm)
      });
      if (res.ok) {
        toast.success("تم إنشاء المجموعة بنجاح");
        setShowAddForm(false);
        setGroupForm({ name: "", program_id: "", teacher_id: "", village: "", level: "" });
        fetchGroups();
        fetchAdminStats();
        if (currentUser?.role === "teacher") {
          fetchTeacherGroups();
        }
      }
    } catch {
      toast.error("فشل إنشاء المجموعة");
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!confirm("هل أنت متأكد من حذف هذه المجموعة؟")) return;
    try {
      const res = await fetch(`/api/memorization/admin/groups/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("تم حذف المجموعة بنجاح");
        fetchGroups();
        fetchAdminStats();
        if (currentUser?.role === "teacher") {
          fetchTeacherGroups();
        }
      }
    } catch {
      toast.error("فشل حذف المجموعة");
    }
  };

  // MAPPING SECTIONS TO PROGRAMS
  const openSectionMapper = (program: any) => {
    setSelectedProgram(program);
    setLoading(true);
    fetch(`/api/memorization/admin/programs/${program.id}/sections`)
      .then(res => res.json())
      .then(data => {
        setProgramSections(data);
        setShowSectionMapper(true);
      })
      .finally(() => setLoading(false));
  };

  const toggleProgramSectionMapping = (sectionId: number) => {
    setProgramSections(prev => 
      prev.map(sec => sec.id === sectionId ? { ...sec, selected: sec.selected ? 0 : 1 } : sec)
    );
  };

  const saveProgramSectionMapping = async () => {
    const selectedIds = programSections.filter(sec => sec.selected === 1).map(sec => sec.id);
    try {
      const res = await fetch(`/api/memorization/admin/programs/${selectedProgram.id}/sections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section_ids: selectedIds })
      });
      if (res.ok) {
        toast.success("تم تحديث السور والمقاطع المقررة للبرنامج بنجاح");
        setShowSectionMapper(false);
        setSelectedProgram(null);
      }
    } catch {
      toast.error("فشل حفظ التعديلات");
    }
  };

  // MANAGING STUDENTS INSIDE GROUP
  const [showStudentSelector, setShowStudentSelector] = useState(false);
  const [selectedGroupStudents, setSelectedGroupStudents] = useState<any[]>([]);

  const openGroupStudents = (group: any) => {
    setSelectedGroup(group);
    fetch(`/api/memorization/admin/groups/${group.id}/students`)
      .then(res => res.json())
      .then(data => {
        setSelectedGroupStudents(data);
        setShowStudentSelector(true);
      });
  };

  const handleAddStudentToGroup = async (studentId: number) => {
    try {
      const res = await fetch(`/api/memorization/admin/groups/${selectedGroup.id}/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_ids: [studentId] })
      });
      if (res.ok) {
        toast.success("تم إضافة الطالب للمجموعة");
        // reload
        openGroupStudents(selectedGroup);
        fetchGroups();
      }
    } catch {
      toast.error("فشل إضافة الطالب");
    }
  };

  const handleRemoveStudentFromGroup = async (studentId: number) => {
    try {
      const res = await fetch(`/api/memorization/admin/groups/${selectedGroup.id}/students/${studentId}`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("تم إزالة الطالب من المجموعة");
        openGroupStudents(selectedGroup);
        fetchGroups();
      }
    } catch {
      toast.error("فشل إزالة الطالب");
    }
  };

  // EVALUATING Memorization Progress (Teacher Side)
  const [studentRecords, setStudentRecords] = useState<any[]>([]);
  const openStudentEvaluation = (group: any, student: any) => {
    setSelectedGroup(group);
    setSelectedStudent(student);
    setLoading(true);
    fetch(`/api/memorization/teacher/students/${student.id}/records?program_id=${group.program_id}`)
      .then(res => res.json())
      .then(data => {
        setStudentRecords(data);
        setActiveSubTab("evaluate_flow");
      })
      .finally(() => setLoading(false));
  };

  const handleSelectSectionForEvaluation = (sec: any) => {
    setSelectedEvaluationSection(sec);
    setEvaluationForm({
      status: sec.record_status || "لم يبدأ",
      first_recitation_done: sec.first_recitation_done === 1,
      first_recitation_date: sec.first_recitation_date || new Date().toISOString().split('T')[0],
      second_recitation_done: sec.second_recitation_done === 1,
      second_recitation_date: sec.second_recitation_date || "",
      mastery_level: sec.mastery_level || "ممتاز",
      teacher_notes: sec.teacher_notes || ""
    });
  };

  const saveEvaluationRecord = async () => {
    if (!selectedEvaluationSection) return;
    try {
      const res = await fetch("/api/memorization/teacher/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudent.id,
          group_id: selectedGroup.id,
          teacher_id: currentUser?.id,
          program_id: selectedGroup.program_id,
          section_id: selectedEvaluationSection.id,
          ...evaluationForm
        })
      });

      if (res.ok) {
        toast.success("تم حفظ تقييم الطالب بنجاح");
        setSelectedEvaluationSection(null);
        // Reload student records
        openStudentEvaluation(selectedGroup, selectedStudent);
      }
    } catch {
      toast.error("حدث خطأ أثناء حفظ التقييم");
    }
  };

  // SUPERVISOR WORKSPACE
  const handleMarkMessageRead = async (msgId: number) => {
    try {
      const res = await fetch(`/api/memorization/teacher/messages/${msgId}/read`, { method: "POST" });
      if (res.ok) {
        toast.success("تم وضع علامة مقروء على الرسالة");
        fetchTeacherMessages();
      }
    } catch {}
  };

  const handleSendSupervisorNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supervisorNote.teacher_id || !supervisorNote.message) {
      toast.error("الرجاء ملء كافة الحقول الأساسية");
      return;
    }

    try {
      const res = await fetch("/api/memorization/supervisor/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supervisor_id: currentUser?.id,
          ...supervisorNote
        })
      });
      if (res.ok) {
        toast.success("تم إرسال الملاحظة والتقييم للمحفظ بنجاح");
        setShowSupervisorNoteForm(false);
        setSupervisorNote({ teacher_id: "", group_id: "", message: "", rating: 5 });
      }
    } catch {
      toast.error("فشل إرسال الملاحظة");
    }
  };

  // CSV EXPORT GENERAL DATA FOR REPORTS
  const exportToExcel = (title: string, headers: string[], rows: any[][]) => {
    let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Include BOM for proper Excel Arabic rendering
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      csvContent += row.map(val => `"${String(val).replace(/"/g, '""')}"`).join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${title}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("تم تصدير التقرير بنجاح");
  };

  // EXPORT ADMIN STUDENTS REPORT
  const exportStudentsReport = () => {
    const headers = ["الاسم", "القرية", "رقم هاتف ولي الأمر", "كود ولي الأمر", "الحالة", "تاريخ الإضافة"];
    const rows = students.map(s => [
      s.name,
      s.village || "غير محدد",
      s.parent_phone || "غير محدد",
      s.parent_code || "غير محدد",
      s.status === "active" ? "نشط" : "غير نشط",
      s.created_at ? s.created_at.split(" ")[0] : ""
    ]);
    exportToExcel("تقرير_الطلاب", headers, rows);
  };

  const exportGroupsReport = () => {
    const headers = ["اسم المجموعة", "البرنامج", "المحفظ", "المستوى", "القرية", "عدد الطلبة"];
    const rows = groups.map(g => [
      g.name,
      g.program_name,
      g.teacher_name,
      g.level || "غير محدد",
      g.village || "غير محدد",
      g.student_count
    ]);
    exportToExcel("تقرير_المجموعات_والحلقات", headers, rows);
  };

  return (
    <div className="w-full space-y-8" dir="rtl">
      {/* 1. NOT LOGGED IN ACCESS PORTAL */}
      {!currentUser && (
        <div className="max-w-xl mx-auto my-12 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-white p-8 sm:p-12 rounded-[2.5rem] shadow-2xl border border-emerald-100 space-y-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500"></div>
            
            <div className="w-24 h-24 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-emerald-100">
              <BookOpen className="w-12 h-12 text-emerald-700" />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">نظام التحفيظ والمتابعة</h1>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                بوابة الحفظ والمراجعة لمدرسة الطالع السعيد. أدخل كود الدخول الخاص بك للدخول إلى لوحة التحكم بصلاحياتك.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5 max-w-sm mx-auto">
              <div className="space-y-1">
                <Input 
                  type="text" 
                  placeholder="أدخل كود الدخول الخاص بك (مثال: admin77)..." 
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="text-center text-xl font-bold tracking-wider h-14 rounded-2xl border-emerald-200 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>

              <Button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-14 rounded-2xl text-lg shadow-lg hover:shadow-emerald-200 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                تسجيل الدخول للنظام
              </Button>
            </form>

            <div className="pt-6 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-slate-500">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <span className="block text-emerald-700">الإدارة</span>
                <span className="font-normal text-slate-400">إشراف كامل</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <span className="block text-emerald-700">المحفظ</span>
                <span className="font-normal text-slate-400">تقييم ومجموعات</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <span className="block text-emerald-700">المشرف</span>
                <span className="font-normal text-slate-400">متابعة وإشراف</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl space-y-1 border border-slate-100">
                <span className="block text-emerald-700">ولي الأمر</span>
                <span className="font-normal text-slate-400">متابعة الإنجاز</span>
              </div>
            </div>

            <div className="text-xs text-slate-400">
              * للتجربة الفورية كمسؤول، استخدم الكود: <code className="bg-slate-100 px-2 py-1 rounded text-emerald-700 font-black">admin77</code>
            </div>
          </div>
        </div>
      )}

      {/* 2. AUTHENTICATED SYSTEM PORTAL */}
      {currentUser && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Main Module Header */}
          <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700">
                <BookOpen className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="bg-emerald-100 text-emerald-800 text-xs px-3 py-1 rounded-full font-bold">
                    {currentUser.role === "admin" && "الإدارة"}
                    {currentUser.role === "teacher" && "محفّظ / معلم"}
                    {currentUser.role === "supervisor" && "مشرف تربوي"}
                    {currentUser.role === "parent" && "ولي أمر"}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">ID: #{currentUser.id}</span>
                </div>
                <h2 className="text-2xl font-black text-slate-900 mt-1">{currentUser.name}</h2>
                <p className="text-slate-500 text-xs">مدرسة الطالع السعيد لتدريس القرآن الكريم • نظام التحفيظ والمتابعة</p>
              </div>
            </div>

            <Button 
              onClick={handleLogout}
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-xl px-5 gap-2 h-12 text-sm font-bold shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </Button>
          </div>

          {/* ==================== ROLE-BASED DASHBOARDS ==================== */}

          {/* A. ADMIN DASHBOARD */}
          {currentUser.role === "admin" && (
            <div className="space-y-8">
              {/* Stat Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                  <Users className="w-6 h-6 text-emerald-600" />
                  <div className="text-2xl font-black text-slate-900">{stats.students}</div>
                  <div className="text-xs text-slate-500 font-bold">الطلبة المقيدين</div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                  <UserCheck className="w-6 h-6 text-teal-600" />
                  <div className="text-2xl font-black text-slate-900">{stats.teachers}</div>
                  <div className="text-xs text-slate-500 font-bold">المحفظين</div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                  <Award className="w-6 h-6 text-amber-600" />
                  <div className="text-2xl font-black text-slate-900">{stats.supervisors}</div>
                  <div className="text-xs text-slate-500 font-bold">المشرفين</div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                  <Layers className="w-6 h-6 text-indigo-600" />
                  <div className="text-2xl font-black text-slate-900">{stats.programs}</div>
                  <div className="text-xs text-slate-500 font-bold">برامج التحفيظ</div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                  <div className="text-2xl font-black text-slate-900">{stats.groups}</div>
                  <div className="text-xs text-slate-500 font-bold">المجموعات والحلقات</div>
                </div>
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-2">
                  <TrendingUp className="w-6 h-6 text-pink-600" />
                  <div className="text-2xl font-black text-slate-900">{stats.avgCompletion}%</div>
                  <div className="text-xs text-slate-500 font-bold">نسبة الإنجاز العامة</div>
                </div>
              </div>

              {/* Sub-nav for Admin */}
              <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                {["overview", "programs", "students", "teachers", "supervisors", "sections", "groups", "reports"].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeSubTab === tab ? "default" : "ghost"}
                    onClick={() => {
                      setActiveSubTab(tab);
                      setShowAddForm(false);
                    }}
                    className="rounded-xl px-5 text-xs font-bold"
                  >
                    {tab === "overview" && "لوحة التحكم"}
                    {tab === "programs" && "البرامج المقررة"}
                    {tab === "students" && "شؤون الطلاب"}
                    {tab === "teachers" && "المحفظون"}
                    {tab === "supervisors" && "المشرفون"}
                    {tab === "sections" && "السور والمقاطع"}
                    {tab === "groups" && "المجموعات والحلقات"}
                    {tab === "reports" && "التقارير والإحصائيات"}
                  </Button>
                ))}
              </div>

              {/* Content Panel */}
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-200 min-h-[400px]">
                
                {/* 1. OVERVIEW */}
                {activeSubTab === "overview" && (
                  <div className="space-y-8">
                    <div className="border-b border-slate-100 pb-5">
                      <h3 className="text-xl font-bold text-slate-900">مرحباً بك في لوحة الإدارة العامة</h3>
                      <p className="text-slate-500 text-xs">إدارة البرامج والطلبة والمحفظين والمشرفين ومتابعة تقدم الإنجاز.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-emerald-50/50 rounded-2xl p-6 border border-emerald-100 space-y-4">
                        <h4 className="text-sm font-bold text-emerald-800">إرشادات البدء السريع:</h4>
                        <ol className="text-xs text-slate-600 space-y-2.5 list-decimal pr-4 leading-relaxed">
                          <li>ابدأ بـ <strong>إضافة الطلبة</strong> في شؤون الطلاب، حيث سيقوم النظام تلقائياً بتوليد كود دخول آمن خاص بولي أمر كل طالب.</li>
                          <li>قم بإنشاء <strong>المحفظين</strong> والـ <strong>المشرفين</strong> وتزويدهم بأكواد الدخول الخاصة بهم.</li>
                          <li>قم بإنشاء <strong>البرامج</strong> الصيفية أو الاعتيادية، ثم حدد السور والمقاطع المقررة لكل برنامج من خيار "تحديد السور المقررة".</li>
                          <li>قم بإنشاء <strong>المجموعات والحلقات</strong> (مثل مجموعة قرية العابية أو المستوى الأول) وربطها بالبرنامج والمحفظ المسؤول.</li>
                          <li>قم بإدراج الطلبة داخل المجموعات من تبويب "المجموعات والحلقات" ليبدأ المحفظون بتقييمهم وتسميعهم.</li>
                        </ol>
                      </div>

                      <div className="bg-amber-50/50 rounded-2xl p-6 border border-amber-100 space-y-4 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-amber-800">بيانات تجريبية سريعة للتجربة الفورية:</h4>
                          <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                            لقد تم تمهيد قاعدة البيانات بـ 38 سورة من سور جزء عم وسورة الفاتحة ليسهل ربطها ببرامج الحفظ فوراً دون عناء الإدخال اليدوي.
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-xl border border-amber-200 text-xs font-mono text-slate-600">
                          كود دخول الإدارة: admin77
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. PROGRAMS */}
                {activeSubTab === "programs" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold">برامج التحفيظ والمتابعة</h3>
                        <p className="text-xs text-slate-500">الخطط والبرامج الزمنية المتاحة للحفظ والتثبيت.</p>
                      </div>
                      <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-emerald-700 hover:bg-emerald-800">
                        <Plus className="w-4 h-4 ml-1" /> إضافة برنامج جديد
                      </Button>
                    </div>

                    {showAddForm && (
                      <form onSubmit={handleAddProgram} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="text-sm font-bold">إدخال برنامج تحفيظ جديد</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">اسم البرنامج</label>
                            <Input 
                              type="text" 
                              placeholder="مثال: برنامج إشراق الصيفي..." 
                              value={programForm.name}
                              onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">الحالة</label>
                            <select 
                              value={programForm.status} 
                              onChange={(e) => setProgramForm({ ...programForm, status: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                            >
                              <option value="active">نشط</option>
                              <option value="inactive">غير نشط / منتهي</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">تاريخ البدء</label>
                            <Input 
                              type="date" 
                              value={programForm.start_date}
                              onChange={(e) => setProgramForm({ ...programForm, start_date: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">تاريخ الانتهاء</label>
                            <Input 
                              type="date" 
                              value={programForm.end_date}
                              onChange={(e) => setProgramForm({ ...programForm, end_date: e.target.value })}
                            />
                          </div>
                          <div className="md:col-span-2 space-y-1">
                            <label className="text-xs text-slate-500 font-bold">وصف وتعليمات البرنامج</label>
                            <Input 
                              type="text" 
                              placeholder="ملاحظات توضيحية للمشرفين والمحفظين..." 
                              value={programForm.description}
                              onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">حفظ البرنامج</Button>
                          <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>إلغاء</Button>
                        </div>
                      </form>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                            <th className="p-3 font-bold">رقم التعريف</th>
                            <th className="p-3 font-bold">اسم البرنامج</th>
                            <th className="p-3 font-bold">تاريخ البدء والانتهاء</th>
                            <th className="p-3 font-bold">الحالة</th>
                            <th className="p-3 font-bold">خيارات الإعداد</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {programs.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono">#{p.id}</td>
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{p.name}</div>
                                <div className="text-xs text-slate-500">{p.description}</div>
                              </td>
                              <td className="p-3 text-xs text-slate-600">
                                {p.start_date || "مستمر"} إلى {p.end_date || "مستمر"}
                              </td>
                              <td className="p-3">
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${p.status === "active" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>
                                  {p.status === "active" ? "نشط" : "غير نشط"}
                                </span>
                              </td>
                              <td className="p-3 flex items-center gap-1.5">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs border-emerald-200 text-emerald-700"
                                  onClick={() => openSectionMapper(p)}
                                >
                                  <BookOpen className="w-3.5 h-3.5 ml-1" /> المقاطع المقررة
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs border-red-100 text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteProgram(p.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {programs.length === 0 && (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">لا توجد برامج مسجلة حتى الآن.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. STUDENTS */}
                {activeSubTab === "students" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold">شؤون الطلاب</h3>
                        <p className="text-xs text-slate-500">إدارة سجلات الطلاب، القرى، وأكواد أولياء الأمور للمتابعة.</p>
                      </div>
                      <div className="flex gap-2">
                        <Button onClick={exportStudentsReport} variant="outline" className="h-10 text-xs border-slate-300">
                          <Download className="w-4 h-4 ml-1" /> تصدير CSV
                        </Button>
                        <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-emerald-700 hover:bg-emerald-800">
                          <Plus className="w-4 h-4 ml-1" /> إضافة طالب جديد
                        </Button>
                      </div>
                    </div>

                    {showAddForm && (
                      <form onSubmit={handleAddStudent} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="text-sm font-bold">إدخال طالب جديد للنظام</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">اسم الطالب بالكامل</label>
                            <Input 
                              type="text" 
                              placeholder="مثال: أحمد بن سعيد الرحبي..." 
                              value={studentForm.name}
                              onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">القرية / المنطقة</label>
                            <Input 
                              type="text" 
                              placeholder="مثال: العابية / هندروت / طالع السعيد..." 
                              value={studentForm.village}
                              onChange={(e) => setStudentForm({ ...studentForm, village: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">رقم هاتف ولي الأمر</label>
                            <Input 
                              type="text" 
                              placeholder="مثال: 99112233..." 
                              value={studentForm.parent_phone}
                              onChange={(e) => setStudentForm({ ...studentForm, parent_phone: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">كود المتابعة لولي الأمر (اتركه فارغاً لتوليد كود تلقائي)</label>
                            <Input 
                              type="text" 
                              placeholder="مثال: P-1234..." 
                              value={studentForm.parent_code}
                              onChange={(e) => setStudentForm({ ...studentForm, parent_code: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">إضافة الطالب</Button>
                          <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>إلغاء</Button>
                        </div>
                      </form>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                            <th className="p-3 font-bold">الرقم</th>
                            <th className="p-3 font-bold">اسم الطالب</th>
                            <th className="p-3 font-bold">القرية</th>
                            <th className="p-3 font-bold">رقم ولي الأمر</th>
                            <th className="p-3 font-bold">كود ولي الأمر الموحد</th>
                            <th className="p-3 font-bold">خيارات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {students.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono text-xs">#{s.id}</td>
                              <td className="p-3 font-bold text-slate-900">{s.name}</td>
                              <td className="p-3">{s.village || "غير محدد"}</td>
                              <td className="p-3 font-mono text-xs">{s.parent_phone || "غير محدد"}</td>
                              <td className="p-3 font-mono font-bold text-emerald-700 bg-emerald-50/50 rounded">{s.parent_code}</td>
                              <td className="p-3">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs border-red-100 text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteStudent(s.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                          {students.length === 0 && (
                            <tr>
                              <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">لا يوجد طلاب مقيدين حتى الآن.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 4. TEACHERS */}
                {activeSubTab === "teachers" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold">إدارة المحفظين والمعلمين</h3>
                        <p className="text-xs text-slate-500">إضافة المحفظين وتوليد كود الدخول الآمن الخاص بهم.</p>
                      </div>
                      <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-emerald-700 hover:bg-emerald-800">
                        <Plus className="w-4 h-4 ml-1" /> إضافة محفّظ جديد
                      </Button>
                    </div>

                    {showAddForm && (
                      <form onSubmit={handleAddTeacher} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="text-sm font-bold">إضافة محفظ جديد</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">اسم المحفظ بالكامل</label>
                            <Input 
                              type="text" 
                              placeholder="مثال: الشيخ فلان بن فلان..." 
                              value={teacherForm.name}
                              onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">رقم الهاتف</label>
                            <Input 
                              type="text" 
                              placeholder="رقم الهاتف للتواصل..." 
                              value={teacherForm.phone}
                              onChange={(e) => setTeacherForm({ ...teacherForm, phone: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">كود الدخول (اتركه فارغاً للتوليد التلقائي)</label>
                            <Input 
                              type="text" 
                              placeholder="مثال: T-4433..." 
                              value={teacherForm.code}
                              onChange={(e) => setTeacherForm({ ...teacherForm, code: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">حفظ البيانات</Button>
                          <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>إلغاء</Button>
                        </div>
                      </form>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                            <th className="p-3 font-bold">الاسم</th>
                            <th className="p-3 font-bold">رقم الهاتف</th>
                            <th className="p-3 font-bold">كود الدخول المخصص له</th>
                            <th className="p-3 font-bold">خيارات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {teachers.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-bold text-slate-900">{t.name}</td>
                              <td className="p-3 font-mono text-xs">{t.phone || "غير محدد"}</td>
                              <td className="p-3 font-mono font-bold text-amber-700">{t.code}</td>
                              <td className="p-3">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs border-red-100 text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteTeacher(t.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 5. SUPERVISORS */}
                {activeSubTab === "supervisors" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold">إدارة المشرفين التربويين</h3>
                        <p className="text-xs text-slate-500">إضافة ومتابعة المشرفين المسؤولين عن تقييم المحفظين ومتابعة الطلبة.</p>
                      </div>
                      <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-emerald-700 hover:bg-emerald-800">
                        <Plus className="w-4 h-4 ml-1" /> إضافة مشرف جديد
                      </Button>
                    </div>

                    {showAddForm && (
                      <form onSubmit={handleAddSupervisor} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="text-sm font-bold">إضافة مشرف تربوي جديد</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">اسم المشرف بالكامل</label>
                            <Input 
                              type="text" 
                              placeholder="مثال: الأستاذ سعيد الحارثي..." 
                              value={supervisorForm.name}
                              onChange={(e) => setSupervisorForm({ ...supervisorForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">رقم الهاتف</label>
                            <Input 
                              type="text" 
                              placeholder="رقم الهاتف للتواصل..." 
                              value={supervisorForm.phone}
                              onChange={(e) => setSupervisorForm({ ...supervisorForm, phone: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">كود الدخول المخصص</label>
                            <Input 
                              type="text" 
                              placeholder="اتركه فارغاً لتوليد تلقائي..." 
                              value={supervisorForm.code}
                              onChange={(e) => setSupervisorForm({ ...supervisorForm, code: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">حفظ البيانات</Button>
                          <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>إلغاء</Button>
                        </div>
                      </form>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                            <th className="p-3 font-bold">الاسم</th>
                            <th className="p-3 font-bold">رقم الهاتف</th>
                            <th className="p-3 font-bold">كود الدخول</th>
                            <th className="p-3 font-bold">خيارات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {supervisors.map((s) => (
                            <tr key={s.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-bold text-slate-900">{s.name}</td>
                              <td className="p-3 font-mono text-xs">{s.phone || "غير محدد"}</td>
                              <td className="p-3 font-mono font-bold text-indigo-700">{s.code}</td>
                              <td className="p-3">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs border-red-100 text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteSupervisor(s.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 6. SECTIONS / SORAHS */}
                {activeSubTab === "sections" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold">السور والمقاطع المقررة</h3>
                        <p className="text-xs text-slate-500">مكتبة السور وأجزاء التسميع. لقد قمنا بتمهيد النظام بجزء عم كاملاً.</p>
                      </div>
                      <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-emerald-700 hover:bg-emerald-800">
                        <Plus className="w-4 h-4 ml-1" /> إضافة مقطع إضافي
                      </Button>
                    </div>

                    {showAddForm && (
                      <form onSubmit={handleAddSection} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="text-sm font-bold">إضافة مقطع أو سورة جديدة للمكتبة</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">اسم السورة</label>
                            <Input 
                              type="text" 
                              placeholder="مثال: سورة البقرة..." 
                              value={sectionForm.surah_name}
                              onChange={(e) => setSectionForm({ ...sectionForm, surah_name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">رقم السورة في المصحف</label>
                            <Input 
                              type="number" 
                              value={sectionForm.surah_number}
                              onChange={(e) => setSectionForm({ ...sectionForm, surah_number: Number(e.target.value) })}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">الجزء</label>
                            <Input 
                              type="number" 
                              value={sectionForm.juz}
                              onChange={(e) => setSectionForm({ ...sectionForm, juz: Number(e.target.value) })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">اسم المقطع أو الورد</label>
                            <Input 
                              type="text" 
                              value={sectionForm.section_name}
                              onChange={(e) => setSectionForm({ ...sectionForm, section_name: e.target.value })}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">حفظ المقطع</Button>
                          <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>إلغاء</Button>
                        </div>
                      </form>
                    )}

                    <div className="max-h-[500px] overflow-y-auto border border-slate-100 rounded-2xl">
                      <table className="w-full text-right border-collapse">
                        <thead className="bg-slate-50 text-xs text-slate-500 sticky top-0">
                          <tr>
                            <th className="p-3 font-bold">الرقم</th>
                            <th className="p-3 font-bold">اسم السورة</th>
                            <th className="p-3 font-bold">المقطع المحدد</th>
                            <th className="p-3 font-bold">الجزء</th>
                            <th className="p-3 font-bold">خيارات</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {sections.map((sec) => (
                            <tr key={sec.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono text-xs">{sec.surah_number}</td>
                              <td className="p-3 font-bold text-slate-900">{sec.surah_name}</td>
                              <td className="p-3 text-xs text-slate-600">{sec.section_name || "كامل السورة"}</td>
                              <td className="p-3 font-mono text-xs">جزء {sec.juz}</td>
                              <td className="p-3">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs border-red-100 text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteSection(sec.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 7. GROUPS / HILQAS */}
                {activeSubTab === "groups" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold">المجموعات والحلقات</h3>
                        <p className="text-xs text-slate-500">ربط المحفظين بالبرامج المقررة وتخصيص حلقات التحفيظ.</p>
                      </div>
                      <Button onClick={() => setShowAddForm(!showAddForm)} className="bg-emerald-700 hover:bg-emerald-800">
                        <Plus className="w-4 h-4 ml-1" /> إنشاء مجموعة / حلقة جديدة
                      </Button>
                    </div>

                    {showAddForm && (
                      <form onSubmit={handleAddGroup} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="text-sm font-bold">إنشاء مجموعة جديدة</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">اسم المجموعة / الحلقة</label>
                            <Input 
                              type="text" 
                              placeholder="مثال: قرية العابية / حلقة الشيخ أحمد..." 
                              value={groupForm.name}
                              onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">المستوى الدراسي للحلقة</label>
                            <Input 
                              type="text" 
                              placeholder="مثال: مبتدئين / حفاظ جزء عم..." 
                              value={groupForm.level}
                              onChange={(e) => setGroupForm({ ...groupForm, level: e.target.value })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">تابع لبرنامج تحفيظ</label>
                            <select 
                              value={groupForm.program_id} 
                              onChange={(e) => setGroupForm({ ...groupForm, program_id: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                              required
                            >
                              <option value="">-- اختر البرنامج --</option>
                              {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs text-slate-500 font-bold">المحفظ المسؤول</label>
                            <select 
                              value={groupForm.teacher_id} 
                              onChange={(e) => setGroupForm({ ...groupForm, teacher_id: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg p-2.5 text-sm"
                              required
                            >
                              <option value="">-- اختر المحفظ --</option>
                              {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button type="submit" className="bg-emerald-700 hover:bg-emerald-800">إنشاء الحلقة</Button>
                          <Button type="button" variant="outline" onClick={() => setShowAddForm(false)}>إلغاء</Button>
                        </div>
                      </form>
                    )}

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                            <th className="p-3 font-bold">اسم الحلقة / المجموعة</th>
                            <th className="p-3 font-bold">البرنامج</th>
                            <th className="p-3 font-bold">المحفظ المسؤول</th>
                            <th className="p-3 font-bold">عدد الطلاب المدرجين</th>
                            <th className="p-3 font-bold">خيارات الإشراف</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {groups.map((g) => (
                            <tr key={g.id} className="hover:bg-slate-50/50">
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{g.name}</div>
                                <div className="text-xs text-slate-500">المستوى: {g.level || "غير محدد"}</div>
                              </td>
                              <td className="p-3 text-slate-700">{g.program_name}</td>
                              <td className="p-3 text-emerald-800 font-medium">{g.teacher_name}</td>
                              <td className="p-3 font-mono text-slate-900 font-bold">{g.student_count} طلاب</td>
                              <td className="p-3 flex items-center gap-1.5">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs border-indigo-200 text-indigo-700"
                                  onClick={() => openGroupStudents(g)}
                                >
                                  <Users className="w-3.5 h-3.5 ml-1" /> تسجيل وحذف الطلاب
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 text-xs border-red-100 text-red-600 hover:bg-red-50"
                                  onClick={() => handleDeleteGroup(g.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 8. REPORTS & ANALYTICS */}
                {activeSubTab === "reports" && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-5">
                      <h3 className="text-lg font-bold">مركز التقارير والإحصائيات المتقدمة</h3>
                      <p className="text-xs text-slate-500">تصدير تقارير الإنجاز إلى ملفات Excel ومراجعة مستوى التقدم الإجمالي للمدرسة.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="text-sm font-bold text-slate-900">التقارير المتاحة للتصدير الفوري:</h4>
                        <div className="space-y-2">
                          <Button 
                            onClick={exportStudentsReport} 
                            className="w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 h-12 rounded-xl text-xs font-bold justify-start gap-2"
                          >
                            <Download className="w-4 h-4 text-emerald-600" />
                            تصدير تقرير كافة الطلاب المقيدين (Excel / CSV)
                          </Button>
                          <Button 
                            onClick={exportGroupsReport} 
                            className="w-full bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 h-12 rounded-xl text-xs font-bold justify-start gap-2"
                          >
                            <Download className="w-4 h-4 text-amber-600" />
                            تصدير تقرير الحلقات والمجموعات وأعداد الطلاب (Excel / CSV)
                          </Button>
                        </div>
                      </div>

                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">تقييم الأداء العام للمدرسة:</h4>
                          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                            يقيس هذا المؤشر نسبة السور والمقاطع التي تم تسميعها بالكامل واجتيازها بمرتبة "ممتاز" أو "جيد جداً" مقارنة بكافة المقاطع المقررة بالبرنامج.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs font-bold text-slate-600">
                            <span>نسبة التسميع الأول</span>
                            <span>{stats.avgCompletion}%</span>
                          </div>
                          <div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden">
                            <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${stats.avgCompletion}%` }}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}


          {/* B. TEACHER DASHBOARD */}
          {currentUser.role === "teacher" && (
            <div className="space-y-8">
              {/* Teacher Options Tab Navigation */}
              <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                {["my_groups", "add_group", "supervisor_messages"].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeSubTab === tab || (tab === "my_groups" && activeSubTab === "evaluate_flow") ? "default" : "ghost"}
                    onClick={() => {
                      setActiveSubTab(tab);
                      setSelectedStudent(null);
                    }}
                    className="rounded-xl px-5 text-xs font-bold"
                  >
                    {tab === "my_groups" && "مجموعاتي وحلقاتي"}
                    {tab === "add_group" && "إنشاء حلقة جديدة"}
                    {tab === "supervisor_messages" && `ملاحظات المشرف (${messages.filter(m=>!m.is_read).length})`}
                  </Button>
                ))}
              </div>

              {/* Main Workspace Container */}
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-200 min-h-[400px]">
                
                {/* 1. TEACHER GROUPS & EVALUATION SELECTOR */}
                {activeSubTab === "my_groups" && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-lg font-bold">الحلقات والمجموعات التابعة لك</h3>
                      <p className="text-xs text-slate-500">اختر الحلقة ثم انقر على الطالب لبدء تسميع سورة جديدة وتقييمه.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {teacherGroups.map((g) => (
                        <div key={g.id} className="bg-slate-50/50 rounded-2xl p-5 border border-slate-200 hover:border-emerald-300 transition-all space-y-4">
                          <div className="space-y-1">
                            <h4 className="font-bold text-slate-900 text-base">{g.name}</h4>
                            <p className="text-xs text-slate-500">البرنامج: {g.program_name}</p>
                            <p className="text-xs text-slate-400">المستوى: {g.level || "غير محدد"}</p>
                          </div>

                          <div className="border-t border-slate-200/60 pt-4 space-y-3">
                            <span className="text-xs font-bold text-slate-500 block">طلاب الحلقة المقيدين:</span>
                            
                            <TeacherGroupStudentsList 
                              groupId={g.id} 
                              onEvaluate={(student) => openStudentEvaluation(g, student)} 
                            />
                          </div>
                        </div>
                      ))}
                      {teacherGroups.length === 0 && (
                        <div className="col-span-full p-12 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-3">
                          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                          <p className="text-sm text-slate-500">لا توجد لديك حلقات مسجلة باسمك بعد.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* EVALUATION FLOW AREA */}
                {activeSubTab === "evaluate_flow" && selectedStudent && selectedGroup && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <Button variant="ghost" size="sm" onClick={() => setActiveSubTab("my_groups")} className="h-10 rounded-xl px-2">
                          <ArrowLeft className="w-5 h-5 ml-1" /> تراجع
                        </Button>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900">سجل تقييم الطالب: {selectedStudent.name}</h3>
                          <p className="text-xs text-slate-500">الحلقة: {selectedGroup.name} • برنامج: {selectedGroup.program_name}</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                      {/* Left: Table of Surahs mapped with their progress */}
                      <div className="lg:col-span-2 space-y-4">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">السور والمقاطع المقررة في هذا البرنامج:</h4>
                        
                        <div className="max-h-[500px] overflow-y-auto border border-slate-200 rounded-2xl bg-white divide-y divide-slate-100">
                          {studentRecords.map((rec) => (
                            <div 
                              key={rec.id} 
                              onClick={() => handleSelectSectionForEvaluation(rec)}
                              className={`p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors ${selectedEvaluationSection?.id === rec.id ? "bg-emerald-50/70 border-r-4 border-emerald-600" : ""}`}
                            >
                              <div className="space-y-1">
                                <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                                  <span>{rec.surah_name}</span>
                                  <span className="text-xs text-slate-400 font-normal">({rec.section_name})</span>
                                </div>
                                <div className="text-xs text-slate-400">سورة رقم {rec.surah_number} • جزء {rec.juz}</div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                  rec.record_status === "تم التسميع الثاني / مراجعة وتثبيت" ? "bg-green-100 text-green-800" :
                                  rec.record_status === "تم التسميع الأول" ? "bg-emerald-100 text-emerald-800" :
                                  rec.record_status === "تم الحفظ" ? "bg-teal-100 text-teal-800" :
                                  rec.record_status === "جاري الحفظ" ? "bg-amber-100 text-amber-800" :
                                  "bg-slate-100 text-slate-600"
                                }`}>
                                  {rec.record_status || "لم يبدأ"}
                                </span>
                                {rec.mastery_level && (
                                  <span className="text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">
                                    {rec.mastery_level}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Evaluation Form for Selected Surah */}
                      <div className="bg-slate-50/80 p-6 rounded-3xl border border-slate-200 space-y-6">
                        {selectedEvaluationSection ? (
                          <div className="space-y-5">
                            <div className="space-y-1 border-b border-slate-200 pb-3">
                              <h4 className="font-black text-slate-800">{selectedEvaluationSection.surah_name}</h4>
                              <p className="text-xs text-slate-500">تقييم المقطع: {selectedEvaluationSection.section_name}</p>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500">حالة التقدم والحفظ</label>
                              <select 
                                value={evaluationForm.status}
                                onChange={(e) => setEvaluationForm({ ...evaluationForm, status: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white font-bold"
                              >
                                <option value="لم يبدأ">لم يبدأ</option>
                                <option value="جاري الحفظ">جاري الحفظ</option>
                                <option value="تم الحفظ">تم الحفظ</option>
                                <option value="تم التسميع الأول">تم التسميع الأول</option>
                                <option value="تم التسميع الثاني / مراجعة وتثبيت">تم التسميع الثاني / مراجعة وتثبيت</option>
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500">مستوى الإتقان والتجويد</label>
                              <select 
                                value={evaluationForm.mastery_level}
                                onChange={(e) => setEvaluationForm({ ...evaluationForm, mastery_level: e.target.value })}
                                className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-white font-bold"
                              >
                                <option value="ممتاز">ممتاز</option>
                                <option value="جيد جداً">جيد جداً</option>
                                <option value="جيد">جيد</option>
                                <option value="يحتاج متابعة">يحتاج متابعة</option>
                              </select>
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  id="first_rec_check"
                                  checked={evaluationForm.first_recitation_done}
                                  onChange={(e) => setEvaluationForm({ ...evaluationForm, first_recitation_done: e.target.checked })}
                                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded"
                                />
                                <label htmlFor="first_rec_check" className="text-xs font-bold text-slate-700">تم التسميع الأول</label>
                              </div>
                              {evaluationForm.first_recitation_done && (
                                <Input 
                                  type="date" 
                                  value={evaluationForm.first_recitation_date}
                                  onChange={(e) => setEvaluationForm({ ...evaluationForm, first_recitation_date: e.target.value })}
                                  className="h-10 text-xs bg-white"
                                />
                              )}
                            </div>

                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <input 
                                  type="checkbox" 
                                  id="second_rec_check"
                                  checked={evaluationForm.second_recitation_done}
                                  onChange={(e) => setEvaluationForm({ ...evaluationForm, second_recitation_done: e.target.checked })}
                                  className="w-4 h-4 text-emerald-600 border-slate-300 rounded"
                                />
                                <label htmlFor="second_rec_check" className="text-xs font-bold text-slate-700">تم التسميع الثاني / مراجعة وتثبيت</label>
                              </div>
                              {evaluationForm.second_recitation_done && (
                                <Input 
                                  type="date" 
                                  value={evaluationForm.second_recitation_date}
                                  onChange={(e) => setEvaluationForm({ ...evaluationForm, second_recitation_date: e.target.value })}
                                  className="h-10 text-xs bg-white"
                                />
                              )}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-500">ملاحظات على الطالب وتوجيهات لولي الأمر</label>
                              <textarea 
                                value={evaluationForm.teacher_notes}
                                onChange={(e) => setEvaluationForm({ ...evaluationForm, teacher_notes: e.target.value })}
                                placeholder="اكتب هنا توجيهات التجويد أو مواضع الأخطاء..."
                                className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-white min-h-[80px]"
                              />
                            </div>

                            <Button 
                              onClick={saveEvaluationRecord}
                              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-12 rounded-xl text-sm shadow"
                            >
                              <Save className="w-4 h-4 ml-1.5" /> حفظ التقييم والتأشير
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center py-12 text-slate-400 space-y-3">
                            <BookOpen className="w-10 h-10 mx-auto text-slate-300" />
                            <p className="text-xs">الرجاء اختيار سورة من القائمة المقابلة للبدء في تقييم حفظ الطالب وتسميعه.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. ADD GROUP (TEACHER SIDE) */}
                {activeSubTab === "add_group" && (
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-lg font-bold">إنشاء مجموعة أو حلقة تسميع جديدة</h3>
                      <p className="text-xs text-slate-500">تستطيع كمحفظ إنشاء مجموعاتك الفرعية الخاصة داخل برامج الإدارة.</p>
                    </div>

                    <form onSubmit={handleAddGroup} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold">اسم الحلقة</label>
                        <Input 
                          type="text" 
                          placeholder="مثال: حلقة الشيخ أحمد - مستوى ثاني..." 
                          value={groupForm.name}
                          onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value, teacher_id: String(currentUser.id) })}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500 font-bold">تابع لبرنامج تحفيظ</label>
                          <select 
                            value={groupForm.program_id} 
                            onChange={(e) => setGroupForm({ ...groupForm, program_id: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white"
                            required
                          >
                            <option value="">-- اختر البرنامج --</option>
                            {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-slate-500 font-bold">المستوى الدراسي</label>
                          <Input 
                            type="text" 
                            placeholder="مثال: جزء عم / جزء تبارك..." 
                            value={groupForm.level}
                            onChange={(e) => setGroupForm({ ...groupForm, level: e.target.value })}
                          />
                        </div>
                      </div>
                      <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-12 rounded-xl">
                        إنشاء الحلقة والبدء
                      </Button>
                    </form>
                  </div>
                )}

                {/* 3. SUPERVISOR MESSAGES */}
                {activeSubTab === "supervisor_messages" && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-lg font-bold">رسائل وملاحظات المشرف التربوي</h3>
                      <p className="text-xs text-slate-500">ملاحظات جودة التدريس والتقييمات الموجهة إليك من المشرف التربوي.</p>
                    </div>

                    <div className="space-y-4">
                      {messages.map((m) => (
                        <div key={m.id} className={`p-5 rounded-2xl border ${m.is_read ? "bg-slate-50 border-slate-200" : "bg-indigo-50/40 border-indigo-100"} space-y-3`}>
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full">{m.supervisor_name}</span>
                              <span className="text-xs text-slate-400 mr-2">{m.created_at}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {Array.from({ length: m.rating || 5 }).map((_, i) => (
                                <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                              ))}
                            </div>
                          </div>

                          <p className="text-xs text-slate-700 leading-relaxed font-medium">{m.message}</p>

                          <div className="flex justify-between items-center pt-2 border-t border-slate-200/40 text-xs">
                            <span className="text-slate-400">حلقة: {m.group_name || "عام"}</span>
                            {!m.is_read && (
                              <Button 
                                onClick={() => handleMarkMessageRead(m.id)}
                                size="sm" 
                                variant="outline" 
                                className="h-8 border-indigo-200 text-indigo-700 bg-white"
                              >
                                <Check className="w-3.5 h-3.5 ml-1" /> تحديد كمقروء
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      {messages.length === 0 && (
                        <div className="p-8 text-center text-slate-400 text-xs">لا توجد ملاحظات مرسلة إليك بعد.</div>
                      )}
                    </div>
                  </div>
                )}

              </div>
            </div>
          )}


          {/* C. SUPERVISOR DASHBOARD */}
          {currentUser.role === "supervisor" && (
            <div className="space-y-8">
              {/* Supervisor Tabs */}
              <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                {["overview", "monitor_teachers", "evaluate_teacher"].map((tab) => (
                  <Button
                    key={tab}
                    variant={activeSubTab === tab ? "default" : "ghost"}
                    onClick={() => setActiveSubTab(tab)}
                    className="rounded-xl px-5 text-xs font-bold"
                  >
                    {tab === "overview" && "لوحة الإشراف العام"}
                    {tab === "monitor_teachers" && "متابعة أداء المحفظين"}
                    {tab === "evaluate_teacher" && "تقييم وإرسال ملاحظة"}
                  </Button>
                ))}
              </div>

              {/* Main Workspace */}
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-200 min-h-[400px]">
                
                {/* 1. OVERVIEW */}
                {activeSubTab === "overview" && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-lg font-bold">لوحة الإشراف والمتابعة التربوية</h3>
                      <p className="text-xs text-slate-500">توجيه المحفظين ومتابعة مستوى جودة التحفيظ وسرعة الإنجاز.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
                        <h4 className="text-sm font-bold text-slate-900">صلاحيات وواجبات المشرف:</h4>
                        <ul className="text-xs text-slate-600 space-y-2.5 list-disc pr-4 leading-relaxed">
                          <li>الاطلاع والتحقق من تقدم حفظ الطلاب والتأشيرات المنفذة من قبل المحفظين.</li>
                          <li>تقييم جودة التجويد والتسميع من خلال الزيارات الميدانية وتسجيل التقييمات.</li>
                          <li>كتابة ملاحظات توجيهية تظهر فوراً في لوحة تحكم المحفظ لمساعدته في تحسين الأداء.</li>
                        </ul>
                      </div>

                      <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 space-y-4 flex flex-col justify-between">
                        <div>
                          <h4 className="text-sm font-bold text-indigo-950">مستويات الإنجاز والتميز:</h4>
                          <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                            يقيس هذا النظام نسبة الطلاب الحائزين على تقييم "ممتاز" و"جيد جداً" داخل الحلقات لتحديد المجموعات المتميزة والمحفظين الأكثر عطاءً.
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white p-3 rounded-xl border border-indigo-200">
                          بوابة المشرف التربوي مدرسة الطالع السعيد
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. MONITOR TEACHERS */}
                {activeSubTab === "monitor_teachers" && (
                  <div className="space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-lg font-bold">متابعة أداء المحفظين</h3>
                      <p className="text-xs text-slate-500">إحصائيات المعلمين، عدد الحلقات، وأعداد الطلاب المتابعين تحت إشرافهم.</p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                            <th className="p-3 font-bold">اسم المحفظ</th>
                            <th className="p-3 font-bold">رقم التواصل</th>
                            <th className="p-3 font-bold">عدد الحلقات التابعة له</th>
                            <th className="p-3 font-bold">إجمالي طلاب حلقاته</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-sm">
                          {teachers.map((t) => (
                            <tr key={t.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-bold text-slate-900">{t.name}</td>
                              <td className="p-3 font-mono text-xs">{t.phone || "غير محدد"}</td>
                              <td className="p-3 font-mono">{t.group_count} مجموعات</td>
                              <td className="p-3 font-mono font-bold text-emerald-700">{t.student_count} طلاب</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. EVALUATE TEACHER */}
                {activeSubTab === "evaluate_teacher" && (
                  <div className="max-w-2xl mx-auto space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-lg font-bold">إرسال تقييم وملاحظة إشرافية للمحفظ</h3>
                      <p className="text-xs text-slate-500">تظهر هذه الملاحظة فوراً في لوحة المحفظ المعني لمساعدته في المتابعة والتطوير.</p>
                    </div>

                    <form onSubmit={handleSendSupervisorNote} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold">المحفظ المستهدف</label>
                        <select 
                          value={supervisorNote.teacher_id}
                          onChange={(e) => setSupervisorNote({ ...supervisorNote, teacher_id: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white"
                          required
                        >
                          <option value="">-- اختر المحفظ --</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold">الحلقة / المجموعة المرتبطة (اختياري)</label>
                        <select 
                          value={supervisorNote.group_id}
                          onChange={(e) => setSupervisorNote({ ...supervisorNote, group_id: e.target.value })}
                          className="w-full border border-slate-200 rounded-lg p-2.5 text-sm bg-white"
                        >
                          <option value="">-- اختر الحلقة --</option>
                          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold">مستوى التقييم الإجمالي لحصيلة الزيارة</label>
                        <div className="flex items-center gap-1 bg-white p-3 rounded-lg border border-slate-200">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              type="button"
                              key={star}
                              onClick={() => setSupervisorNote({ ...supervisorNote, rating: star })}
                              className="focus:outline-none"
                            >
                              <Star className={`w-6 h-6 ${star <= supervisorNote.rating ? "text-amber-500 fill-amber-500" : "text-slate-200"}`} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-slate-500 font-bold">الملاحظة التربوية والتوجيهية بالتفصيل</label>
                        <textarea 
                          value={supervisorNote.message}
                          onChange={(e) => setSupervisorNote({ ...supervisorNote, message: e.target.value })}
                          placeholder="اكتب هنا توجيهاتك التربوية للشيخ..."
                          className="w-full border border-slate-200 rounded-xl p-3 text-xs bg-white min-h-[120px]"
                          required
                        />
                      </div>

                      <Button type="submit" className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-bold h-12 rounded-xl">
                        إرسال التقييم والملاحظة فوراً
                      </Button>
                    </form>
                  </div>
                )}

              </div>
            </div>
          )}


          {/* D. PARENT DASHBOARD */}
          {currentUser.role === "parent" && parentData && (
            <div className="space-y-8 animate-in fade-in duration-300">
              
              {/* Parent Summary Header Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-700">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-bold">الحلقة الحالية</div>
                    <div className="text-lg font-black text-slate-900">{parentData.group?.name || "غير مسجل بحلقة حالية"}</div>
                    <div className="text-xs text-slate-400">البرنامج: {parentData.group?.program_name || "مستمر"}</div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
                    <Users className="w-7 h-7" />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500 font-bold">المحفظ المسؤول</div>
                    <div className="text-lg font-black text-slate-900">{parentData.group?.teacher_name || "غير معين"}</div>
                    <div className="text-xs text-slate-400">هاتف: {parentData.group?.teacher_phone || "-"}</div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-700">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between text-xs font-bold text-slate-500">
                      <span>إجمالي تقدم الطالب</span>
                      <span>
                        {parentData.records?.length > 0
                          ? Math.round((parentData.records.filter((r: any) => ["تم التسميع الثاني / مراجعة وتثبيت", "تم التسميع الأول", "تم الحفظ"].includes(r.record_status)).length / parentData.records.length) * 100)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-600 h-full rounded-full" 
                        style={{ 
                          width: `${
                            parentData.records?.length > 0
                              ? Math.round((parentData.records.filter((r: any) => ["تم التسميع الثاني / مراجعة وتثبيت", "تم التسميع الأول", "تم الحفظ"].includes(r.record_status)).length / parentData.records.length) * 100)
                              : 0
                          }%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Detail Table */}
              <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">سجل تقدم الحفظ والتسميع التفصيلي</h3>
                  <p className="text-xs text-slate-500">شاشة عرض حية لسجل تسميع ابنكم. يتم تحديثها تلقائياً عند اعتماد المحفظ للتقييم.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                  <div className="lg:col-span-2 overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-right border-collapse">
                      <thead>
                        <tr className="bg-slate-50 text-xs text-slate-500 border-b border-slate-100">
                          <th className="p-3 font-bold">السورة / المقطع المقرر</th>
                          <th className="p-3 font-bold">الحالة الإنجازية</th>
                          <th className="p-3 font-bold">مستوى الإتقان</th>
                          <th className="p-3 font-bold">ملاحظات المحفظ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm">
                        {parentData.records?.map((rec: any) => (
                          <tr key={rec.id} className="hover:bg-slate-50/50">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{rec.surah_name}</div>
                              <div className="text-xs text-slate-500">{rec.section_name} • جزء {rec.juz}</div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                rec.record_status === "تم التسميع الثاني / مراجعة وتثبيت" ? "bg-green-100 text-green-800" :
                                rec.record_status === "تم التسميع الأول" ? "bg-emerald-100 text-emerald-800" :
                                rec.record_status === "تم الحفظ" ? "bg-teal-100 text-teal-800" :
                                rec.record_status === "جاري الحفظ" ? "bg-amber-100 text-amber-800" :
                                "bg-slate-100 text-slate-500"
                              }`}>
                                {rec.record_status || "لم يبدأ"}
                              </span>
                            </td>
                            <td className="p-3 font-bold text-xs text-slate-700">
                              {rec.mastery_level ? (
                                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full">{rec.mastery_level}</span>
                              ) : "-"}
                            </td>
                            <td className="p-3 text-xs text-slate-500 leading-relaxed max-w-xs">{rec.teacher_notes || "-"}</td>
                          </tr>
                        ))}
                        {(!parentData.records || parentData.records.length === 0) && (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-slate-400 text-xs">لا يوجد سجل تسميع حالي للطالب في البرنامج المقيد.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="bg-emerald-50/40 p-6 rounded-3xl border border-emerald-100 space-y-4">
                    <h4 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                      <Heart className="w-5 h-5 text-red-500 fill-red-500" />
                      رسالة تربوية لأولياء الأمور
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      شريكنا الفاضل ولي الأمر، إن تشجيعك المستمر في البيت ومتابعتك لأداء ابنك عبر هذه البوابة له الأثر الأعظم في إقباله على المصحف بحب وهمة عالية.
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      يرجى الاستماع لتلاوة ابنك بشكل مستمر ومراجعة الأخطاء الموصى بها من المحفظ. بارك الله فيكم وفي ذريتكم.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODALS */}
      {/* 1. MAPPING SECTIONS TO PROGRAM */}
      {showSectionMapper && selectedProgram && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold">تحديد السور والمقاطع المقررة</h3>
                <p className="text-xs text-slate-500">اختر السور والمقاطع المطلوبة من قائمة المكتبة المتاحة لبرنامج: {selectedProgram.name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowSectionMapper(false)}>إغلاق</Button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
              {programSections.map((sec) => (
                <div 
                  key={sec.id}
                  onClick={() => toggleProgramSectionMapping(sec.id)}
                  className={`p-3 rounded-2xl border text-right cursor-pointer flex justify-between items-center transition-all ${sec.selected === 1 ? "bg-emerald-50/70 border-emerald-500 shadow-sm" : "bg-white border-slate-200 hover:border-slate-300"}`}
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900">{sec.surah_name}</div>
                    <div className="text-[10px] text-slate-400">{sec.section_name} • جزء {sec.juz}</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${sec.selected === 1 ? "bg-emerald-600 border-emerald-600 text-white" : "border-slate-300"}`}>
                    {sec.selected === 1 && <Check className="w-3.5 h-3.5" />}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2">
              <Button onClick={saveProgramSectionMapping} className="bg-emerald-700 hover:bg-emerald-800">حفظ المقاطع والاعتماد</Button>
              <Button variant="outline" onClick={() => setShowSectionMapper(false)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ADD STUDENTS TO GROUP */}
      {showStudentSelector && selectedGroup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] max-w-4xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl border border-slate-100">
            <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-lg font-bold">تسجيل وإدراج طلاب في الحلقة</h3>
                <p className="text-xs text-slate-500">إضافة الطلاب إلى حلقة: {selectedGroup.name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowStudentSelector(false)}>إغلاق</Button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Enrolled Students */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">الطلاب المقيدين في هذه الحلقة حالياً:</h4>
                <div className="border border-slate-100 rounded-2xl divide-y divide-slate-100 bg-slate-50/30 max-h-[350px] overflow-y-auto">
                  {selectedGroupStudents.map((st) => (
                    <div key={st.id} className="p-3 flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-800">{st.name}</span>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:bg-red-50 h-8 px-2 rounded-lg"
                        onClick={() => handleRemoveStudentFromGroup(st.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5 ml-1" /> إزالة
                      </Button>
                    </div>
                  ))}
                  {selectedGroupStudents.length === 0 && (
                    <p className="p-6 text-center text-slate-400 text-xs">لا توجد طلاب مقيدين في هذه الحلقة بعد.</p>
                  )}
                </div>
              </div>

              {/* Right Column: Search & Add New Students from Admin Directory */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">اختيار طلاب من الدليل لإدراجهم:</h4>
                
                <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-white max-h-[350px] overflow-y-auto">
                  {students
                    .filter(st => !selectedGroupStudents.some(cur => cur.id === st.id))
                    .map((st) => (
                      <div key={st.id} className="p-3 flex justify-between items-center text-xs">
                        <div>
                          <div className="font-bold text-slate-800">{st.name}</div>
                          <div className="text-[10px] text-slate-400">{st.village || "بدون قرية"}</div>
                        </div>
                        <Button 
                          onClick={() => handleAddStudentToGroup(st.id)}
                          size="sm" 
                          className="h-8 bg-emerald-700 hover:bg-emerald-800"
                        >
                          <Plus className="w-3.5 h-3.5 ml-1" /> إدراج بالحلقة
                        </Button>
                      </div>
                    ))}
                  {students.filter(st => !selectedGroupStudents.some(cur => cur.id === st.id)).length === 0 && (
                    <p className="p-6 text-center text-slate-400 text-xs">تم إدراج كافة الطلاب المتاحين بالدليل.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-end">
              <Button onClick={() => setShowStudentSelector(false)} className="bg-emerald-700 hover:bg-emerald-800">إتمام التعديلات</Button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Sub-Component to fetch students of a teacher's group in real-time
function TeacherGroupStudentsList({ groupId, onEvaluate }: { groupId: number; onEvaluate: (student: any) => void }) {
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/memorization/admin/groups/${groupId}/students`)
      .then(res => res.json())
      .then(data => setStudentsList(data))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <div className="text-xs text-slate-400 animate-pulse">جاري تحميل أسماء طلاب الحلقة...</div>;

  return (
    <div className="space-y-1.5">
      {studentsList.map((student) => (
        <div key={student.id} className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm text-xs">
          <div>
            <div className="font-bold text-slate-800">{student.name}</div>
            <div className="text-[10px] text-slate-400">{student.village || "قرية الطالع"}</div>
          </div>
          <Button 
            onClick={() => onEvaluate(student)}
            size="sm" 
            variant="outline" 
            className="h-8 text-xs border-emerald-600 text-emerald-700 hover:bg-emerald-50"
          >
            <Award className="w-3.5 h-3.5 ml-1" /> تقييم وتسميع
          </Button>
        </div>
      ))}
      {studentsList.length === 0 && (
        <p className="text-[11px] text-slate-400">لا يوجد طلاب مسجلين في هذه المجموعة حالياً.</p>
      )}
    </div>
  );
}
