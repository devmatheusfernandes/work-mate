import { calendarService } from "@/modules/calendar/calendar.service";
import { getCurrentUser } from "@/lib/safe-action";
import { SettingsContainer } from "./_components/settings-container";
import { Header } from "@/components/layout/header";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/signin");
  }
  const calendars = await calendarService.getCalendars(user.id);

  return (
    <div className="w-full h-full">
      <Header
        title="Configurações"
        subtitle="Gerencie sua conta, aparência e calendário"
        showSubHeader={true}
        user={user}
      />
      <main className="container">
        <SettingsContainer initialCalendars={calendars} user={user} />
      </main>
    </div>
  );
}