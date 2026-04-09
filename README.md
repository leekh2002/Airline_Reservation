# 항공권 예약 프로젝트

이 프로젝트는 Node.js, Express, MySQL를 사용해 만든 항공권 예약 웹 애플리케이션입니다.  
사용자는 회원가입과 로그인 후 항공편을 조회하고 예약할 수 있으며, 마이페이지에서 예약 및 취소 내역을 확인할 수 있습니다. 또한 관리자 성격의 계정은 통계 페이지에서 항공사 및 좌석 등급별 예약 건수와 매출 정보를 조회할 수 있습니다.

## 기술 스택

- Backend: Node.js, Express
- Database: MySQL, `mysql2`
- Frontend: HTML, CSS, JavaScript
- API 문서화: Swagger UI, `swagger-jsdoc`
- 메일 전송: Nodemailer
- 날짜 처리: Day.js

## Logical Design
<img width="1776" height="1054" alt="Image" src="https://github.com/user-attachments/assets/f35fc5da-212a-4a8a-9238-e0ae20e8cfa0" />

## 주요 기능

- 회원가입
- 로그인
- 항공편 조회
- 항공권 예약
- 항공권 취소 및 환불 계산
- 예약 내역 조회
- 취소 내역 조회
- 통계 조회
- 예약 완료 이메일 발송

## 프로젝트 구조

```text
term_project/
├─ config/
│  └─ dbconfig.json
├─ public/
│  ├─ login.html
│  ├─ signup.html
│  ├─ flights.html
│  ├─ mypage.html
│  ├─ stats.html
│  └─ js/
│     ├─ login.js
│     ├─ signup.js
│     ├─ flights.js
│     ├─ mypage.js
│     └─ stats.js
├─ swagger/
│  ├─ swagger.js
│  └─ swagger-output.json
├─ svr.js
├─ package.json
└─ README.md
```

## 실행 환경

- Node.js
- npm
- MySQL

## 설치

프로젝트 의존성을 설치합니다.

```bash
npm install
```

## 데이터베이스 설정

서버는 `config/dbconfig.json` 파일에서 MySQL 접속 정보를 읽습니다.

예시:

```json
{
  "host": "127.0.0.1",
  "user": "root",
  "password": "YOUR_PASSWORD",
  "database": "flight_db"
}
```

현재 코드 기준으로 `flight_db` 데이터베이스를 사용하며, 주요 테이블은 아래와 같습니다.

```text
customer
airplain
seats
reserve
cancel
```

참고:

- 이 저장소에는 현재 DB 스키마 생성 SQL이나 초기 데이터 SQL 파일이 포함되어 있지 않습니다.
- 따라서 서버 실행 전, 필요한 테이블과 데이터가 미리 준비되어 있어야 합니다.

## 실행 방법

서버 실행:

```bash
node svr.js
```

서버 기본 주소:

```text
http://127.0.0.1:3000
```

## 주요 페이지

- 로그인 페이지: `http://127.0.0.1:3000/public/login.html`
- 회원가입 페이지: `http://127.0.0.1:3000/public/signup.html`
- 항공편 조회 페이지: `http://127.0.0.1:3000/public/flights.html`
- 마이페이지: `http://127.0.0.1:3000/public/mypage.html`
- 통계 페이지: `http://127.0.0.1:3000/public/stats.html`
- Swagger 문서: `http://127.0.0.1:3000/api-docs`

## 로그인 동작 방식

- 일반 사용자는 로그인 후 `flights.html`로 이동합니다.
- 사용자 ID가 `c0`이면 프론트엔드에서 관리자 계정처럼 처리하여 `stats.html`로 이동합니다.

## 주요 API

### 사용자 관련

- `POST /api/process/signup`
- `POST /api/process/login`

### 항공편 및 예약 관련

- `GET /api/process/getAirplane`
- `POST /api/process/reserve`
- `POST /api/process/cancel`

### 사용자 내역 조회

- `GET /api/process/getReserve`
- `GET /api/process/getCancel`

### 통계

- `GET /api/process/getStatistics`

## 예약 처리 흐름

사용자가 항공권을 예약하면 서버는 다음 순서로 동작합니다.

- 동일 사용자가 같은 항공편을 이미 예약했는지 확인
- 선택한 좌석 등급의 잔여 좌석 수 확인
- `reserve` 테이블에 예약 정보 저장
- `seats` 테이블의 잔여 좌석 수 1 감소
- 고객 이메일 조회
- 예약 완료 이메일 발송

## 취소 처리 흐름

사용자가 항공권을 취소하면 서버는 다음 순서로 동작합니다.

- `reserve` 테이블에서 기존 예약 삭제
- 출발일까지 남은 기간을 기준으로 환불 금액 계산
- `cancel` 테이블에 취소 내역 저장 또는 갱신
- `seats` 테이블의 잔여 좌석 수 1 증가

## 환불 규칙

현재 서버 코드 기준 환불 수수료 규칙은 다음과 같습니다.

- 출발 15일 전 이상: 수수료 `15`
- 출발 4일 전 이상 14일 이하: 수수료 `18`
- 출발 1일 전 이상 3일 이하: 수수료 `25`
- 출발 당일 또는 이후: 환불 없음

정확한 금액 단위는 DB에 저장된 `price`, `payment`, `refund` 값의 기준을 따릅니다.

## 통계 기능

`GET /api/process/getStatistics` API를 통해 아래 정보를 조회할 수 있습니다.

- 항공사별, 좌석 등급별 예약 건수
- 항공사별 총 예약 건수 기준 순위
- 항공사별, 좌석 등급별 매출
- 전체 매출 합계

## Swagger

Swagger UI는 아래 경로에서 확인할 수 있습니다.

```text
http://127.0.0.1:3000/api-docs
```

설정 파일은 `swagger/swagger.js`입니다.

## 참고 사항

- `package.json`에 실행용 npm script가 정의되어 있지 않아 현재는 `node svr.js`로 직접 실행해야 합니다.
- 로그인 상태는 서버 세션이 아니라 브라우저의 `sessionStorage`를 사용해 관리합니다.
- `express-session` 패키지가 설치되어 있지만 현재 인증 흐름에서는 실질적으로 사용되지 않습니다.
- 서버 코드는 데이터베이스 스키마와 초기 데이터가 이미 준비되어 있다고 가정하고 작성되어 있습니다.
- 예약 완료 메일 전송 기능을 사용하려면 올바른 SMTP 계정 정보가 필요합니다.

## 보안 및 유지보수 관점의 주의사항

- DB 접속 정보가 `config/dbconfig.json`에 직접 저장되어 있습니다.
- 메일 계정 정보가 서버 코드에 직접 포함되어 있습니다.
- 비밀번호가 평문으로 저장 및 비교됩니다.
- 관리자 여부를 프론트엔드에서 단순히 `c0` ID로 판별합니다.

실제 서비스 수준으로 개선하려면 아래와 같은 보완이 필요합니다.

- 환경 변수 기반 설정 분리
- 비밀번호 해시 처리
- 서버 기반 인증 및 권한 관리
- DB 마이그레이션 및 시드 데이터 관리

## 개선 제안

- `package.json`에 `start`, `dev` 스크립트 추가
- DB 스키마 및 샘플 데이터 SQL 파일 추가
- 민감 정보 환경 변수 분리
- 비밀번호 암호화 적용
- 관리자 인증 로직 강화
- 입력 검증 및 예외 처리 보강
- 예약/취소 로직에 트랜잭션 적용
