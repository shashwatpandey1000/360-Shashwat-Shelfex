'use client';

import Loader from './utility/loader';

export default function PageLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <Loader />
    </div>
  );
}
