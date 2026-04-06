const express = require('express'); // Express 모듈 불러오기
const mysql = require('mysql2/promise'); // MySQL 연결을 위한 모듈
const path = require('path'); // 파일 및 디렉토리 경로 처리 모듈
const static = require('serve-static'); // 정적 파일 서빙을 위한 모듈
const session = require('express-session'); // 세션 관리를 위한 모듈
const dbconfig = require('./config/dbconfig.json'); // 데이터베이스 설정 파일
const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const options = require('./swagger/swagger.js');
const nodemailer = require('nodemailer');
const dayjs = require('dayjs');
const specs = swaggerJSDoc(options);

const pool = mysql.createPool({
  connectionLimit: 10,
  host: dbconfig.host,
  user: dbconfig.user,
  password: dbconfig.password,
  database: dbconfig.database,
  multipleStatements: true,
  debug: false,
  dateStrings: true,
});

const app = express(); // Express 앱 생성

app.use(express.urlencoded({ extended: true })); // URL-encoded 데이터 파싱
app.use(express.json()); //JSON 형태의 요청(request) body를 파싱(parse)하기 위해 사용
app.use('/public', static(path.join(__dirname, 'public'))); // `/public` 경로로 정적 파일 제공
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

function getSMTPConfig(email, password) {
  const domain = email.split('@')[1];

  switch (domain) {
    case 'gmail.com':
      return {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: email, pass: password },
      };
    case 'naver.com':
      return {
        host: 'smtp.naver.com',
        port: 465,
        secure: true,
        auth: { user: email, pass: password },
      };
    case 'outlook.com':
    case 'hotmail.com':
    case 'office365.com':
      return {
        host: 'smtp.office365.com',
        port: 587,
        secure: false,
        auth: { user: email, pass: password },
      };
    case 'yahoo.com':
      return {
        host: 'smtp.mail.yahoo.com',
        port: 465,
        secure: true,
        auth: { user: email, pass: password },
      };
    default:
      throw new Error('지원하지 않는 이메일 도메인입니다: ' + domain);
  }
}

