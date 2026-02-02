import { prisma } from './prismaClient';

/**
 * Generates the next WODIS number for the current year
 * Format: YYYY + 6-digit sequential number (e.g., 2026000001)
 */
export async function generateNextWODISNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const yearPrefix = currentYear.toString();
  
  // Find all WODIS numbers starting with current year
  const existingDevices = await prisma.gER.findMany({
    where: {
      WODISNr: {
        startsWith: yearPrefix,
      },
    },
    select: { WODISNr: true },
  });

  let maxSequence = 0;
  
  // Extract the sequence number from each WODIS number
  for (const device of existingDevices) {
    if (device.WODISNr) {
      const sequenceStr = device.WODISNr.substring(4); // Remove year prefix
      const sequence = parseInt(sequenceStr, 10);
      if (!isNaN(sequence) && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }
  }

  // Generate next number with 6-digit padding
  const nextSequence = maxSequence + 1;
  const paddedSequence = nextSequence.toString().padStart(6, '0');
  
  return `${yearPrefix}${paddedSequence}`;
}

/**
 * Validates a WODIS number format
 * Must be 10 digits: 4-digit year + 6-digit sequence
 */
export function validateWODISNumber(wodisNr: string): boolean {
  if (!wodisNr || wodisNr.length !== 10) {
    return false;
  }
  
  // Check if all characters are digits
  if (!/^\d{10}$/.test(wodisNr)) {
    return false;
  }
  
  // Validate year is reasonable (between 2000 and 2100)
  const year = parseInt(wodisNr.substring(0, 4), 10);
  if (year < 2000 || year > 2100) {
    return false;
  }
  
  return true;
}
