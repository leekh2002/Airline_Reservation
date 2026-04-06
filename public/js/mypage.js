// 날짜 필터 버튼과 입력 요소를 선택
const filterBtn = document.querySelector('.filter button');
const startDateInput = document.querySelectorAll('.filter input[type="date"]')[0];
const endDateInput = document.querySelectorAll('.filter input[type="date"]')[1];

// 세션에 저장된 사용자 ID를 가져옴
const userId = sessionStorage.getItem('id');

// 폼 제출 이벤트 감지
document.querySelector('form').addEventListener('submit', (event) => {
  event.preventDefault(); // 폼 기본 제출 동작 막음

  const startDate = startDateInput.value;
  const endDate = endDateInput.value;

  // URL에 쿼리 파라미터 설정
  const params = new URLSearchParams({
    cno: userId,
    startDate: startDate,
    endDate: endDate,
  });

  // 예약 내역 요청
  fetch('/api/process/getReserve?' + params.toString())
    .then((response) => response.json())
    .then((data) => {
      renderReserveList(data.result); // 예약 목록 렌더링
    });

  // 취소 내역 요청
  fetch('/api/process/getCancel?' + params.toString())
    .then((response) => response.json())
    .then((data) => {
      renderCancelList(data.result); // 취소 목록 렌더링
    });
});

// 예약 내역을 화면에 표시
function renderReserveList(reserves) {
  const section = document.querySelectorAll('.section')[0];
  section.innerHTML = ''; // 기존 목록 초기화

  reserves.forEach((item) => {
    const ticket = document.createElement('div');
    ticket.className = 'ticket';

    const now = new Date();
    const departureTime = new Date(item.departureDateTime);
    const isPast = now > departureTime; // 과거 비행 여부 확인

    // 예약 정보 HTML 구성
    ticket.innerHTML = `
      <div class="ticket-header">${item.airline} ${item.flightNo}</div>
      <div class="ticket-detail">출발: ${formatDateTime(item.departureDateTime)} ${item.departureAirport} → 도착: ${formatDateTime(item.arrivalDateTime)} ${item.arrivalAirport}</div>
      <div class="ticket-detail">예약 일시: ${formatDateTime(item.reserveDateTime)}</div>
      <div class="ticket-detail">가격: ${formatPrice(item.price)}</div>
      <button ${isPast ? 'disabled style="background: #ccc; cursor: not-allowed;"' : ''} data-reserve-id="${item.reserveId}">취소하기</button>
    `;

    section.appendChild(ticket);

    // 미래 비행편에 한해 취소 버튼 활성화 및 이벤트 추가
    if (!isPast) {
      const cancelBtn = ticket.querySelector('button');
      cancelBtn.addEventListener('click', () => {
        fetch('/api/process/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cno: userId,
            flightNo: item.flightNo,
            departureDateTime: item.departureDateTime,
            seatClass: item.seatClass,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            alert(data.msg); // 서버 응답 메시지 표시
          });

        console.log(
          item.flightNo,
          item.airline,
          item.departureDateTime,
          item.reserveDateTime,
          item.seatClass
        );
      });
    }
  });
}

// 취소 내역을 화면에 표시
function renderCancelList(cancels) {
  const section = document.querySelectorAll('.section')[1];
  section.innerHTML = ''; // 기존 목록 초기화

  cancels.forEach((item) => {
    const ticket = document.createElement('div');
    ticket.className = 'ticket';

    // 취소 정보 HTML 구성
    ticket.innerHTML = `
      <div class="ticket-header">${item.airline} ${item.flightNo}</div>
      <div class="ticket-detail">출발: ${formatDateTime(item.departureDateTime)} ${item.departureAirport} → 도착: ${formatDateTime(item.arrivalDateTime)} ${item.arrivalAirport}</div>
      <div class="ticket-detail">취소 일시: ${formatDateTime(item.cancelDateTime)}</div>
      <div class="ticket-detail">환불액: ${formatPrice(item.refund)}</div>
    `;

    section.appendChild(ticket);
  });
}

// ISO 날짜 문자열을 포맷팅 (YYYY/MM/DD HH:mm)
function formatDateTime(isoString) {
  const date = new Date(isoString);
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 자릿수 맞추기 (0 채우기)
function pad(n) {
  return n < 10 ? '0' + n : n;
}

// 가격을 '숫자,숫자만원' 형식으로 포맷팅
function formatPrice(price) {
  return parseInt(price).toLocaleString('ko-KR') + '만원';
}
