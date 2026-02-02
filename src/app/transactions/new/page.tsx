import Container from "@/components/ui/Container";
import NewTransactionForm from "@/components/transactions/NewTransactionForm";
import { prisma } from "@/prisma-client";

// TAMBAHKAN BARIS INI untuk memaksa halaman dirender di runtime (saat diakses user)
// bukan saat proses build di Vercel.
export const dynamic = "force-dynamic";

export default async function Page() {
  // Sekarang pemanggilan ini aman karena dilakukan saat aplikasi sudah berjalan
  const customers = await prisma.customer.findMany({ orderBy: { id: "desc" } });

  return (
    <div className="py-6 md:py-10">
      <Container>
        <NewTransactionForm customers={customers} products={[]} />
      </Container>
    </div>
  );
}