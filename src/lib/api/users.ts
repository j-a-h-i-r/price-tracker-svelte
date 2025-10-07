import { api } from "$lib/core/api.js";
import type { User } from "$lib/types/User.js";

export function fetchUsers() {
    return api.get<User[]>('/api/users')
}