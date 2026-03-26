import { useState, useMemo } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
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
  notable: string;
  torqueVehicle?: string;
  torqueMotor?: string;
  powerVehicle?: string;
  powerMotor?: string;
  maxSpeedVehicle?: string;
  maxSpeedMotor?: string;
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
  { key: "notable", label: "주목 기술" },
];

const getCellValue = (spec: any, key: string): string => {
  let val = spec[key];
  if (val === null || val === undefined || val === "" || val === "정보 없음") {
    if (key === "torqueNm") val = spec.torqueMotor || spec.torqueVehicle;
    if (key === "powerKw") val = spec.powerMotor || spec.powerVehicle;
    if (key === "maxSpeedRpm") val = spec.maxSpeedMotor || spec.maxSpeedVehicle;
  }
  if (val === null || val === undefined || val === "" || val === "정보 없음") return "-";
  return String(val);
};

const formatCell = (key: string, val: string): string => {
  if (val === "-") return "-";
  if (key === "priceUsd") {
    const num = parseInt(String(val).replace(/[^0-9]/g, ""));
    return isNaN(num) ? val : `$${num.toLocaleString()}`;
  }
  // For torque, power, maxSpeed — strip units, show numbers only (units are in header)
  if (key === "torqueNm" || key === "powerKw" || key === "maxSpeedRpm") {
    // Support slash-separated dual motor values like "300/200"
    const cleaned = String(val).replace(/\s*(Nm|kW|rpm)\s*/gi, "").trim();
    return cleaned;
  }
  return val;
};

const getSpeedNumeric = (spec: MotorSpec): number => {
  const raw = getCellValue(spec, "maxSpeedRpm");
  if (raw === "-") return 0;
  const nums = String(raw).replace(/[^0-9/]/g, "").split("/").map(Number).filter(n => !isNaN(n));
  return nums.length ? Math.max(...nums) : 0;
};

const SpecTable = ({ specs }: { specs: MotorSpec[] }) => (
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(col => (
            <TableHead key={col.key} className="whitespace-nowrap text-sm font-semibold">
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
                <TableCell key={col.key} className="whitespace-nowrap text-sm">
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
  const [yearFilter, setYearFilter] = useState("all");
  const [oemFilter, setOemFilter] = useState("all");
  const [speedFilter, setSpeedFilter] = useState("all");

  const sorted = useMemo(() =>
    data?.length
      ? [...data].sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0))
      : [],
    [data]
  );

  const years = useMemo(() => [...new Set(sorted.map(s => s.year).filter(y => y !== "-"))].sort((a, b) => b.localeCompare(a)), [sorted]);
  const oems = useMemo(() => [...new Set(sorted.map(s => s.oem).filter(o => o !== "-"))].sort(), [sorted]);

  const filtered = useMemo(() => {
    return sorted.filter(spec => {
      if (yearFilter !== "all" && spec.year !== yearFilter) return false;
      if (oemFilter !== "all" && spec.oem !== oemFilter) return false;
      if (speedFilter !== "all") {
        const speed = getSpeedNumeric(spec);
        if (speedFilter === "low" && speed > 10000) return false;
        if (speedFilter === "mid" && (speed <= 10000 || speed > 16000)) return false;
        if (speedFilter === "high" && speed <= 16000) return false;
      }
      return true;
    });
  }, [sorted, yearFilter, oemFilter, speedFilter]);

  if (!data?.length) return null;

  const preview = filtered.slice(0, 5);

  const Filters = () => (
    <div className="flex flex-wrap gap-3 mb-4">
      <Select value={yearFilter} onValueChange={setYearFilter}>
        <SelectTrigger className="w-[130px] h-9 text-sm">
          <SelectValue placeholder="출시년도" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 연도</SelectItem>
          {years.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={oemFilter} onValueChange={setOemFilter}>
        <SelectTrigger className="w-[160px] h-9 text-sm">
          <SelectValue placeholder="OEM" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 OEM</SelectItem>
          {oems.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={speedFilter} onValueChange={setSpeedFilter}>
        <SelectTrigger className="w-[170px] h-9 text-sm">
          <SelectValue placeholder="최대속도" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 속도</SelectItem>
          <SelectItem value="low">~10,000 rpm</SelectItem>
          <SelectItem value="mid">10,001~16,000 rpm</SelectItem>
          <SelectItem value="high">16,001 rpm~</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <Card className="p-4 md:p-6 card-glow">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-1">⚡ EV/HEV Motor Specs Database</h3>
            <p className="text-sm text-muted-foreground">글로벌 전기·하이브리드 차량 탑재 모터 성능 비교 ({filtered.length}개 차종)</p>
          </div>
        </div>
        <Filters />
        <SpecTable specs={preview} />
        {filtered.length > 5 && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" onClick={() => setExpanded(true)} className="gap-2">
              더 보기 ({filtered.length}개 차종)
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
          <Filters />
          <ScrollArea className="h-[65vh]">
            <SpecTable specs={filtered} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
