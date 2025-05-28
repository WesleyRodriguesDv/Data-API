import { User } from '../models';

export let users: User[] = [];

export function setUsers(newUsers: User[]) {
  users = newUsers;
}

export function getUsers(): User[] {
  return users;
}
