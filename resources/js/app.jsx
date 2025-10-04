import './bootstrap';
import '../css/app.css';

import { createRoot } from 'react-dom/client';
import { createInertiaApp, router } from '@inertiajs/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

const appName = window.document.getElementsByTagName('title')[0]?.innerText || 'Laravel';

// Handle 419 session expired errors
router.on('error', (event) => {
    if (event.detail.response?.status === 419) {
        // Clear any stale data and force a fresh login
        alert('Your session has expired. Please login again.');
        window.location.href = '/login';
    }
});

// Refresh CSRF token periodically to prevent expiration (every 10 minutes)
const refreshCsrfToken = async () => {
    try {
        const response = await fetch('/csrf-token');
        const data = await response.json();

        // Update meta tag
        const metaTag = document.head.querySelector('meta[name="csrf-token"]');
        if (metaTag) {
            metaTag.content = data.token;
        }

        // Update axios header
        if (window.axios) {
            window.axios.defaults.headers.common['X-CSRF-TOKEN'] = data.token;
        }
    } catch (error) {
        console.error('Failed to refresh CSRF token:', error);
    }
};

// Refresh token every 10 minutes (600000ms)
setInterval(refreshCsrfToken, 600000);

// Also refresh on page navigation
router.on('navigate', refreshCsrfToken);

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./Pages/${name}.jsx`, import.meta.glob('./Pages/**/*.jsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);
        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
