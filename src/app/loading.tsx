import Loader from "@/components/ui/loader";

export default function Loading() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center w-full">
      <Loader text="Loading ERP Workspace..." />
    </div>
  );
}
