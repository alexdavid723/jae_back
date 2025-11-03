import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../prisma.js";
import { sendPasswordResetEmail } from "../utils/mailer.js";

const TOKEN_TTL_MINUTES = 15;

// ==========================================================
// UTILITY: Obtener Institution ID del usuario logueado
// ==========================================================
const getAdminInstitutionId = async (req) => {
    const userId = req.user?.id; 
    
    if (!userId) return null;

    const adminAssignment = await prisma.institutionAdmin.findFirst({
        where: { user_id: userId },
        select: { institution_id: true }
    });

    return adminAssignment?.institution_id || null;
};

// ==========================================================
// 🎯 REGISTRAR USUARIO (CREATE)
// ==========================================================
export const register = async (req, res) => {
    try {
        // 💡 CORRECCIÓN: Extraemos 'specialization' del body
        const { first_name, last_name, email, password, roleName, specialization } = req.body;
        
        const requestingUserRole = req.user?.role?.name; 
        
        // 2. APLICAR RESTRICCIÓN DE CREACIÓN DE ROLES
        if (requestingUserRole === 'admin') {
            const allowedRoles = ['docente', 'estudiante'];
            if (!allowedRoles.includes(roleName)) {
                return res.status(403).json({ 
                    message: "Acceso denegado. Un administrador sólo puede crear Docentes o Estudiantes." 
                });
            }
        }
        
        // 3. OBTENER LA INSTITUCIÓN A ASIGNAR (Herencia de IE)
        let finalInstitutionId = req.body.institutionId; 

        if (requestingUserRole === 'admin') {
            finalInstitutionId = await getAdminInstitutionId(req);
            if (!finalInstitutionId) {
                return res.status(403).json({ message: "Error de seguridad: El Admin no tiene una institución asignada." });
            }
        }
        
        // 4. Validación de campos esenciales
        if (!email || !password || !first_name || !last_name || !roleName) {
            return res.status(400).json({ message: "Faltan campos requeridos (nombre, email, contraseña, rol)." });
        }

        // 5. Verificar duplicado
        const exists = await prisma.user.findUnique({ where: { email } });
        if (exists) return res.status(400).json({ message: "Email ya registrado" });

        // 6. Buscar el rol
        const role = await prisma.role.findUnique({ where: { name: roleName } });
        if (!role) return res.status(400).json({ message: `Rol '${roleName}' no encontrado` });

        // 7. Verificar institución para roles institucionales
        const requiresInstitution = ['admin', 'docente', 'estudiante'].includes(roleName);
        
        if (requiresInstitution) {
            if (!finalInstitutionId) {
                return res.status(400).json({ message: `El rol '${roleName}' requiere un institutionId.` });
            }
            
            const institution = await prisma.institution.findUnique({ where: { id: Number(finalInstitutionId) } });
            if (!institution) {
                return res.status(400).json({ message: "Institución no encontrada." });
            }
        }

        // 8. Hashear contraseña y Crear usuario principal
        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                first_name,
                last_name,
                email,
                password: hashed,
                status: true,
                role_id: role.id,
            },
        });

        // 9. Crear registros automáticos según el rol
        if (roleName === "admin" && finalInstitutionId) {
            await prisma.institutionAdmin.create({
                data: {
                    user_id: user.id,
                    institution_id: Number(finalInstitutionId),
                },
            });
        } 
        
        if (roleName === "docente" && finalInstitutionId) {
            // 💡 CORRECCIÓN: Pasamos 'specialization' al crear el Docente
            await prisma.teacher.create({
                data: { 
                    user_id: user.id, 
                    institution_id: Number(finalInstitutionId),
                    specialization: specialization || null // Usamos el valor del body
                },
            });
        }
        
        if (roleName === "estudiante" && finalInstitutionId) {
            await prisma.student.create({
                data: { user_id: user.id, institution_id: Number(finalInstitutionId) },
            });
        }

        return res.status(201).json({
            message: "Usuario creado correctamente",
            user: {
                id: user.id,
                email: user.email,
                first_name: user.first_name,
                last_name: user.last_name,
                role: role.name,
                institutionId: finalInstitutionId,
                created_at: user.created_at,
            },
        });
    } catch (error) {
        console.error("register error:", error);
        return res.status(500).json({ message: "Error al registrar usuario", error: error.message });
    }
};

