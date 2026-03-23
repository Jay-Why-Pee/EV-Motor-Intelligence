import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Lock, KeyRound, Eye, EyeOff, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface PasswordGateProps {
  onAuthenticated: () => void;
}

const PasswordGate = ({ onAuthenticated }: PasswordGateProps) => {
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  // Password change dialog
  const [changeOpen, setChangeOpen] = useState(false);
  const [masterPw, setMasterPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [changingPw, setChangingPw] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("verify-site-password", {
        body: { password: password },
      });

      if (error) throw error;

      if (data.valid) {
        sessionStorage.setItem("ax_authenticated", "true");
        onAuthenticated();
      } else {
        setShake(true);
        setTimeout(() => setShake(false), 600);
        toast({ title: "비밀번호가 올바르지 않습니다", variant: "destructive" });
      }
    } catch {
      toast({ title: "인증 오류", description: "잠시 후 다시 시도해주세요.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!masterPw.trim() || !newPw.trim()) return;
    setChangingPw(true);

    try {
      const { data, error } = await supabase.functions.invoke("change-site-password", {
        body: { masterPassword: masterPw, newPassword: newPw },
      });

      if (error) throw error;

      if (data.error) {
        toast({ title: "변경 실패", description: data.error, variant: "destructive" });
      } else {
        toast({ title: "비밀번호가 변경되었습니다" });
        setChangeOpen(false);
        setMasterPw("");
        setNewPw("");
      }
    } catch {
      toast({ title: "오류 발생", variant: "destructive" });
    } finally {
      setChangingPw(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      {/* Subtle background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-[100px]" />
      </div>

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
        backgroundSize: "60px 60px"
      }} />

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo / Brand */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-6">
            <span className="text-2xl font-black text-gradient">ML</span>
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">
            EV Motor Lens
          </h1>
          <p className="text-muted-foreground text-sm tracking-wide">
            EV Motor Landscape
          </p>
        </div>

        {/* Password form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className={`relative transition-all duration-300 ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="h-14 pl-11 pr-11 bg-card/50 border-border/50 text-base focus:border-primary/50 focus:ring-primary/20 rounded-xl"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <Button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-base rounded-xl transition-all duration-300 shadow-lg shadow-primary/20"
          >
            {loading ? (
              <span className="animate-spin">⏳</span>
            ) : (
              <>
                <KeyRound className="w-4 h-4 mr-2" />
                기술의 내일을 먼저 보다
              </>
            )}
          </Button>
        </form>

        {/* Password change link */}
        <div className="mt-8 text-center">
          <button
            onClick={() => setChangeOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
          >
            <Settings className="w-3 h-3" />
            비밀번호 변경
          </button>
        </div>

        {/* Bottom branding */}
        <div className="mt-16 text-center">
          <p className="text-[11px] text-muted-foreground/30 tracking-widest uppercase">
            © 2026 AX Project · EV Motor Intelligence
          </p>
        </div>
      </div>

      {/* Password change dialog */}
      <Dialog open={changeOpen} onOpenChange={setChangeOpen}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle>비밀번호 변경</DialogTitle>
            <DialogDescription>마스터 비밀번호를 입력한 후 새 비밀번호를 설정하세요.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">마스터 비밀번호</label>
              <Input
                type="password"
                value={masterPw}
                onChange={(e) => setMasterPw(e.target.value)}
                placeholder="마스터 비밀번호"
                className="bg-muted/30"
              />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">새 비밀번호</label>
              <Input
                type="text"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="새 비밀번호 입력"
                className="bg-muted/30"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={changingPw || !masterPw.trim() || !newPw.trim()}
              className="w-full"
            >
              {changingPw ? "변경 중..." : "비밀번호 변경"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
};

export default PasswordGate;
