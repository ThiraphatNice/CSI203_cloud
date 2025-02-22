const socket = new WebSocket('ws://localhost:8080');

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
    const response = await fetch(url, options);
    return response.json();
}

// ฟังก์ชันล็อกอิน
async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (!username || !password) {
        alert("Please enter both username and password");
        return;
    }

    const data = await sendRequest('http://localhost:3000/login', 'POST', { username, password });
    if (data.success) {
        document.getElementById('fileSection').style.display = 'block';
        socket.send('getFiles'); // เมื่อล็อกอินสำเร็จให้ขอรายการไฟล์
    } else {
        alert(data.message);
    }
}

// ฟังก์ชันอัปโหลดไฟล์
function uploadFile() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) return alert("Please select a file");

    const formData = new FormData();
    formData.append("file", file);

    fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData
    }).then(response => response.json())
    .then(data => {
        alert(data.message);
        socket.send('getFiles'); // แจ้งเซิร์ฟเวอร์ให้รีเฟรชรายการไฟล์
    }).catch(error => console.error("Upload error:", error));
}

// ฟังก์ชันลบไฟล์
function deleteFile(filename) {
    fetch(`http://localhost:3000/delete/${filename}`, {
        method: "DELETE"
    }).then(response => response.json())
    .then(data => {
        alert(data.message);
        socket.send('getFiles'); // แจ้งเซิร์ฟเวอร์ให้อัปเดตรายการไฟล์
    }).catch(error => console.error("Delete error:", error));
}

// การเชื่อมต่อ WebSocket
socket.onopen = () => {
    socket.send('getFiles');
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = "";
    data.files.forEach(file => {
        const li = document.createElement("li");
        li.innerHTML = `
            <a href="http://localhost:3000/${file}" download>${file}</a>
            <button onclick="deleteFile('${file}')">Delete</button>
        `;
        fileList.appendChild(li);
    });
};
