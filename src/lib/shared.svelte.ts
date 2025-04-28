import { browser } from '$app/environment';
import { type User } from './types/User.js';

export const _user: User = $state({email: ''});

class UserState {
    #user: User = $state({email: ''});
    constructor() {
        if (browser && localStorage.getItem('userEmail')) {
            this.#user.email = localStorage.getItem('userEmail') as string;
        }
    }

    get email() {
        return this.#user.email;
    }
    set email(email: string) {
        this.#user.email = email;
        localStorage.setItem('userEmail', this.#user.email);
    }
}

export const userState = new UserState();
