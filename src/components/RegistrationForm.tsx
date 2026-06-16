import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { UserPlus, Loader2, Table as TableIcon, Edit2, Trash2, Save, X } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function RegistrationForm() {
  const [competition, setCompetition] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState({
    name: "",
    civil_id: "",
    phone: "",
    town: "",
    gender: "",
    level_id: ""
  });
  const [formData, setFormData] = useState({
    name: "",
    civil_id: "",
    phone: "",
    town: "",
    gender: "",
    level_id: "",
  });

  // Intel Search States for Excel Pre-Registrations
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearchChange = async (val: string) => {
    setSearchQuery(val);
    if (!val.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/imported-contestants/search?competition_id=${competition?.id}&q=${encodeURI(val)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data);
      }
    } catch (e) {
      console.error("Error searching imported contestants", e);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectPreRegistered = (item: any) => {
    // Try to find if level_name matches any level in competition.levels:
    let matchedLevelId = "";
    if (item.level_name) {
      const matchedLevel = competition.levels?.find((l: any) => 
        l.name.toLowerCase().includes(item.level_name.toLowerCase()) || 
        item.level_name.toLowerCase().includes(l.name.toLowerCase())
      );
      if (matchedLevel) {
        matchedLevelId = matchedLevel.id.toString();
      }
    }

    setFormData({
      name: item.name,
      civil_id: item.civil_id,
      phone: item.phone,
      town: item.town,
      gender: item.gender === "female" ? "female" : "male",
      level_id: matchedLevelId
    });

    setSearchQuery("");
    setSearchResults([]);
    toast.success(`تم استدعاء بيانات المتسابق "${item.name}" تلقائياً! يرجى التحقق من الحقول ثم تأكيد التسجيل.`);
  };

  const fetchData = () => {
    fetch("/api/competition/active")
      .then((res) => res.json())
      .then((data) => {
        setCompetition(data);
        setLoading(false);
      });
    
    fetch("/api/my-registrations")
      .then(res => res.json())
      .then(data => setRegistrations(data));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.gender) {
      toast.error("يرجى اختيار الجنس");
      return;
    }
    if (!formData.level_id) {
      toast.error("يرجى اختيار مستوى الحفظ");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          competition_id: competition.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("تم التسجيل بنجاح!");
        setFormData({ name: "", civil_id: "", phone: "", town: "", gender: "", level_id: "" });
        fetchData(); // Refresh table
      } else {
        toast.error(data.error || "حدث خطأ أثناء التسجيل");
      }
    } catch (error) {
      toast.error("فشل الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (reg: any) => {
    setEditingId(reg.id);
    setEditData({
      name: reg.name,
      civil_id: reg.civil_id,
      phone: reg.phone,
      town: reg.town,
      gender: reg.gender,
      level_id: reg.level_id.toString()
    });
  };

  const handleSaveEdit = async () => {
    try {
      const res = await fetch("/api/admin/contestant/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editData }),
      });
      if (res.ok) {
        toast.success("تم تحديث البيانات بنجاح");
        setEditingId(null);
        fetchData();
      } else {
        toast.error("حدث خطأ أثناء التحديث");
      }
    } catch (error) {
      toast.error("فشل الاتصال بالخادم");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا التسجيل؟")) return;
    try {
      const res = await fetch(`/api/admin/contestant/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("تم حذف التسجيل بنجاح");
        fetchData();
      } else {
        toast.error("حدث خطأ أثناء الحذف");
      }
    } catch (error) {
      toast.error("فشل الاتصال بالخادم");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (!competition) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="text-center">لا توجد مسابقة نشطة حالياً</CardTitle>
          <CardDescription className="text-center">يرجى العودة لاحقاً عند فتح باب التسجيل.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-emerald-50/50 border-b border-slate-100">
          <CardTitle className="text-2xl font-bold text-emerald-900 flex items-center gap-2">
            <UserPlus className="w-6 h-6" />
            التسجيل في {competition.name} ({competition.year})
          </CardTitle>
          <CardDescription>يرجى إدخال البيانات بدقة للمشاركة في المسابقة.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-6">
            {/* Intelligent Pre-registrants Search Section */}
            <div className="bg-emerald-50/50 p-5 border border-emerald-100 rounded-2xl space-y-3 relative">
              <Label className="text-emerald-950 font-bold block text-sm flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                البحث وعرض بيانات المتسابقين (الملف المستورد)
              </Label>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                مسجل البيانات: ابحث عن اسم المتسابق أو رقمه المدني أدناه، وعند اختياره ستكتمل بياناته تلقائياً في الخانات ومستوى الفئة الحالي. تأكد منها ثم اضغط "تأكيد التسجيل".
              </p>
              
              <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="ابحث بالاسم أو الرقم المدني (مثلاً: علي...)"
                  className="bg-white border-slate-200 pl-10 pr-4 py-2.5 h-11 text-sm focus-visible:ring-emerald-500 rounded-xl"
                />
                
                {searching && (
                  <div className="absolute left-3 top-3.5">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                  </div>
                )}
              </div>

              {/* Suggestions dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute left-4 right-4 top-full mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto divide-y divide-slate-100 p-1">
                  {searchResults.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectPreRegistered(item)}
                      className="w-full text-right px-4 py-3 hover:bg-emerald-50/50 transition-colors duration-150 flex flex-col gap-1 items-start cursor-pointer rounded-xl first:mt-0 mt-0.5"
                    >
                      <span className="font-extrabold text-slate-900 text-sm">{item.name}</span>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-0.5 font-mono">
                        {item.civil_id && <span>الرقم المدني: {item.civil_id}</span>}
                        {item.phone && <span>الهاتف: {item.phone}</span>}
                        {item.level_name && (
                          <Badge variant="outline" className="font-sans text-[10px] bg-emerald-50 text-emerald-800 border-emerald-100 font-bold">
                            المستوى المتوقع: {item.level_name}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {searchQuery && !searching && searchResults.length === 0 && (
                <p className="text-xs text-amber-600 font-medium mt-1">لا توجد نتائج بحث مطابقة في قائمة الأسماء المستوردة</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">الاسم الكامل</Label>
                <Input
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="أدخل اسمك الثلاثي"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="civil_id">الرقم المدني</Label>
                <Input
                  id="civil_id"
                  required
                  value={formData.civil_id}
                  onChange={(e) => setFormData({ ...formData, civil_id: e.target.value })}
                  placeholder="123456789"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف</Label>
                <Input
                  id="phone"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="9xxxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="town">البلدة / الولاية</Label>
                <Input
                  id="town"
                  required
                  value={formData.town}
                  onChange={(e) => setFormData({ ...formData, town: e.target.value })}
                  placeholder="اسم البلدة"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">الجنس</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(val) => setFormData({ ...formData, gender: val })}
                >
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="اختر الجنس">
                      {formData.gender === "male" ? "ذكر" : formData.gender === "female" ? "أنثى" : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>مستوى الحفظ</Label>
              <Select
                value={formData.level_id}
                onValueChange={(val) => setFormData({ ...formData, level_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المستوى">
                    {formData.level_id 
                      ? (competition.levels.find((l: any) => l.id.toString() === formData.level_id)?.name || "اختر المستوى") 
                      : undefined}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {competition.levels.map((level: any) => (
                    <SelectItem key={level.id} value={level.id.toString()}>
                      {level.name} - {level.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50 border-t border-slate-100 py-4">
            <Button 
              type="submit" 
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  جاري التسجيل...
                </>
              ) : (
                "تأكيد التسجيل"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* Recent Registrations Table */}
      <Card className="mt-8 border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TableIcon className="w-5 h-5" />
            آخر المسجلين
          </CardTitle>
          <CardDescription>قائمة بأحدث المتسابقين المسجلين</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="text-right whitespace-nowrap">الاسم</TableHead>
                  <TableHead className="text-right whitespace-nowrap">المستوى</TableHead>
                  <TableHead className="text-right whitespace-nowrap hidden sm:table-cell">البلدة</TableHead>
                  <TableHead className="text-left whitespace-nowrap">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrations.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">لا يوجد مسجلون حالياً</TableCell>
                  </TableRow>
                ) : (
                  registrations.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell className="font-medium py-3">
                        {editingId === reg.id ? (
                          <Input 
                            value={editData.name} 
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="h-9 text-sm"
                          />
                        ) : (
                          <div className="flex flex-col">
                            <span>{reg.name}</span>
                            <span className="text-[10px] text-slate-500 sm:hidden">{reg.town}</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        {editingId === reg.id ? (
                          <Select 
                            value={editData.level_id} 
                            onValueChange={(val) => setEditData({ ...editData, level_id: val })}
                          >
                            <SelectTrigger className="h-9 text-sm">
                              <SelectValue>
                                {editData.level_id 
                                  ? (competition.levels.find((l: any) => l.id.toString() === editData.level_id)?.name || "اختر المستوى")
                                  : undefined}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {competition.levels.map((l: any) => (
                                <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline" className="font-normal text-[10px] px-1 py-0">{reg.level_name}</Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell py-3">{reg.town}</TableCell>
                      <TableCell className="py-3">
                        <div className="flex items-center gap-1">
                          {editingId === reg.id ? (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-600" onClick={handleSaveEdit}>
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400" onClick={() => setEditingId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-600" onClick={() => handleStartEdit(reg)}>
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600" onClick={() => handleDelete(reg.id)}>
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
