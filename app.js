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

    if (/Android|iPhone/i.test(navigator.userAgent)) {
        document.body.classList.add('theme-rb26');
    }

    async function syncData() {
        const { data, error } = await _supabase.from('oracle_expenses').select('*');
        if (!error && data) virtualDB = data;
    }

    const commands = {
        'HELP': 'AVAILABLE: SCAN, STATUS, CLEAR, SHOW, ADD [AMT] [DESC], DELETE [ID], FIND [KEY], TOTAL, STATS, TOP, FORECAST, THEME',
        'STATUS': 'SYSTEM: ONLINE | DATABASE: CONNECTED | LIVERY: ACTIVE',
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
        userLine.innerHTML = `<span class="text-[#F80000] font-bold">SYS:~$</span> <span class="text-white">${fullCmd}</span>`;
        output.appendChild(userLine);

        if (cmd === 'ADD') {
            const amount = parseFloat(parts[1]);
            const desc = parts.slice(2).join(' ') || 'OTHER';
            if (!isNaN(amount)) {
                const { data, error } = await _supabase.from('oracle_expenses').insert([{ amount, category: desc.toUpperCase() }]).select();
                if (!error) { virtualDB.push(data[0]); printToConsole(`> COMMITTED: +${amount}`, 'text-green-500'); }
            }
        } 
        else if (cmd === 'THEME') {
            document.body.classList.toggle('theme-rb26');
            printToConsole('> LIVERY_CHANGED');
        }
        else if (cmd === 'FORECAST') {
            if (virtualDB.length < 2) return printToConsole('> ERR: NO_DATA');
            const sorted = [...virtualDB].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
            const days = Math.max(1, Math.ceil((new Date() - new Date(sorted[0].created_at)) / 86400000));
            const total = virtualDB.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
            const avg = total / days;
            printToConsole(`> AVG_DAILY: ${avg.toFixed(2)} | 30D_PROJ: ${(avg * 30).toFixed(2)}`, 'text-red-500 font-bold');
        }
        else if (cmd === 'TOTAL') {
            const sum = virtualDB.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
            printToConsole(`> TOTAL: ${sum.toFixed(2)}`, 'text-yellow-500');
        }
        else if (cmd === 'SHOW') {
            let table = `<div class="mt-2 border-t border-zinc-800 pt-2">`;
            virtualDB.slice(-10).forEach(i => { table += `<div class="flex justify-between py-1 text-[10px]"><span>#${i.id}</span><span class="text-zinc-300 uppercase">${i.category}</span><span class="font-bold">${i.amount}</span></div>`; });
            printToConsole(table + '</div>');
        }
        else if (cmd === 'CLEAR') { output.innerHTML = '<div class="scanline"></div>'; }
        else if (commands[cmd]) { printToConsole(`> ${commands[cmd]}`); }
        else { printToConsole(`> ERR: UNKNOWN '${cmd}'`, 'text-yellow-700'); }
    }

    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { processCommand(input.value); input.value = ''; } });
    await syncData();
};