-- Add RaumID to Benutzer table
ALTER TABLE "Benutzer" ADD COLUMN IF NOT EXISTS "RaumID" INTEGER;

-- Add foreign key constraint for Benutzer.RaumID
ALTER TABLE "Benutzer" 
ADD CONSTRAINT "Benutzer_RaumID_fkey" 
FOREIGN KEY ("RaumID") REFERENCES "RAUM"("RaumID") ON DELETE SET NULL ON UPDATE CASCADE;

-- Rename GER.RaumID to StandardRaumID
ALTER TABLE "GER" RENAME COLUMN "RaumID" TO "StandardRaumID";

-- Update foreign key constraint name for GER.StandardRaumID
ALTER TABLE "GER" DROP CONSTRAINT IF EXISTS "GER_RaumID_fkey";
ALTER TABLE "GER" 
ADD CONSTRAINT "GER_StandardRaumID_fkey" 
FOREIGN KEY ("StandardRaumID") REFERENCES "RAUM"("RaumID") ON DELETE SET NULL ON UPDATE CASCADE;
