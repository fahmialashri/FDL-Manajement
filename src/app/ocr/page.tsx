import Container from "@/components/ui/Container";
import OCRUploadForm from "@/components/ocr/OcrUpload";

export default function Page() {
  return (
    <div className="py-6 md:py-10">
      <Container>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">OCR Import Invoice Lama</h1>
          <p className="text-sm text-gray-500">
            Upload foto/PDF invoice lama → sistem extract (tanggal, nomor, total) → masuk database ledger.
          </p>
        </div>

        <OCRUploadForm />
      </Container>
    </div>
  );
}
