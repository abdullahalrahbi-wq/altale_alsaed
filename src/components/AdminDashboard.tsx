import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { BarChart3, Plus, Trash2, Download, Settings, Users, FileText, Loader2, Trophy, CheckCircle, Edit2, Save, X } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function AdminDashboard() {
  const [results, setResults] = useState<any[]>([]);
  const [competition, setCompetition] = useState<any>(null);
  const [allCompetitions, setAllCompetitions] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [editingCompId, setEditingCompId] = useState<number | null>(null);
  const [editingContestantId, setEditingContestantId] = useState<number | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showContestantDeleteConfirm, setShowContestantDeleteConfirm] = useState<number | null>(null);
  const [editData, setEditData] = useState({ name: "", year: 0, logo_url: "" });
  const [editContestantData, setEditContestantData] = useState({
    name: "",
    civil_id: "",
    phone: "",
    town: "",
    gender: "male",
    level_id: ""
  });
  const [newComp, setNewComp] = useState({
    name: "مسابقة عام " + new Date().getFullYear(),
    year: new Date().getFullYear(),
    levels: [
      { 
        name: "المستوى الأول", 
        description: "حفظ 5 أجزاء", 
        rank: 1,
        juz_count: 1,
        criteria: [{ name: "الحفظ", max_score: 95 }, { name: "التجويد", max_score: 5 }] 
      }
    ]
  });

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    fetchResults();
    fetchActiveCompetition();
    fetchAllCompetitions();
    fetchGlobalSettings();
  }, []);

  const fetchGlobalSettings = () => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => setGlobalSettings(data));
  };

  const fetchActiveCompetition = () => {
    fetch("/api/competition/active")
      .then(res => res.json())
      .then(data => setCompetition(data));
  };

  const fetchAllCompetitions = () => {
    fetch("/api/admin/competitions")
      .then(res => res.json())
      .then(data => setAllCompetitions(data));
  };

  const fetchResults = () => {
    setLoading(true);
    fetch("/api/results")
      .then((res) => res.json())
      .then((data) => {
        setResults(data);
        setLoading(false);
      });
  };

  const handleAddLevel = () => {
    setNewComp({
      ...newComp,
      levels: [...newComp.levels, { name: "", description: "", rank: newComp.levels.length + 1, juz_count: 1, criteria: [{ name: "الحفظ", max_score: 95 }, { name: "التجويد", max_score: 5 }] }]
    });
  };

  const handleCreateCompetition = async () => {
    try {
      const res = await fetch("/api/admin/competition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newComp),
      });
      if (res.ok) {
        toast.success("تم إنشاء المسابقة وتفعيلها بنجاح");
        fetchActiveCompetition();
        fetchAllCompetitions();
      } else {
        toast.error("حدث خطأ أثناء إنشاء المسابقة");
      }
    } catch (error) {
      toast.error("فشل الاتصال بالخادم");
    }
  };

  const handleActivateCompetition = async (id: number) => {
    try {
      const res = await fetch("/api/admin/competition/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        toast.success("تم تفعيل المسابقة بنجاح");
        fetchActiveCompetition();
        fetchAllCompetitions();
        fetchResults();
      } else {
        toast.error("حدث خطأ أثناء تفعيل المسابقة");
      }
    } catch (error) {
      toast.error("فشل الاتصال بالخادم");
    }
  };

  const handleDeleteCompetition = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/competition/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("تم حذف المسابقة بنجاح");
        if (competition?.id === id) setCompetition(null);
        setShowDeleteConfirm(null);
        fetchAllCompetitions();
        fetchActiveCompetition();
        fetchResults();
      } else {
        const errorData = await res.json();
        toast.error(`حدث خطأ: ${errorData.error || "تعذر حذف المسابقة"}`);
      }
    } catch (error) {
      toast.error("فشل الاتصال بالخادم");
    }
  };

  const handleStartEdit = (comp: any) => {
    setEditingCompId(comp.id);
    setEditData({ name: comp.name, year: comp.year, logo_url: comp.logo_url || "" });
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch("/api/admin/competition/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingCompId, ...editData }),
      });
      if (res.ok) {
        toast.success("تم تحديث المسابقة بنجاح");
        setEditingCompId(null);
        fetchAllCompetitions();
        if (competition?.id === editingCompId) {
          setCompetition({ ...competition, ...editData });
        }
      } else {
        toast.error("حدث خطأ أثناء التحديث");
      }
    } catch (error) {
      toast.error("فشل الاتصال بالخادم");
    }
  };

  const handleStartEditContestant = (contestant: any) => {
    setEditingContestantId(contestant.id);
    setEditContestantData({
      name: contestant.name,
      civil_id: contestant.civil_id,
      phone: contestant.phone,
      town: contestant.town,
      gender: contestant.gender,
      level_id: contestant.level_id?.toString() || ""
    });
  };

  const handleSaveContestantEdit = async () => {
    try {
      const res = await fetch("/api/admin/contestant/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingContestantId, ...editContestantData }),
      });
      if (res.ok) {
        toast.success("تم تحديث بيانات المتسابق بنجاح");
        setEditingContestantId(null);
        fetchResults();
      } else {
        toast.error("حدث خطأ أثناء التحديث");
      }
    } catch (error) {
      toast.error("فشل الاتصال بالخادم");
    }
  };

  const handleDeleteContestant = async (id: number) => {
    try {
      const res = await fetch(`/api/admin/contestant/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("تم حذف المتسابق بنجاح");
        setShowContestantDeleteConfirm(null);
        fetchResults();
      } else {
        toast.error("حدث خطأ أثناء الحذف");
      }
    } catch (error) {
      toast.error("فشل الاتصال بالخادم");
    }
  };

  const exportToExcel = () => {
    // Group results by level
    const resultsByLevel = results.reduce((acc: Record<string, any[]>, r) => {
      const level = r.level_name || "غير محدد";
      if (!acc[level]) acc[level] = [];
      acc[level].push(r);
      return acc;
    }, {});

    const escape = (str: string | number | null | undefined) => {
      if (str === null || str === undefined) return "";
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Bottom" ss:Horizontal="Center"/>
   <Borders/>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Color="#000000"/>
   <Interior/>
   <NumberFormat/>
   <Protection/>
  </Style>
  <Style ss:ID="header">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Size="11" ss:Color="#000000" ss:Bold="1"/>
   <Interior ss:Color="#D9EAD3" ss:Pattern="Solid"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="pass">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Interior ss:Color="#C6EFCE" ss:Pattern="Solid"/>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Color="#006100" ss:Bold="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="fail">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Interior ss:Color="#FFC7CE" ss:Pattern="Solid"/>
   <Font ss:FontName="Arial" x:CharSet="178" ss:Color="#9C0006" ss:Bold="1"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
  <Style ss:ID="cell">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
  </Style>
 </Styles>
`;

    (Object.entries(resultsByLevel) as [string, any[]][]).forEach(([levelName, levelResults]) => {
      const maxJuzCount = Math.max(...levelResults.map(r => r.juz_details?.length || 0), 0);
      
      xml += ` <Worksheet ss:Name="${escape(levelName.substring(0, 31))}">
  <Table>
   <Row ss:Height="25">
    <Cell ss:StyleID="header"><Data ss:Type="String">الاسم</Data></Cell>
    <Cell ss:StyleID="header"><Data ss:Type="String">رقم الهاتف</Data></Cell>
    <Cell ss:StyleID="header"><Data ss:Type="String">البلد/الولاية</Data></Cell>
    <Cell ss:StyleID="header"><Data ss:Type="String">الرقم المدني</Data></Cell>
    <Cell ss:StyleID="header"><Data ss:Type="String">الجنس</Data></Cell>
    <Cell ss:StyleID="header"><Data ss:Type="String">المستوى</Data></Cell>
    <Cell ss:StyleID="header"><Data ss:Type="String">المقيمين أرقام هواتفهم</Data></Cell>`;

      for (let i = 1; i <= maxJuzCount; i++) {
        xml += `\n    <Cell ss:StyleID="header"><Data ss:Type="String">الجزء ${i}</Data></Cell>`;
      }

      xml += `
    <Cell ss:StyleID="header"><Data ss:Type="String">الدرجة النهائية</Data></Cell>
    <Cell ss:StyleID="header"><Data ss:Type="String">الأداء (الإجازة)</Data></Cell>
   </Row>`;

      levelResults.forEach(r => {
        const judges = (r.judge_info || []).map((j: any) => `${j.name} (${j.phone})`).join(" | ");
        const finalScore = r.average_score || 0;
        const passedJuz = r.juz_details?.filter((j: any) => j.average >= 75) || [];
        const passedJuzCount = passedJuz.length;
        const totalJuzCount = r.juz_count || 0;
        const passedAverage = passedJuzCount > 0 
          ? passedJuz.reduce((acc: number, curr: any) => acc + (curr.average || 0), 0) / passedJuzCount 
          : 0;

        let status = "";
        let statusStyle = "fail";

        if (passedJuzCount === totalJuzCount && finalScore >= 75) {
          status = "مجاز";
          statusStyle = "pass";
        } else if (passedJuzCount > 0) {
          // Find the highest level that matches or is below the passed juz count and respects the rank (higher rank number is lower level)
          const currentLevel = competition?.levels?.find((l: any) => l.id === r.level_id);
          const currentRank = currentLevel?.rank || 0;

          const targetLevel = competition?.levels
            ?.filter((l: any) => {
              if (l.id === r.level_id) return false;
              if (l.juz_count > passedJuzCount) return false;
              if (currentRank > 0 && l.rank && l.rank <= currentRank) return false;
              return true;
            })
            ?.sort((a: any, b: any) => {
              if (b.juz_count !== a.juz_count) {
                return b.juz_count - a.juz_count;
              }
              return (a.rank || 999) - (b.rank || 999);
            })[0];
          
          if (targetLevel) {
            status = `ينزل إلى (${targetLevel.name}) [معدل الأجزاء: ${passedAverage.toFixed(2)}]`;
          } else {
            status = `مجاز في (${passedJuzCount}) أجزاء [بمعدل: ${passedAverage.toFixed(2)}]`;
          }
          statusStyle = "pass";
        } else {
          status = finalScore >= 75 ? "غير مجاز (فشل في الأجزاء)" : "غير مجاز";
          statusStyle = "fail";
        }

        xml += `
   <Row ss:Height="20">
    <Cell ss:StyleID="cell"><Data ss:Type="String">${escape(r.name)}</Data></Cell>
    <Cell ss:StyleID="cell"><Data ss:Type="String">${escape(r.phone || "-")}</Data></Cell>
    <Cell ss:StyleID="cell"><Data ss:Type="String">${escape(r.town || "-")}</Data></Cell>
    <Cell ss:StyleID="cell"><Data ss:Type="String">${escape(r.civil_id)}</Data></Cell>
    <Cell ss:StyleID="cell"><Data ss:Type="String">${r.gender === "male" ? "ذكر" : "أنثى"}</Data></Cell>
    <Cell ss:StyleID="cell"><Data ss:Type="String">${escape(r.level_name)}</Data></Cell>
    <Cell ss:StyleID="cell"><Data ss:Type="String">${escape(judges || "-")}</Data></Cell>`;

        for (let i = 0; i < maxJuzCount; i++) {
          const juz = r.juz_details?.[i];
          if (juz) {
            const score = juz.average || 0;
            const style = score >= 75 ? "pass" : "fail";
            xml += `\n    <Cell ss:StyleID="${style}"><Data ss:Type="Number">${score.toFixed(1)}</Data></Cell>`;
          } else {
            xml += `\n    <Cell ss:StyleID="cell"><Data ss:Type="String">-</Data></Cell>`;
          }
        }

        xml += `
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="Number">${finalScore.toFixed(2)}</Data></Cell>
    <Cell ss:StyleID="${statusStyle}"><Data ss:Type="String">${status}</Data></Cell>
   </Row>`;
      });

      xml += `
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <DisplayRightToLeft/>
  </WorksheetOptions>
 </Worksheet>`;
    });

    xml += `</Workbook>`;

    const blob = new Blob([xml], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `نتائج_مفصلة_${competition?.name || "المسابقة"}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("logo", file);

    try {
      const res = await fetch("/api/admin/settings/logo", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setGlobalSettings({ ...globalSettings, site_logo: data.logoUrl });
        toast.success("تم تحديث الشعار بنجاح! يرجى تحديث الصفحة لرؤية التغييرات في كل مكان.");
        // We trigger a global event or just let them refresh
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error("فشل رفع الشعار");
      }
    } catch (error) {
      toast.error("خطأ في الاتصال بالخادم");
    }
  };
  const chartData = results
    .filter(r => r.average_score !== null)
    .slice(0, 10)
    .map(r => ({
      name: r.name,
      score: r.average_score
    }));

  return (
    <div className="max-w-6xl mx-auto space-y-10 py-4">
      <Tabs defaultValue="results" className="w-full flex flex-col items-center">
        <TabsList className="bg-white border border-slate-200 p-1 h-auto flex-wrap justify-center gap-2 rounded-2xl shadow-sm mb-10">
          <TabsTrigger 
            value="results" 
            className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none transition-all"
          >
            <FileText className="w-4 h-4" />
            <span className="font-bold">النتائج والتحليل</span>
          </TabsTrigger>
          <TabsTrigger 
            value="competitions" 
            className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none transition-all"
          >
            <Trophy className="w-4 h-4" />
            <span className="font-bold">المسابقات</span>
          </TabsTrigger>
          <TabsTrigger 
            value="setup" 
            className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none transition-all"
          >
            <Settings className="w-4 h-4" />
            <span className="font-bold">إعداد المسابقة</span>
          </TabsTrigger>
          <TabsTrigger 
            value="global" 
            className="flex items-center gap-2 px-6 py-3 rounded-xl data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700 data-[state=active]:shadow-none transition-all"
          >
            <Settings className="w-4 h-4 text-emerald-600" />
            <span className="font-bold">إعدادات المنصة</span>
          </TabsTrigger>
        </TabsList>

        <div className="w-full">
          <TabsContent value="results" className="space-y-6 focus-visible:outline-none focus-visible:ring-0">
          {competition && (
            <Card className="bg-white border-slate-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5 text-slate-600" />
                  المسابقة النشطة: {competition.name}
                </CardTitle>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl">
                    <p className="text-xs text-emerald-700 font-bold uppercase tracking-wider mb-1">رمز التسجيل</p>
                    <p className="text-2xl font-mono font-black text-emerald-900">{competition.registration_code}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl">
                    <p className="text-xs text-blue-700 font-bold uppercase tracking-wider mb-1">رمز التقييم</p>
                    <p className="text-2xl font-mono font-black text-blue-900">{competition.judging_code}</p>
                  </div>
                </div>
              </CardHeader>
            </Card>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 select-none">
            {/* Card 1: Registrants */}
            <Card className="bg-white border border-slate-200 shadow-sm border-r-4 border-r-emerald-500 transition-all hover:shadow-md hover:-translate-y-1 duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-black text-slate-500">إجمالي المسجلين</p>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">{results.length}</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                    <Users className="w-6 h-6" />
                  </div>
                </div>
                <div className="pt-4 border-t border-slate-100 mt-4 text-[10px] sm:text-xs text-slate-500 flex items-center gap-1.5 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>الطلاب والطلبات في قائمة التنافس النشطة</span>
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Evaluated */}
            <Card className="bg-white border border-slate-200 shadow-sm border-r-4 border-r-blue-500 transition-all hover:shadow-md hover:-translate-y-1 duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-black text-slate-500">تم تقييمهم (من المقيمَيْن)</p>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
                      {results.filter(r => r.judge_count >= 2).length}
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-100 mt-3 flex flex-col gap-1">
                  <div className="text-[10px] sm:text-xs text-slate-500 flex justify-between font-bold">
                    <span>تقييم كلي مكتمل (المقيم 1 وبوابة 2):</span>
                    <span className="text-blue-600 font-black">{results.filter(r => r.judge_count >= 2).length}</span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 flex justify-between">
                    <span>تحت التقييم (مقيم واحد فقط):</span>
                    <span className="font-bold text-slate-600">{results.filter(r => r.judge_count === 1).length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Card 3: Percentage */}
            <Card className="bg-white border border-slate-200 shadow-sm border-r-4 border-r-amber-500 transition-all hover:shadow-md hover:-translate-y-1 duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-black text-slate-500">نسبة الطلاب المقيّمِين</p>
                    <p className="text-3xl sm:text-4xl font-black text-slate-900 mt-2">
                      {results.length > 0 
                        ? ((results.filter(r => r.judge_count >= 2).length / results.length) * 100).toFixed(1) 
                        : "0.0"} %
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                    <BarChart3 className="w-6 h-6" />
                  </div>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="mt-3">
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                      style={{ 
                        width: `${results.length > 0 
                          ? Math.min(100, (results.filter(r => r.judge_count >= 2).length / results.length) * 100) 
                          : 0}%` 
                      }}
                    />
                  </div>
                  <p className="text-[9px] sm:text-[10px] text-amber-700/85 font-black mt-1 text-right">
                    نسبة الإنجاز مقاسة على اكتمال التقييمين للطلاب المسجلين
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                أعلى 10 متسابقين
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[300px] w-full">
              {isMounted && chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? "#10b981" : "#059669"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  {chartData.length === 0 ? "لا توجد بيانات كافية للعرض" : "جاري تحميل الرسم البياني..."}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>جدول النتائج التفصيلي</CardTitle>
                <CardDescription>عرض وتصدير نتائج جميع المتسابقين</CardDescription>
              </div>
              <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2 bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100">
                <Download className="w-4 h-4" />
                تصدير ملف Excel تفصيلي
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>الاسم</TableHead>
                    <TableHead>الجنس</TableHead>
                    <TableHead>المستوى</TableHead>
                    <TableHead>البلدة</TableHead>
                    <TableHead className="text-center">المقيمين</TableHead>
                    <TableHead className="text-center">تفاصيل الأجزاء</TableHead>
                    <TableHead className="text-center">النتيجة النهائية</TableHead>
                    <TableHead className="text-center">الحالة</TableHead>
                    <TableHead className="text-left">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-emerald-600" />
                      </TableCell>
                    </TableRow>
                  ) : results.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-slate-500">لا توجد بيانات حالياً</TableCell>
                    </TableRow>
                  ) : (
                    results.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">
                          {editingContestantId === r.id ? (
                            <Input 
                              value={editContestantData.name} 
                              onChange={(e) => setEditContestantData({ ...editContestantData, name: e.target.value })}
                              className="h-8"
                            />
                          ) : r.name}
                        </TableCell>
                        <TableCell>
                          {editingContestantId === r.id ? (
                            <Select 
                              value={editContestantData.gender} 
                              onValueChange={(val) => setEditContestantData({ ...editContestantData, gender: val })}
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue>
                                  {editContestantData.gender === "male" ? "ذكر" : editContestantData.gender === "female" ? "أنثى" : "اختر الجنس"}
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="male">ذكر</SelectItem>
                                <SelectItem value="female">أنثى</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (r.gender === 'male' ? 'ذكر' : 'أنثى')}
                        </TableCell>
                        <TableCell>
                          {editingContestantId === r.id ? (
                            <Input 
                              value={editContestantData.civil_id} 
                              onChange={(e) => setEditContestantData({ ...editContestantData, civil_id: e.target.value })}
                              className="h-8"
                            />
                          ) : r.level_name}
                        </TableCell>
                        <TableCell>
                          {editingContestantId === r.id ? (
                            <Input 
                              value={editContestantData.town} 
                              onChange={(e) => setEditContestantData({ ...editContestantData, town: e.target.value })}
                              className="h-8"
                            />
                          ) : r.town}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${r.judge_count >= 2 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"}`}>
                              {r.judge_count} / 2
                            </div>
                            {r.judge_info && r.judge_info.length > 0 && (
                              <div className="flex flex-col gap-0.5 mt-1">
                                {r.judge_info.map((j: any) => (
                                  <div key={j.id} className="text-[9px] text-slate-500 whitespace-nowrap">
                                    {j.name} ({j.phone})
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex flex-col gap-1">
                            {r.juz_details?.map((juz: any, idx: number) => (
                              <div key={idx} className="text-[10px] bg-slate-50 p-1 rounded border border-slate-100">
                                <span className="font-bold">ج{idx+1}:</span> 
                                <span className="text-blue-600"> م1:{juz.judge1 || 0}</span> + 
                                <span className="text-emerald-600"> م2:{juz.judge2 || 0}</span> = 
                                <span className="font-bold"> مت:{juz.average.toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-bold text-lg text-emerald-700">
                          {r.average_score ? r.average_score.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-center">
                          {(() => {
                            const finalScore = r.average_score || 0;
                            const passedJuz = r.juz_details?.filter((j: any) => j.average >= 75) || [];
                            const passedJuzCount = passedJuz.length;
                            const totalJuzCount = r.juz_count || 0;
                            const passedAverage = passedJuzCount > 0 
                              ? passedJuz.reduce((acc: number, curr: any) => acc + (curr.average || 0), 0) / passedJuzCount 
                              : 0;

                            if (r.judge_count < 2) {
                              return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">قيد التقييم</Badge>;
                            }

                            if (passedJuzCount === totalJuzCount && finalScore >= 75) {
                              return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">مجاز</Badge>;
                            } else if (passedJuzCount > 0) {
                              const currentLevel = competition?.levels?.find((l: any) => l.id === r.level_id);
                              const currentRank = currentLevel?.rank || 0;

                              const targetLevel = competition?.levels
                                ?.filter((l: any) => {
                                  if (l.id === r.level_id) return false;
                                  if (l.juz_count > passedJuzCount) return false;
                                  if (currentRank > 0 && l.rank && l.rank <= currentRank) return false;
                                  return true;
                                })
                                ?.sort((a: any, b: any) => {
                                  if (b.juz_count !== a.juz_count) {
                                    return b.juz_count - a.juz_count;
                                  }
                                  return (a.rank || 999) - (b.rank || 999);
                                })[0];
                              
                              return (
                                <div className="flex flex-col gap-1 items-center">
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                    {targetLevel ? `ينزل إلى (${targetLevel.name})` : `مجاز في (${passedJuzCount}) أجزاء`}
                                  </Badge>
                                  <span className="text-[9px] text-slate-500 font-bold">معدل الإجازة: {passedAverage.toFixed(1)}</span>
                                </div>
                              );
                            } else {
                              return <Badge variant="destructive">غير مجاز</Badge>;
                            }
                          })()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {editingContestantId === r.id ? (
                              <>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={handleSaveContestantEdit}>
                                  <Save className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingContestantId(null)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleStartEditContestant(r)}>
                                  <Edit2 className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => setShowContestantDeleteConfirm(r.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="competitions" className="space-y-10 focus-visible:outline-none focus-visible:ring-0">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-4">
              <Card className="border-emerald-100 shadow-sm">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-xl">البحث واختيار المسابقة</CardTitle>
                  <CardDescription>اختر مسابقة من القائمة لعرض تفاصيلها أو تفعيلها</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap justify-center gap-3">
                    {allCompetitions.map((comp) => (
                      <Button
                        key={comp.id}
                        variant={competition?.id === comp.id ? "default" : "outline"}
                        onClick={() => setCompetition(comp)}
                        className={`h-auto py-3 px-6 rounded-2xl flex flex-col items-center gap-1 transition-all ${
                          competition?.id === comp.id ? "bg-emerald-600 scale-105 shadow-lg shadow-emerald-100" : "hover:bg-emerald-50 hover:border-emerald-200"
                        }`}
                      >
                        <span className="font-bold text-base">{comp.name}</span>
                        <span className={`text-[10px] ${competition?.id === comp.id ? "text-emerald-100" : "text-slate-400"}`}>{comp.year}</span>
                        {comp.active === 1 && (
                          <Badge className="mt-1 bg-white/20 text-white border-none text-[8px] px-1.5 h-4">نشطة</Badge>
                        )}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              {competition ? (
                <Card className="border-slate-200 shadow-xl overflow-hidden rounded-[2.5rem]">
                  <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8 text-center">
                    <div className="space-y-4">
                        {editingCompId === competition.id ? (
                          <div className="space-y-4 max-w-md">
                            <div className="space-y-2">
                              <Label>اسم المسابقة</Label>
                              <Input 
                                value={editData.name} 
                                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>السنة</Label>
                              <Input 
                                type="number"
                                value={editData.year} 
                                onChange={(e) => setEditData({ ...editData, year: parseInt(e.target.value) })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>رابط الشعار (URL)</Label>
                              <Input 
                                placeholder="انسخ رابط الشعار هنا..."
                                value={editData.logo_url} 
                                onChange={(e) => setEditData({ ...editData, logo_url: e.target.value })}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button onClick={handleSaveEdit} className="bg-emerald-600">
                                <Save className="w-4 h-4 ml-2" />
                                حفظ التعديلات
                              </Button>
                              <Button variant="outline" onClick={() => setEditingCompId(null)}>
                                <X className="w-4 h-4 ml-2" />
                                إلغاء
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <CardTitle className="text-2xl">{competition.name}</CardTitle>
                            <CardDescription>تفاصيل المسابقة ورموز الوصول</CardDescription>
                          </>
                        )}
                      </div>
                      <div className="flex justify-center gap-2">
                        {editingCompId !== competition.id && (
                          <Button 
                            variant="outline" 
                            size="icon"
                            onClick={() => handleStartEdit(competition)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setShowDeleteConfirm(competition.id)}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        {competition.active === 0 && (
                          <Button 
                            onClick={() => handleActivateCompetition(competition.id)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            تفعيل هذه المسابقة
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                  <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl">
                        <p className="text-xs text-emerald-700 font-bold uppercase tracking-widest mb-2">رمز التسجيل</p>
                        <p className="text-4xl font-mono font-black text-emerald-900">{competition.registration_code}</p>
                        <p className="text-xs text-emerald-600 mt-4">يُعطى هذا الرمز للمتسابقين ليتمكنوا من التسجيل</p>
                      </div>
                      <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl">
                        <p className="text-xs text-blue-700 font-bold uppercase tracking-widest mb-2">رمز التقييم</p>
                        <p className="text-4xl font-mono font-black text-blue-900">{competition.judging_code}</p>
                        <p className="text-xs text-blue-600 mt-4">يُعطى هذا الرمز للمقيمين للوصول إلى لوحة التحكيم</p>
                      </div>
                    </div>

                    <div className="pt-4">
                      <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-slate-500" />
                        إحصائيات سريعة
                      </h4>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">السنة</p>
                          <p className="text-xl font-bold text-slate-900">{competition.year}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">الحالة</p>
                          <p className="text-xl font-bold text-slate-900">{competition.active === 1 ? "نشطة" : "مؤرشفة"}</p>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                          <p className="text-[10px] text-slate-500 uppercase font-bold">المعرف</p>
                          <p className="text-xl font-bold text-slate-900">#{competition.id}</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="h-full flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-slate-400">
                  <Trophy className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-xl font-medium">اختر مسابقة من القائمة لعرض التفاصيل</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <Card className="max-w-md w-full animate-in zoom-in-95 duration-200">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8" />
                </div>
                <CardTitle className="text-xl">تأكيد الحذف</CardTitle>
                <CardDescription>
                  هل أنت متأكد من حذف هذه المسابقة؟ سيتم حذف جميع المتسابقين والنتائج المرتبطة بها نهائياً.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button 
                  variant="destructive" 
                  className="flex-1 h-12 text-lg"
                  onClick={() => handleDeleteCompetition(showDeleteConfirm)}
                >
                  نعم، احذف المسابقة
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 text-lg"
                  onClick={() => setShowDeleteConfirm(null)}
                >
                  إلغاء
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {showContestantDeleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <Card className="max-w-md w-full animate-in zoom-in-95 duration-200">
              <CardHeader className="text-center">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-8 h-8" />
                </div>
                <CardTitle className="text-xl">تأكيد حذف المتسابق</CardTitle>
                <CardDescription>
                  هل أنت متأكد من حذف هذا المتسابق وجميع تقييماته؟ لا يمكن التراجع عن هذه العملية.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex gap-3">
                <Button 
                  variant="destructive" 
                  className="flex-1 h-12 text-lg"
                  onClick={() => handleDeleteContestant(showContestantDeleteConfirm)}
                >
                  نعم، احذف
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 text-lg"
                  onClick={() => setShowContestantDeleteConfirm(null)}
                >
                  إلغاء
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        <TabsContent value="setup" className="space-y-10 focus-visible:outline-none focus-visible:ring-0">
          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8 text-center uppercase tracking-wider">
                <CardTitle className="text-2xl font-black">إعداد مسابقة قرآنية جديدة</CardTitle>
                <CardDescription>أدخل تفاصيل المسابقة والمستويات والمعايير</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 text-right">
                    <Label className="text-slate-700 font-bold mr-1">اسم المسابقة</Label>
                    <Input 
                      value={newComp.name} 
                      onChange={(e) => setNewComp({ ...newComp, name: e.target.value })}
                      className="rounded-2xl h-12 border-slate-200 bg-slate-50 focus:bg-white transition-colors"
                      placeholder="مثال: مسابقة ربيع القلوب"
                    />
                  </div>
                  <div className="space-y-2 text-right">
                    <Label className="text-slate-700 font-bold mr-1">السنة</Label>
                    <Input 
                      type="number" 
                      value={newComp.year} 
                      onChange={(e) => setNewComp({ ...newComp, year: parseInt(e.target.value) })}
                      className="rounded-2xl h-12 border-slate-200 bg-slate-50 focus:bg-white transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-6 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-slate-900 border-r-4 border-emerald-500 pr-3">المستويات والمعايير</h3>
                    <Button 
                      variant="outline" 
                      onClick={handleAddLevel}
                      className="rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                    >
                      <Plus className="w-4 h-4 ml-2" />
                      إضافة مستوى جديد
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    {newComp.levels.map((level, lIndex) => (
                      <div key={lIndex} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 space-y-6 relative group border-r-4 border-r-slate-200 hover:border-r-emerald-400 transition-all">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2 text-right">
                            <Label className="text-xs font-bold text-slate-500 mr-2">اسم المستوى</Label>
                            <Input 
                              value={level.name} 
                              onChange={(e) => {
                                const levels = [...newComp.levels];
                                levels[lIndex].name = e.target.value;
                                setNewComp({ ...newComp, levels });
                              }}
                              className="rounded-xl bg-white border-slate-100"
                              placeholder="مثال: المستوى الأول"
                            />
                          </div>
                          <div className="space-y-2 text-right">
                            <Label className="text-xs font-bold text-slate-500 mr-2">وصف المستوى</Label>
                            <Input 
                              value={level.description} 
                              onChange={(e) => {
                                const levels = [...newComp.levels];
                                levels[lIndex].description = e.target.value;
                                setNewComp({ ...newComp, levels });
                              }}
                              className="rounded-xl bg-white border-slate-100"
                              placeholder="مثال: حفظ 5 أجزاء"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-2 text-right">
                              <Label className="text-xs font-bold text-slate-500 mr-2">الأجزاء</Label>
                              <Input 
                                type="number"
                                value={level.juz_count} 
                                onChange={(e) => {
                                  const levels = [...newComp.levels];
                                  levels[lIndex].juz_count = parseInt(e.target.value);
                                  setNewComp({ ...newComp, levels });
                                }}
                                className="rounded-xl bg-white border-slate-100"
                              />
                            </div>
                            <div className="space-y-2 text-right">
                              <Label className="text-xs font-bold text-slate-500 mr-2">الرتبة</Label>
                              <Input 
                                type="number"
                                value={level.rank || 0} 
                                onChange={(e) => {
                                  const levels = [...newComp.levels];
                                  (levels[lIndex] as any).rank = parseInt(e.target.value);
                                  setNewComp({ ...newComp, levels });
                                }}
                                className="rounded-xl bg-white border-slate-100"
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <Label className="text-xs font-bold text-slate-400 mr-2 uppercase tracking-widest">معايير التقييم لهذا المستوى</Label>
                          {level.criteria.map((crit, cIndex) => (
                            <div key={cIndex} className="flex gap-4 items-end bg-white/50 p-3 rounded-xl border border-slate-200/50">
                              <div className="flex-1 space-y-1 text-right">
                                <Label className="text-[10px] text-slate-500 mr-1">المعيار</Label>
                                <Input 
                                  value={crit.name} 
                                  onChange={(e) => {
                                    const levels = [...newComp.levels];
                                    levels[lIndex].criteria[cIndex].name = e.target.value;
                                    setNewComp({ ...newComp, levels });
                                  }}
                                  className="h-9 rounded-lg"
                                />
                              </div>
                              <div className="w-24 space-y-1 text-right">
                                <Label className="text-[10px] text-slate-500 mr-1">الدرجة القصوى</Label>
                                <Input 
                                  type="number"
                                  value={crit.max_score} 
                                  onChange={(e) => {
                                    const levels = [...newComp.levels];
                                    levels[lIndex].criteria[cIndex].max_score = parseInt(e.target.value);
                                    setNewComp({ ...newComp, levels });
                                  }}
                                  className="h-9 rounded-lg"
                                />
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-slate-300 hover:text-red-500"
                                onClick={() => {
                                  const levels = [...newComp.levels];
                                  levels[lIndex].criteria = levels[lIndex].criteria.filter((_, i) => i !== cIndex);
                                  setNewComp({ ...newComp, levels });
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          ))}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => {
                              const levels = [...newComp.levels];
                              levels[lIndex].criteria.push({ name: "", max_score: 5 });
                              setNewComp({ ...newComp, levels });
                            }}
                            className="text-emerald-600 hover:bg-emerald-50 text-xs"
                          >
                            + إضافة معيار تقييم
                          </Button>
                        </div>

                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="absolute -left-2 -top-2 bg-white shadow-sm border border-slate-100 text-red-500 rounded-full hover:bg-red-50"
                          onClick={() => {
                            const levels = newComp.levels.filter((_, i) => i !== lIndex);
                            setNewComp({ ...newComp, levels });
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 flex justify-center">
                  <Button 
                    onClick={handleCreateCompetition}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl h-16 px-12 text-xl font-black shadow-xl shadow-emerald-100 transition-transform hover:scale-105 active:scale-95"
                  >
                    إنشاء المسابقة وتفعيلها الآن
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="global" className="space-y-10 focus-visible:outline-none focus-visible:ring-0">
          <div className="max-w-4xl mx-auto space-y-8">
            <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8 text-center uppercase tracking-wider">
                <CardTitle className="text-2xl font-black">الإعدادات العامة للمنصة</CardTitle>
                <CardDescription>تحكم في الشعار والاسم الرسمي للمنصة</CardDescription>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex flex-col md:flex-row items-center gap-12 bg-slate-50 p-10 rounded-[3rem] border border-slate-100">
                  <div className="relative group shrink-0">
                    <div className="w-56 h-56 bg-white rounded-[2.5rem] shadow-2xl border border-slate-200 flex items-center justify-center overflow-hidden p-6 transition-transform group-hover:scale-105">
                      {globalSettings.site_logo ? (
                        <img src={globalSettings.site_logo} alt="شعار المنصة الحالي" className="w-full h-full object-contain" />
                      ) : (
                        <div className="text-slate-300 text-center">
                          <Settings className="w-16 h-16 mx-auto mb-2 opacity-20" />
                          <p className="text-xs">لا يوجد شعار</p>
                        </div>
                      )}
                    </div>
                    <Label 
                      htmlFor="logo-upload" 
                      className="absolute inset-0 bg-black/60 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer rounded-[2.5rem] backdrop-blur-sm"
                    >
                      <Plus className="w-10 h-10 mb-2" />
                      <span className="text-sm font-black uppercase tracking-widest">تغيير الشعار</span>
                    </Label>
                    <input 
                      id="logo-upload" 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleLogoUpload}
                    />
                  </div>
                  <div className="flex-1 space-y-6 text-right md:text-right">
                    <div className="space-y-2">
                      <h3 className="text-3xl font-black text-slate-900">شعار المنصة الرسمي</h3>
                      <div className="w-20 h-1.5 bg-emerald-500 rounded-full"></div>
                    </div>
                    <p className="text-slate-500 leading-relaxed text-lg italic">
                      هذا الشعار سيظهر في أعلى جميع الصفحات (بوابة التسجيل، بوابة المقيمين، الصفحة الرئيسية). 
                      يفضل استخدام صورة بخلفية شفافة (PNG) وبقياسات مربعة لضمان أفضل ظهور.
                    </p>
                    <Button 
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      className="bg-white border-2 border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-emerald-200 hover:text-emerald-700 rounded-2xl h-14 px-8 font-bold transition-all shadow-sm"
                    >
                      <Download className="w-5 h-5 ml-2" />
                      تحميل شعار جديد من الجهاز
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </div>
    </Tabs>
  </div>
);
}
