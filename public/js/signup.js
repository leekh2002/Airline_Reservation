document.querySelector('form').addEventListener('submit', (event) => {
  // 폼 제출 기본 동작 방지 (페이지 새로고침 방지)
  event.preventDefault();

  // 입력 필드 값 가져오기
  const name = document.getElementById('name').value;
  const userid = document.getElementById('userid').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  const email = document.getElementById('email').value;
  const passport = document.getElementById('passport').value;

  // 서버로 회원가입 요청 보내기
  fetch('/api/process/signup', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json' // JSON 형식으로 보낸다는 의미
    },
    body: JSON.stringify({
      userName: name,
      userId: userid,
      pw: password,
      confirmPw: confirmPassword,
      email: email,
      passport: passport
    })
  })
    .then((res) => res.json()) // 응답을 JSON으로 변환
    .then((data) => {
      // 아이디가 이미 존재하는 경우 알림 표시
      if (data.state == -1) {
        alert(data.msg);
      } else {
        // 회원가입 성공 시 사용자 ID를 세션 스토리지에 저장하고 홈 페이지로 이동
        sessionStorage.setItem('id', userid);
        window.location.href = 'flights.html';
      }
    });
});
