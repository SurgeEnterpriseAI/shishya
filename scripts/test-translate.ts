import { translateBatch } from "../src/lib/ai/translator";

async function main() {
  const t0 = Date.now();
  try {
    const res = await translateBatch({
      locale: "hi",
      questions: [
        {
          id: "q1",
          body: "Who is the author of the famous novel 'The God of Small Things'?",
          options: [
            { key: "A", text: "Arundhati Roy" },
            { key: "B", text: "Jhumpa Lahiri" },
            { key: "C", text: "Kiran Desai" },
            { key: "D", text: "Anita Desai" },
          ],
          solution: "Arundhati Roy wrote the Booker Prize-winning novel.",
        },
      ],
    });
    console.log("OK in", Date.now() - t0, "ms");
    console.log(JSON.stringify(res.translated[0], null, 2));
  } catch (e: any) {
    console.error("FAILED after", Date.now() - t0, "ms:", e?.message);
    console.error(e?.stack?.split("\n").slice(0, 5).join("\n"));
  }
}

main();
