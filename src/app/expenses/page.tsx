import Container from "@/components/ui/Container";
import ExpenseForm from "@/components/expenses/ExpenseForm";

export default function Page() {
  return (
    <div className="py-6 md:py-10">
      <Container>
        <ExpenseForm />
      </Container>
    </div>
  );
}
