var mongoose = require('mongoose');
var router = require('express').Router();
var passport = require('passport');
var User = mongoose.model('Usuarios');
var UsuariosInfo = mongoose.model('UsuariosInfo');
var ProveedoresInfo = mongoose.model('ProveedoresInfo');
var auth = require('./auth');
var crypto = require('crypto');
var ubigeo = require('../datos/peruGeo/distritos.json');
var distritos = ubigeo['3927'];
  
router.get('/todos', function(req, res, next){
  User.find().then(function(users){
    if(!users){ return res.sendStatus(401); }
    return res.render('usuarios/todos.ejs', { 
      usuarios: users,
      usuario: req.user
    }); // load the index.ejs file
  }).catch(next);
});
router.get('/editar/:id', async function(req, res, next){
  var user = await User.findById(req.params.id);
  if(user.privilege==='Usuario'){
    var profile = await UsuariosInfo.findOne({id_usuario: req.params.id});
    return res.render('usuarios/editar.ejs', { 
      usuario: req.user,
      user: user,
      profile: profile,
      distritos: distritos,
    });
  }else if(user.privilege==='Proveedor'){
    var profile = await ProveedoresInfo.findOne({id_usuario: req.params.id});
    return res.render('usuarios/editar.ejs', { 
      usuario: req.user,
      user: user,
      profile: profile,
      distritos: distritos,
    });
  }
});
router.post('/editar/', function(req, res, next) {
  User.findById(req.body._id, function(err, result) {
    var query = { '_id':req.body._id };
    var data= new Object;
    var profile = new Object;
    for(key in req.body){
      if(key!='_id'){
        if(key === 'username' || key === 'email' || key=== 'password') data[key] = req.body[key];
        else profile[key] = req.body[key];
      }
    }
    if(req.body.password){
      var salt = result.salt;
      var hash = crypto.pbkdf2Sync(req.body.password, salt, 10000, 512, 'sha512').toString('hex');
      datos["hash"] = hash;
    }
    User.findByIdAndUpdate( query,data,{new: true}, (err2, todo) => {
        if (err2) return res.status(500).send(err2);
        if(req.body.privilege === 'Usuario'){
          UsuariosInfo.findOneAndUpdate( {'id_usuario': req.body._id},profile,{new: true},(err3, todo) => {
            if(err3) console.log(err)
            console.log(todo)
            return res.redirect('/usuarios/todos/');
          })
        }else if(req.body.privilege === 'Proveedor'){
          ProveedoresInfo.findOneAndUpdate( {'id_proveedor': req.body._id},profile,{new: true},(err3, todo) => {
            if(err3) console.log(err)
            return res.redirect('/usuarios/todos/');
          })
        }
      }
    )
  })
});
router.get('/nuevo', function(req, res) {
	res.render('usuarios/nuevo.ejs',{
    usuario: req.user,
    distritos: distritos,
  }); // load the index.ejs file
});
router.post('/nuevo', function(req, res, next){
  var user = new User();
  var data = req.body
  if(data.username && data.email && data.privilege && data.password){
    user.username = data.username
    user.email = data.email
    user.privilege = data.privilege
    user.password = data.password
    user.setPassword(data.password);
    user.save(function(err, response){
      if(data.privilege === 'Usuario'){
        var profile = new UsuariosInfo();
        if(data.profile){
          for(key in data.profile){
            profile[key] = data.profile[key];
          }
        }
        profile.id_usuario = response._id;
        profile.save(function(err, response){
          if(err)console.log(err)
          return res.json({valid: true})
        })
      }else if(data.privilege === 'Proveedor'){
        var profile = new ProveedoresInfo();
        if(data.profile){
          for(key in data.profile){
            profile[key] = data.profile[key];
          }
        }
        profile.id_proveedor = response._id;
        profile.save(function(err, response){
          if(err)console.log(err)
          return res.json({valid: true})
        })
      }
    });
  }  
});

router.get('/borrar/:id', function(req, res, next){
  User.deleteOne({ _id: req.params.id }, function (err) {
    if(err) console.log(err);
    return res.redirect('/usuarios/todos/');
  });
});



//Configuring app to have sessions 
passport.serializeUser((user, done) => {
  done(null, user._id)
})
passport.deserializeUser((id, done) => {
  User.findById(id, function(err, user) {
    if(err) return res.status(500).send(err);
    if(user) done(err, user);

  })
})
module.exports = router;