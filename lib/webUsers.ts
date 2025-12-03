import type { WebUser } from './generated/prisma/client';

export type PublicWebUser = Pick<WebUser, 'id' | 'email' | 'name' | 'role' | 'createdAt' | 'updatedAt'>;

export type SerializableWebUser = Omit<PublicWebUser, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export function toPublicWebUser(user: WebUser): PublicWebUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toSerializableWebUser(user: PublicWebUser): SerializableWebUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export function serializeWebUsers(users: WebUser[]): SerializableWebUser[] {
  return users.map((user) => toSerializableWebUser(toPublicWebUser(user)));
}

export function serializeWebUser(user: WebUser): SerializableWebUser {
  return toSerializableWebUser(toPublicWebUser(user));
}
