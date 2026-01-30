import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const LEDGER_PATH = path.join(process.cwd(), "storage", "Accounting_Ledger.xlsx");

export async function GET() {
  try {
    if (!fs.existsSync(LEDGER_PATH)) {
      return NextResponse.json(
        { error: "Ledger file not found. Create a transaction first." },
        { status: 404 }
      );
    }

    const buf = fs.readFileSync(LEDGER_PATH);

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="Accounting_Ledger.xlsx"`,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
