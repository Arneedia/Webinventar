import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser, userHasAnyPermission } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';
import { findDuplicate, isMasterDataType, masterDataLabel } from '@/lib/officeMasterData';
import { isBereich } from '@/lib/masterDataBereich';

type RouteContext = { params: Promise<{ type: string; id: string }> };

async function resolve(context: RouteContext) {
  const { type, id } = await context.params;
  const recordId = Number(id);
  if (!isMasterDataType(type) || !Number.isInteger(recordId)) return null;
  return { type, recordId };
}

// Umbenennen: der Text in bestehenden Büroinventar-Einträgen wird mitgeführt
export async function PUT(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_DEVICES_EDIT, AvailablePermissions.RELATIONS_OFFICE_EDIT])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  try {
    const target = await resolve(context);
    if (!target) return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
    const { type, recordId } = target;

    const body = await req.json().catch(() => ({}));
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const nummer = typeof body.nummer === 'string' ? body.nummer.trim() : '';
    const bereich = body.bereich;
    if (bereich !== undefined && !isBereich(bereich)) {
      return NextResponse.json({ error: 'Ungültiger Bereich' }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: 'Bitte einen Namen angeben' }, { status: 400 });
    }
    if (await findDuplicate(type, name, recordId)) {
      return NextResponse.json({ error: `${masterDataLabel(type)} „${name}“ existiert bereits` }, { status: 409 });
    }

    const updatedItems = await prisma.$transaction(async (tx) => {
      if (type === 'hersteller') {
        const current = await tx.hS.findUniqueOrThrow({ where: { HSID: recordId } });
        await tx.hS.update({ where: { HSID: recordId }, data: { HSName: name, Bereich: bereich } });
        if (!current.HSName) return 0;
        const { count } = await tx.bueroInventar.updateMany({
          where: { Hersteller: { equals: current.HSName, mode: 'insensitive' } },
          data: { Hersteller: name },
        });
        return count;
      }

      const current = await tx.mOD.findUniqueOrThrow({ where: { ModID: recordId } });
      await tx.mOD.update({ where: { ModID: recordId }, data: { ModName: name, ModellNummer: nummer || null, Bereich: bereich } });
      if (!current.ModName) return 0;
      const { count } = await tx.bueroInventar.updateMany({
        where: { Modell: { equals: current.ModName, mode: 'insensitive' } },
        data: { Modell: name },
      });
      return count;
    });

    return NextResponse.json({ success: true, updatedItems });
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'P2025') {
      return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
    }
    console.error('Database error (PUT /api/office-master-data/[type]/[id]):', error);
    return NextResponse.json({ error: 'Eintrag konnte nicht gespeichert werden' }, { status: 500 });
  }
}

// Löschen nur, wenn der Eintrag nirgends mehr verwendet wird
export async function DELETE(req: NextRequest, context: RouteContext) {
  const auth = await requireApiUser(req);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }
  if (!userHasAnyPermission(auth.user, [AvailablePermissions.MASTER_DATA_EDIT, AvailablePermissions.RELATIONS_EDIT, AvailablePermissions.RELATIONS_DEVICES_EDIT, AvailablePermissions.RELATIONS_OFFICE_EDIT])) {
    return NextResponse.json({ error: 'Keine Berechtigung' }, { status: 403 });
  }

  try {
    const target = await resolve(context);
    if (!target) return NextResponse.json({ error: 'Ungültige Anfrage' }, { status: 400 });
    const { type, recordId } = target;

    let usage: string[];
    if (type === 'hersteller') {
      const record = await prisma.hS.findUnique({ where: { HSID: recordId } });
      if (!record) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
      const [geraete, zuordnungen, hwZuordnungen, zubehoer, buero] = await Promise.all([
        prisma.gER.count({ where: { HSID: recordId } }),
        prisma.hS_MOD.count({ where: { HSID: recordId } }),
        prisma.hW_HS.count({ where: { HSID: recordId } }),
        prisma.zubehoer.count({ where: { HSID: recordId } }),
        record.HSName
          ? prisma.bueroInventar.count({ where: { Hersteller: { equals: record.HSName, mode: 'insensitive' } } })
          : 0,
      ]);
      usage = [
        geraete && `${geraete} Gerät(en)`,
        zuordnungen && `${zuordnungen} Hersteller-Modell-Zuordnung(en)`,
        hwZuordnungen && `${hwZuordnungen} Hardware-Hersteller-Zuordnung(en)`,
        zubehoer && `${zubehoer} Zubehörartikel(n)`,
        buero && `${buero} Büroinventar-Eintrag/Einträgen`,
      ].filter((entry): entry is string => Boolean(entry));
    } else {
      const record = await prisma.mOD.findUnique({ where: { ModID: recordId } });
      if (!record) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 });
      const [geraete, zuordnungen, zubehoer, buero] = await Promise.all([
        prisma.gER.count({ where: { MODID: recordId } }),
        prisma.hS_MOD.count({ where: { ModID: recordId } }),
        prisma.zubehoer.count({ where: { ModID: recordId } }),
        record.ModName
          ? prisma.bueroInventar.count({ where: { Modell: { equals: record.ModName, mode: 'insensitive' } } })
          : 0,
      ]);
      usage = [
        geraete && `${geraete} Gerät(en)`,
        zuordnungen && `${zuordnungen} Hersteller-Modell-Zuordnung(en)`,
        zubehoer && `${zubehoer} Zubehörartikel(n)`,
        buero && `${buero} Büroinventar-Eintrag/Einträgen`,
      ].filter((entry): entry is string => Boolean(entry));
    }

    if (usage.length) {
      return NextResponse.json(
        { error: `${masterDataLabel(type)} wird noch verwendet von ${usage.join(', ')}` },
        { status: 409 }
      );
    }

    if (type === 'hersteller') {
      await prisma.hS.delete({ where: { HSID: recordId } });
    } else {
      await prisma.mOD.delete({ where: { ModID: recordId } });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Database error (DELETE /api/office-master-data/[type]/[id]):', error);
    return NextResponse.json({ error: 'Eintrag konnte nicht gelöscht werden' }, { status: 500 });
  }
}
