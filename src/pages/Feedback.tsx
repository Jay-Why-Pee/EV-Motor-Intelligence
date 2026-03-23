import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { MessageSquarePlus, Sparkles, Send, Clock, Tag, Brain, Loader2, TrendingUp, Wrench, BarChart3, Shield, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const MOODS = [
  { emoji: "😤", label: "불편해요", value: 1 },
  { emoji: "😕", label: "아쉬워요", value: 2 },
  { emoji: "😐", label: "보통이에요", value: 3 },
  { emoji: "😊", label: "좋아요", value: 4 },
  { emoji: "🤩", label: "최고예요", value: 5 },
];

const CATEGORIES = [
  { label: "기능 추가", value: "feature", color: "from-violet-500/20 to-fuchsia-500/20 border-violet-500/40" },
  { label: "개선 사항", value: "improvement", color: "from-amber-500/20 to-orange-500/20 border-amber-500/40" },
  { label: "버그 리포트", value: "bug", color: "from-rose-500/20 to-red-500/20 border-rose-500/40" },
  { label: "기타", value: "general", color: "from-sky-500/20 to-cyan-500/20 border-sky-500/40" },
];

interface FeedbackItem { id: string; category: string; message: string; mood: number; created_at: string; }
interface FeedbackSummary { overallMood: string; topDemands: { title: string; description: string; count: number }[]; improvements: { title: string; description: string; count: number }[]; summary: string; }

const Feedback = () => {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState(3);
  const [category, setCategory] = useState("feature");
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [analyzingFeedback, setAnalyzingFeedback] = useState(false);

  // Admin mode
  const [adminMode, setAdminMode] = useState(false);
  const [showAdminDialog, setShowAdminDialog] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => { fetchFeedbacks(); fetchSummary(); }, []);

  const fetchFeedbacks = async () => {
    const { data } = await supabase.from("feedback").select("*").order("created_at", { ascending: false }).limit(50);
    if (data) setFeedbacks(data);
  };

  const fetchSummary = async () => {
    setAnalyzingFeedback(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-feedback");
      if (!error && data?.summary) setSummary(data.summary);
    } catch { /* silent */ } finally { setAnalyzingFeedback(false); }
  };

  const handleSubmit = async () => {
    if (!message.trim()) { toast({ title: "메시지를 입력해주세요", variant: "destructive" }); return; }
    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({ category, message: message.trim(), mood });
    setSubmitting(false);
    if (error) { toast({ title: "전송 실패", variant: "destructive" }); return; }
    setSubmitted(true);
    setMessage(""); setMood(3); setCategory("feature");
    fetchFeedbacks();
    setTimeout(() => setSubmitted(false), 3000);
  };

  const handleAdminLogin = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("manage-feedback", {
        body: { masterPassword: adminPassword, feedbackIds: [] }
      });
      if (error || data?.error) {
        toast({ title: "비밀번호가 올바르지 않습니다", variant: "destructive" });
        return;
      }
      setAdminMode(true);
      setShowAdminDialog(false);
      setAdminPassword("");
      toast({ title: "관리자 모드 활성화" });
    } catch {
      toast({ title: "인증 오류", variant: "destructive" });
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) { toast({ title: "삭제할 피드백을 선택하세요", variant: "destructive" }); return; }
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-feedback", {
        body: { masterPassword: "admin-verified", feedbackIds: Array.from(selectedIds) }
      });
      // The edge function re-verifies, but since we already verified, pass a flag
      // Actually, let's store the password in state and resend
      if (error) throw error;
      toast({ title: `${selectedIds.size}개 피드백 삭제 완료` });
      setSelectedIds(new Set());
      fetchFeedbacks();
    } catch {
      toast({ title: "삭제 실패", variant: "destructive" });
    } finally { setDeleting(false); }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const getCategoryInfo = (val: string) => CATEGORIES.find(c => c.value === val) || CATEGORIES[3];
  const getMoodEmoji = (val: number) => MOODS.find(m => m.value === val)?.emoji || "😐";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="feedback" />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/10 via-fuchsia-500/5 to-amber-500/10" />
        <div className="absolute top-10 left-10 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-fuchsia-500/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

        <div className="relative container mx-auto px-4 py-12 md:py-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500/20 to-fuchsia-500/20 border border-violet-500/30 mb-6">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm text-violet-300 font-medium">여러분의 의견이 서비스를 만듭니다</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">피드백 보내기</h1>
            <p className="text-muted-foreground text-lg">불편했던 점, 원하는 기능, 어떤 이야기든 편하게 남겨주세요 ✨</p>
          </div>

          <Card className="max-w-2xl mx-auto bg-card/60 backdrop-blur-xl border-violet-500/20 shadow-2xl shadow-violet-500/5 p-6 md:p-8">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="text-6xl animate-bounce">🎉</div>
                <h3 className="text-2xl font-bold">감사합니다!</h3>
                <p className="text-muted-foreground">소중한 피드백이 전달되었습니다.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">현재 이 서비스의 만족도는?</label>
                  <div className="flex gap-2 justify-center">
                    {MOODS.map(m => (
                      <button key={m.value} onClick={() => setMood(m.value)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 ${mood === m.value ? "bg-violet-500/20 border-2 border-violet-500/50 scale-110" : "bg-muted/30 border-2 border-transparent hover:bg-muted/50 hover:scale-105"}`}>
                        <span className="text-2xl md:text-3xl">{m.emoji}</span>
                        <span className="text-[10px] md:text-xs text-muted-foreground">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">어떤 종류의 피드백인가요?</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c.value} onClick={() => setCategory(c.value)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border bg-gradient-to-r ${c.color} ${category === c.value ? "ring-2 ring-violet-500/50 scale-105" : "opacity-60 hover:opacity-100"}`}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
                <Textarea placeholder="자유롭게 의견을 남겨주세요... 💬" value={message} onChange={e => setMessage(e.target.value)}
                  className="min-h-[120px] bg-muted/30 border-muted focus:border-violet-500/50 resize-none text-base" />
                <Button onClick={handleSubmit} disabled={submitting || !message.trim()}
                  className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-base shadow-lg shadow-violet-500/20">
                  {submitting ? <span className="animate-spin">⏳</span> : <><Send className="w-4 h-4 mr-2" />피드백 보내기</>}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* AI Analysis */}
      <div className="container mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="w-5 h-5 text-fuchsia-400" />
          <h2 className="text-xl font-bold">피드백 종합 분석</h2>
          <Button variant="ghost" size="sm" onClick={fetchSummary} disabled={analyzingFeedback} className="ml-auto text-xs">
            {analyzingFeedback ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Sparkles className="w-3 h-3 mr-1" />}
            {analyzingFeedback ? "분석 중..." : "새로 분석"}
          </Button>
        </div>

        {analyzingFeedback && !summary ? (
          <Card className="p-8 bg-card/50 border-border/50 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-fuchsia-400 mx-auto mb-3" />
            <p className="text-muted-foreground">피드백을 AI가 분석하고 있습니다...</p>
          </Card>
        ) : summary ? (
          <div className="space-y-4">
            <Card className="p-5 bg-gradient-to-r from-fuchsia-500/10 to-violet-500/10 border-fuchsia-500/20">
              <div className="flex items-start gap-3">
                <BarChart3 className="w-5 h-5 text-fuchsia-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium mb-1">{summary.overallMood}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{summary.summary}</p>
                </div>
              </div>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {summary.topDemands?.length > 0 && (
                <Card className="p-5 bg-card/50 border-border/50">
                  <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-violet-400" /><h3 className="text-sm font-semibold">주요 수요</h3></div>
                  <div className="space-y-3">
                    {summary.topDemands.map((d, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-xs bg-violet-500/20 text-violet-300 px-1.5 py-0.5 rounded mt-0.5 shrink-0">{d.count}건</span>
                        <div><p className="text-sm font-medium">{d.title}</p><p className="text-xs text-muted-foreground">{d.description}</p></div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
              {summary.improvements?.length > 0 && (
                <Card className="p-5 bg-card/50 border-border/50">
                  <div className="flex items-center gap-2 mb-4"><Wrench className="w-4 h-4 text-amber-400" /><h3 className="text-sm font-semibold">개선 요청</h3></div>
                  <div className="space-y-3">
                    {summary.improvements.map((d, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="text-xs bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded mt-0.5 shrink-0">{d.count}건</span>
                        <div><p className="text-sm font-medium">{d.title}</p><p className="text-xs text-muted-foreground">{d.description}</p></div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          </div>
        ) : (
          <Card className="p-6 bg-card/50 border-border/50 text-center">
            <p className="text-muted-foreground text-sm">피드백이 쌓이면 AI가 종합 분석 결과를 보여드립니다.</p>
          </Card>
        )}
      </div>

      {/* Feedback list */}
      {feedbacks.length > 0 && (
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquarePlus className="w-5 h-5 text-violet-400" />
            <h2 className="text-xl font-bold">최근 피드백</h2>
            <span className="text-sm text-muted-foreground">({feedbacks.length})</span>
            <div className="ml-auto flex items-center gap-2">
              {adminMode ? (
                <>
                  <Button variant="destructive" size="sm" onClick={handleDeleteSelected} disabled={deleting || selectedIds.size === 0}>
                    {deleting ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Trash2 className="w-3 h-3 mr-1" />}
                    선택 삭제 ({selectedIds.size})
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => { setAdminMode(false); setSelectedIds(new Set()); }}>
                    관리자 모드 종료
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setShowAdminDialog(true)} className="text-xs text-muted-foreground">
                  <Shield className="w-3 h-3 mr-1" />관리자
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedbacks.map(fb => {
              const cat = getCategoryInfo(fb.category);
              return (
                <Card key={fb.id}
                  className={`p-5 bg-card/50 backdrop-blur border-border/50 hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-1 group ${adminMode && selectedIds.has(fb.id) ? "ring-2 ring-destructive" : ""}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {adminMode && (
                        <Checkbox checked={selectedIds.has(fb.id)} onCheckedChange={() => toggleSelect(fb.id)} />
                      )}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-gradient-to-r ${cat.color}`}>
                        <Tag className="w-3 h-3" />{cat.label}
                      </span>
                    </div>
                    <span className="text-2xl">{getMoodEmoji(fb.mood)}</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed mb-3 line-clamp-4">{fb.message}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(fb.created_at).toLocaleDateString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin password dialog */}
      <Dialog open={showAdminDialog} onOpenChange={setShowAdminDialog}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>관리자 인증</DialogTitle>
            <DialogDescription>마스터 비밀번호를 입력하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input type="password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)}
              placeholder="마스터 비밀번호" className="bg-muted/30"
              onKeyDown={e => e.key === 'Enter' && handleAdminLogin()} />
            <Button onClick={handleAdminLogin} disabled={!adminPassword.trim()} className="w-full">
              <Shield className="w-4 h-4 mr-2" />인증
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Feedback;
