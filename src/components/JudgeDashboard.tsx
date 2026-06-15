import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Award, User, CheckCircle2, Loader2, Star, Minus, Plus, RotateCcw, LogOut } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function JudgeDashboard() {
  const [contestants, setContestants] = useState<any[]>([]);
  const [selectedContestant, setSelectedContestant] = useState<any>(null);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [judgeId, setJudgeId] = useState<string>(() => {
    try {
      return localStorage.getItem("judge_id") || "1";
    } catch {
      return "1";
    }
  });
  
  const [judgeName, setJudgeName] = useState<string>(() => {
    try {
      return localStorage.getItem("judge_name") || "";
    } catch {
      return "";
    }
  });

  const [judgePhone, setJudgePhone] = useState<string>(() => {
    try {
      return localStorage.getItem("judge_phone") || "";
    } catch {
      return "";
    }
  });

  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [completedJudges, setCompletedJudges] = useState<number[]>([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Specific scoring state per Juz
  const [juzScores, setJuzScores] = useState<Record<number, { 
    deductions: number, 
    tajweedScore: number, 
    positionErrors: number[] 
  }>>({});

  useEffect(() => {
    try {
      localStorage.setItem("judge_id", judgeId);
    } catch {}
  }, [judgeId]);

  useEffect(() => {
    try {
      localStorage.setItem("judge_name", judgeName);
    } catch {}
  }, [judgeName]);

  useEffect(() => {
    try {
      localStorage.setItem("judge_phone", judgePhone);
    } catch {}
  }, [judgePhone]);

  useEffect(() => {
    fetchContestants();
  }, []);

  const fetchContestants = (id?: string) => {
    setLoading(true);
    fetch(`/api/contestants?judge_id=${id || judgeId}`)
      .then((res) => res.json())
      .then((data) => {
        setContestants(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchContestants();
  }, [judgeId]);

  const handleSelectContestant = async (contestant: any) => {
    setSelectedContestant(contestant);
    setCompletedJudges([]);
    const res = await fetch(`/api/criteria/${contestant.level_id}`);
    const data = await res.json();
    setCriteria(data);

    // Fetch already completed judges for this contestant
    try {
      const judgesRes = await fetch(`/api/contestants/${contestant.id}/completed-judges`);
      if (judgesRes.ok) {
        const judgedIds = await judgesRes.json() as number[];
        setCompletedJudges(judgedIds);
        
        // Auto-switch to opposite judge ID
        if (judgedIds.includes(1) && !judgedIds.includes(2)) {
          setJudgeId("2");
          toast.info("تنبيه: تم تقييم هذا المتسابق مسبقاً من المقيم الأول، تم تحويل اختيارك إلى المقيم الثاني تلقائياً.");
        } else if (judgedIds.includes(2) && !judgedIds.includes(1)) {
          setJudgeId("1");
          toast.info("تنبيه: تم تقييم هذا المتسابق مسبقاً من المقيم الثاني، تم تحويل اختيارك إلى المقيم الأول تلقائياً.");
        }
      }
    } catch (err) {
      console.error("Error fetching completed judges:", err);
    }
    
    // Use juz_count from contestant object
    const juzCount = contestant.juz_count || 1;
    const positionsCount = contestant.positions_count || 5;
    
    // Initialize scoring state for each Juz
    const initialScores: Record<number, any> = {};
    for (let i = 0; i < juzCount; i++) {
      initialScores[i] = {
        deductions: 0,
        tajweedScore: 5,
        positionErrors: Array(positionsCount).fill(0)
      };
    }
    setJuzScores(initialScores);
  };

  const adjustPositionDeduction = (juzIdx: number, posIdx: number, amount: number) => {
    setJuzScores(prev => {
      const current = prev[juzIdx];
      const newErrors = [...current.positionErrors];
      
      // amount is +1 for adding a mistake, -1 for undoing it
      const currentDeduction = newErrors[posIdx];
      const newDeduction = Math.max(0, currentDeduction + amount);
      const diff = newDeduction - currentDeduction;
      
      newErrors[posIdx] = newDeduction;
      
      return {
        ...prev,
        [juzIdx]: {
          ...current,
          deductions: current.deductions + diff,
          positionErrors: newErrors
        }
      };
    });
  };

  const setPositionUnmemorized = (juzIdx: number, posIdx: number) => {
    setJuzScores(prev => {
      const current = prev[juzIdx];
      if (!current) return prev;
      
      const newErrors = [...current.positionErrors];
      const currentDeduction = newErrors[posIdx] || 0;
      
      // If currently exactly 19, toggle back to 0. Otherwise set to exactly 19.
      const newDeduction = currentDeduction === 19 ? 0 : 19;
      const diff = newDeduction - currentDeduction;
      
      newErrors[posIdx] = newDeduction;
      
      return {
        ...prev,
        [juzIdx]: {
          ...current,
          deductions: current.deductions + diff,
          positionErrors: newErrors
        }
      };
    });
  };

  const adjustTajweed = (juzIdx: number, amount: number) => {
    setJuzScores(prev => {
      const current = prev[juzIdx];
      return {
        ...prev,
        [juzIdx]: {
          ...current,
          tajweedScore: Math.min(5, Math.max(0, current.tajweedScore + amount))
        }
      };
    });
  };

  const calculateJuzTotal = (juzIdx: number) => {
    const score = juzScores[juzIdx];
    if (!score) return 0;
    const memorization = Math.max(0, 95 - score.deductions);
    return memorization + score.tajweedScore;
  };

  const finalTotalScore = Object.keys(juzScores).length > 0
    ? Object.keys(juzScores).reduce((acc, idx) => acc + calculateJuzTotal(parseInt(idx)), 0) / Object.keys(juzScores).length
    : 0;

  const handleInitiateSubmit = () => {
    if (!judgeId || !judgeName || !judgePhone) {
      toast.error("يرجى إكمال بيانات المقيم (الرقم، الاسم، الهاتف)");
      return;
    }

    const numericJudgeId = parseInt(judgeId);
    if (completedJudges.some(id => Number(id) === numericJudgeId)) {
      toast.error(`⚠️ تنبيه: لقد رصد المقيم ${numericJudgeId === 1 ? "الأول" : "الثاني"} درجات هذا المتسابق بالفعل! يرجى اختيار رقم المقيم الآخر لمتابعة رصد الدرجات.`);
      return;
    }

    setShowConfirmDialog(true);
  };

  const handleSubmitEvaluation = async () => {
    if (!judgeId || !judgeName || !judgePhone) {
      toast.error("يرجى إكمال بيانات المقيم (الرقم، الاسم، الهاتف)");
      return;
    }

    const numericJudgeId = parseInt(judgeId);
    if (completedJudges.some(id => Number(id) === numericJudgeId)) {
      toast.error(`⚠️ تنبيه: لقد رصد المقيم ${numericJudgeId === 1 ? "الأول" : "الثاني"} درجات هذا المتسابق بالفعل! يرجى اختيار رقم المقيم الآخر لمتابعة رصد الدرجات.`);
      return;
    }

    setSubmitting(true);
    
    // Map the calculated scores to the criteria for EACH Juz
    const allScores: any[] = [];
    
    Object.entries(juzScores).forEach(([juzIdx, score]: [string, any]) => {
      const juzIndex = parseInt(juzIdx);
      const memorizationScore = Math.max(0, 95 - score.deductions);
      const tajweedScore = score.tajweedScore;

      if (criteria.length >= 2) {
        allScores.push({ juz_index: juzIndex, criteria_id: criteria[0].id, score: memorizationScore });
        allScores.push({ juz_index: juzIndex, criteria_id: criteria[1].id, score: tajweedScore });
      } else if (criteria.length === 1) {
        allScores.push({ juz_index: juzIndex, criteria_id: criteria[0].id, score: memorizationScore + tajweedScore });
      }
    });

    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contestant_id: selectedContestant.id,
          judge_id: parseInt(judgeId),
          judge_name: judgeName,
          judge_phone: judgePhone,
          scores: allScores,
        }),
      });

      if (res.ok) {
        toast.success("تم إرسال التقييم بنجاح");
        setSelectedContestant(null);
        setShowConfirmDialog(false);
        fetchContestants();
      } else {
        const errorData = await res.json().catch(() => ({}));
        toast.error(errorData.error || "حدث خطأ أثناء إرسال التقييم");
      }
    } catch (error) {
      toast.error("فشل الاتصال بالخادم");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && contestants.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-2 sm:p-6 space-y-4 sm:space-y-8">
      {/* Top Welcome & Exit Panel */}
      <div className="flex flex-col sm:flex-row items-center justify-between bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-sm gap-4">
        <div className="text-right w-full sm:w-auto">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">بوابة المقيمين</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">أهلاً بك يا فضيلة المقيم. يمكنك رصد درجات الطلاب هنا.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="outline"
            onClick={() => {
              try {
                const unlocked = JSON.parse(localStorage.getItem("unlocked_tabs") || "{}");
                delete unlocked["judge"];
                localStorage.setItem("unlocked_tabs", JSON.stringify(unlocked));
                localStorage.setItem("active_tab", JSON.stringify("home"));
              } catch (e) {}
              window.location.reload();
            }}
            className="rounded-xl border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold px-4 py-2 text-xs flex items-center gap-1.5 w-full sm:w-auto select-none"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج والعودة للرئيسية</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8">
        {/* Contestant List */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-slate-200 shadow-sm overflow-hidden rounded-2xl sm:rounded-3xl">
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-slate-600" />
                المتسابقون بانتظار التقييم
              </CardTitle>
              <div className="mt-4">
                <Select value={genderFilter} onValueChange={setGenderFilter}>
                  <SelectTrigger className="bg-white h-9">
                    <SelectValue placeholder="تصفية حسب الجنس">
                      {genderFilter === "all" ? "الكل" : genderFilter === "male" ? "ذكور" : genderFilter === "female" ? "إناث" : undefined}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="male">ذكور</SelectItem>
                    <SelectItem value="female">إناث</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="p-0 max-h-[40vh] lg:max-h-[600px] overflow-y-auto">
              {contestants.filter(c => genderFilter === "all" || c.gender === genderFilter).length === 0 ? (
                <div className="p-8 text-center text-slate-500">لا يوجد متسابقون حالياً</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {contestants
                    .filter(c => genderFilter === "all" || c.gender === genderFilter)
                    .map((c) => (
                      <button
                      key={c.id}
                      onClick={() => handleSelectContestant(c)}
                      className={`w-full text-right p-4 hover:bg-emerald-50 transition-colors flex flex-col gap-1 ${
                        selectedContestant?.id === c.id ? "bg-emerald-50 border-r-4 border-emerald-600" : ""
                      }`}
                    >
                      <span className="font-bold text-slate-900 truncate">{c.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full whitespace-nowrap">
                          {c.level_name}
                        </span>
                        <span className="text-[10px] text-slate-500 truncate">{c.town}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Evaluation Form */}
        <div className="lg:col-span-2">
          {selectedContestant ? (
            <Card className="border-slate-200 shadow-md overflow-hidden rounded-2xl sm:rounded-3xl">
              <CardHeader className="bg-emerald-600 text-white p-4 sm:p-6">
                <div className="flex justify-between items-start">
                  <div className="min-w-0">
                    <CardTitle className="text-xl sm:text-2xl truncate">{selectedContestant.name}</CardTitle>
                    <CardDescription className="text-emerald-100 mt-1 text-xs sm:text-sm truncate">
                      {selectedContestant.level_name} | {selectedContestant.town}
                    </CardDescription>
                  </div>
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm shrink-0">
                    <Award className="w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-8 space-y-8 sm:space-y-12">
                {/* Judge Info at the Top */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                  <div>
                    <Label className="text-amber-900 font-bold text-xs flex justify-between">
                      <span>رقم المقيم</span>
                    </Label>
                    <Select value={judgeId} onValueChange={setJudgeId}>
                      <SelectTrigger className={`mt-1 bg-white border-amber-200 h-10 ${completedJudges.some(id => Number(id) === parseInt(judgeId)) ? "ring-2 ring-red-500 border-red-500" : ""}`}>
                        <SelectValue>
                          {judgeId === "1" ? "المقيم الأول" : judgeId === "2" ? "المقيم الثاني" : "اختر رقم المقيم"}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1" disabled={completedJudges.some(id => Number(id) === 1)}>
                          المقيم الأول {completedJudges.some(id => Number(id) === 1) ? "✅ (قيّم مسبقاً)" : ""}
                        </SelectItem>
                        <SelectItem value="2" disabled={completedJudges.some(id => Number(id) === 2)}>
                          المقيم الثاني {completedJudges.some(id => Number(id) === 2) ? "✅ (قيّم مسبقاً)" : ""}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {completedJudges.some(id => Number(id) === parseInt(judgeId)) && (
                      <p className="text-[10px] text-red-600 font-bold mt-1 animate-pulse">
                        ⚠️ تنبيه: المقيم المختار رصد درجاته لهذا المتسابق بالفعل!
                      </p>
                    )}
                  </div>
                  <div>
                    <Label className="text-amber-900 font-bold text-xs">اسم المقيم</Label>
                    <Input 
                      placeholder="اسم المقيم" 
                      value={judgeName} 
                      onChange={(e) => setJudgeName(e.target.value)}
                      className="mt-1 bg-white border-amber-200 h-10"
                    />
                  </div>
                  <div>
                    <Label className="text-amber-900 font-bold text-xs">رقم الهاتف</Label>
                    <Input 
                      placeholder="رقم الهاتف" 
                      value={judgePhone} 
                      onChange={(e) => setJudgePhone(e.target.value)}
                      className="mt-1 bg-white border-amber-200 h-10"
                    />
                  </div>
                </div>

                {/* Overall Summary */}
                <div className="bg-emerald-50 p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-emerald-100 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] sm:text-sm text-emerald-700 font-bold mb-1">المتوسط النهائي</p>
                    <p className="text-2xl sm:text-4xl font-black text-emerald-900">{finalTotalScore.toFixed(2)} / 100</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] sm:text-xs text-emerald-600 uppercase tracking-widest font-bold">عدد الأجزاء</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-800">{selectedContestant.juz_count || 1}</p>
                  </div>
                </div>

                {/* Loop through Juz */}
                {Array.from({ length: selectedContestant.juz_count || 1 }).map((_, juzIdx) => (
                  <div key={juzIdx} className="space-y-4 sm:space-y-6 border-t border-slate-100 pt-6 sm:pt-8 first:border-0 first:pt-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg sm:text-xl font-black text-slate-800 bg-slate-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl">الجزء {juzIdx + 1}</h3>
                      <div className="bg-emerald-100 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl border border-emerald-200">
                        <span className="text-[10px] sm:text-xs text-emerald-700 font-bold ml-1 sm:ml-2">درجة الجزء:</span>
                        <span className="text-lg sm:text-xl font-black text-emerald-900">{calculateJuzTotal(juzIdx).toFixed(1)}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div className="bg-slate-50 p-2 sm:p-3 rounded-xl text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">الحفظ</p>
                        <p className="text-base sm:text-lg font-bold text-slate-900">{Math.max(0, 95 - (juzScores[juzIdx]?.deductions || 0))} / 95</p>
                      </div>
                      <div className="bg-slate-50 p-2 sm:p-3 rounded-xl text-center">
                        <p className="text-[10px] text-slate-500 uppercase font-bold">التجويد</p>
                        <p className="text-base sm:text-lg font-bold text-slate-900">{juzScores[juzIdx]?.tajweedScore || 0} / 5</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:gap-4">
                      {Array.from({ length: selectedContestant.positions_count || 5 }).map((_, posIdx) => (
                        <div key={posIdx} className="p-3 sm:p-4 bg-white border border-slate-200 rounded-xl sm:rounded-2xl shadow-sm space-y-3 sm:space-y-4">
                          <div className="flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3">
                              <span className="font-bold text-sm sm:text-base text-slate-700">الموضع {posIdx + 1}</span>
                              <button
                                type="button"
                                onClick={() => setPositionUnmemorized(juzIdx, posIdx)}
                                className={`px-3 py-1 sm:px-4 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-black transition-all duration-150 border-2 flex items-center gap-1.5 cursor-pointer select-none ${
                                  (juzScores[juzIdx]?.positionErrors[posIdx] || 0) === 19
                                    ? "bg-rose-600 border-rose-700 hover:bg-rose-700 text-white shadow-md"
                                    : "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200 hover:border-amber-300 active:bg-amber-200"
                                }`}
                                title="لم يحفظ الموضع بالكامل (خصم 19 درجة)"
                              >
                                <span>لم يحفظ (-19 درجة)</span>
                                {(juzScores[juzIdx]?.positionErrors[posIdx] || 0) === 19 && (
                                  <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                                )}
                              </button>
                            </div>
                            <div className="flex items-center gap-2">
                              {(juzScores[juzIdx]?.positionErrors[posIdx] || 0) > 0 && (
                                <div className={`text-[10px] sm:text-xs font-black px-2.5 py-1 rounded-full ${
                                  juzScores[juzIdx]?.positionErrors[posIdx] === 19
                                    ? "bg-rose-100 text-rose-800 border border-rose-200"
                                    : "bg-red-100 text-red-700"
                                }`}>
                                  {juzScores[juzIdx]?.positionErrors[posIdx] === 19 ? "لم يحفظ بالكامل (-19)" : `خصم في هذا الموضع: -${juzScores[juzIdx]?.positionErrors[posIdx]}`}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between bg-slate-50 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-inner overflow-hidden gap-4 select-none">
                            {/* Minus Button (Decreases score - adds a mistake) */}
                            <button
                              type="button"
                              onClick={() => adjustPositionDeduction(juzIdx, posIdx, 1)}
                              className="w-16 h-16 sm:w-20 sm:h-20 bg-red-500 hover:bg-red-400 active:bg-red-600 text-white font-bold rounded-2xl border-2 border-b-[6px] border-red-700 hover:border-red-500 active:border-b-2 active:translate-y-1 shadow-md hover:shadow-lg active:shadow-sm transition-all duration-75 flex flex-col items-center justify-center cursor-pointer flex-shrink-0"
                              title="خصم درجة / إضافة خطأ"
                            >
                              <Minus className="w-8 h-8 sm:w-9 sm:h-9 stroke-[3]" />
                              <span className="text-[10px] font-black mt-1">نقص (-1)</span>
                            </button>
                            
                            {/* Display Center Container */}
                            <div className="flex flex-col items-center justify-center">
                              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm">
                                <span className="text-3xl sm:text-4xl font-black text-slate-900 leading-none">
                                  {juzScores[juzIdx]?.positionErrors[posIdx] || 0}
                                </span>
                              </div>
                              <span className="text-[10px] sm:text-xs text-slate-500 font-black mt-2">مقدار النقص</span>
                            </div>

                            {/* Plus Button (Increases score - undoes mistake/error) */}
                            <button
                              type="button"
                              onClick={() => adjustPositionDeduction(juzIdx, posIdx, -1)}
                              disabled={(juzScores[juzIdx]?.positionErrors[posIdx] || 0) <= 0}
                              className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-2xl border-2 border-b-[6px] border-slate-300 hover:border-slate-400 active:border-b-2 active:translate-y-1 shadow-md active:shadow-sm transition-all duration-75 flex flex-col items-center justify-center cursor-pointer disabled:opacity-20 disabled:pointer-events-none disabled:transform-none disabled:shadow-none flex-shrink-0"
                              title="تراجع عن الخصم"
                            >
                              <Plus className="w-8 h-8 sm:w-9 sm:h-9 stroke-[3]" />
                              <span className="text-[10px] font-black mt-1">تراجع (+1)</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Tajweed Position */}
                      <div className="p-3 sm:p-4 bg-emerald-50 border border-emerald-100 rounded-xl sm:rounded-2xl shadow-sm space-y-3 sm:space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm sm:text-base text-emerald-900">موضع التجويد</span>
                          <Star className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                        </div>
                        <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-emerald-200 gap-4">
                          {/* Minus Button for Tajweed Score */}
                          <button
                            type="button"
                            onClick={() => adjustTajweed(juzIdx, -1)}
                            disabled={(juzScores[juzIdx]?.tajweedScore || 0) <= 0}
                            className="w-12 h-12 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold rounded-xl border-2 border-b-4 border-slate-300 hover:border-slate-400 active:border-b-2 active:translate-y-0.5 shadow-sm active:shadow-none transition-all duration-75 flex flex-col items-center justify-center cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                            title="تقليل العلامة"
                          >
                            <Minus className="w-5 h-5 stroke-[3]" />
                            <span className="text-[8px] font-bold mt-0.5">نقصان</span>
                          </button>
                          
                          <div className="flex flex-col items-center justify-center">
                            <span className="text-2xl sm:text-3xl font-black text-emerald-950 leading-none">
                              {juzScores[juzIdx]?.tajweedScore || 0}
                            </span>
                            <span className="text-[8px] text-emerald-600/80 font-bold mt-1">الدرجة</span>
                          </div>

                          {/* Plus Button for Tajweed Score */}
                          <button
                            type="button"
                            onClick={() => adjustTajweed(juzIdx, 1)}
                            disabled={(juzScores[juzIdx]?.tajweedScore || 0) >= 5}
                            className="w-12 h-12 bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600 text-white font-bold rounded-xl border-2 border-b-4 border-emerald-700 hover:border-emerald-500 active:border-b-2 active:translate-y-0.5 shadow-sm active:shadow-none transition-all duration-75 flex flex-col items-center justify-center cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
                            title="زيادة العلامة"
                          >
                            <Plus className="w-5 h-5 stroke-[3]" />
                            <span className="text-[8px] font-bold mt-0.5">زيادة</span>
                          </button>
                        </div>
                        <p className="text-center text-[9px] sm:text-[10px] text-emerald-600 font-bold uppercase">الدرجة من 5</p>
                      </div>
                    </div>
                  </div>
                ))}

              </CardContent>
              <CardFooter className="bg-slate-50 border-t border-slate-100 py-4 sm:py-6">
                <Button
                  onClick={handleInitiateSubmit}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-5 sm:py-6 text-base sm:text-lg"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="ml-2 h-5 w-5 animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="ml-2 h-5 w-5" />
                      اعتماد التقييم لجميع الأجزاء
                    </>
                  )}
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="h-[40vh] lg:h-full flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-2xl sm:rounded-3xl p-6 sm:p-12 text-slate-400">
              <Award className="w-12 h-12 sm:w-16 sm:h-16 mb-4 opacity-20" />
              <p className="text-lg sm:text-xl font-medium text-center">اختر متسابقاً من القائمة لبدء التقييم</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showConfirmDialog && selectedContestant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setShowConfirmDialog(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            
            {/* Center Modal Container */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-slate-200 z-10 flex flex-col gap-5 text-right font-sans"
              dir="rtl"
            >
              <div>
                <h3 className="text-xl font-black text-emerald-950 flex items-center gap-2 mb-1">
                  <Award className="w-6 h-6 text-emerald-600" />
                  ملخص تقييم المتسابق
                </h3>
                <p className="text-xs text-slate-500">يرجى مراجعة درجات المتسابق قبل الحفظ النهائي والاعتماد</p>
              </div>

              {/* Contestant Info */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">اسم المتسابق:</span>
                  <span className="font-extrabold text-slate-900 text-sm">{selectedContestant.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-bold">مستوى الحفظ:</span>
                  <span className="font-medium text-slate-700 text-xs">{selectedContestant.level_name}</span>
                </div>
              </div>

              {/* score list */}
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">درجات الأجزاء:</h4>
                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {Array.from({ length: selectedContestant.juz_count || 1 }).map((_, juzIdx) => {
                    const juzTotal = calculateJuzTotal(juzIdx);
                    return (
                      <div key={juzIdx} className="flex justify-between items-center py-2.5 px-4 bg-slate-50 rounded-xl border border-slate-100 hover:bg-slate-100 transition-colors">
                        <span className="font-extrabold text-slate-700 text-sm">الجزء {juzIdx + 1}</span>
                        <span className="font-black text-emerald-700 text-sm">{juzTotal.toFixed(1)} / 100</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* final total */}
              <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100 flex justify-between items-center">
                <span className="font-extrabold text-emerald-950 text-sm">المتوسط النهائي:</span>
                <span className="font-black text-emerald-900 text-lg">{finalTotalScore.toFixed(2)} / 100</span>
              </div>

              {/* confirm message */}
              <div className="text-center py-1">
                <p className="font-extrabold text-slate-800 text-base">هل تريد إعتماد التقييم؟</p>
                <p className="text-[10px] text-amber-600 font-bold mt-1">عند الضغط على نعم، سيتم رصد التقييم ولا يمكن التعديل عليه لاحقاً.</p>
              </div>

              {/* actions */}
              <div className="grid grid-cols-2 gap-3 mt-2">
                <Button
                  onClick={handleSubmitEvaluation}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-2xl cursor-pointer"
                >
                  {submitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>جاري الاعتماد...</span>
                    </div>
                  ) : (
                    "نعم"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={submitting}
                  className="border-slate-200 text-slate-600 hover:bg-slate-50 font-bold py-3 rounded-2xl cursor-pointer"
                >
                  إلغاء
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
