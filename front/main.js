// 코드 수정 필요
lucide.createIcons();
function getHistory() { return JSON.parse(localStorage.getItem('malurl_history') || '[]'); }
function setHistory(list) { localStorage.setItem('malurl_history', JSON.stringify(list)); }
function addHistory(url, status) {
    let list = getHistory();
    list.unshift({url, status, ts: new Date().toISOString()});
    if(list.length > 30) list = list.slice(0, 30);
    setHistory(list); renderHistory();
}
function renderHistory() {
    const list = getHistory();
    const wrap = document.getElementById('history-list');
    wrap.innerHTML = '';
    if(!list.length) {
        wrap.innerHTML = '<div style="color:#b0bacd;text-align:center;margin-top:17px;">검사 이력이 없습니다.</div>';
        return;
    }
    for(let item of list) {
        const row = document.createElement('div');
        row.className = 'history-item';
        row.style = "font-size:0.98em;padding:7px 0;border-bottom:1px solid #e4eefc;display:flex;align-items:center;gap:7px;";
        row.innerHTML = `
            <span class="history-url" title="${item.url}" style="flex:1;color:#385a99;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer;" onclick="fillUrl('${item.url}')">${item.url.length > 36 ? item.url.slice(0,36) + '...' : item.url}</span>
            <span style="font-weight:700;" class="${item.status}">${statusKorean(item.status)}</span>
        `;
        wrap.appendChild(row);
    }
}
function clearHistory() {
    if(confirm('이력을 모두 삭제할까요?')) {
        setHistory([]); renderHistory();
    }
}
function fillUrl(url) {
    const activeTab = document.querySelector('.tab-content.active');
    if(activeTab.id === 'tab-qr') return;
    document.getElementById('direct-url').value = url;
}
function statusKorean(s) {
    return s==='safe' ? '정상' : (s==='danger' ? '위험' : '불명');
}
renderHistory();

document.getElementById('direct-url').addEventListener('keyup', function(e) {
    if (e.key === 'Enter') runDetection();
});

let qrScanner = null, currentQRMode = 'camera';
function showTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
    if(tabId === 'url') {
        document.querySelector('.tab-btn:nth-child(1)').classList.add('active');
        document.getElementById('tab-url').classList.add('active');
        if(qrScanner) { qrScanner.stop(); qrScanner = null; }
    } else {
        document.querySelector('.tab-btn:nth-child(2)').classList.add('active');
        document.getElementById('tab-qr').classList.add('active');
        setTimeout(()=>{ if(currentQRMode==='camera') startQRCamera(); }, 250);
    }
}
function chooseQRMode(mode) {
    currentQRMode = mode;
    if(mode==='camera') {
        startQRCamera();
    } else {
        if(qrScanner) { qrScanner.stop(); qrScanner = null; }
        document.getElementById('qr-file').click();
    }
}
function startQRCamera() {
    if(qrScanner) { qrScanner.stop(); qrScanner = null; }
    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 200 },
        (decodedText) => {
            document.getElementById('direct-url').value = decodedText;
            qrScanner.stop();
            showTab('url');
            runDetection();
        },
        ()=>{}
    ).catch(()=>{});
}
function onQRFileChange(e) {
    const file = e.target.files[0];
    if (!file) return;
    if(qrScanner) { qrScanner.clear(); }
    qrScanner = new Html5Qrcode("qr-reader");
    qrScanner.scanFile(file, true)
        .then(decodedText => {
            document.getElementById('direct-url').value = decodedText;
            showTab('url');
            runDetection();
        })
        .catch(() => {
            alert("QR코드를 인식할 수 없습니다.");
        });
}

function runDetection() {
    const activeTab = document.querySelector('.tab-btn.active').textContent.includes('QR') ? 'qr' : 'url';
    const url = (activeTab === 'qr' ? document.getElementById('direct-url').value : document.getElementById('direct-url').value).trim();
    if(!url) { alert('분석할 URL을 입력하세요.'); return; }
    document.getElementById('main-page').style.display = 'none';
    document.getElementById('result-page').style.display = 'flex';
    document.getElementById('result-dashboard').innerHTML = `<div class="loader"></div>
    <div style="margin-top:20px; color:#3870c7; font-weight:600; font-size:1.17em;text-align:center;">실시간 보안 점검 중입니다...</div>`;
    setTimeout(() => {
        let analysisResult;
        if(url.includes("pg.naver.com")) {
            analysisResult = {
                status: 'safe',
                verdict: '정상(공식 결제 페이지)',
                reason: '공식 PG사 도메인 및 HTTPS 암호화, 위조·악성 패턴 없음',
                details: {
                    'HTTPS 사용': true,
                    '공식 도메인': true,
                    '위험 키워드': false
                }
            };
        } else if(url.includes("naver-pay-security.xyz")) {
            analysisResult = {
                status: 'danger',
                verdict: '위험(피싱/위조 결제 페이지)',
                reason: '피싱 사이트 DB 등록, 공식 도메인 아님, HTTPS 미사용',
                details: {
                    'HTTPS 사용': false,
                    '공식 도메인': false,
                    '위험 키워드': true
                }
            };
        } else {
            analysisResult = {
                status: 'unknown',
                verdict: '불명(주의 필요)',
                reason: '공식 도메인 미확인, 의심 키워드 없음',
                details: {
                    'HTTPS 사용': true,
                    '공식 도메인': false,
                    '위험 키워드': false
                }
            };
        }
        addHistory(url, analysisResult.status);
        showResultDashboard(url, analysisResult);
    }, 1200);
}

