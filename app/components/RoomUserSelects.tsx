'use client';

import SearchableSelect from './SearchableSelect';

export interface RoomUserRoomOption {
  id: number;
  name: string;
  standort?: string | null;
  branch?: string | null;
}

export interface RoomUserUserOption {
  id: number;
  name: string;
  roomId?: number | null;
}

interface RoomUserSelectsProps {
  rooms: RoomUserRoomOption[];
  users: RoomUserUserOption[];
  raumId: string;
  benutzerId: string;
  onChange: (next: { raumId: string; benutzerId: string }) => void;
  labelClass: string;
  roomRequired?: boolean;
}

const defaultRoomLabel = (r: RoomUserRoomOption) =>
  `${r.name}${r.standort ? ` (${r.standort})` : ''}${r.branch ? ` - ${r.branch}` : ''}`;

// Raum filtert die Benutzerliste, ein gewählter Benutzer übernimmt seinen Raum
export default function RoomUserSelects({ rooms, users, raumId, benutzerId, onChange, labelClass, roomRequired }: RoomUserSelectsProps) {
  const roomUsers = raumId ? users.filter((u) => String(u.roomId ?? '') === raumId) : users;

  const handleRoom = (value: string) => {
    const user = users.find((u) => String(u.id) === benutzerId);
    const keepUser = !value || !user || String(user.roomId ?? '') === value;
    onChange({ raumId: value, benutzerId: keepUser ? benutzerId : '' });
  };

  const handleUser = (value: string) => {
    const user = users.find((u) => String(u.id) === value);
    onChange({ raumId: user?.roomId ? String(user.roomId) : raumId, benutzerId: value });
  };

  return (
    <>
      <div>
        <label className={labelClass}>Raum</label>
        <SearchableSelect
          options={rooms.map((r) => ({ value: String(r.id), label: defaultRoomLabel(r) }))}
          value={raumId}
          onChange={handleRoom}
          placeholder="-- kein Raum --"
          searchPlaceholder="Raum suchen..."
          required={roomRequired}
          className="text-xs"
        />
      </div>
      <div>
        <label className={labelClass}>Benutzer</label>
        <SearchableSelect
          options={roomUsers.map((u) => ({ value: String(u.id), label: u.name }))}
          value={benutzerId}
          onChange={handleUser}
          placeholder="-- keiner --"
          searchPlaceholder="Benutzer suchen..."
          className="text-xs"
        />
        <p className="text-[10px] text-gray-500 mt-0.5">
          {raumId
            ? roomUsers.length
              ? `${roomUsers.length} Benutzer in diesem Raum`
              : 'Diesem Raum sind keine Benutzer zugeordnet'
            : 'Der Raum des Benutzers wird automatisch übernommen'}
        </p>
      </div>
    </>
  );
}
