import { NextRequest } from "next/server";
import prisma from "@/lib/db";

export const dynamic = "force-dynamic";

function escapeICalText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

function formatICalDate(dateStr: string, timeStr?: string | null): string {
  const clean = dateStr.replace(/-/g, "");
  if (timeStr) {
    const t = timeStr.replace(/:/g, "").padEnd(4, "0");
    return `${clean}T${t}00`;
  }
  return clean;
}

function foldLine(line: string): string {
  const lines: string[] = [];
  let remaining = line;
  while (remaining.length > 75) {
    lines.push(remaining.substring(0, 75));
    remaining = " " + remaining.substring(75);
  }
  lines.push(remaining);
  return lines.join("\r\n");
}

function generateUID(id: string, type: string): string {
  return `${id}-${type}@europa2026`;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  try {
    const { tripId } = await params;

    const [trip, itineraryItems, reservations] = await Promise.all([
      prisma.trip.findUnique({ where: { id: tripId } }),
      prisma.itineraryItem.findMany({
        where: { tripId },
        orderBy: [{ date: "asc" }, { time: "asc" }],
      }),
      prisma.reservation.findMany({
        where: { tripId },
        orderBy: { startDate: "asc" },
      }),
    ]);

    if (!trip) {
      return new Response("Trip not found", { status: 404 });
    }

    const now = new Date();
    const stamp =
      now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, "0") +
      String(now.getDate()).padStart(2, "0") +
      "T" +
      String(now.getHours()).padStart(2, "0") +
      String(now.getMinutes()).padStart(2, "0") +
      String(now.getSeconds()).padStart(2, "0");

    const lines: string[] = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Europa2026//TripPlanner//ES",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      foldLine(`X-WR-CALNAME:${escapeICalText(trip.name)}`),
    ];

    // Itinerary items as events
    for (const item of itineraryItems) {
      const dtStart = formatICalDate(item.date, item.time);
      const isAllDay = !item.time;

      // For all-day events, DTEND is the next day
      let dtEnd: string;
      if (isAllDay) {
        const d = new Date(item.date + "T12:00:00");
        d.setDate(d.getDate() + 1);
        dtEnd = d.toISOString().split("T")[0].replace(/-/g, "");
      } else {
        // 1-hour duration by default
        const [h, m] = (item.time as string).split(":").map(Number);
        const endH = String(h + 1).padStart(2, "0");
        const endM = String(m ?? 0).padStart(2, "0");
        dtEnd = `${item.date.replace(/-/g, "")}T${endH}${endM}00`;
      }

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${generateUID(item.id, "itinerary")}`);
      lines.push(`DTSTAMP:${stamp}`);

      if (isAllDay) {
        lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
        lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      } else {
        lines.push(`DTSTART:${dtStart}`);
        lines.push(`DTEND:${dtEnd}`);
      }

      lines.push(foldLine(`SUMMARY:${escapeICalText(item.title)}`));

      if (item.description) {
        lines.push(foldLine(`DESCRIPTION:${escapeICalText(item.description)}`));
      }

      lines.push(foldLine(`LOCATION:${escapeICalText(`${item.city}, ${item.country}`)}`));
      lines.push(foldLine(`CATEGORIES:${escapeICalText(item.category)}`));
      lines.push("END:VEVENT");
    }

    // Reservations as events
    for (const res of reservations) {
      const dtStart = formatICalDate(res.startDate);
      const endDateStr = res.endDate ?? res.startDate;
      const endD = new Date(endDateStr + "T12:00:00");
      endD.setDate(endD.getDate() + 1);
      const dtEnd = endD.toISOString().split("T")[0].replace(/-/g, "");

      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${generateUID(res.id, "reservation")}`);
      lines.push(`DTSTAMP:${stamp}`);
      lines.push(`DTSTART;VALUE=DATE:${dtStart}`);
      lines.push(`DTEND;VALUE=DATE:${dtEnd}`);
      lines.push(foldLine(`SUMMARY:${escapeICalText(`[${res.type}] ${res.title}`)}`));

      const descParts: string[] = [];
      if (res.provider) descParts.push(`Proveedor: ${res.provider}`);
      if (res.confirmationNumber) descParts.push(`Confirmacion: ${res.confirmationNumber}`);
      if (res.notes) descParts.push(res.notes);
      if (descParts.length > 0) {
        lines.push(foldLine(`DESCRIPTION:${escapeICalText(descParts.join("\\n"))}`));
      }

      lines.push(foldLine(`LOCATION:${escapeICalText(`${res.city}, ${res.country}`)}`));
      lines.push(foldLine(`CATEGORIES:${escapeICalText(res.type)}`));
      lines.push(`STATUS:${res.status === "confirmado" ? "CONFIRMED" : "TENTATIVE"}`);
      lines.push("END:VEVENT");
    }

    lines.push("END:VCALENDAR");

    const icsContent = lines.join("\r\n") + "\r\n";
    const filename = `${trip.name.replace(/[^a-zA-Z0-9]/g, "_")}.ics`;

    return new Response(icsContent, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error generating calendar:", error);
    return new Response("Error generating calendar", { status: 500 });
  }
}
