'use client';

import Loader from './utility/loader';

export default function PageLoader() {
  return (
    <div className="flex min-h-[65vh] items-center justify-center bg-gray-100">
      <Loader />
    </div>
  );
}
