import { prisma } from "@/lib/prismaClient";
import { deriveHardwareCode, formatInventarCode } from "@/lib/hardwareCodes";

async function backfillHardwareCodes() {
  const hardware = await prisma.hW.findMany({
    orderBy: { HWID: "asc" },
    select: { HWID: true, HWName: true, HWCode: true },
  });

  const usedCodes = new Set(
    hardware
      .map((hw) => hw.HWCode?.trim().toUpperCase())
      .filter((code): code is string => Boolean(code))
  );

  for (const hw of hardware) {
    if (hw.HWCode?.trim()) {
      continue;
    }

    const base = deriveHardwareCode(hw.HWName);
    let candidate = base;
    let suffix = 1;

    while (usedCodes.has(candidate)) {
      suffix += 1;
      candidate = `${base}${suffix}`;
    }

    usedCodes.add(candidate);
    await prisma.hW.update({
      where: { HWID: hw.HWID },
      data: { HWCode: candidate },
    });
  }
}

async function backfillInventarCodes() {
  const hardwareMap = new Map<number, string>();
  const hardware = await prisma.hW.findMany({
    select: { HWID: true, HWCode: true, HWName: true },
  });
  for (const hw of hardware) {
    const code = hw.HWCode?.trim() || deriveHardwareCode(hw.HWName);
    hardwareMap.set(hw.HWID, code);
    if (!hw.HWCode) {
      await prisma.hW.update({
        where: { HWID: hw.HWID },
        data: { HWCode: code },
      });
    }
  }

  const devices = await prisma.gER.findMany({
    orderBy: { GerID: "asc" },
    select: { GerID: true, HWID: true, InventarCode: true },
  });

  const prefixCounters = new Map<string, number>();
  const usedInventarCodes = new Set(
    devices
      .map((device) => device.InventarCode?.toUpperCase())
      .filter((code): code is string => Boolean(code))
  );

  for (const device of devices) {
    const prefix = hardwareMap.get(device.HWID) || "HW";

    if (device.InventarCode?.trim()) {
      const match = device.InventarCode.match(/-(\d+)$/);
      if (match) {
        const current = Number(match[1]);
        const previous = prefixCounters.get(prefix) ?? 0;
        prefixCounters.set(prefix, Math.max(previous, current));
      }
      continue;
    }

    let counter = prefixCounters.get(prefix) ?? 0;
    let candidate: string;

    do {
      counter += 1;
      candidate = formatInventarCode(prefix, counter);
    } while (usedInventarCodes.has(candidate));

    prefixCounters.set(prefix, counter);
    usedInventarCodes.add(candidate);

    await prisma.gER.update({
      where: { GerID: device.GerID },
      data: { InventarCode: candidate },
    });
  }
}

async function main() {
  await backfillHardwareCodes();
  await backfillInventarCodes();
  console.log("Inventar-Codes erfolgreich nachgetragen.");
}

main()
  .catch((error) => {
    console.error("Backfill fehlgeschlagen:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
