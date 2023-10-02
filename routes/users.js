const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const JWT = require("jsonwebtoken");
const moment = require("moment");
const User = require("../models/user_model");
const config = require("../config/database");

router.post("/register", (req, res, next) => {
  User.addUser(req.body, (err, user) => {
    if (err) {
      res.json({ success: false, msg: "Error al registrar el usuario" });
    } else {
      const msg = {
        to: req.body.email,
        from: "notificaciones@EJEMPLO.com",
        subject: "Bienvenido a EJEMPLO!",
        html: "Bienvenido a EJEMPLO",
      };
      //   sendEmail.then(function () {}).catch(function () {});
      res.json({ success: true, msg: "Usuario registrado: ", user: user });
    }
  });
});

router.post("/forgot", (req, res, next) => {
  const email = req.body.email;
  User.getUserByEmail(email, (err, user) => {
    if (err) throw err;
    if (!user) {
      return res.json({ success: false, msg: "Usuario no encontrado" });
    }
    const token = randomstring.generate(10);
    const expiry = moment().add(1, "days");

    User.findOneAndUpdate(
      { email: email },
      { forgotToken: token, forgotTokenExpiry: expiry },
      { upsert: true },
      function (err, doc) {
        if (err) throw err;
        const msg = {
          to: req.body.email,
          from: "notificaciones@ejemplo.com",
          subject: "Reestablecer contraseña",
          html:
            '<a href="http://localhost:4200/#/reset/' +
            email +
            "/" +
            token +
            '" target="_blank" style="display: inline-block; padding: 16px 36px; font-family: \'Source Sans Pro\', Helvetica, Arial, sans-serif; font-size: 16px; color: #ffffff; text-decoration: none; border-radius: 6px;">Resetear Contraseña</a> ',
        };
        // seßndEmail.then(function () {}).catch(function () {});
        return res.json({ success: true, msg: "Token created successfully" });
      }
    );
  });
});

router.post("/reset", (req, res, next) => {
  const email = req.body.email;
  const pass = req.body.password;
  User.getUserByEmail(email, (err, user) => {
    if (err) throw err;
    if (!user) {
      return res.json({ success: false, msg: "User not found" });
    }

    bcrypt.genSalt(10, (err, salt) => {
      if (err) throw err;
      bcrypt.hash(pass, salt, (err, hash) => {
        if (err) throw err;
        User.findOneAndUpdate(
          { email: email },
          { password: hash },
          { upsert: true },
          function (err, doc) {
            if (err) throw err;
            const msg = {
              to: req.body.email,
              from: "notificaciones@ejemplo.com",
              subject: "Se ha reestablecido la contraseña",
              html: "Se ha reestablecido la contraseña",
            };
            // sendEmail.then(function () {}).catch(function () {});
            return res.json({
              success: true,
              msg: "Password updated successfully",
            });
          }
        );
      });
    });
  });
});

router.post("/authenticate", (req, res, next) => {
  const { email, password } = req.body.email;
  User.getUserByEmail(email, (err, user) => {
    if (err) throw err;
    if (!user) {
      return res.json({ success: false, msg: "Usuario no encontrado" });
    }

    User.comparePassword(password, user.password, (err, isMatch) => {
      if (err) throw err;
      if (isMatch) {
        const token = JWT.sign({ user }, config.secret, {
          expiresIn: 604800, // 1 week
        });

        res.json({
          success: true,
          token: "JWT " + token,
          user: {
            id: user._id,
            email: user.email,
            nombres: user.nombres,
            apellidos: user.apellidos,
            // telefono: user.telefono,
          },
        });
      } else {
        return res.json({ success: false, msg: "Contraseña incorrecta" });
      }
    });
  });
});

module.exports = router;
