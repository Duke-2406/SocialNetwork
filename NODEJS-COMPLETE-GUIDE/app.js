const path = require('path');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');

const feedRoutes = require('./routes/feed');
const authRoutes = require('./routes/auth');

const app = express();
const { v4: uuidv4 } = require('uuid');
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'images');
    },
    filename: (req, file, cb) => {
        cb(null, uuidv4()+ '-' + file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if(file.mimetype === 'image/png' || 
        file.mimetype === 'image/jpg' ||
        file.mimetype === 'image/jpeg'
    ) {
        cb(null, true);
    }
    else {
        cb(null, false);
    }
}

app.use(bodyParser.json());
app.use(multer({storage: fileStorage, fileFilter: fileFilter}).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use(cors());

app.use('/feed', feedRoutes);
app.use('/auth', authRoutes);

app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({message: message, data: data});
})

mongoose
    .connect(
        'mongodb+srv://deepaksihare891:AKyseKDwWczL74BZ@cluster0.e94a1.mongodb.net/messages?retryWrites=true'
    )
    .then(result => {
        const server = app.listen(8080);
        const io = require('./socket').init(server, {
            cors: {
                origin: "http://localhost:3000",
                methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
            }
        });
        io.on('connection', socket => {
            console.log('Client connected')
        });
    })
    .catch(err => console.log(err));
