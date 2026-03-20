window.onload = async function () {
    const SUPABASE_URL = 'https://iivlxixcmlrqwdhewbuz.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_H_obrhzr2n6zhfq-sQUKKw_Adp37KL7';

    const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    const input = document.getElementById('cmd-input');
    const output = document.getElementById('terminal-out');
    const chartContainer = document.getElementById('chart-container');

    let virtualDB = [];

    if (/Android|iPhone/i.test(navigator.userAgent)) {
        document.body.classList.add('theme-rb26');
    }

    function printToConsole(text, className = '') {
        const p = document.createElement('p');
        p.className = `mb-1 ${className}`;
        p.innerHTML = text;
        output.appendChild(p);
        output.scrollTop = output.scrollHeight;
    }

    async function syncData() {
        const { data, error } = await _supabase.from('oracle_expenses').select('*');
        if (!error && data) virtualDB = data;
    }

    await syncData();

    input.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter') {
            const raw = input.value.trim();
            const args = raw.split(' ');
            const cmd = args[0].toUpperCase();
            input.value = '';

            if (cmd === 'ADD') {
                const amt = parseFloat(args[1]);
                const cat = args.slice(2).join(' ') || 'MISC';
                const { error } = await _supabase.from('oracle_expenses').insert([{ amount: amt, category: cat.toUpperCase() }]);
                if (!error) { await syncData(); printToConsole(`> ADDED: ${amt}`, 'text-green-500'); }
            } 
            else if (cmd === 'FORECAST') {
                if (virtualDB.length < 2) return printToConsole('> ERR: DATA_INSUFFICIENT');
                const sorted = [...virtualDB].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
                const days = Math.max(1, Math.ceil((new Date() - new Date(sorted[0].created_at)) / 86400000));
                const total = virtualDB.reduce((s, i) => s + (parseFloat(i.amount) || 0), 0);
                const avg = total / days;
                printToConsole(`> 30D_FORECAST: <span class="text-red-600 font-bold">${(avg * 30).toFixed(2)}</span>`);
            }
            else if (cmd === 'THEME') {
                document.body.classList.toggle('theme-rb26');
                printToConsole('> UI_UPDATED');
            }
            else if (cmd === 'SHOW' || cmd === 'SCAN') {
                let table = `<div class="mt-2 border-t border-zinc-800 pt-2">`;
                virtualDB.slice(-10).forEach(i => {
                    table += `<div class="flex justify-between py-1 text-[10px]"><span>#${i.id}</span><span class="uppercase">${i.category}</span><span>${i.amount}</span></div>`;
                });
                printToConsole(table + '</div>');
            }
            else if (cmd === 'TOTAL') {
                const sum = virtualDB.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
                printToConsole(`> TOTAL: ${sum.toFixed(2)}`, 'text-yellow-500');
            }
            else if (cmd === 'CLEAR') { output.innerHTML = '<div class="scanline"></div>'; }
            else if (cmd === 'HELP') { printToConsole('> ADD, SHOW, TOTAL, FIND, DELETE, STATS, FORECAST, THEME, CLEAR'); }
        }
    });
};