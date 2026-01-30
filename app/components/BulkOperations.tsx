'use client';

import { useState } from 'react';
import { CheckSquare, Square, UserRound, Undo2, Archive, X } from 'lucide-react';

interface DeviceListItem {
  id: number;
  inventarCode: string;
  currentUserId: number | null;
  currentUserName: string | null;
  abgang: string | null;
}

interface BulkOperationsProps {
  devices: DeviceListItem[];
  selectedDeviceIds: Set<number>;
  onToggleDevice: (id: number) => void;
  onToggleAll: () => void;
  onAssignBulk: (userIds: number[]) => Promise<void>;
  onUnassignBulk: (roomId: number) => Promise<void>;
  onRetireBulk: () => Promise<void>;
  users: { id: number; name: string }[];
  rooms: { id: number; name: string }[];
  canEdit: boolean;
}

export default function BulkOperations({
  devices,
  selectedDeviceIds,
  onToggleDevice,
  onToggleAll,
  onAssignBulk,
  onUnassignBulk,
  onRetireBulk,
  users,
  rooms,
  canEdit,
}: BulkOperationsProps) {
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [showBulkUnassign, setShowBulkUnassign] = useState(false);
  const [showBulkRetire, setShowBulkRetire] = useState(false);
  const [bulkUserId, setBulkUserId] = useState('');
  const [bulkRoomId, setBulkRoomId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCount = selectedDeviceIds.size;
  const allSelected = devices.length > 0 && selectedDeviceIds.size === devices.length;
  const someSelected = selectedDeviceIds.size > 0 && selectedDeviceIds.size < devices.length;

  const handleBulkAssign = async () => {
    if (!bulkUserId) return;
    setLoading(true);
    setError(null);
    try {
      await onAssignBulk([Number(bulkUserId)]);
      setShowBulkAssign(false);
      setBulkUserId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei Massenzuweisung');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUnassign = async () => {
    if (!bulkRoomId) return;
    setLoading(true);
    setError(null);
    try {
      await onUnassignBulk(Number(bulkRoomId));
      setShowBulkUnassign(false);
      setBulkRoomId('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler bei Massenrückgabe');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRetire = async () => {
    setLoading(true);
    setError(null);
    try {
      await onRetireBulk();
      setShowBulkRetire(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Ausbuchen');
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit) return null;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onToggleAll}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {allSelected ? (
              <CheckSquare className="w-5 h-5 text-primary-dark" />
            ) : someSelected ? (
              <Square className="w-5 h-5 text-primary-dark opacity-50" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
          </button>
          <span className="text-sm font-semibold text-gray-900">
            Massenaktionen
            {selectedCount > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full bg-primary/20 text-primary-dark text-xs font-medium">
                {selectedCount} ausgewählt
              </span>
            )}
          </span>
        </div>
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setShowBulkAssign(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <UserRound className="w-3 h-3" />
            Zuweisen
          </button>
          <button
            type="button"
            onClick={() => setShowBulkUnassign(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            <Undo2 className="w-3 h-3" />
            Zurückgeben
          </button>
          <button
            type="button"
            onClick={() => setShowBulkRetire(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50"
          >
            <Archive className="w-3 h-3" />
            Ausbuchen
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      {/* Bulk Assign Modal */}
      {showBulkAssign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedCount} Geräte zuweisen
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkAssign(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Benutzer auswählen
                </label>
                <select
                  value={bulkUserId}
                  onChange={(e) => setBulkUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Benutzer wählen --</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBulkAssign}
                  disabled={!bulkUserId || loading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Wird zugewiesen...' : 'Zuweisen'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkAssign(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Unassign Modal */}
      {showBulkUnassign && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedCount} Geräte zurückgeben
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkUnassign(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zielraum auswählen
                </label>
                <select
                  value={bulkRoomId}
                  onChange={(e) => setBulkRoomId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">-- Raum wählen --</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBulkUnassign}
                  disabled={!bulkRoomId || loading}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Wird zurückgegeben...' : 'Zurückgeben'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkUnassign(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Retire Modal */}
      {showBulkRetire && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedCount} Geräte ausbuchen
              </h3>
              <button
                type="button"
                onClick={() => setShowBulkRetire(false)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Möchten Sie wirklich {selectedCount} Gerät(e) ausbuchen? Diese Aktion kann nicht rückgängig gemacht werden.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleBulkRetire}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Wird ausgebucht...' : 'Ausbuchen'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowBulkRetire(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
