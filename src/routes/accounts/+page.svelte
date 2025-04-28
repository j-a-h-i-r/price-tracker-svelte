<script lang="ts">
    let email = '';
    let message = '';
    let isLoading = false;

    async function handleSignup() {
        isLoading = true;
        try {
            const response = await fetch('/api/auth/new', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email })
            });
            
            const result = await response.json();
            if (result === true) {
                message = 'Check your email for an authorization link';
                email = '';
            }
        } catch (error) {
            message = 'An error occurred. Please try again.';
        }
        isLoading = false;
    }
</script>

<div class="container">
    <h1>Sign In</h1>
    
    <form on:submit|preventDefault={handleSignup}>
        <div class="form-group">
            <label for="email">Email address</label>
            <input
                type="email"
                id="email"
                bind:value={email}
                required
                placeholder="Enter your email"
            />
        </div>

        {#if message}
            <div class="message {message.includes('Check your email') ? 'success' : 'error'}">
                {message}
            </div>
        {/if}

        <button
            type="submit"
            disabled={isLoading}
        >
            {isLoading ? 'Signing up...' : 'Sign up'}
        </button>
    </form>
</div>

<style>
    .container {
        max-width: 28rem;
        margin: 4rem auto 0;
        padding: 1.5rem;
        background: white;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }

    h1 {
        font-size: 1.5rem;
        font-weight: bold;
        margin-bottom: 1.5rem;
        color: #111827;
    }

    .form-group {
        margin-bottom: 1rem;
    }

    label {
        display: block;
        font-size: 0.875rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
        color: #374151;
    }

    input {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        margin-bottom: 1rem;
    }

    input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
    }

    .message {
        padding: 1rem;
        border-radius: 6px;
        margin-bottom: 1rem;
    }

    .success {
        background-color: #ecfdf5;
        color: #047857;
    }

    .error {
        background-color: #fef2f2;
        color: #b91c1c;
    }

    button {
        width: 100%;
        padding: 0.5rem 1rem;
        background-color: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
    }

    button:hover {
        background-color: #1d4ed8;
    }

    button:focus {
        outline: none;
        box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    }

    button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
</style>