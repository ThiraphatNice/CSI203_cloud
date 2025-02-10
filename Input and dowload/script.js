const socket = new WebSocket('ws://localhost:8080');

const sendBtn = document.getElementById('sendBtn');
const messageInput = document.getElementById('message');
const responseDiv = document.getElementById('response');

// แจ้งเตือนเมื่อเชื่อมต่อสำเร็จ
socket.onopen = () => {
    console.log('Connected to server.');
};

// รับข้อความจากเซิร์ฟเวอร์
socket.onmessage = (event) => {
    responseDiv.innerHTML = `Server says: ${event.data}`;
};

// ส่งข้อความไปยังเซิร์ฟเวอร์
sendBtn.addEventListener('click', () => {
    const message = messageInput.value;
    if (message.trim()) {
        socket.send(message);
        messageInput.value = '';
    } else {
        alert('Please enter a message.');
    }
});

// แจ้งเตือนเมื่อการเชื่อมต่อปิดลง
socket.onclose = () => {
    console.log('Disconnected from server.');
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
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

function deleteFile(filename) {
    fetch(`http://localhost:3000/delete/${filename}`, {
        method: "DELETE"
    }).then(response => response.json())
    .then(data => {
        alert(data.message);
        socket.send('getFiles'); // แจ้งเซิร์ฟเวอร์ให้อัปเดตรายการไฟล์
    }).catch(error => console.error("Delete error:", error));
}