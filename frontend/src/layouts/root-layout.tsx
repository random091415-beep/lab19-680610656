import { useEffect } from "react";
import { Navigate, Outlet } from "react-router";

import { AppSidebar } from "@/components/app-sidebar";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/lib/auth-store";
import { useEnrollmentStore } from "@/lib/enrollment-store";

export default function RootLayout() {
  const token = useAuthStore((s) => s.token);
  const role = useAuthStore((s) => s.role);
  const studentId = useAuthStore((s) => s.studentId);
  const { loading, error, getAll, reset } = useEnrollmentStore();

  useEffect(() => {
    if (token && role) getAll(role, studentId);
    else reset();
  }, [token, role, studentId, getAll, reset]);

  if (!token) return <Navigate to="/login" replace />;

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 items-center justify-between gap-2 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-medium">ระบบลงทะเบียนเรียน</span>
          </div>
          <ModeToggle />
        </header>
        <main className="flex-1 p-4">
          {error && (
            <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-destructive/50 p-3 text-sm text-destructive">
              <span>โหลดข้อมูลไม่สำเร็จ: {error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => role && getAll(role, studentId)}>
                ลองใหม่
              </Button>
            </div>
          )}
          {loading && (
            <p className="mb-4 text-sm text-muted-foreground">
              กำลังโหลดข้อมูลจาก Backend...
            </p>
          )}
          <Outlet />
        </main>
        <footer className="border-t p-4 text-center text-xs text-muted-foreground">
          ระบบลงทะเบียนเรียน{" "}
          {role === "ADMIN"
            ? "ฝั่งผู้ดูแลระบบ"
            : "ฝั่งนักศึกษา จัดทำโดย นศ. กิตติภพ อินทำ รหัส นศ. 680610656"}
        </footer>
      </SidebarInset>
    </SidebarProvider>
  );
}
