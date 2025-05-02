import { browser } from '$app/environment';
import { trackedProducts } from './states/tracked.svelte.js';
import { type User } from './types/User.js';

class UserState {
    #user: User = $state({email: '', isAdmin: false});
    constructor() {
        if (browser) {
            const email = localStorage.getItem('userEmail');
            const isAdmin = localStorage.getItem('userIsAdmin') === 'true';
            if (email) {
                this.#user.email = email;
                this.#user.isAdmin = isAdmin;
                trackedProducts.refresh();
            }
        }
    }

    get email() {
        return this.#user.email;
    }

    get isAdmin() {
        return this.#user.isAdmin;
    }

    set email(email: string) {
        this.#user.email = email;
        localStorage.setItem('userEmail', this.#user.email);
    }

    set isAdmin(isAdmin: boolean) {
        this.#user.isAdmin = isAdmin;
        localStorage.setItem('userIsAdmin', String(isAdmin));
    }

    signOut() {
        this.#user.email = '';
        this.#user.isAdmin = false;
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userIsAdmin');
    }
}

export const userState = new UserState();
