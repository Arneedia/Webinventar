import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prismaClient';
import { requireApiUser } from '@/lib/auth';
import { AvailablePermissions } from '@/lib/permissionGroups';

const toId = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : NaN;
};

// Raum- und Benutzerzuordnung eines Geräts ändern (mit Bewegungshistorie, analog Büroinventar)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser(req, AvailablePermissions.DEVICES_EDIT);
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.message }, { status: auth.status });
  }

  try {
    const { id } = await params;
    const gerId = Number(id);
    const body = await req.json();
    const raumId = toId(body.raumId);
    const benutzerId = toId(body.benutzerId);

    if (!Number.isInteger(gerId) || Number.isNaN(raumId) || Number.isNaN(benutzerId)) {
      return NextResponse.json({ error: 'Ungültige ID' }, { status: 400 });
    }

    const device = await prisma.gER.findUnique({
      where: { GerID: gerId },
      include: { BenutzerGER: { where: { Ende: null } } },
    });
    if (!device) {
      return NextResponse.json({ error: 'Gerät nicht gefunden' }, { status: 404 });
    }
    if (device.Abgang) {
      return NextResponse.json({ error: 'Abgeschriebene Geräte können nicht zugeordnet werden' }, { status: 409 });
    }

    if (benutzerId !== null) {
      const benutzer = await prisma.benutzer.findUnique({ where: { BenutzerID: benutzerId } });
      if (!benutzer) {
        return NextResponse.json({ error: 'Benutzer nicht gefunden' }, { status: 404 });
      }
      if (benutzer.RaumID && raumId !== null && benutzer.RaumID !== raumId) {
        return NextResponse.json(
          { error: 'Der Benutzer ist diesem Raum nicht zugeordnet' },
          { status: 400 }
        );
      }
    }

    if (raumId !== null) {
      const raum = await prisma.rAUM.findUnique({ where: { RaumID: raumId } });
      if (!raum) {
        return NextResponse.json({ error: 'Raum nicht gefunden' }, { status: 404 });
      }
    }

    const currentBenutzerId = device.BenutzerGER[0]?.BenutzerID ?? null;
    const userChanged = currentBenutzerId !== benutzerId;
    const roomChanged = device.StandardRaumID !== raumId;
    if (!userChanged && !roomChanged) {
      return NextResponse.json({ success: true, changed: false });
    }

    const now = new Date();
    await prisma.$transaction(async (tx) => {
      if (roomChanged) {
        await tx.gER.update({ where: { GerID: gerId }, data: { StandardRaumID: raumId } });
      }
      if (userChanged) {
        await tx.benutzerGER.updateMany({ where: { GERID: gerId, Ende: null }, data: { Ende: now } });
        if (benutzerId !== null) {
          await tx.benutzerGER.create({ data: { BenutzerID: benutzerId, GERID: gerId, Start: now } });
        }
      }
      await tx.gerBewegung.create({
        data: {
          GerID: gerId,
          Typ: userChanged ? (benutzerId ? 'ZUWEISUNG' : 'RUECKGABE') : 'STANDORTWECHSEL',
          VonBenutzerID: currentBenutzerId,
          NachBenutzerID: benutzerId,
          VonRaumID: device.StandardRaumID,
          NachRaumID: raumId,
          Bemerkung: 'Zuordnung geändert',
        },
      });
    });

    return NextResponse.json({ success: true, changed: true });
  } catch (error) {
    console.error('Database error (PATCH /api/devices/[id]/assignment):', error);
    return NextResponse.json({ error: 'Zuordnung konnte nicht gespeichert werden' }, { status: 500 });
  }
}
