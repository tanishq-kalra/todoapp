const API_URL = "https://todo-fullstack-rbyg.onrender.com/api/todos";

/* 🌙 Load saved theme */
const savedTheme = localStorage.getItem("theme");
if (savedTheme === "dark") {
  document.body.classList.add("dark");
}

let currentFilter = "all";

/* 🔄 Fetch & Render Todos */
async function fetchTodos() {
  const res = await fetch(API_URL);
  let todos = await res.json();

  if (currentFilter === "pending") {
    todos = todos.filter(todo => !todo.completed);
  }

  if (currentFilter === "completed") {
    todos = todos.filter(todo => todo.completed);
  }

  const list = document.getElementById("todoList");
  list.innerHTML = "";

  todos.forEach(todo => {
    const li = document.createElement("li");
    li.className = todo.completed ? "completed" : "";
    li.dataset.id = todo._id; // 🔑 for animations

    li.innerHTML = `
      <span>${todo.title}</span>
      <div class="actions">
        ${
          todo.completed
            ? `<button onclick="updateTodo('${todo._id}', false)">↩ Pending</button>`
            : `<button onclick="updateTodo('${todo._id}', true)">✅ Complete</button>`
        }
        <button onclick="deleteTodo('${todo._id}')">❌</button>
      </div>
    `;

    list.appendChild(li);
  });
}

/* ➕ Add Todo */
async function addTodo() {
  const input = document.getElementById("todoInput");
  const title = input.value.trim();
  if (!title) return;

  await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title })
  });

  input.value = "";
  fetchTodos();
}

/* 🔁 Update Todo Status */
async function updateTodo(id, completed) {
  await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ completed })
  });

  fetchTodos();
}

/* ❌ Delete Todo with Smooth Animation */
async function deleteTodo(id) {
  const li = document.querySelector(`[data-id="${id}"]`);
  if (li) {
    li.style.opacity = "0";
    li.style.transform = "scale(0.9)";
  }

  setTimeout(async () => {
    await fetch(`${API_URL}/${id}`, {
      method: "DELETE"
    });
    fetchTodos();
  }, 300);
}

/* 🔍 Filter Handler */
function setFilter(filter) {
  currentFilter = filter;
  fetchTodos();
}

/* 🌙 Toggle Dark Mode */
function toggleTheme() {
  document.body.classList.toggle("dark");

  if (document.body.classList.contains("dark")) {
    localStorage.setItem("theme", "dark");
  } else {
    localStorage.setItem("theme", "light");
  }
}

/* 🚀 Initial Load */
fetchTodos();
