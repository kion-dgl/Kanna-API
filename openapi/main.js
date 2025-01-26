import OpenAI from "openai";
import "dotenv/config";

// Initialize the OpenAI client
const client = new OpenAI({
  apiKey: process.env["OPENAPI_TOKEN"], // Ensure your API key is set in the environment variables
});

async function interactWithAssistant() {
  try {
    const thread = await client.beta.threads.create({
      messages: [
        {
          role: "user",
          content: '"Can you help me with "',
        },
      ],
    });

    let threadId = thread.id;
    console.log("Created thread with Id: " + threadId);

    const assistantId = "asst_IUjxjQhjPtaDpKO5yCVs2Ez3";
    const run = await client.beta.threads.runs.createAndPoll(thread.id, {
      assistant_id: assistantId,
    });

    console.log("Run finished with status: " + run.status);

    if (run.status == "completed") {
      const messages = await client.beta.threads.messages.list(thread.id);
      const msg = messages.getPaginatedItems();
      console.log(msg.length);
      console.log("--- start ---");
      console.log(msg[0].content[0]);
      console.log("--- end ---");
    }
  } catch (error) {
    console.error("Error interacting with the assistant:", error);
  }
}

interactWithAssistant();
