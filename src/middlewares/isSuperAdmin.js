// src/middlewares/isSuperAdmin.js
export default function isSuperAdmin(req, res, next) {
  if (req.user && req.user.role && req.user.role.name === "administrador") {
    return next();
  }
  return res.status(403).json({ message: "Acceso denegado: solo administradores" });
}