// ==========================================================
// 🎯 LOGIN
// ==========================================================
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ message: "Faltan credenciales" });

        const user = await prisma.user.findUnique({ 
            where: { email }, 
            include: { 
                role: true,
                institutionAdmins: {
                    select: {
                        institution: {
                            select: {
                                id: true,
                                name: true,
                                code: true,
                                address: true,
                                email: true,
                                phone: true,
                            }
                        }
                    }
                } 
            } 
        });

        if (!user || !user.status) return res.status(401).json({ message: "Usuario inactivo o inválido" });

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) return res.status(401).json({ message: "Usuario o contraseña inválidos" });

        let assignedInstitution = null;
        if (user.role?.name === 'admin' && user.institutionAdmins.length > 0) {
            assignedInstitution = user.institutionAdmins[0].institution;
        }

        const token = jwt.sign({ userId: user.id, role: user.role?.name }, process.env.JWT_SECRET, { expiresIn: "8h" });
        
        return res.json({
            message: "Login exitoso",
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                role: user.role?.name, 
                first_name: user.first_name, 
                last_name: user.last_name,
                assignedInstitution: assignedInstitution 
            },
        });
    } catch (error) {
        console.error("login error:", error);
        return res.status(500).json({ message: "Error en login" });
    }
};

// ==========================================================
// 🎯 OLVIDÓ SU CONTRASEÑA
// ==========================================================
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ message: "Email requerido" });

        const user = await prisma.user.findUnique({ where: { email } });
        const genericMessage =
            "Si existe una cuenta con ese correo, recibirás un email con instrucciones.";

        if (!user) return res.json({ message: genericMessage });

        await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const expiresAt = new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000);

        await prisma.passwordResetToken.create({
            data: { userId: user.id, tokenHash, expiresAt },
        });

        const resetLink = `${process.env.FRONTEND_URL}?token=${token}&email=${encodeURIComponent(
            user.email
        )}`;
        const { previewUrl } = await sendPasswordResetEmail(user.email, resetLink);

        const response = { message: genericMessage };
        if (previewUrl) response.previewUrl = previewUrl;

        return res.json(response);
    } catch (error) {
        console.error("forgotPassword error:", error);
        return res.status(500).json({ message: "Error al procesar la solicitud" });
    }
};

// ==========================================================
// 🎯 RESETEAR CONTRASEÑA
// ==========================================================
export const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword)
            return res
                .status(400)
                .json({ message: "Token y nueva contraseña son requeridos" });

        if (newPassword.length < 6)
            return res
                .status(400)
                .json({ message: "Contraseña muy corta (min 6 caracteres)" });

        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const record = await prisma.passwordResetToken.findUnique({
            where: { tokenHash },
        });

        if (!record)
            return res.status(400).json({ message: "Token inválido o ya usado" });

        if (record.expiresAt < new Date()) {
            await prisma.passwordResetToken.deleteMany({
                where: { userId: record.userId },
            });
            return res.status(400).json({ message: "Token expirado" });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await prisma.user.update({
            where: { id: record.userId },
            data: { password: hashed },
        });
        await prisma.passwordResetToken.deleteMany({
            where: { userId: record.userId },
        });

        return res.json({ message: "Contraseña actualizada correctamente" });
    } catch (error) {
        console.error("resetPassword error:", error);
        return res.status(500).json({ message: "Error al restablecer contraseña" });
    }
};

// ==========================================================
// 🎯 OBTENER TODOS LOS USUARIOS (PARA SUPERADMIN)
// ==========================================================
export const getAllUsers = async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                role: { select: { name: true } },
            },
            orderBy: { id: "asc" },
        });

        const data = users.map(u => ({
            id: u.id,
            nombre: `${u.first_name} ${u.last_name}`,
            correo: u.email,
            rol: u.role?.name || "Sin rol",
            creado_en: u.created_at,
        }));

        return res.json(data);
    } catch (error) {
        console.error("getAllUsers error:", error);
        return res.status(500).json({ message: "Error al obtener usuarios" });
    }
};


