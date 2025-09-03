<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { userState } from '$lib/shared.svelte.js';
    import { verifyAuthToken } from '$lib/api/auth.js';

    let message = '';
    let isLoading = true;
    let countdown = 5;
    let redirectMessage = '';

    function getRedirectMessage(countdown: number, redirectTo?: string) {
        if (redirectTo) {
            return `Redirecting to ${redirectTo} in ${countdown} seconds`;
        } else {
            return `Redirecting to the home page in ${countdown} seconds`;
        }
    }

    onMount(async () => {
        const token = $page.url.searchParams.get('token');
        if (!token) {
            message = 'Invalid verification link';
            isLoading = false;
            return;
        }

        const response = await verifyAuthToken(token);
        if (response.isOk()) {
            const result = response.value;
            userState.email = result.email;
            userState.isAdmin = result.isAdmin || false;
            const { redirectTo } = result;
            isLoading = false;
            redirectMessage = getRedirectMessage(countdown, redirectTo);
            
            const timer = setInterval(() => {
                countdown--;
                redirectMessage = getRedirectMessage(countdown, redirectTo);
                if (countdown <= 0) {
                    clearInterval(timer);
                    if (redirectTo) {
                        goto(redirectTo);
                    } else {
                        goto('/');
                    }
                }
            }, 1000);
        } else {
            message = 'Invalid or expired verification link';
            isLoading = false;
        }
    });
</script>

<div class="max-w-md mx-auto mt-16 p-6 bg-white rounded-lg shadow-md">
    {#if isLoading}
        <div class="text-center">
            <div class="text-lg font-medium text-gray-900">Verifying your email...</div>
            <div class="mt-2 text-sm text-gray-500">Please wait while we verify your email address.</div>
        </div>
    {:else if redirectMessage}
        <div class="text-center">
            <div class="text-lg font-medium text-green-600">Email verified successfully!</div>
            <div class="mt-2 text-sm text-gray-500">{redirectMessage}</div>
        </div>
    {:else if message}
        <div class="text-center">
            <div class="text-lg font-medium text-red-600">{message}</div>
            <a href="/accounts" class="mt-4 inline-block text-sm text-blue-600 hover:text-blue-500">
                Return to login
            </a>
        </div>
    {/if}
</div>