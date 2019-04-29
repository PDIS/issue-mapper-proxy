const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const multer = require('multer')
const Trello = require("node-trello");
const fs = require("fs");
const path = require("path");
const del = require('del');
const Parse = require('parse/node');
const config = require('./config');

const app = express()
const port = 8787
const trello = new Trello(config.appKey, config.token);
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})
const upload = multer({ storage: storage })

app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());
app.use(cors());

Parse.initialize(config.appID, config.javascriptKey, config.masterKey);
Parse.serverURL = config.parseURL

//get

app.get('/getboards', function (req, res) {
  trello.get('/1/members/me/boards', {'filter':'open'}, function(err, data) {
    if (err) throw err;
    res.json(data)
  });
})

app.get('/getboardinfo/:id', function (req, res) {
  trello.get('/1/boards/' + req.params.id, {'fields':'all'}, function(err, data) {
    if (err) throw err;
    res.json(data)
  });
})

app.get('/getlists/:id', function (req, res) {
  trello.get('/1/boards/' + req.params.id + '/lists', {'cards':'open'}, function(err, data) {
    if (err) throw err;
    res.json(data)
  });
})

app.get('/getcards/:id', function (req, res) {
  trello.get('/1/boards/' + req.params.id + '/cards', {'fields':'all'}, function(err, data) {
    if (err) throw err;
    res.json(data)
  });
})

app.get('/getcard/:id', function (req, res) {
  trello.get('/1/cards/' + req.params.id , function(err, data) {
    if (err) throw err;
    res.json(data)
  });
})

app.get('/getattachment/:id', function (req, res) {
  trello.get('/1/cards/' + req.params.id , {fields: 'attachments',attachments: true,}, function(err, data) {
    if (err) throw err;
    res.json(data)
  });
})

app.get('/getinfo/:id', function (req, res) {
  const IssueMapper = Parse.Object.extend("IssueMapper");
  const query = new Parse.Query(IssueMapper);
  query.equalTo("data.id", req.params.id);
  query.descending("createdAt");
  query.first().then( (results) => {
    res.json(results)
  });
})

//post

app.post('/newboard/', function (req, res) {
  trello.post('/1/boards' , {'name': req.body.name, 'idBoardSource':'5c19e75bc6ac7935093c0ae6', 'prefs_permissionLevel':'public'}, function(err, data) {
    trello.put('/1/boards/' + data.id ,{'desc': JSON.stringify(req.body.desc)},function(err, data) {
      if (err) throw err;
      data.admins = []
      data.members = []
      data.admins.push(req.body.user)
      const IssueMapper = Parse.Object.extend("IssueMapper");
      const createBoard = new IssueMapper();
      createBoard.set("action", 'CreateBoard');
      createBoard.set("user", req.body.user);
      createBoard.set("data", data);
      createBoard.save()
      .then( ()=> {
        res.json(data)
      }, (error) => {
        console.log(error.message);
      });
    });
  });
})

app.post('/newcard/', function (req, res) {
  trello.post('/1/cards' , {'name': req.body.name, 'idList': req.body.idList, 'desc': JSON.stringify(req.body.desc)}, function(err, data) {
    if (err) throw err;
    const IssueMapper = Parse.Object.extend("IssueMapper");
    const createCard = new IssueMapper();
    createCard.set("action", 'CreateCard');
    createCard.set("user", req.body.user);
    createCard.set("data", data);
    createCard.save()
    .then( ()=> {
      res.json(data)
    }, (error) => {
      console.log(error.message);
    });
  });
})

app.post('/newattachmenturl/:id/:name/:url/', function (req, res) {
  trello.post('/1/cards/' + req.params.id + '/attachments' , {'name': req.params.name, 'url': req.params.url}, function(err, data) {
    if (err) throw err;
    res.json(data)
  });
})

app.post('/newattachment/:id/:name/', upload.single('file'), function (req, res) {
  let pathToFile = path.resolve(__dirname, "uploads/" + req.file.originalname);
  trello.post("/1/cards/" + req.params.id + "/attachments", { attachment: fs.createReadStream(pathToFile) }, function (err, attachments) {
    if (err) throw err;
    del.sync(['uploads/' + req.file.originalname]);
    res.json(attachments);
  })
})

//put

app.put('/editboard/', function (req, res) {
  trello.put('/1/boards/' + req.body.id , {'name': req.body.name, 'desc': JSON.stringify(req.body.desc)}, function(err, data) {
    if (err) throw err;
    const IssueMapper = Parse.Object.extend("IssueMapper");
    const editBoard = new IssueMapper();
    editBoard.set("action", 'EditBoard');
    editBoard.set("user", req.body.user);
    editBoard.set("data", data);
    editBoard.save()
    .then( ()=> {
      res.json(data)
    }, (error) => {
      console.log(error.message);
    });
  });
})

app.put('/editcard/', function (req, res) {
  trello.put('/1/cards/' + req.body.id , {'idList': req.body.idList, 'name': req.body.name ,'desc': JSON.stringify(req.body.desc)}, function(err, data) {
    if (err) throw err;
    const IssueMapper = Parse.Object.extend("IssueMapper");
    const editCard = new IssueMapper();
    editCard.set("action", 'EditCard');
    editCard.set("user", req.body.user);
    editCard.set("data", data);
    editCard.save()
    .then( ()=> {
      res.json(data)
    }, (error) => {
      console.log(error.message);
    });
  });
})

app.put('/movecard/:id/:idList', function (req, res) {
  trello.put('/1/cards/' + req.params.id , {'idList': req.params.idList}, function(err, data) {
    if (err) throw err;
    const IssueMapper = Parse.Object.extend("IssueMapper");
    const editCard = new IssueMapper();
    editCard.set("action", 'EditCard');
    editCard.set("user", req.body.user);
    editCard.set("data", data);
    editCard.save()
    .then( ()=> {
      res.json(data)
    }, (error) => {
      console.log(error.message);
    });
  });
})

//delete

app.put('/closeboard/:id', function (req, res) {
  trello.put('/1/boards/' + req.params.id , {'closed': true}, function(err, data) { 
    if (err) throw err;
    const IssueMapper = Parse.Object.extend("IssueMapper");
    const editCard = new IssueMapper();
    closeBoard.set("action", 'CloseBoard');
    closeBoard.set("user", req.body.user);
    closeBoard.set("data", data);
    closeBoard.save()
    .then( ()=> {
      res.json(data)
    }, (error) => {
      console.log(error.message);
    });
  });
})

app.put('/closecard/:id', function (req, res) {
  trello.put('/1/cards/' + req.params.id , {'closed': true}, function(err, data) { 
    if (err) throw err;
    const IssueMapper = Parse.Object.extend("IssueMapper");
    const closeCard = new IssueMapper();
    closeCard.set("action", 'CloseCard');
    closeCard.set("user", req.body.user);
    closeCard.set("data", data);
    closeCard.save()
    .then( ()=> {
      res.json(data)
    }, (error) => {
      console.log(error.message);
    });
  });
})

app.delete('/deleteattachment/:id/:attachmentid', function (req, res) {
  trello.delete('/1/cards/' + req.params.id + '/attachments/' + req.params.attachmentid , function(err, data) { 
    if (err) throw err;
    res.json(data)
  });
})

app.listen(port, () => console.log(`Example app listening on port ${port}!`))