// ==========================================================
// 🎯 ACTUALIZAR USUARIO (UPDATE) - CORREGIDO
// ==========================================================
export const updateUser = async (req, res) => {
    const userIdToUpdate = Number(req.params.id); 
    const { first_name, last_name, email, specialization, status, password } = req.body;

    try {
        const requestingUserRole = req.user?.role?.name;
        
        // 1. Verificar si el usuario a editar existe
        const userToUpdate = await prisma.user.findUnique({
            where: { id: userIdToUpdate }, 
            include: { 
                role: true, 
                Teacher: { select: { id: true, institution_id: true, user_id: true } }, 
                Student: { select: { id: true, institution_id: true, user_id: true } }
            }, 
        });

        if (!userToUpdate) return res.status(404).json({ message: "Usuario a actualizar no encontrado." });
        
        const targetRole = userToUpdate.role?.name;

        // 2. RESTRICCIONES DE SEGURIDAD PARA EL ADMIN SOLICITANTE
        if (requestingUserRole === 'admin') {
            const adminInstitutionId = await getAdminInstitutionId(req);
            
            if (!adminInstitutionId) {
                return res.status(403).json({ message: "El Director no tiene una IE asignada para realizar ediciones." });
            }

            if (targetRole === 'superadmin' || targetRole === 'admin') {
                return res.status(403).json({ message: "Acceso denegado: El Director no puede editar otros Administradores o Superadministradores." });
            }

            const isDocente = targetRole === 'docente' && userToUpdate.Teacher?.institution_id === adminInstitutionId;
            const isEstudiante = targetRole === 'estudiante' && userToUpdate.Student?.institution_id === adminInstitutionId;

            if (!isDocente && !isEstudiante) {
                return res.status(403).json({ message: "Acceso denegado: El usuario no pertenece a su institución." });
            }
        }
        
        // 3. ACTUALIZACIÓN DE DATOS BASE (Tabla User)
        const updateData = {
            first_name,
            last_name,
            status: status !== undefined ? status : userToUpdate.status,
            password: password ? await bcrypt.hash(password, 10) : undefined, 
            email: requestingUserRole === 'superadmin' && email ? email : userToUpdate.email,
        };
        
        const updatedUser = await prisma.user.update({
            where: { id: userIdToUpdate }, 
            data: updateData,
            include: { role: true },
        });

        // 4. 💡 CORRECCIÓN: ACTUALIZACIÓN DE DATOS ESPECÍFICOS (Tabla Teacher)
        if (targetRole === 'docente' && userToUpdate.Teacher) {
             // Verificamos si 'specialization' se envió en el body
             if (specialization !== undefined) {
                 await prisma.teacher.update({
                    where: { user_id: userIdToUpdate },
                    data: { specialization: specialization }, // Actualizar especialización
                });
             }
        }

        return res.json({
            message: `Usuario (${targetRole}) actualizado correctamente.`,
            user: {
                id: updatedUser.id,
                nombre: `${updatedUser.first_name} ${updatedUser.last_name}`,
                correo: updatedUser.email,
                rol: updatedUser.role?.name || "Sin rol",
            },
        });
    } catch (error) {
        console.error("updateUser error:", error);
        if (error.code === 'P2002') {
             return res.status(400).json({ message: "El email proporcionado ya está registrado por otro usuario." });
        }
        return res
            .status(500)
            .json({ message: "Error al actualizar el usuario", error: error.message });
    }
};

// ==========================================================
// 🎯 ELIMINAR USUARIO
// ==========================================================
export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = Number(id);

        const requestingUserId = req.user?.id; 
        const requestingUserRole = req.user?.role?.name;

        // 🛑 PREVENCIÓN DE AUTO-ELIMINACIÓN DE SUPERADMIN 🛑
        if (requestingUserRole === 'superadmin' && requestingUserId === userId) {
            return res.status(403).json({ 
                message: "Acción prohibida. El Superadmin no puede eliminarse a sí mismo." 
            });
        }
        
        // 2. Eliminar dependencias en tablas relacionadas
        await prisma.student.deleteMany({ where: { user_id: userId } });
        await prisma.teacher.deleteMany({ where: { user_id: userId } });
        await prisma.passwordResetToken.deleteMany({ where: { userId } });
        await prisma.institutionAdmin.deleteMany({ where: { user_id: userId } });

        // 3. Eliminar el usuario
        await prisma.user.delete({ where: { id: userId } });

        return res.json({ message: "Usuario eliminado correctamente" });
    } catch (error) {
        console.error("deleteUser error:", error);
        return res
            .status(500)
            .json({ message: "No se pudo eliminar el usuario. Revisa dependencias o error interno." });
    }
};