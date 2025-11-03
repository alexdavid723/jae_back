import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./src/routes/authRoutes.js";
import institutionRoutes from "./src/routes/institutionRoutes.js";
import planRoutes from "./src/routes/planRoutes.js";
import courseRoutes from "./src/routes/courseRoutes.js";
import programRoutes from "./src/routes/programRoutes.js";
import facultyRoutes from "./src/routes/facultyRoutes.js";
// 🎯 Importamos la ruta del Administrador de Institución (InstitutionAdminRouter.js)
import institutionAdminRoutes from "./src/routes/InstitutionAdminRouter.js"; 
// 📅 Importamos la ruta de Períodos Académicos (academicPeriodRoutes.js)
import academicPeriodRoutes from "./src/routes/academicPeriodRoutes.js";
// 🧑‍💼 Importamos la ruta de Personal
import personnelRoutes from "./src/routes/personnelRoutes.js";
// 💡 NUEVA IMPORTACIÓN: Rutas de Asignación de Cursos
import assignmentRoutes from "./src/routes/assignmentRoutes.js";

// 💡==========================================================
// 💡 AÑADIDAS: Importaciones de Admisión y Matrícula
// 💡==========================================================
import admissionProcessRoutes from "./src/routes/admissionProcessRoutes.js";
import enrollmentRoutes from "./src/routes/enrollmentRoutes.js";

// 👨‍🏫 NUEVA IMPORTACIÓN: Rutas de Docente
import teacherRoutes from "./src/routes/teacherRoutes.js";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// --- REGISTRO DE RUTAS ---

app.use("/api/auth", authRoutes);
app.use("/api/institutions", institutionRoutes);

// 🎯 Gestión del Administrador de Institución (Para obtener la IE asignada y gestión Superadmin)
app.use("/api/institution-admins", institutionAdminRoutes);

// 📅 Gestión de Períodos Académicos (CRUD para la ruta /admin/academic-setup/periods)
app.use("/api/academic-periods", academicPeriodRoutes);

app.use('/api/plans', planRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/programs", programRoutes);
app.use("/api/faculties", facultyRoutes);

// 🧑‍💼 RUTA AÑADIDA: Gestión de personal (Docentes/Estudiantes)
// El endpoint completo será /api/personnel/list-all-institutional
app.use("/api/personnel", personnelRoutes);

// 💡 NUEVA RUTA AÑADIDA: Gestión de Asignaciones (Carga Académica)
app.use("/api/assignments", assignmentRoutes);

// 💡==========================================================
// 💡 RUTAS AÑADIDAS: Matrícula y Admisión
// 💡==========================================================
app.use("/api/admission-processes", admissionProcessRoutes);
app.use("/api/enrollments", enrollmentRoutes);

// 👨‍🏫 NUEVA RUTA AÑADIDA: Rutas específicas del Docente
app.use("/api/teacher", teacherRoutes);


// Puerto
const PORT = process.env.PORT || 3000; 

app.listen(PORT, () =>
  console.log(`Server running on http://localhost:${PORT}`)
);

