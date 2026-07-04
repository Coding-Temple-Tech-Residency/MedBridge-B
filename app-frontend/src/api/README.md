# 🛰️ TanStack Query API Hooks Library

Welcome to the core asynchronous state management layer of the application. This directory abstracts all backend network orchestration, caching topologies, lifecycle indicators, and TypeScript type contracts into highly reusable, self-synchronizing custom React hooks.

By leveraging this architecture, frontend features can be implemented without managing boilerplate network engines, writing nested `useEffect` trees, or tracking loading/error state flags manually.

---

## 🏗️ Core Architectural Blueprint

Every view or element interacting with server data must follow a standardized **State Machine Layout**. This ensures compliance with our active sprint deliverables:

1. **Fetch & Render:** Automatic invocation on mount with strict typing.
2. **Prevent UI Freezing:** Responsive loading spinner(already created in the components folder).
3. **Graceful Failure:** A consistent `"Something went wrong"` banner for `4xx` or `5xx` exceptions.
4. **Empty State Security:** Dedicated fallbacks when payload arrays return empty.

### 🎨 Component Implementation Pattern

```tsx
import React from 'react';
import { useListProviders } from '@/hooks/providers';
import { ProviderCard, ProviderSkeleton, ErrorBanner, EmptyState } from '@/components/ui';

export const ProviderListView: React.FC = () => {
    // 1. Fully-typed data consumer hook
    const { data: providers, isLoading, isError } = useListProviders();

    // 2. Loading State: Prevent UI freezing
    if (isLoading) {
        return <LoadingSpinner />;
    }

    // 3. Error State: Graceful fallback for 4xx/5xx exceptions
    if (isError) {
        return <ErrorBanner message="Something went wrong. Please try again." />;
    }

    // 4. Empty State: Guard against blank data payloads
    if (!providers || providers.length === 0) {
        return <EmptyState title="No Providers Found" description="Add a provider to get started." />;
    }

    // 5. Success Render State
    return (
        <div className="provider-grid">
            {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} />
            ))}
        </div>
    );
};
```