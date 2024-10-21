// ==UserScript==
// @name Dcinside-User-IP-Note
// @namespace http://tampermonkey.net/
// @version 1.0
// @description 유동 메모, 메모 다운로드&업로드, 통피 표시, 반고닉 식별코드 표시
// @author Merhaf
// @match https://m.dcinside.com/board/*
// @match https://gall.dcinside.com/mgallery/*
// @match https://gall.dcinside.com/board/*
// @match https://gall.dcinside.com/mini/*
// @icon data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant none

// ==/UserScript==
(function() {
    // 이동통신사 IP 접미사 정의
    const CARRIER_IP_SUFFIXES = {
        SK: [
            '203.226', '203.236', '211.235', '211.234',
            '115.161', '121.163', '123.288', '175.202',
            '121.190', '122.202', ...Array.from({ length: 32 }, (_, i) => `223.${32 + i}`)
        ],
        LG: [
            '117.111', '211.36', '106.102', '106.101',
            '61.33', '211.60', '211.226', '115.95',
            '182.224', '14.41', '125.188', '114.200'
        ],
        KT: [
            '211.246', '39.7', '118.235', '110.70',
            '175.223', '175.252', '119.194', '175.253',
            '210.125'
        ]
    };

    // 노트 아이콘 텍스트 및 UID 스타일 설정
    const NOTE_ICON_TEXT = '🔖';
    const UID_STYLE = 'font-family: tahoma, sans-serif; font-size: 11px; color: #999;';

    // 로컬 스토리지에서 사용자 IP 메모를 불러오는 함수
    const loadUserIpNotes = () => {
        try {
            return JSON.parse(localStorage.getItem('userIpNotes')) || {};
        } catch (e) {
            console.error('로컬 스토리지에서 메모를 불러오는 중 오류 발생:', e);
            return {};
        }
    };

    // 사용자 IP 메모를 로컬 스토리지에 저장하는 함수
    const saveUserIpNotes = (notes) => {
        try {
            localStorage.setItem('userIpNotes', JSON.stringify(notes));
        } catch (e) {
            console.error('로컬 스토리지에 메모를 저장하는 중 오류 발생:', e);
        }
    };

    // 로컬 스토리지에서 사용자 IP 메모를 불러옴
    const userIpNotes = loadUserIpNotes();

    // IP 주소로부터 이동통신사를 반환하는 함수
    const getCarrier = (ip) => {
        for (const [carrier, suffixes] of Object.entries(CARRIER_IP_SUFFIXES)) {
            if (suffixes.some(suffix => ip.startsWith(suffix))) {
                return ` (${carrier})`; // 이동통신사 이름을 반환
            }
        }
        return ''; // 이동통신사가 없으면 빈 문자열 반환
    };

    // IP 라벨을 업데이트하는 함수
    const updateIpLabel = (ipElement, ip) => {
        const note = userIpNotes[ip] ? `(${userIpNotes[ip]})` : ''; // 메모가 있으면 표시
        const carrier = getCarrier(ip); // 이동통신사 정보를 가져옴
        ipElement.textContent = note || `(${ip})${carrier}`; // IP와 이동통신사 정보를 설정
    };

    // 사용자의 IP 메모를 초기화하는 함수
    const resetUserIpNote = (ip) => {
        delete userIpNotes[ip]; // 메모 삭제
        alert('메모가 초기화되었습니다.'); // 사용자에게 알림
    };

    // 사용자의 IP 메모를 저장하는 함수
    const saveUserIpNote = (ip, note) => {
        if (note.trim() === "초기화") {
            resetUserIpNote(ip); // 초기화 요청 시 초기화
        } else if (note.trim() !== "") {
            userIpNotes[ip] = note; // 메모 추가
            alert('메모가 추가되었습니다: ' + note); // 사용자에게 알림
        }
        saveUserIpNotes(userIpNotes); // 로컬 스토리지에 저장
    };

    // 사용자 메모를 처리하는 함수
    const handleUserNote = (ip, ipElement) => {
        const note = prompt('IP 메모를 입력하세요:'); // 사용자에게 메모 입력 요청
        if (note !== null) {
            saveUserIpNote(ip, note); // 메모 저장
            updateIpLabel(ipElement, ip); // IP 라벨 업데이트
        }
    };

    // 메모 링크를 생성하는 함수
    const createNoteLink = (ip, ipElement) => {
        const noteLink = document.createElement('span'); // 새로운 span 요소 생성
        noteLink.className = 'note-icon'; // 클래스 설정
        noteLink.style.cursor = 'pointer'; // 커서 스타일 설정
        noteLink.style.fontSize = '0.5em'; // 폰트 크기 설정
        noteLink.textContent = NOTE_ICON_TEXT; // 노트 아이콘 텍스트 설정
        noteLink.addEventListener('click', () => handleUserNote(ip, ipElement)); // 클릭 이벤트 리스너 추가
        return noteLink; // 생성된 링크 반환
    };

    // 닉네임을 업데이트하는 함수
    const updateNickname = (nicknameElement, uid, nickname) => {
        nicknameElement.textContent = nickname; // 닉네임 설정
        const uidSpan = document.createElement('span'); // UID를 위한 새로운 span 요소 생성
        uidSpan.textContent = ` (${uid})`; // UID 텍스트 설정
        uidSpan.style.cssText = UID_STYLE; // UID 스타일 설정
        nicknameElement.appendChild(uidSpan); // UID 요소를 닉네임에 추가
    };

    // 작성자를 처리하는 함수
    const processWriter = (writer) => {
        const uid = writer.getAttribute('data-uid'); // UID 가져오기
        const ip = writer.getAttribute('data-ip'); // IP 가져오기
        const nicknameElement = writer.getElementsByClassName('nickname')[0]; // 닉네임 요소 가져오기
        const ipElement = writer.getElementsByClassName('ip')[0]; // IP 요소 가져오기

        if (nicknameElement && uid) {
            updateNickname(nicknameElement, uid, writer.getAttribute('data-nick')); // 닉네임 업데이트
        }

        if (ip && nicknameElement && !nicknameElement.querySelector('.note-icon')) {
            nicknameElement.appendChild(createNoteLink(ip, ipElement)); // 메모 링크 추가
            updateIpLabel(ipElement, ip); // IP 라벨 업데이트
        }
    };

    // 작성자 목록을 업데이트하는 함수
    const updateWriters = () => {
        const writers = document.getElementsByClassName('gall_writer ub-writer'); // 모든 작성자 요소 가져오기
        for (const writer of writers) {
            processWriter(writer); // 각 작성자 처리
        }
    };

    // 사용자 IP 메모를 JSON 파일로 다운로드하는 함수
    const downloadIpNotes = () => {
        const blob = new Blob([JSON.stringify(userIpNotes, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '디시인사이드IP메모목록.json'; // 다운로드할 파일 이름
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url); // 메모리 해제
    };

// JSON 파일을 업로드하여 사용자 IP 메모를 로드하는 함수
const uploadIpNotes = (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const notes = JSON.parse(e.target.result);
                Object.assign(userIpNotes, notes); // 기존 메모에 업로드한 메모 추가
                saveUserIpNotes(userIpNotes); // 로컬 스토리지에 저장
                alert('메모가 성공적으로 업로드되었습니다.');
                updateWriters(); // 업데이트된 내용을 반영
                location.reload(); // 페이지 새로고침
            } catch (error) {
                console.error('파일을 파싱하는 중 오류 발생:', error);
                alert('파일 형식이 올바르지 않습니다.');
            }
        };
        reader.readAsText(file);
    }
};

// 다운로드 버튼 생성 및 설정
const createDownloadButton = () => {
    const downloadButton = document.createElement('button');
    downloadButton.textContent = 'IP 메모 다운로드'; // 버튼 텍스트 설정
    downloadButton.style.position = 'fixed';
    downloadButton.style.top = '10px';
    downloadButton.style.right = '10px'; // 업로드 버튼 옆에 위치하도록 설정
    downloadButton.style.zIndex = '9999'; // 페이지의 최상단에 위치하도록 설정
    downloadButton.addEventListener('click', downloadIpNotes); // 클릭 시 다운로드 처리
    document.body.appendChild(downloadButton);
};

// 업로드 버튼 생성 및 설정
const createUploadButton = () => {
    const uploadButton = document.createElement('button');
    uploadButton.textContent = 'IP 메모 업로드'; // 버튼 텍스트 설정
    uploadButton.style.position = 'fixed';
    uploadButton.style.top = '10px';
    uploadButton.style.right = '120px'; // 다운로드 버튼 옆에 위치하도록 설정
    uploadButton.style.zIndex = '9999'; // 페이지의 최상단에 위치하도록 설정
    uploadButton.addEventListener('click', () => {
        const fileInput = document.createElement('input'); // 파일 선택 input 생성
        fileInput.type = 'file';
        fileInput.accept = 'application/json';
        fileInput.style.display = 'none'; // 화면에 보이지 않도록 설정
        fileInput.addEventListener('change', uploadIpNotes); // 파일 선택 시 업로드 처리
        document.body.appendChild(fileInput); // body에 추가
        fileInput.click(); // 파일 선택 대화상자 열기
        document.body.removeChild(fileInput); // 사용 후 삭제
    });
    document.body.appendChild(uploadButton); // 업로드 버튼 추가
};

    // 초기화 함수
    const init = () => {
        createDownloadButton(); // 다운로드 버튼 생성
        createUploadButton(); // 업로드 버튼 생성
        updateWriters(); // 작성자 목록 업데이트
    };

    // 페이지가 로드될 때 초기화 함수 실행
    window.addEventListener('load', init);

    // 일정 간격으로 작성자 업데이트 실행
    setInterval(updateWriters, 500); // 500ms마다 업데이트
})();
