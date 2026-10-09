import { useState } from "react";
import { PlusCircle, ArrowRightLeft, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuthStore } from "@/lib/auth-store";
import { useEnrollmentStore } from "@/lib/enrollment-store";

export default function StudentEnrollmentsPage() {
  const studentId = useAuthStore((s) => s.studentId);
  const {
    students,
    courses,
    enrollments,
    enroll,
    updateEnrollment,
    dropEnrollment,
  } = useEnrollmentStore();

  const [open, setOpen] = useState(false);
  const [formCourse, setFormCourse] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [openChange, setOpenChange] = useState(false);
  const [newCourseId, setNewCourseId] = useState<string | null>(null);
  const [errorChange, setErrorChange] = useState<string | null>(null);
  const [submittingChange, setSubmittingChange] = useState(false);

  const me = students.find((s) => s.studentId === studentId);
  const myEnrollments = enrollments.filter((e) => e.studentId === studentId);

  const courseOptions = courses
    .filter((c) => !myEnrollments.some((e) => e.courseId === c.courseId))
    .map((c) => ({
      value: c.courseId,
      label: `${c.courseId} — ${c.courseTitle}`,
    }));

  const courseOf = (courseId: string) =>
    courses.find((c) => c.courseId === courseId);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setFormCourse(null);
      setServerError(null);
    }
  };

  const handleEnroll = async () => {
    if (!studentId || !formCourse) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await enroll(studentId, formCourse);
      handleOpenChange(false);
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const availableCourses = courses.filter(
    (c) => !myEnrollments.some((en) => en.courseId === c.courseId),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">จัดการการลงทะเบียน</h1>
          <p className="text-sm text-muted-foreground">
            {me
              ? `${me.studentId} — ${me.firstName} ${me.lastName} (${me.program})`
              : (studentId ?? "-")}{" "}
            · ลงทะเบียนแล้ว {myEnrollments.length} วิชา
          </p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button disabled={!studentId} />}>
            <PlusCircle className="h-4 w-4" />
            ลงทะเบียนเรียน
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>ลงทะเบียนเรียน</DialogTitle>
              <DialogDescription>
                เลือกวิชาที่ยังไม่ได้ลงทะเบียน
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="formCourse">วิชา</Label>
              <Select
                items={courseOptions}
                value={formCourse}
                onValueChange={(v) => setFormCourse(v as string)}>
                <SelectTrigger id="formCourse" className="w-full">
                  <SelectValue
                    placeholder={
                      courseOptions.length === 0
                        ? "ลงทะเบียนครบทุกวิชาแล้ว"
                        : "เลือกวิชา"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
            <DialogFooter>
              <Button
                disabled={!formCourse || submitting}
                onClick={handleEnroll}>
                <PlusCircle className="h-4 w-4" />
                {submitting ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสวิชา</TableHead>
              <TableHead>ชื่อวิชา</TableHead>
              <TableHead>ผู้สอน</TableHead>
              <TableHead>วันที่ลงทะเบียน</TableHead>
              <TableHead>ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myEnrollments.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={4}
                  className="h-20 text-center text-muted-foreground">
                  ยังไม่ได้ลงทะเบียนวิชาใด
                </TableCell>
              </TableRow>
            )}
            {myEnrollments.map((e) => {
              const course = courseOf(e.courseId);
              const handleChangeCourse = async () => {
                if (!studentId || !newCourseId) return;
                setSubmittingChange(true);
                setErrorChange(null);

                try {
                  await updateEnrollment(studentId, e.courseId, newCourseId);
                  setOpenChange(false);
                } catch (err) {
                  setErrorChange((err as Error).message);
                } finally {
                  setSubmittingChange(false);
                }
              };

              const handleDrop = async () => {
                try {
                  await dropEnrollment(studentId!, e.courseId);
                } catch (err) {
                  setServerError((err as Error).message);
                }
              };

              return (
                <TableRow key={e.courseId}>
                  <TableCell>{e.courseId}</TableCell>
                  <TableCell>{course?.courseTitle ?? "-"}</TableCell>
                  <TableCell>{course?.instructors.join(", ") || "-"}</TableCell>
                  <TableCell>
                    {e.enrolledAt
                      ? new Date(e.enrolledAt).toLocaleString("th-TH")
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setOpenChange(true)}>
                      <ArrowRightLeft className="h-4 w-4" />
                    </Button>
                    <Dialog open={openChange} onOpenChange={setOpenChange}>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle className="text-lg font-semibold">
                            เปลี่ยนวิชา {e.courseId}
                          </DialogTitle>
                          <DialogDescription className="text-sm text-muted-foreground">
                            เลือกวิชาใหม่แทนวิชา {e.courseId}{" "}
                            (เลือกได้เฉพาะวิชาที่ยังไม่ได้ลงทะเบียน)
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 mt-4">
                          <Label htmlFor="newCourse">วิชาใหม่</Label>
                          <Select
                            value={newCourseId ?? ""}
                            onValueChange={(v) => setNewCourseId(v)}>
                            <SelectTrigger id="newCourse" className="w-full">
                              <SelectValue placeholder="เลือกวิชาใหม่" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableCourses.map((c) => (
                                <SelectItem key={c.courseId} value={c.courseId}>
                                  {c.courseId} — {c.courseTitle}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {errorChange && (
                            <p className="text-sm text-red-500 font-medium">
                              {errorChange}
                            </p>
                          )}
                        </div>

                        <DialogFooter className="mt-6 flex justify-end gap-2">
                          <Button
                            disabled={!newCourseId || submittingChange}
                            onClick={handleChangeCourse}>
                            <ArrowRightLeft className="mr-2 h-4 w-4" />
                            {submittingChange ? "กำลังบันทึก..." : "บันทึก"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>

                    <Button
                      variant="destructive"
                      size="icon"
                      onClick={handleDrop}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
