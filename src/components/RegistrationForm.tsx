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
    gender: "male",
    level_id: ""
  });
  const [formData, setFormData] = useState({
    name: "",
    civil_id: "",
    phone: "",
    town: "",
    gender: "male",
    level_id: "",
  });

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
        setFormData({ name: "", civil_id: "", phone: "", town: "", gender: "male", level_id: "" });
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
                    <SelectValue placeholder="اختر الجنس" />
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
                  <SelectValue placeholder="اختر المستوى" />
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
      <Card className="mt-12 border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-slate-50 border-b border-slate-100">
          <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <TableIcon className="w-5 h-5" />
            آخر المسجلين
          </CardTitle>
          <CardDescription>قائمة بأحدث 10 متسابقين تم تسجيلهم في النظام</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="text-right">الاسم</TableHead>
                <TableHead className="text-right">المستوى</TableHead>
                <TableHead className="text-right">البلدة</TableHead>
                <TableHead className="text-right">الجنس</TableHead>
                <TableHead className="text-left">الإجراءات</TableHead>
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
                    <TableCell className="font-medium">
                      {editingId === reg.id ? (
                        <Input 
                          value={editData.name} 
                          onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                          className="h-8"
                        />
                      ) : reg.name}
                    </TableCell>
                    <TableCell>
                      {editingId === reg.id ? (
                        <Select 
                          value={editData.level_id} 
                          onValueChange={(val) => setEditData({ ...editData, level_id: val })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {competition.levels.map((l: any) => (
                              <SelectItem key={l.id} value={l.id.toString()}>{l.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="font-normal">{reg.level_name}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {editingId === reg.id ? (
                        <Input 
                          value={editData.town} 
                          onChange={(e) => setEditData({ ...editData, town: e.target.value })}
                          className="h-8"
                        />
                      ) : reg.town}
                    </TableCell>
                    <TableCell>
                      {editingId === reg.id ? (
                        <Select 
                          value={editData.gender} 
                          onValueChange={(val) => setEditData({ ...editData, gender: val })}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">ذكر</SelectItem>
                            <SelectItem value="female">أنثى</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (reg.gender === 'male' ? 'ذكر' : 'أنثى')}
                    </TableCell>
                    <TableCell>
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
        </CardContent>
      </Card>
    </div>
  );
}
