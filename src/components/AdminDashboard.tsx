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
import { BarChart3, Plus, Trash2, Download, Settings, Users, FileText, Loader2, Trophy, CheckCircle, Edit2, Save, X, UploadCloud, RefreshCw, PieChart as PieIcon } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart as RechartsPieChart, Pie, Legend } from "recharts";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export default function AdminDashboard() {
  const [results, setResults] = useState<any[]>([]);
  const [competition, setCompetition] = useState<any>(null);
  const [allCompetitions, setAllCompetitions] = useState<any[]>([]);
  const [globalSettings, setGlobalSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [selectedAnalysisLevelId, setSelectedAnalysisLevelId] = useState<string>("");
  const [pdfExporting, setPdfExporting] = useState(false);

  const getLevelStats = (levelId: string | number) => {
    const levelContestants = results.filter(r => r.level_id?.toString() === levelId.toString());
    const levelTotal = levelContestants.length;
    const levelEvaluated = levelContestants.filter(r => r.judge_count >= 2);
    const levelEvaluatedCount = levelEvaluated.length;
    const levelUnderEvaluation = levelContestants.filter(r => r.judge_count < 2).length;

    let levelFullyPassed = 0;
    let levelPartiallyPassed = 0;
    let levelNotPassed = 0;

    levelEvaluated.forEach(r => {
      const finalScore = r.average_score || 0;
      const passedJuz = r.juz_details?.filter((j: any) => j.average >= 75) || [];
      const passedJuzCount = passedJuz.length;
      const totalJuzCount = r.juz_count || 0;

      if (passedJuzCount === totalJuzCount && finalScore >= 75) {
        levelFullyPassed++;
      } else if (passedJuzCount > 0) {
        levelPartiallyPassed++;
      } else {
        levelNotPassed++;
      }
    });

    return {
      total: levelTotal,
      evaluated: levelEvaluatedCount,
      underEvaluation: levelUnderEvaluation,
      fullyPassed: levelFullyPassed,
      partiallyPassed: levelPartiallyPassed,
      notPassed: levelNotPassed,
      hasData: levelFullyPassed > 0 || levelPartiallyPassed > 0 || levelNotPassed > 0
    };
  };

  const renderProgressBar = (segments: { name: string; value: number; color: string }[]) => {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    if (total === 0) {
      return `
        <div style="width: 100%; height: 12px; background-color: #f1f5f9; border-radius: 9999px;"></div>
      `;
    }

    let progressHtml = `<div style="width: 100%; height: 16px; background-color: #f1f5f9; border-radius: 9999px; overflow: hidden; display: flex; flex-direction: row-reverse; gap: 1px;">`;
    segments.forEach(seg => {
      const pct = (seg.value / total) * 100;
      if (pct > 0) {
        progressHtml += `<div style="background-color: ${seg.color}; width: ${pct}%; height: 100%;" title="${seg.name}"></div>`;
      }
    });
    progressHtml += `</div>`;
    return progressHtml;
  };

  const handleExportPDF = async () => {
    setPdfExporting(true);
    try {
      // Safe CORS logo fetch
      let safeLogoUrl = "";
      if (competition?.logo_url) {
        try {
          const response = await fetch(competition.logo_url);
          if (response.ok) {
            const blob = await response.blob();
            safeLogoUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }
        } catch (e) {
          console.warn("Logo URL could not be fetched with CORS. Fallback to text logo.", e);
        }
      }

      const logoHtml = safeLogoUrl
        ? `<img src="${safeLogoUrl}" style="max-height: 64px; max-width: 64px; object-fit: contain; border-radius: 12px;" />`
        : `<div style="width: 64px; height: 64px; border-radius: 12px; background-color: #ecfdf5; border: 1px solid #a7f3d0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: bold; color: #047857; font-family: sans-serif;">مصلح</div>`;

      const printContainer = document.createElement("div");
      printContainer.id = "pdf-print-container";
      // Position fixed but tucked behind other layers using z-index and keep opacity to ensure browser layout & rendering.
      printContainer.style.position = "fixed";
      printContainer.style.left = "0";
      printContainer.style.top = "0";
      printContainer.style.width = "800px";
      printContainer.style.zIndex = "-9999";
      printContainer.style.opacity = "1";
      printContainer.style.pointerEvents = "none";
      printContainer.style.backgroundColor = "white";
      printContainer.style.color = "#1e293b";
      printContainer.style.direction = "rtl";
      printContainer.style.padding = "30px";

      const totalStudents = results.length;
      const evaluatedCount = results.filter(r => r.judge_count >= 2).length;
      const underEvaluationCount = results.filter(r => r.judge_count < 2).length;

      const evalProgressData = [
        { name: "تم التقييم بالكامل", value: evaluatedCount, color: "#10b981" },
        { name: "قيد التقييم", value: underEvaluationCount, color: "#f59e0b" }
      ];

      let genFullyPassed = 0;
      let genPartiallyPassed = 0;
      let genNotPassed = 0;

      results.forEach(r => {
        if (r.judge_count >= 2) {
          const finalScore = r.average_score || 0;
          const passedJuz = r.juz_details?.filter((j: any) => j.average >= 75) || [];
          const passedJuzCount = passedJuz.length;
          const totalJuzCount = r.juz_count || 0;

          if (passedJuzCount === totalJuzCount && finalScore >= 75) {
            genFullyPassed++;
          } else if (passedJuzCount > 0) {
            genPartiallyPassed++;
          } else {
            genNotPassed++;
          }
        }
      });

      const genSuccessData = [
        { name: "مجاز بالكامل", value: genFullyPassed, color: "#047857" },
        { name: "المنزل إلى مستوى أقل", value: genPartiallyPassed, color: "#3b82f6" },
        { name: "غير مجاز", value: genNotPassed, color: "#ef4444" }
      ];

      const generalProgressHtml = renderProgressBar(evalProgressData);
      const generalSuccessHtml = renderProgressBar(genSuccessData);

      const levelColors = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#14b8a6", "#64748b"];
      const levelDistData = (competition?.levels || []).map((level: any) => {
        const count = results.filter(r => r.level_id === level.id).length;
        return {
          name: level.name,
          value: count
        };
      }).filter((d: any) => d.value > 0);

      const levelDistributionHtml = renderProgressBar(levelDistData.map((d: any, index: number) => ({
        name: d.name,
        value: d.value,
        color: levelColors[index % levelColors.length]
      })));

      let levelsBreakdownHtml = "";
      (competition?.levels || []).forEach((level: any) => {
        const stats = getLevelStats(level.id);
        
        const levelSuccessData = [
          { name: "مجاز بالكامل", value: stats.fullyPassed, color: "#059669" },
          { name: "المنزل إلى مستوى أقل", value: stats.partiallyPassed, color: "#2563eb" },
          { name: "غير مجاز", value: stats.notPassed, color: "#dc2626" }
        ];
        
        const levelBarHtml = renderProgressBar(levelSuccessData);
        
        const fullyPassedPercent = stats.evaluated > 0 ? ((stats.fullyPassed / stats.evaluated) * 100).toFixed(1) : "0";
        const partiallyPassedPercent = stats.evaluated > 0 ? ((stats.partiallyPassed / stats.evaluated) * 100).toFixed(1) : "0";
        const notPassedPercent = stats.evaluated > 0 ? ((stats.notPassed / stats.evaluated) * 100).toFixed(1) : "0";

        levelsBreakdownHtml += `
          <div style="margin-top: 25px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #f8fafc; page-break-inside: avoid;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 8px; margin-bottom: 15px;">
              <span style="font-size: 15px; font-weight: 900; color: #1e293b;">🔹 ${level.name}</span>
              <span style="font-size: 11px; color: #64748b; font-weight: bold;">${level.description || ""}</span>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 15px; text-align: center;">
              <div style="flex: 1; background-color: white; padding: 10px; border-radius: 12px; border: 1px solid #f1f5f9;">
                <p style="font-size: 10px; color: #94a3b8; font-weight: bold; margin: 0;">إجمالي المسجلين</p>
                <p style="font-size: 14px; font-weight: 900; color: #1e293b; margin: 4px 0 0 0;">${stats.total}</p>
              </div>
              <div style="flex: 1; background-color: #f0fdf4; padding: 10px; border-radius: 12px; border: 1px solid #dcfce7;">
                <p style="font-size: 10px; color: #16a34a; font-weight: bold; margin: 0;">تم تقييمهم</p>
                <p style="font-size: 14px; font-weight: 900; color: #14532d; margin: 4px 0 0 0;">${stats.evaluated}</p>
              </div>
              <div style="flex: 1; background-color: #eff6ff; padding: 10px; border-radius: 12px; border: 1px solid #dbeafe;">
                <p style="font-size: 10px; color: #2563eb; font-weight: bold; margin: 0;">قيد التقييم</p>
                <p style="font-size: 14px; font-weight: 900; color: #1e3a8a; margin: 4px 0 0 0;">${stats.underEvaluation}</p>
              </div>
              <div style="flex: 1; background-color: #fffbeb; padding: 10px; border-radius: 12px; border: 1px solid #fef3c7;">
                <p style="font-size: 10px; color: #d97706; font-weight: bold; margin: 0;">معدل الاجتياز</p>
                <p style="font-size: 14px; font-weight: 900; color: #78350f; margin: 4px 0 0 0;">${stats.evaluated > 0 ? (((stats.fullyPassed + stats.partiallyPassed) / stats.evaluated) * 100).toFixed(0) : 0}%</p>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 15px;">
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; margin-bottom: 4px;">
                    <span style="color: #065f46; display: flex; align-items: center; gap: 6px;">
                      <span style="width: 10px; height: 10px; border-radius: 50%; background-color: #059669; display: inline-block;"></span>
                      مجاز بالكامل: ${stats.fullyPassed} متسابق
                    </span>
                    <span style="color: #1e293b;">${fullyPassedPercent}%</span>
                  </div>
                  <div style="width: 100%; height: 8px; border-radius: 9999px; overflow: hidden; background-color: #cbd5e1;">
                    <div style="background-color: #059669; height: 100%; border-radius: 9999px; width: ${fullyPassedPercent}%"></div>
                  </div>
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; margin-bottom: 4px;">
                    <span style="color: #1e40af; display: flex; align-items: center; gap: 6px;">
                      <span style="width: 10px; height: 10px; border-radius: 50%; background-color: #2563eb; display: inline-block;"></span>
                      المنزل إلى مستوى أقل: ${stats.partiallyPassed} متسابق
                    </span>
                    <span style="color: #1e293b;">${partiallyPassedPercent}%</span>
                  </div>
                  <div style="width: 100%; height: 8px; border-radius: 9999px; overflow: hidden; background-color: #cbd5e1;">
                    <div style="background-color: #2563eb; height: 100%; border-radius: 9999px; width: ${partiallyPassedPercent}%"></div>
                  </div>
                </div>

                <div>
                  <div style="display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; margin-bottom: 4px;">
                    <span style="color: #991b1b; display: flex; align-items: center; gap: 6px;">
                      <span style="width: 10px; height: 10px; border-radius: 50%; background-color: #dc2626; display: inline-block;"></span>
                      غير مجاز: ${stats.notPassed} متسابق
                    </span>
                    <span style="color: #1e293b;">${notPassedPercent}%</span>
                  </div>
                  <div style="width: 100%; height: 8px; border-radius: 9999px; overflow: hidden; background-color: #cbd5e1;">
                    <div style="background-color: #dc2626; height: 100%; border-radius: 9999px; width: ${notPassedPercent}%"></div>
                  </div>
                </div>
              </div>

              <div style="background-color: white; padding: 12px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 8px;">
                <span style="font-size: 11px; color: #64748b; font-weight: bold;">توزيع نسب النجاح والاجتياز الإجمالي للمستوى:</span>
                ${levelBarHtml}
              </div>
            </div>
          </div>
        `;
      });

      const currentDate = new Date().toLocaleDateString("ar-EG", { year: 'numeric', month: 'long', day: 'numeric' });

      printContainer.innerHTML = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; direction: rtl; text-align: right; background-color: white;">
          <!-- Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #059669; padding-bottom: 15px; margin-bottom: 20px;">
            <div style="display: flex; align-items: center; gap: 15px;">
              ${logoHtml}
              <div>
                <h1 style="font-size: 18px; font-weight: 900; color: #1e293b; margin: 0;">${competition?.name || "مسابقة حفظ القرآن الكريم"}</h1>
                <p style="font-size: 11px; color: #64748b; font-weight: bold; margin: 4px 0 0 0;">عام المسابقة: ${competition?.year || new Date().getFullYear()}</p>
              </div>
            </div>
            <div style="text-align: left;">
              <p style="font-size: 14px; font-weight: 900; color: #059669; margin: 0;">تقرير التحليل الإحصائي العام</p>
              <p style="font-size: 10px; color: #94a3b8; font-weight: bold; margin: 4px 0 0 0;">تاريخ التصدير: ${currentDate}</p>
            </div>
          </div>

          <div style="text-align: center; margin: 20px 0;">
            <h2 style="font-size: 16px; font-weight: 900; color: #1e293b; background-color: #f0fdf4; border: 1px solid #bbf7d0; padding: 10px 20px; border-radius: 12px; display: inline-block; margin: 0;">
              📊 نتائج ونسب الإنجاز والنجاح التفصيلية لكافة مستويات المسابقة
            </h2>
          </div>

          <!-- Section 1: General Overviews -->
          <div style="display: flex; gap: 20px; margin-top: 20px; page-break-inside: avoid;">
            <!-- Card 1 -->
            <div style="flex: 1; border: 1px solid #e2e8f0; padding: 15px; border-radius: 16px; background-color: white;">
              <h3 style="font-size: 12px; font-weight: 900; color: #1e293b; margin: 0 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                📊 حالة تقييم المتقدمين (المستوى العام)
              </h3>
              <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; font-weight: bold;">
                <div style="color: #64748b; margin-bottom: 4px;">إجمالي المتسابقين: <span style="color: #1e293b; font-size: 13px; font-weight: 900;">${totalStudents}</span></div>
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <span style="color: #10b981;">تم التقييم بالكامل: ${evaluatedCount} (${totalStudents > 0 ? ((evaluatedCount / totalStudents) * 100).toFixed(1) : 0}%)</span>
                  <span style="color: #f59e0b;">قيد التقييم: ${underEvaluationCount} (${totalStudents > 0 ? ((underEvaluationCount / totalStudents) * 100).toFixed(1) : 0}%)</span>
                </div>
                <div style="margin-top: 5px;">
                  ${generalProgressHtml}
                </div>
              </div>
            </div>

            <!-- Card 2 -->
            <div style="flex: 1; border: 1px solid #e2e8f0; padding: 15px; border-radius: 16px; background-color: white;">
              <h3 style="font-size: 12px; font-weight: 900; color: #1e293b; margin: 0 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                🏆 نسب النجاح العام (للطلاب المقيَّمين)
              </h3>
              <div style="display: flex; flex-direction: column; gap: 8px; font-size: 11px; font-weight: bold;">
                <div style="color: #64748b; margin-bottom: 4px;">تم تقييمهم: <span style="color: #1e293b; font-size: 13px; font-weight: 900;">${evaluatedCount}</span></div>
                <div style="display: flex; justify-content: space-between; gap: 4px;">
                  <span style="color: #047857;">مجاز بالكامل: ${genFullyPassed}</span>
                  <span style="color: #3b82f6;">المنزل لمستوى أقل: ${genPartiallyPassed}</span>
                  <span style="color: #ef4444;">غير مجاز: ${genNotPassed}</span>
                </div>
                <div style="margin-top: 5px;">
                  ${generalSuccessHtml}
                </div>
              </div>
            </div>
          </div>

          <!-- Section 2: Level Distribution -->
          <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 16px; background-color: white; margin-top: 20px; page-break-inside: avoid;">
            <h3 style="font-size: 12px; font-weight: 900; color: #1e293b; margin: 0 0 12px 0; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
              👥 توزيع ومشاركة الطلاب على مستويات المسابقة
            </h3>
            <div style="display: flex; flex-direction: column; gap: 10px; font-size: 11px; font-weight: bold;">
              <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                ${levelDistData.map((d: any, i: number) => `
                  <div style="width: calc(50% - 5px); box-sizing: border-box; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 6px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                      <span style="width: 8px; height: 8px; border-radius: 50%; background-color: ${levelColors[i % levelColors.length]}; display: inline-block;"></span>
                      <span style="color: #475569;">${d.name}</span>
                    </div>
                    <span style="color: #1e293b; font-weight: 900;">${d.value} طالباً (${totalStudents > 0 ? ((d.value / totalStudents) * 100).toFixed(1) : 0}%)</span>
                  </div>
                `).join("")}
              </div>
              <div style="margin-top: 5px;">
                ${levelDistributionHtml}
              </div>
            </div>
          </div>

          <div style="page-break-before: always; height: 1px;"></div>

          <!-- Section 3: Level-by-level detailed analysis -->
          <div style="margin-top: 25px;">
            <h3 style="font-size: 14px; font-weight: 900; color: #1e293b; margin: 0 0 15px 0; border-bottom: 2px solid #cbd5e1; padding-bottom: 6px;">
              📋 التفاصيل ونسب النجاح والاجتياز التفصيلية لكل مستوى على حدة
            </h3>
            ${levelsBreakdownHtml}
          </div>

          <!-- Footer -->
          <div style="margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 15px; text-align: center; font-size: 10px; color: #94a3b8; font-weight: bold; display: flex; justify-content: space-between; align-items: center; page-break-inside: avoid;">
            <p>المشرف العام على المسابقة</p>
            <p>تم استخراج هذا التقرير الإحصائي تلقائياً من نظام التقييم والتحكيم</p>
            <p>© ${new Date().getFullYear()} مسابقة مصلح</p>
          </div>
        </div>
      `;

      document.body.appendChild(printContainer);

      // Wait a little bit for the DOM to completely lay out and load images
      await new Promise(r => setTimeout(r, 800));

      const canvas = await html2canvas(printContainer, {
        scale: 2, // high quality
        useCORS: true,
        logging: true,
        backgroundColor: "#ffffff",
        width: 800,
        windowWidth: 800
      });

      const imgData = canvas.toDataURL("image/jpeg", 0.98);
      const pdf = new jsPDF("p", "mm", "a4");
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const cleanCompName = competition?.name ? competition.name.replace(/\s+/g, '_') : "المسابقة";
      pdf.save(`تقرير_التحليل_الإحصائي_${cleanCompName}.pdf`);
      toast.success("تم استخراج التقرير الإحصائي بصيغة PDF بنجاح!");

      document.body.removeChild(printContainer);
    } catch (error: any) {
      console.error("PDF generation failed:", error);
      toast.error(`حدث خطأ أثناء تصدير ملف الـ PDF: ${error?.message || error?.toString() || "يرجى المحاولة مرة أخرى"}`);
    } finally {
      setPdfExporting(false);
    }
  };

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

  // Excel Import States
  const [importStats, setImportStats] = useState<{ total: number; registered_count: number }>({ total: 0, registered_count: 0 });
  const [parsedPreview, setParsedPreview] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const fetchImportStats = (compId: number) => {
    fetch(`/api/admin/competitions/${compId}/imported-stats`)
      .then(res => res.json())
      .then(data => setImportStats(data))
      .catch(err => console.error("Error fetching import stats", err));
  };

  useEffect(() => {
    if (competition?.id) {
      fetchImportStats(competition.id);
      setParsedPreview([]); // reset when switching
    }
  }, [competition]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        if (!bstr) return;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });

        const headers = (data[0] as any[]) || [];
        const rows = data.slice(1) as any[][];

        const getIndex = (keywords: string[]) => {
          return headers.findIndex(h => 
            keywords.some(kw => String(h || "").toLowerCase().includes(kw))
          );
        };

        const nameIdx = getIndex(["الاسم", "name", "كامل", "متسابق", "عضو"]);
        const civilIdx = getIndex(["مدني", "civil", "بطاقة", "شخصية", "رقم مدني"]);
        const phoneIdx = getIndex(["هاتف", "phone", "تلفون", "جوال"]);
        const townIdx = getIndex(["بلدة", "town", "قرية", "عنوان", "بلد"]);
        const genderIdx = getIndex(["جنس", "gender", "نوع", "ذكر", "أنثى"]);
        const levelIdx = getIndex(["مستوى", "level", "فئة", "جزء"]);

        if (nameIdx === -1 && civilIdx === -1) {
          toast.error("لم نتمكن من العثور على أعمدة 'الاسم' أو 'الرقم المدني' في ملف الأكسل. يرجى التأكد من كتابة مسميات الأعمدة في السطر الأول.");
          return;
        }

        const formatted: any[] = [];
        rows.forEach((row) => {
          if (!row || row.length === 0 || !row[nameIdx]) return;

          const nVal = String(row[nameIdx] || "").trim();
          const cVal = String(row[civilIdx] || "").trim();
          const pVal = String(row[phoneIdx] || "").trim();
          const tVal = String(row[townIdx] || "").trim();
          const lVal = String(row[levelIdx] || "").trim();
          
          let gVal = "male";
          const gRaw = String(row[genderIdx] || "").trim();
          if (gRaw.includes("أنثى") || gRaw.toLowerCase().includes("female") || gRaw.toLowerCase().includes("f")) {
            gVal = "female";
          }

          formatted.push({
            name: nVal,
            civil_id: cVal,
            phone: pVal,
            town: tVal,
            gender: gVal,
            level_name: lVal
          });
        });

        if (formatted.length === 0) {
          toast.error("الملف لا يحتوي على سجلات صالحة.");
          return;
        }

        setParsedPreview(formatted);
        toast.success(`تم استخراج ${formatted.length} سجل بنجاح من ملف الأكسل. يرجى مراجعة الجدول في الأسفل وحفظ البيانات.`);
      } catch (error) {
        console.error(error);
        toast.error("حدث خطأ أثناء قراءة ملف الأكسل. تأكد من جودة وصحة ترميز الملف.");
      }
    };
    reader.readAsBinaryString(file);
    // Reset file input target value to allow re-selection of the same file
    e.target.value = "";
  };

  const handleSaveImport = async () => {
    if (!competition?.id) return;
    if (parsedPreview.length === 0) return;

    setImportLoading(true);
    try {
      const res = await fetch(`/api/admin/competitions/${competition.id}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsedPreview)
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`تم استيراد ${data.count} متسابق بنجاح في قاعدة بيانات ما قبل التسجيل للمسابقة.`);
        fetchImportStats(competition.id);
        setParsedPreview([]);
      } else {
        toast.error(data.error || "فشل استيراد الأسماء");
      }
    } catch (e) {
      toast.error("تعذر الاتصال بالخادم لمزامنة الأسماء");
    } finally {
      setImportLoading(false);
    }
  };

  const handleClearImport = async () => {
    if (!competition?.id) return;
    if (!window.confirm("هل أنت متأكد من مسح كافة الأسماء المستوردة من الأكسل لهذه المسابقة؟")) return;

    setImportLoading(true);
    try {
      const res = await fetch(`/api/admin/competitions/${competition.id}/imported`, {
        method: "DELETE"
      });
      if (res.ok) {
        toast.success("تم مسح تجميعة الأسماء المستوردة بنجاح لرصيد هذه المسابقة.");
        fetchImportStats(competition.id);
        setParsedPreview([]);
      } else {
        toast.error("فشل تفريغ الأسماء المستوردة");
      }
    } catch (e) {
      toast.error("خطأ أثناء الاتصال بالخادم لمسح الملف المستورد");
    } finally {
      setImportLoading(false);
    }
  };

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

  // 1. المستوى العام - حالة المتقدمين والتقييم
  const totalApplicants = results.length;
  const evaluatedCount = results.filter(r => r.judge_count >= 2).length;
  const underEvaluationCount = results.filter(r => r.judge_count < 2).length;

  const evaluationProgressData = [
    { name: "تم التقييم بالكامل", value: evaluatedCount, color: "#10b981" },
    { name: "قيد التقييم", value: underEvaluationCount, color: "#f59e0b" }
  ];

  // 2. نسبة النجاح العامة للطلاب المقيَّمين
  let generalFullyPassed = 0;
  let generalPartiallyPassed = 0;
  let generalNotPassed = 0;

  results.forEach(r => {
    if (r.judge_count >= 2) {
      const finalScore = r.average_score || 0;
      const passedJuz = r.juz_details?.filter((j: any) => j.average >= 75) || [];
      const passedJuzCount = passedJuz.length;
      const totalJuzCount = r.juz_count || 0;

      if (passedJuzCount === totalJuzCount && finalScore >= 75) {
        generalFullyPassed++;
      } else if (passedJuzCount > 0) {
        generalPartiallyPassed++;
      } else {
        generalNotPassed++;
      }
    }
  });

  const generalSuccessData = [
    { name: "مجاز بالكامل", value: generalFullyPassed, color: "#047857" }, // deep emerald
    { name: "المنزل إلى مستوى أقل", value: generalPartiallyPassed, color: "#3b82f6" }, // blue
    { name: "غير مجاز", value: generalNotPassed, color: "#ef4444" } // red
  ];

  const generalSuccessHasData = generalFullyPassed > 0 || generalPartiallyPassed > 0 || generalNotPassed > 0;

  // 3. توزيع المشاركين حسب المستويات
  const levelDistributionData = (competition?.levels || []).map((level: any) => {
    const count = results.filter(r => r.level_id === level.id).length;
    return {
      name: level.name,
      value: count
    };
  }).filter((d: any) => d.value > 0);

  const levelDistributionHasData = levelDistributionData.length > 0 && levelDistributionData.some((d: any) => d.value > 0);

  const levelColors = ["#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#06b6d4", "#14b8a6", "#64748b"];

  // 4. مخطط نسبة النجاح لكل مستوى
  const activeLevelId = selectedAnalysisLevelId || (competition?.levels?.[0]?.id?.toString() || "");
  const activeLevel = competition?.levels?.find((l: any) => l.id.toString() === activeLevelId);

  // Calculate stats for this level
  const levelContestants = results.filter(r => r.level_id?.toString() === activeLevelId);
  const levelTotal = levelContestants.length;
  const levelEvaluated = levelContestants.filter(r => r.judge_count >= 2);
  const levelEvaluatedCount = levelEvaluated.length;
  const levelUnderEvaluation = levelContestants.filter(r => r.judge_count < 2).length;

  let levelFullyPassed = 0;
  let levelPartiallyPassed = 0;
  let levelNotPassed = 0;

  levelEvaluated.forEach(r => {
    const finalScore = r.average_score || 0;
    const passedJuz = r.juz_details?.filter((j: any) => j.average >= 75) || [];
    const passedJuzCount = passedJuz.length;
    const totalJuzCount = r.juz_count || 0;

    if (passedJuzCount === totalJuzCount && finalScore >= 75) {
      levelFullyPassed++;
    } else if (passedJuzCount > 0) {
      levelPartiallyPassed++;
    } else {
      levelNotPassed++;
    }
  });

  const levelSuccessData = [
    { name: "مجاز بالكامل", value: levelFullyPassed, color: "#059669" },
    { name: "المنزل إلى مستوى أقل", value: levelPartiallyPassed, color: "#2563eb" },
    { name: "غير مجاز", value: levelNotPassed, color: "#dc2626" }
  ];

  const levelSuccessHasData = levelFullyPassed > 0 || levelPartiallyPassed > 0 || levelNotPassed > 0;

  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 text-xs shadow-xl font-bold dir-rtl">
          <p className="font-bold">{data.name}</p>
          <p className="text-emerald-400 mt-1">العدد: {data.value} متسابق</p>
          {payload[0].percent !== undefined && (
            <p className="text-blue-400">النسبة: {(payload[0].percent * 100).toFixed(1)}%</p>
          )}
        </div>
      );
    }
    return null;
  };

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

          {/* Section: General and Level analysis charts */}
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-2 mt-4">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-emerald-600" />
                التحليل الإحصائي ونسب الإنجاز والنجاح
              </h3>
              <Button
                onClick={handleExportPDF}
                disabled={pdfExporting}
                className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-2 transition-all duration-200"
              >
                {pdfExporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري جلب وتصدير التقرير...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    تصدير التقرير والمخططات بصيغة PDF
                  </>
                )}
              </Button>
            </div>

            {/* General level charts: side-by-side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 1: Evaluation Completion Rate */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    المستوى العام: نسبة المتقدمين وحالة التقييم
                  </CardTitle>
                  <CardDescription>
                    توزيع المتسابقين المسجلين حسب اكتمال جلسات التقييم الخاصة بهم
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[280px] relative flex flex-col justify-between">
                  {isMounted && totalApplicants > 0 ? (
                    <div className="flex flex-col md:flex-row items-center justify-center h-full">
                      <div className="w-full md:w-1/2 h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={evaluationProgressData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {evaluationProgressData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full md:w-1/2 space-y-3 font-bold text-xs pr-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-500">إجمالي المتقدمين:</span>
                          <span className="text-lg font-black text-slate-800">{totalApplicants}</span>
                        </div>
                        {evaluationProgressData.map((d, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                              <span className="text-slate-600">{d.name}:</span>
                            </div>
                            <span className="text-slate-800 font-black">
                              {d.value} ({totalApplicants > 0 ? ((d.value / totalApplicants) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                      لا توجد بيانات كافية للعرض
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chart 2: General Success Rate */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-emerald-600" />
                    المستوى العام: نسبة النجاح والاجتياز
                  </CardTitle>
                  <CardDescription>
                    حالة الاجتياز والإجازة للطلاب الذين تم تقييمهم بالكامل
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[280px] relative flex flex-col justify-between">
                  {isMounted && generalSuccessHasData ? (
                    <div className="flex flex-col md:flex-row items-center justify-center h-full">
                      <div className="w-full md:w-1/2 h-[200px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={generalSuccessData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {generalSuccessData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full md:w-1/2 space-y-3 font-bold text-xs pr-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                          <span className="text-slate-500">تم تقييمهم بالكامل:</span>
                          <span className="text-lg font-black text-slate-800">{evaluatedCount}</span>
                        </div>
                        {generalSuccessData.map((d, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                              <span className="text-slate-600">{d.name}:</span>
                            </div>
                            <span className="text-slate-800 font-black">
                              {d.value} ({evaluatedCount > 0 ? ((d.value / evaluatedCount) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                      بانتظار اكتمال التقييم لبعض المتسابقين لعرض نسب النجاح
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Level specific charts & distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Chart 3: Level Distribution */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-emerald-600" />
                    توزيع المشاركين حسب مستويات المسابقة
                  </CardTitle>
                  <CardDescription>
                    نسبة عدد الطلاب المسجلين في كل مستوى من مستويات المسابقة
                  </CardDescription>
                </CardHeader>
                <CardContent className="h-[320px] relative flex flex-col justify-between">
                  {isMounted && levelDistributionHasData ? (
                    <div className="flex flex-col md:flex-row items-center justify-center h-full">
                      <div className="w-full md:w-1/2 h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <RechartsPieChart>
                            <Pie
                              data={levelDistributionData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={4}
                              dataKey="value"
                            >
                              {levelDistributionData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={levelColors[index % levelColors.length]} />
                              ))}
                            </Pie>
                            <Tooltip content={<CustomPieTooltip />} />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="w-full md:w-1/2 space-y-2.5 font-bold text-xs pr-4 max-h-[260px] overflow-y-auto">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-1 sticky top-0 bg-white">
                          <span className="text-slate-500">إجمالي الطلاب:</span>
                          <span className="text-lg font-black text-slate-800">{results.length}</span>
                        </div>
                        {levelDistributionData.map((d, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="w-3 h-3 rounded-full" style={{ backgroundColor: levelColors[i % levelColors.length] }}></span>
                              <span className="text-slate-600 truncate max-w-[120px]" title={d.name}>{d.name}:</span>
                            </div>
                            <span className="text-slate-800 font-black">
                              {d.value} ({results.length > 0 ? ((d.value / results.length) * 100).toFixed(1) : 0}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                      لا توجد بيانات مستويات متاحة حالياً
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chart 4: Level Success Rate (interactive dropdown) */}
              <Card className="bg-white border-slate-200">
                <CardHeader className="pb-2">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-500" />
                        نسبة النجاح لكل مستوى بالتفصيل
                      </CardTitle>
                      <CardDescription>
                        حالة الاجتياز (كم اللي اجتاز وكم اللي ما اجتاز) لمستوى محدد
                      </CardDescription>
                    </div>
                    {competition?.levels && competition.levels.length > 0 && (
                      <Select 
                        value={activeLevelId} 
                        onValueChange={(val) => setSelectedAnalysisLevelId(val)}
                      >
                        <SelectTrigger className="w-[180px] h-9 text-xs font-bold rounded-xl border-slate-200 focus:ring-emerald-500">
                          <SelectValue placeholder="اختر المستوى..." />
                        </SelectTrigger>
                        <SelectContent className="text-xs font-bold">
                          {competition.levels.map((l: any) => (
                            <SelectItem key={l.id} value={l.id.toString()}>
                              {l.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="h-[320px] relative flex flex-col justify-between">
                  {isMounted && activeLevel ? (
                    <div className="flex flex-col h-full justify-between">
                      {/* Sub header for selected level stats */}
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2.5 rounded-xl text-center text-[10px] font-bold text-slate-600 border border-slate-100">
                        <div>
                          <p className="text-slate-400">إجمالي المسجلين</p>
                          <p className="text-sm font-black text-slate-800 mt-0.5">{levelTotal}</p>
                        </div>
                        <div>
                          <p className="text-emerald-600">تم تقييمهم</p>
                          <p className="text-sm font-black text-emerald-700 mt-0.5">{levelEvaluatedCount}</p>
                        </div>
                        <div>
                          <p className="text-blue-600">مجتازين (نجاح)</p>
                          <p className="text-sm font-black text-blue-700 mt-0.5">{levelFullyPassed + levelPartiallyPassed}</p>
                        </div>
                        <div>
                          <p className="text-red-600">غير مجتازين</p>
                          <p className="text-sm font-black text-red-700 mt-0.5">{levelNotPassed}</p>
                        </div>
                      </div>

                      {levelSuccessHasData ? (
                        <div className="flex flex-col md:flex-row items-center justify-center flex-1">
                          <div className="w-full md:w-1/2 h-[170px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <RechartsPieChart>
                                <Pie
                                  data={levelSuccessData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={50}
                                  outerRadius={70}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  {levelSuccessData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip content={<CustomPieTooltip />} />
                              </RechartsPieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="w-full md:w-1/2 space-y-2 font-bold text-xs pr-4">
                            <div className="text-[11px] text-slate-500 pb-1 border-b border-slate-100 flex items-center justify-between">
                              <span>نسبة النجاح والاجتياز في {activeLevel.name}:</span>
                            </div>
                            {levelSuccessData.map((d, i) => (
                              <div key={i} className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }}></span>
                                  <span className="text-slate-600">{d.name}:</span>
                                </div>
                                <span className="text-slate-800 font-black">
                                  {d.value} ({levelEvaluatedCount > 0 ? ((d.value / levelEvaluatedCount) * 100).toFixed(1) : 0}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
                          <Trophy className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                          <span>لا توجد تقييمات مكتملة بعد لمستوى ({activeLevel.name})</span>
                          <span className="text-[10px] text-slate-400/80">يجب اكتمال تقييمين على الأقل لمتسابق واحد بالكامل</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                      يرجى اختيار مستوى لعرض بياناته بالتفصيل
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
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

                    {/* Excel Registration Import Tool */}
                    <div className="pt-6 border-t border-slate-100 space-y-4">
                      <h4 className="font-extrabold text-emerald-900 flex items-center gap-2 text-base">
                        <UploadCloud className="w-5 h-5 text-emerald-600" />
                        أداة استيراد الأسماء من ملف الأكسل (مسجلين مسبقاً)
                      </h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        قم برفع الأسماء لتكون جاهزة للمطابقة والبحث أثناء تسجيل المتسابقين في صفحة الاستقبال. لن تظهر هذه الأسماء للمقيم في لجنة التحكيم إلا بعد تأكيد التسجيل يدوياً.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col justify-between">
                          <div>
                            <span className="text-xs text-slate-400 font-bold">إحصائيات الاستيراد الحالية:</span>
                            <div className="mt-2 space-y-1">
                              <p className="text-sm font-bold text-slate-700">عدد الأسماء المستوردة: <span className="font-black text-emerald-700 text-base">{importStats.total || 0}</span></p>
                              <p className="text-sm font-bold text-slate-700">الذين تم تسجيلهم رسمياً: <span className="font-black text-blue-600 text-base">{importStats.registered_count || 0}</span></p>
                              <p className="text-sm font-bold text-slate-700">المتبقي في قائمة الانتظار: <span className="font-black text-amber-600 text-base">{(importStats.total || 0) - (importStats.registered_count || 0)}</span></p>
                            </div>
                          </div>
                          {importStats.total > 0 && (
                            <Button 
                              onClick={handleClearImport} 
                              disabled={importLoading}
                              variant="outline" 
                              size="sm" 
                              className="mt-4 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-bold self-start cursor-pointer"
                            >
                              مسح الأسماء المستوردة
                            </Button>
                          )}
                        </div>

                        <div className="p-4 border-2 border-dashed border-emerald-200 rounded-2xl bg-emerald-50/20 flex flex-col items-center justify-center text-center gap-3">
                          <UploadCloud className="w-8 h-8 text-emerald-500" />
                          <div>
                            <span className="text-sm font-bold text-emerald-950 block">اختر ملف الأكسل (.xlsx أو .xls)</span>
                            <span className="text-[10px] text-slate-400">يجب أن يحتوي الملف على السطر الأول كأسماء للأعمدة (الاسم، الرقم المدني، الهاتف، البلدة، الجنس، الفئة)</span>
                          </div>
                          
                          <label className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black px-4 py-2.5 rounded-xl cursor-pointer shadow-sm transition-all flex items-center gap-1.5 select-none hover:scale-105 active:scale-95 duration-100">
                            <span>تصفح الملفات...</span>
                            <input 
                              type="file" 
                              accept=".xlsx, .xls" 
                              onChange={handleFileChange} 
                              className="hidden" 
                            />
                          </label>
                        </div>
                      </div>

                      {/* Parsed Preview Table */}
                      {parsedPreview.length > 0 && (
                        <div className="space-y-3 bg-slate-50 p-4 rounded-3xl border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                            <div>
                              <h5 className="font-bold text-slate-800 text-sm">معاينة الملف المرفوع</h5>
                              <p className="text-[10px] text-slate-400">سيتم حفظ {parsedPreview.length} سجل في قائمة المسجلين مسبقاً</p>
                            </div>
                            <div className="flex gap-2">
                              <Button 
                                onClick={handleSaveImport} 
                                disabled={importLoading}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer"
                              >
                                {importLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : "مزامنة وحفظ الأسماء"}
                              </Button>
                              <Button 
                                variant="outline" 
                                onClick={() => setParsedPreview([])}
                                className="text-slate-600 border-slate-200 text-xs font-bold px-3 py-2 rounded-xl cursor-pointer"
                              >
                                إلغاء ومعاودة الرفع
                              </Button>
                            </div>
                          </div>

                          <div className="max-h-60 overflow-y-auto block border border-slate-200 rounded-xl bg-white">
                            <Table className="text-xs">
                              <TableHeader className="bg-slate-50">
                                <TableRow>
                                  <TableHead className="text-right font-bold text-slate-600">م</TableHead>
                                  <TableHead className="text-right font-bold text-slate-600">الاسم</TableHead>
                                  <TableHead className="text-right font-bold text-slate-600">الرقم المدني</TableHead>
                                  <TableHead className="text-right font-bold text-slate-600 font-mono">رقم الهاتف</TableHead>
                                  <TableHead className="text-right font-bold text-slate-600">البلدة</TableHead>
                                  <TableHead className="text-right font-bold text-slate-600">المستوى المتوقع</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {parsedPreview.map((item, idx) => (
                                  <TableRow key={idx} className="hover:bg-slate-50">
                                    <TableCell className="font-bold text-slate-400">{idx + 1}</TableCell>
                                    <TableCell className="font-extrabold text-slate-900">{item.name}</TableCell>
                                    <TableCell className="font-mono text-slate-600">{item.civil_id || "-"}</TableCell>
                                    <TableCell className="font-mono text-slate-600">{item.phone || "-"}</TableCell>
                                    <TableCell className="text-slate-600">{item.town || "-"}</TableCell>
                                    <TableCell className="font-semibold text-emerald-800">{item.level_name || "-"}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      )}
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
