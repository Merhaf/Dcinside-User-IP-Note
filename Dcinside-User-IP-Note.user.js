// ==UserScript==
// @name Dcinside-User-IP-Note
// @namespace http://tampermonkey.net/
// @version 1.2
// @description 유동 메모, 식별코드 메모, 메모 유무 표시, 메모 다운로드&업로드, 통피 표시, 반고닉 식별코드 표시
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
    let userIpNotes = loadUserIpNotes();

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
        ipElement.title = note || `(${ip})${carrier}`; // 툴팁 추가
    };

    // 메모 아이콘의 텍스트와 타이틀을 업데이트하는 함수
    const updateNoteIconTextAndTitle = (noteIcon, ip) => {
        noteIcon.textContent = userIpNotes[ip] ? '🟨' : '⚪'; // 이모지 변경
        noteIcon.title = userIpNotes[ip] || ip; // 툴팁 업데이트
    };

    // 사용자의 IP 메모를 초기화하는 함수
    const resetUserIpNote = (ip) => {
        delete userIpNotes[ip]; // 메모 삭제
        alert('메모가 초기화되었습니다.'); // 사용자에게 알림
        saveUserIpNotes(userIpNotes); // 로컬 스토리지에 저장
        updateNoteIcon(ip); // 아이콘 업데이트
    };

    // 사용자의 IP 메모를 저장하는 함수
    const saveUserIpNote = (ip, note) => {
        if (note.trim() === "초기화") {
            resetUserIpNote(ip); // 초기화 요청 시 초기화
        } else if (note.trim() !== "") {
            userIpNotes[ip] = note; // 메모 추가
            alert('메모가 추가되었습니다: ' + note); // 사용자에게 알림
            saveUserIpNotes(userIpNotes); // 로컬 스토리지에 저장
            updateNoteIcon(ip); // 아이콘 업데이트
        }
    };

    // 메모 아이콘을 업데이트하는 함수
    const updateNoteIcon = (ip) => {
        // 해당 IP 또는 UID에 대한 모든 note-icon 찾기
        const noteIcons = document.querySelectorAll(
            `[data-ip="${ip}"] .note-icon,
             [data-uid="${ip}"] .note-icon`
        );

        noteIcons.forEach(noteIcon => updateNoteIconTextAndTitle(noteIcon, ip)); // 텍스트와 타이틀 업데이트
    };

    // 사용자 메모를 처리하는 함수
    const handleUserNote = (key, element) => {
        const note = prompt('메모를 입력하세요:'); // 사용자에게 메모 입력 요청
        if (note !== null) {
            saveUserIpNote(key, note); // 메모 저장
            updateIpLabel(element, key); // IP 또는 UID 라벨 업데이트
        }
    };

    // 메모 링크를 생성하는 함수
    const createNoteLink = (ip, ipElement, uid) => {
        const noteLink = document.createElement('span'); // 새로운 span 요소 생성
        noteLink.className = 'note-icon'; // 클래스 설정
        noteLink.style.cursor = 'pointer'; // 커서 스타일 설정
        noteLink.style.fontSize = '0.5em'; // 폰트 크기 설정

        // 메모가 있는 경우와 없는 경우에 따라 이모지를 다르게 설정
        updateNoteIconTextAndTitle(noteLink, ip); // 아이콘 텍스트와 타이틀 설정
        noteLink.addEventListener('click', () => handleUserNote(ip, ipElement)); // 클릭 이벤트 리스너 추가
        return noteLink; // 생성된 링크 반환
    };

// 닉네임을 업데이트하는 함수
const updateNickname = (nicknameElement, identifier, nickname, isUidUser = true) => {
    // UID 또는 IP로 메모를 확인
    const memoContent = userIpNotes[identifier];

    // 닉네임 요소 스타일 설정
    setNicknameStyles(nicknameElement);

    // 기존 요소 삭제 (중복 방지)
    nicknameElement.innerHTML = ''; // 닉네임 요소의 내용을 비움

    // 닉네임 추가
    addNicknameElement(nicknameElement, nickname, memoContent, identifier); // identifier를 인자로 추가

    // 메모 또는 UID/IP 추가
    if (memoContent) {
        addMemoElement(nicknameElement, memoContent);
    } else if (identifier) {
        addIdentifierElement(nicknameElement, identifier);
    }
};

