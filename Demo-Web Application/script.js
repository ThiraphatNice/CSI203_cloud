let ws;
let loggedIn = false;

// ตรวจสอบ token ใน Local Storage เมื่อโหลดหน้าเว็บ
window.onload = () => {
    const token = localStorage.getItem('token');

    // ถ้าไม่มี token และอยู่ที่หน้า filesection.html ให้ redirect ไปหน้า login
    if (!token && window.location.pathname.includes('filesection.html')) {
        window.location.href = 'index.html';
        return;
    }

    // ถ้ามี token และอยู่ที่หน้า index.html ให้ redirect ไปหน้า filesection.html
    if (token && window.location.pathname.includes('index.html')) {
        window.location.href = 'filesection.html';
        return;
    }

    // ถ้าเป็นหน้า filesection.html และมี token ให้เชื่อมต่อ WebSocket และโหลดไฟล์
    if (token && window.location.pathname.includes('filesection.html')) {
        connectWebSocket();
        fetchFiles();
    }
};

// Helper function to send HTTP requests
async function sendRequest(url, method, body = null) {
    const options = { method };
    if (body) {
        if (body instanceof FormData) {
            options.body = body;
        } else {
            options.headers = { 'Content-Type': 'application/json' };
            options.body = JSON.stringify(body);
        }
    }
    // เพิ่ม token ใน header
    const token = localStorage.getItem('token');
    if (token) {
        options.headers = options.headers || {};
        options.headers['Authorization'] = token;
    }
    const response = await fetch(url, options);
    return response.json();
}

// Login function
async function login(event) {
    event.preventDefault(); // ป้องกันการรีโหลดหน้าเว็บ

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert("Please enter both username and password");
        return;
    }

    const data = await sendRequest('http://localhost:3000/login', 'POST', { username, password });
    if (data.success) {
        loggedIn = true;
        localStorage.setItem('token', data.token); // เก็บ token ใน Local Storage
        window.location.href = 'filesection.html'; // Redirect ไปยัง filesection.html เมื่อล็อกอินสำเร็จ
    } else {
        alert(data.message);
    }
}

// Logout function
async function logout() {
    const token = localStorage.getItem('token');
    if (token) {
        await sendRequest('http://localhost:3000/logout', 'POST', { token });
        localStorage.removeItem('token'); // ลบ token ออกจาก Local Storage
        loggedIn = false;
        window.location.href = 'index.html'; // Redirect กลับไปยังหน้า login
    }
}

// WebSocket connection
function connectWebSocket() {
    ws = new WebSocket('ws://localhost:3000');
    ws.onopen = () => {
        console.log('Connected to WebSocket server');
    };
    ws.onmessage = (message) => {
        console.log('Message from server:', message.data);
    };
}

// File preview function
function previewFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    const fileNamePreview = document.getElementById('fileNamePreview');
    const filePreview = document.getElementById('filePreview');

    fileNamePreview.textContent = '';
    filePreview.style.display = 'none';

    if (file) {
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                filePreview.style.display = 'inline';
                filePreview.src = e.target.result;
            };
            reader.readAsDataURL(file);
        } else {
            fileNamePreview.textContent = `File selected: ${file.name}`;
        }
    }
}

// Upload file function
async function uploadFile() {
    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];

    if (!file) {
        alert("Choose a file before uploading");
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    const data = await sendRequest('http://localhost:3000/upload', 'POST', formData);
    alert(data.message);
    fileInput.value = '';
    fetchFiles();
}

// Fetch and display files
async function fetchFiles() {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';

    const files = await sendRequest('http://localhost:3000/files', 'GET');
    if (files.length === 0) {
        const noFileMessage = document.createElement('li');
        noFileMessage.textContent = '';
        noFileMessage.style.textAlign = 'center';
        fileList.appendChild(noFileMessage);
    } else {
        files.forEach(file => {
            const li = document.createElement('li');
            li.innerHTML = `
                <p>${file}</p>
                <div id="buttonContainer">
                    <button class="download" onclick="downloadFile('${file}')">Download</button>
                    <button class="delete" onclick="deleteFile('${file}')">Delete</button>
                    <br>
                    <hr>
                </div>
            `;
            fileList.appendChild(li);
        });
    }
}

// Download file function
async function downloadFile(filename) {
    try {
        const response = await fetch(`http://localhost:3000/files/${filename}`, {
            method: 'GET',
            headers: {
                'Authorization': localStorage.getItem('token') || ''
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        // อ่าน Blob จาก response
        const blob = await response.blob();
        const contentType = response.headers.get("Content-Type") || "";
        const contentDisposition = response.headers.get("Content-Disposition") || "";

        // ตรวจสอบว่าเซิร์ฟเวอร์ส่งชื่อไฟล์กลับมาหรือไม่
        let downloadFilename = filename;
        const match = contentDisposition.match(/filename="?(.+?)"?$/);
        if (match && match[1]) {
            downloadFilename = match[1];
        }

        // สร้าง URL สำหรับไฟล์
        const link = document.createElement('a');
        const objectURL = URL.createObjectURL(blob);
        link.href = objectURL;
        link.download = downloadFilename; // ใช้ชื่อไฟล์ที่ได้จากเซิร์ฟเวอร์
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // ล้าง URL blob ที่สร้างขึ้นเพื่อป้องกัน memory leak
        URL.revokeObjectURL(objectURL);

    } catch (error) {
        console.error("Download error:", error);
        alert("Failed to download file.");
    }
}


// Delete file function
async function deleteFile(filename) {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;

    const data = await sendRequest(`http://localhost:3000/files/${filename}`, 'DELETE');
    if (data.success) {
        fetchFiles();
    } else {
        alert(data.message || "Failed to delete the file");
    }
}