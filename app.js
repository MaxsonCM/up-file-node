const bodyParser = require('body-parser')
const express = require("express")
const path = require('path')
const crypto = require('crypto')
const mongoose = require('mongoose')
const multer = require('multer')
const GridFsStorage = require('multer-gridfs-storage')
const Grid = require('gridfs-stream')
const methodOverride = require('method-override')

const app = express()


app.use(bodyParser.json())
app.use(methodOverride('_method'))
app.use('/scripts', express.static(__dirname + '/node_modules/materialize-css/dist/'))

app.set('view engine', 'ejs')

const mongoURI = 'mongodb://localhost/uploads'
const conn = mongoose.createConnection(mongoURI)
let gfs
conn.once('open', function () {
    //inicia o steam
    gfs = Grid(conn.db, mongoose.mongo)
    gfs.collection('uploads')
})

//criar storage engine
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err)
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo)
        });
      });
    }
});
const upload = multer({ storage })

// Rotas
// Carrega o from
app.get('/', (req,res)=>{
    //res.render('index')
    gfs.files.find().toArray((err, files) =>{
        //arquivo existe ?
        if (!files || files.length === 0){
            res.render('index', {files: false})
        }else{
            files.map(file => {
                if(file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'image/jps'){
                    file.isImage = true
                }else{
                    file.isImage = false
                }
            })
            res.render('index', {files: files})
        }
    })
})

// Rota POST  /upload
app.post('/upload', upload.single('file'), (req,res)=>{
    //res.json({file: req.file})
    res.redirect('/')
})

// Rota GET /files - exibe todos os arquivos
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) =>{
        //arquivo existe ?
        if (!files || files.length === 0){
            return res.status(404).json({
                err: 'Não existe arquivos'
            })
        }

        return res.json(files)
    })
})

// Rota GET /file - retorna um arquivo se existir
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) =>{
        if (!file || file.length === 0){
            return res.status(404).json({
                err: 'O arquivo não existe'
            })
        }

        return res.json(file)
    })
})
    

// Rota GET /image
app.get('/view/:filename', (req, res) => {
    gfs.files.findOne({filename: req.params.filename}, (err, file) =>{
        if (!file || file.length === 0){
            return res.status(404).json({
                err: 'O arquivo não existe'
            })
        }
        
        //checar se é uma imagem
        if(file.contentType === 'image/jpeg' || file.contentType === 'image/png' || file.contentType === 'application/pdf' || file.contentType === 'image/jps' ){
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        }else{
            return res.status(404).json({
                err: 'Arquivo sem suporte para visualizar'
            })
        }
    })
})

// Rota DELTE /files/:id
app.delete('/files/:id', (req, res) => {
    gfs.remove({_id: req.params.id, root: 'uploads'}, (err, gridStore) =>{
        if (err){
            return res.status(404).json({ err: err})
        }
        res.redirect('/')
    })
})

const port = 5000

app.listen(port, () => console.log(`Servidor iniciado na porta ${port}`))


