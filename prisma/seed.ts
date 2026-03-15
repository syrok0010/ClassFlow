import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from "better-auth/crypto";

const connectionString = `${process.env.DATABASE_URL}`;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log('Clearing existing data...');
    await prisma.scheduleEntry.deleteMany();
    await prisma.weeklyScheduleTemplate.deleteMany();
    await prisma.teacherAvailabilityOverride.deleteMany();
    await prisma.teacherAvailability.deleteMany();
    await prisma.teacherSubject.deleteMany();
    await prisma.groupSubjectRequirement.deleteMany();
    await prisma.roomSubject.deleteMany();
    await prisma.room.deleteMany();
    await prisma.building.deleteMany();
    await prisma.studentGroups.deleteMany();
    await prisma.group.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.studentParents.deleteMany();
    await prisma.student.deleteMany();
    await prisma.parent.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.user.deleteMany();

    console.log('Creating mock data...');

    // 1. Users — Admins
    const admin1 = await prisma.user.create({
        data: { email: 'admin1@classflow.local', role: 'ADMIN', status: 'ACTIVE', name: 'Сергей', surname: 'Сироткин', patronymicName: 'Владимирович' }
    });

    // We need to create an Account for Better Auth to allow password login
    const password = await hashPassword('admin1234');
    await prisma.account.create({
        data: {
            userId: admin1.id,
            accountId: admin1.id,
            providerId: 'credential',
            password: password
        }
    });

    const admin2 = await prisma.user.create({
        data: { email: 'admin2@classflow.local', role: 'ADMIN', status: 'ACTIVE', name: 'Елена', surname: 'Директорова', patronymicName: 'Петровна' }
    });

    // 2. Users — Teachers (ACTIVE)
    const t1User = await prisma.user.create({ data: { email: 'teacher1@classflow.local', role: 'USER', status: 'ACTIVE', name: 'Иван', surname: 'Иванов', patronymicName: 'Иванович' } });
    const t2User = await prisma.user.create({ data: { email: 'teacher2@classflow.local', role: 'USER', status: 'ACTIVE', name: 'Пётр', surname: 'Петров', patronymicName: 'Петрович' } });
    const t3User = await prisma.user.create({ data: { email: 'teacher3@classflow.local', role: 'USER', status: 'ACTIVE', name: 'Анна', surname: 'Смирнова', patronymicName: 'Ивановна' } });

    const teacher1 = await prisma.teacher.create({ data: { userId: t1User.id } });
    const teacher2 = await prisma.teacher.create({ data: { userId: t2User.id } });
    const teacher3 = await prisma.teacher.create({ data: { userId: t3User.id } });

    // 3. Users — Students (mix of ACTIVE and PENDING_INVITE)
    const s1User = await prisma.user.create({ data: { email: 'student1@classflow.local', role: 'USER', status: 'ACTIVE', name: 'Михаил', surname: 'Кузнецов' } });
    const s2User = await prisma.user.create({ data: { role: 'USER', status: 'PENDING_INVITE', name: 'Александр', surname: 'Соколов' } });
    const s3User = await prisma.user.create({ data: { email: 'student3@classflow.local', role: 'USER', status: 'ACTIVE', name: 'Мария', surname: 'Попова' } });
    const s4User = await prisma.user.create({ data: { role: 'USER', status: 'PENDING_INVITE', name: 'Дарья', surname: 'Волкова' } });
    const s5User = await prisma.user.create({ data: { email: 'student5@classflow.local', role: 'USER', status: 'ACTIVE', name: 'Павел', surname: 'Козлов' } });

    const student1 = await prisma.student.create({ data: { userId: s1User.id } });
    const student2 = await prisma.student.create({ data: { userId: s2User.id } });
    const student3 = await prisma.student.create({ data: { userId: s3User.id } });
    const student4 = await prisma.student.create({ data: { userId: s4User.id } });
    const student5 = await prisma.student.create({ data: { userId: s5User.id } });

    // 4. Users — Parents
    const p1User = await prisma.user.create({ data: { email: 'parent1@classflow.local', role: 'USER', status: 'ACTIVE', name: 'Ольга', surname: 'Кузнецова', patronymicName: 'Сергеевна' } });
    const p2User = await prisma.user.create({ data: { role: 'USER', status: 'PENDING_INVITE', name: 'Андрей', surname: 'Соколов', patronymicName: 'Викторович' } });

    const parent1 = await prisma.parent.create({ data: { userId: p1User.id } });
    const parent2 = await prisma.parent.create({ data: { userId: p2User.id } });

    // Link parents to students
    await prisma.studentParents.createMany({
        data: [
            { parentId: parent1.id, studentId: student1.id },
            { parentId: parent2.id, studentId: student2.id },
        ]
    });

    // 5. Teacher who is also a Parent
    const teacherAsParent = await prisma.parent.create({ data: { userId: t3User.id } });
    await prisma.studentParents.create({
        data: { parentId: teacherAsParent.id, studentId: student3.id }
    });

    // 6. Subjects
    const math = await prisma.subject.create({ data: { name: 'Алгебра', type: 'ACADEMIC' } });
    const pe = await prisma.subject.create({ data: { name: 'Физкультура', type: 'ACADEMIC' } });
    const english = await prisma.subject.create({ data: { name: 'Английский', type: 'ACADEMIC' } });
    const physics = await prisma.subject.create({ data: { name: 'Физика', type: 'ACADEMIC' } });
    const lunch = await prisma.subject.create({ data: { name: 'Обед', type: 'REGIME' } });

    // 7. Buildings & Rooms
    const mainBldg = await prisma.building.create({ data: { name: 'Главное Здание' } });
    const sportBldg = await prisma.building.create({ data: { name: 'Спортивный Корпус' } });

    const room101 = await prisma.room.create({ data: { name: 'Кабинет 101', seatsCount: 30, buildingId: mainBldg.id } });
    const room102 = await prisma.room.create({ data: { name: 'Кабинет 102', seatsCount: 30, buildingId: mainBldg.id } });
    const lab1 = await prisma.room.create({ data: { name: 'Лаборатория Физики', seatsCount: 20, buildingId: mainBldg.id } });
    const gym = await prisma.room.create({ data: { name: 'Спортивный Зал', seatsCount: 50, buildingId: sportBldg.id } });
    const canteen = await prisma.room.create({ data: { name: 'Столовая', seatsCount: 100, buildingId: mainBldg.id } });

    await prisma.roomSubject.createMany({
        data: [
            { roomId: room101.id, subjectId: math.id },
            { roomId: room101.id, subjectId: english.id },
            { roomId: room102.id, subjectId: math.id },
            { roomId: room102.id, subjectId: english.id },
            { roomId: lab1.id, subjectId: physics.id },
            { roomId: gym.id, subjectId: pe.id },
            { roomId: canteen.id, subjectId: lunch.id },
        ]
    });

    await prisma.teacherSubject.createMany({
        data: [
            { teacherId: teacher1.id, subjectId: math.id, minGrade: 5, maxGrade: 11 },
            { teacherId: teacher1.id, subjectId: physics.id, minGrade: 7, maxGrade: 11 },
            { teacherId: teacher2.id, subjectId: pe.id, minGrade: 1, maxGrade: 11 },
            { teacherId: teacher3.id, subjectId: english.id, minGrade: 1, maxGrade: 11 },
        ]
    });

    // 8. Groups
    const class10A = await prisma.group.create({ data: { name: '10 А', type: 'CLASS', grade: 10 } });
    const class10B = await prisma.group.create({ data: { name: '10 Б', type: 'CLASS', grade: 10 } });

    await prisma.studentGroups.createMany({
        data: [
            { studentId: student1.id, groupId: class10A.id },
            { studentId: student2.id, groupId: class10A.id },
            { studentId: student3.id, groupId: class10A.id },
            { studentId: student4.id, groupId: class10B.id },
            { studentId: student5.id, groupId: class10B.id },
        ]
    });

    console.log('Database seeded successfully!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
