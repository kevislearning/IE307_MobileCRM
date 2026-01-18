<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>API Test Console</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 24px; background: #f4f6f8; color: #111; }
        .card { background: #fff; border-radius: 12px; padding: 16px; box-shadow: 0 6px 18px rgba(0,0,0,0.07); margin-bottom: 16px; }
        h1 { margin-top: 0; }
        label { display: block; margin-top: 8px; font-weight: 600; }
        input, select, textarea { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid #cfd4da; margin-top: 4px; }
        button { padding: 10px 16px; border: none; border-radius: 8px; background: #2563eb; color: #fff; cursor: pointer; font-weight: 600; margin-top: 12px; }
        button.secondary { background: #6b7280; }
        pre { background: #0f172a; color: #d1d5db; padding: 12px; border-radius: 8px; overflow-x: auto; }
        .row { display: grid; grid-template-columns: repeat(auto-fit,minmax(260px,1fr)); gap: 12px; }
        .pill { display: inline-block; padding: 4px 8px; background: #e2e8f0; border-radius: 999px; font-size: 12px; margin-right: 6px; }
    </style>
</head>
<body>
    <h1>CUCA CRM API Test Console</h1>
    <div class="card">
        <div class="pill">Login</div>
        <div class="row">
            <div>
                <label>Email</label>
                <input id="email" value="admin@crm.test" />
            </div>
            <div>
                <label>Password (>=12 chars)</label>
                <input id="password" type="password" value="password123456" />
            </div>
        </div>
        <button onclick="doLogin()">Login</button>
        <button class="secondary" onclick="doRefresh()">Refresh token</button>
        <button class="secondary" onclick="changePassword()">Change password</button>
        <button class="secondary" onclick="forgotPassword()">Forgot (OTP demo)</button>
        <button class="secondary" onclick="resetPassword()">Reset with OTP</button>
        <div style="margin-top:8px">
            <div><strong>Access:</strong> <span id="access-preview">-</span></div>
            <div><strong>Refresh:</strong> <span id="refresh-preview">-</span></div>
        </div>
    </div>

    <div class="card">
        <div class="pill">Leads</div>
        <button onclick="fetchLeads()">GET /api/leads</button>
        <button class="secondary" onclick="fetchDashboard()">GET /api/dashboard</button>
        <button class="secondary" onclick="fetchBadge()">GET /notifications-badge</button>
        <div class="row">
            <div>
                <label>Lead full_name</label>
                <input id="lead_name" value="Lead demo" />
                <label>Status</label>
                <select id="lead_status">
                    <option value="LEAD">LEAD</option>
                    <option value="CONTACTING">CONTACTING</option>
                    <option value="INTERESTED">INTERESTED</option>
                    <option value="NO_NEED">NO_NEED</option>
                    <option value="PURCHASED">PURCHASED</option>
                </select>
                <button onclick="createLead()">POST /api/leads</button>
            </div>
            <div>
                <label>Lead ID (for update/delete)</label>
                <input id="lead_id" />
                <label>New status</label>
                <select id="lead_status_update">
                    <option value="">(no change)</option>
                    <option value="LEAD">LEAD</option>
                    <option value="CONTACTING">CONTACTING</option>
                    <option value="INTERESTED">INTERESTED</option>
                    <option value="NO_NEED">NO_NEED</option>
                    <option value="PURCHASED">PURCHASED</option>
                </select>
                <button onclick="updateLead()">PUT /api/leads/:id</button>
                <button class="secondary" onclick="deleteLead()">DELETE /api/leads/:id</button>
                <label>Assign to user id</label>
                <input id="assign_user_id" />
                <button onclick="assignLead()">POST /api/leads/:id/assign</button>
                <button class="secondary" onclick="fetchAssignments()">GET /api/leads/:id/assignments</button>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="pill">Tasks</div>
        <button onclick="fetchTasks()">GET /api/tasks</button>
        <div class="row">
            <div>
                <label>Title</label>
                <input id="task_title" value="Call customer" />
                <label>Due date (YYYY-MM-DD)</label>
                <input id="task_due" value="2025-12-31" />
                <button onclick="createTask()">POST /api/tasks</button>
            </div>
            <div>
                <label>Task ID (update/delete)</label>
                <input id="task_id" />
                <label>Status</label>
                <select id="task_status">
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="DONE">DONE</option>
                    <option value="OVERDUE">OVERDUE</option>
                </select>
                <button onclick="updateTask()">PUT /api/tasks/:id</button>
                <button class="secondary" onclick="deleteTask()">DELETE /api/tasks/:id</button>
            </div>
        </div>
    </div>

    <div class="card">
        <div class="pill">Raw Request</div>
        <label>Method</label>
        <select id="raw_method">
            <option>GET</option><option>POST</option><option>PUT</option><option>DELETE</option>
        </select>
        <label>URL (relative to current host)</label>
        <input id="raw_url" value="/api/leads" />
        <label>Body (JSON)</label>
        <textarea id="raw_body" rows="4">{}</textarea>
        <button onclick="sendRaw()">Send</button>
    </div>

    <div class="card">
        <div class="pill">Response</div>
        <pre id="output">Ready</pre>
    </div>

<script>
let accessToken = '';
let refreshToken = '';
let cachedOtp = '';

function log(data) {
    const pretty = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    document.getElementById('output').textContent = pretty;
}

async function doLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({email, password})
    });
    const json = await res.json();
    accessToken = json.access_token;
    refreshToken = json.refresh_token;
    document.getElementById('access-preview').textContent = accessToken?.slice(0,16) + '...';
    document.getElementById('refresh-preview').textContent = refreshToken?.slice(0,16) + '...';
    log(json);
}

async function doRefresh() {
    if (!refreshToken) return log('No refresh token');
    const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({refresh_token: refreshToken})
    });
    const json = await res.json();
    accessToken = json.access_token;
    refreshToken = json.refresh_token;
    document.getElementById('access-preview').textContent = accessToken?.slice(0,16) + '...';
    document.getElementById('refresh-preview').textContent = refreshToken?.slice(0,16) + '...';
    log(json);
}

async function changePassword() {
    const current_password = prompt("Nhap current password (>=12 chars)");
    const new_password = prompt("Nhap new password (>=12 chars, khac password cu)");
    if (!current_password || !new_password) return;
    const res = await fetch('/api/password/change', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ current_password, new_password })
    });
    const data = await res.json();
    log({ status: res.status, data });
}

