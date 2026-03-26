import { useState } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { ChevronRight } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface MotorSpec {
  year: string;
  oem: string;
  model: string;
  segment: string;
  priceUsd: string;
  motorSupplier: string;
  torqueNm: string;
  powerKw: string;
  maxSpeedRpm: string;
  weightKg: string;
  notable: string;
  // legacy fields for backward compat
  torqueVehicle?: string;
  torqueMotor?: string;
  powerVehicle?: string;
  powerMotor?: string;
  maxSpeedVehicle?: string;
  maxSpeedMotor?: string;
  weightMotor?: string;
}

interface Props {
  data?: MotorSpec[];
}

const columns = [
  { key: "year", label: "출시년도" },
  { key: "oem", label: "OEM" },
  { key: "model", label: "차종" },
  { key: "segment", label: "Segment" },
  { key: "priceUsd", label: "가격 (USD)" },
  { key: "motorSupplier", label: "모터 공급사" },
  { key: "torqueNm", label: "토크 (Nm)" },
  { key: "powerKw", label: "출력 (kW)" },
  { key: "maxSpeedRpm", label: "최대속도 (rpm)" },
  { key: "weightKg", label: "중량 (kg)" },
  { key: "notable", label: "주목 기술" },
];

const getCellValue = (spec: any, key: string): string => {
  // Try new field names first, then fall back to legacy
  let val = spec[key];
  if (!val || val === "정보 없음") {
    // Legacy field mappings
    if (key === "torqueNm") val = spec.torqueMotor || spec.torqueVehicle;
    if (key === "powerKw") val = spec.powerMotor || spec.powerVehicle;
    if (key === "maxSpeedRpm") val = spec.maxSpeedMotor || spec.maxSpeedVehicle;
    if (key === "weightKg") val = spec.weightMotor;
  }
  if (!val || val === "정보 없음") return "-";
  return val;
};

const formatCell = (key: string, val: string): string => {
  if (val === "-") return "-";
  if (key === "priceUsd") {
    const num = parseInt(val.replace(/[^0-9]/g, ""));
    return isNaN(num) ? val : `$${num.toLocaleString()}`;
  }
  if (key === "torqueNm" && !val.includes("Nm")) {
    const num = parseFloat(val.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? val : `${num} Nm`;
  }
  if (key === "powerKw" && !val.includes("kW")) {
    const num = parseFloat(val.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? val : `${num} kW`;
  }
  if (key === "maxSpeedRpm" && !val.includes("rpm")) {
    const num = parseInt(val.replace(/[^0-9]/g, ""));
    return isNaN(num) ? val : `${num.toLocaleString()} rpm`;
  }
  if (key === "weightKg" && !val.includes("kg")) {
    const num = parseFloat(val.replace(/[^0-9.]/g, ""));
    return isNaN(num) ? val : `${num} kg`;
  }
  return val;
};

const SpecTable = ({ specs }: { specs: MotorSpec[] }) => (
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
            {columns.map(col => {
              const raw = getCellValue(spec, col.key);
              return (
                <TableCell key={col.key} className="whitespace-nowrap text-xs">
                  {formatCell(col.key, raw)}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);

export const MotorSpecsTable = ({ data }: Props) => {
  const [expanded, setExpanded] = useState(false);

  if (!data?.length) return null;

  // Sort by year descending
  const sorted = [...data].sort((a, b) => {
    const ya = parseInt(a.year) || 0;
    const yb = parseInt(b.year) || 0;
    return yb - ya;
  });

  const preview = sorted.slice(0, 5);

  return (
    <>
      <Card className="p-4 md:p-6 card-glow">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-1">⚡ EV/HEV Motor Specs Database</h3>
            <p className="text-sm text-muted-foreground">글로벌 전기·하이브리드 차량 탑재 모터 성능 비교</p>
          </div>
        </div>
        <SpecTable specs={preview} />
        {sorted.length > 5 && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => setExpanded(true)} className="gap-2">
              더 보기 ({sorted.length}개 차종)
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
            <SpecTable specs={sorted} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
