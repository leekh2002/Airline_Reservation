// form 태그에 'submit' 이벤트 리스너를 추가
document.querySelector('form').addEventListener('submit', (event) => {
  event.preventDefault(); // 폼의 기본 제출 동작(페이지 새로고침)을 막음

  // 사용자 입력값 가져오기
  const username = document.getElementById('userid').value;
  const password = document.getElementById('password').value;

  console.log('feasgasef'); // 디버깅용 로그

  // 로그인 요청을 서버로 보내기 위한 fetch 호출
  fetch('/api/process/login', {
    method: 'POST', // POST 메서드 사용
    headers: {
      'Content-Type': 'application/json', // JSON 형식으로 보냄
    },
    body: JSON.stringify({
      userId: username, // 서버가 기대하는 키 이름에 맞춤
      pw: password,
    }),
  })
    .then((res) => res.json()) // 응답을 JSON으로 파싱
    .then((data) => {
      console.log(data); // 서버 응답 콘솔 출력

      // 로그인 실패 처리
      if (data.state == -1) {
        alert(data.msg); // 실패 메시지 알림
      } else {
        // 로그인 성공 시 사용자 ID를 세션 스토리지에 저장
        sessionStorage.setItem('id', username);

        console.log(username); // 디버깅용

        // 관리자 계정일 경우 stats 페이지로 이동
        if (username == "c0") {
          window.location.href = 'stats.html';
        } else {
          // 일반 사용자일 경우 flights 페이지로 이동
          window.location.href = 'flights.html';
        }
      }
    });
});
