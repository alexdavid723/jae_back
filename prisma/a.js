import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Roles
  const adminRole = await prisma.role.create({ data: { name: "administrador" } });
  const studentRole = await prisma.role.create({ data: { name: "estudiante" } });

  // Institution
  const cetpro = await prisma.institution.create({
    data: { name: "CETPRO XELA", code: "1027713" }
  });

  // Faculty & Program
  const faculty = await prisma.faculty.create({ data: { name: "Ingeniería" } });
  const program = await prisma.program.create({
    data: {
      name: "Desarrollo de Software",
      duration_years: 3,
      faculty_id: faculty.id,
    },
  });

  // Admission Process
  const admission = await prisma.admissionProcess.create({ data: { year: 2025 } });

  // Student & User
  const studentUser = await prisma.user.create({
    data: { first_name: "Alex", last_name: "Xela", email: "alex@example.com", password: "123456", role_id: studentRole.id }
  });
  const student = await prisma.student.create({
    data: { user_id: studentUser.id, institution_id: cetpro.id, enrollment_year: 2025 }
  });

  // Enrollment
  const enrollment = await prisma.enrollment.create({
    data: { student_id: student.id, program_id: program.id, admission_process_id: admission.id }
  });

  // EnrollmentSheet
  await prisma.enrollmentSheet.create({
    data: {
      institution_id: cetpro.id,
      program_id: program.id,
      admission_id: admission.id,
      module_name: "Módulo 1",
      academic_period: "2025-I",
      class_period: "Enero-Marzo",
      shift: "Mañana",
      section: "A",
      items: {
        create: [
          {
            enrollment_id: enrollment.id,
            student_name: "Alex Xela",
            sex: "M",
            birth_date: new Date("2000-01-01"),
            condition: "Regular",
            units: 5,
            credits: 15
          }
        ]
      }
    }
  });

  console.log("Seed data created ✅");
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
