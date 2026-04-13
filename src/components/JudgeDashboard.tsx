import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Award, User, CheckCircle2, Loader2, Star, Minus, Plus, RotateCcw } from "lucide-react";

export default function JudgeDashboard() {
  const [contestants, setContestants] = useState<any[]>([]);
  const [selectedContestant, setSelectedContestant] = useState<any>(null);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [judgeId, setJudgeId] = useState<string>("1");
  const [genderFilter, setGenderFilter] = useState<string>("all");

  // Specific scoring state per Juz
  const [juzScores, setJuzScores] = useState<Record<number, { 
    deductions: number, 
    tajweedScore: number, 
    positionErrors: number[] 
  }>>({});

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
    const res = await fetch(`/api/criteria/${contestant.level_id}`);
    const data = await res.json();
    setCriteria(data);
    
    // Use juz_count from contestant object
    const juzCount = contestant.juz_count || 1;
    
    // Initialize scoring state for each Juz
    const initialScores: Record<number, any> = {};
    for (let i = 0; i < juzCount; i++) {
      initialScores[i] = {
        deductions: 0,
        tajweedScore: 5,
        positionErrors: [0, 0, 0, 0, 0]
      };
    }
    setJuzScores(initialScores);
  };

  const addDeduction = (juzIdx: number, posIdx: number, amount: number) => {
    setJuzScores(prev => {
      const current = prev[juzIdx];
      const newErrors = [...current.positionErrors];
      newErrors[posIdx] += amount;
      return {
        ...prev,
        [juzIdx]: {
          ...current,
          deductions: current.deductions + amount,
          positionErrors: newErrors
        }
      };
    });
  };

  const resetPosition = (juzIdx: number, posIdx: number) => {
    setJuzScores(prev => {
      const current = prev[juzIdx];
      const newErrors = [...current.positionErrors];
      const errorAmount = newErrors[posIdx];
      newErrors[posIdx] = 0;
      return {
        ...prev,
        [juzIdx]: {
          ...current,
          deductions: current.deductions - errorAmount,
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

  const handleSubmitEvaluation = async () => {
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
          scores: allScores,
        }),
      });

      if (res.ok) {
        toast.success("تم إرسال التقييم بنجاح");
        setSelectedContestant(null);
        fetchContestants();
      } else {
        toast.error("حدث خطأ أثناء إرسال التقييم");
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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Contestant List */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="border-slate-200">
          <CardHeader className="bg-slate-50 border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-slate-600" />
              المتسابقون بانتظار التقييم
            </CardTitle>
            <div className="mt-4">
              <Select value={genderFilter} onValueChange={setGenderFilter}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="تصفية حسب الجنس" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="male">ذكور</SelectItem>
                  <SelectItem value="female">إناث</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0 max-h-[600px] overflow-y-auto">
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
                    <span className="font-bold text-slate-900">{c.name}</span>
                    <span className="text-xs text-emerald-700 bg-emerald-100 w-fit px-2 py-0.5 rounded-full">
                      {c.level_name}
                    </span>
                    <span className="text-xs text-slate-500">{c.town}</span>
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
          <Card className="border-slate-200 shadow-md">
            <CardHeader className="bg-emerald-600 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">{selectedContestant.name}</CardTitle>
                  <CardDescription className="text-emerald-100 mt-1">
                    {selectedContestant.level_name} | {selectedContestant.town}
                  </CardDescription>
                </div>
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                  <Award className="w-8 h-8" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-12">
              {/* Overall Summary */}
              <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100 flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-700 font-bold mb-1">المتوسط النهائي لجميع الأجزاء</p>
                  <p className="text-4xl font-black text-emerald-900">{finalTotalScore.toFixed(2)} / 100</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-emerald-600 uppercase tracking-widest font-bold">عدد الأجزاء</p>
                  <p className="text-2xl font-bold text-emerald-800">{selectedContestant.juz_count || 1}</p>
                </div>
              </div>

              {/* Loop through Juz */}
              {Array.from({ length: selectedContestant.juz_count || 1 }).map((_, juzIdx) => (
                <div key={juzIdx} className="space-y-6 border-t border-slate-100 pt-8 first:border-0 first:pt-0">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-black text-slate-800 bg-slate-100 px-4 py-2 rounded-xl">الجزء {juzIdx + 1}</h3>
                    <div className="bg-emerald-100 px-4 py-2 rounded-xl border border-emerald-200">
                      <span className="text-xs text-emerald-700 font-bold ml-2">درجة الجزء:</span>
                      <span className="text-xl font-black text-emerald-900">{calculateJuzTotal(juzIdx).toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-3 rounded-xl text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">الحفظ</p>
                      <p className="text-lg font-bold text-slate-900">{Math.max(0, 95 - (juzScores[juzIdx]?.deductions || 0))} / 95</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl text-center">
                      <p className="text-[10px] text-slate-500 uppercase font-bold">التجويد</p>
                      <p className="text-lg font-bold text-slate-900">{juzScores[juzIdx]?.tajweedScore || 0} / 5</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[0, 1, 2, 3, 4].map((posIdx) => (
                      <div key={posIdx} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-slate-700">الموضع {posIdx + 1}</span>
                          <div className="flex items-center gap-2">
                            {(juzScores[juzIdx]?.positionErrors[posIdx] || 0) > 0 && (
                              <div className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">-{juzScores[juzIdx].positionErrors[posIdx]}</div>
                            )}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-slate-400 hover:text-amber-600"
                              onClick={() => resetPosition(juzIdx, posIdx)}
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <Button 
                            variant="outline" 
                            className="h-12 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200 text-xs"
                            onClick={() => addDeduction(juzIdx, posIdx, 1)}
                          >
                            خطأ حركات (-1)
                          </Button>
                          <Button 
                            variant="outline" 
                            className="h-12 border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-xs"
                            onClick={() => addDeduction(juzIdx, posIdx, 2)}
                          >
                            نسيان/قلب (-2)
                          </Button>
                        </div>
                      </div>
                    ))}

                    {/* Tajweed Position */}
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl shadow-sm space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-emerald-900">موضع التجويد</span>
                        <Star className="w-5 h-5 text-emerald-600 fill-emerald-600" />
                      </div>
                      <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-emerald-200">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-emerald-600"
                          onClick={() => adjustTajweed(juzIdx, -1)}
                          disabled={(juzScores[juzIdx]?.tajweedScore || 0) <= 0}
                        >
                          <Minus className="w-6 h-6" />
                        </Button>
                        <span className="text-3xl font-bold text-emerald-900">{juzScores[juzIdx]?.tajweedScore || 0}</span>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-10 w-10 text-emerald-600"
                          onClick={() => adjustTajweed(juzIdx, 1)}
                          disabled={(juzScores[juzIdx]?.tajweedScore || 0) >= 5}
                        >
                          <Plus className="w-6 h-6" />
                        </Button>
                      </div>
                      <p className="text-center text-[10px] text-emerald-600 font-bold uppercase">الدرجة من 5</p>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex items-center gap-4 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <Star className="w-5 h-5 text-amber-600" />
                <div className="flex-1">
                  <Label className="text-amber-900 font-bold">رقم المقيم</Label>
                  <Select value={judgeId} onValueChange={setJudgeId}>
                    <SelectTrigger className="mt-1 bg-white border-amber-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">المقيم الأول</SelectItem>
                      <SelectItem value="2">المقيم الثاني</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
            <CardFooter className="bg-slate-50 border-t border-slate-100 py-6">
              <Button
                onClick={handleSubmitEvaluation}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-6 text-lg"
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
          <div className="h-full flex flex-col items-center justify-center bg-white border-2 border-dashed border-slate-200 rounded-3xl p-12 text-slate-400">
            <Award className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-xl font-medium">اختر متسابقاً من القائمة لبدء التقييم</p>
          </div>
        )}
      </div>
    </div>
  );
}
