window.onload = function() {
    let reports = JSON.parse(localStorage.getItem('malurl_reports') || '[]');
    const wrap = document.getElementById('report-list');
    if(!reports.length) {
        wrap.innerHTML = `<div class="empty">신고된 내역이 없습니다.</div>`;
        return;
    }
    wrap.innerHTML = reports.map(r => `
        <div class="report-item">
            <div class="report-date">[${r.ts.slice(0,19).replace('T',' ')}]</div>
            <div class="report-url">${r.url}</div>
            <div class="report-reason">사유: ${r.reason}</div>
        </div>
    `).join('');
}
