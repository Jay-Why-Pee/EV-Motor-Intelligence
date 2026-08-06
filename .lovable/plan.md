# 트렌드 브리핑 이력 선택 삭제 (관리자)

## 1. 관리자 비밀번호
현재 프로젝트의 관리자(마스터) 비밀번호는 **`JYPisgood`** 입니다.
(사이트 접속 비밀번호는 별도이며 기본값 `lifeisgood`, 관리자 비밀번호로 변경 가능)

## 2. 추가할 기능

트렌드 브리핑 페이지 "이전 브리핑 기록" 영역에 관리자 삭제 모드를 추가합니다.

- 기록 헤더 우측에 "관리자" 버튼 → 클릭 시 비밀번호 입력 다이얼로그
- `JYPisgood` 입력 성공 시 삭제 모드 활성화 (세션 동안 유지)
- 삭제 모드에서는 각 브리핑 기록 항목에 체크박스 + 개별 삭제 버튼 표시
- 여러 건 선택 후 "선택 삭제" 버튼으로 일괄 삭제, 확인 다이얼로그 후 실행
- 삭제 후 목록 자동 새로고침, 성공/실패 토스트 표시
- 비밀번호가 틀리면 삭제 불가 (실제 삭제 권한은 서버에서만 검증)

## 기술 상세

- 새 엣지 함수 `manage-briefing-history`
  - 입력: `{ masterPassword, ids: string[] }`
  - `JYPisgood` 검증 실패 시 403 반환
  - 검증 통과 시 service role 클라이언트로 `briefing_history`에서 해당 id 삭제
  - `supabase/config.toml`에 `verify_jwt = false` 등록
  - 기존 `manage-feedback` 함수와 동일한 패턴 사용
- `briefing_history` 테이블은 이미 service_role 삭제 정책이 있어 DB 변경 불필요
- `src/pages/TrendBriefing.tsx`: 관리자 상태/선택 상태, 비밀번호 다이얼로그, 체크박스 UI, 삭제 호출 및 `fetchHistory()` 재실행 추가
- 클라이언트에는 비밀번호를 하드코딩하지 않고 항상 엣지 함수로 검증
