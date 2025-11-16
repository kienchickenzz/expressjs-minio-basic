/*
CLient upload trực tiếp file lên server, server expressjs đọc file thông qua middleware multer
và upload file đó lên MinIO server. Tương tự khi download file từ MinIO server về client 
thông qua server expressjs.
*/

import express, { Request, Response } from 'express'
import multer from 'multer'
import cors from 'cors'
import http from 'http'

import { Client } from "minio"

const minioClient = new Client({
    endPoint: 'localhost',
    port: 9000,
    useSSL: false,
    accessKey: 'minio',
    secretKey: 'Pa55w.rd'
});

const app = express()

// Cho phép tất cả domain
app.use(cors());

// Cấu hình middleware multer 
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    }
});

app.post('/api/upload/:bucketName', upload.single('file'), async (req: Request, res: Response) => {

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const file = req.file;
        const objectName = `${file.originalname}`;
        
        const bucketName = req.params.bucketName;

        // Kiểm tra và tạo bucket nếu chưa tồn tại
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            await minioClient.makeBucket(bucketName, 'us-east-1');
        }

        // Upload file lên MinIO
        await minioClient.putObject(
            bucketName,
            objectName,
            file.buffer,
            file.size,
            {
                'Content-Type': file.mimetype,
                'Original-Name': file.originalname
            }
        );

        res.json({
            success: true,
            message: 'Video uploaded successfully',
            filename: objectName,
            size: file.size
        });

    } catch (error) {
        console.error( 'Error:', error );
        return res.status(500).json({ message: 'Upload failed' });
    }
});

app.get('/api/download/:bucketName/:objectName', async (req: Request, res: Response) => {
    try {
        const { bucketName, objectName } = req.params;

        // Kiểm tra bucket có tồn tại không
        const bucketExists = await minioClient.bucketExists(bucketName);
        if (!bucketExists) {
            return res.status(404).json({ error: 'Bucket not found' });
        }

        // Lấy thông tin object
        const stat = await minioClient.statObject(bucketName, objectName);
        
        // Lấy file từ MinIO và stream về client
        const stream = await minioClient.getObject(bucketName, objectName);
        
        // Set headers
        res.setHeader('Content-Type', stat.metaData['content-type'] || 'application/octet-stream');
        res.setHeader('Content-Length', stat.size);
        res.setHeader('Content-Disposition', `inline; filename="${objectName}"`);
        
        // Pipe stream to response
        stream.pipe(res);
        
        stream.on('error', (err) => {
            console.error( 'Error:', err );
            res.status(500).json({ message: 'Get failed' });
        });

    } catch (error) {
        console.error( 'Error:', error );
        res.status(500).json({ message: 'Get failed' });
    }
});

const start = () => {
    const port = 3000
    http.createServer(app).listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`)
    })
}

start() 
