// ===== Utilities =====
function getJSON(key) { return JSON.parse(localStorage.getItem(key) || '[]'); }
function setJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)); }
function sanitize(str) { return str.replace(/[<>"']/g, ''); }



// ===== LOGIN PAGE =====
if (document.getElementById('loginForm')) {
  loginForm.onsubmit = function(e) {
    e.preventDefault();

    let username = sanitize(loginUser.value.trim());
    let password = loginPass.value;

    if (!username || !password) {
      loginErr.textContent = "Username and password required.";
      return;
    }

    let users = getJSON('users');
    let existing = users.find(u => u.u === username || u.e === username);

    if (!existing) {
      loginErr.textContent = "No account found with that username/email. Please register first.";
      return;
    }

    if (existing.p !== btoa(password)) {
      loginErr.textContent = "Incorrect password.";
      return;
    }

    localStorage.setItem('session', existing.u);
    localStorage.setItem('sessionStart', Date.now().toString());
    if (rememberMe.checked) {
      localStorage.setItem('remember', existing.u);
    } else {
      localStorage.removeItem('remember');
    }

    window.location.href = 'dashboard.html';
  };
}


// ===== DASHBOARD =====
if (document.getElementById('userWelcome')) {
  userWelcome.textContent = localStorage.getItem('session');

  let tasks = getJSON('tasks');
  statTotal.textContent = tasks.length;
  statDone.textContent = tasks.filter(t => t.status === "Done").length;
  statTodo.textContent = tasks.filter(t => t.status !== "Done").length;

  fetch('https://api.quotable.io/random')
    .then(r => r.json())
    .then(d => quote.innerHTML = "Quote: " + d.content);

  fetch('https://wttr.in/?format=3')
    .then(r => r.text())
    .then(d => weather.innerHTML = "Weather: " + d);
}



// ==== TASK MANAGER ====
if (document.getElementById('taskForm')) {
  // Function to display tasks
  function showTasks() {
    let tasks = getJSON('tasks');
    taskList.innerHTML = '';
    if (tasks.length === 0) {
      taskList.innerHTML = '<p>No tasks yet.</p>';
      return;
    }
    tasks.forEach(t => {
      let div = document.createElement('div');
      div.className = 'task-item';
      div.textContent = `${t.title} (${t.status})`;
      taskList.appendChild(div);
    });
  }
  showTasks();

  
  taskForm.onsubmit = function(e) {
    e.preventDefault();

    let title = sanitize(taskTitle.value.trim());
    let tasks = getJSON('tasks');

    // Validate title
    if (title.length < 3) {
      taskErr.textContent = "Title must be at least 3 characters.";
      return;
    }
    if (tasks.some(t => t.title.toLowerCase() === title.toLowerCase())) {
      taskErr.textContent = "A task with this title already exists.";
      return;
    }

    // Validate due date — must be today or later
    if (!taskDue.value) {
      taskErr.textContent = "Please select a due date.";
      return;
    }
    let dueDate = new Date(taskDue.value);
    let today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    if (dueDate < today) {
      taskErr.textContent = "Due date cannot be in the past.";
      return;
    }

    // Create task object
    let t = {
      id: Date.now(),
      title,
      description: taskDesc.value,
      priority: taskPriority.value,
      dueDate: taskDue.value,
     
      tags: document.getElementById('taskTags') ? taskTags.value : "",
      status: "To Do",
      createdDate: new Date().toISOString()
    };

    // Save to localStorage
    tasks.push(t);
    setJSON('tasks', tasks);

    // Refresh display and reset form
    showTasks();
    taskForm.reset();
    taskErr.textContent = "";
  };
}


// ===== KANBAN BOARD =====
if (document.getElementById('kanbanBoard')) {
  let tasks = getJSON('tasks');
  document.querySelectorAll('.kanban-col').forEach(col => {
    let st = col.dataset.status;
    tasks.filter(t => t.status === st).forEach(t => {
      let div = document.createElement('div');
      div.className = 'task-item';
      div.draggable = 1; div.textContent = t.title;
      div.ondragstart = e => e.dataTransfer.setData("id", t.id);
      col.appendChild(div);
    });
    col.ondragover = e => { e.preventDefault(); col.classList.add('drop-hover'); };
    col.ondragleave = () => col.classList.remove('drop-hover');
    col.ondrop = e => {
      col.classList.remove('drop-hover');
      let id = e.dataTransfer.getData("id"), ts = getJSON('tasks');
      ts.forEach(t => { if (t.id == id) t.status = col.dataset.status; });
      setJSON('tasks', ts); location.reload();
    };
  });
}

// ===== REPORTS =====
if (document.getElementById('taskChart')) {
  let tasks = getJSON('tasks');
  analytics.innerHTML = "Tasks: " + tasks.length + "<br>Done: " + tasks.filter(t => t.status === "Done").length;
  new Chart(taskChart, { 
    type:'pie',
    data: { labels:['To Do','In Progress','Done'],
      datasets:[{ 
        data:[
          tasks.filter(t=>t.status=="To Do").length,
          tasks.filter(t=>t.status=="In Progress").length,
          tasks.filter(t=>t.status=="Done").length
        ],
        backgroundColor:['#aab6fa','#fdd835','#66bb6a']
      }] 
    }
  });
}

// ===== SETTINGS / PROFILE =====
if (document.getElementById('profileForm')) {
  // Change password fields toggle
  if (document.getElementById('changePassBtn')) {
    const changeBtn = document.getElementById('changePassBtn');
    const passFields = document.getElementById('passFields');
    let showing = false;

    changeBtn.onclick = () => {
      showing = !showing;
      passFields.style.display = showing ? '' : 'none';
      changeBtn.classList.toggle('active', showing);
      changeBtn.textContent = showing ? 'Cancel Password Change' : 'Change Password';
    };
  }

  // Load saved prefs
  const prefs = getJSON('prefs');
  if (prefs.name) profileName.value = prefs.name;
  if (prefs.email) profileEmail.value = prefs.email;
  if (prefs.theme) themeSelect.value = prefs.theme;

  let avatar = localStorage.getItem('avatar');
  if (avatar) avatarDisplay.innerHTML = `<img class="avatar" src="${avatar}">`;

  profileForm.onsubmit = e => {
    e.preventDefault();
    profileErr.style.color = "red";

    // Validate email
    if (!/^[\w\.-]+@[\w\.-]+\.\w+$/.test(profileEmail.value)) {
      profileErr.textContent = "Invalid email.";
      return;
    }

    // Change password if fields are shown
    const passFieldsDiv = document.getElementById('passFields');
    if (passFieldsDiv && passFieldsDiv.style.display !== "none") {
      let np = newPassword.value.trim(), cp = confirmPassword.value.trim();
      if (!np || !cp) {
        profileErr.textContent = "Enter both password fields.";
        return;
      }
      if (np !== cp) {
        profileErr.textContent = "Passwords do not match.";
        return;
      }
      let users = getJSON('users');
      let user = users.find(u => u.u === localStorage.getItem('session'));
      if (user) {
        user.p = btoa(np);  
        setJSON('users', users);
      }
    }

    // Save preferences always
    setJSON('prefs', {
      name: profileName.value.trim(),
      email: profileEmail.value.trim(),
      theme: themeSelect.value
    });

    // Avatar upload
    if (avatarUpload.files[0]) {
      let fr = new FileReader();
      fr.onload = () => {
        localStorage.setItem('avatar', fr.result);
        avatarDisplay.innerHTML = `<img class="avatar" src="${fr.result}">`;
      }
      fr.readAsDataURL(avatarUpload.files[0]);
    }

    profileErr.style.color = "green";
    profileErr.textContent = "Preferences saved!";
  };
}



// ===== DASHBOARD PROGRESS BAR =====
if (document.getElementById('progressBarInner')) {
  let tasks = getJSON('tasks');
  let total = tasks.length || 1;
  let completed = tasks.filter(t => t.status === "Done").length;
  document.getElementById('progressBarInner').style.width = ((completed/total)*100) + '%';
}


//==== REGISTRATION PAGE =====
registerForm.onsubmit = function(e) {
  e.preventDefault();

  if (!/^[\w\.-]+@[\w\.-]+\.\w+$/.test(regEmail.value)) {
    regErr.textContent = "Invalid email.";
    return;
  }
  if (!/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(regPass.value)) {
    regErr.textContent = "Password must be 8+ chars, with uppercase and number.";
    return;
  }
  if (regPass.value !== regConfirm.value) {
    regErr.textContent = "Passwords do not match.";
    return;
  }

  let users = getJSON('users');
  if (users.find(u => u.u === regUser.value)) {
    regErr.textContent = "Username already taken.";
    return;
  }

  users.push({
    u: regUser.value.trim(),
    e: regEmail.value.trim(),
    p: btoa(regPass.value) 
  });
  
  setJSON('users', users);
  alert("Registration complete, please login.");
  window.location.href = 'login.html';
};


const SESSION_TIMEOUT_MINUTES = 30;

function isSessionExpired() {
  let loginTime = localStorage.getItem('sessionStart');
  if (!loginTime) return true;
  let elapsedMinutes = (Date.now() - parseInt(loginTime, 10)) / 60000;
  return elapsedMinutes > SESSION_TIMEOUT_MINUTES;
}

function clearSessionOnly() {
  
  localStorage.removeItem('session');
  localStorage.removeItem('sessionStart');
  localStorage.removeItem('sessionToken'); 
  localStorage.removeItem('remember');
}

function checkSession() {
  const sessionUser = localStorage.getItem('session');
  if (!sessionUser || isSessionExpired()) {
    clearSessionOnly();
    window.location.href = 'login.html';
  } else {
    localStorage.setItem('sessionStart', Date.now().toString());
  }
}

// REGISTER PAGE LOGIC
const registerForm = document.getElementById("registerForm");
const regErr = document.getElementById("regErr");

registerForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = document.getElementById("regUser").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPass").value.trim();
  const confirm = document.getElementById("regConfirm").value.trim();

  // Simple validations
  if (!username || !email || !password || !confirm) {
    regErr.textContent = "All fields are required!";
    return;
  }

  if (password !== confirm) {
    regErr.textContent = "Passwords do not match!";
    return;
  }

  // Load existing users from localStorage
  let users = JSON.parse(localStorage.getItem("users")) || {};

  // Check if email already exists
  if (users[email]) {
    regErr.textContent = "Email already registered! Please login.";
    return;
  }

  // Save new user
  users[email] = {
    username: username,
    password: password
  };
  localStorage.setItem("users", JSON.stringify(users));

  alert("Registration successful! You will be redirected to login page.");

  // Redirect to login page
  window.location.href = "index.html";
});

// Run session check on protected pages
if (
  ['dashboard.html', 'settings.html', 'task_manager.html', 'project_board.html', 'reports.html']
    .some(p => window.location.pathname.endsWith(p))
) {
  checkSession();
}

// ===== LOGOUT =====
document.querySelectorAll('#logoutBtn').forEach(btn =>
  btn.onclick = (e) => { 
    e.preventDefault();
    clearSessionOnly();
    window.location = 'login.html';
  }
);


//==== TASKMANAGER ====
if (document.getElementById('taskForm')) {
  function showTasks() {
    let tasks = getJSON('tasks');
    taskList.innerHTML = '';
    tasks.forEach(t => {
      let div = document.createElement('div');
      div.className = 'task-item';
      div.textContent = t.title + " (" + t.status + ")";
      taskList.appendChild(div);
    });
  }
  showTasks();

  taskForm.onsubmit = function(e) {
    e.preventDefault();
    let title = sanitize(taskTitle.value);
    let tasks = getJSON('tasks');

    // Basic validation
    if (title.length < 3 || tasks.some(t => t.title === title)) {
      taskErr.textContent = "Invalid or duplicate title.";
      return;
    }
    if (new Date(taskDue.value) < new Date()) { 
      taskErr.textContent = "Due date in past."; 
      return; 
    }

    let t = {
      id: Date.now(),
      title,
      description: taskDesc.value,
      priority: taskPriority.value,
      dueDate: taskDue.value,
      tags: taskTags.value,
      status: "To Do",
      createdDate: new Date().toISOString()
    };
    tasks.push(t);
    setJSON('tasks', tasks);
    showTasks();
    taskForm.reset();
    taskErr.textContent = ""; 
  };
}


