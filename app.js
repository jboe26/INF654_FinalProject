import { auth, db } from "./firebaseDB.js";
import {
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

// ================= INITIALIZATION =================
document.addEventListener("DOMContentLoaded", () => {
  const modals = document.querySelectorAll(".modal");
  if (modals.length) M.Modal.init(modals);

  const selects = document.querySelectorAll("select");
  if (selects.length) M.FormSelect.init(selects);

  const tabs = document.querySelectorAll(".tabs");
  if (tabs.length) M.Tabs.init(tabs);

  setTimeout(() => M.updateTextFields(), 0);

  reloadFoldersUI();
  reloadTasks();

  const form = document.getElementById("taskForm");
  if (form) {
    console.log("Task form found, wiring listener");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      console.log("Submit triggered");
      saveTask();
    });
  } else {
    console.warn("Task form not found");
  }
});

// ================= AUTH STATE =================
onAuthStateChanged(auth, (user) => {
  const status = document.getElementById("authStatus");
  const notesBtn = document.getElementById("goToNotesBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (user) {
    const name = user.displayName || user.email || "User";
    status.innerHTML = `Welcome, <strong>${name}</strong>`;
    notesBtn.style.display = "inline-block";
    logoutBtn.style.display = "inline-block";
    reloadTasks();
    reloadFoldersUI();
  } else {
    status.innerHTML = `<a href="auth.html" class="btn deep-orange darken-2">Sign In</a>`;
    notesBtn.style.display = "none";
    logoutBtn.style.display = "none";
    clearTasksUI();
  }

  if (logoutBtn) {
    logoutBtn.onclick = async () => {
      await signOut(auth);
      M.toast({ html: "Logged out", classes: "blue darken-2" });
    };
  }
});

// ================= TASKS =================
async function saveTask() {
  console.log("saveTask() called");

  const id = document.getElementById("taskId").value || Date.now().toString();
  const title = document.getElementById("taskTitle").value.trim();
  const description = document.getElementById("taskDescription").value.trim();
  const folder = document.getElementById("folderSelector").value;

  if (!title || !folder) {
    M.toast({
      html: "Please enter a title and select a folder",
      classes: "red darken-2",
    });
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    console.warn("No user signed in");
    M.toast({ html: "Sign in to save tasks", classes: "red darken-2" });
    return;
  }

  try {
    await setDoc(doc(db, "users", user.uid, "tasks", id), {
      title,
      description,
      folder,
      updatedAt: Date.now(),
    });

    reloadTasks();
    const modal = M.Modal.getInstance(document.getElementById("taskModal"));
    if (modal) modal.close();
    M.toast({ html: "Task saved", classes: "green darken-2" });
  } catch (err) {
    console.error("Error saving task:", err);
    M.toast({ html: "Failed to save task", classes: "red darken-2" });
  }
}

async function reloadTasks() {
  const container = document.getElementById("taskListSection");
  const emptyState = document.getElementById("emptyState");
  if (!container) return;

  container.innerHTML = "";
  const user = auth.currentUser;
  if (!user) return;

  const snap = await getDocs(collection(db, "users", user.uid, "tasks"));
  if (snap.empty) {
    if (emptyState) emptyState.style.display = "block";
    return;
  }
  if (emptyState) emptyState.style.display = "none";

  snap.forEach((docSnap) => {
    const task = docSnap.data();
    const card = document.createElement("div");
    card.className = "task-card card";
    card.innerHTML = `
      <div class="card-content">
        <span class="card-title">${task.title}</span>
        <p>${task.description || "No description."}</p>
        <p class="grey-text">Folder: ${task.folder}</p>
      </div>
      <div class="card-action">
        <a href="#!" class="edit" onclick="editTask('${docSnap.id}')">Edit</a>
        <a href="#!" class="delete" onclick="deleteTask('${
          docSnap.id
        }')">Delete</a>
      </div>
    `;
    container.appendChild(card);
  });
}

async function editTask(id) {
  const user = auth.currentUser;
  if (!user) return;

  const snap = await getDocs(collection(db, "users", user.uid, "tasks"));
  const taskDoc = snap.docs.find((d) => d.id === id);
  if (!taskDoc) return;

  const task = taskDoc.data();
  document.getElementById("taskId").value = id;
  document.getElementById("taskTitle").value = task.title;
  document.getElementById("taskDescription").value = task.description || "";
  document.getElementById("folderSelector").value = task.folder;

  M.updateTextFields();
  M.FormSelect.init(document.querySelectorAll("select"));
  const modal = M.Modal.getInstance(document.getElementById("taskModal"));
  if (modal) modal.open();
}

async function deleteTask(id) {
  const user = auth.currentUser;
  if (!user) return;

  await deleteDoc(doc(db, "users", user.uid, "tasks", id));
  reloadTasks();
  M.toast({ html: "Task deleted", classes: "red darken-2" });
}

// ================= FOLDERS =================
async function reloadFoldersUI() {
  const tabs = document.getElementById("folderTabs");
  const user = auth.currentUser;
  if (!tabs || !user) return;

  const snap = await getDocs(collection(db, "users", user.uid, "tasks"));
  const folders = Array.from(
    new Set(snap.docs.map((d) => d.data().folder))
  ).sort();
  tabs.innerHTML = folders
    .map(
      (f) =>
        `<li class="tab col s3"><a href="#!" onclick="filterFolder('${f}')">${f}</a></li>`
    )
    .join("");
}

async function filterFolder(folder) {
  const container = document.getElementById("taskListSection");
  const user = auth.currentUser;
  if (!container || !user) return;

  const snap = await getDocs(collection(db, "users", user.uid, "tasks"));
  const filtered = snap.docs.filter((d) => d.data().folder === folder);
  container.innerHTML = "";
  filtered.forEach((docSnap) => {
    const task = docSnap.data();
    const card = document.createElement("div");
    card.className = "task-card card";
    card.innerHTML = `
      <div class="card-content">
        <span class="card-title">${task.title}</span>
        <p>${task.description || "No description."}</p>
        <p class="grey-text">Folder: ${task.folder}</p>
      </div>
      <div class="card-action">
        <a href="#!" class="edit" onclick="editTask('${docSnap.id}')">Edit</a>
        <a href="#!" class="delete" onclick="deleteTask('${
          docSnap.id
        }')">Delete</a>
      </div>
    `;
    container.appendChild(card);
  });
}

// ================= UTILITIES =================
function clearTasksUI() {
  const container = document.getElementById("taskListSection");
  const emptyState = document.getElementById("emptyState");
  if (container) container.innerHTML = "";
  if (emptyState) emptyState.style.display = "block";
}

function createNewFolder() {
  const folderName = prompt("Enter folder name:");
  if (!folderName) return;

  const selector = document.getElementById("folderSelector");
  if (!selector) return;

  const exists = Array.from(selector.options).some(
    (o) => o.value === folderName
  );
  if (!exists) {
    const option = document.createElement("option");
    option.value = folderName;
    option.textContent = folderName;
    selector.appendChild(option);
  }

  M.FormSelect.init(document.querySelectorAll("select"));
  M.toast({
    html: `Folder "${folderName}" created`,
    classes: "green darken-2",
  });
  reloadFoldersUI();
}

// ================= GLOBAL EXPOSURE =================
window.editTask = editTask;
window.deleteTask = deleteTask;
window.filterFolder = filterFolder;
window.create;
