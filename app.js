window.onload = async function () {
    const SUPABASE_URL = 'https://iivlxixcmlrqwdhewbuz.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_H_obrhzr2n6zhfq-sQUKKw_Adp37KL7';

    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const input = document.getElementById('cmd-input');
    const output = document.getElementById('terminal-out');
    const chartContainer = document.getElementById('chart-container');
    const menuItems = document.querySelectorAll('nav div, .mobile-menu button');

    let virtualDB = [];
    let myChart = null;

    // Функция синхронизации с базой
    async function syncData() {
        printToConsole('> SYNCING WITH CLOUD_DB...', 'text-zinc-500 italic');
        const { data, error } = await _supabase.from('oracle_expenses').select('*');
        if (!error && data) {
            virtualDB = data;
            printToConsole(`> SYNC_COMPLETE: ${virtualDB.length} RECORDS LOADED.`, 'text-green-600 font-bold');
        } else {
            printToConsole('> SYNC_ERROR: OFFLINE_MODE.', 'text-red-600');
        }
    }

    const commands = {
        'HELP': 'AVAILABLE: HELP, SCAN, STATUS, CLEAR, SHOW, ADD [AMT] [DESC], DELETE [ID], FIND [KEY], TOTAL, STATS, TOP, DATABASES',
        'STATUS': 'SYSTEM: OPERATIONAL | CLOUD: CONNECTED | SEC_LEVEL: 5',
        'SCAN': 'SCANNING... [||||||||||] 100% | ALL SYSTEMS CLEAR.',
        'DATABASES': 'ORACLE_DB_01: ONLINE | TABLE: oracle_expenses',
        'SECURITY': 'FIREWALL: ACTIVE | ENCRYPTION: RSA-4096',
        'LOGS': 'LAST LOGIN: TONI_STARK | SESSION_ID: 0x882A'
    };

    // Печать в консоль (адаптировано под светлый фон)
    function printToConsole(text, colorClass = 'text-zinc-700') {
        const line = document.createElement('div');
        line.className = `${colorClass} mb-2 pl-4 border-l-2 border-zinc-300 font-mono`;
        line.innerHTML = text;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    async function processCommand(rawCmd) {
        const fullCmd = rawCmd.trim();
        if (!fullCmd) return;
        
        const parts = fullCmd.split(' ');
        const cmd = parts[0].toUpperCase();

        // Отображение введенной команды
        const userLine = document.createElement('p');
        userLine.innerHTML = `<span class="text-[#314358] font-bold">SYS@ORACLE:~$</span> <span class="text-black font-bold">${fullCmd}</span>`;
        output.appendChild(userLine);

        if (cmd === 'ADD') {
            const amount = parseFloat(parts[1]);
            const description = parts.slice(2).join(' ') || 'OTHER'; 
            if (!isNaN(amount)) {
                printToConsole('> SENDING_PACKET...', 'text-orange-600');
                const timestamp = new Date().toLocaleString('ru-RU');
                const { data, error } = await _supabase.from('oracle_expenses').insert([{ amount, category: description.toUpperCase() }]).select();
                if (!error) {
                    virtualDB.push(data[0]);
                    printToConsole(`> SUCCESS: DATA_COMMITTED [ID: ${data[0].id}]`, 'text-green-600 font-bold');
                    printToConsole(`> TIMESTAMP: ${timestamp}`, 'text-zinc-400 text-[10px]');
                } else {
                    printToConsole('> DB_ERROR: INSERT_FAILED.', 'text-red-600');
                }
            } else { printToConsole('> ERR: USAGE: ADD [AMT] [DESC]', 'text-red-500'); }
        } 
        else if (cmd === 'DELETE') {
            const id = parts[1];
            if (!id) return printToConsole('> ERR: USAGE: DELETE [ID]', 'text-red-500');
            printToConsole('> DELETING_RECORD...', 'text-red-600');
            const { error } = await _supabase.from('oracle_expenses').delete().eq('id', id);
            if (!error) {
                virtualDB = virtualDB.filter(i => i.id != id);
                printToConsole(`> SUCCESS: RECORD #${id} WIPED.`, 'text-green-600');
            } else { printToConsole('> ERR: DELETE_FAILED.', 'text-red-600'); }
        }
        else if (cmd === 'FIND') {
            const query = parts.slice(1).join(' ').toUpperCase();
            if (!query) return printToConsole('> ERR: USAGE: FIND [KEYWORD]', 'text-red-500');
            const results = virtualDB.filter(i => i.category.includes(query));
            printToConsole(`> SEARCHING: "${query}"...`, 'text-blue-600');
            if (results.length > 0) {
                results.forEach(i => printToConsole(`[#${i.id}] ${i.category} — <span class="font-bold">${i.amount}</span>`));
                const subtotal = results.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
                printToConsole(`> SUB_TOTAL: ${subtotal.toFixed(2)}`, 'text-blue-800 font-bold');
            } else { printToConsole('> NO_MATCHES.', 'text-zinc-400'); }
        }
        else if (cmd === 'STATS') {
            if (virtualDB.length === 0) return printToConsole('> ERR: NO_DATA.', 'text-red-500');
            chartContainer.classList.remove('hidden');
            if (myChart) myChart.destroy();
            
            const summary = {};
            virtualDB.forEach(i => { 
                const c = i.category || 'OTHER'; 
                summary[c] = (summary[c] || 0) + (parseFloat(i.amount) || 0); 
            });

            setTimeout(() => {
                const ctx = document.getElementById('expensesChart').getContext('2d');
                myChart = new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: Object.keys(summary),
                        datasets: [{
                            data: Object.values(summary),
                            backgroundColor: ['#F80000', '#314358', '#4a5a6a', '#bbb', '#22c55e'],
                            borderColor: '#ffffff', 
                            borderWidth: 2
                        }]
                    },
                    options: { 
                        responsive: true, 
                        maintainAspectRatio: false, 
                        plugins: { 
                            legend: { 
                                position: 'bottom', 
                                labels: { color: '#333', font: { size: 10, family: 'JetBrains Mono' } } 
                            } 
                        } 
                    }
                });
                printToConsole('> ANALYTICS_GENERATED.', 'text-green-600');
            }, 50);
        }
        else if (cmd === 'TOP') {
            if (virtualDB.length === 0) return printToConsole('> ERR: NO_DATA.', 'text-red-500');
            const topTakers = [...virtualDB].sort((a, b) => b.amount - a.amount).slice(0, 3);
            printToConsole('> MAJOR_EXPENSES:', 'text-orange-700 font-bold');
            topTakers.forEach((item, index) => printToConsole(`${index + 1}. ${item.category}: ${item.amount} [#${item.id}]`));
        }
        else if (cmd === 'SHOW') {
            chartContainer.classList.add('hidden');
            let table = `<div class="mt-2 text-[11px] border-t border-zinc-200 pt-2 w-full">`;
            virtualDB.slice(-15).forEach(i => {
                table += `<div class="flex justify-between border-b border-zinc-100 py-1 hover:bg-zinc-50">
                    <span class="text-zinc-400">#${i.id}</span>
                    <span class="flex-1 px-4 text-left text-zinc-800 uppercase font-mono truncate">${i.category}</span>
                    <span class="text-[#314358] font-bold">${i.amount}</span>
                </div>`;
            });
            printToConsole(table + '</div>');
        }
        else if (cmd === 'TOTAL') {
            const sum = virtualDB.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
            printToConsole(`> TOTAL_EXPENDITURE: <span class="text-black font-bold underline">${sum.toFixed(2)}</span>`, 'text-zinc-800');
        }
        else if (cmd === 'CLEAR') {
            output.innerHTML = '<div class="scanline" style="opacity:0.05"></div>';
            chartContainer.classList.add('hidden');
        }
        else if (commands[cmd]) { 
            printToConsole(`> ${commands[cmd]}`, 'text-blue-700'); 
        }
        else { 
            printToConsole(`> ERR: COMMAND_NOT_FOUND '${cmd}'`, 'text-red-800'); 
        }
    }

    // Слушатели событий
    input.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter') { 
            processCommand(input.value); 
            input.value = ''; 
        } 
    });

    menuItems.forEach(el => el.addEventListener('click', function() { 
        processCommand(this.innerText.replace('▶', '').trim()); 
    }));

    // Инициализация
    await syncData();
};