// 문서 로딩이 완료되면 실행
document.addEventListener('DOMContentLoaded', () => {
  const form = document.querySelector('.search-form'); // 검색 폼
  const sortSelect = document.querySelector('#sort-option'); // 정렬 옵션 select
  const flightList = document.querySelector('.flight-list'); // 항공편 리스트 표시 영역
  const userId = sessionStorage.getItem('id'); // sessionStorage에서 로그인한 사용자 ID 불러오기
  let fetchedData = []; // 서버에서 조회된 항공편 데이터를 저장할 전역 변수

  // 폼 제출 시 항공편 검색 요청
  form.addEventListener('submit', (event) => {
    event.preventDefault(); // 기본 제출 동작 차단

    // 폼에서 입력값 가져오기
    const departureAirport = form.querySelector('select[name="departure"]').value;
    const departureDate = form.querySelector('input[type="date"]').value;
    const arrivalAirport = form.querySelector('select[name="arrival"]').value;
    const seatClass = form.querySelector('select[name="seatClass"]').value;

    // URL 파라미터로 구성
    const params = new URLSearchParams({
      departureAirport,
      departureDateTime: departureDate,
      arrivalAirport,
      seatClass,
    });

    // 항공편 데이터 요청
    fetch('/api/process/getAirplane?' + params.toString())
      .then((response) => response.json())
      .then((data) => {
        data = data.result;
        if (!Array.isArray(data)) {
          console.error('데이터가 배열이 아닙니다:', data);
          return;
        }

        fetchedData = data; // 전역 변수에 저장
        applySortAndRender(); // 정렬 후 출력
      });
  });

  // 정렬 옵션이 변경될 때 다시 렌더링
  sortSelect.addEventListener('change', () => {
    applySortAndRender();
  });

  // 정렬 및 렌더링 함수
  function applySortAndRender() {
    const sortBy = sortSelect.value;

    const sortedData = [...fetchedData]; // 복사하여 정렬

    switch (sortBy) {
      case 'price':
        sortedData.sort((a, b) => a.price - b.price);
        break;

      case 'departure':
        sortedData.sort((a, b) => {
          const timeDiff = new Date(a.departureDateTime) - new Date(b.departureDateTime);
          return timeDiff !== 0 ? timeDiff : a.price - b.price;
        });
        break;

      case 'arrival':
        sortedData.sort((a, b) => {
          const timeDiff = new Date(a.arrivalDateTime) - new Date(b.arrivalDateTime);
          return timeDiff !== 0 ? timeDiff : a.price - b.price;
        });
        break;
    }

    renderFlights(sortedData); // 화면에 출력
  }

  // 항공편 리스트 출력 함수
  function renderFlights(data) {
    const seatClass = form.querySelector('select[name="seatClass"]').value;
    flightList.innerHTML = ''; // 기존 항목 초기화

    if (data.length === 0) {
      flightList.innerHTML = '<p>조회 결과가 없습니다.</p>';
      return;
    }

    const now = new Date(); // 현재 시각

    data.forEach((flight) => {
      if (flight.seatClass !== seatClass) return; // 등급이 일치하지 않으면 무시

      const div = document.createElement('div');
      div.className = 'flight';
      div.innerHTML = `
        <div class="flight-header">${flight.airline} ${flight.flightNo}</div>
        <div class="flight-detail">
          출발: ${formatDateTime(flight.departureDateTime)} ${flight.departureAirport} |
          도착: ${formatDateTime(flight.arrivalDateTime)} ${flight.arrivalAirport}
        </div>
        <div class="flight-detail">좌석등급: ${flight.seatClass} | 잔여좌석: ${flight.no_of_seats}</div>
        <div class="flight-detail">가격: ${flight.price.toLocaleString()}만원</div>
        <button class="pay-button">결제하기</button>
      `;

      const button = div.querySelector('.pay-button');

      // 출발 시간이 지났다면 결제 버튼 비활성화
      if (new Date(flight.departureDateTime) < now) {
        button.disabled = true;
        button.textContent = '출발시간 지남';
        button.style.cursor = 'not-allowed';
        button.style.backgroundColor = '#ccc';
      }

      // 결제 버튼 클릭 시 예약 요청
      button.addEventListener('click', () => {
        if (button.disabled) return;

        console.log('결제 시도:', flight);

        fetch('/api/process/reserve', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            cno: userId,
            flightNo: flight.flightNo,
            departureDateTime: flight.departureDateTime,
            seatClass: flight.seatClass,
          }),
        })
          .then((res) => res.json())
          .then((data) => {
            alert(data.msg); // 서버 응답 메시지 출력
          });

        alert(`"${flight.seatClass} ${flight.departureDateTime}" 항공편 결제를 진행합니다.`);
      });

      flightList.appendChild(div); // 항공편 요소 추가
    });
  }

  // 날짜 및 시간 포맷 변환 함수
  function formatDateTime(dateTime) {
    const date = new Date(dateTime);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
});
