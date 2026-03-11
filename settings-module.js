/**
 * AYYAPPAN MANAGER - SETTINGS MODULE (Single File)
 * Logic for Global Settings, Annual Reporting, and Data Backup.
 */

(function() {
    // 1. INJECT CSS STYLES
    const style = document.createElement('style');
    style.textContent = `
        .settings-active { display: flex !important; }
        #annualTargetReportList::-webkit-scrollbar { width: 4px; }
        #annualTargetReportList::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 10px; }
        .settings-card { background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 1rem; padding: 1rem; }
    `;
    document.head.appendChild(style);

    // 2. INJECT MODAL HTML
    const settingsHTML = `
    <div id="settingsModal" class="modal">
        <div class="glass p-5 w-full max-w-md max-h-[95vh] overflow-y-auto space-y-4">
            <div class="flex justify-between items-center border-b border-white/10 pb-2">
                <h2 class="text-sm font-black text-blue-400 uppercase tracking-widest">Global Settings</h2>
                <button onclick="toggleSettings()" class="text-gray-500"><i class="fas fa-times"></i></button>
            </div>

            <div class="settings-card">
                <div class="flex justify-between items-center mb-4">
                    <label class="m-0 text-yellow-500 font-black">Annual Status</label>
                    <select id="reportYearSelect" onchange="generateTargetStatusReport()" 
                            class="bg-transparent text-xs font-bold text-blue-400 outline-none border border-white/10 rounded px-2 py-1">
                    </select>
                </div>
                <div class="bg-blue-600/10 rounded-xl p-3 mb-4 flex justify-between items-center border border-blue-500/20">
                    <div>
                        <div class="text-[9px] uppercase opacity-60 font-bold">Annual Profit</div>
                        <div id="annualTotalVal" class="text-lg font-black text-blue-400">₹0</div>
                    </div>
                    <div class="text-right">
                        <div class="text-[9px] uppercase opacity-60 font-bold">Success Rate</div>
                        <div id="annualSuccessRate" class="text-lg font-black text-green-500">0%</div>
                    </div>
                </div>
                <div id="annualTargetReportList" class="space-y-2 max-h-48 overflow-y-auto pr-1"></div>
            </div>

            <div class="space-y-3 pt-2">
                <div><label>Monthly Goal (₹)</label><input type="number" id="setTarget" class="input-box" placeholder="Target per month"></div>
                <div><label>Registered Companies</label><textarea id="setCompanies" class="input-box h-12 text-xs" placeholder="Company A, Company B"></textarea></div>
                <div><label>Helper Database</label><textarea id="setHelpers" class="input-box h-12 text-xs" placeholder="Helper 1, Helper 2"></textarea></div>
            </div>

            <div class="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
                <button onclick="backupData()" class="bg-slate-700 py-2 rounded-xl font-bold text-white uppercase text-[10px] border border-white/10">Export Backup</button>
                <button onclick="document.getElementById('importFile').click()" class="bg-slate-700 py-2 rounded-xl font-bold text-white uppercase text-[10px] border border-white/10">Import Backup</button>
                <input type="file" id="importFile" class="hidden" onchange="restoreData(event)">
            </div>

            <div class="pt-2">
                <a href="payments.html" class="block w-full bg-blue-600/20 border border-blue-500/50 py-3 rounded-xl text-center font-black text-blue-400 uppercase text-[10px]">
                    <i class="fas fa-wallet mr-2"></i> Open Payment History
                </a>
            </div>

            <button id="saveSettingsBtn" onclick="saveSettings()" class="w-full bg-blue-600 py-4 rounded-2xl font-black text-white uppercase shadow-xl active:scale-95 transition-transform">Update & Sync</button>
        </div>
    </div>`;
    document.body.insertAdjacentHTML('beforeend', settingsHTML);
})();

// 3. GLOBAL FUNCTIONS (Accessed by HTML onclicks)

async function syncSettings() {
    const doc = await db.collection("appSettings").doc("userConfig").get();
    if(doc.exists) {
        globalSettings = doc.data();
        document.getElementById('setTarget').value = globalSettings.target || 50000;
        document.getElementById('setCompanies').value = globalSettings.companies;
        document.getElementById('setHelpers').value = globalSettings.helpers;
    }
    loadDropdowns();
    generateTargetStatusReport();
}

async function saveSettings() {
    globalSettings = { 
        target: parseFloat(document.getElementById('setTarget').value) || 0, 
        companies: document.getElementById('setCompanies').value, 
        helpers: document.getElementById('setHelpers').value 
    };
    await db.collection("appSettings").doc("userConfig").set(globalSettings);
    showMessage("Settings Updated");
    loadDropdowns();
    toggleSettings();
    applyFilters();
}

function generateTargetStatusReport() {
    const container = document.getElementById('annualTargetReportList');
    const year = document.getElementById('reportYearSelect').value;
    const target = parseFloat(globalSettings.target) || 50000;
    container.innerHTML = ""; 
    let annualTotal = 0, met = 0, tracked = 0;

    monthNames.forEach((name, idx) => {
        let monthlyProfit = 0, hasData = false;
        allEntries.forEach(d => {
            const dD = new Date(d.date);
            if(dD.getFullYear() == year && dD.getMonth() == idx && !d.isHoliday) {
                hasData = true;
                let exp = 0; 
                d.logs?.forEach(l => { 
                    const s = parseFloat(l.sal)||0; 
                    exp += s + (s/2 * (parseFloat(l.ot)||0)) + (parseFloat(l.pet)||0) + (parseFloat(l.food)||0); 
                });
                const net = (parseFloat(d.total)||0) - exp;
                monthlyProfit += (d.projectType === 'Partner' ? net/2 : net);
            }
        });
        if(hasData) { 
            tracked++; if(monthlyProfit >= target) met++; annualTotal += monthlyProfit; 
            const colorClass = monthlyProfit >= target ? 'text-green-500' : 'text-red-400';
            container.innerHTML += `<div class="bg-white/5 p-3 rounded-xl border border-white/5 flex justify-between">
                <span class="text-xs font-bold">${name}</span>
                <span class="${colorClass} font-black">₹${Math.round(monthlyProfit).toLocaleString()}</span>
            </div>`; 
        }
    });
    document.getElementById('annualTotalVal').innerText = `₹${Math.round(annualTotal).toLocaleString()}`;
    document.getElementById('annualSuccessRate').innerText = `${tracked > 0 ? Math.round((met/tracked)*100) : 0}%`;
}

function backupData() {
    const blob = new Blob([JSON.stringify(allEntries)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Ayyappan_Manager_Backup.json`;
    a.click();
}

async function restoreData(event) {
    const file = event.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const data = JSON.parse(e.target.result);
        if(confirm(`Import ${data.length} records?`)) {
            for(const item of data) {
                delete item.id; 
                await db.collection("workLogs").add(item);
            }
            location.reload();
        }
    };
    reader.readAsText(file);
}
