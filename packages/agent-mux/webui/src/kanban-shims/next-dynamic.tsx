import React from 'react';

type DynamicModule<P> = React.ComponentType<P> | { default: React.ComponentType<P> };

type DynamicLoader<P> = () => Promise<DynamicModule<P>>;

type DynamicOptions = {
  loading?: React.ComponentType | null;
  ssr?: boolean;
};

export default function dynamic<P extends object>(
  loader: DynamicLoader<P>,
  options: DynamicOptions = {},
): React.ComponentType<P> {
  const LazyComponent = React.lazy(async () => {
    const loaded = await loader();
    if ('default' in loaded) {
      return loaded;
    }
    return { default: loaded };
  });

  const LoadingComponent = options.loading;

  function DynamicComponent(props: P) {
    const fallback = LoadingComponent ? <LoadingComponent /> : null;
    const ResolvedLazyComponent = LazyComponent as unknown as React.ComponentType<P>;
    return (
      <React.Suspense fallback={fallback}>
        <ResolvedLazyComponent {...props} />
      </React.Suspense>
    );
  }

  DynamicComponent.displayName = 'DynamicComponent';

  return DynamicComponent;
}
