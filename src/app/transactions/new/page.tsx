import Container from "@/components/ui/Container";
import NewTransactionForm from "@/components/transactions/NewTransactionForm";
import { prisma } from "@/prisma-client";

export default async function Page() {
  const customers = await prisma.customer.findMany({ orderBy: { id: "desc" } });

  return (
    <div className="py-6 md:py-10">
      <Container>
        <NewTransactionForm customers={customers} products={[]} />
      </Container>
    </div>
  );
}