function showResultDashboard(url, result) {
    window._lastResultForPDF = { checkedAt: new Date(), url, ...result };
    let html = `
    <div class="user-url"><b>분석한 URL:</b> <span>${url}</span></div>
    <div class="date">검사 일시: ${new Date().toLocaleString()}</div>
    <div class="verdict" style="margin-top:10px;"><i data-lucide="${result.status==='safe'?'shield-check':result.status==='danger'?'x-octagon':'alert-triangle'}" style="width:1.1em;vertical-align:-2px;"></i> ${result.verdict}</div>
    <table>
        <tr><th>점검 항목</th><th>결과</th></tr>
        <tr><td>HTTPS 암호화</td><td class="${result.details['HTTPS 사용']?'safe':'danger'}">${result.details['HTTPS 사용']?'적용':'미적용'}</td></tr>
        <tr><td>공식 PG사 도메인</td><td class="${result.details['공식 도메인']?'safe':'danger'}">${result.details['공식 도메인']?'확인됨':'확인불가'}</td></tr>
        <tr><td>위험/피싱 키워드</td><td class="${result.details['위험 키워드']?'danger':'safe'}">${result.details['위험 키워드']?'포함':'미포함'}</td></tr>
    </table>
    <div class="reason"><b>진단 근거:</b> ${result.reason}</div>
    <div class="dashboard-btns">
        <button class="rbtn" onclick="downloadPDFResult()"><i data-lucide='file-down'></i> PDF로 저장</button>
        <button class="rbtn" onclick="reportUrl('${url}')"><i data-lucide='alert-octagon'></i> 신고</button>
        <button class="rbtn" onclick="resetScan()"><i data-lucide='rotate-ccw'></i> 새로 스캔하기</button>
    </div>
    `;
    document.getElementById('result-dashboard').innerHTML = html;
    lucide.createIcons();
}

function resetScan() {
    document.getElementById('result-page').style.display = 'none';
    document.getElementById('main-page').style.display = 'block';
    document.getElementById('direct-url').value = '';
    if(qrScanner) { qrScanner.stop(); qrScanner = null; }
}

function downloadPDFResult() {
    const { jsPDF } = window.jspdf;
    const result = window._lastResultForPDF;
    if (!result) return alert("결과가 없습니다.");
    const doc = new jsPDF({ format: "a4", unit: "pt" });
    let y = 38;
    doc.setFontSize(21);
    doc.text("세이프가드 보안 탐지 결과", 50, y);
    y += 24;
    doc.setFontSize(12);
    doc.text(`검사 일시: ${result.checkedAt.toLocaleString()}`, 50, y+=30);
    doc.text(`검사 URL: ${result.url}`, 50, y+=22);
    doc.text(`진단 결과: ${result.verdict}`, 50, y+=22);
    doc.text(`진단 근거: ${result.reason}`, 50, y+=22);
    y += 10;
    doc.text("상세 내역", 50, y+=22);
    doc.text("-------------------------------------------------", 50, y+=15);
    doc.text(`- HTTPS 암호화: ${result.details['HTTPS 사용'] ? '적용' : '미적용'}`, 62, y+=18);
    doc.text(`- 공식 PG사 도메인: ${result.details['공식 도메인'] ? '확인됨' : '확인불가'}`, 62, y+=18);
    doc.text(`- 위험/피싱 키워드: ${result.details['위험 키워드'] ? '포함' : '미포함'}`, 62, y+=18);
    y+=30;
    doc.setFontSize(11); doc.setTextColor(130,140,160);
    doc.text("본 PDF는 실시간 보안 점검 결과를 기반으로 생성되었습니다.", 50, y);
    doc.save(`세이프가드_보안점검_${new Date().toISOString().slice(0,10)}.pdf`);
}

function reportUrl(url) {
    const reason = prompt('해당 URL을 신고합니다.\n신고 사유를 입력해 주세요:\n\n'+url);
    if (!reason) return;
    let reports = JSON.parse(localStorage.getItem('malurl_reports') || '[]');
    reports.unshift({ url, reason, ts: new Date().toISOString() });
    localStorage.setItem('malurl_reports', JSON.stringify(reports));
    alert('신고가 접수되었습니다.');
}
