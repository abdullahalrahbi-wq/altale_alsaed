import React, { useState, useEffect, Component } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import RegistrationForm from "./components/RegistrationForm";
import JudgeDashboard from "./components/JudgeDashboard";
import AdminDashboard from "./components/AdminDashboard";
import { BookOpen, Users, Settings, Award, AlertTriangle } from "lucide-react";

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    (this as any).state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    const { hasError, error } = (this as any).state;
    if (hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-red-50 p-4" dir="rtl">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center space-y-4 border border-red-100">
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold text-slate-900">عذراً، حدث خطأ في النظام</h1>
            <p className="text-slate-600">يرجى محاولة تحديث الصفحة. إذا استمرت المشكلة، يرجى التواصل مع الدعم الفني.</p>
            <pre className="text-xs bg-slate-100 p-4 rounded-lg overflow-auto text-left dir-ltr">
              {error?.toString()}
            </pre>
            <Button onClick={() => window.location.reload()} className="w-full bg-red-600 hover:bg-red-700">
              تحديث الصفحة
            </Button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("home");
  const [competition, setCompetition] = useState<any>(null);
  const [unlockedTabs, setUnlockedTabs] = useState<Record<string, boolean>>({ home: true });
  const [accessCode, setAccessCode] = useState("");
  const [showCodePrompt, setShowCodePrompt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/competition/active")
      .then((res) => res.json())
      .then((data) => setCompetition(data));
  }, []);

  const handleTabChange = (value: string) => {
    if (unlockedTabs[value]) {
      setActiveTab(value);
      setShowCodePrompt(null);
    } else {
      setShowCodePrompt(value);
      setAccessCode("");
    }
  };

  const verifyCode = async () => {
    const trimmedCode = accessCode.trim();
    
    // Fetch latest competition data to ensure codes are up to date
    try {
      const res = await fetch("/api/competition/active");
      const latestComp = await res.json();
      setCompetition(latestComp);

      if (showCodePrompt === "admin") {
        if (trimmedCode === "admin2026") {
          setUnlockedTabs({ ...unlockedTabs, admin: true });
          setActiveTab("admin");
          setShowCodePrompt(null);
          setAccessCode("");
        } else {
          toast.error("رمز الإدارة غير صحيح");
        }
      } else if (showCodePrompt === "register") {
        if (trimmedCode === (latestComp?.registration_code || "123456")) {
          setUnlockedTabs({ ...unlockedTabs, register: true });
          setActiveTab("register");
          setShowCodePrompt(null);
          setAccessCode("");
        } else {
          toast.error("رمز التسجيل غير صحيح");
        }
      } else if (showCodePrompt === "judge") {
        if (trimmedCode === (latestComp?.judging_code || "123456")) {
          setUnlockedTabs({ ...unlockedTabs, judge: true });
          setActiveTab("judge");
          setShowCodePrompt(null);
          setAccessCode("");
        } else {
          toast.error("رمز التقييم غير صحيح");
        }
      }
    } catch (error) {
      toast.error("فشل التحقق من الرمز، يرجى المحاولة لاحقاً");
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#f5f5f0] font-sans text-slate-900 selection:bg-emerald-100" dir="rtl">
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20 items-center">
              <div className="flex items-center gap-4">
                <div className="bg-white p-1 rounded-2xl shadow-md border border-slate-100 overflow-hidden">
                  <img 
                    src="https://raw.githubusercontent.com/altale-alsaed/logos/main/school_logo.png" 
                    alt="شعار المدرسة" 
                    className="w-14 h-14 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">مدرسة الطالع السعيد لتدريس القرآن الكريم</h1>
                  <p className="text-xs text-emerald-700 font-bold uppercase tracking-widest">مسابقة حفظ القرآن الكريم</p>
                </div>
              </div>
              
              <div className="hidden md:flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <Button 
                  variant={activeTab === "home" ? "default" : "ghost"} 
                  onClick={() => handleTabChange("home")}
                  className="rounded-xl px-6"
                >
                  الرئيسية
                </Button>
                <Button 
                  variant={activeTab === "register" ? "default" : "ghost"} 
                  onClick={() => handleTabChange("register")}
                  className="rounded-xl px-6"
                >
                  التسجيل
                </Button>
                <Button 
                  variant={activeTab === "judge" ? "default" : "ghost"} 
                  onClick={() => handleTabChange("judge")}
                  className="rounded-xl px-6"
                >
                  التقييم
                </Button>
                <Button 
                  variant={activeTab === "admin" ? "default" : "ghost"} 
                  onClick={() => handleTabChange("admin")}
                  className="rounded-xl px-6"
                >
                  الإدارة
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {showCodePrompt ? (
            <div className="max-w-md mx-auto mt-20">
              <div className="bg-white p-8 rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-100 text-center space-y-6">
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-inner border border-slate-50">
                  <img 
                    src="https://raw.githubusercontent.com/altale-alsaed/logos/main/school_logo.png" 
                    alt="شعار المدرسة" 
                    className="w-20 h-20 object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">منطقة محمية</h2>
                  <p className="text-slate-500 mt-2">يرجى إدخال رمز الوصول للمتابعة</p>
                </div>
                <div className="space-y-4">
                  <Input 
                    type="password" 
                    placeholder="أدخل الرمز هنا..." 
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value)}
                    className="text-center text-2xl tracking-[0.5em] h-16 rounded-2xl border-slate-200 focus:ring-emerald-500"
                    onKeyDown={(e) => e.key === "Enter" && verifyCode()}
                  />
                  <div className="flex gap-2">
                    <Button onClick={verifyCode} className="flex-1 bg-emerald-700 hover:bg-emerald-800 h-14 rounded-2xl text-lg font-bold">
                      تأكيد الرمز
                    </Button>
                    <Button variant="outline" onClick={() => setShowCodePrompt(null)} className="h-14 rounded-2xl px-6">
                      إلغاء
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-12">
              {activeTab === "home" && (
                <div className="space-y-16">
                  {/* Hero Section */}
                  <div className="text-center space-y-8 py-6">
                    <div className="flex justify-center">
                      <div className="bg-white p-4 rounded-[2.5rem] shadow-2xl border border-slate-100 animate-in zoom-in-50 duration-500">
                        <img 
                          src="https://raw.githubusercontent.com/altale-alsaed/logos/main/school_logo.png" 
                          alt="شعار المدرسة كبير" 
                          className="w-48 h-48 md:w-64 md:h-64 object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    </div>
                    <h2 className="text-6xl md:text-8xl font-black text-slate-900 leading-[0.9] tracking-tighter">
                      ورتل القرآن <br /> <span className="text-emerald-600">ترتيلاً</span>
                    </h2>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                      مرحباً بكم في المنصة الإلكترونية الرسمية لمسابقات حفظ القرآن الكريم. نهدف إلى تيسير عملية التسجيل والتقييم بدقة واحترافية.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4 pt-8">
                      <Button 
                        onClick={() => handleTabChange("register")}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white px-10 py-8 rounded-3xl text-xl font-bold shadow-xl shadow-emerald-200 transition-transform hover:scale-105"
                      >
                        ابدأ التسجيل الآن
                      </Button>
                      <Button 
                        variant="outline"
                        onClick={() => handleTabChange("judge")}
                        className="border-slate-300 px-10 py-8 rounded-3xl text-xl font-bold hover:bg-white transition-transform hover:scale-105"
                      >
                        بوابة المقيمين
                      </Button>
                    </div>
                  </div>

                  {/* Features Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                      <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                        <Users className="w-7 h-7 text-blue-600 group-hover:text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-3">سهولة التسجيل</h3>
                      <p className="text-slate-500 leading-relaxed">نظام تسجيل مبسط يضمن دقة البيانات وتوزيع المتسابقين حسب المستويات المناسبة.</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                      <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 transition-colors">
                        <Award className="w-7 h-7 text-emerald-600 group-hover:text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-3">تقييم دقيق</h3>
                      <p className="text-slate-500 leading-relaxed">واجهة تقييم متطورة للمقيمين تضمن العدالة والسرعة في رصد الدرجات والنتائج.</p>
                    </div>
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group">
                      <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-amber-600 transition-colors">
                        <Settings className="w-7 h-7 text-amber-600 group-hover:text-white" />
                      </div>
                      <h3 className="text-xl font-bold mb-3">إدارة متكاملة</h3>
                      <p className="text-slate-500 leading-relaxed">لوحة تحكم شاملة للإدارة لمتابعة سير المسابقة واستخراج النتائج والتقارير فورياً.</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "register" && <RegistrationForm />}
              {activeTab === "judge" && <JudgeDashboard />}
              {activeTab === "admin" && <AdminDashboard />}
            </div>
          )}
        </main>

        <footer className="bg-white border-t border-slate-200 py-12 mt-20">
          <div className="max-w-7xl mx-auto px-4 text-center space-y-6">
            <div className="flex justify-center flex-col items-center gap-4">
              <img 
                src="https://raw.githubusercontent.com/altale-alsaed/logos/main/school_logo.png" 
                alt="شعار المدرسة فوتر" 
                className="w-20 h-20 object-contain opacity-60 grayscale hover:grayscale-0 transition-all"
                referrerPolicy="no-referrer"
              />
              <div className="flex justify-center gap-6 text-slate-300">
                <Award className="w-5 h-5" />
                <Users className="w-5 h-5" />
              </div>
            </div>
            <p className="text-slate-500 font-medium tracking-tight">جميع الحقوق محفوظة &copy; {new Date().getFullYear()} مدرسة الطالع السعيد لتدريس القرآن الكريم</p>
          </div>
        </footer>
      </div>
      <Toaster position="top-center" />
    </ErrorBoundary>
  );
}
