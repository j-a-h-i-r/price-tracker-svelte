import { browser } from '$app/environment';
import { trackedProducts } from './states/tracked.svelte.js';
import { type User } from './types/User.js';

class UserState {
    #user: User = $state({email: ''});
    constructor() {
        if (browser && localStorage.getItem('userEmail')) {
            this.#user.email = localStorage.getItem('userEmail') as string;
            trackedProducts.refresh();
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
