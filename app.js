const SUPABASE_URL = "https://yocsxzpjlogexfjdwziu.supabase.co";
const SUPABASE_KEY = "sb_publishable_jIAUfDPQFdGcHhYsdo4mPQ_iyX7C_UR";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

const KEY = "my_expenses_v1";

let expenses = JSON.parse(
    localStorage.getItem(KEY) || "[]"
);

const form = document.getElementById("expenseForm");
const dateInput = document.getElementById("date");
const search = document.getElementById("search");

dateInput.value = new Date().toISOString().slice(0, 10);

// Fix: Added async keyword to allow await inside save()
async function save(newExpense = null) {
    // 1. Keep LocalStorage in sync
    localStorage.setItem(KEY, JSON.stringify(expenses));

    // 2. Insert into Supabase if a new item is passed
    if (newExpense) {
        const { error } = await supabaseClient
            .from("expenses")
            .insert([newExpense]);

        if (error) {
            console.error("Supabase insert error:", error);
        }
    }
}

function money(value) {
    return "$" + Number(value).toFixed(2);
}

function escapeHtml(value) {
    return String(value).replace(
        /[&<>"']/g,
        character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[character])
    );
}

function render() {
    const query = search.value.trim().toLowerCase();

    const list = expenses
        .filter(expense => {
            return [
                expense.item,
                expense.category,
                expense.store,
                expense.notes
            ]
            .join(" ")
            .toLowerCase()
            .includes(query);
        })
        .sort((a, b) =>
            b.date.localeCompare(a.date)
        );

    document.getElementById("total").textContent = money(
        expenses.reduce(
            (sum, expense) => sum + Number(expense.price),
            0
        )
    );

    document.getElementById("count").textContent = expenses.length;

    const container = document.getElementById("expenses");

    if (!list.length) {
        container.innerHTML = '<div class="empty">No expenses yet.</div>';
        return;
    }

    container.innerHTML = list.map(expense => `
        <article class="card">
            <div class="card-top">
                <div>
                    <h3>${escapeHtml(expense.item)}</h3>
                    <div class="meta">
                        ${escapeHtml(expense.date)}
                        ${expense.category ? " • " + escapeHtml(expense.category) : ""}
                        ${expense.store ? " • " + escapeHtml(expense.store) : ""}
                    </div>
                </div>
                <div class="price">
                    ${money(expense.price)}
                </div>
            </div>

            ${expense.notes ? `<div class="notes">${escapeHtml(expense.notes)}</div>` : ""}

            <button class="delete" onclick="removeExpense('${expense.id}')">
                Delete
            </button>
        </article>
    `).join("");
}

form.addEventListener("submit", async event => {
    event.preventDefault();

    const newExpense = {
        id: Date.now().toString(),
        item: document.getElementById("item").value,
        price: document.getElementById("price").value,
        date: document.getElementById("date").value,
        category: document.getElementById("category").value,
        store: document.getElementById("store").value,
        notes: document.getElementById("notes").value
    };

    expenses.push(newExpense);

    await save(newExpense);

    form.reset();
    dateInput.value = new Date().toISOString().slice(0, 10);
    render();
});

window.removeExpense = async function(id) {
    expenses = expenses.filter(expense => expense.id !== id);
    
    // Also remove from Supabase database
    await supabaseClient.from("expenses").delete().eq("id", id);
    
    save();
    render();
};

document.getElementById("clearAll").addEventListener("click", async () => {
    if (expenses.length && confirm("Delete all expenses?")) {
        expenses = [];
        await supabaseClient.from("expenses").delete().neq("id", "0");
        save();
        render();
    }
});

search.addEventListener("input", render);

render();