async function forgotPassword() {
    const email = prompt('Nhap email reset', document.getElementById('email').value);
    if (!email) return;
    const res = await fetch('/api/forgot', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email })
    });
    const data = await res.json();
    cachedOtp = data.otp_demo || '';
    log({ status: res.status, data, hint_otp: cachedOtp });
}

async function resetPassword() {
    const email = prompt('Email', document.getElementById('email').value);
    const otp = prompt('OTP 6 digits (demo trả về ở forgot)', cachedOtp);
    const password = prompt('New password (>=12 chars)');
    if (!email || !otp || !password) return;
    const res = await fetch('/api/reset', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ email, otp, password })
    });
    const data = await res.json();
    log({ status: res.status, data });
}

function authHeaders() {
    if (!accessToken) throw new Error('Login first');
    return { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
}

async function fetchLeads() {
    const res = await fetch('/api/leads', { headers: authHeaders() });
    log(await res.json());
}

async function fetchDashboard() {
    const res = await fetch('/api/dashboard', { headers: authHeaders() });
    log(await res.json());
}

async function fetchBadge() {
    const res = await fetch('/api/notifications-badge', { headers: authHeaders() });
    log(await res.json());
}

async function createLead() {
    const full_name = document.getElementById('lead_name').value;
    const status = document.getElementById('lead_status').value;
    const res = await fetch('/api/leads', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ full_name, status })
    });
    log(await res.json());
}

async function updateLead() {
    const id = document.getElementById('lead_id').value;
    if (!id) return log('Lead ID required');
    const status = document.getElementById('lead_status_update').value;
    const body = status ? { status } : {};
    const res = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(body)
    });
    log(await res.json());
}

async function deleteLead() {
    const id = document.getElementById('lead_id').value;
    if (!id) return log('Lead ID required');
    const res = await fetch(`/api/leads/${id}`, { method: 'DELETE', headers: authHeaders() });
    log({ status: res.status });
}

async function assignLead() {
    const id = document.getElementById('lead_id').value;
    const target = document.getElementById('assign_user_id').value;
    if (!id || !target) return log('Lead ID and assign user id required');
    const res = await fetch(`/api/leads/${id}/assign`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ assigned_to: Number(target) })
    });
    log(await res.json());
}

async function fetchAssignments() {
    const id = document.getElementById('lead_id').value;
    if (!id) return log('Lead ID required');
    const res = await fetch(`/api/leads/${id}/assignments`, { headers: authHeaders() });
    log(await res.json());
}

async function fetchTasks() {
    const res = await fetch('/api/tasks', { headers: authHeaders() });
    log(await res.json());
}

async function createTask() {
    const title = document.getElementById('task_title').value;
    const due_date = document.getElementById('task_due').value;
    const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ title, due_date })
    });
    log(await res.json());
}

async function updateTask() {
    const id = document.getElementById('task_id').value;
    if (!id) return log('Task ID required');
    const status = document.getElementById('task_status').value;
    const res = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status })
    });
    log(await res.json());
}

async function deleteTask() {
    const id = document.getElementById('task_id').value;
    if (!id) return log('Task ID required');
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE', headers: authHeaders() });
    log({ status: res.status });
}

async function sendRaw() {
    const method = document.getElementById('raw_method').value;
    const url = document.getElementById('raw_url').value;
    const bodyText = document.getElementById('raw_body').value || '{}';
    let options = { method, headers: { 'Content-Type': 'application/json' } };
    if (accessToken) options.headers.Authorization = `Bearer ${accessToken}`;
    if (['POST','PUT','PATCH'].includes(method.toUpperCase())) {
        options.body = bodyText;
    }
    const res = await fetch(url, options);
    let json;
    try { json = await res.json(); } catch(e) { json = await res.text(); }
    log({ status: res.status, data: json });
}
</script>
</body>
</html>