// 닉네임 스타일 설정 함수
const setNicknameStyles = (element) => {
    element.style.textOverflow = 'ellipsis'; // 생략 부호 설정
    element.style.maxWidth = '100px';
    element.style.overflow = 'hidden'; // 오버플로우 숨김
    element.style.display = 'inline-block'; // 인라인 블록으로 설정
};

// 닉네임 추가 함수
const addNicknameElement = (nicknameElement, nickname, memoContent, identifier) => {
    const nicknameEm = document.createElement('em'); // <em> 요소 생성
    nicknameEm.textContent = nickname; // 닉네임 텍스트 설정
    nicknameElement.appendChild(nicknameEm); // <em> 요소를 닉네임 요소에 추가

    // 툴팁 설정
    if (memoContent) {
        nicknameEm.title = memoContent; // 메모 내용이 있을 경우 툴팁 설정
    } else {
        nicknameEm.title = nickname; // 메모 내용이 없을 경우 원래 닉네임을 툴팁으로 설정
    }
};

// 메모 추가 함수
const addMemoElement = (nicknameElement, memoContent) => {
    const noteSpan = createSpan(` (${memoContent})`, UID_STYLE, memoContent); // 메모 텍스트와 스타일 설정
    nicknameElement.appendChild(noteSpan); // 메모 요소를 닉네임에 추가
};

// UID/IP 추가 함수
const addIdentifierElement = (nicknameElement, identifier) => {
    const identifierSpan = createSpan(` (${identifier})`, UID_STYLE, identifier); // UID/IP 텍스트와 스타일 설정
    nicknameElement.appendChild(identifierSpan); // UID/IP 요소를 닉네임에 추가
};

// span 요소 생성 함수
const createSpan = (text, style, title) => {
    const span = document.createElement('span'); // 새로운 span 요소 생성
    span.textContent = text; // 텍스트 설정
    span.style.cssText = style; // 스타일 적용
    if (title) {
        span.title = title; // 툴팁 내용 설정
    }
    return span;
};

// UID 유저 닉네임 업데이트
const updateUidNickname = (nicknameElement, uid, nickname) => {
    updateNickname(nicknameElement, uid, nickname, true);
};

// IP 유저 닉네임 업데이트
const updateIpNickname = (nicknameElement, ip, nickname) => {
    updateNickname(nicknameElement, ip, nickname, false);
};

// 메모 버튼을 생성하고 추가하는 함수
const addNoteLink = (uid, nicknameElement, ipElement) => {
    if (!nicknameElement.parentNode.querySelector('.note-icon')) {
        const noteLink = createNoteLink(uid, ipElement, uid); // UID를 전달
        nicknameElement.parentNode.insertBefore(noteLink, nicknameElement); // 메모 버튼을 닉네임 앞에 추가
    }
};

