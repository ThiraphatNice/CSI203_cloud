const express = require('express');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const cors = require('cors');
const fs = require('fs').promises;
const crypto = require('crypto'); // สำหรับสร้าง token

const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));
app.use(cors());

// Utility Functions
function getShortDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}`;
}

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        const timestamp = getShortDate();
        const originalName = file.originalname;
        const fileExtension = path.extname(originalName);
        const baseName = path.basename(originalName, fileExtension);
        const newFileName = `${timestamp}-${baseName}${fileExtension}`;
        cb(null, newFileName);
    }
});
const upload = multer({ storage });

// WebSocket Server
const wss = new WebSocket.Server({ noServer: true });
wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        console.log('Received message: Welcome to Demo Web Application!');
    });
    ws.send('Welcome to the WebSocket Server!');
});

// เก็บข้อมูลผู้ใช้และ token
const users = [{ username: 'admin', password: 'password' }];
const activeTokens = new Set();

// สร้าง token แบบสุ่ม
function generateToken() {
    return crypto.randomBytes(16).toString('hex');
}

// Middleware สำหรับตรวจสอบ token
function authenticateToken(req, res, next) {
    const token = req.headers['authorization'];
    if (!token || !activeTokens.has(token)) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    next();
}

// Login endpoint
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);

    if (!user || user.password !== password) {
        return res.json({ success: false, message: 'Invalid username or password' });
    }

    // สร้าง token และเก็บไว้ในเซิร์ฟเวอร์
    const token = generateToken();
    activeTokens.add(token);

    res.json({ success: true, message: 'Login successful', token });
});

// Logout endpoint
app.post('/logout', (req, res) => {
    const { token } = req.body;
    activeTokens.delete(token); // ลบ token ออกจากเซิร์ฟเวอร์
    res.json({ success: true, message: 'Logout successful' });
});

// ใช้ middleware สำหรับเส้นทางที่ต้องตรวจสอบ token
app.use('/upload', authenticateToken);
app.use('/files', authenticateToken);

// Routes
app.post('/upload', upload.single('file'), (req, res) => {
    console.log('File uploaded:', req.file);
    res.json({ message: 'File uploaded successfully', file: req.file });
});

app.get('/files', async (req, res) => {
    try {
        const files = await fs.readdir('./uploads');
        res.json(files);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to read files' });
    }
});

app.get('/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);

    // ตรวจสอบว่าไฟล์มีอยู่จริง...
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ success: false, message: 'File not found' });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/octet-stream'); // กำหนด MIME type ให้ถูกต้อง
    res.download(filePath);
});


app.delete('/files/:filename', async (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, 'uploads', filename);
    try {
        await fs.unlink(filePath);
        res.json({ success: true, message: `${filename} deleted successfully` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to delete file' });
    }
});

// Start HTTP Server
const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});

// Upgrade HTTP Server to WebSocket Server
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});