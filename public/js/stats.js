// DOM이 완전히 로드되었을 때 실행
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('flight-search-form');  // 폼 요소
  const resultDiv = document.getElementById('result-content'); // 결과 출력 영역

  // 폼 제출 시 처리
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); // 폼 기본 동작(페이지 리로드) 방지

    // 입력 값 가져오기
    let airline = form.airline.value.trim();
    let seatClass = form.seatClass.value.trim();

    // 빈 문자열은 null 처리
    if (airline === '') airline = null;
    if (seatClass === '') seatClass = null;

    // 쿼리 문자열 생성
    const params = new URLSearchParams();
    if (airline !== null) params.append('airline', airline);
    if (seatClass !== null) params.append('seatClass', seatClass);

    // API 요청 URL 구성
    const url = `/api/process/getStatistics?${params.toString()}`;

    // 로딩 메시지 출력
    resultDiv.innerHTML = '<p>데이터를 불러오는 중입니다...</p>';

    try {
      // API 요청
      const response = await fetch(url);
      if (!response.ok) throw new Error(`서버 오류: ${response.status}`);

      // JSON 응답 파싱
      const data = await response.json();
      const { reserveCounts, sales } = data;

      // --- 예약 건수 테이블 생성 함수 ---
      function createReserveTable(headers, rows) {
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '20px';

        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        headers.forEach(h => {
          const th = document.createElement('th');
          th.textContent = h;
          th.style.border = '1px solid #ddd';
          th.style.padding = '8px';
          th.style.backgroundColor = '#f2f2f2';
          th.style.textAlign = 'left';
          trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        let lastAirline = null;

        // 데이터 행 생성
        rows.forEach(row => {
          const tr = document.createElement('tr');
          headers.forEach(h => {
            const td = document.createElement('td');
            td.style.border = '1px solid #ddd';
            td.style.padding = '8px';

            let text = row[h] !== undefined && row[h] !== null ? row[h] : '';

            // 같은 airline이면 total_reservations 열을 빈칸으로 처리
            if (h === 'total_reservations') {
              if (row.airline === lastAirline) {
                text = '';
              } else {
                lastAirline = row.airline;
              }
            }

            td.textContent = text;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });

        // 전체 예약 총합 계산 후 마지막 행에 추가
        const totalReserveSum = rows.reduce((acc, cur) => acc + (cur.seatclass_reservations || 0), 0);

        const trTotal = document.createElement('tr');
        trTotal.style.fontWeight = 'bold';
        headers.forEach(h => {
          const td = document.createElement('td');
          td.style.border = '1px solid #ddd';
          td.style.padding = '8px';

          if (h === 'seatClass') {
            td.textContent = '전체 예약건수 총합';
          } else if (h === 'seatclass_reservations') {
            td.textContent = totalReserveSum;
          } else {
            td.textContent = '';
          }

          trTotal.appendChild(td);
        });
        tbody.appendChild(trTotal);

        table.appendChild(tbody);
        return table;
      }

      // --- 매출 테이블 생성 함수 ---
      function createSalesTable(headers, rows) {
        const table = document.createElement('table');
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';
        table.style.marginBottom = '20px';

        const thead = document.createElement('thead');
        const trHead = document.createElement('tr');
        headers.forEach(h => {
          const th = document.createElement('th');
          th.textContent = h === 'total_payment' ? '총 매출 (단위: 만원)' : h;
          th.style.border = '1px solid #ddd';
          th.style.padding = '8px';
          th.style.backgroundColor = '#f2f2f2';
          th.style.textAlign = 'left';
          trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        // 매출 총합 행과 일반 행 분리
        const totalRow = rows.find(row => row.airline === null && row.seatClass === null);
        const normalRows = rows.filter(row => !(row.airline === null && row.seatClass === null));

        // 일반 행 추가
        normalRows.forEach(row => {
          const tr = document.createElement('tr');
          headers.forEach(h => {
            const td = document.createElement('td');
            td.style.border = '1px solid #ddd';
            td.style.padding = '8px';
            td.textContent = row[h] !== undefined && row[h] !== null ? row[h] : '';
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });

        // 매출 총합 행 추가
        if (totalRow) {
          const trTotal = document.createElement('tr');
          trTotal.style.fontWeight = 'bold';
          headers.forEach(h => {
            const td = document.createElement('td');
            td.style.border = '1px solid #ddd';
            td.style.padding = '8px';

            if (h === 'airline') {
              td.textContent = '매출총합';
            } else if (h === 'total_payment') {
              td.textContent = totalRow.total_payment;
            } else {
              td.textContent = '';
            }

            trTotal.appendChild(td);
          });
          tbody.appendChild(trTotal);
        }

        table.appendChild(tbody);
        return table;
      }

      // 테이블 생성용 헤더 및 데이터 가공
      const reserveHeaders = ['airline', 'seatClass', 'seatclass_reservations', 'total_reservations', 'airline_rank'];
      const reserveRows = reserveCounts.map(item => ({
        airline: item.airline,
        seatClass: item.seatClass,
        seatclass_reservations: item.seatclass_reservations,
        total_reservations: item.total_reservations,
        airline_rank: item.airline_rank
      }));

      const salesHeaders = ['airline', 'seatClass', 'total_payment'];
      const salesRows = sales.map(item => ({
        airline: item.airline,
        seatClass: item.seatClass,
        total_payment: item.total_payment
      }));

      // 기존 결과 제거
      resultDiv.innerHTML = '';

      // 예약 통계 출력
      const reserveTitle = document.createElement('h3');
      reserveTitle.textContent = '예약 건수 통계';
      resultDiv.appendChild(reserveTitle);
      resultDiv.appendChild(createReserveTable(reserveHeaders, reserveRows));

      // 매출 통계 출력
      const salesTitle = document.createElement('h3');
      salesTitle.textContent = '매출 합계 통계';
      resultDiv.appendChild(salesTitle);
      resultDiv.appendChild(createSalesTable(salesHeaders, salesRows));

    } catch (error) {
      // 오류 처리
      resultDiv.innerHTML = `<p style="color: red;">데이터를 불러오는 중 오류가 발생했습니다: ${error.message}</p>`;
    }
  });
});
