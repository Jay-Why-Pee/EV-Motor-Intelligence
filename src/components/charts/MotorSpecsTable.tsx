import { useState, useMemo } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { ChevronRight, Download } from "lucide-react";
import { ScrollArea } from "../ui/scroll-area";

interface MotorSpec {
  year: string;
  oem: string;
  model: string;
  powertrain: string;
  motorPosition: string;
  segment: string;
  priceUsd: string;
  motorSupplier: string;
  torqueNm: string;
  powerKw: string;
  maxSpeedRpm: string;
  rangeKm: string;
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
  { key: "year", label: "연도" },
  { key: "oem", label: "OEM" },
  { key: "model", label: "차종" },
  { key: "powertrain", label: "PT" },
  { key: "motorPosition", label: "위치" },
  { key: "motorSupplier", label: "공급사" },
  { key: "torqueVehicle", label: "차량Nm" },
  { key: "torqueMotor", label: "모터Nm" },
  { key: "powerKw", label: "kW" },
  { key: "maxSpeedRpm", label: "rpm" },
  { key: "rangeKm", label: "km" },
  { key: "notable", label: "기술" },
];

const fullColumns = [
  { key: "year", label: "출시년도" },
  { key: "oem", label: "OEM" },
  { key: "model", label: "차종" },
  { key: "powertrain", label: "파워트레인" },
  { key: "motorPosition", label: "모터 위치" },
  { key: "segment", label: "Segment" },
  { key: "priceUsd", label: "가격 (USD)" },
  { key: "motorSupplier", label: "모터 공급사" },
  { key: "torqueVehicle", label: "차량 토크 (Nm)" },
  { key: "torqueMotor", label: "모터 토크 (Nm)" },
  { key: "powerKw", label: "출력 (kW)" },
  { key: "maxSpeedRpm", label: "최대속도 (rpm)" },
  { key: "rangeKm", label: "주행거리 (km)" },
  { key: "notable", label: "주목 기술" },
];

const getCellValue = (spec: any, key: string): string => {
  let val = spec[key];
  if (val === null || val === undefined || val === "" || val === "정보 없음") {
    if (key === "torqueVehicle") val = spec.torqueVehicle;
    if (key === "torqueMotor") val = spec.torqueMotor || spec.torqueNm;
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
  if (key === "torqueVehicle" || key === "torqueMotor" || key === "torqueNm" || key === "powerKw" || key === "maxSpeedRpm") {
    const cleaned = String(val).replace(/\s*(Nm|kW|rpm)\s*/gi, "").trim();
    return cleaned;
  }
  if (key === "rangeKm") {
    const cleaned = String(val).replace(/\s*(km|mi)\s*/gi, "").trim();
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

const SpecTable = ({ specs, cols }: { specs: MotorSpec[]; cols?: typeof columns }) => {
  const useCols = cols || columns;
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {useCols.map(col => (
              <TableHead key={col.key} className="whitespace-nowrap text-xs font-semibold px-2">
                {col.label}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {specs.map((spec, idx) => (
            <TableRow key={idx}>
              {useCols.map(col => {
                const raw = getCellValue(spec, col.key);
                return (
                  <TableCell key={col.key} className="whitespace-nowrap text-xs px-2">
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
};

export const MotorSpecsTable = ({ data }: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [yearFilter, setYearFilter] = useState("all");
  const [oemFilter, setOemFilter] = useState("all");
  const [speedFilter, setSpeedFilter] = useState("all");
  const [powertrainFilter, setPowertrainFilter] = useState("all");

  const sorted = useMemo(() =>
    data?.length
      ? [...data].sort((a, b) => (parseInt(b.year) || 0) - (parseInt(a.year) || 0))
      : [],
    [data]
  );

  const years = useMemo(() => [...new Set(sorted.map(s => s.year).filter(y => y !== "-"))].sort((a, b) => b.localeCompare(a)), [sorted]);
  const oems = useMemo(() => [...new Set(sorted.map(s => s.oem).filter(o => o !== "-"))].sort(), [sorted]);
  const powertrains = useMemo(() => [...new Set(sorted.map(s => s.powertrain).filter(p => p && p !== "-"))].sort(), [sorted]);

  const filtered = useMemo(() => {
    return sorted.filter(spec => {
      if (yearFilter !== "all" && spec.year !== yearFilter) return false;
      if (oemFilter !== "all" && spec.oem !== oemFilter) return false;
      if (powertrainFilter !== "all" && spec.powertrain !== powertrainFilter) return false;
      if (speedFilter !== "all") {
        const speed = getSpeedNumeric(spec);
        if (speedFilter === "low" && speed > 10000) return false;
        if (speedFilter === "mid" && (speed <= 10000 || speed > 16000)) return false;
        if (speedFilter === "high" && speed <= 16000) return false;
      }
      return true;
    });
  }, [sorted, yearFilter, oemFilter, speedFilter, powertrainFilter]);

  const missingStats = useMemo(() => {
    return filtered.reduce(
      (acc, spec) => {
        if (getCellValue(spec, "powertrain") === "-") acc.powertrain += 1;
        if (getCellValue(spec, "motorPosition") === "-") acc.motorPosition += 1;
        if (getCellValue(spec, "rangeKm") === "-") acc.rangeKm += 1;
        return acc;
      },
      { powertrain: 0, motorPosition: 0, rangeKm: 0 }
    );
  }, [filtered]);

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
      <Select value={powertrainFilter} onValueChange={setPowertrainFilter}>
        <SelectTrigger className="w-[150px] h-9 text-sm">
          <SelectValue placeholder="파워트레인" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 타입</SelectItem>
          {powertrains.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  const handleCsvDownload = () => {
    const csvCols = fullColumns;
    const header = csvCols.map(c => c.label).join(",");
    const rows = filtered.map(spec =>
      csvCols.map(c => {
        const val = formatCell(c.key, getCellValue(spec, c.key));
        return `"${val.replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csv = "\uFEFF" + [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ev_motor_specs_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Card className="p-4 md:p-6 card-glow">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold mb-1">⚡ EV/HEV Motor Specs Database</h3>
            <p className="text-sm text-muted-foreground">글로벌 전기·하이브리드 차량 탑재 모터 성능 비교 ({filtered.length}개 차종)</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleCsvDownload} className="gap-2">
            <Download className="w-4 h-4" />
            CSV
          </Button>
        </div>
        <Filters />
        <SpecTable specs={preview} />
        <div className="mt-3 space-y-1 text-xs text-muted-foreground">
          <p>
            '-' 표기는 공식 출처(OEM 스펙시트/WLTP/EPA/공식 발표)에서 검증 가능한 수치를 확인하지 못한 경우에만 사용됩니다.
          </p>
          <p>
            HEV/MHEV는 EV 모드 주행거리(km)를 제조사가 별도 공개하지 않는 경우가 많아 주행거리 열이 '-'로 남을 수 있습니다.
          </p>
          {(missingStats.powertrain > 0 || missingStats.motorPosition > 0 || missingStats.rangeKm > 0) && (
            <p>
              현재 필터 결과 미확인 건수 — 파워트레인 {missingStats.powertrain}건 · 모터 위치 {missingStats.motorPosition}건 · 주행거리 {missingStats.rangeKm}건
            </p>
          )}
        </div>
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
            <SpecTable specs={filtered} cols={fullColumns} />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
