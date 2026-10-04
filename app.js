const starterRoutine = [
  { id: "water", title: "Drink a glass of water", time: "07:00", category: "Morning", done: false },
  { id: "stretch", title: "Stretch and take a few deep breaths", time: "07:15", category: "Morning", done: false },
  { id: "breakfast", title: "Make and enjoy a nourishing breakfast", time: "08:00", category: "Morning", done: false },
  { id: "focus", title: "Spend a little time on your top priority", time: "09:00", category: "Morning", done: false },
  { id: "lunch", title: "Step away for a proper lunch break", time: "12:30", category: "Afternoon", done: false },
  { id: "walk", title: "Get outside for a short walk", time: "15:00", category: "Afternoon", done: false },
  { id: "unwind", title: "Put your screens away and unwind", time: "20:00", category: "Evening", done: false },
];

const storagePrefix = "daymark-routine-";
const taskList = document.querySelector("#taskList");
const taskDialog = document.querySelector("#taskDialog");
const toast = document.querySelector("#toast");
let selectedDate = new Date();
let activeFilter = "all";
let tasks = [];
let toastTimer;

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function readTasks(date) {
  let saved;
  try {
    saved = localStorage.getItem(storagePrefix + dateKey(date));
  } catch {
    showToast("Browser storage is unavailable. Showing the starter routine instead.");
    return structuredClone(starterRoutine);
  }
  if (saved === null) return structuredClone(starterRoutine);

  let parsed;
  try {
    parsed = JSON.parse(saved);
  } catch {
    showToast("Your saved routine couldn't be read. Showing the starter routine instead.");
    return structuredClone(starterRoutine);
  }
  if (!Array.isArray(parsed) || parsed.some((task) =>
    !task || typeof task.id !== "string" || typeof task.title !== "string"
    || typeof task.done !== "boolean" || typeof task.category !== "string"
    || (task.time !== "" && !/^([01]\d|2[0-3]):[0-5]\d$/.test(task.time))
  )) {
    showToast("Your saved routine has an unexpected format. Showing the starter routine instead.");
    return structuredClone(starterRoutine);
  }
  return parsed;
}

function saveTasks() {
  try {
    localStorage.setItem(storagePrefix + dateKey(selectedDate), JSON.stringify(tasks));
    return true;
  } catch {
    showToast("Your browser couldn't save this change. Check your storage settings.");
    return false;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 3200);
}

function isToday(date) {
  return dateKey(date) === dateKey(new Date());
}

function formatTime(time) {
  if (!time) return "Anytime";
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(2000, 0, 1, hours, minutes).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function updateDateHeading() {
  const today = isToday(selectedDate);
  document.querySelector("#dateLabel").textContent = selectedDate.toLocaleDateString([], {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).toUpperCase();
  document.querySelector("#selectedDayTitle").textContent = today
    ? "Today"
    : selectedDate.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  document.querySelector("#todayButton").classList.toggle("is-hidden", today);
  document.querySelector("#routineCaption").textContent = today
    ? "A thoughtful rhythm for your day."
    : `Your routine for ${selectedDate.toLocaleDateString([], { weekday: "long" })}.`;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  document.querySelector("#greeting").replaceChildren(
    document.createTextNode(today ? `${greeting}, you've got this` : "A fresh start"),
    Object.assign(document.createElement("span"), { className: "heading-period", textContent: "." }),
  );
}

function createTaskRow(task) {
  const row = document.createElement("article");
  row.className = `task-row${task.done ? " is-done" : ""}`;
  row.dataset.taskId = task.id;

  const check = document.createElement("button");
  check.className = "task-check";
  check.type = "button";
  check.setAttribute("aria-label", task.done ? `Mark ${task.title} as not done` : `Mark ${task.title} as done`);
  check.setAttribute("aria-pressed", String(task.done));
  if (task.done) check.textContent = "✓";

  const copy = document.createElement("div");
  copy.className = "task-copy";
  const title = document.createElement("strong");
  title.textContent = task.title;
  const category = document.createElement("span");
  category.className = "task-category";
  category.textContent = task.category;
  copy.append(title, category);

  const time = document.createElement("span");
  time.className = "task-time";
  time.textContent = formatTime(task.time);

  const remove = document.createElement("button");
  remove.className = "delete-task";
  remove.type = "button";
  remove.setAttribute("aria-label", `Remove ${task.title}`);
  remove.textContent = "×";
  row.append(check, copy, time, remove);
  return row;
}

function renderTasks() {
  const sorted = [...tasks].sort((left, right) => {
    if (!left.time) return right.time ? 1 : 0;
    if (!right.time) return -1;
    return left.time.localeCompare(right.time);
  });
  const done = tasks.filter((task) => task.done).length;
  const nextTimeThreshold = isToday(selectedDate)
    ? `${String(new Date().getHours()).padStart(2, "0")}:${String(new Date().getMinutes()).padStart(2, "0")}`
    : "00:00";
  const next = sorted.find((task) => !task.done && task.time && task.time >= nextTimeThreshold)
    || sorted.find((task) => !task.done);
  const percent = tasks.length ? Math.round(done / tasks.length * 100) : 0;

  document.querySelector("#allCount").textContent = String(tasks.length);
  document.querySelector("#activeCount").textContent = String(tasks.length - done);
  document.querySelector("#doneCount").textContent = String(done);
  document.querySelector("#footerCount").textContent = `${tasks.length} ${tasks.length === 1 ? "moment" : "moments"} in your day`;
  document.querySelector("#progressPercent").textContent = `${percent}%`;
  document.querySelector("#progressRing").style.setProperty("--progress", `${percent}%`);
  document.querySelector("#progressRing").setAttribute("aria-label", `${percent}% of tasks completed`);
  document.querySelector("#progressDetail").textContent = `${done} of ${tasks.length} ${tasks.length === 1 ? "task" : "tasks"} completed`;
  document.querySelector("#progressMessage").textContent = percent === 100 && tasks.length
    ? "You showed up for yourself today"
    : done > 0 ? "Look at you, making progress" : "A day full of possibility";
  document.querySelector("#nextTask").textContent = next ? next.title : tasks.length ? "You're all caught up" : "Your day is wide open";
  document.querySelector("#nextTime").textContent = next
    ? `${taskTimeLabel(next, nextTimeThreshold)} · ${next.category}`
    : tasks.length ? "Take a moment to celebrate" : "Add a task to get started";

  const visibleTasks = sorted.filter((task) =>
    activeFilter === "all" || (activeFilter === "active" && !task.done) || (activeFilter === "done" && task.done)
  );
  taskList.replaceChildren(...visibleTasks.map(createTaskRow));

  const empty = visibleTasks.length === 0;
  document.querySelector("#emptyState").hidden = !empty;
  document.querySelector("#emptyTitle").textContent = tasks.length ? "Nothing to see here" : "Nothing on the list yet";
  document.querySelector("#emptyCopy").textContent = tasks.length
    ? "Try another filter to find a task."
    : "Add a task to give your day a little shape.";
  document.querySelector("#emptyAddButton").hidden = tasks.length > 0;
  document.querySelectorAll(".filter-button").forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.filter === activeFilter);
  });
}

