import React from "react";
import { Loader as LoadingSpinner } from "lucide-react";

const Loader = ({ className }: { className?: string }) => {
  return (
    <LoadingSpinner
      className={`h-9 w-9 animate-spin text-gray-500 dark:text-gray-500 ${className}`}
    />
  );
};

export default Loader;
