window.onload = async function () {
    const SUPABASE_URL = 'https://iivlxixcmlrqwdhewbuz.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_H_obrhzr2n6zhfq-sQUKKw_Adp37KL7';

    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const input = document.getElementById('cmd-input');
    const output = document.getElementById('terminal-out');
    // Добавляем связь с контейнером графика из HTML
    const chartContainer = document.getElementById('chart-container');
    const menuItems = document.querySelectorAll('nav div');
    const mobileButtons = document.querySelectorAll('.mobile-menu button');

    let virtualDB = [];
    let myChart = null; // Хранилище для объекта графика

    async function syncData() {
        printToConsole('> SYNCING WITH CLOUD_DB...', 'text-zinc-500');
        const { data, error } = await _supabase.from('oracle_expenses').select('*');
        if (!error && data) {
            virtualDB = data;
            printToConsole(`> SYNC_COMPLETE: ${virtualDB.length} RECORDS LOADED.`, 'text-green-600');
        } else {
            printToConsole('> SYNC_ERROR: OFFLINE_MODE.', 'text-red-600');
        }
    }

    const commands = {
        'HELP': 'AVAILABLE: HELP, SCAN, STATUS, CLEAR, SHOW, ADD [AMT] [DESC], DELETE [ID], TOTAL, STATS, DATABASES',
        'STATUS': 'SYSTEM: OPERATIONAL | CLOUD: CONNECTED | SEC_LEVEL: 5',
        'SCAN': 'SCANNING... [||||||||||] 100% | ALL SYSTEMS CLEAR.',
        'DATABASES': 'ORACLE_DB_01: ONLINE | TABLE: oracle_expenses',
        'SECURITY': 'FIREWALL: ACTIVE | ENCRYPTION: RSA-4096',
        'LOGS': 'LAST LOGIN: TONI_STARK | SESSION_ID: 0x882A | CLOUD_SYNC: SUCCESS'
    };

    function printToConsole(text, colorClass = 'text-zinc-400') {
        const line = document.createElement('div');
        line.className = `${colorClass} mb-2 pl-4 border-l border-zinc-800`;
        line.innerHTML = text;
        output.appendChild(line);
        output.scrollTop = output.scrollHeight;
    }

    async function processCommand(rawCmd) {
        const fullCmd = rawCmd.trim();
        if (!fullCmd) return;
        
        const parts = fullCmd.split(' ');
        const cmd = parts[0].toUpperCase();

        const userLine = document.createElement('p');
        userLine.innerHTML = `<span class="text-[#F80000] font-bold">SYS@ORACLE:~$</span> <span class="text-white">${fullCmd}</span>`;
        output.appendChild(userLine);

        if (cmd === 'ADD') {
            const amount = parseFloat(parts[1]);
            const description = parts.slice(2).join(' ') || 'OTHER'; 
            
            if (!isNaN(amount)) {
                printToConsole('> SENDING_PACKET...', 'text-yellow-600');
                const { data, error } = await _supabase.from('oracle_expenses').insert([
                    { amount: amount, category: description.toUpperCase() }
                ]).select();

                if (!error) {
                    virtualDB.push(data[0]);
                    printToConsole(`> SUCCESS: DATA_COMMITTED [ID: ${data[0].id}]`, 'text-green-500');
                } else {
                    printToConsole(`> DB_ERROR: ${error.message}`, 'text-red-500');
                }
            } else {
                printToConsole('> ERR: USAGE: ADD [AMT] [DESCRIPTION]');
            }
        } 
        
        else if (cmd === 'STATS') {
            if (virtualDB.length === 0) {
                printToConsole('> ERR: NO_DATA_FOUND.', 'text-red-500');
                return;
            }
            
            printToConsole('> GENERATING_CHART...', 'text-cyan-600');
            chartContainer.classList.remove('hidden');

            const summary = {};
            virtualDB.forEach(item => {
                const cat = item.category || 'OTHER';
                summary[cat] = (summary[cat] || 0) + (parseFloat(item.amount) || 0);
            });

            const ctx = document.getElementById('expensesChart').getContext('2d');
            if (myChart) { myChart.destroy(); }

            myChart = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(summary),
                    datasets: [{
                        data: Object.values(summary),
                        backgroundColor: ['#F80000', '#3b82f6', '#22c55e', '#eab308', '#a855f7'],
                        borderColor: '#000',
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#71717a', font: { family: 'monospace' } } }
                    }
                }
            });
        }

        else if (cmd === 'DELETE') {
            const idToDelete = parseInt(parts[1]);
            if (!isNaN(idToDelete)) {
                printToConsole(`> PURGING RECORD #${idToDelete}...`, 'text-red-500');
                const { error } = await _supabase.from('oracle_expenses').delete().eq('id', idToDelete);
                if (!error) {
                    virtualDB = virtualDB.filter(i => i.id !== idToDelete);
                    printToConsole('> SUCCESS: RECORD DELETED.', 'text-green-500');
                }
            }
        }

        else if (cmd === 'SHOW') {
            chartContainer.classList.add('hidden'); // Прячем график, когда смотрим таблицу
            if (virtualDB.length === 0) {
                printToConsole('> DB_EMPTY.');
            } else {
                let table = `<div class="mt-2 text-[10px] text-white border-t border-zinc-800 pt-2">
                             <div class="flex justify-between font-bold text-red-600 mb-1"><span>ID</span><span class="flex-1 px-4 text-center">DESCRIPTION</span><span>AMT</span></div>`;
                virtualDB.forEach(item => {
                    table += `<div class="flex justify-between border-b border-zinc-900 py-1"><span>#${item.id}</span><span class="flex-1 px-4 text-zinc-300 uppercase truncate text-center">${item.category}</span><span class="text-white font-bold">${item.amount}</span></div>`;
                });
                table += `</div>`;
                printToConsole(table);
            }
        }

        else if (cmd === 'TOTAL') {
            const sum = virtualDB.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
            printToConsole(`> TOTAL_EXPENDITURE: <span class="text-white font-bold underline">${sum}</span>`, 'text-yellow-500');
        }

        else if (cmd === 'CLEAR') {
            output.innerHTML = '<div class="scanline"></div>';
            chartContainer.classList.add('hidden'); // Очищаем и график
        }

        else if (commands[cmd]) {
            printToConsole(`> ${commands[cmd]}`);
        } 
        
        else {
            printToConsole(`> ERR: UNKNOWN_COMMAND '${cmd}'`, 'text-yellow-700');
        }
    }

    // Слушатели событий (ввод и кнопки)
    input.addEventListener('keydown', (e) => { 
        if (e.key === 'Enter') { processCommand(input.value); input.value = ''; } 
    });

    [...menuItems, ...mobileButtons].forEach(el => {
        el.addEventListener('click', function() {
            processCommand(this.innerText.replace('▶', '').trim());
        });
    });

    await syncData();
};