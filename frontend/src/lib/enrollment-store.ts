import { create } from "zustand";

import { api } from "@/lib/api";
import type { Course, Enrollment, Student, User } from "@/lib/types";

type ApiStudent = Omit<Student, "emails"> & { emails?: string[] };
type ApiEnrollment = Enrollment & { createdAt?: string };

const fromApiStudent = (s: ApiStudent): Student => ({
  studentId: s.studentId,
  firstName: s.firstName,
  lastName: s.lastName,
  program: s.program,
  interests: s.interests ?? [],
  emails: (s.emails ?? []).map((address) => ({ address })),
});

const toCourse = ({ courseId, courseTitle, instructors }: Course): Course => ({
  courseId,
  courseTitle,
  instructors,
});

const fromApiEnrollment = (e: ApiEnrollment): Enrollment => ({
  studentId: e.studentId,
  courseId: e.courseId,
  enrolledAt: e.createdAt,
});

type EnrollmentStore = {
  students: Student[];
  courses: Course[];
  enrollments: Enrollment[];
  loading: boolean;
  error: string | null;
  /** โหลดข้อมูลจาก Backend (GET 3 endpoint พร้อมกัน) ตาม role ของผู้ใช้ */
  getAll: (role: User["role"], studentId?: string | null) => Promise<void>;
  /** ล้างข้อมูลทั้งหมด (ตอน Logout — กันข้อมูลของ user ก่อนหน้าค้างอยู่) */
  reset: () => void;
  /** POST /students — throw ApiError ถ้า Backend ไม่รับ */
  addStudent: (student: Student) => Promise<void>;
  /** PUT /students — แก้ข้อมูลนักศึกษา (studentId แก้ไม่ได้) */
  updateStudent: (student: Student) => Promise<void>;
  /** DELETE /students — Backend ลบการลงทะเบียน/ไฟล์ของนักศึกษาคนนี้ให้ด้วย */
  removeStudent: (studentId: string) => Promise<void>;
  /** POST /courses — throw ApiError ถ้า Backend ไม่รับ */
  addCourse: (course: Course) => Promise<void>;
  /** PUT /courses — แก้ชื่อวิชา/ผู้สอน (courseId แก้ไม่ได้) */
  updateCourse: (course: Course) => Promise<void>;
  /** DELETE /courses — Backend ลบการลงทะเบียนของวิชานี้ให้ด้วย */
  removeCourse: (courseId: string) => Promise<void>;
  /** POST /enrollments — throw ApiError ถ้า Backend ไม่รับ */
  enroll: (studentId: string, courseId: string) => Promise<void>;
  // TODO การบ้าน 2.3: action เปลี่ยนวิชา (PUT /enrollments) และยกเลิก (DELETE /enrollments)
  updateEnrollment: (
    studentId: string,
    courseId: string,
    newCourseId: string,
  ) => Promise<void>;
  dropEnrollment: (studentId: string, courseId: string) => Promise<void>;
};

export const useEnrollmentStore = create<EnrollmentStore>()((set) => ({
  students: [],
  courses: [],
  enrollments: [],
  loading: false,
  error: null,

  getAll: async (role, studentId) => {
    set({ loading: true, error: null });
    try {
      const studentsRequest =
        role === "ADMIN"
          ? api<ApiStudent[]>("/students")
          : studentId
            ? api<ApiStudent>(`/students/${studentId}`).then((s) => [s])
            : Promise.resolve([] as ApiStudent[]);
      const [students, courses, enrollments] = await Promise.all([
        studentsRequest,
        api<Course[]>("/courses"),
        api<ApiEnrollment[]>("/enrollments"),
      ]);
      set({
        students: students.map(fromApiStudent),
        courses: courses.map(toCourse),
        enrollments: enrollments.map(fromApiEnrollment),
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: (err as Error).message });
    }
  },

  reset: () =>
    set({
      students: [],
      courses: [],
      enrollments: [],
      loading: false,
      error: null,
    }),

  addStudent: async (student: Student): Promise<void> => {
    const formattedEmails = student.emails?.map((e) => e.address) || [];

    const response = await api<Student>("/students", {
      method: "POST",
      body: { ...student, emails: formattedEmails },
    });

    set((state) => ({
      students: [...state.students, response],
    }));
  },

  updateStudent: async (student: Student): Promise<void> => {
    const formattedEmails = student.emails?.map((e) => e.address) || undefined;

    const updated = await api<Student>("/students", {
      method: "PUT",
      body: { ...student, emails: formattedEmails },
    });

    set((state) => ({
      students: state.students.map((s) =>
        s.studentId === student.studentId ? updated : s,
      ),
    }));
  },

  removeStudent: async (studentId: string): Promise<void> => {
    await api<void>("/students", {
      method: "DELETE",
      body: { studentId },
    });

    set((state) => ({
      students: state.students.filter((s) => s.studentId !== studentId),
      enrollments: state.enrollments.filter((e) => e.studentId !== studentId),
    }));
  },

  addCourse: async (course) => {
    const created = await api<Course>("/courses", {
      method: "POST",
      body: course,
    });
    set((state) => ({ courses: [...state.courses, toCourse(created)] }));
  },

  updateCourse: async (course) => {
    const updated = await api<Course>("/courses", {
      method: "PUT",
      body: course,
    });
    set((state) => ({
      courses: state.courses.map((c) =>
        c.courseId === updated.courseId ? toCourse(updated) : c,
      ),
    }));
  },

  removeCourse: async (courseId) => {
    await api<Course>("/courses", {
      method: "DELETE",
      body: { courseId },
    });
    set((state) => ({
      courses: state.courses.filter((c) => c.courseId !== courseId),
      enrollments: state.enrollments.filter((e) => e.courseId !== courseId),
    }));
  },

  enroll: async (studentId, courseId) => {
    const created = await api<ApiEnrollment>("/enrollments", {
      method: "POST",
      body: { studentId, courseId },
    });
    set((state) => ({
      enrollments: [...state.enrollments, fromApiEnrollment(created)],
    }));
  },

  updateEnrollment: async (studentId, courseId, newCourseId) => {
    const updated = await api<Enrollment>("/enrollments", {
      method: "PUT",
      body: { studentId, courseId, newCourseId },
    });

    set((state) => ({
      enrollments: state.enrollments.map((e) =>
        e.studentId === studentId && e.courseId === courseId ? updated : e,
      ),
    }));
  },

  dropEnrollment: async (studentId, courseId) => {
    await api<void>("/enrollments", {
      method: "DELETE",
      body: { studentId, courseId },
    });

    set((state) => ({
      enrollments: state.enrollments.filter(
        (e) => !(e.studentId === studentId && e.courseId === courseId),
      ),
    }));
  },
}));
