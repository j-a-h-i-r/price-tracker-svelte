import { logOut } from './api/auth.js';
import { type LoggedUser } from './types/User.js';

class UserState {
    #user: LoggedUser = $state({email: '', isAdmin: false});
    constructor() {
    }

    setUser(user: LoggedUser) {
        this.#user = user;
    }

    get email() {
        return this.#user.email;
    }

    get isAdmin() {
        return this.#user.isAdmin;
    }

    set email(email: string) {
        this.#user.email = email;
    }

    set isAdmin(isAdmin: boolean) {
        this.#user.isAdmin = isAdmin;
    }

    signOut() {
        return logOut()
        .then(() => {
            this.#user.email = '';
            this.#user.isAdmin = false;
        })
    }
}

export const userState = new UserState();
