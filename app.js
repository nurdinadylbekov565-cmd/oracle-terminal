window.onload = async function () {
    const SUPABASE_URL = 'https://iivlxixcmlrqwdhewbuz.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_H_obrhzr2n6zhfq-sQUKKw_Adp37KL7';
    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    const input = document.getElementById('cmd-input');
    const output = document.getElementById('terminal-out');
    const chartContainer = document.getElementById('chart-container');
    const menuItems = document.querySelectorAll('nav div');
    const mobileButtons = document.querySelectorAll('.mobile-menu button');

    let virtualDB = [];

    // Принудительная синхронизация
    async function syncData() {
        printToConsole('> SYNCING WITH ORACLE_CLOUD...', 'text-zinc-500');
        try {
            const { data, error } = await _supabase.from('oracle_expenses').select('*');
            if (error) throw error;
            virtualDB = data || [];
            printToConsole(`> SYNC_COMPLETE: ${virtualDB.length} RECORDS.`, 'text-green-600');
        } catch (e) {
            printToConsole('> SYNC_ERROR: OFFLINE_MODE.', 'text-red-600');
        }
    }

    const commands = {
        'HELP': 'AVAILABLE: HELP, SCAN, STATUS, CLEAR, SHOW, ADD [AMT] [DESC], DELETE [ID], TOTAL, STATS, LOGS',
        'STATUS': 'SYSTEM: OPERATIONAL | CLOUD: CONNECTED | SEC_LEVEL: 5',
        'SCAN': 'SCANNING... [||||||||||] 100% | ALL SYSTEMS CLEAR.',
        'LOGS': 'USER: TONI_STARK | SESSION: 0x882A | CLOUD: OK'
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

        printToConsole(`<span class="text-[#F80000] font-bold">SYS@ORACLE:~$</span> <span class="text-white">${fullCmd}</span>`, '');

        if (cmd === 'ADD') {
            const amt = parseFloat(parts[1]);
            const desc = parts.slice(2).join(' ') || 'OTHER';
            if (!isNaN(amt)) {
                printToConsole('> COMMITTING...', 'text-yellow-600');
                const { data, error } = await _supabase.from('oracle_expenses').insert([{ amount: amt, category: desc.toUpperCase() }]).select();
                if (!error) { virtualDB.push(data[0]); printToConsole(`> SUCCESS: ID #${data[0].id}`, 'text-green-500'); }
            } else { printToConsole('> ERR: ADD [AMT] [DESC]'); }
        }
        else if (cmd === 'STATS') {
            if (virtualDB.length === 0) return printToConsole('> ERR: NO DATA.');
            const summary = {};
            virtualDB.forEach(i => { 
                const c = i.category || 'OTHER'; 
                summary[c] = (summary[c] || 0) + (parseFloat(i.amount) || 0);
            });
            const max = Math.max(...Object.values(summary));
            let html = '<div class="my-4 space-y-2 p-2 bg-black border border-zinc-800">';
            for (let c in summary) {
                const w = (summary[c] / max) * 100;
                html += `<div class="text-[10px]"><div class="flex justify-between"><span>${c}</span><span>${summary[c]}</span></div>
                <div class="w-full bg-zinc-900 h-1 mt-1"><div class="bg-red-600 h-full" style="width:${w}%"></div></div></div>`;
            }
            printToConsole(html + '</div>');
        }
        else if (cmd === 'SHOW') {
            if (virtualDB.length === 0) return printToConsole('> DB_EMPTY.');
            let t = `<div class="mt-2 text-[10px] border-t border-zinc-800 pt-2">
                <div class="flex justify-between text-red-600 font-bold"><span>ID</span><span class="flex-1 text-center">DESC</span><span>AMT</span></div>`;
            virtualDB.forEach(i => {
                t += `<div class="flex justify-between border-b border-zinc-900 py-1"><span class="text-zinc-600">#${i.id}</span><span class="flex-1 text-center truncate">${i.category}</span><span class="text-white font-bold">${i.amount}</span></div>`;
            });
            printToConsole(t + '</div>');
        }
        else if (cmd === 'TOTAL') {
            const sum = virtualDB.reduce((a, i) => a + (parseFloat(i.amount) || 0), 0);
            printToConsole(`> TOTAL: <span class="text-white underline">${sum}</span>`, 'text-yellow-500');
        }
        else if (cmd === 'DELETE') {
            const id = parseInt(parts[1]);
            if (!isNaN(id)) {
                const { error } = await _supabase.from('oracle_expenses').delete().eq('id', id);
                if (!error) { virtualDB = virtualDB.filter(i => i.id !== id); printToConsole(`> #${id} DELETED.`, 'text-red-500'); }
            }
        }
        else if (cmd === 'CLEAR') { output.innerHTML = '<div class="scanline"></div>'; }
        else if (commands[cmd]) { printToConsole(`> ${commands[cmd]}`); }
        else { printToConsole(`> ERR: UNKNOWN COMMAND`, 'text-zinc-600'); }
    }

    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { processCommand(input.value); input.value = ''; } });
    [...menuItems, ...mobileButtons].forEach(el => {
        el.addEventListener('click', function() { processCommand(this.innerText.replace('▶', '').trim()); });
    });
    await syncData();
};