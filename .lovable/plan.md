

## Plan: Motor Spec DB 개선, 필터 추가, 변경이력/가이드 업데이트

### 1. Motor Spec DB 표시 형식 개선 (`MotorSpecsTable.tsx`)

**formatCell 함수 수정**: 토크/출력/최대속도 셀에서 단위를 붙이지 않고 숫자만 표시. 헤더에 이미 단위가 명시되어 있으므로 데이터 행에서는 숫자(또는 슬래시 구분 듀얼 모터 값)만 표기.

- `formatCell`에서 `torqueNm`, `powerKw`, `maxSpeedRpm` 케이스의 단위 추가 로직 제거 → 숫자만 반환
- 가격은 기존대로 `$` prefix 유지

### 2. 필터 기능 추가 (`MotorSpecsTable.tsx`)

표 상단에 3개 필터 드롭다운 추가:
- **출시년도 필터**: Select로 연도 목록 (전체 + 고유 연도값)
- **OEM 필터**: Select로 OEM 목록 (전체 + 고유 OEM값)
- **속도 필터**: Select로 속도 범위 (전체, ~10000rpm, 10001~16000rpm, 16001rpm~)

필터 적용 후 preview(5개)와 expanded 모달 모두에 반영.

### 3. AI 프롬프트 개선 (`analyze-dashboard/index.ts`)

- 듀얼 모터 차량의 경우 토크/출력을 슬래시(`/`)로 구분해 기재하도록 프롬프트에 명시 (예: `"300/200"`)
- 차종 수 목표를 더 강화 (최소 100개 이상)
- `max_tokens`를 20000으로 증가

### 4. 변경이력 업데이트 (`Changelog.tsx`)

최상단에 새 항목 추가 (2026.03.26 두 번째 업데이트):
- Motor Spec DB: 듀얼 모터 슬래시 표기, 단위 헤더만 표시, 필터 기능 추가
- 차종 수 확대 (100개+ 목표)
- 가이드 페이지 디자인 개선

### 5. 가이드 페이지 업데이트 (`Guide.tsx`)

**내용 업데이트**:
- "인사이트" 항목 삭제 (이미 News Pulse로 이전됨)
- "차트" 설명을 워드클라우드 + 모터 스펙 DB + 로드맵 구성으로 갱신
- "뉴스" 설명에 News Pulse 언급 추가

**디자인 개선**:
- 아이콘+텍스트 레이아웃을 더 깔끔한 구조로 리팩터링
- 각 카드에 번호 표기 추가 (1, 2, 3...)
- 사용 방법 섹션을 좀 더 시각적으로 구분
- 전체적으로 더 타이트한 패딩과 명확한 계층 구조

### 수정 파일 목록
| File | Changes |
|------|---------|
| `src/components/charts/MotorSpecsTable.tsx` | formatCell 단위 제거, 필터 UI 추가, 필터 로직 |
| `supabase/functions/analyze-dashboard/index.ts` | 듀얼 모터 슬래시 표기 프롬프트, max_tokens 증가 |
| `src/pages/Changelog.tsx` | 최신 변경사항 항목 추가 |
| `src/pages/Guide.tsx` | 내용 현행화 + 디자인 개선 |

