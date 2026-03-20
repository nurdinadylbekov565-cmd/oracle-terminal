window.onload = async function () {
    const SUPABASE_URL = 'https://iivlxixcmlrqwdhewbuz.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_H_obrhzr2n6zhfq-sQUKKw_Adp37KL7';

    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const input = document.getElementById('cmd-input');
    const output = document.getElementById('terminal-out');
    const chartContainer = document.getElementById('chart-container');

    let virtualDB = [];
    let myChart = null;

    // Авто-детект устройства
    if (/Android|iPhone/i.test(navigator.userAgent)) {
        document.body.classList.add('theme-rb26');
    }

    const commands = {
        'HELP': 'AVAILABLE: SCAN, STATUS, CLEAR, SHOW, ADD [AMT] [DESC], DELETE [ID], FIND [KEY], TOTAL, STATS, FORECAST, THEME',
        'STATUS': 'SYSTEM_ONLINE | DATABASE_CONNECTED | ENCRYPTION_ACTIVE',
    };

    function printToConsole(text, className = '') {
        const p = document.createElement('p');
        p.className = `mb-1 ${className}`;
        p.innerHTML = text;
        output.appendChild(p);
        output.scrollTop = output.scrollHeight;
    }

    async function syncData() {
        const { data, error } = await _supabase.from('oracle_expenses').select('*');
        if (!error && data) {
            virtualDB = data;
        }
    }

    await syncData();

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const rawVal = input.value.trim();
            const args = rawVal.split(' ');
            const cmd = args[0].toUpperCase();
            input.value = '';

            if (cmd === 'ADD') {
                const amount = parseFloat(args[1]);
                const category = args.slice(2).join(' ') || 'MISC';
                const { error } = await _supabase.from('oracle_expenses').insert([{ amount, category }]);
                if (!error) {
                    await syncData();
                    printToConsole(`> TRANSACTION_RECORDED: +${amount} [${category}]`, 'text-green-500');
                }
            } 
            else if (cmd === 'THEME') {
                if (document.body.classList.contains('theme-rb26')) {
                    document.body.classList.replace('theme-rb26', 'theme-corp');
                } else if (document.body.classList.contains('theme-corp')) {
                    document.body.classList.remove('theme-corp');
                } else {
                    document.body.classList.add('theme-rb26');
                }
                printToConsole('> UI_LIVERY_UPDATED');
            }
            else if (cmd === 'FORECAST') {
                if (virtualDB.length < 2) return printToConsole('> ERR: DATA_INSUFFICIENT', 'text-red-800');
                const sorted = [...virtualDB].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                const days = Math.max(1, Math.ceil((new Date() - new Date(sorted[0].created_at)) / 86400000));
                const total = virtualDB.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                const avg = total / days;
                printToConsole(`> DATA_POINTS: ${virtualDB.length} | DAYS_TRACKED: ${days}`);
                printToConsole(`> AVG_DAILY_BURN: ${avg.toFixed(2)}`);
                printToConsole(`> MONTHLY_PROJECTION: <span class="text-red-600 font-bold underline">${(avg * 30).toFixed(2)}</span>`);
            }
            else if (cmd === 'SCAN' || cmd === 'SHOW') {
                chartContainer.classList.add('hidden');
                let table = `<div class="mt-2 text-[10px] border-t border-zinc-800 pt-2">`;
                virtualDB.slice(-15).forEach(i => {
                    table += `<div class="flex justify-between border-b border-zinc-900 py-1">
                        <span class="text-zinc-500">#${i.id}</span>
                        <span class="flex-1 px-4 text-zinc-300 uppercase truncate font-bold">${i.category}</span>
                        <span class="text-white font-bold">${i.amount}</span>
                    </div>`;
                });
                printToConsole(table + '</div>');
            }
            else if (cmd === 'FIND') {
                const key = args[1]?.toUpperCase();
                const found = virtualDB.filter(i => i.category.toUpperCase().includes(key));
                printToConsole(`> SEARCHING: '${key}' | FOUND: ${found.length}`);
                found.forEach(r => printToConsole(`>> ID:${r.id} | ${r.amount} | ${r.category}`));
            }
            else if (cmd === 'DELETE') {
                const id = args[1];
                const { error } = await _supabase.from('oracle_expenses').delete().eq('id', id);
                if (!error) { await syncData(); printToConsole(`> RECORD #${id} REMOVED.`, 'text-red-600'); }
            }
            else if (cmd === 'TOTAL') {
                const sum = virtualDB.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
                printToConsole(`> TOTAL_EXPENDITURE: <span class="text-white font-bold underline">${sum.toFixed(2)}</span>`, 'text-yellow-500');
            }
            else if (cmd === 'CLEAR') {
                output.innerHTML = '<div class="scanline"></div>';
                chartContainer.classList.add('hidden');
            }
            else if (commands[cmd]) {
                printToConsole(`> ${commands[cmd]}`);
            }
            else {
                printToConsole(`> ERR: UNKNOWN_COMMAND '${cmd}'`, 'text-red-900');
            }
        }
    });
};