import { writable } from 'svelte/store';

export type ToastTypes = 'success' | 'error' | 'info';

export interface Toast {
    id: number;
    type: ToastTypes;
    message: string;
}

function createToastStore() {
    const { subscribe, update } = writable<Toast[]>([]);
    let count = 0;

    function add(message: string, type: ToastTypes = 'info') {
        const id = count++;
        const toast: Toast = { id, type, message };
        
        update(toasts => {
            const newToasts = [...toasts, toast];
            setTimeout(() => remove(id), 3000); // Auto remove after 3 seconds
            return newToasts;
        });
    }

    function remove(id: number) {
        update(toasts => toasts.filter(t => t.id !== id));
    }

    return {
        subscribe,
        success: (message: string) => add(message, 'success'),
        error: (message: string) => add(message, 'error'),
        info: (message: string) => add(message, 'info'),
        remove
    };
}

export const toasts = createToastStore();