const path = require('path');
const fs = require('fs');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const { createHandler } = require('graphql-http/lib/use/express');
const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolver');
const expressPlayground = require('graphql-playground-middleware-express').default;
const auth = require('./middleware/auth');
const { clearImage } = require('./util/file');


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

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 
        'OPTIONS, GET, POST, PUT, PATCH, DELETE'
    );
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if(req.method === 'OPTIONS'){
        return res.sendStatus(200);
    }
    next();
});

app.use(auth);
app.put('/post-image', (req, res, next) => {
    if(!req.isAuth) {
        throw new Error('Not Authenticated!');
    }
    console.log(req.file)
    if(!req.file) {
        return res.status(200).json({message: 'No file provided!'});
    }
    if(req.body.oldPath) {
        clearImage(req.body.oldPath);
    }
    return res.status(201).json({success: true, message: 'File stored.', filePath: req.file.path.replace('\\', '/')});
})

app.all('/graphql', (req, res) =>  
    createHandler({
        schema: graphqlSchema,
        rootValue: graphqlResolver,
        formatError(err) {
            if(!err.originalError) {
                return err;
            }
            const data = err.originalError.data;
            const message = err.message || 'An error occured.';
            const code = err.originalError.code || 500;
            return {message: message, status: code, data: data}
        },
        context: {req, res},
    })(req, res)
);

app.get("/playground", expressPlayground({endpoint: "/graphql"}) );

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
        app.listen(8080);
    })
    .catch(err => console.log(err));
