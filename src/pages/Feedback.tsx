import { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { MessageSquarePlus, Sparkles, Send, ThumbsUp, Clock, Tag } from "lucide-react";
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

interface FeedbackItem {
  id: string;
  category: string;
  message: string;
  mood: number;
  created_at: string;
}

const Feedback = () => {
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [mood, setMood] = useState(3);
  const [category, setCategory] = useState("feature");
  const [submitting, setSubmitting] = useState(false);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const fetchFeedbacks = async () => {
    const { data } = await supabase
      .from("feedback")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setFeedbacks(data);
  };

  const handleSubmit = async () => {
    if (!message.trim()) {
      toast({ title: "메시지를 입력해주세요", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("feedback").insert({ category, message: message.trim(), mood });
    setSubmitting(false);
    if (error) {
      toast({ title: "전송 실패", description: "잠시 후 다시 시도해주세요.", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    setMessage("");
    setMood(3);
    setCategory("feature");
    fetchFeedbacks();
    setTimeout(() => setSubmitted(false), 3000);
  };

  const getCategoryInfo = (val: string) => CATEGORIES.find((c) => c.value === val) || CATEGORIES[3];
  const getMoodEmoji = (val: number) => MOODS.find((m) => m.value === val)?.emoji || "😐";

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeView="feedback" />

      {/* Hero section with creative gradient */}
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
            <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-violet-400 via-fuchsia-400 to-amber-400 bg-clip-text text-transparent">
              피드백 보내기
            </h1>
            <p className="text-muted-foreground text-lg">
              불편했던 점, 원하는 기능, 어떤 이야기든 편하게 남겨주세요 ✨
            </p>
          </div>

          {/* Feedback Form */}
          <Card className="max-w-2xl mx-auto bg-card/60 backdrop-blur-xl border-violet-500/20 shadow-2xl shadow-violet-500/5 p-6 md:p-8">
            {submitted ? (
              <div className="text-center py-12 space-y-4">
                <div className="text-6xl animate-bounce">🎉</div>
                <h3 className="text-2xl font-bold text-foreground">감사합니다!</h3>
                <p className="text-muted-foreground">소중한 피드백이 전달되었습니다.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Mood selector */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">현재 이 서비스의 만족도는?</label>
                  <div className="flex gap-2 justify-center">
                    {MOODS.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => setMood(m.value)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all duration-200 ${
                          mood === m.value
                            ? "bg-violet-500/20 border-2 border-violet-500/50 scale-110"
                            : "bg-muted/30 border-2 border-transparent hover:bg-muted/50 hover:scale-105"
                        }`}
                      >
                        <span className="text-2xl md:text-3xl">{m.emoji}</span>
                        <span className="text-[10px] md:text-xs text-muted-foreground">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Category */}
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-3 block">어떤 종류의 피드백인가요?</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setCategory(c.value)}
                        className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 border bg-gradient-to-r ${c.color} ${
                          category === c.value ? "ring-2 ring-violet-500/50 scale-105" : "opacity-60 hover:opacity-100"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <Textarea
                    placeholder="자유롭게 의견을 남겨주세요... 💬"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="min-h-[120px] bg-muted/30 border-muted focus:border-violet-500/50 resize-none text-base"
                  />
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={submitting || !message.trim()}
                  className="w-full h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white font-semibold text-base shadow-lg shadow-violet-500/20 transition-all duration-300"
                >
                  {submitting ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      피드백 보내기
                    </>
                  )}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Previous feedbacks */}
      {feedbacks.length > 0 && (
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-center gap-3 mb-6">
            <MessageSquarePlus className="w-5 h-5 text-violet-400" />
            <h2 className="text-xl font-bold text-foreground">최근 피드백</h2>
            <span className="text-sm text-muted-foreground">({feedbacks.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {feedbacks.map((fb) => {
              const cat = getCategoryInfo(fb.category);
              return (
                <Card
                  key={fb.id}
                  className="p-5 bg-card/50 backdrop-blur border-border/50 hover:border-violet-500/30 transition-all duration-300 hover:-translate-y-1 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border bg-gradient-to-r ${cat.color}`}
                    >
                      <Tag className="w-3 h-3" />
                      {cat.label}
                    </span>
                    <span className="text-2xl">{getMoodEmoji(fb.mood)}</span>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed mb-3 line-clamp-4">{fb.message}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {new Date(fb.created_at).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default Feedback;
