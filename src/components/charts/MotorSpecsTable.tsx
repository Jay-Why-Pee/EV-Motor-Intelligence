import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ChevronRight, X } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface MotorSpec {
  oem: string;
  model: string;
  segment: string;
  priceUsd: string;
  motorSupplier: string;
  motorName: string;
  torqueVehicle: string;
  torqueMotor: string;
  powerVehicle: string;
  powerMotor: string;
  maxSpeedVehicle: string;
  maxSpeedMotor: string;
  weightMotor: string;
  notable: string;
}

interface Props {
  data?: MotorSpec[];
}

const columns = [
  { key: "oem", label: "OEM" },
  { key: "model", label: "차종" },
  { key: "segment", label: "Segment" },
  { key: "priceUsd", label: "가격 (USD)" },
  { key: "motorSupplier", label: "모터 공급사" },
  { key: "motorName", label: "모터명" },
  { key: "torqueVehicle", label: "토크 (차량)" },
  { key: "torqueMotor", label: "토크 (모터)" },
  { key: "powerVehicle", label: "출력 (차량)" },
  { key: "powerMotor", label: "출력 (모터)" },
  { key: "maxSpeedVehicle", label: "최대속도 (차량)" },
  { key: "maxSpeedMotor", label: "최대속도 (모터)" },
  { key: "weightMotor", label: "모터 중량" },
  { key: "notable", label: "주목 기술" },
];

const SpecTable = ({ specs, compact }: { specs: MotorSpec[]; compact?: boolean }) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(col => (
            <TableHead key={col.key} className="whitespace-nowrap text-xs font-semibold">
              {col.label}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {specs.map((spec, idx) => (
          <TableRow key={idx}>
            {columns.map(col => (
              <TableCell key={col.key} className="whitespace-nowrap text-xs">
                {(spec as any)[col.key] || "정보 없음"}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export const MotorSpecsTable = ({ data }: Props) => {
  const [expanded, setExpanded] = useState(false);

  if (!data?.length) return null;

  const preview = data.slice(0, 5);

  return (
    <>
      <Card className="p-4 md:p-6 card-glow">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-1">⚡ EV/HEV Motor Specs Database</h3>
            <p className="text-sm text-muted-foreground">글로벌 전기·하이브리드 차량 탑재 모터 성능 비교</p>
          </div>
        </div>
        <SpecTable specs={preview} compact />
        {data.length > 5 && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => setExpanded(true)} className="gap-2">
              더 보기 ({data.length}개 차종)
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={expanded} onOpenChange={setExpanded}>
        <DialogContent className="max-w-[95vw] w-full max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">⚡ EV/HEV Motor Specs Database</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh]">
            <SpecTable specs={data} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
