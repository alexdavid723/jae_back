import jwt from "jsonwebtoken";
import prisma from "../prisma.js";

/**
 * Middleware principal de autenticación (Exportación por defecto).
 * 1. Verifica el JWT.
 * 2. Busca al usuario y su rol.
 * 3. Adjunta el objeto 'user' completo a la solicitud (req.user).
 */
export default async function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header) return res.status(401).json({ message: "No autorizado. Token no proporcionado." });

    const token = header.split(" ")[1];
    if (!token) return res.status(401).json({ message: "No autorizado. Formato de token inválido." });

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        
        // Buscamos el usuario y su rol en la base de datos
        const user = await prisma.user.findUnique({ 
            where: { id: payload.userId }, 
            include: { role: true } 
        });
        
        if (!user) return res.status(401).json({ message: "Usuario no existe o credenciales inválidas." });
        
        // Adjuntamos el objeto de usuario a la solicitud
        req.user = user; 
        
        next();
    } catch (err) {
        // Maneja errores de expiración o firma inválida
        return res.status(401).json({ message: "Token inválido o expirado." });
    }
}

/**
 * Middleware de autorización (Exportación con nombre).
 * Verifica si el usuario autenticado tiene el rol requerido.
 * @param {string | string[]} requiredRole - Rol o array de roles requeridos (ej: 'admin', ['superadmin', 'admin']).
 */
export const authorizeRole = (requiredRole) => {
    // 🚨 Esta función se añade como una exportación con nombre ('authorizeRole')
    const rolesArray = Array.isArray(requiredRole) ? requiredRole : [requiredRole];

    return (req, res, next) => {
        // Obtenemos el rol del usuario desde el objeto adjuntado por authMiddleware
        const userRoleName = req.user?.role?.name;
        
        if (!userRoleName) {
            // Esto sucede si authMiddleware falló en buscar el rol (lo cual es improbable si pasó el paso 1)
            return res.status(403).json({ message: "Acceso denegado: Información de rol faltante." });
        }
        
        // Verificar si el rol del usuario está incluido en los roles requeridos
        if (!rolesArray.includes(userRoleName)) {
            const requiredString = rolesArray.join(' o ');
            return res.status(403).json({ 
                message: `Acceso denegado. Se requiere el rol: ${requiredString}.` 
            });
        }
        
        next();
    };
};