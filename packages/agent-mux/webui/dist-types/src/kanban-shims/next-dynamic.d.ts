import React from 'react';
type DynamicModule<P> = React.ComponentType<P> | {
    default: React.ComponentType<P>;
};
type DynamicLoader<P> = () => Promise<DynamicModule<P>>;
type DynamicOptions = {
    loading?: React.ComponentType | null;
    ssr?: boolean;
};
export default function dynamic<P extends object>(loader: DynamicLoader<P>, options?: DynamicOptions): React.ComponentType<P>;
export {};
