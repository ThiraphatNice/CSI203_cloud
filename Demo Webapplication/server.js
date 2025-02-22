const express = require('express');
const multer = require('multer');
const cors = require('cors');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.static('uploads'));

// ตั้งค่า multer สำหรับอัปโหลดไฟล์
const storage = multer.diskStorage({
    destination: './uploads/',
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

// ตั้งค่า WebSocket Server
const wss = new WebSocket.Server({ port: 8080 });

function sendFileList() {
    fs.readdir('./uploads/', (err, files) => {
        if (err) return;
        const data = JSON.stringify({ files });
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }
        });
    });
}

// เมื่อไคลเอ็นต์เชื่อมต่อ WebSocket
wss.on('connection', (ws) => {
    console.log('Client connected');
    sendFileList();

    ws.on('message', (message) => {
        if (message === 'getFiles') {
            sendFileList();
        }
    });
});

// API สำหรับอัปโหลดไฟล์
app.post('/upload', upload.single('file'), (req, res) => {
    res.json({ message: 'File uploaded successfully!', filename: req.file.originalname });
    sendFileList();
});

// API สำหรับลบไฟล์
app.delete('/delete/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    fs.unlink(filePath, (err) => {
        if (err) return res.status(500).json({ error: 'File not found or cannot be deleted' });
        res.json({ message: 'File deleted successfully!' });
        sendFileList(); // แจ้งไคลเอ็นต์ให้อัปเดตรายการไฟล์
    });
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