function taskTimeLabel(task, threshold) {
  return task.time && task.time >= threshold ? formatTime(task.time) : "Whenever you're ready";
}

function changeDate(offset) {
  selectedDate = new Date(selectedDate);
  selectedDate.setDate(selectedDate.getDate() + offset);
  tasks = readTasks(selectedDate);
  updateDateHeading();
  renderTasks();
}

document.querySelector("#previousDay").addEventListener("click", () => changeDate(-1));
document.querySelector("#nextDay").addEventListener("click", () => changeDate(1));
document.querySelector("#todayButton").addEventListener("click", () => {
  selectedDate = new Date();
  tasks = readTasks(selectedDate);
  updateDateHeading();
  renderTasks();
});

document.querySelectorAll(".filter-button").forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    renderTasks();
  });
});

function openTaskDialog() {
  taskDialog.showModal();
  document.querySelector("#taskName").focus();
}

document.querySelector("#addTaskButton").addEventListener("click", openTaskDialog);
document.querySelector("#emptyAddButton").addEventListener("click", openTaskDialog);
document.querySelector("#closeDialog").addEventListener("click", () => taskDialog.close());
document.querySelector("#cancelDialog").addEventListener("click", () => taskDialog.close());
taskDialog.addEventListener("click", (event) => {
  if (event.target === taskDialog) taskDialog.close();
});

document.querySelector("#taskForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const title = String(form.get("task")).trim();
  if (!title) return;
  tasks.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    time: String(form.get("time") || ""),
    category: String(form.get("category")),
    done: false,
  });
  const saved = saveTasks();
  activeFilter = "all";
  renderTasks();
  taskDialog.close();
  event.currentTarget.reset();
  document.querySelector("#taskTime").value = "09:00";
  if (saved) showToast("Added to your day.");
});

taskList.addEventListener("click", (event) => {
  const row = event.target.closest(".task-row");
  if (!row) return;
  const taskIndex = tasks.findIndex((task) => task.id === row.dataset.taskId);
  if (taskIndex < 0) return;
  if (event.target.closest(".task-check")) {
    tasks[taskIndex].done = !tasks[taskIndex].done;
    saveTasks();
    renderTasks();
  } else if (event.target.closest(".delete-task")) {
    tasks.splice(taskIndex, 1);
    const saved = saveTasks();
    renderTasks();
    if (saved) showToast("Task removed from your day.");
  }
});

document.querySelector("#mobileMenu").addEventListener("click", () => {
  document.querySelector("#sidebar").classList.toggle("is-open");
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.toggle("is-active", item === link));
    document.querySelector("#sidebar").classList.remove("is-open");
    if (link.hash === "#routine") document.querySelector("#routine").scrollIntoView({ behavior: "smooth" });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

tasks = readTasks(selectedDate);
updateDateHeading();
renderTasks();
