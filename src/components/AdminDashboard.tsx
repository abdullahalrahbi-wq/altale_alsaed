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
        const passedJuzCount = r.juz_details?.filter((j: any) => j.average >= 75).length || 0;
        const totalJuzCount = r.juz_count || 0;

        let status = "";
        let statusStyle = "fail";

        if (finalScore >= 75) {
          if (passedJuzCount === totalJuzCount) {
            status = "مجاز";
            statusStyle = "pass";
          } else if (passedJuzCount > 0) {
            // Find the highest level that matches or is below the passed juz count
            // We exclude the current level to ensure it's a "downgrade" as requested
            const targetLevel = competition?.levels
              ?.filter((l: any) => l.juz_count <= passedJuzCount && l.id !== r.level_id)
              ?.sort((a: any, b: any) => b.juz_count - a.juz_count)[0];
            
            if (targetLevel) {
              status = `ينزل إلى (${targetLevel.name})`;
            } else {
              status = `مجاز جزئياً (${passedJuzCount} أجزاء)`;
            }
            statusStyle = "pass";
          } else {
            status = "غير مجاز (لم ينجح في أي جزء)";
            statusStyle = "fail";
          }
        } else {
          status = "غير مجاز";
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
    <div className="space-y-8">
      <Tabs defaultValue="results" className="w-full">
        <TabsList className="bg-white border border-slate-200 mb-6">
          <TabsTrigger value="results" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            النتائج والتحليل
          </TabsTrigger>
          <TabsTrigger value="competitions" className="flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            المسابقات
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            إعداد المسابقة
          </TabsTrigger>
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-emerald-600" />
            إعدادات المنصة
          </TabsTrigger>
        </TabsList>

        <TabsContent value="results" className="space-y-6">
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-emerald-600 text-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-emerald-100">إجمالي المسجلين</CardDescription>
                <CardTitle className="text-4xl">{results.length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-blue-600 text-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-blue-100">تم تقييمهم</CardDescription>
                <CardTitle className="text-4xl">{results.filter(r => r.judge_count >= 2).length}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-amber-600 text-white">
              <CardHeader className="pb-2">
                <CardDescription className="text-amber-100">متوسط الدرجات</CardDescription>
                <CardTitle className="text-4xl">
                  {(results.reduce((acc, curr) => acc + (curr.average_score || 0), 0) / (results.filter(r => r.average_score).length || 1)).toFixed(1)}
                </CardTitle>
              </CardHeader>
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
                                <SelectValue />
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
                            const passedJuzCount = r.juz_details?.filter((j: any) => j.average >= 75).length || 0;
                            const totalJuzCount = r.juz_count || 0;

                            if (r.judge_count < 2) {
                              return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">قيد التقييم</Badge>;
                            }

                            if (finalScore >= 75) {
                              if (passedJuzCount === totalJuzCount) {
                                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">مجاز</Badge>;
                              } else if (passedJuzCount > 0) {
                                const targetLevel = competition?.levels
                                  ?.filter((l: any) => l.juz_count <= passedJuzCount && l.id !== r.level_id)
                                  ?.sort((a: any, b: any) => b.juz_count - a.juz_count)[0];
                                
                                return (
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                    {targetLevel ? `ينزل إلى (${targetLevel.name})` : `مجاز جزئياً (${passedJuzCount} أجزاء)`}
                                  </Badge>
                                );
                              } else {
                                return <Badge variant="destructive" className="text-[10px]">لم ينجح في أي جزء</Badge>;
                              }
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

        <TabsContent value="competitions" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">قائمة المسابقات</CardTitle>
                  <CardDescription>اختر مسابقة لعرض تفاصيلها أو تفعيلها</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-slate-100">
                    {allCompetitions.map((comp) => (
                      <button
                        key={comp.id}
                        onClick={() => setCompetition(comp)}
                        className={`w-full text-right p-4 hover:bg-slate-50 transition-colors flex items-center justify-between ${
                          competition?.id === comp.id ? "bg-emerald-50 border-r-4 border-emerald-600" : ""
                        }`}
                      >
                        <div>
                          <p className="font-bold text-slate-900">{comp.name}</p>
                          <p className="text-xs text-slate-500">{comp.year}</p>
                        </div>
                        {comp.active === 1 && (
                          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">نشطة</Badge>
                        )}
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              {competition ? (
                <Card>
                  <CardHeader className="bg-slate-50 border-b border-slate-100">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
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
                      <div className="flex gap-2">
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

        <TabsContent value="setup">
          <Card>
            <CardHeader>
              <CardTitle>إعداد مسابقة جديدة</CardTitle>
              <CardDescription>تحديد المستويات وبنود التقييم للمسابقة القادمة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>اسم المسابقة</Label>
                  <Input value={newComp.name} onChange={e => setNewComp({...newComp, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>السنة</Label>
                  <Input type="number" value={newComp.year} onChange={e => setNewComp({...newComp, year: parseInt(e.target.value)})} />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold">المستويات</h3>
                  <Button onClick={handleAddLevel} variant="outline" size="sm" className="flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    إضافة مستوى
                  </Button>
                </div>

                {newComp.levels.map((level, lIdx) => (
                  <Card key={lIdx} className="bg-slate-50 border-slate-200">
                    <CardContent className="pt-6 space-y-4">
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2 col-span-1">
                          <Label>اسم المستوى</Label>
                          <Input 
                            value={level.name} 
                            onChange={e => {
                              const levels = [...newComp.levels];
                              levels[lIdx].name = e.target.value;
                              setNewComp({...newComp, levels});
                            }} 
                          />
                        </div>
                        <div className="space-y-2 col-span-1">
                          <Label>الوصف</Label>
                          <Input 
                            value={level.description} 
                            onChange={e => {
                              const levels = [...newComp.levels];
                              levels[lIdx].description = e.target.value;
                              setNewComp({...newComp, levels});
                            }} 
                          />
                        </div>
                        <div className="space-y-2 col-span-1">
                          <Label>عدد الأجزاء</Label>
                          <Input 
                            type="number"
                            min="1"
                            value={level.juz_count || 1} 
                            onChange={e => {
                              const levels = [...newComp.levels];
                              (levels[lIdx] as any).juz_count = parseInt(e.target.value);
                              setNewComp({...newComp, levels});
                            }} 
                          />
                        </div>
                        <div className="space-y-2 col-span-1">
                          <Label>عدد المواضع</Label>
                          <Input 
                            type="number"
                            min="1"
                            value={(level as any).positions_count || 5} 
                            onChange={e => {
                              const levels = [...newComp.levels];
                              (levels[lIdx] as any).positions_count = parseInt(e.target.value);
                              setNewComp({...newComp, levels});
                            }} 
                          />
                        </div>
                        <div className="space-y-2 col-span-1">
                          <Label>الرتبة (1 للأقل)</Label>
                          <Input 
                            type="number"
                            value={level.rank || 0} 
                            onChange={e => {
                              const levels = [...newComp.levels];
                              (levels[lIdx] as any).rank = parseInt(e.target.value);
                              setNewComp({...newComp, levels});
                            }} 
                          />
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500 uppercase tracking-wider">بنود التقييم</Label>
                        {level.criteria.map((crit, cIdx) => (
                          <div key={cIdx} className="flex gap-2 items-center">
                            <Input 
                              placeholder="اسم البند" 
                              value={crit.name}
                              onChange={e => {
                                const levels = [...newComp.levels];
                                levels[lIdx].criteria[cIdx].name = e.target.value;
                                setNewComp({...newComp, levels});
                              }}
                            />
                            <Input 
                              type="number" 
                              placeholder="الدرجة" 
                              className="w-24" 
                              value={crit.max_score}
                              onChange={e => {
                                const levels = [...newComp.levels];
                                levels[lIdx].criteria[cIdx].max_score = parseInt(e.target.value);
                                setNewComp({...newComp, levels});
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button onClick={handleCreateCompetition} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-6 text-lg font-bold">
                حفظ وتفعيل المسابقة
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="global" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>الإعدادات العامة للمنصة</CardTitle>
              <CardDescription>تحكم في الشعار والاسم الرسمي للمنصة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div className="flex flex-col md:flex-row items-center gap-8 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100">
                <div className="relative group">
                  <div className="w-48 h-48 bg-white rounded-[2rem] shadow-xl border border-slate-200 flex items-center justify-center overflow-hidden">
                    {globalSettings.site_logo ? (
                      <img src={globalSettings.site_logo} alt="شعار المنصة الحالي" className="w-full h-full object-contain p-4" />
                    ) : (
                      <div className="text-slate-300 text-center p-4">
                        <Settings className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-xs">لا يوجد شعار مخصص</p>
                      </div>
                    )}
                  </div>
                  <Label 
                    htmlFor="logo-upload" 
                    className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-[2rem]"
                  >
                    <Plus className="w-8 h-8 mb-2" />
                    <span className="text-sm font-bold">تغيير الشعار</span>
                  </Label>
                  <input 
                    id="logo-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleLogoUpload}
                  />
                </div>
                <div className="flex-1 space-y-4">
                  <h3 className="text-2xl font-black text-slate-900">شعار المنصة الرسمي</h3>
                  <p className="text-slate-500 leading-relaxed max-w-md">
                    هذا الشعار سيظهر في أعلى جميع الصفحات (بوابة التسجيل، بوابة المقيمين، الصفحة الرئيسية). 
                    يفضل استخدام صورة بخلفية شفافة (PNG) وبقياسات مربعة.
                  </p>
                  <div className="flex gap-4">
                    <Button 
                      variant="outline" 
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      className="rounded-xl"
                    >
                      تحميل صورة جديدة
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