// 작성자를 처리하는 함수
const processWriter = (writer) => {
    const uid = writer.getAttribute('data-uid'); // UID 가져오기
    const ip = writer.getAttribute('data-ip'); // IP 가져오기
    const nicknameElement = writer.getElementsByClassName('nickname')[0]; // 닉네임 요소 가져오기
    const ipElement = writer.getElementsByClassName('ip')[0]; // IP 요소 가져오기

    // UID 유저 처리
    if (nicknameElement && uid) {
        updateNickname(nicknameElement, uid, writer.getAttribute('data-nick')); // UID가 있는 경우 닉네임 업데이트
        addNoteLink(uid, nicknameElement, ipElement); // UID에 대한 메모 버튼 추가
    }

    // IP 유저 처리
    if (ip && nicknameElement) {
        updateIpNickname(nicknameElement, ip, writer.getAttribute('data-nick')); // IP가 있는 경우 닉네임 업데이트
        addNoteLink(ip, nicknameElement, ipElement); // IP에 대한 메모 버튼 추가

        // 자동으로 추가된 IP 요소 삭제
        if (ipElement) {
            ipElement.remove(); // IP 요소 삭제
        }
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

    // 사용자 IP 메모를 업로드하는 함수 (덮어쓰기용)
    const uploadIpNotesOverwrite = (event) => {
        const file = event.target.files[0];
        if (!file) return; // 파일이 없으면 종료

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const notes = JSON.parse(e.target.result);
                userIpNotes = notes; // 기존 메모를 업로드한 메모로 덮어씌움
                saveUserIpNotes(userIpNotes); // 로컬 스토리지에 저장
                alert('메모가 성공적으로 덮어쓰기 되었습니다.');
                updateWriters(); // 업데이트된 내용을 반영
                location.reload(); // 페이지 새로고침
            } catch (error) {
                console.error('파일을 파싱하는 중 오류 발생:', error);
                alert('파일 형식이 올바르지 않습니다.');
            }
        };
        reader.readAsText(file);
    };

    // 사용자 IP 메모를 업로드하는 함수 (추가하기용)
    const uploadIpNotesMerge = (event) => {
        const file = event.target.files[0];
        if (!file) return; // 파일이 없으면 종료

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const notes = JSON.parse(e.target.result);
                Object.assign(userIpNotes, notes); // 기존 메모에 업로드한 메모 추가
                saveUserIpNotes(userIpNotes); // 로컬 스토리지에 저장
                alert('메모가 성공적으로 추가되었습니다.');
                updateWriters(); // 업데이트된 내용을 반영
                location.reload(); // 페이지 새로고침
            } catch (error) {
                console.error('파일을 파싱하는 중 오류 발생:', error);
                alert('파일 형식이 올바르지 않습니다.');
            }
        };
        reader.readAsText(file);
    };

    // 버튼 생성 및 설정 함수
    const createButton = (text, clickHandler) => {
        const button = document.createElement('button');
        button.textContent = text; // 버튼 텍스트 설정
        button.style.fontSize = '11px'; // 폰트 크기 설정
        button.style.color = 'rgb(85, 85, 85)'; // 폰트 색상 설정
        button.style.marginTop = '-1px'; // 위쪽 여백을 -1픽셀로 설정
        button.addEventListener('click', clickHandler); // 클릭 시 처리
        return button; // 생성한 버튼 반환
    };

    // 초기화 함수
    const init = () => {
        const areaLinksDiv = document.querySelector('.area_links.clear'); // 해당 div 선택
        const ulElement = areaLinksDiv.querySelector('ul.fl.clear'); // ul 요소 선택

        // 버튼 추가
        const downloadButton = createButton('IP 메모 다운로드', downloadIpNotes);
        const overwriteButton = createButton('IP 메모 덮어쓰기 업로드', () => {
            const fileInput = document.createElement('input'); // 파일 선택 input 생성
            fileInput.type = 'file';
            fileInput.accept = 'application/json';
            fileInput.style.display = 'none'; // 화면에 보이지 않도록 설정
            fileInput.addEventListener('change', uploadIpNotesOverwrite); // 파일 선택 시 업로드 처리
            document.body.appendChild(fileInput); // body에 추가
            fileInput.click(); // 파일 선택 대화상자 열기
            document.body.removeChild(fileInput); // 사용 후 삭제
        });
        const mergeButton = createButton('IP 메모 추가하기 업로드', () => {
            const fileInput = document.createElement('input'); // 파일 선택 input 생성
            fileInput.type = 'file';
            fileInput.accept = 'application/json';
            fileInput.style.display = 'none'; // 화면에 보이지 않도록 설정
            fileInput.addEventListener('change', uploadIpNotesMerge); // 파일 선택 시 업로드 처리
            document.body.appendChild(fileInput); // body에 추가
            fileInput.click(); // 파일 선택 대화상자 열기
            document.body.removeChild(fileInput); // 사용 후 삭제
        });

        // 각 버튼을 li로 감싸기
        const downloadListItem = document.createElement('li');
        downloadListItem.appendChild(downloadButton);
        const overwriteListItem = document.createElement('li');
        overwriteListItem.appendChild(overwriteButton);
        const mergeListItem = document.createElement('li');
        mergeListItem.appendChild(mergeButton);

        // 버튼들을 ul의 맨 앞에 추가
        ulElement.prepend(mergeListItem);
        ulElement.prepend(overwriteListItem);
        ulElement.prepend(downloadListItem);

        updateWriters(); // 작성자 목록 업데이트
    };

    // 작성자 목록을 업데이트하는 함수
    const updateWriters = () => {
        const writers = document.getElementsByClassName('gall_writer ub-writer'); // 모든 작성자 요소 가져오기
        Array.from(writers).forEach(processWriter); // 각 작성자 처리
    };

    // 페이지가 로드될 때 초기화 함수 실행
    window.addEventListener('load', init);

    // 일정 간격으로 작성자 업데이트 실행
    setInterval(updateWriters, 1000);
})();
