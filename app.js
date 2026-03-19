window.onload = async function () {
    const URL = 'https://iivlxixcmlrqwdhewbuz.supabase.co';
    const KEY = 'sb_publishable_H_obrhzr2n6zhfq-sQUKKw_Adp37KL7';
    const _db = supabase.createClient(URL, KEY);

    const input = document.getElementById('cmd-input');
    const out = document.getElementById('terminal-out');
    const chartContainer = document.getElementById('chart-container');
    const menuItems = document.querySelectorAll('nav div, .mobile-menu button');
    
    let dbData = [];
    let myChart = null;

    // --- CORE FUNCTIONS ---
    async function syncData() {
        printLine('> INITIALIZING ORACLE_CORE_V1.0...', 'text-zinc-500');
        try {
            const { data, error } = await _db.from('oracle_expenses').select('*');
            if (error) throw error;
            dbData = data || [];
            printLine('> AUTHENTICATION SUCCESSFUL. ACCESS GRANTED.', 'text-[#F80000] font-bold');
            printLine(`> SYNC_COMPLETE: ${dbData.length} RECORDS RETRIEVED.`, 'text-green-600');
        } catch (e) {
            printLine('> CRITICAL_ERR: DATABASE_CONNECTION_FAILED.', 'text-red-600');
            console.error(e);
        }
    }

    function printLine(text, className = 'text-zinc-400') {
        const line = document.createElement('div');
        line.className = `${className} mb-2 pl-4 border-l border-zinc-800 animate-pulse-subtle`;
        line.innerHTML = text;
        out.appendChild(line);
        out.scrollTop = out.scrollHeight;
    }

    async function executeCommand(rawInput) {
        const trimmed = rawInput.trim();
        if (!trimmed) return;

        const parts = trimmed.split(' ');
        const command = parts[0].toUpperCase();
        
        printLine(`<span class="text-[#F80000] font-bold">SYS@ORACLE:~$</span> <span class="text-white">${trimmed}</span>`);

        if (command === 'ADD') {
            const amount = parseFloat(parts[1]);
            const category = parts.slice(2).join(' ') || 'OTHER';
            
            if (isNaN(amount)) {
                printLine('> ERR: INVALID_AMOUNT. USAGE: ADD [NUMBER] [CATEGORY]', 'text-red-500');
                return;
            }

            const { data, error } = await _db.from('oracle_expenses').insert([
                { amount: amount, category: category.toUpperCase() }
            ]).select();

            if (!error) {
                dbData.push(data[0]);
                printLine(`> DATA_INJECTED: TRANSACTION_ID #${data[0].id}`, 'text-green-500');
            } else {
                printLine('> ERR: INJECTION_FAILED.', 'text-red-500');
            }

        } else if (command === 'STATS') {
            if (dbData.length === 0) {
                printLine('> ERR: NO_DATA_AVAILABLE_FOR_ANALYSIS.');
                return;
            }
            
            chartContainer.classList.remove('hidden');
            const totals = {};
            dbData.forEach(item => {
                const cat = item.category || 'OTHER';
                totals[cat] = (totals[cat] || 0) + (parseFloat(item.amount) || 0);
            });

            const ctx = document.getElementById('expensesChart').getContext('2d');
            if (myChart) myChart.destroy();
            
            myChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(totals),
                    datasets: [{
                        data: Object.values(totals),
                        backgroundColor: ['#F80000', '#3b82f6', '#22c55e', '#eab308', '#a855f7'],
                        borderWidth: 0,
                        hoverOffset: 10
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#71717a', font: { family: 'monospace', size: 10 } }
                        }
                    }
                }
            });
            printLine('> ANALYTICS_GENERATED_SUCCESSFULLY.', 'text-blue-400');

        } else if (command === 'SHOW') {
            chartContainer.classList.add('hidden');
            let tableHtml = '<div class="mt-2 border-t border-zinc-800 pt-2 font-mono text-xs">';
            dbData.slice(-10).forEach(item => {
                tableHtml += `
                    <div class="flex justify-between py-1 border-b border-zinc-900">
                        <span class="text-zinc-600">#${item.id}</span>
                        <span class="text-zinc-300">${item.category}</span>
                        <span class="text-white font-bold">${item.amount}</span>
                    </div>`;
            });
            printLine(tableHtml + '</div>');

        } else if (command === 'TOTAL') {
            const sum = dbData.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
            printLine(`> TOTAL_EXPENDITURE: <span class="text-yellow-500 font-bold">${sum.toFixed(2)}</span>`, 'text-zinc-300');

        } else if (command === 'CLEAR') {
            out.innerHTML = '<div class="scanline"></div>';
            chartContainer.classList.add('hidden');
        }
    }

    // --- EVENTS ---
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            executeCommand(input.value);
            input.value = '';
        }
    });

    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const cmdText = this.innerText.replace('▶', '').trim();
            executeCommand(cmdText);
        });
    });

    await syncData();
};