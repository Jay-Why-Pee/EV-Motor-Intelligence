import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MessageSquareHeart } from "lucide-react";

export const ExitIntentDialog = () => {
  const [open, setOpen] = useState(false);
  const [shown, setShown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleMouseOut = (e: MouseEvent) => {
      if (shown) return;
      if (e.clientY <= 5 && e.relatedTarget === null) {
        setOpen(true);
        setShown(true);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    document.addEventListener("mouseout", handleMouseOut);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("mouseout", handleMouseOut);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shown]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg text-center">
        <DialogHeader className="items-center">
          <MessageSquareHeart className="w-12 h-12 text-primary mb-2" />
          <DialogTitle className="text-xl">잠깐만요!</DialogTitle>
          <DialogDescription className="text-base leading-relaxed mt-3 whitespace-pre-line">
            떠나시기 전에 사용경험을 피드백으로 남겨주시면 다음 방문할 때는 더 나은 기능을 제공할 수 있습니다.{"\n\n"}
            소중한 고견이 간절하오니 매정하게 떠나는 발걸음을 잠시 돌려 30초만 할애해주시면 감사드리겠습니다.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button
            size="lg"
            className="w-full text-lg py-8 font-bold"
            onClick={() => {
              setOpen(false);
              navigate("/feedback");
            }}
          >
            돌아가서 피드백 남기기
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-1/3 mx-auto text-xs text-muted-foreground"
            onClick={() => setOpen(false)}
          >
            매정한 사람 되기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