async function sendMail({ senderEmail, senderPassword, to, subject, html }) {
  try {
    const config = getSMTPConfig(senderEmail, senderPassword);
    const transporter = nodemailer.createTransport(config);

    const mailOptions = {
      from: senderEmail,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ 메일 전송 성공:', info.response);
  } catch (err) {
    console.error('❌ 메일 전송 실패:', err);
  }
}


app.post('/api/process/signup', async (req, res) => {
  // 요청 본문에서 필요한 회원가입 정보 추출
  const { userName, userId, pw, confirmPw, email, passport } = req.body;

  // 비밀번호와 비밀번호 확인이 일치하지 않을 경우 에러 응답
  if (pw != confirmPw)
    return res.json({ state: -1, msg: '비밀번호가 일치하지 않습니다.' });

  let conn;
  try {
    // DB 연결
    conn = await pool.getConnection();

    // 동일한 회원 ID(cno)가 이미 존재하는지 확인
    const [customerRows] = await conn.query(
      'select cno from customer where cno = ?',
      [userId]
    );

    // 이미 존재할 경우 에러 응답
    if (customerRows.length != 0) {
      conn.release(); // 연결 해제
      return res.json({ state: -1, msg: '이미 존재하는 회원ID입니다.' });
    }

    // 회원 정보 DB에 삽입
    const [insertResult] = await conn.query(
      'insert into customer (cno, name, passwd, email, passportNumber) values (?, ?, ?, ?, ?);',
      [userId, userName, pw, email, passport]
    );

    // 성공 응답 반환
    return res.json({ state: 1, msg: '회원가입 완료' });
  } catch (err) {
    // 서버 에러 처리
    console.error('에러 발생:', err);
    return res.status(500).json({ state: -1, msg: '서버 오류' });
  } finally {
    // DB 연결 해제
    if (conn) conn.release();
  }
});


app.post('/api/process/login', async (req, res) => {
  // 요청 본문에서 userId와 pw 추출
  const { userId, pw } = req.body;

  let conn;

  try {
    // 커넥션 풀에서 연결을 가져옴
    conn = await pool.getConnection();

    // 고객 테이블에서 해당 ID와 비밀번호가 일치하는 레코드 조회
    const [customerRows] = await conn.query(
      'select * from customer where cno = ? and passwd = ?;',
      [userId, pw]
    );

    // 일치하는 레코드가 없으면 로그인 실패 응답 전송
    if (customerRows.length == 0) {
      return res.json({
        state: -1,
        msg: 'id 혹은 패스워드가 일치하지 않습니다.',
      });
    }

    // 로그인 성공 응답 전송
    return res.json({ state: 1, msg: '로그인 성공' });
  } catch (err) {
    // 예외 발생 시 에러 로그 출력 후 서버 오류 응답
    console.error('에러 발생:', err);
    return res.status(500).json({ state: -1, msg: '서버 오류' });
  } finally {
    // 연결을 반환하여 리소스를 해제
    if (conn) conn.release();
  }
});


app.get('/api/process/getAirplane', async (req, res) => {
  // 클라이언트에서 보낸 쿼리 파라미터 추출
  const { departureAirport, arrivalAirport, departureDateTime, seatClass } =
    req.query;
  console.log(departureAirport, arrivalAirport, departureDateTime, seatClass);

  let conn;
  try {
    // DB 연결
    conn = await pool.getConnection();

    // 항공편 및 좌석 정보 조회 쿼리 실행
    const [airplaneRows] = await conn.query(
      `
      SELECT 
        a.airline, 
        a.flightNo, 
        a.departureDateTime, 
        a.arrivalDateTime, 
        a.departureAirport, 
        a.arrivalAirport, 
        s.seatClass, 
        s.price, 
        s.no_of_seats
      FROM airplain a
      JOIN seats s 
        ON a.flightNo = s.flightNo 
        AND a.departureDateTime = s.departureDateTime
      WHERE 
        a.departureAirport = ? AND
        a.arrivalAirport = ? AND
        DATE(a.departureDateTime) = ? AND
        s.seatClass = ?;
      `,
      [departureAirport, arrivalAirport, departureDateTime, seatClass]
    );

    // 조회 결과를 JSON 형식으로 응답
    return res.json({ result: airplaneRows });
  } catch (err) {
    // 에러 발생 시 서버 오류 응답
    console.error('에러 발생:', err);
    return res.status(500).json({ state: -1, msg: '서버 오류' });
  } finally {
    // DB 연결 반환
    if (conn) conn.release();
  }
});


app.post('/api/process/reserve', async (req, res) => {
  // 요청 바디에서 예약 정보 추출
  const { cno, flightNo, departureDateTime, seatClass } = req.body;

  // 예약 시각을 현재 시각으로 설정
  const reserveDateTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

  console.log('afsesf');

  // 응답 객체 미리 초기화
  let response = {
    state: '',
    msg: '',
    airline: '',
    departureAirport: '',
    arrivalAirport: '',
    arrivalDateTime: '',
    payment: '',
    flightNo,
    departureDateTime,
    reserveDateTime,
    seatClass,
  };

  let conn;
  try {
    conn = await pool.getConnection();

    // [1] 동일 항공편에 이미 예약이 있는지 확인
    const [existingRows] = await conn.query(
      `
      SELECT * 
      FROM reserve 
      WHERE flightNo = ? AND departureDateTime = ? AND cno = ?;
      `,
      [flightNo, departureDateTime, cno]
    );

    if (existingRows.length > 0) {
      response.state = -1;
      response.msg = '이미 예약 내역이 존재하는 항공권 입니다.';
      return res.json(response);
    }

    // [2] 잔여 좌석 확인
    const [seats] = await conn.query(
      `
      SELECT no_of_seats
      FROM seats
      WHERE flightNo = ? AND departureDateTime = ? AND seatClass = ?;
      `,
      [flightNo, departureDateTime, seatClass]
    );

    if (seats[0].no_of_seats <= 0) {
      response.state = -1;
      response.msg = '잔여 좌석이 없습니다.';
      return res.json(response);
    }

    // [3] 예약 정보 DB에 삽입 (가격은 seats 테이블에서 가져옴)
    const [insertResult] = await conn.query(
      `
      INSERT INTO reserve (flightNo, departureDateTime, seatClass, payment, reserveDateTime, cno)
      SELECT flightNo, departureDateTime, seatClass, price, ?, ?
      FROM seats
      WHERE flightNo = ? AND departureDateTime = ? AND seatClass = ?;
      `,
      [reserveDateTime, cno, flightNo, departureDateTime, seatClass]
    );

    if (insertResult.affectedRows === 0) {
      response.state = -1;
      response.msg = '예약 실패 (좌석 정보 없음)';
      return res.json(response);
    }

    // [4] 좌석 수 -1로 업데이트
    await conn.query(
      `
      UPDATE seats
      SET no_of_seats = ?
      WHERE flightNo = ? AND departureDateTime = ? AND seatClass = ?;
      `,
      [seats[0].no_of_seats - 1, flightNo, departureDateTime, seatClass]
    );

    // [5] 항공편 상세 정보 조회
    const [infoRows] = await conn.query(
      `
      SELECT a.airline, a.departureAirport, a.arrivalAirport, a.arrivalDateTime, s.price, s.seatClass
      FROM airplain a 
      JOIN seats s ON a.flightNo = s.flightNo AND a.departureDateTime = s.departureDateTime
      WHERE s.seatClass = ? AND a.flightNo = ? AND a.departureDateTime = ?;
      `,
      [seatClass, flightNo, departureDateTime]
    );

    if (infoRows.length === 0) {
      response.state = -1;
      response.msg = '예약은 되었지만 항공편 정보 조회 실패';
      return res.json(response);
    }

    // [6] 고객 이메일 조회
    const [customerEmail] = await conn.query(
      `
      SELECT email
      FROM customer
      WHERE cno = ?;
      `,
      [cno]
    );
    console.log(customerEmail[0].email);

    // [7] 응답 객체에 예약 정보 설정
    const result = infoRows[0];
    response.state = 1;
    response.msg = '예약 성공';
    response.airline = result.airline;
    response.departureAirport = result.departureAirport;
    response.arrivalAirport = result.arrivalAirport;
    response.seatClass = result.seatClass;
    response.arrivalDateTime = dayjs(result.arrivalDateTime).format(
      'YYYY-MM-DD HH:mm:ss'
    );
    response.payment = result.price;

    // [8] 이메일 발송
    await sendMail({
      senderEmail: 'leekyouhyuk2002@gmail.com',
      senderPassword: 'opxj imit yoab etsr', //앱 비밀번호
      to: customerEmail[0].email,
      subject: '예약 완료 안내',
      html: `
        <h1>예약이 완료되었습니다</h1>
        <p>고객님의 항공권 예약이 성공적으로 완료되었습니다.</p>
        <hr />
        <h2>📄 예약 상세 정보</h2>
        <ul>
          <li><strong>항공사명:</strong> ${response.airline}</li>
          <li><strong>운항편명:</strong> ${response.flightNo}</li>
          <li><strong>출발 공항:</strong> ${response.departureAirport}</li>
          <li><strong>도착 공항:</strong> ${response.arrivalAirport}</li>
          <li><strong>출발 일시:</strong> ${response.departureDateTime}</li>
          <li><strong>도착 일시:</strong> ${response.arrivalDateTime}</li>
          <li><strong>결제 금액:</strong> ${response.payment}만원</li>
          <li><strong>예약 시간:</strong> ${response.reserveDateTime}</li>
        </ul>
        <p>감사합니다.</p>
      `,
    });

    return res.json(response);
  } catch (err) {
    console.error('에러 발생:', err);
    return res.status(500).json({ state: -1, msg: '서버 오류' });
  } finally {
    // 연결 반환
    if (conn) conn.release();
  }
});


// 항공권 예약 취소 처리 API
app.post('/api/process/cancel', async (req, res) => {
  const { cno, flightNo, departureDateTime, seatClass } = req.body;
  let cancelDateTime = dayjs(); // 현재 시간 기준 취소 시간 생성

  // 클라이언트로 반환할 응답 객체 초기화
  let response = {
    state: '',
    msg: '',
    airline: '',
    departureAirport: '',
    arrivalAirport: '',
    arrivalDateTime: '',
    refund: '',
    flightNo,
    departureDateTime,
    cancelDateTime,
    seatClass,
  };

  let conn;
  try {
    conn = await pool.getConnection(); // DB 커넥션 획득

    // 해당 좌석 가격 조회
    const [price] = await conn.query(
      `
      select price 
      from seats
      where flightNo = ? and departureDateTime = ? and seatClass = ?;
      `,
      [flightNo, departureDateTime, seatClass]
    );

    // 예약 정보 삭제
    const [deleteRows] = await conn.query(
      `
      delete from reserve
      where cno = ? and flightNo = ? and departureDateTime = ? and seatClass = ?;
      `,
      [cno, flightNo, departureDateTime, seatClass]
    );

    // 삭제된 예약이 없으면 실패 처리
    if (deleteRows.affectedRows === 0) {
      response.state = -1;
      response.msg = '취소 실패 (예약 정보 없음)';
      return res.json(response);
    }

    // 출발일까지 남은 일 수 계산
    const diffInDays = -cancelDateTime
      .startOf('day')
      .diff(dayjs(departureDateTime).startOf('day'), 'day');

    // 환불 수수료 계산
    let cancellationFee = 0;
    if (diffInDays >= 15) cancellationFee = 15;
    else if (diffInDays >= 4 && diffInDays < 15) cancellationFee = 18;
    else if (diffInDays <= 3 && diffInDays >= 1) cancellationFee = 25;
    else cancellationFee = price[0].price; // 당일 취소 시 환불 없음

    // 환불 금액 계산
    const refund = price[0].price - cancellationFee;
    cancelDateTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

    // cancel 테이블에 기존 데이터가 있는지 확인
    const [existing] = await conn.query(
      `SELECT * FROM cancel WHERE flightNo = ? AND departureDateTime = ? AND seatClass = ? AND cno = ?`,
      [flightNo, departureDateTime, seatClass, cno]
    );

    if (existing.length > 0) {
      // 기존 취소 내역 존재 시 UPDATE
      await conn.query(
        `
        UPDATE cancel
        SET refund = ?, cancelDateTime = ?
        WHERE flightNo = ? AND departureDateTime = ? AND seatClass = ? AND cno = ?
        `,
        [refund, cancelDateTime, flightNo, departureDateTime, seatClass, cno]
      );
    } else {
      // 취소 내역이 없으면 INSERT
      await conn.query(
        `
        INSERT INTO cancel (flightNo, departureDateTime, seatClass, refund, cancelDateTime, cno)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [flightNo, departureDateTime, seatClass, refund, cancelDateTime, cno]
      );
    }

    // 좌석 수 1 증가 처리 (빈 좌석 복구)
    const [updateSeats] = await conn.query(
      `
      update seats
      set no_of_seats = no_of_seats + 1
      where flightNo = ? AND departureDateTime = ? AND seatClass = ?;
      `,
      [flightNo, departureDateTime, seatClass]
    );

    // 항공편 정보 조회 (응답용)
    const [infoRows] = await conn.query(
      `
      select airline, departureAirport, arrivalAirport, arrivalDateTime
      from airplain
      where flightNo = ? and departureDateTime = ?;
      `,
      [flightNo, departureDateTime]
    );

    // 응답 객체에 결과 채움
    const result = infoRows[0];
    response.state = 1;
    response.msg = '취소 완료';
    response.airline = result.airline;
    response.departureAirport = result.departureAirport;
    response.arrivalAirport = result.arrivalAirport;
    response.cancelDateTime = cancelDateTime;
    response.seatClass = seatClass;
    response.arrivalDateTime = dayjs(result.arrivalDateTime).format('YYYY-MM-DD HH:mm:ss');
    response.refund = refund;

    return res.json(response); // 응답 반환
  } catch (err) {
    console.error('에러 발생:', err);
    return res.status(500).json({ state: -1, msg: '서버 오류' });
  } finally {
    if (conn) conn.release(); // 커넥션 반환
  }
});



// 예약 내역을 조회하는 API
app.get('/api/process/getReserve', async (req, res) => {
  const { startDate, endDate, cno } = req.query; // 쿼리 파라미터에서 날짜 범위와 고객번호(cno) 추출

  let conn;
  try {
    conn = await pool.getConnection(); // 데이터베이스 커넥션 획득

    // 예약 정보를 seats, airplain 테이블과 조인하여 조회
    const [reserveRows] = await conn.query(
      `
      SELECT
        a.airline,              -- 항공사 이름
        a.flightNo,             -- 항공편 번호
        a.departureAirport,     -- 출발 공항
        a.arrivalAirport,       -- 도착 공항
        a.departureDateTime,    -- 출발 일시
        a.arrivalDateTime,      -- 도착 일시
        s.price,                -- 좌석 가격
        s.seatClass,            -- 좌석 등급
        r.reserveDateTime       -- 예약 일시
      FROM reserve r
      JOIN seats s
        ON r.flightNo = s.flightNo
        AND r.departureDateTime = s.departureDateTime
        AND r.seatClass = s.seatClass
      JOIN airplain a
        ON r.flightNo = a.flightNo
        AND r.departureDateTime = a.departureDateTime
      WHERE r.cno = ? and r.reserveDateTime BETWEEN ? AND ?;
      `,
      [cno, startDate, endDate + ' 23:59:59'] // 시간 범위를 endDate의 하루 끝까지로 지정
    );

    // 조회된 예약 목록을 JSON 형식으로 응답
    return res.json({ result: reserveRows });
  } catch (err) {
    // 오류 발생 시 콘솔에 출력하고 에러 응답 반환
    console.error('에러 발생:', err);
    return res.status(500).json({ state: -1, msg: '서버 오류' });
  } finally {
    // 커넥션 반환
    if (conn) conn.release();
  }
});



// 항공권 취소 내역을 조회하는 API
app.get('/api/process/getCancel', async (req, res) => {
  const { startDate, endDate, cno } = req.query; // 요청 쿼리에서 날짜 범위와 고객 번호 추출

  let conn;
  try {
    conn = await pool.getConnection(); // 커넥션 풀에서 DB 연결 획득

    // cancel, seats, airplain 테이블을 조인하여 취소 내역을 조회
    const [cancelRows] = await conn.query(
      `
      SELECT
        a.airline,               -- 항공사 이름
        a.flightNo,              -- 항공편 번호
        a.departureAirport,      -- 출발 공항
        a.arrivalAirport,        -- 도착 공항
        a.departureDateTime,     -- 출발 일시
        a.arrivalDateTime,       -- 도착 일시
        c.refund,                -- 환불 금액
        c.cancelDateTime         -- 취소 일시
      FROM cancel c
      JOIN seats s
        ON c.flightNo = s.flightNo
        AND c.departureDateTime = s.departureDateTime
        AND c.seatClass = s.seatClass
      JOIN airplain a
        ON c.flightNo = a.flightNo
        AND c.departureDateTime = a.departureDateTime
      WHERE c.cno = ? and c.cancelDateTime BETWEEN ? AND ?;
      `,
      [cno, startDate, endDate + ' 23:59:59'] // endDate를 하루 끝으로 확장
    );

    // 조회된 취소 내역을 클라이언트에 전송
    return res.json({ result: cancelRows });
  } catch (err) {
    // 오류 발생 시 로그 출력 후 에러 응답
    console.error('에러 발생:', err);
    return res.status(500).json({ state: -1, msg: '서버 오류' });
  } finally {
    // DB 커넥션 반환
    if (conn) conn.release();
  }
});



app.get('/api/process/getStatistics', async (req, res) => {
  // 쿼리 파라미터로 airline과 seatClass 추출
  const { airline, seatClass } = req.query;

  let conn;
  try {
    conn = await pool.getConnection();

    // 항공사별 좌석 등급별 예약 건수 및 총 예약 수, 순위 조회
    const [reserveCounts] = await conn.query(
      `
      SELECT
        *,
        DENSE_RANK() OVER (ORDER BY total_reservations DESC) AS airline_rank -- 총 예약 건수 기준 순위
      FROM (
        SELECT
          airline,
          seatClass,
          seatclass_reservations,
          SUM(seatclass_reservations) OVER (PARTITION BY airline) AS total_reservations -- 항공사별 총 예약 수
        FROM (
          SELECT
            a.airline,
            r.seatClass,
            COUNT(*) AS seatclass_reservations -- 좌석 등급별 예약 수
          FROM reserve r
          JOIN airplain a
            ON r.flightNo = a.flightNo AND r.departureDateTime = a.departureDateTime
          WHERE (a.airline = ? OR ? IS NULL) -- airline 필터링
            AND (r.seatClass = ? OR ? IS NULL) -- seatClass 필터링
          GROUP BY a.airline, r.seatClass
        ) AS base
      ) AS ranked
      ORDER BY airline_rank, airline, seatClass;
      `,
      [airline, airline, seatClass, seatClass]
    );

    // 항공사별 좌석 등급별 매출 조회 (GROUP BY + WITH ROLLUP)
    const [sales] = await conn.query(
      `
      SELECT
        a.airline,
        r.seatClass,
        SUM(r.payment) AS total_payment
      FROM reserve r
      JOIN seats s
        ON r.flightNo = s.flightNo
        AND r.departureDateTime = s.departureDateTime
        AND r.seatClass = s.seatClass
      JOIN airplain a
        ON r.flightNo = a.flightNo
        AND r.departureDateTime = a.departureDateTime
      WHERE (a.airline = ? OR ? IS NULL)
        AND (r.seatClass = ? OR ? IS NULL)
      GROUP BY a.airline, r.seatClass WITH ROLLUP
      HAVING NOT (r.seatClass IS NULL AND a.airline IS NOT NULL) -- 항공사만 있는 중간 ROLLUP 결과 제거
      ORDER BY 
        a.airline IS NULL, a.airline,
        r.seatClass IS NULL, r.seatClass;
      `,
      [airline, airline, seatClass, seatClass]
    );

    // 예약 건수와 매출 데이터를 JSON 형태로 응답
    return res.json({ reserveCounts: reserveCounts, sales: sales });
  } catch (err) {
    console.error('에러 발생:', err);
    return res.status(500).json({ state: -1, msg: '서버 오류' });
  } finally {
    if (conn) conn.release();
  }
});

app.listen(3000, () => {
  console.log('서버 실행 중: http://127.0.0.1:3000');
});
