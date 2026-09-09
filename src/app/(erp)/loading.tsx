import { Loader } from "@/components/ui/loader";

export default function ErpSectionLoading() {
  return (
    <div className="py-24 flex justify-center items-center min-h-[400px]">
      <Loader text="Loading section data..." />
    </div>
  );
}
