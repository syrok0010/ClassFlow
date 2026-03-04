import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, GroupType, SubjectType, AvailabilityType, Role } from '../src/generated/prisma/client.js';

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

    // 1. Users (10 total: 5 students, 3 teachers, 2 admins)
    const admin1 = await prisma.user.create({
        data: { email: 'admin1@classflow.local', role: 'ADMIN', name: 'Admin', surname: 'One' }
    });
    const admin2 = await prisma.user.create({
        data: { email: 'admin2@classflow.local', role: 'ADMIN', name: 'Admin', surname: 'Two' }
    });

    const t1User = await prisma.user.create({ data: { email: 'teacher1@classflow.local', role: 'USER', name: 'Ivan', surname: 'Ivanov', patronymicName: 'Ivanovich' } });
    const t2User = await prisma.user.create({ data: { email: 'teacher2@classflow.local', role: 'USER', name: 'Petr', surname: 'Petrov', patronymicName: 'Petrovich' } });
    const t3User = await prisma.user.create({ data: { email: 'teacher3@classflow.local', role: 'USER', name: 'Anna', surname: 'Smirnova', patronymicName: 'Ivanovna' } });

    const teacher1 = await prisma.teacher.create({ data: { userId: t1User.id } });
    const teacher2 = await prisma.teacher.create({ data: { userId: t2User.id } });
    const teacher3 = await prisma.teacher.create({ data: { userId: t3User.id } });

    const s1User = await prisma.user.create({ data: { email: 'student1@classflow.local', role: 'USER', name: 'Misha' } });
    const s2User = await prisma.user.create({ data: { email: 'student2@classflow.local', role: 'USER', name: 'Sasha' } });
    const s3User = await prisma.user.create({ data: { email: 'student3@classflow.local', role: 'USER', name: 'Masha' } });
    const s4User = await prisma.user.create({ data: { email: 'student4@classflow.local', role: 'USER', name: 'Dasha' } });
    const s5User = await prisma.user.create({ data: { email: 'student5@classflow.local', role: 'USER', name: 'Pasha' } });

    const student1 = await prisma.student.create({ data: { userId: s1User.id } });
    const student2 = await prisma.student.create({ data: { userId: s2User.id } });
    const student3 = await prisma.student.create({ data: { userId: s3User.id } });
    const student4 = await prisma.student.create({ data: { userId: s4User.id } });
    const student5 = await prisma.student.create({ data: { userId: s5User.id } });

    // 2. Subjects (5)
    const math = await prisma.subject.create({ data: { name: 'Алгебра', type: 'ACADEMIC' } });
    const pe = await prisma.subject.create({ data: { name: 'Физкультура', type: 'ACADEMIC' } });
    const english = await prisma.subject.create({ data: { name: 'Английский', type: 'ACADEMIC' } });
    const physics = await prisma.subject.create({ data: { name: 'Физика', type: 'ACADEMIC' } });
    const lunch = await prisma.subject.create({ data: { name: 'Обед', type: 'REGIME' } });

    // 3. Buildings & Rooms (2 buildings, 5 rooms)
    const mainBldg = await prisma.building.create({ data: { name: 'Главное Здание' } });
    const sportBldg = await prisma.building.create({ data: { name: 'Спортивный Корпус' } });

    const room101 = await prisma.room.create({ data: { name: 'Кабинет 101', seatsCount: 30, buildingId: mainBldg.id } });
    const room102 = await prisma.room.create({ data: { name: 'Кабинет 102', seatsCount: 30, buildingId: mainBldg.id } });
    const lab1 = await prisma.room.create({ data: { name: 'Лаборатория Физики', seatsCount: 20, buildingId: mainBldg.id } });
    const gym = await prisma.room.create({ data: { name: 'Спортивный Зал', seatsCount: 50, buildingId: sportBldg.id } });
    const canteen = await prisma.room.create({ data: { name: 'Столовая', seatsCount: 100, buildingId: mainBldg.id } });

    // Room compatibility
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

    // Assign teachers to subjects
    await prisma.teacherSubject.createMany({
        data: [
            { teacherId: teacher1.id, subjectId: math.id, minGrade: 5, maxGrade: 11 },
            { teacherId: teacher1.id, subjectId: physics.id, minGrade: 7, maxGrade: 11 },
            { teacherId: teacher2.id, subjectId: pe.id, minGrade: 1, maxGrade: 11 },
            { teacherId: teacher3.id, subjectId: english.id, minGrade: 1, maxGrade: 11 },
        ]
    });

    // 4. Groups
    const class10A = await prisma.group.create({ data: { name: '10 А', type: 'CLASS', grade: 10 } });
    const class10B = await prisma.group.create({ data: { name: '10 Б', type: 'CLASS', grade: 10 } });

    // Assign students to classes
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
