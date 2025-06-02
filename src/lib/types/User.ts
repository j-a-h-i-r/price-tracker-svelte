export interface LoggedUser {
    email: string;
    isAdmin: boolean;
}

export interface User {
    id: number;
    email: string;
    created_at: string;
    updated_at: string;
}
